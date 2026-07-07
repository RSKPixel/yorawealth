from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.mutual_fund_transaction import MutualFundTransaction
from app.models.stock_transaction import StockTransaction
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.stock_transaction_repository import StockTransactionRepository
from app.schemas.capital_gains import RealizedGainRow
from app.services.stock_trade_types import BUY_LIKE_TRADE_TYPES, SELL_TRADE_TYPES


@dataclass
class FifoLot:
    quantity: Decimal
    cost_per_unit: Decimal
    purchase_date: date


@dataclass
class GainBreakdown:
    purchase_value: Decimal
    short_term_gain: Decimal
    long_term_gain: Decimal
    short_term_holding_period_days: int = 0
    long_term_holding_period_days: int = 0
    short_term_quantity: Decimal = Decimal("0")
    long_term_quantity: Decimal = Decimal("0")


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _long_term_threshold_days(asset_type: str, asset_class: Optional[str]) -> int:
    if asset_type == "stock":
        return 365

    normalized = (asset_class or "Equity").strip().lower()
    if normalized in {"debt", "gold"}:
        return 1095

    return 365


def _effective_sell_price(trade_value: Decimal, quantity: Decimal) -> Decimal:
    if quantity <= 0:
        return Decimal("0")

    return (abs(trade_value) / quantity).quantize(Decimal("0.0001"))


def _reconcile_gain_split(
    realized_gain: Decimal,
    short_term_gain: Decimal,
    long_term_gain: Decimal,
) -> tuple[Decimal, Decimal]:
    short_term_gain = _decimal(short_term_gain)
    long_term_gain = _decimal(long_term_gain)
    realized_gain = _decimal(realized_gain)

    if short_term_gain == 0 and long_term_gain == 0 and realized_gain != 0:
        return realized_gain.quantize(Decimal("0.01")), Decimal("0.00")

    drift = realized_gain - (short_term_gain + long_term_gain)
    if drift == 0:
        return short_term_gain.quantize(Decimal("0.01")), long_term_gain.quantize(Decimal("0.01"))

    if long_term_gain != 0 and short_term_gain != 0:
        short_term_gain += drift
    elif long_term_gain != 0:
        long_term_gain += drift
    else:
        short_term_gain += drift

    return short_term_gain.quantize(Decimal("0.01")), long_term_gain.quantize(Decimal("0.01"))


def _average_cost(lots: list[FifoLot]) -> Decimal:
    total_quantity = sum((lot.quantity for lot in lots), Decimal("0"))
    if total_quantity <= 0:
        return Decimal("0")

    invested_amount = sum(
        (lot.quantity * lot.cost_per_unit for lot in lots),
        Decimal("0"),
    )
    return (invested_amount / total_quantity).quantize(Decimal("0.0001"))


def _fifo_consume(
    lots: list[FifoLot],
    quantity: Decimal,
    *,
    sell_date: Optional[date] = None,
    sell_price_per_unit: Optional[Decimal] = None,
    long_term_days: int = 365,
) -> GainBreakdown:
    quantity_to_sell = quantity
    purchase_value = Decimal("0")
    short_term_gain = Decimal("0")
    long_term_gain = Decimal("0")
    st_weighted_days = Decimal("0")
    st_consumed = Decimal("0")
    lt_weighted_days = Decimal("0")
    lt_consumed = Decimal("0")

    while quantity_to_sell > 0 and lots:
        lot = lots[0]
        if lot.quantity <= quantity_to_sell:
            consumed = lot.quantity
            quantity_to_sell -= consumed
            lots.pop(0)
        else:
            consumed = quantity_to_sell
            lot.quantity -= quantity_to_sell
            quantity_to_sell = Decimal("0")

        lot_purchase = consumed * lot.cost_per_unit
        purchase_value += lot_purchase

        if sell_date is not None and sell_price_per_unit is not None:
            sale_proceeds = consumed * sell_price_per_unit
            gain = sale_proceeds - lot_purchase
            holding_days = (sell_date - lot.purchase_date).days
            if holding_days > long_term_days:
                long_term_gain += gain
                lt_weighted_days += consumed * Decimal(holding_days)
                lt_consumed += consumed
            else:
                short_term_gain += gain
                st_weighted_days += consumed * Decimal(holding_days)
                st_consumed += consumed

    short_term_holding_period_days = (
        int((st_weighted_days / st_consumed).quantize(Decimal("1"))) if st_consumed > 0 else 0
    )
    long_term_holding_period_days = (
        int((lt_weighted_days / lt_consumed).quantize(Decimal("1"))) if lt_consumed > 0 else 0
    )

    return GainBreakdown(
        purchase_value=purchase_value.quantize(Decimal("0.01")),
        short_term_gain=short_term_gain.quantize(Decimal("0.01")),
        long_term_gain=long_term_gain.quantize(Decimal("0.01")),
        short_term_holding_period_days=short_term_holding_period_days,
        long_term_holding_period_days=long_term_holding_period_days,
        short_term_quantity=st_consumed,
        long_term_quantity=lt_consumed,
    )


