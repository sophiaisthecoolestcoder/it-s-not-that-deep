from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.offer import OfferStatus, Salutation


def _validate_children(values: Optional[List[int]]) -> Optional[List[int]]:
    if values is None:
        return values
    if len(values) > 10:
        raise ValueError("Maximal 10 Kinder pro Angebot")
    for age in values:
        if age < 0 or age > 17:
            raise ValueError(f"Ungültiges Kindesalter: {age}")
    return values


def _validate_non_negative_price(raw: str) -> str:
    if not raw:
        return raw
    cleaned = raw.replace(",", ".").replace("€", "").replace(" ", "")
    try:
        if float(cleaned) < 0:
            raise ValueError("Preis darf nicht negativ sein")
    except ValueError as exc:
        # not parseable as a number — let it through (free-text surcharges like "nach Absprache")
        if "negativ" in str(exc):
            raise
    return raw


class OfferBase(BaseModel):
    salutation: Salutation = Salutation.HERR
    first_name: str = Field(default="", max_length=100)
    last_name: str = Field(default="", max_length=100)
    street: str = Field(default="", max_length=255)
    zip_code: str = Field(default="", max_length=20)
    city: str = Field(default="", max_length=100)
    email: str = Field(default="", max_length=255)

    offer_date: Optional[date] = None
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None

    room_category: str = Field(default="", max_length=100)
    custom_room_category: str = Field(default="", max_length=255)
    adults: int = Field(default=2, ge=1, le=20)
    children_ages: List[int] = []
    price_per_night: str = Field(default="", max_length=50)
    total_price: str = Field(default="", max_length=50)

    employee_name: str = Field(default="", max_length=200)
    notes: str = Field(default="", max_length=5000)
    status: OfferStatus = OfferStatus.DRAFT

    @field_validator("children_ages")
    @classmethod
    def _cv(cls, v):
        return _validate_children(v)

    @field_validator("price_per_night", "total_price")
    @classmethod
    def _pv(cls, v):
        return _validate_non_negative_price(v)

    @model_validator(mode="after")
    def _dates_consistent(self):
        if self.arrival_date and self.departure_date and self.arrival_date > self.departure_date:
            raise ValueError("Anreise muss vor oder gleich Abreise sein")
        return self


class OfferCreate(OfferBase):
    pass


class OfferUpdate(BaseModel):
    salutation: Optional[Salutation] = None
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    street: Optional[str] = Field(default=None, max_length=255)
    zip_code: Optional[str] = Field(default=None, max_length=20)
    city: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=255)
    offer_date: Optional[date] = None
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None
    room_category: Optional[str] = Field(default=None, max_length=100)
    custom_room_category: Optional[str] = Field(default=None, max_length=255)
    adults: Optional[int] = Field(default=None, ge=1, le=20)
    children_ages: Optional[List[int]] = None
    price_per_night: Optional[str] = Field(default=None, max_length=50)
    total_price: Optional[str] = Field(default=None, max_length=50)
    employee_name: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[OfferStatus] = None

    @field_validator("children_ages")
    @classmethod
    def _cv(cls, v):
        return _validate_children(v)

    @field_validator("price_per_night", "total_price")
    @classmethod
    def _pv(cls, v):
        if v is None:
            return v
        return _validate_non_negative_price(v)

    @model_validator(mode="after")
    def _dates_consistent(self):
        if self.arrival_date and self.departure_date and self.arrival_date > self.departure_date:
            raise ValueError("Anreise muss vor oder gleich Abreise sein")
        return self


class OfferRead(OfferBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
