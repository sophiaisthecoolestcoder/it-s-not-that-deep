"""add users.tokens_invalidated_before for session revocation on password change

Revision ID: 2026c5e6f7a8
Revises: 2026b4d5e6f7
Create Date: 2026-04-21 09:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "2026c5e6f7a8"
down_revision: Union[str, None] = "2026b4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("tokens_invalidated_before", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "tokens_invalidated_before")
