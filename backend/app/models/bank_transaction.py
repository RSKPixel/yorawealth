from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    bank_account_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("bank_accounts.id", ondelete="CASCADE"),
        index=True,
    )
    account_number: Mapped[str] = mapped_column(String(64))
    transaction_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(String(512))
    reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    source_filename: Mapped[str] = mapped_column(String(255))
    import_batch_id: Mapped[str] = mapped_column(String(36))
    row_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
