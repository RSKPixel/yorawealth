from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.repositories.market_data_sync_log_repository import MarketDataSyncLogRepository
from app.services.amfi_eod_sync_service import AmfiEodSyncService
from app.services.amfi_historical_sync_service import AmfiHistoricalSyncService
from app.services.nse_eod_historical_sync_service import NseEodHistoricalSyncService
from app.services.nse_eod_sync_service import NseEodSyncService

logger = logging.getLogger(__name__)

AMFI_HISTORICAL_PERIOD_DAYS = 1824
NSE_HISTORICAL_PERIOD_DAYS = 3650
RUNNING_STALE_MINUTES = 30


class MarketDataSyncService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.log_repository = MarketDataSyncLogRepository(db)
        self.amfi_eod_service = AmfiEodSyncService(db)
        self.amfi_historical_service = AmfiHistoricalSyncService(db)
        self.nse_eod_service = NseEodSyncService(db)
        self.nse_historical_service = NseEodHistoricalSyncService(db)

    def request_daily_sync(
        self,
        *,
        user_id: int,
        client_pan: str,
    ) -> dict:
        completed_today = self.log_repository.find_daily_completed_today(user_id)
        if completed_today is not None:
            summary = (
                f"Daily market data sync already completed today at "
                f"{completed_today.started_at.isoformat()}."
            )
            skipped = self.log_repository.create(
                user_id=user_id,
                trigger="daily",
                status="skipped",
                summary=summary,
                details={"previous_log_id": completed_today.id},
            )
            logger.info(
                "Skipped daily market data sync for user %s (log %s)",
                user_id,
                skipped.id,
            )
            return {
                "status": "skipped",
                "log_id": skipped.id,
                "message": summary,
            }

        running = self.log_repository.find_recent_running(
            user_id,
            within_minutes=RUNNING_STALE_MINUTES,
        )
        if running is not None:
            message = "Daily market data sync is already in progress."
            logger.info(
                "Daily market data sync already running for user %s (log %s)",
                user_id,
                running.id,
            )
            return {
                "status": "running",
                "log_id": running.id,
                "message": message,
            }

        log = self.log_repository.create(
            user_id=user_id,
            trigger="daily",
            status="running",
            summary="Daily market data sync started.",
        )
        logger.info(
            "Queued daily market data sync for user %s (log %s)",
            user_id,
            log.id,
        )
        return {
            "status": "started",
            "log_id": log.id,
            "message": "Daily market data sync started in background.",
            "client_pan": client_pan,
        }

    def run_logged_sync(
        self,
        *,
        log_id: int,
        user_id: int,
        client_pan: str,
        trigger: str,
    ) -> None:
        try:
            details = self._run_full_sync_steps(client_pan)
            status, summary = _aggregate_status(details)
            record = self.log_repository.get_by_id(log_id, user_id)
            if record is None:
                raise RuntimeError(f"Sync log {log_id} not found.")
            self.log_repository.complete(
                record,
                status=status,
                summary=summary,
                details=details,
            )
            logger.info(
                "Market data sync %s finished for user %s with status %s",
                log_id,
                user_id,
                status,
            )
        except Exception as error:
            logger.exception(
                "Market data sync %s failed for user %s",
                log_id,
                user_id,
            )
            record = self.log_repository.get_by_id(log_id, user_id)
            if record is not None:
                self.log_repository.complete(
                    record,
                    status="failed",
                    summary=f"Market data sync failed: {error}",
                    details={"error": str(error), "trigger": trigger},
                )

    def run_manual_sync(self, *, user_id: int, client_pan: str) -> dict:
        log = self.log_repository.create(
            user_id=user_id,
            trigger="manual",
            status="running",
            summary="Manual market data sync started.",
        )
        details = self._run_full_sync_steps(client_pan)
        status, summary = _aggregate_status(details)
        completed = self.log_repository.complete(
            log,
            status=status,
            summary=summary,
            details=details,
        )
        return {
            "status": status,
            "log_id": completed.id,
            "message": summary,
            "details": details,
        }

    def list_logs(self, user_id: int, limit: int = 50) -> dict:
        logs = self.log_repository.list_recent(user_id, limit=limit)
        last_daily = next(
            (log for log in logs if log.trigger == "daily" and log.status != "skipped"),
            None,
        )
        return {
            "logs": logs,
            "last_daily": last_daily,
        }

    def _run_full_sync_steps(self, client_pan: str) -> dict:
        details: dict = {}

        details["amfi_eod"] = self._run_step(
            "amfi_eod",
            lambda: self.amfi_eod_service.sync_latest(),
        )
        details["amfi_historical"] = self._run_step(
            "amfi_historical",
            lambda: self.amfi_historical_service.sync_isins(
                client_pan=client_pan,
                period_days=AMFI_HISTORICAL_PERIOD_DAYS,
            ),
        )
        details["nse_eod"] = self._run_step(
            "nse_eod",
            lambda: self.nse_eod_service.sync_latest(),
        )

        resolved_symbols = self.nse_historical_service.resolve_symbols(
            client_pan=client_pan,
        )
        details["nse_historical"] = self._run_step(
            "nse_historical",
            lambda: self.nse_historical_service.sync_symbols(
                resolved_symbols,
                period_days=NSE_HISTORICAL_PERIOD_DAYS,
            ),
        )
        return details

    def _run_step(self, name: str, task) -> dict:
        try:
            result = task()
            errors = list(result.get("errors") or [])
            rows_processed = int(result.get("rows_processed") or 0)
            if errors and rows_processed == 0:
                status = "failed"
                message = f"{name} sync failed."
            elif errors:
                status = "partial"
                message = f"{name} sync completed with warnings."
            else:
                status = "success"
                message = f"{name} sync completed."

            logger.info(
                "Market data step %s finished with status %s (%s rows)",
                name,
                status,
                rows_processed,
            )
            return {
                "status": status,
                "rows_processed": rows_processed,
                "message": message,
                "errors": errors[:10],
                "result": _sanitize_result(result),
            }
        except Exception as error:
            logger.warning("Market data step %s failed: %s", name, error)
            return {
                "status": "failed",
                "rows_processed": 0,
                "message": f"{name} sync failed: {error}",
                "errors": [str(error)],
            }


