from __future__ import annotations

from typing import Optional

from app.models.nse_eod import NseEod
from app.models.stock import Stock
from app.models.stock_transaction import StockTransaction
from app.schemas.stocks import StockHoldingRow, StockTransactionRow
from app.services.manual_trade import is_manual_transaction
from app.services.stock_asset_class import classify_stock


def transaction_to_row(record: StockTransaction) -> StockTransactionRow:
    return StockTransactionRow(
        trade_id=record.trade_id,
        symbol=record.symbol,
        name=record.symbol,
        exchange=record.exchange,
        broker=record.broker,
        is_manual=is_manual_transaction(record),
        transaction_date=record.transaction_date.isoformat(),
        trade_type=record.trade_type,
        quantity=int(record.quantity),
        price=float(record.price),
        trade_value=float(record.trade_value),
    )


def holding_to_row(record: Stock, eod: Optional[NseEod] = None) -> StockHoldingRow:
    name = eod.name if eod and eod.name else record.symbol
    current_price = float(eod.close) if eod else float(record.current_price)
    quantity = int(record.quantity)
    invested_amount = float(record.invested_amount)

    if eod:
        current_value = round(quantity * current_price, 2)
        unrealized_gain = round(current_value - invested_amount, 2)
    else:
        current_value = float(record.current_value)
        unrealized_gain = float(record.unrealized_gain)

    return StockHoldingRow(
        symbol=record.symbol,
        name=name,
        asset_class=classify_stock(record.symbol, record.isin, name),
        quantity=quantity,
        invested_amount=invested_amount,
        avg_cost=float(record.avg_cost),
        current_price=current_price,
        current_value=current_value,
        unrealized_gain=unrealized_gain,
        xirr=None,
    )
