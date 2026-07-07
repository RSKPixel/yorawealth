"""alter users profile_pic to mediumtext

Revision ID: 022
Revises: 021
Create Date: 2026-07-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.mysql import MEDIUMTEXT

revision: str = "022_profile_pic_mediumtext"
down_revision: Union[str, None] = "021_create_user_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "profile_pic",
        existing_type=sa.String(length=512),
        type_=MEDIUMTEXT(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "profile_pic",
        existing_type=MEDIUMTEXT(),
        type_=sa.String(length=512),
        existing_nullable=True,
    )
