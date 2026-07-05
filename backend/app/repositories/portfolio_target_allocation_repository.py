from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.portfolio_target_allocation import PortfolioTargetAllocation

ASSET_CLASSES = ("Equity", "Debt", "Gold")


class PortfolioTargetAllocationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_pan(self, client_pan: str) -> list[PortfolioTargetAllocation]:
        return (
            self.db.query(PortfolioTargetAllocation)
            .filter(PortfolioTargetAllocation.client_pan == client_pan.upper())
            .all()
        )

    def upsert(self, client_pan: str, asset_class: str, target_pct: Decimal) -> None:
        pan = client_pan.upper()
        existing = (
            self.db.query(PortfolioTargetAllocation)
            .filter(
                PortfolioTargetAllocation.client_pan == pan,
                PortfolioTargetAllocation.asset_class == asset_class,
            )
            .first()
        )
        if existing:
            existing.target_pct = target_pct
            return

        self.db.add(
            PortfolioTargetAllocation(
                client_pan=pan,
                asset_class=asset_class,
                target_pct=target_pct,
            )
        )

    def delete(self, client_pan: str, asset_class: str) -> None:
        (
            self.db.query(PortfolioTargetAllocation)
            .filter(
                PortfolioTargetAllocation.client_pan == client_pan.upper(),
                PortfolioTargetAllocation.asset_class == asset_class,
            )
            .delete()
        )
