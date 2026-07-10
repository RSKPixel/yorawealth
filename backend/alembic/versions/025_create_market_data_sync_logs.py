"""create market_data_sync_logs table

Revision ID: 025_market_data_sync_logs
Revises: 024_create_index_historical
Create Date: 2026-07-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "025_market_data_sync_logs"
down_revision: Union[str, None] = "024_create_index_historical"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "market_data_sync_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("trigger", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_market_data_sync_logs_user_id",
        "market_data_sync_logs",
        ["user_id"],
    )
    op.create_index(
        "ix_market_data_sync_logs_user_started",
        "market_data_sync_logs",
        ["user_id", "started_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_market_data_sync_logs_user_started", "market_data_sync_logs")
    op.drop_index("ix_market_data_sync_logs_user_id", "market_data_sync_logs")
    op.drop_table("market_data_sync_logs")
