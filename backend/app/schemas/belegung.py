import json
from datetime import date, datetime
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator


MAX_JSON_BYTES = 512 * 1024  # 512 KiB
MAX_JSON_DEPTH = 12


def _depth(obj: Any, lvl: int = 0) -> int:
    if lvl > MAX_JSON_DEPTH:
        return lvl
    if isinstance(obj, dict):
        return max((_depth(v, lvl + 1) for v in obj.values()), default=lvl)
    if isinstance(obj, list):
        return max((_depth(v, lvl + 1) for v in obj), default=lvl)
    return lvl


class DailyBriefingWrite(BaseModel):
    date: date
    data: Dict[str, Any]

    @field_validator("data")
    @classmethod
    def _size_and_depth(cls, v):
        encoded = json.dumps(v, default=str)
        if len(encoded) > MAX_JSON_BYTES:
            raise ValueError(f"Daten zu groß ({len(encoded)} Bytes, max {MAX_JSON_BYTES})")
        if _depth(v) > MAX_JSON_DEPTH:
            raise ValueError(f"Daten zu tief verschachtelt (max {MAX_JSON_DEPTH} Ebenen)")
        return v


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
    name: str = Field(min_length=1, max_length=200)


class StaffMemberRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class RoomRead(BaseModel):
    number: str
    category: str
    floor: str

    model_config = {"from_attributes": True}
