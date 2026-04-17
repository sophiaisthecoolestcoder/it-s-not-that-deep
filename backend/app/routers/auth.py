from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    modules_for,
)
from app.schemas.user import UserCreate, UserRead, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Ungültiger Benutzername oder Passwort")
    token = create_access_token(user.id, user.username, user.role.value)
    return TokenResponse(access_token=token, user=user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role.value,
        "employee_id": user.employee_id,
        "modules": modules_for(user.role),
    }


@router.post("/register", response_model=UserRead, status_code=201)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Only admins can create new users."""
    from app.models.employee import EmployeeRole
    if current.role != EmployeeRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Admins können Benutzer anlegen")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        employee_id=payload.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
