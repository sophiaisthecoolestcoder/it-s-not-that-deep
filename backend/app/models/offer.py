from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ARRAY, Date
from sqlalchemy.sql import func
import enum
from app.database import Base


class OfferStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Salutation(str, enum.Enum):
    HERR = "Herr"
    FRAU = "Frau"
    FAMILIE = "Familie"


class Offer(Base):
    __tablename__ = "offers"

    _enum_values = lambda enum_cls: [item.value for item in enum_cls]

    id = Column(Integer, primary_key=True, index=True)

    # Client
    salutation = Column(Enum(Salutation, name="salutation", values_callable=_enum_values), nullable=False)
    first_name = Column(String(100), nullable=False, server_default="")
    last_name = Column(String(100), nullable=False, server_default="")
    street = Column(String(255), nullable=False, server_default="")
    zip_code = Column(String(20), nullable=False, server_default="")
    city = Column(String(100), nullable=False, server_default="")
    email = Column(String(255), nullable=False, server_default="")

    # Offer meta
    offer_date = Column(Date, nullable=True)
    arrival_date = Column(Date, nullable=True)
    departure_date = Column(Date, nullable=True)

    # Room + pricing
    room_category = Column(String(100), nullable=False, server_default="")
    custom_room_category = Column(String(255), nullable=False, server_default="")
    adults = Column(Integer, nullable=False, server_default="2")
    children_ages = Column(ARRAY(Integer), nullable=False, server_default="{}")
    price_per_night = Column(String(50), nullable=False, server_default="")
    total_price = Column(String(50), nullable=False, server_default="")

    employee_name = Column(String(200), nullable=False, server_default="")
    notes = Column(Text, nullable=False, server_default="")
    status = Column(Enum(OfferStatus, name="offerstatus", values_callable=_enum_values), nullable=False, server_default="draft")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
