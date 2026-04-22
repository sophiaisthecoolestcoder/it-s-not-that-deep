"""add public flag to calendar_events for website visibility

Revision ID: 202704a1b2c3
Revises: 2026f3a4b5c6
Create Date: 2026-04-22 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "202704a1b2c3"
down_revision: Union[str, None] = "2026f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "calendar_events",
        sa.Column("public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index(
        "ix_calendar_events_public_starts_at",
        "calendar_events",
        ["public", "starts_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_calendar_events_public_starts_at", table_name="calendar_events")
    op.drop_column("calendar_events", "public")
