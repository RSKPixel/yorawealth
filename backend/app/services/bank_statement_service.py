import asyncio
import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.bank_account import BankAccount
from app.models.bank_transaction import BankTransaction
from app.models.user import User
from app.repositories.bank_account_repository import BankAccountRepository
from app.repositories.bank_transaction_repository import BankTransactionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.bank_transactions import (
    BankStatementUploadResponse,
    BankTransactionRow,
    BankTransactionsResponse,
)
from app.services.bank_statement_csv_parser import (
    BankStatementParseError,
    parse_bank_statement_csv,
)

ALLOWED_EXTENSIONS = {".csv"}
ALLOWED_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/octet-stream",
}
MAX_STATEMENT_BYTES = 10 * 1024 * 1024


def purge_bank_statement_uploads(upload_dir: Path) -> int:
    if not upload_dir.exists():
        return 0

    removed = 0
    for path in upload_dir.rglob("*"):
        if path.is_file():
            path.unlink()
            removed += 1

    for path in sorted(upload_dir.rglob("*"), reverse=True):
        if path.is_dir() and not any(path.iterdir()):
            path.rmdir()

    return removed


def _sse_event(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


class BankStatementService:
    def __init__(self, db: Session, upload_dir: Path) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.bank_account_repository = BankAccountRepository(db)
        self.transaction_repository = BankTransactionRepository(db)
        self.upload_dir = upload_dir

    def list_transactions(
        self,
        client_pan: str,
        *,
        bank_account_id: Optional[int] = None,
    ) -> BankTransactionsResponse:
        records = self.transaction_repository.list_by_client_pan(
            client_pan,
            bank_account_id=bank_account_id,
        )
        return BankTransactionsResponse(
            transactions=[self._transaction_to_row(record) for record in records],
        )

    async def upload_statement(
        self,
        user_id: int,
        bank_account_id: int,
        file: UploadFile,
    ) -> BankStatementUploadResponse:
        result: Optional[BankStatementUploadResponse] = None
        async for event in self.stream_upload_statement(user_id, bank_account_id, file):
            if event.startswith("data: "):
                payload = json.loads(event[6:].strip())
                if payload.get("stage") == "complete":
                    result = BankStatementUploadResponse(
                        detail=payload["detail"],
                        filename=payload["filename"],
                        created_count=payload["created_count"],
                        excluded_count=payload["excluded_count"],
                    )
                if payload.get("stage") == "error":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=payload.get("message", "Unable to import bank statement."),
                    )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to import bank statement.",
            )
        return result

    async def stream_upload_statement(
        self,
        user_id: int,
        bank_account_id: int,
        file: UploadFile,
    ) -> AsyncIterator[str]:
        try:
            yield _sse_event(
                {
                    "stage": "received",
                    "message": "File received, validating…",
                    "percent": 20,
                }
            )

            user, account, contents, filename, extension = await self._prepare_upload(
                user_id,
                bank_account_id,
                file,
            )

            yield _sse_event(
                {
                    "stage": "parsing",
                    "message": "Parsing CSV…",
                    "percent": 45,
                }
            )

            rows = await asyncio.to_thread(parse_bank_statement_csv, contents)

            yield _sse_event(
                {
                    "stage": "saving",
                    "message": "Saving transactions to your account…",
                    "percent": 80,
                }
            )

            response = self._persist_upload(
                user=user,
                account=account,
                filename=filename,
                extension=extension,
                rows=rows,
            )

            yield _sse_event(
                {
                    "stage": "complete",
                    "message": response.detail,
                    "percent": 100,
                    "detail": response.detail,
                    "filename": response.filename,
                    "created_count": response.created_count,
                    "excluded_count": response.excluded_count,
                }
            )
        except HTTPException as error:
            detail = error.detail if isinstance(error.detail, str) else str(error.detail)
            yield _sse_event(
                {
                    "stage": "error",
                    "message": detail,
                    "percent": 100,
                }
            )
        except BankStatementParseError as error:
            yield _sse_event(
                {
                    "stage": "error",
                    "message": str(error),
                    "percent": 100,
                }
            )
        except Exception as error:
            yield _sse_event(
                {
                    "stage": "error",
                    "message": f"Unable to import bank statement: {error}",
                    "percent": 100,
                }
            )

    async def _prepare_upload(
        self,
        user_id: int,
        bank_account_id: int,
        file: UploadFile,
    ) -> tuple[User, BankAccount, bytes, str, str]:
        user = self.user_repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not user.client_pan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client PAN is required to store bank transactions.",
            )

        account = self.bank_account_repository.find_by_id(
            user.client_pan,
            bank_account_id,
        )
        if account is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank account not found.",
            )

        filename = file.filename or ""
        extension = Path(filename).suffix.lower()
        content_type = file.content_type or ""

        if extension not in ALLOWED_EXTENSIONS and content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload a CSV bank statement with date, desc, ref, debit, credit columns.",
            )

        if extension not in ALLOWED_EXTENSIONS:
            extension = ".csv"

        contents = await file.read()
        if not contents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected file is empty.",
            )

        max_bytes = settings.bank_statement_max_bytes
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be 10 MB or smaller.",
            )

        return user, account, contents, filename or "statement.csv", extension

    def _persist_upload(
        self,
        *,
        user: User,
        account: BankAccount,
        filename: str,
        extension: str,
        rows: list[dict],
    ) -> BankStatementUploadResponse:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        original_name = Path(filename).stem
        safe_name = "".join(
            char if char.isalnum() or char in {"-", "_"} else "-"
            for char in original_name
        ).strip("-_") or "statement"
        import_label = f"{timestamp}-{safe_name}{extension}"
        import_batch_id = str(uuid4())

        try:
            _, created_count, excluded_count = self.transaction_repository.insert_many(
                client_pan=user.client_pan,
                bank_account_id=account.id,
                account_number=account.account_number,
                source_filename=import_label,
                import_batch_id=import_batch_id,
                rows=rows,
            )
        except Exception as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to import bank statement: {error}",
            ) from error

        purge_bank_statement_uploads(self.upload_dir)

        detail = self._build_upload_detail(created_count, excluded_count)

        return BankStatementUploadResponse(
            detail=detail,
            filename=import_label,
            created_count=created_count,
            excluded_count=excluded_count,
        )

    @staticmethod
    def _build_upload_detail(created_count: int, excluded_count: int) -> str:
        parts: list[str] = []
        if created_count:
            parts.append(
                f"{created_count} new transaction{'s' if created_count != 1 else ''} imported"
            )
        else:
            parts.append("No new transactions imported")

        parts.append(
            f"{excluded_count} duplicate{'s' if excluded_count != 1 else ''} excluded"
        )

        return f"Bank statement processed. {', '.join(parts)}."

    @staticmethod
    def _transaction_to_row(record: BankTransaction) -> BankTransactionRow:
        return BankTransactionRow(
            id=record.id,
            bank_account_id=record.bank_account_id,
            account_number=record.account_number,
            transaction_date=record.transaction_date,
            description=record.description,
            reference=record.reference,
            credit=record.credit,
            debit=record.debit,
        )
