from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.portfolio_holding import PortfolioHolding


def normalize_folio(value: str) -> str:
    return value.strip().replace(" ", "")


class PortfolioHoldingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_existing(
        self,
        client_pan: str,
        folio: str,
        isin: str,
    ) -> Optional[PortfolioHolding]:
        return (
            self.db.query(PortfolioHolding)
            .filter(
                PortfolioHolding.client_pan == client_pan.upper(),
                PortfolioHolding.folio == folio,
                PortfolioHolding.isin == isin,
            )
            .first()
        )

    def find_for_chart(
        self,
        client_pan: str,
        folio: str,
        isin: str,
    ) -> Optional[PortfolioHolding]:
        target_folio = normalize_folio(folio)
        target_isin = isin.upper().strip()
        for record in self.list_by_client_pan(client_pan):
            if (
                record.isin.upper() == target_isin
                and normalize_folio(record.folio) == target_folio
            ):
                return record
        return None

    def sync_holdings(
        self,
        client_pan: str,
        holdings: list[dict],
    ) -> list[PortfolioHolding]:
        client_pan = client_pan.upper()
        active_keys = {(row["folio"], row["isin"]) for row in holdings}
        saved: list[PortfolioHolding] = []

        existing_records = (
            self.db.query(PortfolioHolding)
            .filter(PortfolioHolding.client_pan == client_pan)
            .all()
        )
        for record in existing_records:
            key = (record.folio, record.isin)
            if key not in active_keys:
                self.db.delete(record)

        for row in holdings:
            record = self.find_existing(client_pan, row["folio"], row["isin"])
            if record is None:
                record = PortfolioHolding(client_pan=client_pan)
                self.db.add(record)

            record.folio = row["folio"]
            record.isin = row["isin"]
            record.fund_name = row["fund_name"]
            record.amc = row["amc"]
            record.asset_class = row.get("asset_class")
            record.fund_type = row.get("fund_type")
            record.quantity = Decimal(str(row["quantity"]))
            record.invested_amount = Decimal(str(row["invested_amount"]))
            record.avg_cost = Decimal(str(row["avg_cost"]))
            record.current_nav = Decimal(str(row["current_nav"]))
            record.current_value = Decimal(str(row["current_value"]))
            record.unrealized_gain = Decimal(str(row["unrealized_gain"]))
            saved.append(record)

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved

    def list_by_client_pan(self, client_pan: str) -> list[PortfolioHolding]:
        return (
            self.db.query(PortfolioHolding)
            .filter(PortfolioHolding.client_pan == client_pan.upper())
            .order_by(
                PortfolioHolding.current_value.desc(),
                PortfolioHolding.fund_name.asc(),
            )
            .all()
        )
