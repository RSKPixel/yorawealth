from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.ppf_investment import PpfInvestment
from app.models.ppf_transaction import PpfTransaction


class PpfInvestmentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_account(
        self,
        client_pan: str,
        account_number: str,
    ) -> Optional[PpfInvestment]:
        return (
            self.db.query(PpfInvestment)
            .filter(
                PpfInvestment.client_pan == client_pan.upper(),
                PpfInvestment.account_number == account_number,
            )
            .first()
        )

    def list_by_client_pan(self, client_pan: str) -> list[PpfInvestment]:
        return (
            self.db.query(PpfInvestment)
            .filter(PpfInvestment.client_pan == client_pan.upper())
            .order_by(PpfInvestment.account_number.asc())
            .all()
        )

    def upsert(
        self,
        client_pan: str,
        account_number: str,
        account_holder: str,
        currency: str,
        current_balance: Decimal,
        total_deposited: Decimal,
        total_withdrawn: Decimal,
        total_interest: Decimal,
    ) -> PpfInvestment:
        client_pan = client_pan.upper()
        existing = self.find_by_account(client_pan, account_number)
        if existing is not None:
            existing.account_holder = account_holder
            existing.currency = currency
            existing.current_balance = current_balance
            existing.total_deposited = total_deposited
            existing.total_withdrawn = total_withdrawn
            existing.total_interest = total_interest
            self.db.commit()
            self.db.refresh(existing)
            return existing

        record = PpfInvestment(
            client_pan=client_pan,
            account_number=account_number,
            account_holder=account_holder,
            currency=currency,
            current_balance=current_balance,
            total_deposited=total_deposited,
            total_withdrawn=total_withdrawn,
            total_interest=total_interest,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record


class PpfTransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def find_existing(
        self,
        client_pan: str,
        account_number: str,
        transaction_date: date,
        deposit_amount: Decimal,
        withdrawal_amount: Decimal,
        balance: Decimal,
    ) -> Optional[PpfTransaction]:
        return (
            self.db.query(PpfTransaction)
            .filter(
                PpfTransaction.client_pan == client_pan.upper(),
                PpfTransaction.account_number == account_number,
                PpfTransaction.transaction_date == transaction_date,
                PpfTransaction.deposit_amount == deposit_amount,
                PpfTransaction.withdrawal_amount == withdrawal_amount,
                PpfTransaction.balance == balance,
            )
            .first()
        )

    def upsert_many(
        self,
        client_pan: str,
        source_filename: str,
        rows: list[dict],
    ) -> tuple[list[PpfTransaction], int, int]:
        client_pan = client_pan.upper()
        saved: list[PpfTransaction] = []
        created_count = 0
        updated_count = 0

        for row in rows:
            transaction_date = date.fromisoformat(row["transaction_date"])
            deposit_amount = Decimal(str(row["deposit_amount"]))
            withdrawal_amount = Decimal(str(row["withdrawal_amount"]))
            balance = Decimal(str(row["balance"]))

            existing = self.find_existing(
                client_pan=client_pan,
                account_number=row["account_number"],
                transaction_date=transaction_date,
                deposit_amount=deposit_amount,
                withdrawal_amount=withdrawal_amount,
                balance=balance,
            )

            if existing is not None:
                existing.sr_no = row.get("sr_no")
                existing.cheque_number = row.get("cheque_number")
                existing.remarks = row.get("remarks")
                existing.transaction_type = row["transaction_type"]
                existing.source_filename = source_filename
                saved.append(existing)
                updated_count += 1
                continue

            record = PpfTransaction(
                client_pan=client_pan,
                account_number=row["account_number"],
                sr_no=row.get("sr_no"),
                transaction_date=transaction_date,
                cheque_number=row.get("cheque_number"),
                remarks=row.get("remarks"),
                withdrawal_amount=withdrawal_amount,
                deposit_amount=deposit_amount,
                balance=balance,
                transaction_type=row["transaction_type"],
                source_filename=source_filename,
            )
            self.db.add(record)
            saved.append(record)
            created_count += 1

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved, created_count, updated_count

    def list_by_client_pan(self, client_pan: str) -> list[PpfTransaction]:
        return (
            self.db.query(PpfTransaction)
            .filter(PpfTransaction.client_pan == client_pan.upper())
            .order_by(
                PpfTransaction.transaction_date.desc(),
                PpfTransaction.id.desc(),
            )
            .all()
        )

    def list_by_account_chronological(
        self,
        client_pan: str,
        account_number: str,
    ) -> list[PpfTransaction]:
        return (
            self.db.query(PpfTransaction)
            .filter(
                PpfTransaction.client_pan == client_pan.upper(),
                PpfTransaction.account_number == account_number,
            )
            .order_by(
                PpfTransaction.transaction_date.asc(),
                PpfTransaction.id.asc(),
            )
            .all()
        )
