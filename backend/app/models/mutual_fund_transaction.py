from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MutualFundTransaction(Base):
    __tablename__ = "mutualfund_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    folio: Mapped[str] = mapped_column(String(64))
    fund_name: Mapped[str] = mapped_column(String(512))
    amc: Mapped[str] = mapped_column(String(255))
    assetclass: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    symbol: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    isin: Mapped[str] = mapped_column(String(12), index=True)
    transaction_date: Mapped[date] = mapped_column(Date)
    trade_type: Mapped[str] = mapped_column(String(8))
    nav: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    trade_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    source_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
