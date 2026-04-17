# Bleiche Resort & Spa — Hotel Software

## Project Overview
Custom hotel management software for **Bleiche Resort & Spa** (bleiche.de), a luxury wellness resort in the Spreewald region.

## Monorepo Structure
- `backend/` — Python FastAPI server (PostgreSQL, SQLAlchemy, Alembic)
- `frontend/` — React Native mobile app (TypeScript)
- `docs/` — Architecture documentation and DBML schema

## Quick Start

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

## Database
- PostgreSQL database: `bleiche_hotel`
- Connection: `postgresql://sophiaclausing@localhost:5432/bleiche_hotel`
- Migrations: `cd backend && alembic upgrade head`

## Key Conventions
- API routes are prefixed with `/api/`
- Employee roles are enforced via PostgreSQL ENUM (`employeerole`)
- Pydantic schemas use `model_config = {"from_attributes": True}` for ORM compatibility
- DBML diagram in `docs/database.dbml` must always reflect the current database structure
- Brand colors and typography are defined in `frontend/src/theme/`

## Architecture Docs
See `docs/architecture.md` for detailed architectural decisions.
