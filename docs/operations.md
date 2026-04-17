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

- `GROQ_API_KEY`
- `GROQ_MODEL`

The backend now fails fast if required variables are missing.

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
alembic upgrade head
python -m scripts.seed
```

The seed script is used to create the default staff accounts and reference data.

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
