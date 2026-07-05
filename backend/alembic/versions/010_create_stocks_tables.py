"""create stocks and stock_transactions tables

Revision ID: 010
Revises: 009
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_create_stocks_tables"
down_revision: Union[str, None] = "009_zerodha_client_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("exchange", sa.String(length=16), nullable=False),
        sa.Column("segment", sa.String(length=16), nullable=True),
        sa.Column("series", sa.String(length=16), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("trade_type", sa.String(length=8), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("price", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("trade_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("trade_id", sa.String(length=32), nullable=False),
        sa.Column("order_id", sa.String(length=32), nullable=True),
        sa.Column("order_execution_time", sa.String(length=32), nullable=True),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "trade_id",
            name="uq_stock_transaction_client_trade_id",
        ),
    )
    op.create_index(
        op.f("ix_stock_transactions_client_pan"),
        "stock_transactions",
        ["client_pan"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stock_transactions_symbol"),
        "stock_transactions",
        ["symbol"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stock_transactions_isin"),
        "stock_transactions",
        ["isin"],
        unique=False,
    )

    op.create_table(
        "stocks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("symbol", sa.String(length=64), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("exchange", sa.String(length=16), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column("invested_amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("avg_cost", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("current_price", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("current_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("unrealized_gain", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "symbol",
            "exchange",
            name="uq_stock_client_symbol_exchange",
        ),
    )
    op.create_index(op.f("ix_stocks_client_pan"), "stocks", ["client_pan"], unique=False)
    op.create_index(op.f("ix_stocks_symbol"), "stocks", ["symbol"], unique=False)
    op.create_index(op.f("ix_stocks_isin"), "stocks", ["isin"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stocks_isin"), table_name="stocks")
    op.drop_index(op.f("ix_stocks_symbol"), table_name="stocks")
    op.drop_index(op.f("ix_stocks_client_pan"), table_name="stocks")
    op.drop_table("stocks")
    op.drop_index(op.f("ix_stock_transactions_isin"), table_name="stock_transactions")
    op.drop_index(op.f("ix_stock_transactions_symbol"), table_name="stock_transactions")
    op.drop_index(op.f("ix_stock_transactions_client_pan"), table_name="stock_transactions")
    op.drop_table("stock_transactions")
