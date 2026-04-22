"""Pydantic schemas for the calendar domain."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.calendar import (
    CalendarAudienceScope,
    CalendarEventType,
    CalendarExceptionType,
    CalendarParticipantRole,
    CalendarParticipantStatus,
)
from app.models.employee import EmployeeRole


# ── Participants ─────────────────────────────────────────────────────────────

class ParticipantBase(BaseModel):
    user_id: int
    role: CalendarParticipantRole = CalendarParticipantRole.ATTENDEE
    response_status: CalendarParticipantStatus = CalendarParticipantStatus.NEEDS_ACTION


class ParticipantRead(ParticipantBase):
    model_config = {"from_attributes": True}


# ── Exceptions ───────────────────────────────────────────────────────────────

class ExceptionBase(BaseModel):
    occurrence_at: datetime
    exception_type: CalendarExceptionType
    override_starts_at: Optional[datetime] = None
    override_ends_at: Optional[datetime] = None
    override_title: Optional[str] = Field(default=None, max_length=200)
    override_description: Optional[str] = None
    reason: Optional[str] = None

    @model_validator(mode="after")
    def _check_modified_has_overrides(self):
        if self.exception_type == CalendarExceptionType.MODIFIED:
            if not any([
                self.override_starts_at,
                self.override_ends_at,
                self.override_title,
                self.override_description,
            ]):
                raise ValueError("A modified exception must set at least one override field.")
        return self


class ExceptionCreate(ExceptionBase):
    pass


class ExceptionRead(ExceptionBase):
    id: int
    event_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Events ───────────────────────────────────────────────────────────────────

class EventBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: CalendarEventType = CalendarEventType.OTHER
    starts_at: datetime
    ends_at: Optional[datetime] = None
    is_all_day: bool = False
    recurrence_rule: Optional[str] = Field(default=None, max_length=500)
    recurrence_end_at: Optional[datetime] = None
    audience_scope: CalendarAudienceScope = CalendarAudienceScope.USERS
    visible_to_roles: Optional[List[EmployeeRole]] = None
    location: Optional[str] = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def _check_time_and_scope(self):
        if self.ends_at is not None and self.ends_at < self.starts_at:
            raise ValueError("ends_at must be on or after starts_at.")
        if self.audience_scope == CalendarAudienceScope.ROLE:
            if not self.visible_to_roles:
                raise ValueError("audience_scope='role' requires at least one role in visible_to_roles.")
        if self.recurrence_rule and not self.recurrence_rule.strip().upper().startswith(("FREQ=", "RRULE:")):
            raise ValueError("recurrence_rule must be an RFC 5545 RRULE string (e.g. 'FREQ=WEEKLY;BYDAY=MO').")
        return self

    @field_validator("recurrence_rule")
    @classmethod
    def _normalize_rrule(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if v.upper().startswith("RRULE:"):
            v = v[len("RRULE:"):]
        return v or None


class EventCreate(EventBase):
    participant_user_ids: List[int] = Field(default_factory=list)


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    event_type: Optional[CalendarEventType] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_all_day: Optional[bool] = None
    recurrence_rule: Optional[str] = Field(default=None, max_length=500)
    recurrence_end_at: Optional[datetime] = None
    audience_scope: Optional[CalendarAudienceScope] = None
    visible_to_roles: Optional[List[EmployeeRole]] = None
    location: Optional[str] = Field(default=None, max_length=200)
    participant_user_ids: Optional[List[int]] = None


class EventRead(EventBase):
    id: int
    created_by_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantRead] = Field(default_factory=list)
    exceptions: List[ExceptionRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ── Expanded occurrences (returned by range query) ───────────────────────────

class EventOccurrence(BaseModel):
    """One concrete occurrence of an event, with any exception overrides applied."""

    event_id: int
    title: str
    description: Optional[str] = None
    event_type: CalendarEventType
    starts_at: datetime
    ends_at: Optional[datetime] = None
    is_all_day: bool
    location: Optional[str] = None
    audience_scope: CalendarAudienceScope
    participants: List[ParticipantRead] = Field(default_factory=list)
    is_recurring: bool = False
    original_occurrence_at: Optional[datetime] = None
    is_exception_override: bool = False
