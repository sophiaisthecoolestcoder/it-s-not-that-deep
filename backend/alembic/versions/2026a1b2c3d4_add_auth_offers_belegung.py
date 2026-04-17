"""add users, offers, daily_briefings, staff_members, rooms tables

Revision ID: 2026a1b2c3d4
Revises: 44254c85c0fd
Create Date: 2026-04-17 13:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2026a1b2c3d4"
down_revision: Union[str, None] = "44254c85c0fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OFFER_STATUS_ENUM = postgresql.ENUM("draft", "sent", "accepted", "declined", name="offerstatus", create_type=False)
SALUTATION_ENUM = postgresql.ENUM("Herr", "Frau", "Familie", name="salutation", create_type=False)
EMPLOYEE_ROLE_ENUM = postgresql.ENUM(
    "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "SPA_THERAPIST",
    "CHEF", "WAITER", "CONCIERGE", "MAINTENANCE", "ADMIN",
    name="employeerole",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("draft", "sent", "accepted", "declined", name="offerstatus").create(bind, checkfirst=True)
    postgresql.ENUM("Herr", "Frau", "Familie", name="salutation").create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            EMPLOYEE_ROLE_ENUM,
            nullable=False,
        ),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "offers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("salutation", SALUTATION_ENUM, nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("street", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("zip_code", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("city", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("email", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("offer_date", sa.Date(), nullable=True),
        sa.Column("arrival_date", sa.Date(), nullable=True),
        sa.Column("departure_date", sa.Date(), nullable=True),
        sa.Column("room_category", sa.String(length=100), nullable=False, server_default=""),
        sa.Column("custom_room_category", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("adults", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("children_ages", postgresql.ARRAY(sa.Integer()), nullable=False, server_default="{}"),
        sa.Column("price_per_night", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("total_price", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("employee_name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", OFFER_STATUS_ENUM, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "daily_briefings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.Date(), nullable=False, unique=True),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_daily_briefings_date", "daily_briefings", ["date"], unique=True)

    op.create_table(
        "staff_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "rooms",
        sa.Column("number", sa.String(length=10), primary_key=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("floor", sa.String(length=20), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("rooms")
    op.drop_table("staff_members")
    op.drop_index("ix_daily_briefings_date", table_name="daily_briefings")
    op.drop_table("daily_briefings")
    op.drop_table("offers")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    postgresql.ENUM(name="salutation").drop(bind, checkfirst=True)
    postgresql.ENUM(name="offerstatus").drop(bind, checkfirst=True)
