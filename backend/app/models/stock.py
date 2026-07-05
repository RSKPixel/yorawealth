from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Stock(Base):
    __tablename__ = "stocks_holdings"
    __table_args__ = (
        UniqueConstraint(
            "client_pan",
            "symbol",
            name="uq_stock_client_symbol",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    symbol: Mapped[str] = mapped_column(String(64), index=True)
    isin: Mapped[str] = mapped_column(String(12), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 6))
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    avg_cost: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    current_price: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    current_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    unrealized_gain: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
