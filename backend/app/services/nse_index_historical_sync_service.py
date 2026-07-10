from __future__ import annotations

import logging
from datetime import date

from sqlalchemy.orm import Session

from app.repositories.index_historical_repository import IndexHistoricalRepository
from app.services.nse_index_historical_client import (
    NIFTY_50_SYMBOL,
    download_index_historical,
)

logger = logging.getLogger(__name__)


class NseIndexHistoricalSyncService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = IndexHistoricalRepository(db)

    def sync_symbol(
        self,
        symbol: str,
        from_date: date,
        to_date: date,
    ) -> dict:
        if from_date > to_date:
            return {
                "symbol": symbol,
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "rows_processed": 0,
                "errors": [],
            }

        try:
            rows = download_index_historical(symbol, from_date, to_date)
            if rows:
                self.repository.upsert_many(rows)
            return {
                "symbol": symbol,
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "rows_processed": len(rows),
                "errors": [],
            }
        except Exception as error:
            logger.warning("Failed to sync index history for %s: %s", symbol, error)
            return {
                "symbol": symbol,
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "rows_processed": 0,
                "errors": [str(error)],
            }

    def ensure_history(
        self,
        symbol: str,
        from_date: date,
        to_date: date,
    ) -> list[str]:
        if from_date > to_date:
            return []

        earliest = self.repository.get_earliest_date(symbol)
        if earliest is None or earliest > from_date:
            result = self.sync_symbol(symbol, from_date, to_date)
            return result["errors"]

        latest_row = self.repository.list_by_symbol(symbol, to_date, to_date)
        needs_refresh = not latest_row or latest_row[-1].trade_date < to_date
        if needs_refresh:
            refresh_from = max(from_date, earliest)
            result = self.sync_symbol(symbol, refresh_from, to_date)
            return result["errors"]

        return []

    def ensure_nifty50_history(self, from_date: date, to_date: date) -> list[str]:
        return self.ensure_history(NIFTY_50_SYMBOL, from_date, to_date)
