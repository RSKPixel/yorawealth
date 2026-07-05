from __future__ import annotations

from datetime import date
from typing import Optional

from app.models.nse_eod import NseEod
from app.models.stock import Stock
from app.models.stock_transaction import StockTransaction
from app.schemas.stocks import StockHoldingRow
from app.services.portfolio_returns import calculate_xirr
from app.services.stock_mapper import holding_to_row


def _stock_transaction_cash_flow(transaction: StockTransaction) -> float:
    trade_value = abs(float(transaction.trade_value))
    if transaction.trade_type in {"BUY", "BUY BACK", "IPO"}:
        return -trade_value
    if transaction.trade_type == "SELL":
        return trade_value
    return 0.0


def calculate_stock_holding_xirr(
    transactions: list[StockTransaction],
    terminal_value: float,
    valuation_date: date,
) -> Optional[float]:
    if terminal_value <= 0 or not transactions:
        return None

    amounts = []
    dates = []
    for transaction in transactions:
        cash_flow = _stock_transaction_cash_flow(transaction)
        if cash_flow == 0:
            continue
        amounts.append(cash_flow)
        dates.append(transaction.transaction_date)

    if not amounts:
        return None

    amounts.append(terminal_value)
    dates.append(valuation_date)
    return calculate_xirr(amounts, dates)


def resolve_stock_valuation_date(eod_map: dict[str, NseEod]) -> date:
    if not eod_map:
        return date.today()
    return max(record.trade_date for record in eod_map.values())


class StockReturnsService:
    @staticmethod
    def _group_by_symbol(
        transactions: list[StockTransaction],
    ) -> dict[str, list[StockTransaction]]:
        grouped: dict[str, list[StockTransaction]] = {}
        for transaction in transactions:
            grouped.setdefault(transaction.symbol.upper(), []).append(transaction)
        return grouped

    def enrich_holdings(
        self,
        records: list[Stock],
        transactions: list[StockTransaction],
        eod_map: dict[str, NseEod],
        valuation_date: Optional[date] = None,
    ) -> list[StockHoldingRow]:
        valuation_date = valuation_date or resolve_stock_valuation_date(eod_map)
        grouped = self._group_by_symbol(transactions)
        rows: list[StockHoldingRow] = []

        for record in records:
            eod = eod_map.get(record.symbol)
            row = holding_to_row(record, eod)
            symbol_transactions = grouped.get(record.symbol.upper(), [])
            xirr = calculate_stock_holding_xirr(
                symbol_transactions,
                row.current_value,
                valuation_date,
            )
            rows.append(row.model_copy(update={"xirr": xirr}))

        return rows

    def calculate_portfolio_xirr(
        self,
        holdings: list[StockHoldingRow],
        transactions: list[StockTransaction],
        valuation_date: Optional[date] = None,
    ) -> Optional[float]:
        valuation_date = valuation_date or date.today()
        if not holdings or not transactions:
            return None

        total_current_value = sum(row.current_value for row in holdings)
        if total_current_value <= 0:
            return None

        active_symbols = {row.symbol.upper() for row in holdings}
        active_transactions = [
            transaction
            for transaction in transactions
            if transaction.symbol.upper() in active_symbols
        ]
        if not active_transactions:
            return None

        amounts = []
        dates = []
        for transaction in active_transactions:
            cash_flow = _stock_transaction_cash_flow(transaction)
            if cash_flow == 0:
                continue
            amounts.append(cash_flow)
            dates.append(transaction.transaction_date)

        if not amounts:
            return None

        amounts.append(total_current_value)
        dates.append(valuation_date)
        return calculate_xirr(amounts, dates)
