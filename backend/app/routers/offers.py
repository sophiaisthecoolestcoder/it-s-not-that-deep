from html import escape
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.offer import Offer
from app.models.user import User
from app.schemas.offer import OfferCreate, OfferRead, OfferUpdate
from app.auth import require_roles
from app.models.employee import EmployeeRole
from app.routers._offer_rooms import (
    amenities_for_room_id,
    room_name_by_id,
    CLOSING_PARAGRAPHS,
    GENUSSPAUSCHALE,
)

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


_MONTHS_DE = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
]


def _format_date_de(iso: Optional[str]) -> str:
    if not iso:
        return ""
    try:
        y, m, d = iso.split("-")
        return f"{int(d)}. {_MONTHS_DE[int(m) - 1]} {y}"
    except (ValueError, IndexError):
        return iso


def _format_euro(raw: Optional[str]) -> str:
    if not raw:
        return "—"
    cleaned = raw.replace(" ", "").replace("€", "").replace(",", ".")
    try:
        num = float(cleaned)
    except ValueError:
        return raw  # free-text prices ("nach Absprache")
    int_part, frac = f"{num:.2f}".split(".")
    groups = []
    s = int_part.lstrip("-")
    while len(s) > 3:
        groups.append(s[-3:])
        s = s[:-3]
    groups.append(s)
    int_formatted = ".".join(reversed(groups))
    sign = "-" if int_part.startswith("-") else ""
    return f"{sign}{int_formatted},{frac} €"


def _greeting_de(salutation: str, last_name: str) -> str:
    last = (last_name or "").strip()
    if salutation == "Herr":
        return f"Sehr geehrter Herr {last}" if last else "Sehr geehrter Herr"
    if salutation == "Frau":
        return f"Sehr geehrte Frau {last}" if last else "Sehr geehrte Frau"
    if salutation == "Familie":
        return f"Sehr geehrte Familie {last}" if last else "Sehr geehrte Familie"
    return "Sehr geehrte Damen und Herren"


def _guest_line_de(adults: int, salutation: str, children_ages: list[int]) -> str:
    word = "Erwachsenen" if adults == 1 and salutation == "Herr" else "Erwachsene"
    line = f"für {adults} {word}"
    if children_ages:
        parts = [f"1 Kind im Alter von {a} {'Jahr' if a == 1 else 'Jahren'}" for a in children_ages]
        line += " und " + " und ".join(parts)
    return line


_CSS = """
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f5ede3; color: #2d2d2d; }
  body { font-family: 'Alegreya Sans', 'Noto Sans', Arial, sans-serif; font-size: 14px; line-height: 22px; }
  .page {
    max-width: 820px;
    margin: 24px auto;
    background: #ffffff;
    padding: 56px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
  .logo { text-align: center; margin-bottom: 18px; font-weight: 700; letter-spacing: 2px; font-size: 22px; }
  .logo img { width: 220px; height: auto; }
  .address { margin-bottom: 10px; }
  .address strong { font-weight: 700; }
  .email { margin-bottom: 8px; }
  .date { text-align: right; margin-bottom: 14px; }
  h1.doc-title { font-size: 22px; font-weight: 700; color: #2d2d2d; margin: 8px 0 10px; font-family: inherit; }
  p.para { margin: 0 0 8px; text-align: justify; }
  hr.sep { border: 0; border-top: 1px solid #EEE5DA; margin: 14px 0; }
  .row { display: flex; align-items: flex-start; margin-bottom: 2px; }
  .row .k { width: 110px; flex-shrink: 0; font-weight: 700; padding-top: 2px; }
  .row .v { flex: 1; }
  .row.tight { margin-bottom: 14px; }
  .bullets { margin-left: 110px; padding: 0; list-style: none; }
  .bullets li { display: flex; margin-bottom: 2px; }
  .bullets li::before { content: "•"; width: 14px; }
  .micro { font-size: 11px; color: #787978; margin: 0 0 4px 110px; }
  .underline { text-decoration: underline; }
  .signature { margin-top: 20px; }
  .signature .brand { font-weight: 700; letter-spacing: 1.4px; margin: 0 0 12px; }
  .signature .sig-row { display: flex; justify-content: space-between; }
  .signature .sig-row .right { text-align: right; }
  @media print {
    body { background: #ffffff; }
    .page { box-shadow: none; margin: 0; max-width: none; padding: 0; }
  }
"""


