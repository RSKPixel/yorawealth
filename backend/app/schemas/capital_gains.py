from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


def _trim_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    trimmed = value.strip()
    return trimmed or None


class RealizedGainRow(BaseModel):
    id: str
    asset_type: Literal["stock", "mutual-fund"]
    transaction_date: str
    label: str
    folio: Optional[str] = None
    broker: Optional[str] = None
    meta: Optional[str] = None
    quantity: float
    sell_rate: float
    buy_rate: float
    trade_value: float
    purchase_value: float
    realized_gain: float
    short_term_gain: float
    long_term_gain: float
    short_term_holding_period_days: int = 0
    long_term_holding_period_days: int = 0
    short_term_quantity: float = 0
    long_term_quantity: float = 0
    trade_type: str


class CapitalGainRow(BaseModel):
    id: int
    source_key: Optional[str] = None
    is_manual: bool = False
    asset_type: Literal["stock", "mutual-fund"]
    transaction_date: str
    label: str
    folio: Optional[str] = None
    broker: Optional[str] = None
    meta: Optional[str] = None
    quantity: float
    sell_rate: float
    buy_rate: float
    trade_value: float
    purchase_value: float
    realized_gain: float
    short_term_gain: float
    long_term_gain: float
    short_term_holding_period_days: int = 0
    long_term_holding_period_days: int = 0
    short_term_quantity: float = 0
    long_term_quantity: float = 0
    trade_type: str
    sale_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CapitalGainCreate(BaseModel):
    asset_type: Literal["stock", "mutual-fund"]
    transaction_date: str
    label: str
    folio: Optional[str] = None
    broker: Optional[str] = None
    meta: Optional[str] = None
    quantity: float
    sell_rate: float
    buy_rate: float
    trade_value: float
    purchase_value: float
    realized_gain: Optional[float] = None
    short_term_gain: float = 0
    long_term_gain: float = 0
    short_term_holding_period_days: int = 0
    long_term_holding_period_days: int = 0
    trade_type: str = "SELL"
    sale_reason: Optional[str] = Field(default=None, max_length=100)

    @field_validator("sale_reason", "label", "folio", "broker", "meta", mode="before")
    @classmethod
    def trim_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        return _trim_optional_text(value)


class CapitalGainUpdate(BaseModel):
    asset_type: Optional[Literal["stock", "mutual-fund"]] = None
    transaction_date: Optional[str] = None
    label: Optional[str] = None
    folio: Optional[str] = None
    broker: Optional[str] = None
    meta: Optional[str] = None
    quantity: Optional[float] = None
    sell_rate: Optional[float] = None
    buy_rate: Optional[float] = None
    trade_value: Optional[float] = None
    purchase_value: Optional[float] = None
    realized_gain: Optional[float] = None
    short_term_gain: Optional[float] = None
    long_term_gain: Optional[float] = None
    short_term_holding_period_days: Optional[int] = None
    long_term_holding_period_days: Optional[int] = None
    trade_type: Optional[str] = None
    sale_reason: Optional[str] = Field(default=None, max_length=100)

    @field_validator("sale_reason", "label", "folio", "broker", "meta", mode="before")
    @classmethod
    def trim_optional_strings(cls, value: Optional[str]) -> Optional[str]:
        return _trim_optional_text(value)


class RealizedGainsResponse(BaseModel):
    transactions: list[CapitalGainRow]


class CapitalGainResponse(BaseModel):
    transaction: CapitalGainRow
    detail: str


class CapitalGainDeleteResponse(BaseModel):
    detail: str
