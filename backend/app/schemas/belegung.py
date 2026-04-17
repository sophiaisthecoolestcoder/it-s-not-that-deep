from datetime import date, datetime
from typing import Any, Dict, List
from pydantic import BaseModel


class DailyBriefingWrite(BaseModel):
    date: date
    data: Dict[str, Any]


class DailyBriefingRead(BaseModel):
    id: int
    date: date
    data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DaysListItem(BaseModel):
    date: date
    updated_at: datetime

    model_config = {"from_attributes": True}


class StaffMemberCreate(BaseModel):
    name: str


class StaffMemberRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class RoomRead(BaseModel):
    number: str
    category: str
    floor: str

    model_config = {"from_attributes": True}
