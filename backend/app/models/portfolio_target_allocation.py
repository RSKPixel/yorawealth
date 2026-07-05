from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PortfolioTargetAllocation(Base):
    __tablename__ = "portfolio_target_allocation"
    __table_args__ = (
        UniqueConstraint(
            "client_pan",
            "asset_class",
            name="uq_portfolio_target_allocation_pan_class",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), index=True)
    asset_class: Mapped[str] = mapped_column(String(16))
    target_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