def _offer_export_html(offer: Offer, lang: str = "de") -> str:
    """Render an offer as a standalone HTML document that matches the Word export.

    `lang` exists only for API compatibility — the offer document is authored in
    German; passing `lang=en` swaps the greeting/intro/labels but keeps the body.
    """
    salutation = offer.salutation.value if offer.salutation else ""
    first = offer.first_name or ""
    last = offer.last_name or ""
    street = offer.street or ""
    zip_code = offer.zip_code or ""
    city = offer.city or ""
    email_v = offer.email or ""

    offer_date = offer.offer_date.isoformat() if offer.offer_date else ""
    arrival = offer.arrival_date.isoformat() if offer.arrival_date else ""
    departure = offer.departure_date.isoformat() if offer.departure_date else ""

    room_id = offer.room_category or ""
    room_display = offer.custom_room_category or room_name_by_id(room_id) or room_id or "—"

    amenities = amenities_for_room_id(room_id)
    # First bullet is the standard "Übernachtung in Ihrem ausgewählten Wohlfühlzimmer".
    rendered_amenities = [
        "Übernachtung in Ihrem ausgewählten Wohlfühlzimmer" if i == 0 else item
        for i, item in enumerate(amenities)
    ]

    greeting_line = _greeting_de(salutation, last) + ","
    intro = (
        "herzlichen Dank für Ihre Anfrage und für Ihr Interesse an einem Aufenthalt in "
        "unserem Haus. Gerne übersenden wir Ihnen folgendes Angebot:"
    )

    if lang == "en":
        # Keep the same layout; swap greeting + intro to English for non-German guests.
        last_en = last.strip()
        greeting_line = (
            f"Dear {salutation} {last_en}," if last_en else f"Dear {salutation},".strip(", ")
        )
        intro = (
            "Thank you very much for your enquiry and for your interest in staying with us. "
            "We would be delighted to send you the following offer:"
        )

    guest_line = _guest_line_de(offer.adults, salutation, list(offer.children_ages or []))

    price_per_night = (
        f"{_format_euro(offer.price_per_night)} pro Person pro Nacht"
        if offer.price_per_night
        else "—"
    )
    total_price = _format_euro(offer.total_price) if offer.total_price else "—"

    amenity_bullets = "\n".join(
        f"          <li>{escape(item)}</li>" for item in rendered_amenities
    )
    genuss_bullets = "\n".join(
        f"          <li>{escape(item)}</li>" for item in GENUSSPAUSCHALE
    )
    closing_paragraphs = "\n".join(
        f'      <p class="para">{escape(p)}</p>' for p in CLOSING_PARAGRAPHS
    )

    address_email_block = (
        f'      <p class="email">per E-Mail an {escape(email_v)}</p>' if email_v else ""
    )

    title = f"Angebot #{offer.id}"
    body = f"""<!doctype html>
<html lang="{escape(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{escape(title)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>{_CSS}</style>
  </head>
  <body>
    <main class="page">
      <div class="logo">BLEICHE RESORT &amp; SPA</div>

      <div class="address">
        <div><strong>{escape(f"{salutation} {first} {last}".strip())}</strong></div>
        <div><strong>{escape(street)}</strong></div>
        <div><strong>{escape(f"{zip_code} {city}".strip())}</strong></div>
      </div>
{address_email_block}
      <p class="date">Burg (Spreewald), {escape(_format_date_de(offer_date))}</p>

      <h1 class="doc-title">Angebot</h1>

      <p class="para">{escape(greeting_line)}</p>
      <p class="para">{escape(intro)}</p>

      <hr class="sep" />

      <div class="row"><div class="k">Anreise:</div><div class="v">{escape(_format_date_de(arrival) or "—")}</div></div>
      <div class="row tight"><div class="k">Abreise:</div><div class="v">{escape(_format_date_de(departure) or "—")}</div></div>

      <div class="row"><div class="k">Zimmer:</div><div class="v">{escape(room_display)}</div></div>
      <div class="row tight"><div class="k">&nbsp;</div><div class="v">{escape(guest_line)}</div></div>

      <div class="row tight"><div class="k">Preis:</div><div class="v">{escape(price_per_night)}</div></div>

      <div class="row"><div class="k">Leistungen:</div><div class="v underline">Das ist alles im Zimmerpreis enthalten:</div></div>
      <ul class="bullets">
{amenity_bullets}
      </ul>

      <ul class="bullets" style="margin-top:6px;">
        <div class="underline" style="margin-bottom:2px;">Das alles ist in unserer Genusspauschale enthalten:</div>
{genuss_bullets}
      </ul>

      <hr class="sep" />

      <div class="row"><div class="k"><strong>Preis Gesamt:</strong></div><div class="v"><strong>{escape(total_price)}</strong></div></div>
      <p class="micro">(zzgl. je € 1,00 Fremdenverkehrsabgabe &amp; je € 2,00 Kurbeitrag pro Nacht)</p>

      <hr class="sep" />

{closing_paragraphs}

      <div class="signature">
        <p class="para" style="margin-bottom:0;">Mit freundlichen Grüßen</p>
        <p class="brand">BLEICHE RESORT &amp; SPA</p>
        <div class="sig-row">
          <div>Familie Clausing</div>
          <div class="right">
            <div>{escape(offer.employee_name or "")}</div>
            <div>Reservierung</div>
          </div>
        </div>
      </div>
    </main>
  </body>
</html>"""
    return body


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
