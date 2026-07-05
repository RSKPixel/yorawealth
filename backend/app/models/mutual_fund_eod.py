from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MutualFundEod(Base):
    __tablename__ = "mutual_fund_eod"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scheme_code: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    nav_date: Mapped[date_type] = mapped_column(Date)
    scheme_name: Mapped[str] = mapped_column(String(512))
    amc_name: Mapped[str] = mapped_column(String(255))
    isin: Mapped[str] = mapped_column(String(12), index=True)
    nav: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    asset_class: Mapped[str] = mapped_column(String(32))
    fund_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
