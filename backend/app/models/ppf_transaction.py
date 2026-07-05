from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PpfTransaction(Base):
    __tablename__ = "ppf_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    account_number: Mapped[str] = mapped_column(String(32), index=True)
    sr_no: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date)
    cheque_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    remarks: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    withdrawal_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    deposit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    transaction_type: Mapped[str] = mapped_column(String(16))
    source_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
