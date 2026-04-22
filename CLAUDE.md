# Bleiche Resort & Spa — Hotel Software

## Project Overview

This is the active Bleiche Resort & Spa operations platform.

The codebase contains:

- `backend/` — FastAPI + PostgreSQL + SQLAlchemy + Alembic
- `frontend/` — React Native + TypeScript platform app for web/iOS/Android (authenticated staff workflows)
- `site/` — Astro + React + Tailwind public marketing website (anonymous visitors at `www.bleiche-resort.de`)
- `docs/` — authoritative documentation for the active codebase. Historical artifacts (the hotel's real Word / Excel templates, earlier task briefs) live in `docs/_reference/`.

The two frontends share the same backend but hit different namespaces: `frontend/` uses the authenticated `/api/*` routes; `site/` uses only the unauthenticated `/api/public/*` routes (rate-limited, opt-in data only). See `docs/site.md`.

## Read These First

- `docs/architecture.md`
- `docs/platform-decisions.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/database.md`
- `docs/llm-integration.md`
- `docs/offers.md`
- `docs/belegung.md`
- `docs/calendar.md`
- `docs/employees.md`
- `docs/cashier.md`
- `docs/fiskaly-setup.md`
- `docs/site.md`
- `docs/operations.md`

## Current Runtime Picture

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend (platform)

```bash
cd frontend
npm start
```

Web build: `npm run web`

### Site (public marketing website)

```bash
cd site
npm install       # first time only
npm run dev       # → http://localhost:4321
```

Or from repo root: `run-site.bat` (Windows) / `run-site.sh` (macOS/Linux).

### All three at once

`run-all.bat` / `run-all.sh` at the repo root open three terminal windows/tabs — backend (`:8000`), platform frontend (`:3333`), and site (`:4321`) — each running its own dev server. The platform and the site are **independent apps**; starting the platform does not start the site.

## Database

- PostgreSQL database: `bleiche_hotel` (connection string in `backend/.env` as `DATABASE_URL`)
- Migrations live in `backend/alembic/versions/` and **are committed to git**. Every environment (local, staging, prod, any teammate's laptop) pulls and applies the same migrations.
- **Apply migrations:** `cd backend && alembic upgrade head`
- **Round-trip test:** `alembic downgrade -1 && alembic upgrade head` (every migration in this repo must support both directions)
- **Seed optional sample data:** `cd backend && python -m scripts.seed_sample_data` (idempotent — safe to re-run)
- **Seed the minimum required users + rooms:** `cd backend && python -m scripts.seed`
- When a SQLAlchemy model changes, the matching Alembic migration, `docs/database.dbml`, and `docs/database.md` must all be updated in the same change.

## After `git pull` — the LLM agent's checklist

When new commits are pulled into a working checkout (anyone's laptop), an LLM agent helping with this repo should verify environment sync before running anything:

1. **Backend deps:** if `backend/requirements.txt` changed → `cd backend && source venv/Scripts/activate && pip install -r requirements.txt` (use `venv/bin/activate` on macOS/Linux).
2. **Database migrations:** if `backend/alembic/versions/` has new files → `cd backend && alembic upgrade head`.
3. **Frontend deps:** if `frontend/package.json` or `frontend/package-lock.json` changed → `cd frontend && npm install`.
4. **Site deps:** if `site/package.json` or `site/package-lock.json` changed → `cd site && npm install`.
5. **Environment variables:** if `backend/.env.example` or `site/.env.example` grew new keys → copy them into the local `.env` files (preserving existing values). `.env` files are gitignored by design; every teammate maintains their own.
6. **Seed:** if new rows in `backend/scripts/seed_sample_data.py` are relevant, re-run it — the script is idempotent.

The `run-backend.bat` / `run-backend.sh` wrappers already execute steps 1 and 2 on every startup, so using them covers most teammates automatically. An LLM invoking `uvicorn app.main:app` directly skips that and must run the checks above first.

## Key Conventions

- API routes are prefixed with `/api/`
- Employee roles are stored as the PostgreSQL `employeerole` enum
- Offer salutation and status values are stored as native PostgreSQL enums
- Pydantic schemas use `model_config = {"from_attributes": True}` for ORM compatibility
- The DBML diagram in `docs/database.dbml` must always reflect the actual schema
- Brand colors, chat-specific tokens, and typography are centralized in `frontend/src/theme/`
- LLM behavior is defined in the backend, not in the frontend
- Conversation history must be passed explicitly to the assistant route

## Windows And Mac Notes

- Use `run-backend.bat` and `run-frontend.bat` for local Windows startup when possible.
- The frontend includes web-only helpers for export and download behavior.
- Native clipboard support may require a pod install on macOS when iOS dependencies change.

## Documentation Rule

If code changes affect architecture, schema, workflows, or assistant behavior, update the matching file in `docs/` in the same change.