def _weighted_term_holding_days(
    rows: list[RealizedGainRow],
    *,
    term: str,
) -> int:
    if term == "short":
        weighted = sum(
            _decimal(row.short_term_holding_period_days) * _decimal(row.short_term_quantity)
            for row in rows
            if row.short_term_quantity > 0 and row.short_term_holding_period_days > 0
        )
        quantity = sum(
            _decimal(row.short_term_quantity)
            for row in rows
            if row.short_term_quantity > 0 and row.short_term_holding_period_days > 0
        )
    else:
        weighted = sum(
            _decimal(row.long_term_holding_period_days) * _decimal(row.long_term_quantity)
            for row in rows
            if row.long_term_quantity > 0 and row.long_term_holding_period_days > 0
        )
        quantity = sum(
            _decimal(row.long_term_quantity)
            for row in rows
            if row.long_term_quantity > 0 and row.long_term_holding_period_days > 0
        )

    if quantity <= 0:
        return 0

    return int((weighted / quantity).quantize(Decimal("1")))


def _apply_split(lots: list[FifoLot], additional_shares: Decimal) -> None:
    if additional_shares <= 0 or not lots:
        return

    last_lot = lots[-1]
    original_quantity = last_lot.quantity
    if original_quantity <= 0:
        return

    new_quantity = original_quantity + additional_shares
    ratio = new_quantity / original_quantity
    last_lot.quantity = new_quantity
    last_lot.cost_per_unit = (last_lot.cost_per_unit / ratio).quantize(Decimal("0.0001"))


def _stock_meta(record: StockTransaction) -> Optional[str]:
    parts = [record.symbol.upper()]
    if record.exchange:
        parts.append(record.exchange.upper())
    if len(parts) == 1:
        return None
    return " · ".join(parts[1:])


def _process_stock_sells(transactions: list[StockTransaction]) -> list[RealizedGainRow]:
    lots: list[FifoLot] = []
    sells: list[RealizedGainRow] = []

    for transaction in transactions:
        quantity = abs(_decimal(transaction.quantity)).quantize(Decimal("1"))
        if quantity == 0:
            continue

        if transaction.trade_type in BUY_LIKE_TRADE_TYPES:
            lots.append(
                FifoLot(
                    quantity=quantity,
                    cost_per_unit=_decimal(transaction.price),
                    purchase_date=transaction.transaction_date,
                )
            )
            continue

        if transaction.trade_type == "BONUS":
            lots.append(
                FifoLot(
                    quantity=quantity,
                    cost_per_unit=Decimal("0"),
                    purchase_date=transaction.transaction_date,
                )
            )
            continue

        if transaction.trade_type == "SPLIT":
            _apply_split(lots, quantity)
            continue

        if transaction.trade_type == "DEMERGER":
            cost_per_unit = _decimal(transaction.price)
            if cost_per_unit <= 0 and lots:
                cost_per_unit = _average_cost(lots)
            lots.append(
                FifoLot(
                    quantity=quantity,
                    cost_per_unit=cost_per_unit,
                    purchase_date=transaction.transaction_date,
                )
            )
            continue

        if transaction.trade_type in SELL_TRADE_TYPES:
            trade_value = _decimal(transaction.trade_value)
            sell_price = _effective_sell_price(trade_value, quantity)
            breakdown = _fifo_consume(
                lots,
                quantity,
                sell_date=transaction.transaction_date,
                sell_price_per_unit=sell_price,
                long_term_days=_long_term_threshold_days("stock", None),
            )
            buy_rate = (breakdown.purchase_value / quantity).quantize(Decimal("0.0001"))
            realized_gain = (trade_value - breakdown.purchase_value).quantize(Decimal("0.01"))
            short_term_gain, long_term_gain = _reconcile_gain_split(
                realized_gain,
                breakdown.short_term_gain,
                breakdown.long_term_gain,
            )
            sells.append(
                RealizedGainRow(
                    id=f"stock-{transaction.id}",
                    asset_type="stock",
                    transaction_date=transaction.transaction_date.isoformat(),
                    label=transaction.symbol.upper(),
                    folio=None,
                    broker=transaction.broker,
                    meta=_stock_meta(transaction),
                    quantity=float(quantity),
                    sell_rate=float(sell_price),
                    buy_rate=float(buy_rate),
                    trade_value=float(trade_value),
                    purchase_value=float(breakdown.purchase_value),
                    realized_gain=float(realized_gain),
                    short_term_gain=float(short_term_gain),
                    long_term_gain=float(long_term_gain),
                    short_term_holding_period_days=breakdown.short_term_holding_period_days,
                    long_term_holding_period_days=breakdown.long_term_holding_period_days,
                    short_term_quantity=float(breakdown.short_term_quantity),
                    long_term_quantity=float(breakdown.long_term_quantity),
                    trade_type=transaction.trade_type,
                )
            )
            continue

        _fifo_consume(lots, quantity)

    return sells


