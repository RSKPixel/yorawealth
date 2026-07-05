from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.ppf import PpfInvestmentsResponse, PpfTransactionsResponse, PpfUploadResponse
from app.services.ppf_service import PpfService

router = APIRouter(prefix="/ppf", tags=["ppf"])


@router.get("/investments", response_model=PpfInvestmentsResponse)
def list_ppf_investments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PpfInvestmentsResponse:
    service = PpfService(db)
    return service.list_investments(current_user.client_pan)


@router.get("/transactions", response_model=PpfTransactionsResponse)
def list_ppf_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PpfTransactionsResponse:
    service = PpfService(db)
    return service.list_transactions(current_user.client_pan)


@router.post("/statement/upload", response_model=PpfUploadResponse)
async def upload_ppf_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PpfUploadResponse:
    service = PpfService(db)
    return await service.upload_statement(current_user.id, file, current_user.client_pan)
