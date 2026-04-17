# Bleiche Resort & Spa — Hotel Software

## Project Overview

This is the active Bleiche Resort & Spa operations platform.

The codebase contains:

- `backend/` — FastAPI + PostgreSQL + SQLAlchemy + Alembic
- `frontend/` — React Native + TypeScript client for web/iOS/Android
- `docs/` — authoritative documentation for the active codebase

There is also a nested `bleiche-resort/` directory that contains older reference material from a previous frontend direction. The root `backend/` and `frontend/` folders are the current source of truth.

## Read These First

- `docs/architecture.md`
- `docs/platform-decisions.md`
- `docs/backend.md`
- `docs/frontend.md`
- `docs/database.md`
- `docs/llm-integration.md`
- `docs/offers.md`
- `docs/belegung.md`
- `docs/operations.md`

## Current Runtime Picture

### Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm start
```

Web build: `npm run web`

## Database

- PostgreSQL database: `bleiche_hotel`
- Migrations: `cd backend && alembic upgrade head`
- Seed script: `cd backend && python -m scripts.seed`

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
