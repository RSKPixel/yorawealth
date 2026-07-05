from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.mutual_fund import (
    CamsTransactionsResponse,
    CamsUploadResponse,
    HoldingChartResponse,
    PortfolioHoldingsResponse,
    PortfolioReconciliationResponse,
    TargetAllocationResponse,
    TargetAllocationSaveRequest,
)
from app.services.holding_chart_service import HoldingChartService
from app.services.mutual_fund_service import MutualFundService
from app.services.portfolio_target_allocation_service import (
    PortfolioTargetAllocationService,
)

router = APIRouter(prefix="/mutual-fund", tags=["mutual-fund"])


@router.get("/holdings", response_model=PortfolioHoldingsResponse)
def list_portfolio_holdings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioHoldingsResponse:
    service = MutualFundService(db)
    return service.list_holdings(current_user.client_pan)


@router.get("/holdings/chart", response_model=HoldingChartResponse)
def get_holding_chart(
    folio: str = Query(..., min_length=1),
    isin: str = Query(..., min_length=10, max_length=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HoldingChartResponse:
    service = HoldingChartService(db)
    return service.get_chart(current_user.client_pan, folio, isin)


@router.get("/reconciliation", response_model=PortfolioReconciliationResponse)
def reconcile_portfolio_holdings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioReconciliationResponse:
    service = MutualFundService(db)
    return service.reconcile_portfolio(current_user.client_pan, current_user.id)


@router.get("/transactions", response_model=CamsTransactionsResponse)
def list_mutual_fund_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CamsTransactionsResponse:
    service = MutualFundService(db)
    return CamsTransactionsResponse(
        transactions=service.list_transactions(current_user.client_pan),
    )


@router.get("/allocation/targets", response_model=TargetAllocationResponse)
def get_target_allocation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TargetAllocationResponse:
    service = PortfolioTargetAllocationService(db)
    return service.get_targets(current_user.client_pan)


@router.put("/allocation/targets", response_model=TargetAllocationResponse)
def save_target_allocation(
    payload: TargetAllocationSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TargetAllocationResponse:
    service = PortfolioTargetAllocationService(db)
    return service.save_targets(current_user.client_pan, payload)


@router.post("/cams/upload", response_model=CamsUploadResponse)
async def upload_cams_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CamsUploadResponse:
    service = MutualFundService(db)
    return await service.upload_cams_pdf(current_user.id, file, current_user.client_pan)
