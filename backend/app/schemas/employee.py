from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.employee import EmployeeRole


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: EmployeeRole


class EmployeeRead(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    role: EmployeeRole
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[EmployeeRole] = None
