"""create mutualfund_transactions table

Revision ID: 002_mutualfund_transactions
Revises: 001_create_users
Create Date: 2026-07-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_mutualfund_transactions"
down_revision: Union[str, Sequence[str], None] = "001_create_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mutualfund_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("folio", sa.String(length=64), nullable=False),
        sa.Column("fund_name", sa.String(length=512), nullable=False),
        sa.Column("amc", sa.String(length=255), nullable=False),
        sa.Column("assetclass", sa.String(length=64), nullable=True),
        sa.Column("symbol", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("trade_type", sa.String(length=8), nullable=False),
        sa.Column("nav", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=3), nullable=False),
        sa.Column("trade_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_mutualfund_transactions_client_pan"),
        "mutualfund_transactions",
        ["client_pan"],
        unique=False,
    )
    op.create_index(
        op.f("ix_mutualfund_transactions_isin"),
        "mutualfund_transactions",
        ["isin"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_mutualfund_transactions_isin"),
        table_name="mutualfund_transactions",
    )
    op.drop_index(
        op.f("ix_mutualfund_transactions_client_pan"),
        table_name="mutualfund_transactions",
    )
    op.drop_table("mutualfund_transactions")
