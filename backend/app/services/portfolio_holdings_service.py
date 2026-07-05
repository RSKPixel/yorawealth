from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from app.models.mutual_fund_transaction import MutualFundTransaction
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.repositories.portfolio_holding_repository import PortfolioHoldingRepository
from app.services.amfi_lookup import AmfiFundInfo, fetch_amfi_index, lookup_isin


@dataclass
class FifoLot:
    units: Decimal
    cost_per_unit: Decimal


def _decimal(value: Decimal | float | int | str) -> Decimal:
    return Decimal(str(value))


def _resolve_current_nav(
    isin: str,
    amfi_index: dict[str, AmfiFundInfo],
    fallback_nav: Decimal,
) -> tuple[Decimal, Optional[str]]:
    info = lookup_isin(isin, amfi_index)
    if info and info.nav:
        nav_date = info.nav_date or None
        return _decimal(info.nav), nav_date
    return fallback_nav, None


def _resolve_fund_metadata(
    isin: str,
    amfi_index: dict[str, AmfiFundInfo],
    fund_name: str,
    amc: str,
) -> tuple[str, str, str, str]:
    info = lookup_isin(isin, amfi_index)
    if info is None:
        return fund_name, amc, "", ""

    return (
        info.fund_name or fund_name,
        info.amc or amc,
        info.asset_class,
        info.fund_type,
    )


def _compute_holding_from_transactions(
    client_pan: str,
    folio: str,
    isin: str,
    transactions: list[MutualFundTransaction],
    amfi_index: dict[str, AmfiFundInfo],
) -> Optional[dict]:
    lots: list[FifoLot] = []
    fund_name = ""
    amc = ""
    latest_nav = Decimal("0")

    for transaction in transactions:
        fund_name = transaction.fund_name or fund_name
        amc = transaction.amc or amc
        latest_nav = _decimal(transaction.nav)
        units = abs(_decimal(transaction.quantity))

        if units == 0:
            continue

        if transaction.trade_type == "IN":
            cost_per_unit = abs(_decimal(transaction.trade_value)) / units
            lots.append(FifoLot(units=units, cost_per_unit=cost_per_unit))
            continue

        units_to_redeem = units
        while units_to_redeem > 0 and lots:
            lot = lots[0]
            if lot.units <= units_to_redeem:
                units_to_redeem -= lot.units
                lots.pop(0)
            else:
                lot.units -= units_to_redeem
                units_to_redeem = Decimal("0")

    total_units = sum((lot.units for lot in lots), Decimal("0"))
    if total_units <= 0:
        return None

    invested_amount = sum(
        (lot.units * lot.cost_per_unit for lot in lots),
        Decimal("0"),
    )
    current_nav, current_nav_date = _resolve_current_nav(
        isin,
        amfi_index,
        latest_nav,
    )
    current_value = (total_units * current_nav).quantize(Decimal("0.01"))
    invested_amount = invested_amount.quantize(Decimal("0.01"))
    avg_cost = (invested_amount / total_units).quantize(Decimal("0.0001"))
    unrealized_gain = (current_value - invested_amount).quantize(Decimal("0.01"))
    fund_name, amc, asset_class, fund_type = _resolve_fund_metadata(
        isin,
        amfi_index,
        fund_name,
        amc,
    )

    return {
        "client_pan": client_pan.upper(),
        "folio": folio,
        "isin": isin,
        "fund_name": fund_name,
        "amc": amc,
        "asset_class": asset_class or None,
        "fund_type": fund_type or None,
        "quantity": total_units.quantize(Decimal("0.001")),
        "invested_amount": invested_amount,
        "avg_cost": avg_cost,
        "current_nav": current_nav.quantize(Decimal("0.0001")),
        "current_nav_date": current_nav_date,
        "current_value": current_value,
        "unrealized_gain": unrealized_gain,
    }


class PortfolioHoldingsService:
    def __init__(
        self,
        transaction_repository: MutualFundTransactionRepository,
        holding_repository: PortfolioHoldingRepository,
    ) -> None:
        self.transaction_repository = transaction_repository
        self.holding_repository = holding_repository

    def recalculate_for_client(self, client_pan: str) -> list[dict]:
        transactions = self.transaction_repository.list_by_client_pan_chronological(
            client_pan
        )
        amfi_index = fetch_amfi_index()

        grouped: dict[tuple[str, str], list[MutualFundTransaction]] = {}
        for transaction in transactions:
            key = (transaction.folio, transaction.isin)
            grouped.setdefault(key, []).append(transaction)

        holdings: list[dict] = []
        for (folio, isin), group_transactions in grouped.items():
            holding = _compute_holding_from_transactions(
                client_pan=client_pan,
                folio=folio,
                isin=isin,
                transactions=group_transactions,
                amfi_index=amfi_index,
            )
            if holding is not None:
                holdings.append(holding)

        self.holding_repository.sync_holdings(client_pan, holdings)
        return holdings
