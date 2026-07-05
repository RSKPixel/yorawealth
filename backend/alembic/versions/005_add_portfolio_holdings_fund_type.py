"""add asset_class and fund_type to portfolio_holdings

Revision ID: 005
Revises: 004
Create Date: 2026-07-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_portfolio_holdings_fund_type"
down_revision: Union[str, None] = "004_portfolio_holdings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "portfolio_holdings",
        sa.Column("asset_class", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "portfolio_holdings",
        sa.Column("fund_type", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("portfolio_holdings", "fund_type")
    op.drop_column("portfolio_holdings", "asset_class")
