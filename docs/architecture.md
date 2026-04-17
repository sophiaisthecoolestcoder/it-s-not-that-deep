# Architecture Overview

This file is the short entry point for the active Bleiche codebase.

If you need implementation detail, use the deeper docs in this folder:

- [Platform decisions](platform-decisions.md)
- [Backend architecture](backend.md)
- [Frontend architecture](frontend.md)
- [Database guide](database.md)
- [LLM integration](llm-integration.md)
- [Offers workflow](offers.md)
- [Belegung workflow](belegung.md)
- [Operations guide](operations.md)

## System Shape

The active codebase is a monorepo with two production applications:

- `backend/` is the authoritative FastAPI + PostgreSQL service.
- `frontend/` is the React Native client that runs on web, iOS, and Android.

The backend owns persistence, authorization, offer export, and assistant tool execution.
The frontend owns navigation, rendering, localization, clipboard actions, and export UX.

## Main Request Flows

### Login Flow

1. The user logs in through the frontend.
2. The backend issues a JWT.
3. The frontend stores the token and fetches `GET /api/auth/me`.
4. The UI uses the returned role and module list to decide which screens to show.

### Offer Flow

1. The user opens the offer editor or the assistant creates an offer through the tool layer.
2. The backend validates the payload and writes the offer to PostgreSQL.
3. The frontend renders the list/editor and can export the offer as HTML.

### Belegung Flow

1. The user edits or reviews a daily briefing in the occupancy screens.
2. The backend stores one row per date with a JSONB payload.
3. The assistant can read daily briefing summaries and link back to the editor.

### Chat Flow

1. The frontend sends the full visible conversation thread with each assistant request.
2. The backend injects authenticated user context and role permissions into the prompt.
3. The model can answer directly or call tools.
4. The backend returns structured object references for the frontend to render.

## What Changed From The Old Docs

The historical SPA docs in the nested `bleiche-resort/` directory describe an older local-storage-based stack.

The active codebase now uses:

- FastAPI instead of the old SPA-only plan,
- PostgreSQL-backed persistence,
- assistant tool calling,
- localization,
- native/web-friendly clipboard and export helpers,
- and explicit user-context threading for the chat.

## Documentation Rule

If the code changes, update the relevant file in `docs/` immediately.

The docs are part of the codebase, not an afterthought.
