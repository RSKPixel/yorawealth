from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.repositories.bank_account_repository import BankAccountRepository
from app.schemas.banks import (
    BANK_ACCOUNT_TYPE_LABELS,
    BankAccountCreate,
    BankAccountDeleteResponse,
    BankAccountResponse,
    BankAccountRow,
    BankAccountType,
    BankAccountUpdate,
    BankAccountsResponse,
)


class BankAccountService:
    def __init__(self, db: Session) -> None:
        self.repository = BankAccountRepository(db)

    def list_accounts(self, client_pan: str) -> BankAccountsResponse:
        accounts = self.repository.list_by_client_pan(client_pan)
        return BankAccountsResponse(accounts=[self._to_row(account) for account in accounts])

    def get_account(self, client_pan: str, account_id: int) -> BankAccountResponse:
        account = self._get_owned_account(client_pan, account_id)
        return BankAccountResponse(
            account=self._to_row(account),
            detail="Bank account loaded.",
        )

    def create_account(self, client_pan: str, payload: BankAccountCreate) -> BankAccountResponse:
        client_pan = client_pan.upper()
        self._ensure_unique_account_number(client_pan, payload.account_number)

        account = BankAccount(
            client_pan=client_pan,
            bank_name=payload.bank_name,
            account_type=payload.account_type.value,
            account_number=payload.account_number,
        )

        try:
            created = self.repository.create(account)
        except IntegrityError as error:
            self.repository.db.rollback()
            self._raise_duplicate_account_number(error)

        return BankAccountResponse(
            account=self._to_row(created),
            detail="Bank account added.",
        )

    def update_account(
        self,
        client_pan: str,
        account_id: int,
        payload: BankAccountUpdate,
    ) -> BankAccountResponse:
        account = self._get_owned_account(client_pan, account_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "bank_name" in update_data and update_data["bank_name"] is not None:
            account.bank_name = update_data["bank_name"]
        if "account_type" in update_data and update_data["account_type"] is not None:
            account.account_type = update_data["account_type"].value
        if "account_number" in update_data and update_data["account_number"] is not None:
            self._ensure_unique_account_number(
                client_pan,
                update_data["account_number"],
                exclude_id=account_id,
            )
            account.account_number = update_data["account_number"]

        try:
            self.repository.commit()
            self.repository.refresh(account)
        except IntegrityError as error:
            self.repository.db.rollback()
            self._raise_duplicate_account_number(error)

        return BankAccountResponse(
            account=self._to_row(account),
            detail="Bank account updated.",
        )

    def delete_account(self, client_pan: str, account_id: int) -> BankAccountDeleteResponse:
        account = self._get_owned_account(client_pan, account_id)
        self.repository.delete(account)
        return BankAccountDeleteResponse(detail="Bank account deleted.")

    def _get_owned_account(self, client_pan: str, account_id: int) -> BankAccount:
        account = self.repository.find_by_id(client_pan, account_id)
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank account not found.",
            )
        return account

    def _ensure_unique_account_number(
        self,
        client_pan: str,
        account_number: str,
        *,
        exclude_id: Optional[int] = None,
    ) -> None:
        existing = self.repository.find_by_account_number(
            client_pan,
            account_number,
            exclude_id=exclude_id,
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this account number already exists.",
            )

    @staticmethod
    def _raise_duplicate_account_number(error: IntegrityError) -> None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this account number already exists.",
        ) from error

    @staticmethod
    def _to_row(account: BankAccount) -> BankAccountRow:
        account_type = BankAccountType(account.account_type)
        return BankAccountRow(
            id=account.id,
            bank_name=account.bank_name,
            account_type=account_type,
            account_type_label=BANK_ACCOUNT_TYPE_LABELS[account_type],
            account_number=account.account_number,
            created_at=account.created_at,
            updated_at=account.updated_at,
        )
