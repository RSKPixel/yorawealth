from datetime import date as date_type
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IndexHistorical(Base):
    __tablename__ = "index_historical"
    __table_args__ = (
        UniqueConstraint(
            "symbol",
            "trade_date",
            name="uq_index_historical_symbol_date",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(64), index=True)
    trade_date: Mapped[date_type] = mapped_column(Date, index=True)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
