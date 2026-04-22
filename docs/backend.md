# Backend Architecture

## Overview

The backend is a FastAPI service with SQLAlchemy ORM models and Alembic migrations. It is the authoritative write path for users, employees, guests, offers, daily briefings, and staff members.

## Runtime Entry Point

- Application entry: `backend/app/main.py`
- Health endpoints: `GET /api/health` (liveness), `GET /api/health/deep` (DB + LLM readiness)
- API prefix: `/api`
- CORS: restricted to the origins listed in `ALLOWED_ORIGINS` (comma-separated, defaults cover local web/metro)
- Request body cap: `MAX_BODY_BYTES` (default 1 MiB) enforced in middleware
- Every request gets an `X-Request-ID` header and is logged with method/path/status/duration

The backend registers the following routers:

- `auth`
- `employees`
- `guests`
- `offers`
- `belegung`
- `llm`
- `conversations`

## Core Backend Concepts

### 1. Database Access

- `backend/app/database.py` loads environment variables with `python-dotenv`.
- `DATABASE_URL` is required and the app fails fast if it is missing.
- The engine is configured with a connection pool (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE_SECONDS` env overrides) and `pool_pre_ping=True` to weed out stale connections.
- `SessionLocal` is the unit of work used by routes and tools.

### 2. Authentication

- Login is handled by `POST /api/auth/login`. The response is `{access_token, token_type, expires_in, user}` so the client knows the TTL.
- JWT tokens are generated in `backend/app/auth.py` using the standard library (HS256). TTL is controlled by `TOKEN_TTL_SECONDS` (default 8 hours).
- `GET /api/auth/me` returns the current user profile and module access list.
- The backend requires `JWT_SECRET` to exist at startup.
- Role checks are implemented with dependency helpers such as `require_roles()`.
- **Session revocation on password change:** the `users.tokens_invalidated_before` column is bumped to `now()` whenever a user changes their password. Any JWT whose `iat` is earlier than that timestamp is rejected in `get_current_user`. `POST /api/auth/change-password` then mints a fresh token (with an `iat` at or after the revocation marker) and returns it in the response, so the current device keeps its session while all other devices holding the old token are immediately signed out.
- **Login lockout and rate limits:** `POST /api/auth/login` is gated by per-IP and per-username rate limiters plus a lockout after 5 consecutive failures. `POST /api/auth/change-password` has its own per-user rate limiter.

### 3. Authorization Model

User roles come from the PostgreSQL-backed `employeerole` enum.

Current roles:

- `admin`
- `manager`
- `receptionist`
- `concierge`
- `housekeeper`
- `chef`
- `waiter`
- `spa_therapist`
- `maintenance`

Authorization is enforced both for ordinary API routes and for assistant tool access.

## Route Groups

### Auth

Routes in `backend/app/routers/auth.py`:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout` (acknowledges and logs the client-side logout; real revocation happens via `change-password`)
- `POST /api/auth/change-password`
- `POST /api/auth/register`

The register endpoint is admin-only.

### Employees

Routes in `backend/app/routers/employees.py`:

- `GET /api/employees/?department=&role=&active=&search=&skip=&limit=`
- `GET /api/employees/{employee_id}`
- `POST /api/employees/` (admin / manager)
- `PATCH /api/employees/{employee_id}` (admin / manager)
- `DELETE /api/employees/{employee_id}` (admin / manager)

List supports ILIKE text search across first name, last name, email, and position. See `docs/employees.md` for HR-fields documentation.

### Guests

Routes in `backend/app/routers/guests.py`:

- `GET /api/guests/`
- `GET /api/guests/{guest_id}`
- `POST /api/guests/`
- `PATCH /api/guests/{guest_id}`
- `DELETE /api/guests/{guest_id}`

### Offers

Routes in `backend/app/routers/offers.py`:

- `GET /api/offers/`
- `GET /api/offers/{offer_id}`
- `POST /api/offers/`
- `PATCH /api/offers/{offer_id}`
- `DELETE /api/offers/{offer_id}`
- `POST /api/offers/{offer_id}/duplicate`
- `GET /api/offers/{offer_id}/export/html?lang=de|en`

### Belegung

Routes in `backend/app/routers/belegung.py`:

- `GET /api/belegung/days`
- `GET /api/belegung/days/{day}`
- `PUT /api/belegung/days/{day}`
- `DELETE /api/belegung/days/{day}`
- `GET /api/belegung/staff`
- `POST /api/belegung/staff`
- `DELETE /api/belegung/staff/{staff_id}`
- `GET /api/belegung/rooms`

### LLM

Routes in `backend/app/routers/llm.py`:

- `POST /api/llm/ask` — accepts `{question, conversation_id?}`, returns `{conversation_id, question, answer, role, tools_available, references, usage}`. Rate-limited per user (short-burst + daily).
- `GET /api/llm/capabilities` — lists the tools available to the caller's role.

### Calendar

Routes in `backend/app/routers/calendar.py`:

- `GET /api/calendar/events?from=&to=&event_type=&user_id=` — returns expanded occurrences. Max range 366 days. Admins can pass `user_id` to query another user's calendar view.
- `GET /api/calendar/events/{id}` — master event with participants and exceptions.
- `POST /api/calendar/events` — any authenticated user; creator becomes sole participant when `audience_scope='users'` and no participants are provided.
- `PATCH /api/calendar/events/{id}` — creator / admin / manager.
- `DELETE /api/calendar/events/{id}` — creator / admin / manager; cascades.
- `POST /api/calendar/events/{id}/exceptions` — cancel / modify a single occurrence of a recurring event.
- `DELETE /api/calendar/events/{id}/exceptions/{exception_id}` — restore an occurrence.

Recurrence expansion lives in `backend/app/services/calendar_expand.py` and uses `python-dateutil.rrule`. The master event stores an RFC 5545 RRULE string; occurrences are materialized on read. See `docs/calendar.md` for the full data model.

### Conversations

Routes in `backend/app/routers/conversations.py`:

- `GET /api/conversations/` — list the caller's conversations, newest active first.
- `GET /api/conversations/{id}` — full detail with messages; 404 if not owned by the caller.
- `DELETE /api/conversations/{id}` — cascades to messages.
- `GET /api/conversations/usage/me?days=N` — token + cost totals for the last N days.

## Data Validation And Schemas

The backend uses Pydantic schemas in `backend/app/schemas/`.

Important patterns:

- `OfferRead`, `EmployeeRead`, `GuestRead`, and similar response schemas use `model_config = {"from_attributes": True}` for ORM compatibility.
- Offer create/update schemas match the persisted model and keep the field names stable across the API and assistant tool layer.

## Startup And Environment Expectations

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET`

Optional environment variables:

- `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_INPUT_PRICE_PER_MTOK`, `GROQ_OUTPUT_PRICE_PER_MTOK`
- `TOKEN_TTL_SECONDS` (JWT expiry; default 8 hours)
- `LOG_LEVEL` (default `INFO`)
- `ALLOWED_ORIGINS` (comma-separated CORS allowlist)
- `MAX_BODY_BYTES` (request size cap; default 1 MiB)
- `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE_SECONDS`
- `LLM_MAX_TOOL_ITERATIONS`, `LLM_MAX_TOOL_RESULT_CHARS`, `LLM_MAX_HISTORY_TURNS`, `LLM_MAX_PRIOR_REFS`

When `GROQ_API_KEY` is absent, the assistant route cannot function, but the rest of the backend can still run.

## Development Flow

Typical local backend sequence:

1. Activate the virtual environment.
2. Run Alembic migrations.
3. Seed users and reference data.
4. Start Uvicorn.

On Windows, the repository includes `run-backend.bat` for a single-step launch path.

## Important Implementation Notes

- `backend/app/models/offer.py` uses explicit enum value mapping so PostgreSQL receives the exact values defined by the migration.
- Offers can be exported to HTML from the backend so the frontend and assistant can reuse the same output path.
- The backend is the source of truth for assistant-created objects. The frontend only renders them.
- The assistant can be given conversation history and authenticated user context, but the backend still decides which tools are available.
