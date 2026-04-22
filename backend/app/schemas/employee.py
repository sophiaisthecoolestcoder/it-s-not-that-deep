from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.employee import EmployeeRole


# Email is stored as plain `str` (not EmailStr) so that response validation never
# rejects legacy/internal addresses — Pydantic v2's EmailStr uses email-validator
# which refuses RFC 2606 reserved TLDs like `.local`. The DB already has a
# uniqueness constraint and the frontend does light format checking on input.


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    role: EmployeeRole
    department: Optional[str] = None
    position: Optional[str] = None
    employment_started_on: Optional[date] = None
    employment_ended_on: Optional[date] = None
    active: bool = True
    notes: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeRead(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
    department: Optional[str] = None
    position: Optional[str] = None
    employment_started_on: Optional[date] = None
    employment_ended_on: Optional[date] = None
    active: Optional[bool] = None
    notes: Optional[str] = None
