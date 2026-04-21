import logging

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.employee import EmployeeRole
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    modules_for,
    verify_password,
    INVALID_PASSWORD_PLACEHOLDER,
    TOKEN_TTL_SECONDS,
)
from app.security import (
    client_ip,
    login_ip_limiter,
    login_lockout,
    login_user_limiter,
    password_change_limiter,
)
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserRead,
)


router = APIRouter(prefix="/auth", tags=["Auth"])
logger = logging.getLogger("bleiche")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    login_ip_limiter.check(ip)
    login_lockout.check(payload.username)
    login_user_limiter.check(payload.username)

    user = db.query(User).filter(User.username == payload.username).first()

    # Always run the KDF to keep timing indistinguishable between "no user"
    # and "wrong password".
    stored = user.password_hash if user else INVALID_PASSWORD_PLACEHOLDER
    password_ok = verify_password(payload.password, stored)

    if not user or not user.is_active or not password_ok:
        login_lockout.record_failure(payload.username)
        logger.warning("login_failed user=%s ip=%s", payload.username, ip)
        raise HTTPException(status_code=401, detail="Ungültiger Benutzername oder Passwort")

    login_lockout.record_success(payload.username)
    token = create_access_token(user.id, user.username, user.role.value)
    logger.info("login_ok user=%s ip=%s role=%s", user.username, ip, user.role.value)
    return TokenResponse(access_token=token, expires_in=TOKEN_TTL_SECONDS, user=user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role.value,
        "employee_id": user.employee_id,
        "must_change_password": bool(user.must_change_password),
        "modules": modules_for(user.role),
    }


@router.post("/logout", status_code=204)
def logout(user: User = Depends(get_current_user)):
    """Client-side logout acknowledgement.

    JWTs are stateless; the client discards the token. We log the event so
    suspicious session activity can be correlated.
    """
    logger.info("logout user=%s", user.username)


@router.post("/change-password", response_model=TokenResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rotate the caller's password and issue a fresh token.

    Bumping `tokens_invalidated_before` revokes *every other* session that was
    using the old token. A new token minted after that bump stays valid, so the
    current device keeps its session.
    """
    from datetime import datetime, timezone
    password_change_limiter.check(f"u:{user.id}")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    if len(payload.new_password) < 10:
        raise HTTPException(status_code=400, detail="Neues Passwort muss mindestens 10 Zeichen haben")
    user.password_hash = hash_password(payload.new_password)
    user.must_change_password = False
    user.tokens_invalidated_before = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    logger.info("password_changed user=%s", user.username)
    token = create_access_token(user.id, user.username, user.role.value)
    return TokenResponse(access_token=token, expires_in=TOKEN_TTL_SECONDS, user=user)


@router.post("/register", response_model=UserRead, status_code=201)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Admins create staff accounts. Only admins may grant ADMIN role."""
    if current.role != EmployeeRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Admins können Benutzer anlegen")
    if payload.role == EmployeeRole.ADMIN and current.role != EmployeeRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Admins dürfen Admin-Rechte vergeben")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Benutzername bereits vergeben")
    if len(payload.password) < 10:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 10 Zeichen haben")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        employee_id=payload.employee_id,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("user_registered user=%s role=%s by=%s", user.username, user.role.value, current.username)
    return user
