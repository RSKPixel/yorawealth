from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.mutual_fund_eod import MutualFundEod


class MutualFundEodRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_isins(self, isins: list[str]) -> list[MutualFundEod]:
        if not isins:
            return []
        normalized = [isin.upper() for isin in isins]
        return (
            self.db.query(MutualFundEod)
            .filter(MutualFundEod.isin.in_(normalized))
            .order_by(MutualFundEod.scheme_code.asc())
            .all()
        )

    def list_all(self) -> list[MutualFundEod]:
        return (
            self.db.query(MutualFundEod)
            .order_by(MutualFundEod.scheme_code.asc())
            .all()
        )

    def get_by_isin(self, isin: str) -> Optional[MutualFundEod]:
        return (
            self.db.query(MutualFundEod)
            .filter(MutualFundEod.isin == isin.upper())
            .first()
        )

    def upsert_many(self, rows: list[dict]) -> tuple[int, int]:
        existing = {
            record.scheme_code: record
            for record in self.db.query(MutualFundEod).all()
        }
        created_count = 0
        updated_count = 0

        for row in rows:
            scheme_code = row["scheme_code"]
            record = existing.get(scheme_code)
            if record is None:
                record = MutualFundEod(scheme_code=scheme_code)
                self.db.add(record)
                existing[scheme_code] = record
                created_count += 1
            else:
                updated_count += 1

            record.nav_date = row["nav_date"]
            record.scheme_name = row["scheme_name"]
            record.amc_name = row["amc_name"]
            record.isin = row["isin"].upper()
            record.nav = Decimal(str(row["nav"]))
            record.asset_class = row["asset_class"]
            record.fund_type = row.get("fund_type")

        self.db.commit()
        return created_count, updated_count
