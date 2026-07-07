from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CapitalGain(Base):
    __tablename__ = "capital_gains"
    __table_args__ = (
        UniqueConstraint(
            "client_pan",
            "source_key",
            name="uq_capital_gain_client_source_key",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    source_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    asset_type: Mapped[str] = mapped_column(String(16))
    transaction_date: Mapped[date] = mapped_column(Date)
    label: Mapped[str] = mapped_column(String(255))
    folio: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    broker: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    meta: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    sell_rate: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    buy_rate: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    trade_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    purchase_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    realized_gain: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    short_term_gain: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    long_term_gain: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    short_term_holding_period_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    long_term_holding_period_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    short_term_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default="0")
    long_term_quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False, server_default="0")
    trade_type: Mapped[str] = mapped_column(String(16))
    sale_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
