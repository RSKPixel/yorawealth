"""create nse_eod table

Revision ID: 012
Revises: 011
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_create_nse_eod"
down_revision: Union[str, None] = "011_drop_stock_exchange"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "nse_eod",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("prev_close", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("open", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("high", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("low", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("close", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol", name="uq_nse_eod_symbol"),
    )
    op.create_index(op.f("ix_nse_eod_symbol"), "nse_eod", ["symbol"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_nse_eod_symbol"), table_name="nse_eod")
    op.drop_table("nse_eod")
