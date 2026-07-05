"""create portfolio_holdings table

Revision ID: 004_portfolio_holdings
Revises: 003_mf_txn_unique
Create Date: 2026-07-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_portfolio_holdings"
down_revision: Union[str, Sequence[str], None] = "003_mf_txn_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "portfolio_holdings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("folio", sa.String(length=64), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("fund_name", sa.String(length=512), nullable=False),
        sa.Column("amc", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=18, scale=3), nullable=False),
        sa.Column("invested_amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("avg_cost", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("current_nav", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("current_value", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("unrealized_gain", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "folio",
            "isin",
            name="uq_portfolio_holding_client_folio_isin",
        ),
    )
    op.create_index(
        op.f("ix_portfolio_holdings_client_pan"),
        "portfolio_holdings",
        ["client_pan"],
        unique=False,
    )
    op.create_index(
        op.f("ix_portfolio_holdings_isin"),
        "portfolio_holdings",
        ["isin"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_portfolio_holdings_isin"), table_name="portfolio_holdings")
    op.drop_index(op.f("ix_portfolio_holdings_client_pan"), table_name="portfolio_holdings")
    op.drop_table("portfolio_holdings")
