from typing import List, Optional

from pydantic import BaseModel


class NseEodSyncResponse(BaseModel):
    message: str
    bhavdate: str
    trade_date: Optional[str] = None
    rows_processed: int
    created_count: int
    updated_count: int


class NseHistoricalSyncResponse(BaseModel):
    status: str
    message: str
    symbols: List[str]
    from_date: str
    to_date: str
    rows_processed: int
    messages: List[str]
    errors: List[str]


class AmfiEodSyncResponse(BaseModel):
    message: str
    nav_date: Optional[str] = None
    rows_processed: int
    created_count: int
    updated_count: int


class AmfiHistoricalSyncResponse(BaseModel):
    status: str
    message: str
    isins: List[str]
    from_date: Optional[str] = None
    to_date: str
    rows_processed: int
    messages: List[str]
    errors: List[str]


class MarketDataSyncStepResult(BaseModel):
    status: str
    rows_processed: int = 0
    message: Optional[str] = None
    errors: List[str] = []


class MarketDataSyncLogResponse(BaseModel):
    id: int
    trigger: str
    status: str
    summary: Optional[str] = None
    details: Optional[dict] = None
    started_at: str
    completed_at: Optional[str] = None


class MarketDataSyncLogsResponse(BaseModel):
    logs: List[MarketDataSyncLogResponse]
    last_daily: Optional[MarketDataSyncLogResponse] = None


class DailyMarketDataSyncResponse(BaseModel):
    status: str
    log_id: Optional[int] = None
    message: str


class ManualMarketDataSyncResponse(BaseModel):
    status: str
    log_id: int
    message: str
    details: Optional[dict] = None
