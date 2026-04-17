from sqlalchemy import Column, Integer, Date, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class DailyBriefing(Base):
    """One full Belegungsliste / daily briefing, keyed by date.

    The nested contents (arrivals, stayers, ops sections, newspapers, etc.)
    are stored as a single JSONB blob to preserve the rich legacy shape
    without requiring dozens of join tables.
    """
    __tablename__ = "daily_briefings"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StaffMember(Base):
    """Selectable names for the Belegungsliste "Arr" column."""
    __tablename__ = "staff_members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Room(Base):
    """Physical room registry: room number -> category abbreviation + floor."""
    __tablename__ = "rooms"

    number = Column(String(10), primary_key=True)
    category = Column(String(20), nullable=False)
    floor = Column(String(20), nullable=False)
