# Backend Architecture

## Overview

The backend is a FastAPI service with SQLAlchemy ORM models and Alembic migrations. It is the authoritative write path for users, employees, guests, offers, daily briefings, and staff members.

## Runtime Entry Point

- Application entry: `backend/app/main.py`
- Health endpoint: `GET /api/health`
- API prefix: `/api`
- CORS: enabled for all origins in the current local-development setup

The backend registers the following routers:

- `auth`
- `employees`
- `guests`
- `offers`
- `belegung`
- `llm`

## Core Backend Concepts

### 1. Database Access

- `backend/app/database.py` loads environment variables with `python-dotenv`.
- `DATABASE_URL` is required and the app now fails fast if it is missing.
- `SessionLocal` is the unit of work used by routes and tools.

### 2. Authentication

- Login is handled by `POST /api/auth/login`.
- JWT tokens are generated in `backend/app/auth.py` using the standard library.
- `GET /api/auth/me` returns the current user profile and module access list.
- The backend now requires `JWT_SECRET` to exist at startup.
- Role checks are implemented with dependency helpers such as `require_roles()`.

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
- `POST /api/auth/register`

The register endpoint is admin-only.

### Employees

Routes in `backend/app/routers/employees.py`:

- `GET /api/employees/`
- `GET /api/employees/{employee_id}`
- `POST /api/employees/`
- `PATCH /api/employees/{employee_id}`
- `DELETE /api/employees/{employee_id}`

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

- `POST /api/llm/ask`
- `GET /api/llm/capabilities`

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

- `GROQ_API_KEY`
- `GROQ_MODEL`

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
