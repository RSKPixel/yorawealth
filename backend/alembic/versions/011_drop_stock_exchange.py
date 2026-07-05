"""drop exchange from stocks holdings

Revision ID: 011
Revises: 010
Create Date: 2026-07-04
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_drop_stock_exchange"
down_revision: Union[str, None] = "010_create_stocks_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("DELETE FROM stocks"))
    op.drop_constraint("uq_stock_client_symbol_exchange", "stocks", type_="unique")
    op.drop_column("stocks", "exchange")
    op.create_unique_constraint(
        "uq_stock_client_symbol",
        "stocks",
        ["client_pan", "symbol"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_stock_client_symbol", "stocks", type_="unique")
    op.add_column(
        "stocks",
        sa.Column("exchange", sa.String(length=16), nullable=False, server_default="NSE"),
    )
    op.create_unique_constraint(
        "uq_stock_client_symbol_exchange",
        "stocks",
        ["client_pan", "symbol", "exchange"],
    )
    op.alter_column("stocks", "exchange", server_default=None)
