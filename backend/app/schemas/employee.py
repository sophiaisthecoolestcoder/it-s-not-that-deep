from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.employee import EmployeeRole


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
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
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
    department: Optional[str] = None
    position: Optional[str] = None
    employment_started_on: Optional[date] = None
    employment_ended_on: Optional[date] = None
    active: Optional[bool] = None
    notes: Optional[str] = None
