"""Recurrence expansion for calendar events.

Given a [range_start, range_end] window, materialise concrete occurrences from a
collection of CalendarEvent rows — applying any per-occurrence exceptions. The
event itself keeps its RRULE string; this module is the only place that deals
with expansion, so changing expansion behaviour never touches the ORM layer.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable, List

from dateutil.rrule import rrulestr

from app.models.calendar import (
    CalendarEvent,
    CalendarEventException,
    CalendarExceptionType,
)
from app.schemas.calendar import (
    EventOccurrence,
    ParticipantRead,
)


def _as_aware(dt: datetime) -> datetime:
    """rrule needs a tz-aware dtstart if the window is tz-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _participant_reads(event: CalendarEvent) -> List[ParticipantRead]:
    return [ParticipantRead.model_validate(p) for p in event.participants]


def _base_occurrence(
    event: CalendarEvent,
    starts_at: datetime,
    ends_at: datetime | None,
    original_occurrence_at: datetime | None,
    is_exception_override: bool,
    is_recurring: bool,
) -> EventOccurrence:
    return EventOccurrence(
        event_id=event.id,
        title=event.title,
        description=event.description,
        event_type=event.event_type,
        starts_at=starts_at,
        ends_at=ends_at,
        is_all_day=event.is_all_day,
        location=event.location,
        audience_scope=event.audience_scope,
        participants=_participant_reads(event),
        is_recurring=is_recurring,
        original_occurrence_at=original_occurrence_at,
        is_exception_override=is_exception_override,
    )


def _apply_exception(
    event: CalendarEvent,
    original_start: datetime,
    duration: timedelta | None,
    exc: CalendarEventException,
) -> EventOccurrence | None:
    if exc.exception_type == CalendarExceptionType.CANCELLED:
        return None
    starts_at = exc.override_starts_at or original_start
    if exc.override_ends_at is not None:
        ends_at: datetime | None = exc.override_ends_at
    elif duration is not None:
        ends_at = starts_at + duration
    else:
        ends_at = None
    occ = _base_occurrence(
        event=event,
        starts_at=starts_at,
        ends_at=ends_at,
        original_occurrence_at=original_start,
        is_exception_override=True,
        is_recurring=True,
    )
    if exc.override_title:
        occ.title = exc.override_title
    if exc.override_description:
        occ.description = exc.override_description
    return occ


def expand_event(
    event: CalendarEvent,
    range_start: datetime,
    range_end: datetime,
) -> List[EventOccurrence]:
    """Return every occurrence of `event` that overlaps [range_start, range_end]."""
    if range_end < range_start:
        return []

    range_start = _as_aware(range_start)
    range_end = _as_aware(range_end)

    event_start = _as_aware(event.starts_at)
    duration = (
        _as_aware(event.ends_at) - event_start
        if event.ends_at is not None
        else None
    )

    exceptions_by_occurrence: dict[datetime, CalendarEventException] = {
        _as_aware(exc.occurrence_at): exc for exc in event.exceptions
    }

    if not event.recurrence_rule:
        occ_end = event_start + duration if duration is not None else event_start
        if occ_end < range_start or event_start > range_end:
            return []
        return [
            _base_occurrence(
                event=event,
                starts_at=event_start,
                ends_at=_as_aware(event.ends_at) if event.ends_at is not None else None,
                original_occurrence_at=None,
                is_exception_override=False,
                is_recurring=False,
            )
        ]

    try:
        rule = rrulestr(event.recurrence_rule, dtstart=event_start)
    except (ValueError, TypeError):
        return []

    upper_bound = range_end
    if event.recurrence_end_at is not None:
        re_end = _as_aware(event.recurrence_end_at)
        if re_end < upper_bound:
            upper_bound = re_end

    results: List[EventOccurrence] = []
    for occ_start in rule.between(range_start - (duration or timedelta(0)), upper_bound, inc=True):
        occ_start = _as_aware(occ_start)
        exc = exceptions_by_occurrence.get(occ_start)
        if exc is not None:
            produced = _apply_exception(event, occ_start, duration, exc)
            if produced is not None:
                results.append(produced)
            continue
        occ_end = occ_start + duration if duration is not None else None
        if occ_end is not None and occ_end < range_start:
            continue
        if occ_start > range_end:
            continue
        results.append(
            _base_occurrence(
                event=event,
                starts_at=occ_start,
                ends_at=occ_end,
                original_occurrence_at=None,
                is_exception_override=False,
                is_recurring=True,
            )
        )
    return results


def expand_events(
    events: Iterable[CalendarEvent],
    range_start: datetime,
    range_end: datetime,
) -> List[EventOccurrence]:
    out: List[EventOccurrence] = []
    for ev in events:
        out.extend(expand_event(ev, range_start, range_end))
    out.sort(key=lambda o: o.starts_at)
    return out
