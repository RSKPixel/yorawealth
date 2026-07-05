"""add zerodha_client_id to users

Revision ID: 009
Revises: 008
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_zerodha_client_id"
down_revision: Union[str, None] = "008_enhance_nav_historical_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("zerodha_client_id", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "zerodha_client_id")
