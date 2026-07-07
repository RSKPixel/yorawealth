"""create capital_gains table

Revision ID: 018
Revises: 017
Create Date: 2026-07-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018_create_capital_gains"
down_revision: Union[str, None] = "017_stock_txn_broker"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "capital_gains",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("source_key", sa.String(length=255), nullable=True),
        sa.Column("is_manual", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("asset_type", sa.String(length=16), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("folio", sa.String(length=64), nullable=True),
        sa.Column("broker", sa.String(length=32), nullable=True),
        sa.Column("meta", sa.String(length=64), nullable=True),
        sa.Column("quantity", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("sell_rate", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("buy_rate", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("trade_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("purchase_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("realized_gain", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("short_term_gain", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("long_term_gain", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column(
            "short_term_holding_period_days",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "long_term_holding_period_days",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "short_term_quantity",
            sa.Numeric(precision=18, scale=6),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "long_term_quantity",
            sa.Numeric(precision=18, scale=6),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("trade_type", sa.String(length=16), nullable=False),
        sa.Column("sale_reason", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "source_key",
            name="uq_capital_gain_client_source_key",
        ),
    )
    op.create_index(
        op.f("ix_capital_gains_client_pan"),
        "capital_gains",
        ["client_pan"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_capital_gains_client_pan"), table_name="capital_gains")
    op.drop_table("capital_gains")
