from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.dialects.mysql import insert
from sqlalchemy.orm import Session

from app.models.amfi_scheme_sync import AmfiSchemeSync
from app.models.mutual_fund_historical import MutualFundHistorical


class MutualFundHistoricalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_scheme_code(
        self,
        scheme_code: str,
        from_date: date,
        to_date: date,
    ) -> list[MutualFundHistorical]:
        return (
            self.db.query(MutualFundHistorical)
            .filter(
                MutualFundHistorical.scheme_code == scheme_code,
                MutualFundHistorical.date >= from_date,
                MutualFundHistorical.date <= to_date,
            )
            .order_by(MutualFundHistorical.date.asc())
            .all()
        )

    def get_earliest_date(self, scheme_code: str) -> Optional[date]:
        row = (
            self.db.query(MutualFundHistorical.date)
            .filter(MutualFundHistorical.scheme_code == scheme_code)
            .order_by(MutualFundHistorical.date.asc())
            .first()
        )
        return row[0] if row else None

    def get_latest_date(self, scheme_code: str) -> Optional[date]:
        row = (
            self.db.query(MutualFundHistorical.date)
            .filter(MutualFundHistorical.scheme_code == scheme_code)
            .order_by(MutualFundHistorical.date.desc())
            .first()
        )
        return row[0] if row else None

    def get_nav_on_or_before(
        self,
        scheme_code: str,
        target_date: date,
    ) -> Optional[Decimal]:
        row = (
            self.db.query(MutualFundHistorical.nav)
            .filter(
                MutualFundHistorical.scheme_code == scheme_code,
                MutualFundHistorical.date <= target_date,
            )
            .order_by(MutualFundHistorical.date.desc())
            .first()
        )
        return row[0] if row else None

    def map_nav_on_or_before(
        self,
        scheme_codes: list[str],
        target_date: date,
    ) -> dict[str, Decimal]:
        if not scheme_codes:
            return {}

        rows = (
            self.db.query(
                MutualFundHistorical.scheme_code,
                MutualFundHistorical.date,
                MutualFundHistorical.nav,
            )
            .filter(
                MutualFundHistorical.scheme_code.in_(scheme_codes),
                MutualFundHistorical.date <= target_date,
            )
            .order_by(
                MutualFundHistorical.scheme_code.asc(),
                MutualFundHistorical.date.desc(),
            )
            .all()
        )

        latest_by_scheme: dict[str, Decimal] = {}
        for scheme_code, _, nav in rows:
            if scheme_code not in latest_by_scheme:
                latest_by_scheme[scheme_code] = nav

        return latest_by_scheme

    def map_nav_series_up_to(
        self,
        scheme_codes: list[str],
        to_date: date,
    ) -> dict[str, list[tuple[date, Decimal]]]:
        if not scheme_codes:
            return {}

        rows = (
            self.db.query(
                MutualFundHistorical.scheme_code,
                MutualFundHistorical.date,
                MutualFundHistorical.nav,
            )
            .filter(
                MutualFundHistorical.scheme_code.in_(scheme_codes),
                MutualFundHistorical.date <= to_date,
            )
            .order_by(
                MutualFundHistorical.scheme_code.asc(),
                MutualFundHistorical.date.asc(),
            )
            .all()
        )

        series_by_scheme: dict[str, list[tuple[date, Decimal]]] = {}
        for scheme_code, nav_date, nav in rows:
            series_by_scheme.setdefault(scheme_code, []).append((nav_date, nav))

        return series_by_scheme

    def upsert_many(self, rows: list[dict]) -> int:
        if not rows:
            return 0

        now = datetime.utcnow()
        values = []
        for row in rows:
            values.append(
                {
                    "date": row["date"],
                    "scheme_code": row["scheme_code"],
                    "isin": row.get("isin"),
                    "scheme_name": row["scheme_name"],
                    "amc_name": row["amc_name"],
                    "nav": Decimal(str(row["nav"])),
                    "source_updated_at": row.get("source_updated_at"),
                    "fetched_at": now,
                }
            )

        statement = insert(MutualFundHistorical).values(values)
        statement = statement.on_duplicate_key_update(
            isin=statement.inserted.isin,
            scheme_name=statement.inserted.scheme_name,
            amc_name=statement.inserted.amc_name,
            nav=statement.inserted.nav,
            source_updated_at=statement.inserted.source_updated_at,
            fetched_at=statement.inserted.fetched_at,
        )
        result = self.db.execute(statement)
        self.db.commit()
        return result.rowcount or len(values)


class AmfiSchemeSyncRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, scheme_code: str) -> Optional[AmfiSchemeSync]:
        return (
            self.db.query(AmfiSchemeSync)
            .filter(AmfiSchemeSync.scheme_code == scheme_code)
            .first()
        )

    def save_success(
        self,
        scheme_code: str,
        isin: str,
        last_synced_date: date,
        first_synced_date: Optional[date] = None,
    ) -> None:
        record = self.get(scheme_code)
        if record is None:
            record = AmfiSchemeSync(scheme_code=scheme_code)
            self.db.add(record)

        record.isin = isin.upper()
        record.last_synced_date = last_synced_date
        record.last_error = None
        if first_synced_date is not None and (
            record.first_synced_date is None
            or first_synced_date < record.first_synced_date
        ):
            record.first_synced_date = first_synced_date
        self.db.commit()

    def save_error(
        self,
        scheme_code: str,
        isin: str,
        message: str,
    ) -> None:
        record = self.get(scheme_code)
        if record is None:
            record = AmfiSchemeSync(scheme_code=scheme_code)
            self.db.add(record)

        record.isin = isin.upper()
        record.last_error = message[:512]
        self.db.commit()
