"""create mutual_fund_historical and amfi_scheme_sync tables

Revision ID: 006
Revises: 005
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_mutual_fund_historical"
down_revision: Union[str, None] = "005_portfolio_holdings_fund_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mutual_fund_historical",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("scheme_code", sa.String(length=16), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=True),
        sa.Column("scheme_name", sa.String(length=512), nullable=False),
        sa.Column("amc_name", sa.String(length=255), nullable=False),
        sa.Column("nav", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "scheme_code",
            "date",
            name="uq_mutual_fund_historical_scheme_date",
        ),
    )
    op.create_index(
        "ix_mutual_fund_historical_date",
        "mutual_fund_historical",
        ["date"],
        unique=False,
    )
    op.create_index(
        "ix_mutual_fund_historical_scheme_code",
        "mutual_fund_historical",
        ["scheme_code"],
        unique=False,
    )
    op.create_index(
        "ix_mutual_fund_historical_isin",
        "mutual_fund_historical",
        ["isin"],
        unique=False,
    )

    op.create_table(
        "amfi_scheme_sync",
        sa.Column("scheme_code", sa.String(length=16), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=True),
        sa.Column("last_synced_date", sa.Date(), nullable=True),
        sa.Column("last_error", sa.String(length=512), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("scheme_code"),
    )
    op.create_index(
        "ix_amfi_scheme_sync_isin",
        "amfi_scheme_sync",
        ["isin"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_amfi_scheme_sync_isin", table_name="amfi_scheme_sync")
    op.drop_table("amfi_scheme_sync")
    op.drop_index("ix_mutual_fund_historical_isin", table_name="mutual_fund_historical")
    op.drop_index("ix_mutual_fund_historical_scheme_code", table_name="mutual_fund_historical")
    op.drop_index("ix_mutual_fund_historical_date", table_name="mutual_fund_historical")
    op.drop_table("mutual_fund_historical")
