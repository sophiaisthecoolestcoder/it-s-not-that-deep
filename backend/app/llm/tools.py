"""LLM tool functions for Bleiche database queries."""

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeRole
from app.models.guest import Guest


def list_guests(limit: int = 10, nationality: Optional[str] = None) -> Dict[str, Any]:
    """List guests with optional nationality filter."""
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
    """Find guest(s) by partial name."""
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
    """List employees with optional role filter."""
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
    """Find employees by role."""
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
    """Find guests by keyword in notes."""
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
                {
                    "id": g.id,
                    "name": f"{g.first_name} {g.last_name}",
                    "notes": g.notes,
                }
                for g in guests
            ],
        }
    finally:
        session.close()


def get_all_tool_functions() -> Dict[str, Any]:
    """Return all available tool functions."""
    return {
        "list_guests": list_guests,
        "get_guest_by_name": get_guest_by_name,
        "list_employees": list_employees,
        "get_employee_by_role": get_employee_by_role,
        "search_guest_notes": search_guest_notes,
    }
