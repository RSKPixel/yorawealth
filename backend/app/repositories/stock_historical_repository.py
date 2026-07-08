from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from app.models.stock_historical import StockHistorical
from app.services.nse_eod_lookup import eod_symbol_candidates


class StockHistoricalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_symbol(
        self,
        symbol: str,
        from_date: date,
        to_date: date,
    ) -> list[StockHistorical]:
        candidates = eod_symbol_candidates(symbol)
        return (
            self.db.query(StockHistorical)
            .filter(
                StockHistorical.symbol.in_(candidates),
                StockHistorical.trade_date >= from_date,
                StockHistorical.trade_date <= to_date,
            )
            .order_by(StockHistorical.trade_date.asc())
            .all()
        )

    def get_close_on_or_before(
        self,
        symbol: str,
        target_date: date,
    ) -> Optional[Decimal]:
        candidates = eod_symbol_candidates(symbol)
        row = (
            self.db.query(StockHistorical.close)
            .filter(
                StockHistorical.symbol.in_(candidates),
                StockHistorical.trade_date <= target_date,
            )
            .order_by(StockHistorical.trade_date.desc())
            .first()
        )
        return row[0] if row else None

    def map_close_on_or_before(
        self,
        symbols: list[str],
        target_date: date,
    ) -> dict[str, Decimal]:
        if not symbols:
            return {}

        symbol_candidates: dict[str, list[str]] = {}
        lookup_keys: set[str] = set()
        for symbol in symbols:
            normalized = symbol.upper()
            candidates = eod_symbol_candidates(normalized)
            symbol_candidates[normalized] = candidates
            lookup_keys.update(candidates)

        rows = (
            self.db.query(
                StockHistorical.symbol,
                StockHistorical.trade_date,
                StockHistorical.close,
            )
            .filter(
                StockHistorical.symbol.in_(lookup_keys),
                StockHistorical.trade_date <= target_date,
            )
            .order_by(
                StockHistorical.symbol.asc(),
                StockHistorical.trade_date.desc(),
            )
            .all()
        )

        latest_by_symbol: dict[str, Decimal] = {}
        for row_symbol, _, close in rows:
            if row_symbol not in latest_by_symbol:
                latest_by_symbol[row_symbol] = close

        resolved: dict[str, Decimal] = {}
        for symbol, candidates in symbol_candidates.items():
            for candidate in candidates:
                close = latest_by_symbol.get(candidate)
                if close is not None:
                    resolved[symbol] = close
                    break

        return resolved

    def map_close_series_up_to(
        self,
        symbols: list[str],
        to_date: date,
    ) -> dict[str, list[tuple[date, Decimal]]]:
        if not symbols:
            return {}

        symbol_candidates: dict[str, list[str]] = {}
        lookup_keys: set[str] = set()
        candidate_to_symbol: dict[str, str] = {}
        for symbol in symbols:
            normalized = symbol.upper()
            candidates = eod_symbol_candidates(normalized)
            symbol_candidates[normalized] = candidates
            for candidate in candidates:
                lookup_keys.add(candidate)
                candidate_to_symbol[candidate] = normalized

        rows = (
            self.db.query(
                StockHistorical.symbol,
                StockHistorical.trade_date,
                StockHistorical.close,
            )
            .filter(
                StockHistorical.symbol.in_(lookup_keys),
                StockHistorical.trade_date <= to_date,
            )
            .order_by(
                StockHistorical.symbol.asc(),
                StockHistorical.trade_date.asc(),
            )
            .all()
        )

        series_by_symbol: dict[str, list[tuple[date, Decimal]]] = {}
        for row_symbol, trade_date, close in rows:
            symbol = candidate_to_symbol.get(row_symbol)
            if symbol is None:
                continue
            series_by_symbol.setdefault(symbol, []).append((trade_date, close))

        return series_by_symbol

    def get_earliest_date(self, symbol: str) -> Optional[date]:
        candidates = eod_symbol_candidates(symbol)
        row = (
            self.db.query(StockHistorical.trade_date)
            .filter(StockHistorical.symbol.in_(candidates))
            .order_by(StockHistorical.trade_date.asc())
            .first()
        )
        return row[0] if row else None

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
                    "prev_close": Decimal(str(row["prev_close"])),
                    "open": Decimal(str(row["open"])),
                    "high": Decimal(str(row["high"])),
                    "low": Decimal(str(row["low"])),
                    "close": Decimal(str(row["close"])),
                    "name": row.get("name"),
                    "fetched_at": now,
                }
            )

        statement = insert(StockHistorical).values(values)
        statement = statement.on_duplicate_key_update(
            prev_close=statement.inserted.prev_close,
            open=statement.inserted.open,
            high=statement.inserted.high,
            low=statement.inserted.low,
            close=statement.inserted.close,
            name=statement.inserted.name,
            fetched_at=statement.inserted.fetched_at,
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount or len(values)

    def list_distinct_symbols(self) -> list[str]:
        rows = self.db.query(StockHistorical.symbol).distinct().all()
        return [row[0] for row in rows]
