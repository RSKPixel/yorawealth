from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_pan: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    password: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    zerodha_client_id: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    profile_pic: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )
