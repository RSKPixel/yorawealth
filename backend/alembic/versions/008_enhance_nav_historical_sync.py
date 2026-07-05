"""enhance mutual fund historical sync tracking

Revision ID: 008
Revises: 007
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_enhance_nav_historical_sync"
down_revision: Union[str, None] = "007_portfolio_target_allocation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "amfi_scheme_sync",
        sa.Column("first_synced_date", sa.Date(), nullable=True),
    )
    op.create_index(
        "ix_mutual_fund_historical_scheme_date",
        "mutual_fund_historical",
        ["scheme_code", "date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_mutual_fund_historical_scheme_date",
        table_name="mutual_fund_historical",
    )
    op.drop_column("amfi_scheme_sync", "first_synced_date")
