from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.market_data_sync_log import MarketDataSyncLog

IST = ZoneInfo("Asia/Kolkata")
COMPLETED_DAILY_STATUSES = ("success", "partial", "skipped")


class MarketDataSyncLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        trigger: str,
        status: str,
        summary: Optional[str] = None,
        details: Optional[dict] = None,
    ) -> MarketDataSyncLog:
        record = MarketDataSyncLog(
            user_id=user_id,
            trigger=trigger,
            status=status,
            summary=summary,
            details=details,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_by_id(self, log_id: int, user_id: int) -> Optional[MarketDataSyncLog]:
        return (
            self.db.query(MarketDataSyncLog)
            .filter(
                MarketDataSyncLog.id == log_id,
                MarketDataSyncLog.user_id == user_id,
            )
            .first()
        )

    def list_recent(self, user_id: int, limit: int = 50) -> list[MarketDataSyncLog]:
        return (
            self.db.query(MarketDataSyncLog)
            .filter(MarketDataSyncLog.user_id == user_id)
            .order_by(MarketDataSyncLog.started_at.desc())
            .limit(limit)
            .all()
        )

    def find_daily_completed_today(self, user_id: int) -> Optional[MarketDataSyncLog]:
        today = datetime.now(IST).date()
        records = (
            self.db.query(MarketDataSyncLog)
            .filter(
                MarketDataSyncLog.user_id == user_id,
                MarketDataSyncLog.trigger == "daily",
                MarketDataSyncLog.status.in_(COMPLETED_DAILY_STATUSES),
            )
            .order_by(MarketDataSyncLog.started_at.desc())
            .limit(20)
            .all()
        )
        for record in records:
            if _to_ist_date(record.started_at) == today:
                return record
        return None

    def find_recent_running(
        self,
        user_id: int,
        *,
        within_minutes: int,
    ) -> Optional[MarketDataSyncLog]:
        cutoff = datetime.utcnow() - timedelta(minutes=within_minutes)
        return (
            self.db.query(MarketDataSyncLog)
            .filter(
                MarketDataSyncLog.user_id == user_id,
                MarketDataSyncLog.trigger == "daily",
                MarketDataSyncLog.status == "running",
                MarketDataSyncLog.started_at >= cutoff,
            )
            .order_by(MarketDataSyncLog.started_at.desc())
            .first()
        )

    def complete(
        self,
        record: MarketDataSyncLog,
        *,
        status: str,
        summary: str,
        details: Optional[dict] = None,
    ) -> MarketDataSyncLog:
        record.status = status
        record.summary = summary
        record.details = details
        record.completed_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(record)
        return record


def _to_ist_date(value: datetime) -> date:
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo("UTC"))
    return value.astimezone(IST).date()
