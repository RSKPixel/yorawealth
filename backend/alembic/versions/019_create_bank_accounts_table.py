"""create bank_accounts table

Revision ID: 019
Revises: 018
Create Date: 2026-07-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_create_bank_accounts"
down_revision: Union[str, None] = "018_create_capital_gains"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_pan", sa.String(length=10), nullable=False),
        sa.Column("bank_name", sa.String(length=255), nullable=False),
        sa.Column("account_type", sa.String(length=32), nullable=False),
        sa.Column("account_number", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "client_pan",
            "account_number",
            name="uq_bank_account_client_account_number",
        ),
    )
    op.create_index(
        op.f("ix_bank_accounts_client_pan"),
        "bank_accounts",
        ["client_pan"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_bank_accounts_client_pan"), table_name="bank_accounts")
    op.drop_table("bank_accounts")
