from __future__ import annotations

from datetime import date
from typing import Optional

from app.models.mutual_fund_transaction import MutualFundTransaction


def _transaction_cash_flow(transaction: MutualFundTransaction) -> float:
    trade_value = abs(float(transaction.trade_value))
    if transaction.trade_type == "IN":
        return -trade_value
    return trade_value


def _xnpv(rate: float, amounts: list[float], day_offsets: list[int]) -> float:
    return sum(
        amount / ((1.0 + rate) ** (days / 365.0))
        for amount, days in zip(amounts, day_offsets)
    )


def _xnpv_derivative(rate: float, amounts: list[float], day_offsets: list[int]) -> float:
    return sum(
        -amount
        * (days / 365.0)
        / ((1.0 + rate) ** ((days / 365.0) + 1.0))
        for amount, days in zip(amounts, day_offsets)
    )


def _xirr_bisection(amounts: list[float], day_offsets: list[int]) -> Optional[float]:
    low = -0.9999
    high = 10.0
    low_value = _xnpv(low, amounts, day_offsets)
    high_value = _xnpv(high, amounts, day_offsets)

    if low_value * high_value > 0:
        return None

    for _ in range(200):
        mid = (low + high) / 2.0
        mid_value = _xnpv(mid, amounts, day_offsets)
        if abs(mid_value) < 1e-7:
            return mid
        if low_value * mid_value <= 0:
            high = mid
            high_value = mid_value
        else:
            low = mid
            low_value = mid_value

    return None


def calculate_xirr(amounts: list[float], dates: list[date]) -> Optional[float]:
    if len(amounts) != len(dates) or len(amounts) < 2:
        return None
    if not any(amount > 0 for amount in amounts) or not any(amount < 0 for amount in amounts):
        return None

    base_date = min(dates)
    day_offsets = [(dt - base_date).days for dt in dates]

    rate = 0.1
    for _ in range(100):
        value = _xnpv(rate, amounts, day_offsets)
        derivative = _xnpv_derivative(rate, amounts, day_offsets)
        if abs(derivative) < 1e-12:
            break

        next_rate = rate - (value / derivative)
        if next_rate <= -1.0:
            next_rate = rate / 2.0
        if abs(next_rate - rate) < 1e-8:
            if abs(value) < 1e-5:
                return next_rate
            return _xirr_bisection(amounts, day_offsets)

        rate = next_rate

    if abs(_xnpv(rate, amounts, day_offsets)) < 1e-5:
        return rate

    return _xirr_bisection(amounts, day_offsets)


def calculate_cagr(
    invested_amount: float,
    current_value: float,
    start_date: date,
    end_date: date,
) -> Optional[float]:
    if invested_amount <= 0 or current_value <= 0:
        return None

    years = (end_date - start_date).days / 365.25
    if years <= 0:
        return None

    return (current_value / invested_amount) ** (1.0 / years) - 1.0


def calculate_holding_xirr(
    transactions: list[MutualFundTransaction],
    terminal_value: float,
    valuation_date: date,
) -> Optional[float]:
    if terminal_value <= 0:
        return None

    amounts = [_transaction_cash_flow(transaction) for transaction in transactions]
    dates = [transaction.transaction_date for transaction in transactions]
    amounts.append(terminal_value)
    dates.append(valuation_date)
    return calculate_xirr(amounts, dates)


def calculate_holding_cagr(
    transactions: list[MutualFundTransaction],
    invested_amount: float,
    current_value: float,
    valuation_date: date,
) -> Optional[float]:
    if not transactions:
        return None

    start_date = min(transaction.transaction_date for transaction in transactions)
    return calculate_cagr(invested_amount, current_value, start_date, valuation_date)
