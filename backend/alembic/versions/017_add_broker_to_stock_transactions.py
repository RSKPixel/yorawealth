"""add broker to stock_transactions

Revision ID: 017
Revises: 016
Create Date: 2026-07-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_stock_txn_broker"
down_revision: Union[str, None] = "016_create_mutual_fund_eod"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BROKER_COLUMN = sa.String(length=32)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("stock_transactions")}

    if "broker" not in columns:
        op.add_column(
            "stock_transactions",
            sa.Column(
                "broker",
                BROKER_COLUMN,
                nullable=False,
                server_default="Zerodha",
            ),
        )
        op.alter_column(
            "stock_transactions",
            "broker",
            existing_type=BROKER_COLUMN,
            server_default=None,
        )
        return

    op.execute(
        sa.text(
            "UPDATE stock_transactions SET broker = 'Zerodha' "
            "WHERE broker IS NULL OR broker = ''"
        )
    )
    op.alter_column(
        "stock_transactions",
        "broker",
        existing_type=BROKER_COLUMN,
        nullable=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("stock_transactions")}

    if "broker" in columns:
        op.drop_column("stock_transactions", "broker")
