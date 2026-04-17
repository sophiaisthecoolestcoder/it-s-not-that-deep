from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.guest import Guest
from app.models.employee import EmployeeRole
from app.models.user import User
from app.schemas.guest import GuestCreate, GuestRead, GuestUpdate
from app.auth import require_roles, get_current_user

router = APIRouter(prefix="/guests", tags=["Guests"])

_read_access = get_current_user
_write_access = require_roles(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.RECEPTIONIST,
    EmployeeRole.CONCIERGE,
)


@router.get("/", response_model=list[GuestRead])
def list_guests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user: User = Depends(_read_access)):
    return db.query(Guest).offset(skip).limit(limit).all()


@router.get("/{guest_id}", response_model=GuestRead)
def get_guest(guest_id: int, db: Session = Depends(get_db), user: User = Depends(_read_access)):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest


@router.post("/", response_model=GuestRead, status_code=201)
def create_guest(payload: GuestCreate, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    guest = Guest(**payload.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest


@router.patch("/{guest_id}", response_model=GuestRead)
def update_guest(guest_id: int, payload: GuestUpdate, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(guest, field, value)
    db.commit()
    db.refresh(guest)
    return guest


@router.delete("/{guest_id}", status_code=204)
def delete_guest(guest_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    db.delete(guest)
    db.commit()
