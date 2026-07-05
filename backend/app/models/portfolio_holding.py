from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"
    __table_args__ = (
        UniqueConstraint(
            "client_pan",
            "folio",
            "isin",
            name="uq_portfolio_holding_client_folio_isin",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    folio: Mapped[str] = mapped_column(String(64))
    isin: Mapped[str] = mapped_column(String(12), index=True)
    fund_name: Mapped[str] = mapped_column(String(512))
    amc: Mapped[str] = mapped_column(String(255))
    asset_class: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    fund_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    invested_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    avg_cost: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    current_nav: Mapped[Decimal] = mapped_column(Numeric(18, 4))
    current_value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    unrealized_gain: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
