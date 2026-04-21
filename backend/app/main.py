import logging
import os
import time
import uuid

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database import engine
from app.routers import auth, belegung, conversations, employees, guests, llm, offers


# ── Logging ──────────────────────────────────────────────────────────────────

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("bleiche")


# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Bleiche Resort & Spa",
    description="Hotel management system for Bleiche Resort & Spa, Spreewald",
    version="0.3.0",
)


# CORS — restrict to explicit origins in production. Comma-separated env var.
_default_origins = "http://localhost:3333,http://localhost:3000,http://localhost:8080,http://localhost:19006"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# Request-size cap. FastAPI streams bodies, so we validate Content-Length up front.
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(1 * 1024 * 1024)))  # 1 MiB default


@app.middleware("http")
async def enforce_body_limit_and_log(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY_BYTES:
        return JSONResponse(
            {"detail": "Request body too large"},
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
    start = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001
        logger.exception("request_failed rid=%s method=%s path=%s err=%s",
                         request_id, request.method, request.url.path, exc)
        return JSONResponse({"detail": "Internal server error", "request_id": request_id},
                            status_code=500)
    duration_ms = int((time.time() - start) * 1000)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "req rid=%s method=%s path=%s status=%s ms=%s",
        request_id, request.method, request.url.path, response.status_code, duration_ms,
    )
    return response


# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(auth.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(guests.router, prefix="/api")
app.include_router(offers.router, prefix="/api")
app.include_router(belegung.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Bleiche Resort & Spa API"}


@app.get("/api/health/deep")
def health_deep():
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        logger.error("db_health_failed err=%s", exc)
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "llm_configured": bool(os.getenv("GROQ_API_KEY")),
    }
