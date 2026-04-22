"""Public, unauthenticated endpoints consumed by the marketing website.

Every endpoint in this router is:
  - Unauthenticated (anonymous visitors hit it directly)
  - Rate-limited by IP (120/min by default) to deter scraping
  - Read-only — never mutate data from here
  - Explicitly opt-in — data is only exposed if an admin has flipped a
    `public` flag on the underlying row

The site scaffold lives in `site/`; see `docs/site.md` for deployment.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.calendar import CalendarEvent
from app.schemas.calendar import EventOccurrence
from app.security import public_ip_limiter
from app.services.calendar_expand import expand_events


router = APIRouter(prefix="/public", tags=["Public"])


def _rate_limit(request: Request) -> None:
    """IP-keyed rate limit. Trusts X-Forwarded-For first hop if behind a proxy."""
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    public_ip_limiter.check(ip)


# ── Events ───────────────────────────────────────────────────────────────────

@router.get("/events", response_model=List[EventOccurrence])
def list_public_events(
    upcoming_days: int = Query(default=90, ge=1, le=366),
    event_type: Optional[str] = Query(default=None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Return upcoming events the admin has marked as `public=True`.

    Expanded through the same recurrence engine used internally, so a single
    weekly public yoga class expands to its occurrences in the window.
    """
    _rate_limit(request)

    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=upcoming_days)

    query = (
        db.query(CalendarEvent)
        .options(
            selectinload(CalendarEvent.participants),
            selectinload(CalendarEvent.exceptions),
        )
        .filter(CalendarEvent.public.is_(True))
        .filter(
            or_(
                and_(
                    CalendarEvent.recurrence_rule.is_(None),
                    CalendarEvent.starts_at <= horizon,
                    or_(
                        CalendarEvent.ends_at.is_(None),
                        CalendarEvent.ends_at >= now,
                    ),
                ),
                and_(
                    CalendarEvent.recurrence_rule.isnot(None),
                    CalendarEvent.starts_at <= horizon,
                    or_(
                        CalendarEvent.recurrence_end_at.is_(None),
                        CalendarEvent.recurrence_end_at >= now,
                    ),
                ),
            )
        )
    )
    if event_type is not None:
        # Match lowercase value for convenience; invalid values simply return []
        query = query.filter(CalendarEvent.event_type == event_type.upper())

    events = query.all()
    return expand_events(events, now, horizon)


# ── Health ───────────────────────────────────────────────────────────────────

@router.get("/health")
def public_health(request: Request):
    """Lightweight endpoint so the site can verify the API is reachable."""
    _rate_limit(request)
    return {"status": "ok"}
