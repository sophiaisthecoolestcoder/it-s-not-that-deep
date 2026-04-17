"""LLM tool functions for Bleiche database queries and mutations."""

from datetime import date
from typing import Any, Dict, Optional

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.guest import Guest
from app.models.offer import Offer, OfferStatus, Salutation
from app.models.belegung import DailyBriefing


def list_guests(limit: int = 10, nationality: Optional[str] = None) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        query = session.query(Guest)
        if nationality:
            query = query.filter(Guest.nationality.ilike(f"%{nationality}%"))
        guests = query.limit(max(1, min(limit, 50))).all()
        return {
            "count": len(guests),
            "guests": [
                {
                    "id": g.id,
                    "name": f"{g.first_name} {g.last_name}",
                    "email": g.email,
                    "nationality": g.nationality,
                    "notes": g.notes,
                }
                for g in guests
            ],
        }
    finally:
        session.close()


def get_guest_by_name(name: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        guests = (
            session.query(Guest)
            .filter(
                (Guest.first_name.ilike(f"%{name}%"))
                | (Guest.last_name.ilike(f"%{name}%"))
            )
            .limit(10)
            .all()
        )
        return {
            "count": len(guests),
            "guests": [
                {
                    "id": g.id,
                    "name": f"{g.first_name} {g.last_name}",
                    "email": g.email,
                    "nationality": g.nationality,
                    "notes": g.notes,
                }
                for g in guests
            ],
        }
    finally:
        session.close()


def list_employees(limit: int = 10, role: Optional[str] = None) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        query = session.query(Employee)
        if role:
            try:
                role_enum = EmployeeRole[role.upper()]
                query = query.filter(Employee.role == role_enum)
            except KeyError:
                return {"error": f"Unknown role '{role}'"}

        employees = query.limit(max(1, min(limit, 50))).all()
        return {
            "count": len(employees),
            "employees": [
                {
                    "id": e.id,
                    "name": f"{e.first_name} {e.last_name}",
                    "email": e.email,
                    "role": e.role.value,
                    "phone": e.phone,
                }
                for e in employees
            ],
        }
    finally:
        session.close()


def get_employee_by_role(role: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        try:
            role_enum = EmployeeRole[role.upper()]
        except KeyError:
            return {"error": f"Unknown role '{role}'"}

        employees = session.query(Employee).filter(Employee.role == role_enum).all()
        return {
            "count": len(employees),
            "employees": [
                {
                    "id": e.id,
                    "name": f"{e.first_name} {e.last_name}",
                    "email": e.email,
                    "role": e.role.value,
                }
                for e in employees
            ],
        }
    finally:
        session.close()


def search_guest_notes(keyword: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        guests = (
            session.query(Guest)
            .filter(Guest.notes.ilike(f"%{keyword}%"))
            .limit(25)
            .all()
        )
        return {
            "count": len(guests),
            "guests": [
                {"id": g.id, "name": f"{g.first_name} {g.last_name}", "notes": g.notes}
                for g in guests
            ],
        }
    finally:
        session.close()


def list_offers(limit: int = 10, status: Optional[str] = None) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        query = session.query(Offer).order_by(Offer.created_at.desc())
        if status:
            try:
                status_enum = OfferStatus[status.upper()]
                query = query.filter(Offer.status == status_enum)
            except KeyError:
                return {"error": f"Unknown status '{status}'"}
        offers = query.limit(max(1, min(limit, 50))).all()
        return {
            "count": len(offers),
            "offers": [
                {
                    "id": o.id,
                    "client": f"{o.first_name} {o.last_name}",
                    "arrival": o.arrival_date.isoformat() if o.arrival_date else None,
                    "departure": o.departure_date.isoformat() if o.departure_date else None,
                    "room": o.room_category,
                    "total_price": o.total_price,
                    "status": o.status.value,
                }
                for o in offers
            ],
        }
    finally:
        session.close()


def get_offer(offer_id: int) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        offer = session.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            return {"error": f"Offer with id {offer_id} not found"}
        return {
            "offer": {
                "id": offer.id,
                "salutation": offer.salutation.value,
                "first_name": offer.first_name,
                "last_name": offer.last_name,
                "email": offer.email,
                "arrival_date": offer.arrival_date.isoformat() if offer.arrival_date else None,
                "departure_date": offer.departure_date.isoformat() if offer.departure_date else None,
                "room_category": offer.room_category,
                "total_price": offer.total_price,
                "status": offer.status.value,
                "created_at": offer.created_at.isoformat() if offer.created_at else None,
            }
        }
    finally:
        session.close()


def create_offer(
    first_name: str,
    last_name: str,
    salutation: str = "Herr",
    email: str = "",
    street: str = "",
    zip_code: str = "",
    city: str = "",
    offer_date: Optional[str] = None,
    arrival_date: Optional[str] = None,
    departure_date: Optional[str] = None,
    room_category: str = "",
    custom_room_category: str = "",
    adults: int = 2,
    children_ages: Optional[list[int]] = None,
    price_per_night: str = "",
    total_price: str = "",
    employee_name: str = "",
    notes: str = "",
    status: str = "draft",
) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        try:
            salutation_enum = Salutation(salutation)
        except ValueError:
            return {"error": f"Unknown salutation '{salutation}'. Allowed: Herr|Frau|Familie"}

        try:
            status_enum = OfferStatus(status)
        except ValueError:
            return {"error": "Unknown status. Allowed: draft|sent|accepted|declined"}

        def parse_date(raw: Optional[str]) -> Optional[date]:
            if not raw:
                return None
            return date.fromisoformat(raw)

        try:
            offer = Offer(
                salutation=salutation_enum,
                first_name=first_name,
                last_name=last_name,
                street=street,
                zip_code=zip_code,
                city=city,
                email=email,
                offer_date=parse_date(offer_date),
                arrival_date=parse_date(arrival_date),
                departure_date=parse_date(departure_date),
                room_category=room_category,
                custom_room_category=custom_room_category,
                adults=max(1, int(adults or 1)),
                children_ages=children_ages or [],
                price_per_night=price_per_night,
                total_price=total_price,
                employee_name=employee_name,
                notes=notes,
                status=status_enum,
            )
        except ValueError as exc:
            return {"error": f"Invalid date format: {str(exc)}"}

        session.add(offer)
        session.commit()
        session.refresh(offer)

        return {
            "created": True,
            "offer": {
                "id": offer.id,
                "client": f"{offer.first_name} {offer.last_name}",
                "arrival": offer.arrival_date.isoformat() if offer.arrival_date else None,
                "departure": offer.departure_date.isoformat() if offer.departure_date else None,
                "room": offer.room_category,
                "total_price": offer.total_price,
                "status": offer.status.value,
            },
        }
    finally:
        session.close()


def get_guest(guest_id: int) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        guest = session.query(Guest).filter(Guest.id == guest_id).first()
        if not guest:
            return {"error": f"Guest with id {guest_id} not found"}
        return {
            "guest": {
                "id": guest.id,
                "first_name": guest.first_name,
                "last_name": guest.last_name,
                "email": guest.email,
                "nationality": guest.nationality,
                "notes": guest.notes,
            }
        }
    finally:
        session.close()


def get_employee(employee_id: int) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return {"error": f"Employee with id {employee_id} not found"}
        return {
            "employee": {
                "id": employee.id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "email": employee.email,
                "phone": employee.phone,
                "role": employee.role.value,
            }
        }
    finally:
        session.close()


def list_daily_briefings(limit: int = 10) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        rows = (
            session.query(DailyBriefing)
            .order_by(DailyBriefing.date.desc())
            .limit(max(1, min(limit, 60)))
            .all()
        )
        return {
            "count": len(rows),
            "days": [
                {
                    "date": r.date.isoformat(),
                    "arrivals": len((r.data or {}).get("arrivals", [])),
                    "stayers": len((r.data or {}).get("stayers", [])),
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                }
                for r in rows
            ],
        }
    finally:
        session.close()


def get_daily_briefing(date_iso: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        try:
            d = date.fromisoformat(date_iso)
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD"}

        row = session.query(DailyBriefing).filter(DailyBriefing.date == d).first()
        if not row:
            return {"error": f"No daily briefing found for {date_iso}"}

        payload = row.data or {}
        return {
            "day": {
                "date": row.date.isoformat(),
                "arrivals": len(payload.get("arrivals", [])),
                "stayers": len(payload.get("stayers", [])),
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
        }
    finally:
        session.close()


def get_all_tool_functions() -> Dict[str, Any]:
    return {
        "list_guests": list_guests,
        "get_guest_by_name": get_guest_by_name,
        "get_guest": get_guest,
        "list_employees": list_employees,
        "get_employee_by_role": get_employee_by_role,
        "get_employee": get_employee,
        "search_guest_notes": search_guest_notes,
        "list_offers": list_offers,
        "get_offer": get_offer,
        "create_offer": create_offer,
        "list_daily_briefings": list_daily_briefings,
        "get_daily_briefing": get_daily_briefing,
    }
