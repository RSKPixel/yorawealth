"""add unique constraint to mutualfund_transactions

Revision ID: 003_mf_txn_unique
Revises: 002_mutualfund_transactions
Create Date: 2026-07-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_mf_txn_unique"
down_revision: Union[str, Sequence[str], None] = "002_mutualfund_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE t1 FROM mutualfund_transactions t1
            INNER JOIN mutualfund_transactions t2
                ON t1.client_pan = t2.client_pan
                AND t1.folio = t2.folio
                AND t1.isin = t2.isin
                AND t1.transaction_date = t2.transaction_date
                AND t1.trade_type = t2.trade_type
                AND t1.quantity = t2.quantity
                AND t1.trade_value = t2.trade_value
                AND t1.id < t2.id
            """
        )
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


def downgrade() -> None:
    op.drop_constraint(
        "uq_mf_txn_client_folio_isin_date_trade",
        "mutualfund_transactions",
        type_="unique",
    )
