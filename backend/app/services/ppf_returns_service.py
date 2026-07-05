from __future__ import annotations

import calendar
import re
from datetime import date
from decimal import Decimal
from typing import Optional

from app.models.ppf_transaction import PpfTransaction
from app.services.portfolio_returns import calculate_xirr

INTEREST_PERIOD_PATTERN = re.compile(
    r"Int\.Pd:(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})",
    re.IGNORECASE,
)


def _parse_dmy(value: str) -> date:
    day, month, year = value.split("-")
    return date(int(year), int(month), int(day))


def _parse_interest_period(remarks: Optional[str]) -> Optional[tuple[date, date]]:
    if not remarks:
        return None
    match = INTEREST_PERIOD_PATTERN.search(remarks)
    if not match:
        return None
    return _parse_dmy(match.group(1)), _parse_dmy(match.group(2))


def _infer_opening_balance(transaction: PpfTransaction) -> Decimal:
    if transaction.transaction_type == "withdrawal":
        return (
            transaction.balance
            + transaction.withdrawal_amount
            - transaction.deposit_amount
        )
    return transaction.balance - transaction.deposit_amount + transaction.withdrawal_amount


def _annualize_rate(period_rate: float, period_start: date, period_end: date) -> float:
    days = max((period_end - period_start).days, 1)
    if days >= 360:
        return period_rate
    return period_rate * (365.0 / days)


def _monthly_fifth_balances(
    opening_balance: float,
    period_start: date,
    period_end: date,
    activity: list[PpfTransaction],
) -> list[float]:
    events = [
        (transaction.transaction_date, float(transaction.balance))
        for transaction in sorted(activity, key=lambda row: (row.transaction_date, row.id))
        if transaction.transaction_type != "interest"
    ]

    def balance_at(on_date: date) -> float:
        balance = opening_balance
        for event_date, balance_after in events:
            if event_date <= on_date:
                balance = balance_after
            else:
                break
        return balance

    balances: list[float] = []
    year = period_start.year
    month = period_start.month
    while date(year, month, 1) <= period_end:
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])
        fifth = date(year, month, 5)

        if month_end >= period_start and fifth <= period_end:
            sample_date = max(fifth, period_start)
            balances.append(balance_at(sample_date))

        if month == 12:
            year += 1
            month = 1
        else:
            month += 1

    return balances


def calculate_ppf_interest_rate(
    transactions: list[PpfTransaction],
) -> Optional[float]:
    interest_transactions = [
        transaction
        for transaction in transactions
        if transaction.transaction_type == "interest" and transaction.deposit_amount > 0
    ]
    if not interest_transactions:
        return None

    latest_interest = max(
        interest_transactions,
        key=lambda row: (row.transaction_date, row.id),
    )
    interest_amount = float(latest_interest.deposit_amount)
    if interest_amount <= 0:
        return None

    period = _parse_interest_period(latest_interest.remarks)
    if period:
        period_start, period_end = period
    else:
        period_start = min(transaction.transaction_date for transaction in transactions)
        period_end = latest_interest.transaction_date

    period_activity = sorted(
        [
            transaction
            for transaction in transactions
            if (
                period_start <= transaction.transaction_date <= period_end
                and transaction.transaction_type != "interest"
            )
        ],
        key=lambda row: (row.transaction_date, row.id),
    )

    if period_activity:
        opening_balance = float(_infer_opening_balance(period_activity[0]))
    else:
        opening_balance = float(
            latest_interest.balance - latest_interest.deposit_amount
        )

    if opening_balance <= 0:
        return None

    monthly_balances = _monthly_fifth_balances(
        opening_balance,
        period_start,
        period_end,
        period_activity,
    )
    if not monthly_balances:
        return None

    average_balance = sum(monthly_balances) / len(monthly_balances)
    if average_balance <= 0:
        return None

    period_rate = interest_amount / average_balance
    return _annualize_rate(period_rate, period_start, period_end)


def _account_xirr(transactions: list[PpfTransaction]) -> Optional[float]:
    chronological = sorted(
        transactions,
        key=lambda row: (row.transaction_date, row.id),
    )

    amounts: list[float] = []
    dates: list[date] = []
    for transaction in chronological:
        if transaction.transaction_type == "interest":
            continue
        if transaction.deposit_amount > 0:
            amounts.append(-float(transaction.deposit_amount))
            dates.append(transaction.transaction_date)
        if transaction.withdrawal_amount > 0:
            amounts.append(float(transaction.withdrawal_amount))
            dates.append(transaction.transaction_date)

    if not amounts:
        return None

    latest = chronological[-1]
    terminal_value = float(latest.balance)
    if terminal_value <= 0:
        return None

    amounts.append(terminal_value)
    dates.append(latest.transaction_date)
    return calculate_xirr(amounts, dates)


def calculate_ppf_xirr(transactions: list[PpfTransaction]) -> Optional[float]:
    if not transactions:
        return None

    grouped: dict[str, list[PpfTransaction]] = {}
    for transaction in transactions:
        grouped.setdefault(transaction.account_number, []).append(transaction)

    if len(grouped) == 1:
        return _account_xirr(next(iter(grouped.values())))

    total_weight = 0.0
    weighted_xirr = 0.0
    for account_transactions in grouped.values():
        account_xirr = _account_xirr(account_transactions)
        if account_xirr is None:
            continue
        latest = max(
            account_transactions,
            key=lambda row: (row.transaction_date, row.id),
        )
        balance = float(latest.balance)
        if balance <= 0:
            continue
        total_weight += balance
        weighted_xirr += account_xirr * balance

    if total_weight <= 0:
        return None

    return weighted_xirr / total_weight
