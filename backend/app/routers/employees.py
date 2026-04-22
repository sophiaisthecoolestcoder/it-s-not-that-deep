from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee, EmployeeRole
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.auth import require_roles, get_current_user

router = APIRouter(prefix="/employees", tags=["Employees"])

# Any authenticated user can read (needed for things like LLM lookups of a
# colleague's contact details); the richer HR list is scoped by query param
# gating at the frontend.
_read_access = get_current_user
_hr_access = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)
_write_access = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)


@router.get("/", response_model=list[EmployeeRead])
def list_employees(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    department: Optional[str] = Query(default=None),
    role: Optional[EmployeeRole] = Query(default=None),
    active: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    query = db.query(Employee)
    if department:
        query = query.filter(Employee.department == department)
    if role is not None:
        query = query.filter(Employee.role == role)
    if active is not None:
        query = query.filter(Employee.active == active)
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Employee.first_name.ilike(needle),
                Employee.last_name.ilike(needle),
                Employee.email.ilike(needle),
                Employee.position.ilike(needle),
            )
        )
    return (
        query.order_by(Employee.last_name.asc(), Employee.first_name.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(employee_id: int, db: Session = Depends(get_db), user: User = Depends(_read_access)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("/", response_model=EmployeeRead, status_code=201)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    emp = Employee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: int, db: Session = Depends(get_db), user: User = Depends(_write_access)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()


# Silence unused-import flake; _hr_access is exported for future granular gating.
_ = _hr_access
