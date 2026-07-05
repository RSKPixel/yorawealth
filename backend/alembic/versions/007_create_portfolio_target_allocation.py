"""create portfolio_target_allocation table

Revision ID: 007
Revises: 006
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_portfolio_target_allocation"
down_revision: Union[str, None] = "006_mutual_fund_historical"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "portfolio_target_allocation",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("asset_class", sa.String(length=16), nullable=False),
        sa.Column("target_pct", sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "asset_class",
            name="uq_portfolio_target_allocation_pan_class",
        ),
    )
    op.create_index(
        "ix_portfolio_target_allocation_client_pan",
        "portfolio_target_allocation",
        ["client_pan"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_portfolio_target_allocation_client_pan",
        table_name="portfolio_target_allocation",
    )
    op.drop_table("portfolio_target_allocation")
