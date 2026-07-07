from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class BankTransactionRow(BaseModel):
    id: int
    bank_account_id: int
    account_number: str
    transaction_date: date
    description: str
    reference: Optional[str] = None
    credit: Decimal
    debit: Decimal


class BankTransactionsResponse(BaseModel):
    transactions: list[BankTransactionRow]


class BankStatementUploadResponse(BaseModel):
    detail: str
    filename: str
    created_count: int = Field(ge=0)
    excluded_count: int = Field(ge=0)
