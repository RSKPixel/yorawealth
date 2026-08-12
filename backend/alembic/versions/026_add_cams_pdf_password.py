"""add cams_pdf_password to user_settings

Revision ID: 026_add_cams_pdf_password
Revises: 025_market_data_sync_logs
Create Date: 2026-08-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026_add_cams_pdf_password"
down_revision: Union[str, None] = "025_market_data_sync_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("cams_pdf_password", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "cams_pdf_password")
