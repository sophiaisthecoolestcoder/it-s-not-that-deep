from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.offer import OfferStatus, Salutation


class OfferBase(BaseModel):
    salutation: Salutation = Salutation.HERR
    first_name: str = ""
    last_name: str = ""
    street: str = ""
    zip_code: str = ""
    city: str = ""
    email: str = ""

    offer_date: Optional[date] = None
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None

    room_category: str = ""
    custom_room_category: str = ""
    adults: int = 2
    children_ages: List[int] = []
    price_per_night: str = ""
    total_price: str = ""

    employee_name: str = ""
    notes: str = ""
    status: OfferStatus = OfferStatus.DRAFT


class OfferCreate(OfferBase):
    pass


class OfferUpdate(BaseModel):
    salutation: Optional[Salutation] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    street: Optional[str] = None
    zip_code: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    offer_date: Optional[date] = None
    arrival_date: Optional[date] = None
    departure_date: Optional[date] = None
    room_category: Optional[str] = None
    custom_room_category: Optional[str] = None
    adults: Optional[int] = None
    children_ages: Optional[List[int]] = None
    price_per_night: Optional[str] = None
    total_price: Optional[str] = None
    employee_name: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[OfferStatus] = None


class OfferRead(OfferBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
