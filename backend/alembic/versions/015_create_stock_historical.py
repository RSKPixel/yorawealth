"""create stock_historical table

Revision ID: 015
Revises: 014
Create Date: 2026-07-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_create_stock_historical"
down_revision: Union[str, None] = "014_create_ppf_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_historical",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("prev_close", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("open", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("high", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("low", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("close", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("fetched_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "symbol",
            "trade_date",
            name="uq_stock_historical_symbol_date",
        ),
    )
    op.create_index(
        "ix_stock_historical_symbol",
        "stock_historical",
        ["symbol"],
        unique=False,
    )
    op.create_index(
        "ix_stock_historical_trade_date",
        "stock_historical",
        ["trade_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_stock_historical_trade_date", table_name="stock_historical")
    op.drop_index("ix_stock_historical_symbol", table_name="stock_historical")
    op.drop_table("stock_historical")
