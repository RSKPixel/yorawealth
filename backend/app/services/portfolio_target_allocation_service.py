from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.repositories.portfolio_target_allocation_repository import (
    ASSET_CLASSES,
    PortfolioTargetAllocationRepository,
)
from app.schemas.mutual_fund import (
    TargetAllocationResponse,
    TargetAllocationRow,
    TargetAllocationSaveRequest,
)


class PortfolioTargetAllocationService:
    def __init__(self, db: Session) -> None:
        self.repo = PortfolioTargetAllocationRepository(db)
        self.db = db

    def get_targets(self, client_pan: str) -> TargetAllocationResponse:
        rows = self.repo.list_for_pan(client_pan)
        by_class = {row.asset_class: float(row.target_pct) for row in rows}
        return TargetAllocationResponse(
            targets=[
                TargetAllocationRow(
                    asset_class=name,
                    target_pct=by_class.get(name),
                )
                for name in ASSET_CLASSES
            ]
        )

    def save_targets(
        self,
        client_pan: str,
        payload: TargetAllocationSaveRequest,
    ) -> TargetAllocationResponse:
        incoming = {item.asset_class: item.target_pct for item in payload.targets}

        for asset_class in ASSET_CLASSES:
            if asset_class not in incoming:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Missing Allocation for {asset_class}.",
                )

        total = sum(
            incoming[name] for name in ASSET_CLASSES if incoming[name] is not None
        )
        if any(incoming[name] is not None for name in ASSET_CLASSES):
            if abs(total - 100) > 0.05:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Target Allocation must add up to 100%.",
                )

        for asset_class in ASSET_CLASSES:
            value = incoming[asset_class]
            if value is None:
                self.repo.delete(client_pan, asset_class)
            else:
                if value < 0 or value > 100:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Invalid target for {asset_class}.",
                    )
                self.repo.upsert(client_pan, asset_class, Decimal(str(value)))

        self.db.commit()
        return self.get_targets(client_pan)
