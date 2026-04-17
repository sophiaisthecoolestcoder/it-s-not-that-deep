"""Authentication helpers: password hashing, JWT, role-based access."""
import os
import hashlib
import hmac
import base64
import json
import time
import secrets
from typing import Optional, Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.employee import EmployeeRole


JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("Missing JWT_SECRET environment variable. Define it in backend/.env.")
JWT_ALG_LABEL = "HS256"
TOKEN_TTL_SECONDS = 60 * 60 * 12  # 12 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ── Password hashing (PBKDF2-HMAC-SHA256, stdlib only) ───────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    iterations = 200_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iter_s, salt_b64, hash_b64 = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_s)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ── JWT (minimal HS256 implementation, stdlib only) ──────────────────────────

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user_id: int, username: str, role: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": now,
        "exp": now + TOKEN_TTL_SECONDS,
    }
    h = _b64url(json.dumps(header, separators=(",", ":")).encode())
    p = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}".encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64url(sig)}"


def decode_token(token: str) -> dict:
    try:
        h, p, s = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    signing_input = f"{h}.{p}".encode()
    expected_sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(_b64url(expected_sig), s):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    payload = json.loads(_b64url_decode(p))
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Token expired")
    return payload


# ── FastAPI dependencies ─────────────────────────────────────────────────────

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or missing")
    return user


def require_roles(*roles: EmployeeRole):
    allowed = {r.value for r in roles}

    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role == EmployeeRole.ADMIN:
            return user
        if user.role.value not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user

    return _dep


# ── Role → allowed modules / LLM tools ───────────────────────────────────────

ALL_MODULES = ["home", "angebote", "belegung", "staff", "assistant"]

MODULE_ACCESS: dict[str, set[str]] = {
    EmployeeRole.ADMIN.value: set(ALL_MODULES),
    EmployeeRole.MANAGER.value: set(ALL_MODULES),
    EmployeeRole.RECEPTIONIST.value: {"home", "angebote", "belegung", "assistant"},
    EmployeeRole.CONCIERGE.value: {"home", "belegung", "assistant"},
    EmployeeRole.HOUSEKEEPER.value: {"home", "belegung"},
    EmployeeRole.CHEF.value: {"home", "belegung"},
    EmployeeRole.WAITER.value: {"home", "belegung"},
    EmployeeRole.SPA_THERAPIST.value: {"home", "belegung"},
    EmployeeRole.MAINTENANCE.value: {"home", "belegung"},
}

# Assistant/LLM tool-level permissions by role.
LLM_TOOL_ACCESS: dict[str, set[str]] = {
    EmployeeRole.ADMIN.value: {
        "list_guests", "get_guest_by_name", "search_guest_notes",
        "get_guest",
        "list_employees", "get_employee_by_role", "get_employee",
        "list_offers", "get_offer", "create_offer",
        "list_daily_briefings", "get_daily_briefing",
    },
    EmployeeRole.MANAGER.value: {
        "list_guests", "get_guest_by_name", "search_guest_notes",
        "get_guest",
        "list_employees", "get_employee_by_role", "get_employee",
        "list_offers", "get_offer", "create_offer",
        "list_daily_briefings", "get_daily_briefing",
    },
    EmployeeRole.RECEPTIONIST.value: {
        "list_guests", "get_guest_by_name", "search_guest_notes",
        "get_guest",
        "list_offers", "get_offer", "create_offer",
        "list_daily_briefings", "get_daily_briefing",
    },
    EmployeeRole.CONCIERGE.value: {
        "list_guests", "get_guest_by_name",
        "get_guest",
        "list_daily_briefings", "get_daily_briefing",
    },
}


def modules_for(role: EmployeeRole) -> list[str]:
    return [m for m in ALL_MODULES if m in MODULE_ACCESS.get(role.value, set())]


def tools_for(role: EmployeeRole) -> set[str]:
    return LLM_TOOL_ACCESS.get(role.value, set())


def can_access(role: EmployeeRole, module: str) -> bool:
    return module in MODULE_ACCESS.get(role.value, set())