def run_daily_sync_background(
    *,
    log_id: int,
    user_id: int,
    client_pan: str,
) -> None:
    db = SessionLocal()
    try:
        MarketDataSyncService(db).run_logged_sync(
            log_id=log_id,
            user_id=user_id,
            client_pan=client_pan,
            trigger="daily",
        )
    finally:
        db.close()


def _aggregate_status(details: dict) -> tuple[str, str]:
    statuses = [step.get("status", "failed") for step in details.values()]
    if all(status == "success" for status in statuses):
        return "success", "Market data sync completed successfully."
    if all(status == "failed" for status in statuses):
        return "failed", "Market data sync failed."
    if any(status in ("success", "partial") for status in statuses):
        return "partial", "Market data sync completed with warnings."
    return "failed", "Market data sync failed."


def _sanitize_result(result: dict) -> dict:
    allowed_keys = (
        "nav_date",
        "bhavdate",
        "trade_date",
        "from_date",
        "to_date",
        "created_count",
        "updated_count",
        "symbols",
        "isins",
    )
    sanitized = {}
    for key in allowed_keys:
        if key in result and result[key] is not None:
            sanitized[key] = result[key]
    return sanitized


def serialize_sync_log(record) -> dict:
    return {
        "id": record.id,
        "trigger": record.trigger,
        "status": record.status,
        "summary": record.summary,
        "details": record.details,
        "started_at": _format_datetime(record.started_at),
        "completed_at": _format_datetime(record.completed_at),
    }


def _format_datetime(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.isoformat()
