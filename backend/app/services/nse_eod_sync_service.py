from sqlalchemy.orm import Session

from app.repositories.nse_eod_repository import NseEodRepository
from app.services.nse_eod_client import download_latest_nse_eod


class NseEodSyncService:
    def __init__(self, db: Session) -> None:
        self.repository = NseEodRepository(db)

    def sync_latest(self) -> dict:
        rows, bhavdate = download_latest_nse_eod()
        created_count, updated_count = self.repository.upsert_many(rows)
        return {
            "bhavdate": bhavdate,
            "trade_date": rows[0]["trade_date"].isoformat() if rows else None,
            "rows_processed": len(rows),
            "created_count": created_count,
            "updated_count": updated_count,
        }
