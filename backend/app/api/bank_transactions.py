from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.bank_transactions import (
    BankStatementUploadResponse,
    BankTransactionsResponse,
)
from app.services.bank_statement_service import BankStatementService

router = APIRouter(prefix="/bank-transactions", tags=["bank-transactions"])


def get_bank_statement_service(db: Session = Depends(get_db)) -> BankStatementService:
    upload_dir = Path(settings.upload_dir) / "bank"
    upload_dir.mkdir(parents=True, exist_ok=True)
    return BankStatementService(db, upload_dir)


@router.get("", response_model=BankTransactionsResponse)
def list_bank_transactions(
    bank_account_id: Optional[int] = Query(default=None),
    current_user: User = Depends(get_current_user),
    service: BankStatementService = Depends(get_bank_statement_service),
) -> BankTransactionsResponse:
    return service.list_transactions(
        current_user.client_pan,
        bank_account_id=bank_account_id,
    )


@router.post("/upload", response_model=BankStatementUploadResponse)
async def upload_bank_statement(
    file: UploadFile = File(...),
    bank_account_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    service: BankStatementService = Depends(get_bank_statement_service),
) -> BankStatementUploadResponse:
    return await service.upload_statement(current_user.id, bank_account_id, file)


@router.post("/upload/stream")
async def upload_bank_statement_stream(
    file: UploadFile = File(...),
    bank_account_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    service: BankStatementService = Depends(get_bank_statement_service),
) -> StreamingResponse:
    return StreamingResponse(
        service.stream_upload_statement(current_user.id, bank_account_id, file),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
