from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.banks import (
    BankAccountCreate,
    BankAccountDeleteResponse,
    BankAccountResponse,
    BankAccountUpdate,
    BankAccountsResponse,
)
from app.services.bank_account_service import BankAccountService

router = APIRouter(prefix="/banks", tags=["banks"])


def get_bank_account_service(db: Session = Depends(get_db)) -> BankAccountService:
    return BankAccountService(db)


@router.get("/accounts", response_model=BankAccountsResponse)
def list_bank_accounts(
    current_user: User = Depends(get_current_user),
    service: BankAccountService = Depends(get_bank_account_service),
) -> BankAccountsResponse:
    return service.list_accounts(current_user.client_pan)


@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    service: BankAccountService = Depends(get_bank_account_service),
) -> BankAccountResponse:
    return service.get_account(current_user.client_pan, account_id)


@router.post("/accounts", response_model=BankAccountResponse)
def create_bank_account(
    payload: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    service: BankAccountService = Depends(get_bank_account_service),
) -> BankAccountResponse:
    return service.create_account(current_user.client_pan, payload)


@router.put("/accounts/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: int,
    payload: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    service: BankAccountService = Depends(get_bank_account_service),
) -> BankAccountResponse:
    return service.update_account(current_user.client_pan, account_id, payload)


@router.delete("/accounts/{account_id}", response_model=BankAccountDeleteResponse)
def delete_bank_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    service: BankAccountService = Depends(get_bank_account_service),
) -> BankAccountDeleteResponse:
    return service.delete_account(current_user.client_pan, account_id)
