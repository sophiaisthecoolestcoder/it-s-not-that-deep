"""create calendar events, participants, and exceptions tables

Revision ID: 2026e2f3a4b5
Revises: 2026d1a2b3c4
Create Date: 2026-04-22 10:15:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "2026e2f3a4b5"
down_revision: Union[str, None] = "2026d1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum names match the Python enum's `.name` attribute (uppercase), consistent
# with the project's existing EmployeeRole/OfferStatus convention where
# SQLAlchemy stores `.name` in the DB by default.
EVENT_TYPE_NAMES = (
    "SHIFT", "MEETING", "MAINTENANCE", "HOLIDAY",
    "TRAINING", "PERSONAL", "REMINDER", "OTHER",
)
AUDIENCE_SCOPE_NAMES = ("GLOBAL", "ROLE", "USERS")
PARTICIPANT_ROLE_NAMES = ("ORGANIZER", "ATTENDEE", "OBSERVER")
PARTICIPANT_STATUS_NAMES = ("NEEDS_ACTION", "ACCEPTED", "DECLINED", "TENTATIVE")
EXCEPTION_TYPE_NAMES = ("CANCELLED", "MODIFIED")


def upgrade() -> None:
    bind = op.get_bind()

    event_type_enum = postgresql.ENUM(*EVENT_TYPE_NAMES, name="calendareventtype")
    event_type_enum.create(bind, checkfirst=True)

    audience_scope_enum = postgresql.ENUM(*AUDIENCE_SCOPE_NAMES, name="calendaraudiencescope")
    audience_scope_enum.create(bind, checkfirst=True)

    participant_role_enum = postgresql.ENUM(*PARTICIPANT_ROLE_NAMES, name="calendarparticipantrole")
    participant_role_enum.create(bind, checkfirst=True)

    participant_status_enum = postgresql.ENUM(*PARTICIPANT_STATUS_NAMES, name="calendarparticipantstatus")
    participant_status_enum.create(bind, checkfirst=True)

    exception_type_enum = postgresql.ENUM(*EXCEPTION_TYPE_NAMES, name="calendarexceptiontype")
    exception_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "event_type",
            postgresql.ENUM(*EVENT_TYPE_NAMES, name="calendareventtype", create_type=False),
            nullable=False,
            server_default="OTHER",
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_all_day", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("recurrence_rule", sa.Text(), nullable=True),
        sa.Column("recurrence_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "audience_scope",
            postgresql.ENUM(*AUDIENCE_SCOPE_NAMES, name="calendaraudiencescope", create_type=False),
            nullable=False,
            server_default="USERS",
        ),
        sa.Column(
            "visible_to_roles",
            postgresql.ARRAY(
                postgresql.ENUM(
                    "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "SPA_THERAPIST",
                    "CHEF", "WAITER", "CONCIERGE", "MAINTENANCE", "ADMIN",
                    name="employeerole",
                    create_type=False,
                )
            ),
            nullable=True,
        ),
        sa.Column("location", sa.String(length=200), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_calendar_events_id", "calendar_events", ["id"])
    op.create_index("ix_calendar_events_starts_at", "calendar_events", ["starts_at"])
    op.create_index("ix_calendar_events_type_starts_at", "calendar_events", ["event_type", "starts_at"])
    op.create_index("ix_calendar_events_created_by", "calendar_events", ["created_by_user_id"])

    op.create_table(
        "calendar_event_participants",
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("calendar_events.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "role",
            postgresql.ENUM(*PARTICIPANT_ROLE_NAMES, name="calendarparticipantrole", create_type=False),
            nullable=False,
            server_default="ATTENDEE",
        ),
        sa.Column(
            "response_status",
            postgresql.ENUM(*PARTICIPANT_STATUS_NAMES, name="calendarparticipantstatus", create_type=False),
            nullable=False,
            server_default="NEEDS_ACTION",
        ),
    )
    op.create_index("ix_calendar_participants_user", "calendar_event_participants", ["user_id"])

    op.create_table(
        "calendar_event_exceptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_id", sa.Integer(), sa.ForeignKey("calendar_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("occurrence_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "exception_type",
            postgresql.ENUM(*EXCEPTION_TYPE_NAMES, name="calendarexceptiontype", create_type=False),
            nullable=False,
        ),
        sa.Column("override_starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("override_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("override_title", sa.String(length=200), nullable=True),
        sa.Column("override_description", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("event_id", "occurrence_at", name="uq_calendar_exceptions_event_occurrence"),
    )
    op.create_index("ix_calendar_event_exceptions_id", "calendar_event_exceptions", ["id"])


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_calendar_event_exceptions_id", table_name="calendar_event_exceptions")
    op.drop_table("calendar_event_exceptions")

    op.drop_index("ix_calendar_participants_user", table_name="calendar_event_participants")
    op.drop_table("calendar_event_participants")

    op.drop_index("ix_calendar_events_created_by", table_name="calendar_events")
    op.drop_index("ix_calendar_events_type_starts_at", table_name="calendar_events")
    op.drop_index("ix_calendar_events_starts_at", table_name="calendar_events")
    op.drop_index("ix_calendar_events_id", table_name="calendar_events")
    op.drop_table("calendar_events")

    postgresql.ENUM(name="calendarexceptiontype").drop(bind, checkfirst=True)
    postgresql.ENUM(name="calendarparticipantstatus").drop(bind, checkfirst=True)
    postgresql.ENUM(name="calendarparticipantrole").drop(bind, checkfirst=True)
    postgresql.ENUM(name="calendaraudiencescope").drop(bind, checkfirst=True)
    postgresql.ENUM(name="calendareventtype").drop(bind, checkfirst=True)
