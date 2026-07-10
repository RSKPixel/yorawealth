from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from app.models.index_historical import IndexHistorical


class IndexHistoricalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_close_on_or_before(
        self,
        symbol: str,
        target_date: date,
    ) -> Optional[Decimal]:
        row = (
            self.db.query(IndexHistorical.close)
            .filter(
                IndexHistorical.symbol == symbol.upper(),
                IndexHistorical.trade_date <= target_date,
            )
            .order_by(IndexHistorical.trade_date.desc())
            .first()
        )
        return row[0] if row else None

    def get_earliest_date(self, symbol: str) -> Optional[date]:
        row = (
            self.db.query(IndexHistorical.trade_date)
            .filter(IndexHistorical.symbol == symbol.upper())
            .order_by(IndexHistorical.trade_date.asc())
            .first()
        )
        return row[0] if row else None

    def list_by_symbol(
        self,
        symbol: str,
        from_date: date,
        to_date: date,
    ) -> list[IndexHistorical]:
        return (
            self.db.query(IndexHistorical)
            .filter(
                IndexHistorical.symbol == symbol.upper(),
                IndexHistorical.trade_date >= from_date,
                IndexHistorical.trade_date <= to_date,
            )
            .order_by(IndexHistorical.trade_date.asc())
            .all()
        )

    def upsert_many(self, rows: list[dict]) -> int:
        if not rows:
            return 0

        now = datetime.utcnow()
        values = []
        for row in rows:
            values.append(
                {
                    "symbol": row["symbol"].upper(),
                    "trade_date": row["trade_date"],
                    "close": Decimal(str(row["close"])),
                    "fetched_at": now,
                }
            )

        statement = insert(IndexHistorical).values(values)
        statement = statement.on_duplicate_key_update(
            close=statement.inserted.close,
            fetched_at=statement.inserted.fetched_at,
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount or len(values)
