"""create ppf_investments and ppf_transactions tables

Revision ID: 014
Revises: 013
Create Date: 2026-07-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_create_ppf_tables"
down_revision: Union[str, None] = "013_stocks_holdings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ppf_investments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("account_number", sa.String(length=32), nullable=False),
        sa.Column("account_holder", sa.String(length=255), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="INR"),
        sa.Column("current_balance", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("total_deposited", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("total_withdrawn", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("total_interest", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "account_number",
            name="uq_ppf_investment_client_account",
        ),
    )
    op.create_index(
        op.f("ix_ppf_investments_client_pan"),
        "ppf_investments",
        ["client_pan"],
        unique=False,
    )

    op.create_table(
        "ppf_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("account_number", sa.String(length=32), nullable=False),
        sa.Column("sr_no", sa.Integer(), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("cheque_number", sa.String(length=64), nullable=True),
        sa.Column("remarks", sa.String(length=512), nullable=True),
        sa.Column("withdrawal_amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("deposit_amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("balance", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("transaction_type", sa.String(length=16), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "account_number",
            "transaction_date",
            "deposit_amount",
            "withdrawal_amount",
            "balance",
            name="uq_ppf_transaction_identity",
        ),
    )
    op.create_index(
        op.f("ix_ppf_transactions_client_pan"),
        "ppf_transactions",
        ["client_pan"],
        unique=False,
    )
    op.create_index(
        op.f("ix_ppf_transactions_account_number"),
        "ppf_transactions",
        ["account_number"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_ppf_transactions_account_number"), table_name="ppf_transactions")
    op.drop_index(op.f("ix_ppf_transactions_client_pan"), table_name="ppf_transactions")
    op.drop_table("ppf_transactions")
    op.drop_index(op.f("ix_ppf_investments_client_pan"), table_name="ppf_investments")
    op.drop_table("ppf_investments")
