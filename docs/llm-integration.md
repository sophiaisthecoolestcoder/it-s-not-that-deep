# LLM Integration

## Overview

The assistant is a Groq-backed LLM layer that sits on top of the real application data. It is designed to answer questions, fetch records, and create offers through tool calls.

The assistant is not a separate product. It is another interface into the same backend system that powers the rest of the app.

## Main Files

- `backend/app/llm/agent.py`
- `backend/app/llm/tools.py`
- `backend/app/routers/llm.py`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/src/api/client.ts`

## Core Principles

### 1. No Hallucinated Facts

The model should not invent hotel data.

If a request depends on real guests, employees, offers, or occupancy data, the backend should force a tool-backed answer.

### 2. Conversation Is Persisted Server-Side

Conversations live in Postgres (`conversations` + `conversation_messages`). The frontend sends only the current `question` and, if the user is continuing an existing thread, the `conversation_id`. The backend is the source of truth for history — it rebuilds the recent prompt context by reading the DB (never trusting client-sent turns).

To keep follow-up questions coherent, the backend additionally summarises *object references produced in earlier turns* (e.g. "offer id=42: Offer #42 Müller (draft | 2026-05-03)") and injects that compact list into the system prompt. Raw tool payloads from prior turns are not replayed — only their resolved references are carried forward.

### 3. User Context Is Explicit

Every assistant request gets a small authenticated user context block:

- username
- display name, if linked to an employee profile
- email, if available
- role

This helps the model tailor answers without guessing who is speaking.

### 4. The Backend Controls Access

The UI does not decide which tools are allowed.

`backend/app/auth.py` defines role-to-tool permissions and the agent filters tool schemas accordingly.

## Request Flow

1. The frontend sends `{ question, conversation_id? }` to `POST /api/llm/ask`. No client-side history is sent.
2. The backend authenticates the user, applies the per-user and daily rate limits, and either resolves or creates the target `Conversation` (scoped to `user_id`).
3. Prior `{role, content}` turns and prior object `refs` are loaded from `conversation_messages` before the new user turn is persisted.
4. `LLMAgent` builds the system prompt (user context + allowed tools + prior-refs summary), seeds the model with the history, and adds the current user question.
5. The model can either answer directly or request tool calls. Tool schemas are filtered to match the caller's role; `tool_choice="auto"` lets the model decide per turn.
6. Tool calls are executed by `backend/app/llm/tools.py`. Duplicate calls *within the same iteration* are rejected; across iterations, re-calls are allowed so the model can retry after new context arrives.
7. Object references surfaced from tool responses are attached to the assistant's `conversation_messages` row as JSONB (`refs`) so they're available to future turns.
8. The frontend renders the answer and reference cards, and persists the active `conversation_id` to `localStorage` so a reload resumes the thread.

## Tooling Model

### Read Tools

- list guests
- get guest by id or by partial name
- search guest notes
- list employees
- get employee by id or by role
- list offers
- get offer by id
- list daily briefings
- get daily briefing by date

### Mutation Tools

- create offer

The assistant may be expanded later, but the guiding rule is simple: every mutation must be intentionally exposed as a tool and filtered by role.

## Tool Availability By Role

The assistant role filter is defined in `backend/app/auth.py`.

High-level behavior:

- admins and managers have the broadest tool access,
- receptionists can create offers and work with guests/offers/daily briefings,
- concierge is limited mainly to guest and daily briefing information,
- other employee roles do not automatically get assistant access to all objects.

If a role cannot use a requested tool, the assistant should explain that the role is not allowed to perform the action.

## Assistant Response Shape

The backend returns a structured payload:

- `question`
- `answer`
- `role`
- `tools_available`
- `references`

References are used by the frontend to render clickable cards for offers, guests, employees, and daily briefings.

## Object References

Tool results can generate structured references of the form:

- object type
- object id
- title
- optional subtitle
- available actions

Supported object types:

- `offer`
- `guest`
- `employee`
- `daily_briefing`

Supported actions:

- `open`
- `download`

## Offer Creation Flow

Offer creation is conversational.

The model can ask for missing details first, then create the offer once enough information exists.

Important implementation details:

- `create_offer` accepts the same fields as the offer API schema.
- Salutation values must match `Herr`, `Frau`, or `Familie`.
- Status values must match `draft`, `sent`, `accepted`, or `declined`.
- The backend now maps enum values explicitly so the database write path is stable.

## Conversation Resume and Regenerate

- **Resume:** the most recently used `conversation_id` is kept in `localStorage` (`bleiche_active_conversation_id`). On chat mount the frontend calls `GET /api/conversations/{id}`, hydrates the message list, and continues the thread. A dedicated "History" screen (`ConversationsListScreen`) lists all of the user's conversations and lets them resume or delete any of them.
- **Regenerate:** the latest assistant message has a reload button. Clicking it re-sends the preceding user turn with the existing `conversation_id` and replaces the assistant bubble in-place with the new answer. The second call benefits from the same prior-refs context the original call had, plus any new DB state.

## Temporary Export Features

The chat currently supports temporary convenience actions:

- copy a single message,
- copy the whole conversation,
- copy code blocks,
- export the conversation as an image on web,
- and download offer HTML.

These features are intentionally lightweight and are documented so they can be removed later if the product direction changes.

## Operational Guidance

If the assistant behavior changes, update the docs alongside the code.

At minimum, check these files:

- `backend/app/llm/agent.py`
- `backend/app/llm/tools.py`
- `backend/app/routers/llm.py`
- `frontend/src/screens/ChatScreen.tsx`
- `frontend/src/api/client.ts`
- `backend/app/auth.py`
