from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.bank_transaction import BankTransaction


class BankTransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_client_pan(
        self,
        client_pan: str,
        *,
        bank_account_id: Optional[int] = None,
    ) -> list[BankTransaction]:
        query = self.db.query(BankTransaction).filter(
            BankTransaction.client_pan == client_pan.upper()
        )
        if bank_account_id is not None:
            query = query.filter(BankTransaction.bank_account_id == bank_account_id)
        return query.order_by(
            BankTransaction.transaction_date.desc(),
            BankTransaction.id.desc(),
        ).all()

    def existing_hashes_for_account(self, bank_account_id: int) -> set[str]:
        rows = (
            self.db.query(BankTransaction.row_hash)
            .filter(BankTransaction.bank_account_id == bank_account_id)
            .all()
        )
        return {row[0] for row in rows}

    def insert_many(
        self,
        *,
        client_pan: str,
        bank_account_id: int,
        account_number: str,
        source_filename: str,
        import_batch_id: str,
        rows: list[dict],
    ) -> tuple[list[BankTransaction], int, int]:
        client_pan = client_pan.upper()
        existing_hashes = self.existing_hashes_for_account(bank_account_id)
        saved: list[BankTransaction] = []
        created_count = 0
        excluded_count = 0

        for row in rows:
            row_hash = row["row_hash"]
            if row_hash in existing_hashes:
                excluded_count += 1
                continue

            record = BankTransaction(
                client_pan=client_pan,
                bank_account_id=bank_account_id,
                account_number=account_number,
                transaction_date=date.fromisoformat(row["transaction_date"]),
                description=row["description"],
                reference=row.get("reference"),
                credit=Decimal(str(row["credit"])),
                debit=Decimal(str(row["debit"])),
                source_filename=source_filename,
                import_batch_id=import_batch_id,
                row_hash=row_hash,
            )
            self.db.add(record)
            saved.append(record)
            existing_hashes.add(row_hash)
            created_count += 1

        self.db.commit()

        for record in saved:
            self.db.refresh(record)

        return saved, created_count, excluded_count
