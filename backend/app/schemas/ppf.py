from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class PpfTransactionRow(BaseModel):
    id: int
    account_number: str
    sr_no: Optional[int] = None
    transaction_date: date
    cheque_number: Optional[str] = None
    remarks: Optional[str] = None
    withdrawal_amount: Decimal
    deposit_amount: Decimal
    balance: Decimal
    transaction_type: str


class PpfInvestmentRow(BaseModel):
    id: int
    account_number: str
    account_holder: str
    currency: str
    current_balance: Decimal
    total_deposited: Decimal
    total_withdrawn: Decimal
    total_interest: Decimal


class PpfPortfolioSummary(BaseModel):
    total_balance: Decimal
    total_deposited: Decimal
    total_withdrawn: Decimal
    total_interest: Decimal
    interest_rate: Optional[float] = None
    xirr: Optional[float] = None


class PpfInvestmentsResponse(BaseModel):
    investments: list[PpfInvestmentRow]
    summary: PpfPortfolioSummary


class PpfTransactionsResponse(BaseModel):
    transactions: list[PpfTransactionRow]


class PpfUploadResponse(BaseModel):
    detail: str
    account_number: str
    created_count: int = Field(ge=0)
    updated_count: int = Field(ge=0)
