"""General-purpose calendar model.

One unified events table. `event_type` discriminates shifts, meetings, holidays,
maintenance, reminders, etc. Recurrence is stored as an RFC 5545 RRULE string on
the master row and expanded at query time. Audience scoping supports global,
role-based, and per-user events. Exceptions to a recurring series (cancel a
single occurrence or override it) live in their own table.

Design doc: docs/calendar.md
"""
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.employee import EmployeeRole


class CalendarEventType(str, enum.Enum):
    SHIFT = "shift"
    MEETING = "meeting"
    MAINTENANCE = "maintenance"
    HOLIDAY = "holiday"
    TRAINING = "training"
    PERSONAL = "personal"
    REMINDER = "reminder"
    OTHER = "other"


class CalendarAudienceScope(str, enum.Enum):
    GLOBAL = "global"
    ROLE = "role"
    USERS = "users"


class CalendarParticipantRole(str, enum.Enum):
    ORGANIZER = "organizer"
    ATTENDEE = "attendee"
    OBSERVER = "observer"


class CalendarParticipantStatus(str, enum.Enum):
    NEEDS_ACTION = "needs_action"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"


class CalendarExceptionType(str, enum.Enum):
    CANCELLED = "cancelled"
    MODIFIED = "modified"


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(
        Enum(CalendarEventType),
        nullable=False,
        server_default=CalendarEventType.OTHER.name,
    )
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    is_all_day = Column(Boolean, nullable=False, server_default="false")

    recurrence_rule = Column(Text, nullable=True)
    recurrence_end_at = Column(DateTime(timezone=True), nullable=True)

    audience_scope = Column(
        Enum(CalendarAudienceScope),
        nullable=False,
        server_default=CalendarAudienceScope.USERS.name,
    )
    visible_to_roles = Column(ARRAY(Enum(EmployeeRole, name="employeerole", create_type=False)), nullable=True)

    location = Column(String(200), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    participants = relationship(
        "CalendarEventParticipant",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    exceptions = relationship(
        "CalendarEventException",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_calendar_events_starts_at", "starts_at"),
        Index("ix_calendar_events_type_starts_at", "event_type", "starts_at"),
        Index("ix_calendar_events_created_by", "created_by_user_id"),
    )


class CalendarEventParticipant(Base):
    __tablename__ = "calendar_event_participants"

    event_id = Column(Integer, ForeignKey("calendar_events.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(
        Enum(CalendarParticipantRole),
        nullable=False,
        server_default=CalendarParticipantRole.ATTENDEE.name,
    )
    response_status = Column(
        Enum(CalendarParticipantStatus),
        nullable=False,
        server_default=CalendarParticipantStatus.NEEDS_ACTION.name,
    )

    event = relationship("CalendarEvent", back_populates="participants")

    __table_args__ = (
        Index("ix_calendar_participants_user", "user_id"),
    )


class CalendarEventException(Base):
    __tablename__ = "calendar_event_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("calendar_events.id", ondelete="CASCADE"), nullable=False)
    occurrence_at = Column(DateTime(timezone=True), nullable=False)
    exception_type = Column(Enum(CalendarExceptionType), nullable=False)
    override_starts_at = Column(DateTime(timezone=True), nullable=True)
    override_ends_at = Column(DateTime(timezone=True), nullable=True)
    override_title = Column(String(200), nullable=True)
    override_description = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    event = relationship("CalendarEvent", back_populates="exceptions")

    __table_args__ = (
        UniqueConstraint("event_id", "occurrence_at", name="uq_calendar_exceptions_event_occurrence"),
    )
