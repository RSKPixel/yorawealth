"""create bank_transactions table

Revision ID: 020
Revises: 019
Create Date: 2026-07-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020_create_bank_transactions"
down_revision: Union[str, None] = "019_create_bank_accounts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("bank_account_id", sa.Integer(), nullable=False),
        sa.Column("account_number", sa.String(length=64), nullable=False),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=512), nullable=False),
        sa.Column("reference", sa.String(length=128), nullable=True),
        sa.Column("credit", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("debit", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("import_batch_id", sa.String(length=36), nullable=False),
        sa.Column("row_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["bank_account_id"],
            ["bank_accounts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "bank_account_id",
            "row_hash",
            name="uq_bank_transaction_account_row_hash",
        ),
    )
    op.create_index(
        op.f("ix_bank_transactions_client_pan"),
        "bank_transactions",
        ["client_pan"],
        unique=False,
    )
    op.create_index(
        op.f("ix_bank_transactions_bank_account_id"),
        "bank_transactions",
        ["bank_account_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bank_transactions_bank_account_id"), table_name="bank_transactions")
    op.drop_index(op.f("ix_bank_transactions_client_pan"), table_name="bank_transactions")
    op.drop_table("bank_transactions")
