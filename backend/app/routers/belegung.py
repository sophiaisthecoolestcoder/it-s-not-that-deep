from datetime import date as _date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.belegung import DailyBriefing, StaffMember, Room
from app.models.user import User
from app.schemas.belegung import (
    DailyBriefingWrite,
    DailyBriefingRead,
    DaysListItem,
    StaffMemberCreate,
    StaffMemberRead,
    RoomRead,
)
from app.auth import require_roles, get_current_user
from app.models.employee import EmployeeRole

router = APIRouter(prefix="/belegung", tags=["Belegung"])


# Read = anyone logged in. Write = admin/manager/receptionist/concierge.
_read_access = get_current_user
_write_access = require_roles(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.RECEPTIONIST,
    EmployeeRole.CONCIERGE,
)


# ── Daily briefings (one per date) ───────────────────────────────────────────

@router.get("/days", response_model=list[DaysListItem])
def list_days(db: Session = Depends(get_db), user: User = Depends(_read_access)):
    return db.query(DailyBriefing).order_by(DailyBriefing.date.desc()).all()


@router.get("/days/{day}", response_model=DailyBriefingRead)
def get_day(day: _date, db: Session = Depends(get_db), user: User = Depends(_read_access)):
    row = db.query(DailyBriefing).filter(DailyBriefing.date == day).first()
    if not row:
        raise HTTPException(status_code=404, detail="Tag nicht gespeichert")
    return row


@router.put("/days/{day}", response_model=DailyBriefingRead)
def upsert_day(
    day: _date,
    payload: DailyBriefingWrite,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    if payload.date != day:
        raise HTTPException(status_code=400, detail="Datum im Pfad und Body müssen übereinstimmen")
    row = db.query(DailyBriefing).filter(DailyBriefing.date == day).first()
    if row:
        row.data = payload.data
    else:
        row = DailyBriefing(date=day, data=payload.data)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/days/{day}", status_code=204)
def delete_day(day: _date, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    row = db.query(DailyBriefing).filter(DailyBriefing.date == day).first()
    if not row:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    db.delete(row)
    db.commit()


# ── Staff members ────────────────────────────────────────────────────────────

@router.get("/staff", response_model=list[StaffMemberRead])
def list_staff(db: Session = Depends(get_db), user: User = Depends(_read_access)):
    return db.query(StaffMember).order_by(StaffMember.name.asc()).all()


@router.post("/staff", response_model=StaffMemberRead, status_code=201)
def add_staff(
    payload: StaffMemberCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name darf nicht leer sein")
    if db.query(StaffMember).filter(StaffMember.name == name).first():
        raise HTTPException(status_code=400, detail="Mitarbeiter existiert bereits")
    member = StaffMember(name=name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/staff/{staff_id}", status_code=204)
def remove_staff(staff_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    member = db.query(StaffMember).filter(StaffMember.id == staff_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Mitarbeiter nicht gefunden")
    db.delete(member)
    db.commit()


# ── Rooms ────────────────────────────────────────────────────────────────────

@router.get("/rooms", response_model=list[RoomRead])
def list_rooms(db: Session = Depends(get_db), user: User = Depends(_read_access)):
    return db.query(Room).order_by(Room.number.asc()).all()
