from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.services.stock_brokers import ZERODHA_BROKER


class StockBroker(str, Enum):
    ZERODHA = ZERODHA_BROKER


class ManualTradeType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    BUY_BACK = "BUY BACK"
    SPLIT = "SPLIT"
    BONUS = "BONUS"
    DEMERGER = "DEMERGER"
    IPO = "IPO"


class ManualTradeCreate(BaseModel):
    trade_date: date
    symbol: str = Field(min_length=1, max_length=64)
    quantity: int = Field(gt=0)
    rate: float = Field(ge=0)
    trade_type: ManualTradeType
    broker: StockBroker = StockBroker.ZERODHA

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        symbol = value.strip().upper()
        if not symbol:
            raise ValueError("symbol is required.")
        return symbol


class ManualTradeResponse(BaseModel):
    detail: str
    trade_id: Optional[str] = None


class StockTransactionRow(BaseModel):
    trade_id: str
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    broker: Optional[str] = None
    is_manual: bool = False
    transaction_date: str
    trade_type: str
    quantity: int
    price: float
    trade_value: float


class StockTransactionsResponse(BaseModel):
    transactions: list[StockTransactionRow]


class StockHoldingRow(BaseModel):
    symbol: str
    name: Optional[str] = None
    asset_class: Optional[str] = None
    quantity: int
    invested_amount: float
    avg_cost: float
    current_price: float
    current_value: float
    unrealized_gain: float
    xirr: Optional[float] = None


class StockHoldingsResponse(BaseModel):
    holdings: list[StockHoldingRow]
    total_invested: float
    total_current_value: float
    total_unrealized_gain: float
    xirr: Optional[float] = None


class TradebookUploadResponse(BaseModel):
    filename: str
    detail: str
