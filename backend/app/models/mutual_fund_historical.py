from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MutualFundHistorical(Base):
    __tablename__ = "mutual_fund_historical"
    __table_args__ = (
        UniqueConstraint(
            "scheme_code",
            "date",
            name="uq_mutual_fund_historical_scheme_date",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date_type] = mapped_column(Date, index=True)
    scheme_code: Mapped[str] = mapped_column(String(16), index=True)
    isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True, index=True)
    scheme_name: Mapped[str] = mapped_column(String(512))
    amc_name: Mapped[str] = mapped_column(String(255))
    nav: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    source_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
