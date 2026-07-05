from typing import Literal, Optional

from pydantic import BaseModel


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


class RealizedGainsResponse(BaseModel):
    transactions: list[RealizedGainRow]
