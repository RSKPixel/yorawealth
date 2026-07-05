from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from app.models.nse_eod import NseEod
from app.models.stock_transaction import StockTransaction
from app.repositories.nse_eod_repository import NseEodRepository
from app.repositories.stock_repository import StockRepository
from app.repositories.stock_transaction_repository import StockTransactionRepository
from app.services.stock_trade_types import (
    BUY_LIKE_TRADE_TYPES,
    SELL_TRADE_TYPES,
)


@dataclass
class FifoLot:
    quantity: Decimal
    cost_per_unit: Decimal


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _average_cost(lots: list[FifoLot]) -> Decimal:
    total_quantity = sum((lot.quantity for lot in lots), Decimal("0"))
    if total_quantity <= 0:
        return Decimal("0")

    invested_amount = sum(
        (lot.quantity * lot.cost_per_unit for lot in lots),
        Decimal("0"),
    )
    return (invested_amount / total_quantity).quantize(Decimal("0.0001"))


def _apply_sell(lots: list[FifoLot], quantity: Decimal) -> None:
    quantity_to_sell = quantity
    while quantity_to_sell > 0 and lots:
        lot = lots[0]
        if lot.quantity <= quantity_to_sell:
            quantity_to_sell -= lot.quantity
            lots.pop(0)
        else:
            lot.quantity -= quantity_to_sell
            quantity_to_sell = Decimal("0")


def _apply_split(lots: list[FifoLot], additional_shares: Decimal) -> None:
    if additional_shares <= 0:
        return

    if not lots:
        return

    last_lot = lots[-1]
    original_quantity = last_lot.quantity
    if original_quantity <= 0:
        return

    new_quantity = original_quantity + additional_shares
    ratio = new_quantity / original_quantity
    last_lot.quantity = new_quantity
    last_lot.cost_per_unit = (last_lot.cost_per_unit / ratio).quantize(Decimal("0.0001"))


def _compute_holding_from_transactions(
    client_pan: str,
    symbol: str,
    transactions: list[StockTransaction],
) -> Optional[dict]:
    lots: list[FifoLot] = []
    isin = ""
    latest_price = Decimal("0")

    for transaction in transactions:
        isin = transaction.isin or isin
        latest_price = _decimal(transaction.price)
        quantity = abs(_decimal(transaction.quantity)).quantize(Decimal("1"))
        if quantity == 0:
            continue

        if transaction.trade_type in BUY_LIKE_TRADE_TYPES:
            lots.append(FifoLot(quantity=quantity, cost_per_unit=_decimal(transaction.price)))
            continue

        if transaction.trade_type == "BONUS":
            lots.append(FifoLot(quantity=quantity, cost_per_unit=Decimal("0")))
            continue

        if transaction.trade_type == "SPLIT":
            _apply_split(lots, quantity)
            continue

        if transaction.trade_type == "DEMERGER":
            cost_per_unit = _decimal(transaction.price)
            if cost_per_unit <= 0 and lots:
                cost_per_unit = _average_cost(lots)
            lots.append(FifoLot(quantity=quantity, cost_per_unit=cost_per_unit))
            continue

        if transaction.trade_type in SELL_TRADE_TYPES:
            _apply_sell(lots, quantity)
            continue

        _apply_sell(lots, quantity)

    total_quantity = sum((lot.quantity for lot in lots), Decimal("0"))
    if total_quantity <= 0:
        return None

    invested_amount = sum(
        (lot.quantity * lot.cost_per_unit for lot in lots),
        Decimal("0"),
    )
    current_price = latest_price
    current_value = (total_quantity * current_price).quantize(Decimal("0.01"))
    invested_amount = invested_amount.quantize(Decimal("0.01"))
    avg_cost = (invested_amount / total_quantity).quantize(Decimal("0.0001"))
    unrealized_gain = (current_value - invested_amount).quantize(Decimal("0.01"))

    return {
        "client_pan": client_pan.upper(),
        "symbol": symbol.upper(),
        "isin": isin.upper(),
        "name": symbol.upper(),
        "quantity": total_quantity.quantize(Decimal("1")),
        "invested_amount": invested_amount,
        "avg_cost": avg_cost,
        "current_price": current_price.quantize(Decimal("0.0001")),
        "current_value": current_value,
        "unrealized_gain": unrealized_gain,
    }


def apply_eod_prices(
    holdings: list[dict],
    eod_by_symbol: dict[str, NseEod],
) -> list[dict]:
    for holding in holdings:
        eod = eod_by_symbol.get(holding["symbol"])
        if eod is None:
            continue

        quantity = _decimal(holding["quantity"])
        invested_amount = _decimal(holding["invested_amount"])
        current_price = _decimal(eod.close)
        current_value = (quantity * current_price).quantize(Decimal("0.01"))
        unrealized_gain = (current_value - invested_amount).quantize(Decimal("0.01"))

        holding["current_price"] = current_price.quantize(Decimal("0.0001"))
        holding["current_value"] = current_value
        holding["unrealized_gain"] = unrealized_gain
        if eod.name:
            holding["name"] = eod.name

    return holdings


class StockHoldingsService:
    def __init__(
        self,
        transaction_repository: StockTransactionRepository,
        stock_repository: StockRepository,
        nse_eod_repository: NseEodRepository | None = None,
    ) -> None:
        self.transaction_repository = transaction_repository
        self.stock_repository = stock_repository
        self.nse_eod_repository = nse_eod_repository

    def recalculate_for_client(self, client_pan: str) -> list[dict]:
        transactions = self.transaction_repository.list_by_client_pan_chronological(
            client_pan
        )

        grouped: dict[str, list[StockTransaction]] = {}
        for transaction in transactions:
            symbol = transaction.symbol.upper()
            grouped.setdefault(symbol, []).append(transaction)

        holdings: list[dict] = []
        for symbol, group_transactions in grouped.items():
            holding = _compute_holding_from_transactions(
                client_pan=client_pan,
                symbol=symbol,
                transactions=group_transactions,
            )
            if holding is not None:
                holdings.append(holding)

        if self.nse_eod_repository is not None and holdings:
            eod_by_symbol = self.nse_eod_repository.map_by_symbols(
                [row["symbol"] for row in holdings]
            )
            if eod_by_symbol:
                holdings = apply_eod_prices(holdings, eod_by_symbol)

        self.stock_repository.sync_holdings(client_pan, holdings)
        return holdings
