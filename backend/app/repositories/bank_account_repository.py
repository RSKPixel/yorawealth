from typing import Optional

from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount


class BankAccountRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_client_pan(self, client_pan: str) -> list[BankAccount]:
        return (
            self.db.query(BankAccount)
            .filter(BankAccount.client_pan == client_pan.upper())
            .order_by(BankAccount.bank_name.asc(), BankAccount.id.asc())
            .all()
        )

    def find_by_id(self, client_pan: str, account_id: int) -> Optional[BankAccount]:
        return (
            self.db.query(BankAccount)
            .filter(
                BankAccount.client_pan == client_pan.upper(),
                BankAccount.id == account_id,
            )
            .first()
        )

    def find_by_account_number(
        self,
        client_pan: str,
        account_number: str,
        *,
        exclude_id: Optional[int] = None,
    ) -> Optional[BankAccount]:
        query = self.db.query(BankAccount).filter(
            BankAccount.client_pan == client_pan.upper(),
            BankAccount.account_number == account_number,
        )
        if exclude_id is not None:
            query = query.filter(BankAccount.id != exclude_id)
        return query.first()

    def create(self, account: BankAccount) -> BankAccount:
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def delete(self, account: BankAccount) -> None:
        self.db.delete(account)
        self.db.commit()

    def commit(self) -> None:
        self.db.commit()

    def refresh(self, account: BankAccount) -> BankAccount:
        self.db.refresh(account)
        return account
