from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.services.investment_progress_service import (
    HistoricalPriceLookup,
    compute_investment_progress,
)


def _mf_txn(
    *,
    folio: str = "F1",
    isin: str = "INF123456789",
    transaction_date: date,
    trade_type: str = "IN",
    quantity: str = "10",
    trade_value: str = "1000",
    nav: str = "100",
) -> SimpleNamespace:
    return SimpleNamespace(
        folio=folio,
        isin=isin,
        transaction_date=transaction_date,
        trade_type=trade_type,
        quantity=Decimal(quantity),
        trade_value=Decimal(trade_value),
        nav=Decimal(nav),
    )


def _stock_txn(
    *,
    symbol: str = "RELIANCE",
    transaction_date: date,
    trade_type: str = "BUY",
    quantity: str = "10",
    price: str = "100",
) -> SimpleNamespace:
    return SimpleNamespace(
        symbol=symbol,
        transaction_date=transaction_date,
        trade_type=trade_type,
        quantity=Decimal(quantity),
        price=Decimal(price),
    )


def _ppf_txn(
    *,
    account_number: str = "PPF001",
    transaction_date: date,
    deposit_amount: str = "0",
    withdrawal_amount: str = "0",
    balance: str = "0",
) -> SimpleNamespace:
    return SimpleNamespace(
        account_number=account_number,
        transaction_date=transaction_date,
        deposit_amount=Decimal(deposit_amount),
        withdrawal_amount=Decimal(withdrawal_amount),
        balance=Decimal(balance),
        id=1,
    )


