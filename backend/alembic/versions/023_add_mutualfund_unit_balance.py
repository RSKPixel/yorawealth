"""add unit_balance to mutualfund_transactions

Revision ID: 023_mf_unit_balance
Revises: 022_profile_pic_mediumtext
Create Date: 2026-07-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_mf_unit_balance"
down_revision: Union[str, Sequence[str], None] = "022_profile_pic_mediumtext"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "mutualfund_transactions",
        sa.Column("unit_balance", sa.Numeric(precision=18, scale=3), nullable=True),
    )

    op.drop_constraint(
        "uq_mf_txn_client_folio_isin_date_trade",
        "mutualfund_transactions",
        type_="unique",
    )

    op.create_unique_constraint(
        "uq_mf_txn_client_folio_isin_date_trade_balance",
        "mutualfund_transactions",
        [
            "client_pan",
            "folio",
            "isin",
            "transaction_date",
            "trade_type",
            "quantity",
            "trade_value",
            "unit_balance",
        ],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_mf_txn_client_folio_isin_date_trade_balance",
        "mutualfund_transactions",
        type_="unique",
    )

    op.create_unique_constraint(
        "uq_mf_txn_client_folio_isin_date_trade",
        "mutualfund_transactions",
        [
            "client_pan",
            "folio",
            "isin",
            "transaction_date",
            "trade_type",
            "quantity",
            "trade_value",
        ],
    )

    op.drop_column("mutualfund_transactions", "unit_balance")
