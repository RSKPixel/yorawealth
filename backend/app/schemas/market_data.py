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
