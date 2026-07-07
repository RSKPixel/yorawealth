from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class BankAccountType(str, Enum):
    SAVINGS = "savings"
    CURRENT = "current"
    LOAN = "loan"
    OVERDRAFT = "overdraft"


BANK_ACCOUNT_TYPE_LABELS = {
    BankAccountType.SAVINGS: "Savings Account",
    BankAccountType.CURRENT: "Current Account",
    BankAccountType.LOAN: "Loan Account",
    BankAccountType.OVERDRAFT: "Overdraft/Cash Credit A/c",
}


def _trim_text(value: str) -> str:
    return value.strip()


class BankAccountRow(BaseModel):
    id: int
    bank_name: str
    account_type: BankAccountType
    account_type_label: str
    account_number: str
    created_at: datetime
    updated_at: datetime


class BankAccountsResponse(BaseModel):
    accounts: list[BankAccountRow]


class BankAccountCreate(BaseModel):
    bank_name: str = Field(min_length=1, max_length=255)
    account_type: BankAccountType
    account_number: str = Field(min_length=1, max_length=64)

    @field_validator("bank_name", "account_number", mode="before")
    @classmethod
    def trim_strings(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        return _trim_text(value)


class BankAccountUpdate(BaseModel):
    bank_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    account_type: Optional[BankAccountType] = None
    account_number: Optional[str] = Field(default=None, min_length=1, max_length=64)

    @field_validator("bank_name", "account_number", mode="before")
    @classmethod
    def trim_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not isinstance(value, str):
            return value
        return _trim_text(value)


class BankAccountResponse(BaseModel):
    account: BankAccountRow
    detail: str


class BankAccountDeleteResponse(BaseModel):
    detail: str
