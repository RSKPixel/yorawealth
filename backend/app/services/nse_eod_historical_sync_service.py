from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.repositories.stock_historical_repository import StockHistoricalRepository
from app.repositories.stock_transaction_repository import StockTransactionRepository
from app.services.nse_historical_client import (
    download_symbols_historical,
    normalize_historical_symbol,
)


class NseEodHistoricalSyncService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = StockHistoricalRepository(db)
        self.stock_transaction_repository = StockTransactionRepository(db)

    def sync_symbols(
        self,
        symbols: list[str],
        period_days: int = 365,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> dict:
        to_date = to_date or date.today()
        if from_date is None:
            from_date = to_date - timedelta(days=max(period_days, 1) - 1)

        normalized = []
        seen: set[str] = set()
        for symbol in symbols:
            candidate = normalize_historical_symbol(symbol)
            if candidate not in seen:
                seen.add(candidate)
                normalized.append(candidate)

        if not normalized:
            return {
                "symbols": [],
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "rows_processed": 0,
                "messages": [],
                "errors": [],
            }

        rows, errors = download_symbols_historical(normalized, from_date, to_date)
        if rows:
            self.repository.upsert_many(rows)

        symbols_with_rows = {row["symbol"] for row in rows}
        messages = [
            f"Downloaded historical data for {symbol} from {from_date.isoformat()} to {to_date.isoformat()}"
            for symbol in normalized
            if symbol in symbols_with_rows
        ]

        return {
            "symbols": normalized,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "rows_processed": len(rows),
            "messages": messages,
            "errors": errors,
        }

    def resolve_symbols(
        self,
        symbols: list[str] | None = None,
        client_pan: str | None = None,
    ) -> list[str]:
        if symbols:
            seen: set[str] = set()
            resolved: list[str] = []
            for symbol in symbols:
                candidate = normalize_historical_symbol(symbol)
                if candidate not in seen:
                    seen.add(candidate)
                    resolved.append(candidate)
            return resolved

        resolved: set[str] = set()
        if client_pan:
            transactions = self.stock_transaction_repository.list_by_client_pan(
                client_pan
            )
            for transaction in transactions:
                resolved.add(normalize_historical_symbol(transaction.symbol))

        stored_symbols = {
            normalize_historical_symbol(symbol)
            for symbol in self.repository.list_distinct_symbols()
        }
        resolved.update(stored_symbols)
        return sorted(resolved)

    def ensure_history(
        self,
        symbols: set[str],
        from_date: date,
        to_date: date,
    ) -> list[str]:
        if not symbols or from_date > to_date:
            return []

        errors: list[str] = []
        for symbol in sorted(normalize_historical_symbol(value) for value in symbols):
            earliest = self.repository.get_earliest_date(symbol)
            if earliest is None or earliest > from_date:
                result = self.sync_symbols(
                    [symbol],
                    from_date=from_date,
                    to_date=to_date,
                )
                errors.extend(result["errors"])
                continue

            latest_rows = self.repository.list_by_symbol(symbol, to_date, to_date)
            needs_refresh = not latest_rows or latest_rows[-1].trade_date < to_date
            if not needs_refresh:
                continue

            refresh_from = max(from_date, earliest)
            result = self.sync_symbols(
                [symbol],
                from_date=refresh_from,
                to_date=to_date,
            )
            errors.extend(result["errors"])

        return errors[:8]

    def ensure_history_for_dates(
        self,
        symbols: set[str],
        dates: set[date],
    ) -> list[str]:
        if not symbols or not dates:
            return []

        from_date = min(dates)
        to_date = max(dates)
        return self.ensure_history(symbols, from_date, to_date)
