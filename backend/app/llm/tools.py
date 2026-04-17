"""LLM tool functions for Bleiche database queries."""

from typing import Any, Dict, Optional

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.guest import Guest
from app.models.offer import Offer, OfferStatus
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


def get_all_tool_functions() -> Dict[str, Any]:
    return {
        "list_guests": list_guests,
        "get_guest_by_name": get_guest_by_name,
        "list_employees": list_employees,
        "get_employee_by_role": get_employee_by_role,
        "search_guest_notes": search_guest_notes,
        "list_offers": list_offers,
        "list_daily_briefings": list_daily_briefings,
    }
