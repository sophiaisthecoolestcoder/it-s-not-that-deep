from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.employee import EmployeeRole


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=10, max_length=256)
    role: EmployeeRole
    employee_id: Optional[int] = None


class UserRead(BaseModel):
    id: int
    username: str
    role: EmployeeRole
    employee_id: Optional[int]
    is_active: bool
    must_change_password: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=10, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
