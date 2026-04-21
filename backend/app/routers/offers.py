from html import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.offer import Offer
from app.models.user import User
from app.schemas.offer import OfferCreate, OfferRead, OfferUpdate
from app.auth import require_roles
from app.models.employee import EmployeeRole

router = APIRouter(prefix="/offers", tags=["Offers"])

_read_access = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER, EmployeeRole.RECEPTIONIST)
_write_access = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER, EmployeeRole.RECEPTIONIST)


@router.get("/", response_model=list[OfferRead])
def list_offers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    return db.query(Offer).order_by(Offer.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{offer_id}", response_model=OfferRead)
def get_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(_read_access)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return offer


@router.post("/", response_model=OfferRead, status_code=201)
def create_offer(payload: OfferCreate, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    offer = Offer(**payload.model_dump())
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.patch("/{offer_id}", response_model=OfferRead)
def update_offer(
    offer_id: int,
    payload: OfferUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(offer, field, value)
    db.commit()
    db.refresh(offer)
    return offer


@router.delete("/{offer_id}", status_code=204)
def delete_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    db.delete(offer)
    db.commit()


_DUPLICATE_FIELDS = (
    "salutation", "first_name", "last_name", "street", "zip_code", "city", "email",
    "offer_date", "arrival_date", "departure_date",
    "room_category", "custom_room_category", "adults", "children_ages",
    "price_per_night", "total_price", "employee_name", "notes",
)


@router.post("/{offer_id}/duplicate", response_model=OfferRead, status_code=201)
def duplicate_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    src = db.query(Offer).filter(Offer.id == offer_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    from app.models.offer import OfferStatus
    clone_data = {f: getattr(src, f) for f in _DUPLICATE_FIELDS}
    clone_data["status"] = OfferStatus.DRAFT
    clone = Offer(**clone_data)
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


def _offer_export_html(offer: Offer, lang: str = "de") -> str:
    first = escape(offer.first_name or "")
    last = escape(offer.last_name or "")
    salutation = escape(offer.salutation.value if offer.salutation else "")
    email = escape(offer.email or "")
    room = escape(offer.custom_room_category or offer.room_category or "-")
    total = escape(offer.total_price or "-")
    arrival = offer.arrival_date.isoformat() if offer.arrival_date else "-"
    departure = offer.departure_date.isoformat() if offer.departure_date else "-"
    offer_date = offer.offer_date.isoformat() if offer.offer_date else "-"
    employee = escape(offer.employee_name or "")

    if lang == "en":
        title = "Offer"
        greeting = f"Dear {salutation} {last},".strip()
        intro = "Thank you for your request and your interest in staying with us."
        arrival_label = "Arrival"
        departure_label = "Departure"
        room_label = "Room"
        total_label = "Total Price"
        footer = "Bleiche Resort & Spa"
    else:
        title = "Angebot"
        greeting = f"Sehr geehrte/r {salutation} {last},".strip()
        intro = "Vielen Dank fuer Ihre Anfrage und Ihr Interesse an einem Aufenthalt in unserem Haus."
        arrival_label = "Anreise"
        departure_label = "Abreise"
        room_label = "Zimmer"
        total_label = "Preis Gesamt"
        footer = "Bleiche Resort & Spa"

    return f"""<!doctype html>
<html lang=\"{escape(lang)}\">
    <head>
        <meta charset=\"utf-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <title>{title} #{offer.id}</title>
        <style>
            body {{ font-family: Arial, sans-serif; color: #2d2d2d; margin: 0; padding: 24px; }}
            .doc {{ max-width: 840px; margin: 0 auto; border: 1px solid #ddd; padding: 28px; }}
            .muted {{ color: #666; }}
            .row {{ display: flex; margin: 6px 0; }}
            .k {{ width: 160px; font-weight: 700; }}
            .v {{ flex: 1; }}
            hr {{ border: 0; border-top: 1px solid #ddd; margin: 14px 0; }}
            h1 {{ margin: 0 0 8px; font-size: 26px; }}
        </style>
    </head>
    <body>
        <div class=\"doc\">
            <h1>{title}</h1>
            <p class=\"muted\">#{offer.id} • {offer_date}</p>
            <p><strong>{salutation} {first} {last}</strong><br/>{email}</p>
            <p>{greeting}</p>
            <p>{intro}</p>
            <hr/>
            <div class=\"row\"><div class=\"k\">{arrival_label}</div><div class=\"v\">{arrival}</div></div>
            <div class=\"row\"><div class=\"k\">{departure_label}</div><div class=\"v\">{departure}</div></div>
            <div class=\"row\"><div class=\"k\">{room_label}</div><div class=\"v\">{room}</div></div>
            <div class=\"row\"><div class=\"k\">{total_label}</div><div class=\"v\"><strong>{total}</strong></div></div>
            <hr/>
            <p class=\"muted\">{footer}</p>
            <p class=\"muted\">{employee}</p>
        </div>
    </body>
</html>"""


@router.get("/{offer_id}/export/html", response_class=HTMLResponse)
def export_offer_html(
    offer_id: int,
    lang: str = Query(default="de", pattern="^(de|en)$"),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    return HTMLResponse(content=_offer_export_html(offer, lang=lang))
