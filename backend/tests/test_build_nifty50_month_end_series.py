from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.repositories.index_historical_repository import IndexHistoricalRepository
from app.services.investment_progress_service import build_nifty50_month_end_series


class BuildNifty50MonthEndSeriesTests(unittest.TestCase):
    def test_builds_forward_filled_month_end_closes(self) -> None:
        repository = SimpleNamespace(
            list_by_symbol=lambda _symbol, from_date, to_date: [
                SimpleNamespace(trade_date=date(2024, 1, 31), close=Decimal("21700")),
                SimpleNamespace(trade_date=date(2024, 2, 29), close=Decimal("22000")),
            ]
            if from_date <= date(2024, 2, 29) <= to_date
            else [],
        )

        points = build_nifty50_month_end_series(
            repository,
            date(2024, 3, 31),
        )

        january = next(point for point in points if point.month == "2024-01")
        february = next(point for point in points if point.month == "2024-02")
        march = next(point for point in points if point.month == "2024-03")

        self.assertEqual(january.close, 21700.0)
        self.assertEqual(february.close, 22000.0)
        self.assertEqual(march.close, 22000.0)


if __name__ == "__main__":
    unittest.main()
