"""Calendar events router.

Endpoints follow the house pattern (require_roles + get_db) and lean on the
expand service for recurrence. Access to individual events is filtered by
audience scope unless the caller is an admin.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.calendar import (
    CalendarAudienceScope,
    CalendarEvent,
    CalendarEventException,
    CalendarEventParticipant,
    CalendarEventType,
    CalendarExceptionType,
)
from app.models.employee import EmployeeRole
from app.models.user import User
from app.schemas.calendar import (
    EventCreate,
    EventOccurrence,
    EventRead,
    EventUpdate,
    ExceptionCreate,
    ExceptionRead,
)
from app.services.calendar_expand import expand_events


router = APIRouter(prefix="/calendar", tags=["Calendar"])

MAX_RANGE_DAYS = 366


def _is_admin(user: User) -> bool:
    return user.role == EmployeeRole.ADMIN


def _can_manage_event(user: User, event: CalendarEvent) -> bool:
    if _is_admin(user):
        return True
    if user.role == EmployeeRole.MANAGER:
        return True
    return event.created_by_user_id == user.id


def _event_access_filter(user: User):
    """SQL filter restricting events to those the caller is allowed to see."""
    if _is_admin(user):
        return None
    # Postgres array overlap: visible_to_roles && ARRAY[user.role]
    role_match = CalendarEvent.visible_to_roles.any(user.role.name)
    user_match = CalendarEvent.id.in_(
        _participant_event_ids_subq(user.id)
    )
    return or_(
        CalendarEvent.audience_scope == CalendarAudienceScope.GLOBAL,
        and_(CalendarEvent.audience_scope == CalendarAudienceScope.ROLE, role_match),
        and_(CalendarEvent.audience_scope == CalendarAudienceScope.USERS, user_match),
        CalendarEvent.created_by_user_id == user.id,
    )


def _participant_event_ids_subq(user_id: int):
    from sqlalchemy import select

    return select(CalendarEventParticipant.event_id).where(
        CalendarEventParticipant.user_id == user_id
    )


def _ensure_users_exist(db: Session, user_ids: List[int]) -> None:
    if not user_ids:
        return
    unique_ids = list(set(user_ids))
    found = {u.id for u in db.query(User).filter(User.id.in_(unique_ids)).all()}
    missing = [uid for uid in unique_ids if uid not in found]
    if missing:
        raise HTTPException(status_code=400, detail=f"Unknown participant user id(s): {missing}")


def _require_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


# ── Range query (expanded occurrences) ───────────────────────────────────────

@router.get("/events", response_model=List[EventOccurrence])
def list_events(
    range_from: datetime = Query(..., alias="from"),
    range_to: datetime = Query(..., alias="to"),
    event_type: Optional[CalendarEventType] = Query(default=None),
    user_id: Optional[int] = Query(default=None, description="Admin-only: events visible to a specific user"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    range_from = _require_aware(range_from)
    range_to = _require_aware(range_to)
    if range_to <= range_from:
        raise HTTPException(status_code=400, detail="'to' must be after 'from'.")
    if range_to - range_from > timedelta(days=MAX_RANGE_DAYS):
        raise HTTPException(status_code=400, detail=f"Range cannot exceed {MAX_RANGE_DAYS} days.")

    query = db.query(CalendarEvent).options(
        selectinload(CalendarEvent.participants),
        selectinload(CalendarEvent.exceptions),
    )

    # Prune to events that could plausibly have an occurrence in the window. For
    # recurring events we can't know without expanding, so we keep any series
    # whose `starts_at` is before range_to (and `recurrence_end_at` is null or
    # after range_from).
    query = query.filter(
        or_(
            # non-recurring: starts_at in window OR ends_at in window
            and_(
                CalendarEvent.recurrence_rule.is_(None),
                CalendarEvent.starts_at <= range_to,
                or_(
                    CalendarEvent.ends_at.is_(None),
                    CalendarEvent.ends_at >= range_from,
                ),
            ),
            # recurring: series might overlap
            and_(
                CalendarEvent.recurrence_rule.isnot(None),
                CalendarEvent.starts_at <= range_to,
                or_(
                    CalendarEvent.recurrence_end_at.is_(None),
                    CalendarEvent.recurrence_end_at >= range_from,
                ),
            ),
        )
    )
    if event_type is not None:
        query = query.filter(CalendarEvent.event_type == event_type)

    target = user
    if user_id is not None:
        if not _is_admin(user):
            raise HTTPException(status_code=403, detail="Only admins may query events for another user.")
        target = db.query(User).filter(User.id == user_id).first()
        if target is None:
            raise HTTPException(status_code=404, detail="User not found.")

    access = _event_access_filter(target)
    if access is not None:
        query = query.filter(access)

    events = query.all()
    return expand_events(events, range_from, range_to)


# ── Single event CRUD ────────────────────────────────────────────────────────

@router.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = (
        db.query(CalendarEvent)
        .options(
            selectinload(CalendarEvent.participants),
            selectinload(CalendarEvent.exceptions),
        )
        .filter(CalendarEvent.id == event_id)
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if not _is_admin(user):
        if event.audience_scope == CalendarAudienceScope.ROLE:
            allowed = set(event.visible_to_roles or [])
            if user.role.name not in allowed and user.role not in allowed:
                if event.created_by_user_id != user.id:
                    raise HTTPException(status_code=403, detail="Not authorized to view this event.")
        elif event.audience_scope == CalendarAudienceScope.USERS:
            participant_ids = {p.user_id for p in event.participants}
            if user.id not in participant_ids and event.created_by_user_id != user.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this event.")
    return event


@router.post("/events", response_model=EventRead, status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"participant_user_ids"})
    participant_user_ids = list(payload.participant_user_ids or [])
    _ensure_users_exist(db, participant_user_ids)

    event = CalendarEvent(**data, created_by_user_id=user.id)
    db.add(event)
    db.flush()

    # Default audience_scope='users' with the creator as the only participant
    # when none is specified. This matches the "personal reminder" UX.
    if event.audience_scope == CalendarAudienceScope.USERS and not participant_user_ids:
        participant_user_ids = [user.id]

    for uid in set(participant_user_ids):
        db.add(CalendarEventParticipant(event_id=event.id, user_id=uid))

    db.commit()
    db.refresh(event)
    return event


@router.patch("/events/{event_id}", response_model=EventRead)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if not _can_manage_event(user, event):
        raise HTTPException(status_code=403, detail="Not authorized to edit this event.")

    data = payload.model_dump(exclude_unset=True)
    participant_ids = data.pop("participant_user_ids", None)
    for field, value in data.items():
        setattr(event, field, value)

    if participant_ids is not None:
        _ensure_users_exist(db, participant_ids)
        db.query(CalendarEventParticipant).filter(CalendarEventParticipant.event_id == event.id).delete()
        for uid in set(participant_ids):
            db.add(CalendarEventParticipant(event_id=event.id, user_id=uid))

    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if not _can_manage_event(user, event):
        raise HTTPException(status_code=403, detail="Not authorized to delete this event.")
    db.delete(event)
    db.commit()


# ── Exceptions (per-occurrence overrides) ────────────────────────────────────

@router.post("/events/{event_id}/exceptions", response_model=ExceptionRead, status_code=201)
def create_exception(
    event_id: int,
    payload: ExceptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    if not _can_manage_event(user, event):
        raise HTTPException(status_code=403, detail="Not authorized to modify this event.")
    if not event.recurrence_rule:
        raise HTTPException(status_code=400, detail="Exceptions only apply to recurring events.")

    existing = (
        db.query(CalendarEventException)
        .filter(
            CalendarEventException.event_id == event.id,
            CalendarEventException.occurrence_at == payload.occurrence_at,
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="An exception already exists for that occurrence.")

    exc = CalendarEventException(event_id=event.id, **payload.model_dump())
    db.add(exc)
    db.commit()
    db.refresh(exc)
    return exc


@router.delete("/events/{event_id}/exceptions/{exception_id}", status_code=204)
def delete_exception(
    event_id: int,
    exception_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exc = (
        db.query(CalendarEventException)
        .filter(
            CalendarEventException.id == exception_id,
            CalendarEventException.event_id == event_id,
        )
        .first()
    )
    if exc is None:
        raise HTTPException(status_code=404, detail="Exception not found.")
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if event is None or not _can_manage_event(user, event):
        raise HTTPException(status_code=403, detail="Not authorized.")
    db.delete(exc)
    db.commit()


# Silence unused-import flake on CalendarExceptionType when linter is paranoid.
_ = CalendarExceptionType
