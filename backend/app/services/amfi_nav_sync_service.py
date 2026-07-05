from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.mutual_fund_historical_repository import (
    AmfiSchemeSyncRepository,
    MutualFundHistoricalRepository,
)
from app.services.amfi_historical_client import fetch_nav_history, parse_nav_records
from app.services.amfi_lookup import fetch_amfi_index, lookup_isin
from app.services.nav_history_constants import MAX_NAV_HISTORY_DAYS, NAV_SYNC_CHUNK_DAYS


class AmfiNavSyncService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.historical_repository = MutualFundHistoricalRepository(db)
        self.sync_repository = AmfiSchemeSyncRepository(db)

    def ensure_history(
        self,
        isin: str,
        fund_name: str,
        from_date: date,
        to_date: date,
    ) -> Optional[str]:
        amfi_index = fetch_amfi_index()
        info = lookup_isin(isin, amfi_index)
        if info is None or not info.scheme_code:
            return f"No AMFI scheme found for ISIN {isin}"

        scheme_code = info.scheme_code
        if not scheme_code.isdigit():
            return f"Invalid AMFI scheme code for ISIN {isin}"

        effective_from = max(from_date, to_date - timedelta(days=MAX_NAV_HISTORY_DAYS))
        errors: list[str] = []

        self._sync_backfill_gap(
            scheme_code=scheme_code,
            isin=isin,
            fund_name=fund_name,
            effective_from=effective_from,
            to_date=to_date,
            errors=errors,
        )

        sync_state = self.sync_repository.get(scheme_code)
        forward_from: Optional[date] = effective_from
        if sync_state and sync_state.last_synced_date and sync_state.last_synced_date >= to_date:
            forward_from = None
        elif sync_state and sync_state.last_synced_date:
            forward_from = max(effective_from, sync_state.last_synced_date + timedelta(days=1))

        if forward_from is not None and forward_from <= to_date:
            try:
                self._sync_range(
                    scheme_code=scheme_code,
                    isin=isin,
                    fund_name=fund_name,
                    from_date=forward_from,
                    to_date=to_date,
                )
            except Exception as error:
                message = str(error)
                self.sync_repository.save_error(scheme_code, isin, message)
                errors.append(message)

        if not errors:
            first_stored = self.historical_repository.get_earliest_date(scheme_code)
            latest_stored = self.historical_repository.get_latest_date(scheme_code)
            if first_stored and latest_stored:
                self.sync_repository.save_success(
                    scheme_code,
                    isin,
                    max(latest_stored, to_date),
                    first_synced_date=first_stored,
                )

        if errors:
            return "; ".join(errors)
        return None

    def _sync_backfill_gap(
        self,
        scheme_code: str,
        isin: str,
        fund_name: str,
        effective_from: date,
        to_date: date,
        errors: list[str],
    ) -> None:
        earliest_stored = self.historical_repository.get_earliest_date(scheme_code)
        if earliest_stored is not None and earliest_stored <= effective_from:
            return

        backfill_end = (
            min(to_date, earliest_stored - timedelta(days=1))
            if earliest_stored
            else to_date
        )
        if effective_from > backfill_end:
            return

        try:
            self._sync_range(
                scheme_code=scheme_code,
                isin=isin,
                fund_name=fund_name,
                from_date=effective_from,
                to_date=backfill_end,
            )
        except Exception as error:
            message = str(error)
            self.sync_repository.save_error(scheme_code, isin, message)
            errors.append(message)

    def _sync_range(
        self,
        scheme_code: str,
        isin: str,
        fund_name: str,
        from_date: date,
        to_date: date,
    ) -> Optional[date]:
        latest_date: Optional[date] = None
        chunk_start = from_date

        while chunk_start <= to_date:
            chunk_end = min(
                chunk_start + timedelta(days=NAV_SYNC_CHUNK_DAYS - 1),
                to_date,
            )
            payload = fetch_nav_history(scheme_code, chunk_start, chunk_end)
            rows = parse_nav_records(payload, fund_name, scheme_code, isin)
            if rows:
                self.historical_repository.upsert_many(rows)
                chunk_latest = max(row["date"] for row in rows)
                if latest_date is None or chunk_latest > latest_date:
                    latest_date = chunk_latest
            chunk_start = chunk_end + timedelta(days=1)

        return latest_date or to_date
