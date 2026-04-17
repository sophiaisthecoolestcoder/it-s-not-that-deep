# Platform Decisions

This document explains why the codebase is shaped the way it is and which constraints the current implementation is optimizing for.

## 1. Project Shape

Bleiche is a monorepo with three practical layers:

- `backend/` for the FastAPI service and PostgreSQL persistence.
- `frontend/` for the React Native app that runs on web, iOS, and Android.
- `docs/` for the documentation that should stay aligned with the code.

The repo also contains a nested `bleiche-resort/` directory that reflects an older SPA-based version of the product. The active implementation is the root `backend/` and `frontend/` pair.

## 2. Why This Stack

### Backend

- FastAPI gives typed request validation, dependency injection, and automatic OpenAPI docs.
- SQLAlchemy keeps the ORM layer explicit and compatible with PostgreSQL.
- Alembic is the migration source of truth.
- PostgreSQL is used because the system depends on real relational constraints and native ENUM types.

### Frontend

- React Native is used because the same screens need to work on web, iOS, and Android.
- TypeScript is used everywhere in the frontend for safer refactors and stronger API contracts.
- Web support is not a side feature. The web build is a primary target and is used for local development and browser workflows.

### LLM Integration

- The assistant must be tool-driven for facts and mutations.
- The model is never treated as a database. It can phrase answers, but the backend owns truth.
- Conversation history is passed explicitly, because the model has no magical memory between requests.

## 3. Design Principles

### 3.1 Centralized Source of Truth

- Backend models define the persisted shape.
- Pydantic schemas define request and response contracts.
- Frontend TypeScript types mirror the public API.
- Documentation should describe the actual implementation, not an aspirational one.

### 3.2 Role-Aware Access

Access is controlled at two levels:

- The UI only shows modules available to the current user role.
- The backend still enforces authorization for every request and every LLM tool.

This matters because the assistant can only call tools that the current role allows.

### 3.3 Explicit Conversation Context

The assistant receives:

- the current user question,
- the prior conversation turns,
- the authenticated user context,
- and the current role/tool permissions.

That is the minimum required for realistic multi-turn behavior.

### 3.4 Stable, Boring Infrastructure

The codebase favors simple, inspectable mechanisms over clever abstractions:

- direct fetch wrappers instead of a heavy client framework,
- straightforward route handlers instead of a custom RPC layer,
- explicit document exports instead of hidden background jobs,
- and predictable file-based documentation.

## 4. Windows And Mac Considerations

The project is developed on Windows, but the frontend must also work on macOS and iOS.

Implications:

- path handling in tooling must tolerate Windows separators,
- the browser path must not depend on Node-only APIs,
- native clipboard support requires platform-aware fallback handling,
- image export is web-only and must fail cleanly on native.

## 5. What Should Stay True

- Every new capability should be documented in `docs/`.
- Every schema change should update `docs/database.dbml`.
- Every assistant tool or prompt change should update `docs/llm-integration.md`.
- Every user-facing module or workflow change should update the module-specific docs.
- If the frontend changes how it renders or exports something, docs should describe that workflow as well.
