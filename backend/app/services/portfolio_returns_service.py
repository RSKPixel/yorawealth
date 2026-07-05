from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional

from app.models.mutual_fund_transaction import MutualFundTransaction
from app.models.portfolio_holding import PortfolioHolding
from app.schemas.mutual_fund import PortfolioHoldingRow
from app.services.portfolio_returns import (
    _transaction_cash_flow,
    calculate_cagr,
    calculate_holding_cagr,
    calculate_holding_xirr,
    calculate_xirr,
)
from app.services.amfi_lookup import fetch_amfi_index, lookup_isin
from app.services.portfolio_holdings_service import _resolve_current_nav


class PortfolioReturnsService:
    def enrich_holdings(
        self,
        holdings: list[PortfolioHolding],
        transactions: list[MutualFundTransaction],
        valuation_date: Optional[date] = None,
    ) -> list[PortfolioHoldingRow]:
        valuation_date = valuation_date or date.today()
        grouped = self._group_transactions(transactions)
        amfi_index = fetch_amfi_index()
        rows: list[PortfolioHoldingRow] = []

        for holding in holdings:
            key = (holding.folio, holding.isin)
            group_transactions = grouped.get(key, [])
            invested_amount = float(holding.invested_amount)
            asset_class = holding.asset_class
            fund_type = holding.fund_type
            info = lookup_isin(holding.isin, amfi_index)
            if info:
                if not asset_class:
                    asset_class = info.asset_class
                if not fund_type:
                    fund_type = info.fund_type
            current_nav_decimal, current_nav_date = _resolve_current_nav(
                holding.isin,
                amfi_index,
                Decimal(str(holding.current_nav)),
            )
            current_nav = float(current_nav_decimal)
            current_value = round(float(holding.quantity) * current_nav, 2)
            unrealized_gain = round(current_value - invested_amount, 2)
            xirr = calculate_holding_xirr(
                group_transactions,
                current_value,
                valuation_date,
            )
            cagr = calculate_holding_cagr(
                group_transactions,
                invested_amount,
                current_value,
                valuation_date,
            )
            rows.append(
                PortfolioHoldingRow(
                    client_pan=holding.client_pan,
                    folio=holding.folio,
                    isin=holding.isin,
                    fund_name=holding.fund_name,
                    amc=holding.amc,
                    asset_class=asset_class,
                    fund_type=fund_type,
                    quantity=float(holding.quantity),
                    invested_amount=invested_amount,
                    avg_cost=float(holding.avg_cost),
                    current_nav=current_nav,
                    current_nav_date=current_nav_date,
                    current_value=current_value,
                    unrealized_gain=unrealized_gain,
                    xirr=xirr,
                    cagr=cagr,
                )
            )

        return rows

    def calculate_portfolio_metrics(
        self,
        holdings: list[PortfolioHoldingRow],
        transactions: list[MutualFundTransaction],
        valuation_date: Optional[date] = None,
    ) -> tuple[Optional[float], Optional[float]]:
        valuation_date = valuation_date or date.today()
        if not holdings or not transactions:
            return None, None

        total_invested = sum(row.invested_amount for row in holdings)
        total_current_value = sum(row.current_value for row in holdings)
        if total_invested <= 0 or total_current_value <= 0:
            return None, None

        active_keys = {(row.folio, row.isin) for row in holdings}
        active_transactions = [
            transaction
            for transaction in transactions
            if (transaction.folio, transaction.isin) in active_keys
        ]
        if not active_transactions:
            return None, None

        amounts = [
            _transaction_cash_flow(transaction) for transaction in active_transactions
        ]
        dates = [transaction.transaction_date for transaction in active_transactions]
        amounts.append(total_current_value)
        dates.append(valuation_date)
        portfolio_xirr = calculate_xirr(amounts, dates)

        start_date = min(
            transaction.transaction_date for transaction in active_transactions
        )
        portfolio_cagr = calculate_cagr(
            total_invested,
            total_current_value,
            start_date,
            valuation_date,
        )

        return portfolio_xirr, portfolio_cagr

    @staticmethod
    def _group_transactions(
        transactions: list[MutualFundTransaction],
    ) -> dict[tuple[str, str], list[MutualFundTransaction]]:
        grouped: dict[tuple[str, str], list[MutualFundTransaction]] = {}
        for transaction in transactions:
            key = (transaction.folio, transaction.isin)
            grouped.setdefault(key, []).append(transaction)
        return grouped