def _process_mutual_fund_sells(
    transactions: list[MutualFundTransaction],
) -> list[RealizedGainRow]:
    lots: list[FifoLot] = []
    sells: list[RealizedGainRow] = []

    for transaction in transactions:
        units = abs(_decimal(transaction.quantity))
        if units == 0:
            continue

        if transaction.trade_type == "IN":
            cost_per_unit = abs(_decimal(transaction.trade_value)) / units
            lots.append(
                FifoLot(
                    quantity=units,
                    cost_per_unit=cost_per_unit,
                    purchase_date=transaction.transaction_date,
                )
            )
            continue

        if transaction.trade_type != "OUT":
            continue

        trade_value = abs(_decimal(transaction.trade_value)).quantize(Decimal("0.01"))
        sell_price = _effective_sell_price(trade_value, units)
        breakdown = _fifo_consume(
            lots,
            units,
            sell_date=transaction.transaction_date,
            sell_price_per_unit=sell_price,
            long_term_days=_long_term_threshold_days(
                "mutual-fund",
                transaction.assetclass,
            ),
        )
        buy_rate = (breakdown.purchase_value / units).quantize(Decimal("0.0001"))
        realized_gain = (trade_value - breakdown.purchase_value).quantize(Decimal("0.01"))
        short_term_gain, long_term_gain = _reconcile_gain_split(
            realized_gain,
            breakdown.short_term_gain,
            breakdown.long_term_gain,
        )
        sells.append(
            RealizedGainRow(
                id=f"mf-{transaction.id}",
                asset_type="mutual-fund",
                transaction_date=transaction.transaction_date.isoformat(),
                label=transaction.fund_name,
                folio=transaction.folio,
                broker=None,
                meta=transaction.isin,
                quantity=float(units.quantize(Decimal("0.001"))),
                sell_rate=float(sell_price),
                buy_rate=float(buy_rate),
                trade_value=float(trade_value),
                purchase_value=float(breakdown.purchase_value),
                realized_gain=float(realized_gain),
                short_term_gain=float(short_term_gain),
                long_term_gain=float(long_term_gain),
                short_term_holding_period_days=breakdown.short_term_holding_period_days,
                long_term_holding_period_days=breakdown.long_term_holding_period_days,
                short_term_quantity=float(breakdown.short_term_quantity),
                long_term_quantity=float(breakdown.long_term_quantity),
                trade_type=transaction.trade_type,
            )
        )

    return sells


