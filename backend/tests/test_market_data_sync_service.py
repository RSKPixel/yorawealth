from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

from app.repositories.market_data_sync_log_repository import (
    IST,
    MarketDataSyncLogRepository,
)
from app.services.market_data_sync_service import (
    MarketDataSyncService,
    _aggregate_status,
)

IST_NOW = datetime(2026, 7, 10, 9, 0, tzinfo=IST)


class AggregateStatusTests(unittest.TestCase):
    def test_all_success(self) -> None:
        details = {
            "amfi_eod": {"status": "success"},
            "nse_eod": {"status": "success"},
        }
        status, summary = _aggregate_status(details)
        self.assertEqual(status, "success")

    def test_partial_when_some_steps_warn(self) -> None:
        details = {
            "amfi_eod": {"status": "success"},
            "nse_historical": {"status": "partial"},
        }
        status, _ = _aggregate_status(details)
        self.assertEqual(status, "partial")


class MarketDataSyncServiceTests(unittest.TestCase):
    def test_request_daily_sync_skips_when_completed_today(self) -> None:
        db = MagicMock()
        service = MarketDataSyncService(db)
        completed = SimpleNamespace(id=7, started_at=IST_NOW.replace(tzinfo=None))
        service.log_repository = MagicMock()
        service.log_repository.find_daily_completed_today.return_value = completed
        service.log_repository.create.return_value = SimpleNamespace(id=8)

        outcome = service.request_daily_sync(user_id=1, client_pan="ABCDE1234F")

        self.assertEqual(outcome["status"], "skipped")
        service.log_repository.create.assert_called_once()

    def test_run_manual_sync_writes_details(self) -> None:
        db = MagicMock()
        service = MarketDataSyncService(db)
        service.log_repository = MagicMock()
        running_log = SimpleNamespace(id=11)
        completed_log = SimpleNamespace(id=11)
        service.log_repository.create.return_value = running_log
        service.log_repository.complete.return_value = completed_log
        service._run_full_sync_steps = MagicMock(
            return_value={
                "amfi_eod": {"status": "success", "rows_processed": 10, "errors": []},
                "amfi_historical": {"status": "success", "rows_processed": 5, "errors": []},
                "nse_eod": {"status": "success", "rows_processed": 100, "errors": []},
                "nse_historical": {
                    "status": "partial",
                    "rows_processed": 20,
                    "errors": ["warn"],
                },
            }
        )

        outcome = service.run_manual_sync(user_id=2, client_pan="ABCDE1234F")

        self.assertEqual(outcome["status"], "partial")
        self.assertEqual(outcome["log_id"], 11)
        service.log_repository.complete.assert_called_once()


class MarketDataSyncLogRepositoryTests(unittest.TestCase):
    def test_find_recent_running_respects_cutoff(self) -> None:
        repository = MarketDataSyncLogRepository(MagicMock())
        repository.db = MagicMock()
        recent = SimpleNamespace(id=3)
        repository.db.query.return_value.filter.return_value.order_by.return_value.first.return_value = (
            recent
        )

        result = repository.find_recent_running(1, within_minutes=30)

        self.assertEqual(result.id, 3)


if __name__ == "__main__":
    unittest.main()
