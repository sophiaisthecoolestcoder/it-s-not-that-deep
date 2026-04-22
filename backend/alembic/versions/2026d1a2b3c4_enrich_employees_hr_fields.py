"""enrich employees table with HR fields

Revision ID: 2026d1a2b3c4
Revises: 2026c5e6f7a8
Create Date: 2026-04-22 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "2026d1a2b3c4"
down_revision: Union[str, None] = "2026c5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("department", sa.String(length=100), nullable=True))
    op.add_column("employees", sa.Column("position", sa.String(length=150), nullable=True))
    op.add_column("employees", sa.Column("employment_started_on", sa.Date(), nullable=True))
    op.add_column("employees", sa.Column("employment_ended_on", sa.Date(), nullable=True))
    op.add_column(
        "employees",
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column("employees", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "notes")
    op.drop_column("employees", "active")
    op.drop_column("employees", "employment_ended_on")
    op.drop_column("employees", "employment_started_on")
    op.drop_column("employees", "position")
    op.drop_column("employees", "department")
