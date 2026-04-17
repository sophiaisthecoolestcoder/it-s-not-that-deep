from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.employee import EmployeeRole


class UserCreate(BaseModel):
    username: str
    password: str
    role: EmployeeRole
    employee_id: Optional[int] = None


class UserRead(BaseModel):
    id: int
    username: str
    role: EmployeeRole
    employee_id: Optional[int]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
