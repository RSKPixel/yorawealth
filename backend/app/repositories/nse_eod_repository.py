from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.nse_eod import NseEod
from app.services.nse_eod_lookup import eod_symbol_candidates


class NseEodRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_symbol(self, symbol: str) -> Optional[NseEod]:
        for candidate in eod_symbol_candidates(symbol):
            record = (
                self.db.query(NseEod)
                .filter(NseEod.symbol == candidate)
                .first()
            )
            if record is not None:
                return record
        return None

    def map_by_symbols(self, symbols: list[str]) -> dict[str, NseEod]:
        if not symbols:
            return {}

        symbol_candidates: dict[str, list[str]] = {}
        lookup_keys: set[str] = set()
        for symbol in symbols:
            normalized = symbol.upper()
            candidates = eod_symbol_candidates(normalized)
            symbol_candidates[normalized] = candidates
            lookup_keys.update(candidates)

        records = (
            self.db.query(NseEod)
            .filter(NseEod.symbol.in_(lookup_keys))
            .all()
        )
        eod_index = {record.symbol: record for record in records}

        resolved: dict[str, NseEod] = {}
        for symbol, candidates in symbol_candidates.items():
            for candidate in candidates:
                record = eod_index.get(candidate)
                if record is not None:
                    resolved[symbol] = record
                    break

        return resolved

    def upsert_many(self, rows: list[dict]) -> tuple[int, int]:
        existing = {
            record.symbol: record
            for record in self.db.query(NseEod).all()
        }
        created_count = 0
        updated_count = 0

        for row in rows:
            symbol = row["symbol"].upper()
            record = existing.get(symbol)
            if record is None:
                record = NseEod(symbol=symbol)
                self.db.add(record)
                existing[symbol] = record
                created_count += 1
            else:
                updated_count += 1

            record.trade_date = row["trade_date"]
            record.prev_close = Decimal(str(row["prev_close"]))
            record.open = Decimal(str(row["open"]))
            record.high = Decimal(str(row["high"]))
            record.low = Decimal(str(row["low"]))
            record.close = Decimal(str(row["close"]))
            record.name = row.get("name")

        self.db.commit()
        return created_count, updated_count
