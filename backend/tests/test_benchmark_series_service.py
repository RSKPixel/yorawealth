from __future__ import annotations

import unittest
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.services.benchmark_series_service import build_portfolio_benchmark_series


class BuildPortfolioBenchmarkSeriesTests(unittest.TestCase):
    def test_builds_preset_and_portfolio_mutual_fund_benchmarks(self) -> None:
        holdings = [
            SimpleNamespace(isin="INF123456789", fund_name="Axis Bluechip Fund"),
        ]
        stock_repository = SimpleNamespace(
            map_close_series_up_to=lambda symbols, target_date: {
                "NIFTYBEES": [(date(2024, 1, 31), Decimal("250"))],
                "GOLDBEES": [(date(2024, 1, 31), Decimal("60"))],
            }
            if symbols
            else {},
        )
        mf_repository = SimpleNamespace(
            map_nav_series_up_to=lambda scheme_codes, target_date: {
                "123456": [(date(2024, 1, 31), Decimal("45.67"))],
            }
            if "123456" in scheme_codes
            else {},
        )

        benchmarks = build_portfolio_benchmark_series(
            stock_repository=stock_repository,
            mf_repository=mf_repository,
            holdings=holdings,
            amfi_index={},
            isin_scheme_map={"INF123456789": "123456"},
            to_date=date(2024, 1, 31),
        )

        benchmark_ids = [benchmark.id for benchmark in benchmarks]
        self.assertEqual(
            benchmark_ids,
            ["NIFTYBEES", "GOLDBEES", "mf:INF123456789"],
        )
        self.assertEqual(benchmarks[0].label, "NIFTYBEES")
        self.assertEqual(benchmarks[-1].label, "Axis Bluechip Fund")
        self.assertEqual(benchmarks[-1].points[0].close, 45.67)


if __name__ == "__main__":
    unittest.main()