class InvestmentProgressServiceTests(unittest.TestCase):
    def test_empty_portfolio_returns_empty_series(self) -> None:
        progress = compute_investment_progress(
            mf_transactions=[],
            stock_transactions=[],
            ppf_transactions=[],
            price_lookup=HistoricalPriceLookup.from_series(),
            isin_scheme_map={},
        )
        self.assertEqual(progress, {"mf": [], "stocks": [], "ppf": []})

    def test_mf_buy_values_at_higher_nav(self) -> None:
        scheme_code = "123456"
        price_lookup = HistoricalPriceLookup.from_series(
            mf_series={
                scheme_code: [
                    (date(2024, 1, 31), Decimal("100")),
                    (date(2024, 2, 29), Decimal("120")),
                ]
            }
        )

        progress = compute_investment_progress(
            mf_transactions=[
                _mf_txn(transaction_date=date(2024, 1, 15)),
            ],
            stock_transactions=[],
            ppf_transactions=[],
            price_lookup=price_lookup,
            isin_scheme_map={"INF123456789": scheme_code},
            end_date=date(2024, 2, 29),
        )

        points = progress["mf"]
        self.assertEqual(progress["stocks"], [])
        self.assertEqual(progress["ppf"], [])
        self.assertEqual(len(points), 2)
        jan = points[0]
        feb = points[1]

        self.assertEqual(jan.month, "2024-01")
        self.assertEqual(jan.invested_value, 1000.0)
        self.assertEqual(jan.current_value, 1000.0)
        self.assertEqual(jan.pl, 0.0)

        self.assertEqual(feb.invested_value, 1000.0)
        self.assertEqual(feb.current_value, 1200.0)
        self.assertEqual(feb.pl, 200.0)
        self.assertEqual(feb.plp, 20.0)

    def test_stock_sell_reduces_invested_basis(self) -> None:
        price_lookup = HistoricalPriceLookup.from_series(
            stock_series={
                "RELIANCE": [
                    (date(2024, 1, 31), Decimal("100")),
                    (date(2024, 2, 29), Decimal("100")),
                ]
            }
        )

        progress = compute_investment_progress(
            mf_transactions=[],
            stock_transactions=[
                _stock_txn(transaction_date=date(2024, 1, 10)),
                _stock_txn(
                    transaction_date=date(2024, 2, 5),
                    trade_type="SELL",
                    quantity="4",
                ),
            ],
            ppf_transactions=[],
            price_lookup=price_lookup,
            isin_scheme_map={},
            end_date=date(2024, 2, 29),
        )

        points = progress["stocks"]
        self.assertEqual(len(points), 2)
        feb = points[1]
        self.assertEqual(feb.invested_value, 600.0)
        self.assertEqual(feb.current_value, 600.0)
        self.assertEqual(feb.pl, 0.0)

    def test_ppf_balance_contributes_to_current_value(self) -> None:
        progress = compute_investment_progress(
            mf_transactions=[],
            stock_transactions=[],
            ppf_transactions=[
                _ppf_txn(
                    transaction_date=date(2024, 3, 10),
                    deposit_amount="50000",
                    balance="50000",
                ),
                _ppf_txn(
                    transaction_date=date(2024, 4, 12),
                    deposit_amount="10000",
                    balance="61200",
                ),
            ],
            price_lookup=HistoricalPriceLookup.from_series(),
            isin_scheme_map={},
            end_date=date(2024, 4, 30),
        )

        points = progress["ppf"]
        self.assertEqual(len(points), 2)
        april = points[1]
        self.assertEqual(april.invested_value, 60000.0)
        self.assertEqual(april.current_value, 61200.0)
        self.assertEqual(april.pl, 1200.0)

    def test_chart_starts_from_jan_2022(self) -> None:
        scheme_code = "123456"
        price_lookup = HistoricalPriceLookup.from_series(
            mf_series={
                scheme_code: [
                    (date(2022, 1, 31), Decimal("150")),
                    (date(2022, 2, 28), Decimal("160")),
                    (date(2022, 3, 31), Decimal("170")),
                ]
            }
        )

        progress = compute_investment_progress(
            mf_transactions=[
                _mf_txn(transaction_date=date(2019, 6, 15)),
            ],
            stock_transactions=[],
            ppf_transactions=[],
            price_lookup=price_lookup,
            isin_scheme_map={"INF123456789": scheme_code},
            end_date=date(2022, 3, 31),
        )

        points = progress["mf"]
        self.assertEqual(len(points), 3)
        self.assertEqual(points[0].month, "2022-01")
        self.assertEqual(points[0].invested_value, 1000.0)
        self.assertEqual(points[0].current_value, 1500.0)
        self.assertEqual(points[-1].month, "2022-03")
        self.assertEqual(points[-1].current_value, 1700.0)

    def test_emits_every_month_even_without_activity(self) -> None:
        scheme_code = "123456"
        price_lookup = HistoricalPriceLookup.from_series(
            mf_series={
                scheme_code: [
                    (date(2024, 1, 31), Decimal("100")),
                    (date(2024, 2, 29), Decimal("110")),
                    (date(2024, 3, 31), Decimal("120")),
                ]
            }
        )

        progress = compute_investment_progress(
            mf_transactions=[
                _mf_txn(transaction_date=date(2024, 1, 15)),
            ],
            stock_transactions=[],
            ppf_transactions=[],
            price_lookup=price_lookup,
            isin_scheme_map={"INF123456789": scheme_code},
            end_date=date(2024, 3, 31),
        )

        points = progress["mf"]
        self.assertEqual([point.month for point in points], ["2024-01", "2024-02", "2024-03"])
        self.assertEqual(points[0].invested_value, 1000.0)
        self.assertEqual(points[1].invested_value, 1000.0)
        self.assertEqual(points[2].invested_value, 1000.0)
        self.assertEqual(points[1].current_value, 1100.0)

    def test_emits_zero_months_when_holdings_flat(self) -> None:
        price_lookup = HistoricalPriceLookup.from_series(
            stock_series={
                "RELIANCE": [
                    (date(2024, 1, 31), Decimal("100")),
                    (date(2024, 2, 29), Decimal("100")),
                    (date(2024, 3, 31), Decimal("100")),
                ]
            }
        )

        progress = compute_investment_progress(
            mf_transactions=[],
            stock_transactions=[
                _stock_txn(transaction_date=date(2024, 1, 10)),
                _stock_txn(
                    transaction_date=date(2024, 2, 5),
                    trade_type="SELL",
                    quantity="10",
                ),
            ],
            ppf_transactions=[],
            price_lookup=price_lookup,
            isin_scheme_map={},
            end_date=date(2024, 3, 31),
        )

        points = progress["stocks"]
        self.assertEqual([point.month for point in points], ["2024-01", "2024-02", "2024-03"])
        self.assertEqual(points[0].invested_value, 1000.0)
        self.assertEqual(points[1].invested_value, 0.0)
        self.assertEqual(points[1].current_value, 0.0)
        self.assertEqual(points[2].invested_value, 0.0)


if __name__ == "__main__":
    unittest.main()
