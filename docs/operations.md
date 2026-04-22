# Operations And Development Guide

## Overview

This document is the practical runbook for working on the codebase locally.

It is intentionally explicit because the project is meant to be used by a coding agent as well as by a human developer.

## Local Startup

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

On Windows, the repository also includes `run-backend.bat`.

### Frontend

```bash
cd frontend
npm start
```

For the web build, `npm run web` is the direct entry point.

On Windows, the repository also includes `run-frontend.bat`.

## Environment Variables

### Required Backend Variables

- `DATABASE_URL`
- `JWT_SECRET`

### Optional Backend Variables

- `TOKEN_TTL_SECONDS` — JWT lifetime in seconds (default 8 hours).
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist.
- `MAX_BODY_BYTES` — request body cap (default 1 MiB).
- `LOG_LEVEL` — default `INFO`.
- `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_INPUT_PRICE_PER_MTOK`, `GROQ_OUTPUT_PRICE_PER_MTOK` — LLM assistant.
- `FISKALY_API_KEY`, `FISKALY_API_SECRET`, `FISKALY_TSS_ID`, `FISKALY_CLIENT_ID`, `FISKALY_API_BASE_URL` — fiskaly KassenSichV POS signing (see `docs/fiskaly-setup.md`). Missing any of these falls back to a mock signer.
- `FISKALY_ADMIN_PUK`, `FISKALY_ADMIN_PIN` — only needed when running `scripts/fiskaly_setup.py` or rotating admin credentials.
- `FISCAL_PROVIDER` — force `fiskaly` or `mock`; blank = auto (fiskaly if creds present, mock otherwise).

The backend fails fast if required variables are missing; optional ones degrade the feature gracefully.

See `backend/.env.example` for the authoritative template with placeholders.

## Default Seed Accounts

The seed script currently creates these demo users if they do not already exist:

- `admin` / `bleiche2026`
- `rezeption` / `rezeption`
- `hausdame` / `hausdame`

These are development credentials. They should be changed immediately in any non-local environment.

## Database Tasks

Typical backend maintenance flow:

```bash
cd backend
alembic upgrade head                    # apply all migrations
python -m scripts.seed                  # default admin + demo users + rooms
python -m scripts.seed_sample_data      # HR employees, guests, calendar events, POS products (idempotent)
```

`run-backend.bat` and `run-backend.sh` run `alembic upgrade head` automatically on every startup, so teammates who pull new migrations and then start the server get them applied without thinking about it.

### Migration history (in order)

All live in `backend/alembic/versions/`:

1. `44254c85c0fd_create_employees_and_guests_tables.py` — base employees + guests.
2. `2026a1b2c3d4_add_auth_offers_belegung.py` — users, offers, daily briefings, staff, rooms.
3. `2026b4d5e6f7_conversations_and_password_policy.py` — LLM conversations + password rules.
4. `2026c5e6f7a8_add_tokens_invalidated_before.py` — JWT revocation column.
5. `2026d1a2b3c4_enrich_employees_hr_fields.py` — HR fields on employees.
6. `2026e2f3a4b5_create_calendar_tables.py` — general-purpose calendar.
7. `2026f3a4b5c6_create_cashier_tables.py` — POS domain (products, invoices, items, receipts).

Every migration must support `alembic downgrade -1` → `alembic upgrade head` as a clean round-trip.

## Fiskaly POS setup

First-time fiskaly setup (per environment) is documented end-to-end in `docs/fiskaly-setup.md`. The one-shot script `backend/scripts/fiskaly_setup.py` handles the TSS state transitions and client registration. Without fiskaly env vars configured, the cashier UI still works against a mock signer — usable for development, not for legal compliance.

## Frontend Tasks

The frontend currently relies on these extra packages for recent UI features:

- `@react-native-clipboard/clipboard`
- `html2canvas`
- `react-native-svg`

If you are on macOS and want to run the iOS app, remember to install the native pods after pulling dependency updates.

## Assistant Workflow Checklist

When changing assistant behavior, update all of the following together:

- `backend/app/llm/agent.py`
- `backend/app/llm/tools.py`
- `backend/app/routers/llm.py`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/src/api/client.ts`
- `docs/llm-integration.md`

## Documentation Maintenance Rules

The docs are treated as part of the codebase.

If a change affects one of these areas, the docs must be updated in the same change set:

- auth or roles,
- database schema,
- offer flow,
- occupancy flow,
- assistant behavior,
- frontend navigation,
- or runtime setup.

## What The Next Agent Should Read First

If someone is continuing work later, the shortest path is:

1. `docs/architecture.md`
2. `docs/platform-decisions.md`
3. `docs/backend.md`
4. `docs/frontend.md`
5. `docs/database.md`
6. `docs/llm-integration.md`
7. `docs/offers.md`
8. `docs/belegung.md`
9. `docs/calendar.md`
10. `docs/employees.md`
11. `docs/cashier.md`
12. `docs/fiskaly-setup.md`

## After `git pull` Checklist

When new commits are pulled into a working checkout:

1. If `backend/requirements.txt` changed → `cd backend && source venv/Scripts/activate && pip install -r requirements.txt`.
2. If `backend/alembic/versions/` has new files → `cd backend && alembic upgrade head`.
3. If `frontend/package.json` changed → `cd frontend && npm install`.
4. If `backend/.env.example` has new keys → add them to local `backend/.env` (`.env` is gitignored; every teammate maintains their own with their own `DATABASE_URL` and optional service keys).
5. Optionally re-run `python -m scripts.seed_sample_data` to pick up new sample records (idempotent).

`run-backend.bat` / `run-backend.sh` already do steps 1 and 2. Starting the backend via either script after a pull is the shortest path to a synced local environment.