def _aggregate_realized_rows(rows: list[RealizedGainRow]) -> list[RealizedGainRow]:
    grouped: dict[tuple[str, str, str, str, str], list[RealizedGainRow]] = {}
    for row in rows:
        key = (
            row.asset_type,
            row.label,
            row.folio or "",
            row.broker or "",
            row.transaction_date,
        )
        grouped.setdefault(key, []).append(row)

    aggregated: list[RealizedGainRow] = []
    for (asset_type, label, folio, broker, transaction_date), group in grouped.items():
        total_quantity = sum(_decimal(row.quantity) for row in group)
        total_trade_value = sum(_decimal(row.trade_value) for row in group)
        total_purchase_value = sum(_decimal(row.purchase_value) for row in group)
        total_short_term_gain = sum(_decimal(row.short_term_gain) for row in group)
        total_long_term_gain = sum(_decimal(row.long_term_gain) for row in group)
        total_short_term_quantity = sum(_decimal(row.short_term_quantity) for row in group)
        total_long_term_quantity = sum(_decimal(row.long_term_quantity) for row in group)

        if total_quantity <= 0:
            continue

        sell_rate = (total_trade_value / total_quantity).quantize(Decimal("0.0001"))
        buy_rate = (total_purchase_value / total_quantity).quantize(Decimal("0.0001"))
        total_trade_value = total_trade_value.quantize(Decimal("0.01"))
        total_purchase_value = total_purchase_value.quantize(Decimal("0.01"))
        realized_gain = (total_trade_value - total_purchase_value).quantize(Decimal("0.01"))
        short_term_gain, long_term_gain = _reconcile_gain_split(
            realized_gain,
            total_short_term_gain,
            total_long_term_gain,
        )
        quantity_precision = Decimal("1") if asset_type == "stock" else Decimal("0.001")
        short_term_holding_period_days = _weighted_term_holding_days(group, term="short")
        long_term_holding_period_days = _weighted_term_holding_days(group, term="long")
        row_folio = folio or None
        row_broker = broker or None
        row_id = f"{asset_type}-{label}-{folio}-{broker}-{transaction_date}"

        aggregated.append(
            RealizedGainRow(
                id=row_id,
                asset_type=asset_type,
                transaction_date=transaction_date,
                label=label,
                folio=row_folio,
                broker=row_broker,
                meta=group[0].meta,
                quantity=float(total_quantity.quantize(quantity_precision)),
                sell_rate=float(sell_rate),
                buy_rate=float(buy_rate),
                trade_value=float(total_trade_value),
                purchase_value=float(total_purchase_value),
                realized_gain=float(realized_gain),
                short_term_gain=float(short_term_gain),
                long_term_gain=float(long_term_gain),
                short_term_holding_period_days=short_term_holding_period_days,
                long_term_holding_period_days=long_term_holding_period_days,
                short_term_quantity=float(total_short_term_quantity),
                long_term_quantity=float(total_long_term_quantity),
                trade_type=group[0].trade_type,
            )
        )

    aggregated.sort(
        key=lambda row: (
            row.transaction_date,
            row.label,
            row.folio or "",
            row.broker or "",
            row.id,
        ),
        reverse=True,
    )
    return aggregated


class RealizedGainsService:
    def __init__(self, db: Session) -> None:
        self.stock_transaction_repository = StockTransactionRepository(db)
        self.mutual_fund_transaction_repository = MutualFundTransactionRepository(db)

    def compute_realized_gains(self, client_pan: str) -> list[RealizedGainRow]:
        stock_transactions = self.stock_transaction_repository.list_by_client_pan_chronological(
            client_pan
        )
        mf_transactions = (
            self.mutual_fund_transaction_repository.list_by_client_pan_chronological(
                client_pan
            )
        )

        stock_grouped: dict[tuple[str, str], list[StockTransaction]] = {}
        for transaction in stock_transactions:
            symbol = transaction.symbol.upper()
            stock_grouped.setdefault((transaction.broker, symbol), []).append(transaction)

        mf_grouped: dict[tuple[str, str], list[MutualFundTransaction]] = {}
        for transaction in mf_transactions:
            key = (transaction.folio, transaction.isin)
            mf_grouped.setdefault(key, []).append(transaction)

        rows: list[RealizedGainRow] = []
        for group_transactions in stock_grouped.values():
            rows.extend(_process_stock_sells(group_transactions))
        for group_transactions in mf_grouped.values():
            rows.extend(_process_mutual_fund_sells(group_transactions))

        rows = _aggregate_realized_rows(rows)
        return rows
