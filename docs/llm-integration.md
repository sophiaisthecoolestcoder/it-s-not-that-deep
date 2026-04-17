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

### 2. Conversation Is Explicit

The model has no persistent memory of prior turns.

To support follow-up questions, the frontend sends the visible chat thread and the backend injects that history into the prompt on every request.

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

1. The frontend app sends the current question and the current message thread to `POST /api/llm/ask`.
2. The backend authenticates the user and builds the user-context block.
3. `LLMAgent` builds the system prompt and passes prior conversation turns into the model.
4. The model can either answer directly or request one or more tool calls.
5. Tool results are executed by `backend/app/llm/tools.py`.
6. The backend extracts object references from tool responses.
7. The frontend renders the answer and reference cards.

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

## Conversation Reload

The frontend includes a regenerate/reload action for the latest assistant message.

It replays the last user turn with the prior conversation context, which is useful when the user wants a different phrasing or a second attempt at tool selection.

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
