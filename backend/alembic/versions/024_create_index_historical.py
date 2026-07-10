"""create index_historical table

Revision ID: 024_create_index_historical
Revises: 023_mf_unit_balance
Create Date: 2026-07-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "024_create_index_historical"
down_revision: Union[str, None] = "023_mf_unit_balance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "index_historical",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("close", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "symbol",
            "trade_date",
            name="uq_index_historical_symbol_date",
        ),
    )
    op.create_index(
        "ix_index_historical_symbol",
        "index_historical",
        ["symbol"],
        unique=False,
    )
    op.create_index(
        "ix_index_historical_trade_date",
        "index_historical",
        ["trade_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_index_historical_trade_date", table_name="index_historical")
    op.drop_index("ix_index_historical_symbol", table_name="index_historical")
    op.drop_table("index_historical")
