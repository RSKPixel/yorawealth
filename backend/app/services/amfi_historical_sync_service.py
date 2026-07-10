from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.repositories.mutual_fund_eod_repository import MutualFundEodRepository
from app.repositories.mutual_fund_historical_repository import (
    MutualFundHistoricalRepository,
)
from app.repositories.mutual_fund_transaction_repository import (
    MutualFundTransactionRepository,
)
from app.services.amfi_lookup import fetch_amfi_index, lookup_isin
from app.services.amfi_nav_sync_service import AmfiNavSyncService


class AmfiHistoricalSyncService:
    DEFAULT_PERIOD_DAYS = 1824

    def __init__(self, db: Session) -> None:
        self.db = db
        self.eod_repository = MutualFundEodRepository(db)
        self.historical_repository = MutualFundHistoricalRepository(db)
        self.transaction_repository = MutualFundTransactionRepository(db)
        self.nav_sync_service = AmfiNavSyncService(db)

    def resolve_targets(
        self,
        isins: list[str] | None = None,
        client_pan: str | None = None,
    ) -> list[dict]:
        if isins:
            records = self.eod_repository.list_by_isins(isins)
            if records:
                return [_record_to_target(record) for record in records]
            return self._targets_from_amfi_index(isins)

        if client_pan:
            portfolio_isins = self._portfolio_isins(client_pan)
            if not portfolio_isins:
                return []
            records = self.eod_repository.list_by_isins(portfolio_isins)
            targets = {target["isin"]: target for target in (_record_to_target(r) for r in records)}
            for isin in portfolio_isins:
                if isin not in targets:
                    for target in self._targets_from_amfi_index([isin]):
                        targets[target["isin"]] = target
            return list(targets.values())

        return [_record_to_target(record) for record in self.eod_repository.list_all()]

    def sync_isins(
        self,
        isins: list[str] | None = None,
        client_pan: str | None = None,
        period_days: int = DEFAULT_PERIOD_DAYS,
    ) -> dict:
        targets = self.resolve_targets(isins=isins, client_pan=client_pan)
        if not targets:
            return {
                "isins": [],
                "from_date": None,
                "to_date": date.today().isoformat(),
                "rows_processed": 0,
                "messages": [],
                "errors": ["No mutual fund schemes found to sync."],
            }

        to_date = date.today()
        from_date = to_date - timedelta(days=max(period_days, 1) - 1)
        messages: list[str] = []
        errors: list[str] = []
        rows_processed = 0

        for target in targets:
            isin = target["isin"]
            scheme_code = target["scheme_code"]
            fund_name = target["scheme_name"]
            before_count = self._count_rows(scheme_code, from_date, to_date)

            sync_error = self.nav_sync_service.ensure_history(
                isin=isin,
                fund_name=fund_name,
                from_date=from_date,
                to_date=to_date,
            )

            after_count = self._count_rows(scheme_code, from_date, to_date)
            created_or_updated = max(after_count - before_count, 0)
            rows_processed += created_or_updated

            if sync_error:
                errors.append(f"{scheme_code} ({isin}): {sync_error}")
            else:
                messages.append(
                    f"Historical data for {scheme_code} ({isin}) saved. "
                    f"Records in range: {after_count}"
                )

        return {
            "isins": [target["isin"] for target in targets],
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "rows_processed": rows_processed,
            "messages": messages,
            "errors": errors,
        }

    def ensure_benchmark_history(
        self,
        targets: list[dict],
        from_date: date,
        to_date: date,
    ) -> list[str]:
        if not targets or from_date > to_date:
            return []

        errors: list[str] = []
        for target in targets:
            scheme_code = target["scheme_code"]
            isin = target["isin"]
            fund_name = target["scheme_name"]
            earliest = self.historical_repository.get_earliest_date(scheme_code)
            latest = self.historical_repository.get_latest_date(scheme_code)
            if (
                earliest is not None
                and earliest <= from_date
                and latest is not None
                and latest >= to_date
            ):
                continue

            sync_error = self.nav_sync_service.ensure_history(
                isin=isin,
                fund_name=fund_name,
                from_date=from_date,
                to_date=to_date,
            )
            if sync_error:
                errors.append(f"{scheme_code} ({isin}): {sync_error}")

        return errors

    def _portfolio_isins(self, client_pan: str) -> list[str]:
        transactions = self.transaction_repository.list_by_client_pan(client_pan)
        seen: set[str] = set()
        isins: list[str] = []
        for transaction in transactions:
            isin = transaction.isin.upper()
            if isin not in seen:
                seen.add(isin)
                isins.append(isin)
        return isins

    def _targets_from_amfi_index(self, isins: list[str]) -> list[dict]:
        index = fetch_amfi_index()
        targets: list[dict] = []
        for isin in isins:
            info = lookup_isin(isin, index)
            if info is None or not info.scheme_code:
                continue
            targets.append(
                {
                    "scheme_code": info.scheme_code,
                    "isin": isin.upper(),
                    "scheme_name": info.fund_name,
                    "amc_name": info.amc,
                }
            )
        return targets

    def _count_rows(self, scheme_code: str, from_date: date, to_date: date) -> int:
        return len(
            self.historical_repository.list_by_scheme_code(
                scheme_code,
                from_date,
                to_date,
            )
        )


def _record_to_target(record) -> dict:
    return {
        "scheme_code": record.scheme_code,
        "isin": record.isin,
        "scheme_name": record.scheme_name,
        "amc_name": record.amc_name,
    }
