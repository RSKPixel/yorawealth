from typing import Optional

from pydantic import BaseModel


class CamsTransactionRow(BaseModel):
    client_pan: Optional[str] = None
    folio: str
    fund_name: str
    amc: str
    assetclass: Optional[str] = None
    symbol: Optional[str] = None
    name: Optional[str] = None
    isin: str
    transaction_date: str
    trade_type: str
    nav: float
    quantity: float
    trade_value: float
    unit_balance: Optional[float] = None


class CamsUploadResponse(BaseModel):
    filename: str
    detail: str
    transactions: list[CamsTransactionRow]


class CamsTransactionsResponse(BaseModel):
    transactions: list[CamsTransactionRow]


class PortfolioHoldingRow(BaseModel):
    client_pan: str
    folio: str
    isin: str
    fund_name: str
    amc: str
    asset_class: Optional[str] = None
    fund_type: Optional[str] = None
    quantity: float
    invested_amount: float
    avg_cost: float
    current_nav: float
    current_nav_date: Optional[str] = None
    current_value: float
    unrealized_gain: float
    xirr: Optional[float] = None
    cagr: Optional[float] = None


class PortfolioHoldingsResponse(BaseModel):
    holdings: list[PortfolioHoldingRow]
    total_invested: float
    total_current_value: float
    total_unrealized_gain: float
    xirr: Optional[float] = None
    cagr: Optional[float] = None


class NavHistoryPoint(BaseModel):
    date: str
    nav: float


class HoldingTransactionMarker(BaseModel):
    date: str
    nav: float
    trade_type: str
    quantity: float
    trade_value: float


class HoldingChartResponse(BaseModel):
    fund_name: str
    scheme_code: str
    from_date: str
    to_date: str
    nav_history: list[NavHistoryPoint]
    transactions: list[HoldingTransactionMarker]
    sync_warning: Optional[str] = None


class ReconciliationRow(BaseModel):
    folio: str
    isin: str
    fund_name: str
    computed_quantity: float
    txn_net_quantity: float
    cams_closing_units: Optional[float] = None
    quantity_diff: Optional[float] = None
    txn_quantity_diff: Optional[float] = None
    computed_invested: float
    cams_total_cost: Optional[float] = None
    invested_diff: Optional[float] = None
    cams_market_value: Optional[float] = None
    statement_nav_date: Optional[str] = None
    source_filename: Optional[str] = None
    status: str


class ReconciliationSummary(BaseModel):
    status: str
    matched_count: int
    total_count: int
    statement_date: Optional[str] = None
    quantity_tolerance: float
    invested_tolerance: float


class PortfolioReconciliationResponse(BaseModel):
    summary: ReconciliationSummary
    rows: list[ReconciliationRow]


class TargetAllocationRow(BaseModel):
    asset_class: str
    target_pct: Optional[float] = None


class TargetAllocationResponse(BaseModel):
    targets: list[TargetAllocationRow]


class TargetAllocationSaveRequest(BaseModel):
    targets: list[TargetAllocationRow]
