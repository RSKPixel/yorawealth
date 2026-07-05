from __future__ import annotations

from decimal import Decimal

from app.models.stock_transaction import StockTransaction
from app.schemas.stocks import ManualTradeCreate

MANUAL_TRADE_SOURCE = "manual-entry"
MANUAL_TRADE_EXCHANGE = "MANUAL"


def is_manual_transaction(record: StockTransaction) -> bool:
    return (
        record.source_filename == MANUAL_TRADE_SOURCE
        or record.exchange == MANUAL_TRADE_EXCHANGE
    )


def build_manual_trade_row(payload: ManualTradeCreate, trade_id: str) -> dict:
    quantity = Decimal(str(payload.quantity))
    rate = Decimal(str(payload.rate))
    trade_value = (quantity * rate).quantize(Decimal("0.01"))

    return {
        "symbol": payload.symbol,
        "isin": "",
        "exchange": MANUAL_TRADE_EXCHANGE,
        "segment": None,
        "series": None,
        "transaction_date": payload.trade_date,
        "trade_type": payload.trade_type.value,
        "quantity": quantity,
        "price": rate,
        "trade_value": trade_value,
        "trade_id": trade_id,
        "order_id": None,
        "order_execution_time": None,
    }
