from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    __table_args__ = (
        UniqueConstraint(
            "client_pan",
            "trade_id",
            name="uq_stock_transaction_client_trade_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    symbol: Mapped[str] = mapped_column(String(64), index=True)
    isin: Mapped[str] = mapped_column(String(12), index=True)
    exchange: Mapped[str] = mapped_column(String(16))
    segment: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    series: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date)
    trade_type: Mapped[str] = mapped_column(String(8))
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    price: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    trade_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    trade_id: Mapped[str] = mapped_column(String(32))
    order_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    order_execution_time: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    broker: Mapped[str] = mapped_column(String(32))
    source_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
