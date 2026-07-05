from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from app.repositories.mutual_fund_eod_repository import MutualFundEodRepository
from app.services.amfi_lookup import (
    AmfiFundInfo,
    build_amfi_index,
    clear_amfi_index_cache,
    fetch_amfi_lines,
)


class AmfiEodSyncService:
    def __init__(self, db: Session) -> None:
        self.repository = MutualFundEodRepository(db)

    def sync_latest(self) -> dict:
        lines = fetch_amfi_lines()
        if not lines:
            raise ValueError("Unable to download AMFI NAVAll.txt")

        index = build_amfi_index(lines)
        clear_amfi_index_cache()

        by_scheme: dict[str, dict] = {}
        for isin, info in index.items():
            row = _info_to_eod_row(isin, info)
            existing = by_scheme.get(info.scheme_code)
            if existing is None:
                by_scheme[info.scheme_code] = row

        rows = list(by_scheme.values())
        created_count, updated_count = self.repository.upsert_many(rows)

        nav_date = rows[0]["nav_date"].isoformat() if rows else None
        return {
            "nav_date": nav_date,
            "rows_processed": len(rows),
            "created_count": created_count,
            "updated_count": updated_count,
        }


def _info_to_eod_row(isin: str, info: AmfiFundInfo) -> dict:
    nav_date_text = info.nav_date or date.today().isoformat()
    try:
        nav_date = date.fromisoformat(nav_date_text)
    except ValueError:
        nav_date = date.today()

    nav_value = info.nav.replace(",", "") if info.nav else "0"
    if nav_value in {"", "N.A.", "NA"}:
        nav_value = "0"

    return {
        "scheme_code": info.scheme_code,
        "nav_date": nav_date,
        "scheme_name": info.fund_name,
        "amc_name": info.amc,
        "isin": isin.upper(),
        "nav": float(nav_value),
        "asset_class": info.asset_class,
        "fund_type": info.fund_type,
    }
