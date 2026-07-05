"""rename stocks table to stocks_holdings

Revision ID: 013
Revises: 012
Create Date: 2026-07-05
"""

from typing import Sequence, Union

from alembic import op

revision: str = "013_stocks_holdings"
down_revision: Union[str, None] = "012_create_nse_eod"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("stocks", "stocks_holdings")


def downgrade() -> None:
    op.rename_table("stocks_holdings", "stocks")
