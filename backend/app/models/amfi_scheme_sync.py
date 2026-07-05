from datetime import date as date_type
from datetime import datetime
from typing import Optional

from sqlalchemy import Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AmfiSchemeSync(Base):
    __tablename__ = "amfi_scheme_sync"

    scheme_code: Mapped[str] = mapped_column(String(16), primary_key=True)
    isin: Mapped[Optional[str]] = mapped_column(String(12), nullable=True, index=True)
    last_synced_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    first_synced_date: Mapped[Optional[date_type]] = mapped_column(Date, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
