from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PpfInvestment(Base):
    __tablename__ = "ppf_investments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    account_number: Mapped[str] = mapped_column(String(32))
    account_holder: Mapped[str] = mapped_column(String(255))
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    current_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    total_deposited: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    total_withdrawn: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    total_interest: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
