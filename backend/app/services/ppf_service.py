from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ppf_transaction import PpfTransaction
from app.repositories.ppf_repository import PpfInvestmentRepository, PpfTransactionRepository
from app.schemas.ppf import (
    PpfInvestmentRow,
    PpfInvestmentsResponse,
    PpfPortfolioSummary,
    PpfTransactionRow,
    PpfTransactionsResponse,
    PpfUploadResponse,
)
from app.services.ppf_returns_service import calculate_ppf_interest_rate, calculate_ppf_xirr
from app.services.ppf_statement_parser import PpfStatementParseError, parse_ppf_statement_xls

ALLOWED_XLS_TYPES = {
    "application/vnd.ms-excel": ".xls",
    "application/octet-stream": ".xls",
}


class PpfService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.investment_repository = PpfInvestmentRepository(db)
        self.transaction_repository = PpfTransactionRepository(db)
        self.upload_dir = Path(settings.upload_dir) / "ppf"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def list_investments(self, client_pan: str) -> PpfInvestmentsResponse:
        records = self.investment_repository.list_by_client_pan(client_pan)
        investments = [self._investment_to_row(record) for record in records]
        transactions = self.transaction_repository.list_by_client_pan(client_pan)
        total_balance = round(sum(row.current_balance for row in investments), 2)
        summary = PpfPortfolioSummary(
            total_balance=total_balance,
            total_deposited=round(sum(row.total_deposited for row in investments), 2),
            total_withdrawn=round(sum(row.total_withdrawn for row in investments), 2),
            total_interest=round(sum(row.total_interest for row in investments), 2),
            interest_rate=calculate_ppf_interest_rate(transactions),
            xirr=calculate_ppf_xirr(transactions),
        )
        return PpfInvestmentsResponse(investments=investments, summary=summary)

    def list_transactions(self, client_pan: str) -> PpfTransactionsResponse:
        records = self.transaction_repository.list_by_client_pan(client_pan)
        return PpfTransactionsResponse(
            transactions=[self._transaction_to_row(record) for record in records],
        )

    async def upload_statement(
        self,
        user_id: int,
        file: UploadFile,
        client_pan: Optional[str] = None,
    ) -> PpfUploadResponse:
        if not client_pan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client PAN is required to store PPF data.",
            )

        filename = file.filename or ""
        extension = Path(filename).suffix.lower()
        content_type = file.content_type or ""
        if extension != ".xls" and content_type not in ALLOWED_XLS_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please select a PPF statement Excel (.xls) file.",
            )

        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected file is empty.",
            )

        if len(contents) > settings.cams_pdf_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be 10 MB or smaller.",
            )

        try:
            parsed = parse_ppf_statement_xls(contents)
        except PpfStatementParseError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        user_dir = self.upload_dir / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        safe_name = Path(filename).name or "ppf-statement.xls"
        stored_name = f"{timestamp}-{safe_name}"
        stored_path = user_dir / stored_name
        stored_path.write_bytes(contents)

        account = parsed["account"]
        transactions = parsed["transactions"]
        _, created_count, updated_count = self.transaction_repository.upsert_many(
            client_pan=client_pan,
            source_filename=stored_name,
            rows=transactions,
        )

        self._refresh_investment_summary(client_pan, account)

        detail_parts = [
            f"Imported PPF account {account['account_number']}.",
            f"{created_count} new transaction{'s' if created_count != 1 else ''}",
        ]
        if updated_count:
            detail_parts.append(
                f"{updated_count} updated transaction{'s' if updated_count != 1 else ''}"
            )

        return PpfUploadResponse(
            detail=" ".join(detail_parts) + ".",
            account_number=account["account_number"],
            created_count=created_count,
            updated_count=updated_count,
        )

    def _refresh_investment_summary(self, client_pan: str, account: dict) -> None:
        records = self.transaction_repository.list_by_account_chronological(
            client_pan,
            account["account_number"],
        )
        total_deposited = Decimal("0")
        total_withdrawn = Decimal("0")
        total_interest = Decimal("0")
        for record in records:
            if record.transaction_type == "interest":
                total_interest += record.deposit_amount
            elif record.transaction_type == "withdrawal":
                total_withdrawn += record.withdrawal_amount
            else:
                total_deposited += record.deposit_amount

        current_balance = Decimal(str(account["current_balance"]))
        if records:
            current_balance = records[-1].balance

        self.investment_repository.upsert(
            client_pan=client_pan,
            account_number=account["account_number"],
            account_holder=account["account_holder"],
            currency=account["currency"],
            current_balance=current_balance,
            total_deposited=total_deposited,
            total_withdrawn=total_withdrawn,
            total_interest=total_interest,
        )

    @staticmethod
    def _investment_to_row(record) -> PpfInvestmentRow:
        return PpfInvestmentRow(
            id=record.id,
            account_number=record.account_number,
            account_holder=record.account_holder,
            currency=record.currency,
            current_balance=record.current_balance,
            total_deposited=record.total_deposited,
            total_withdrawn=record.total_withdrawn,
            total_interest=record.total_interest,
        )

    @staticmethod
    def _transaction_to_row(record) -> PpfTransactionRow:
        return PpfTransactionRow(
            id=record.id,
            account_number=record.account_number,
            sr_no=record.sr_no,
            transaction_date=record.transaction_date,
            cheque_number=record.cheque_number,
            remarks=record.remarks,
            withdrawal_amount=record.withdrawal_amount,
            deposit_amount=record.deposit_amount,
            balance=record.balance,
            transaction_type=record.transaction_type,
        )
