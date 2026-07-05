"""create mutual_fund_eod table

Revision ID: 016
Revises: 015
Create Date: 2026-07-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_create_mutual_fund_eod"
down_revision: Union[str, None] = "015_create_stock_historical"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mutual_fund_eod",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scheme_code", sa.String(length=16), nullable=False),
        sa.Column("nav_date", sa.Date(), nullable=False),
        sa.Column("scheme_name", sa.String(length=512), nullable=False),
        sa.Column("amc_name", sa.String(length=255), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("nav", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("asset_class", sa.String(length=32), nullable=False),
        sa.Column("fund_type", sa.String(length=64), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scheme_code", name="uq_mutual_fund_eod_scheme_code"),
    )
    op.create_index(
        "ix_mutual_fund_eod_isin",
        "mutual_fund_eod",
        ["isin"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_mutual_fund_eod_isin", table_name="mutual_fund_eod")
    op.drop_table("mutual_fund_eod")
