from fastapi import APIRouter, Depends, HTTPException
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
    skip: int = 0,
    limit: int = 200,
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


@router.post("/{offer_id}/duplicate", response_model=OfferRead, status_code=201)
def duplicate_offer(offer_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    src = db.query(Offer).filter(Offer.id == offer_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Angebot nicht gefunden")
    clone_data = {c.name: getattr(src, c.name) for c in Offer.__table__.columns if c.name not in ("id", "created_at", "updated_at")}
    from app.models.offer import OfferStatus
    clone_data["status"] = OfferStatus.DRAFT
    clone = Offer(**clone_data)
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone
