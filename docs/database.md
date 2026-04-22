# Database

## Overview

The current application uses PostgreSQL as the source of truth for all persisted business data.

The schema is defined by SQLAlchemy models in `backend/app/models/` and migrations in `backend/alembic/versions/`.

The canonical visual schema should always match `docs/database.dbml`.

## Schema Summary

### 1. `users`

Application login and authorization table.

Key fields:

- `username`
- `password_hash`
- `role`
- `employee_id`
- `is_active`
- `must_change_password`
- `tokens_invalidated_before` (nullable `timestamptz`)
- timestamps

Notes:

- `role` uses the PostgreSQL `employeerole` enum.
- `employee_id` is optional and links login identity to a staff record when needed.
- `tokens_invalidated_before` is bumped to `now()` on password change. `get_current_user` rejects any JWT whose `iat` is earlier, so rotating a password effectively signs the user out of all other sessions.

### 2. `employees`

Staff directory table. Also the source of truth for the HR "Employees overview" admin screen.

Key fields:

- `first_name`, `last_name`
- `email`
- `phone`
- `role`
- `department`, `position`
- `employment_started_on`, `employment_ended_on`
- `active` (defaults to `true`; flips to `false` when someone leaves)
- `notes`
- timestamps

Notes:

- `email` is unique.
- `role` uses the PostgreSQL `employeerole` enum.
- This table is the basis for user-role assignment and assistant access rules.
- `department` is free text for now; can graduate to an enum once vocabulary stabilizes.

### 3. `guests`

Guest profile table.

Key fields:

- `first_name`
- `last_name`
- `email`
- `phone`
- `date_of_birth`
- `address`
- `nationality`
- `notes`
- timestamps

Notes:

- guest records are separate from employees because the data shape is fundamentally different.
- guest detail screens can be opened from assistant references.

### 4. `offers`

Offer and quotation table.

Key fields:

- `salutation`
- client contact data
- `offer_date`
- `arrival_date`
- `departure_date`
- room and pricing fields
- `employee_name`
- `notes`
- `status`
- timestamps

Notes:

- `salutation` uses the PostgreSQL `salutation` enum with the exact values `Herr`, `Frau`, `Familie`.
- `status` uses the PostgreSQL `offerstatus` enum with the values `draft`, `sent`, `accepted`, `declined`.
- The backend now maps enum values explicitly so the database receives the exact labels defined by the migration.
- Offers can be duplicated and exported as HTML.

### 5. `daily_briefings`

Per-day occupancy snapshot table.

Key fields:

- `date`
- `data` (JSONB)
- timestamps

Notes:

- this table stores one record per day,
- the JSON payload holds the occupancy editor data,
- and the assistant can read daily briefing summaries through a tool.

The `data` blob is shaped by the frontend's `DailyData` type at `frontend/src/types/belegung.ts`. At minimum the backend relies on the following top-level keys being present (arrays may be empty but should exist):

- `arrivals` — array of guest rows arriving on this date
- `stayers` — array of guest rows remaining on this date
- `header`, `stats`, `weeklyOccupancy` — per-day metadata blocks shown in the editor
- `infoSection`, `fruehschicht`, `spaetschicht`, `kueche`, `veranstaltungenBankett`, `englischeMenuekarten` — free-text fields
- `fruehOps`, `spaetOps`, `kuecheOps`, `tischwuenscheOps` — operational entries
- `kuecheLaktose`, `kuecheGluten`, `kuecheAllergien`, `kuecheUnvertraeglichkeiten`, `kuecheSonstiges` — kitchen dietary lists
- `geburtstage`, `housekeeping`, `empfangChauffeure`, `landtherme`, `newspapers`, `newGuests`, `freeRooms` — auxiliary lists

Size and depth are enforced on write (`512 KiB` and `12` levels — see `app/schemas/belegung.py`). The LLM `get_daily_briefing` tool only exposes counts, not the raw blob.

### 8. `conversations` and `conversation_messages`

Server-side storage for LLM assistant chats.

`conversations`:

- `id`, `user_id` (FK to `users` with `ON DELETE CASCADE`), `title`, `created_at`, `last_active_at`

`conversation_messages` (append-only):

- `id`, `conversation_id` (FK with `ON DELETE CASCADE`), `role` (`user`/`assistant`/`tool`), `content`, `tool_call_id`, `tool_name`, `tool_calls` (JSONB), `refs` (JSONB), `prompt_tokens`, `completion_tokens`, `cost_micro_cents`, `model`, `created_at`
- composite index `(conversation_id, created_at)` for history lookups
- no `updated_at` — messages are never edited in place; deleting the owning conversation cascades

`refs` carries the structured object references the assistant surfaced (offers, guests, employees, daily briefings). The LLM router reads recent `refs` and feeds a compact summary into the next system prompt so follow-up questions can resolve past mentions without replaying tool payloads.

### 6. `staff_members`

Simple supporting lookup table used for occupancy staff dropdowns.

Key fields:

- `name`
- timestamps

### 7. `rooms`

Physical room inventory table.

Key fields:

- `number`
- `category`
- `floor`

### 8. `calendar_events`, `calendar_event_participants`, `calendar_event_exceptions`

General-purpose calendar. Shifts, meetings, maintenance windows, holidays, personal reminders — all share `calendar_events`, distinguished by `event_type`. See `docs/calendar.md` for the full data model, recurrence handling (RRULE strings, application-layer expansion), audience scoping (`global` / `role` / `users`), and exception semantics.

## Enums

### `employeerole`

Current values:

- `manager`
- `receptionist`
- `housekeeper`
- `spa_therapist`
- `chef`
- `waiter`
- `concierge`
- `maintenance`
- `admin`

### `salutation`

Current values:

- `Herr`
- `Frau`
- `Familie`

### `offerstatus`

Current values:

- `draft`
- `sent`
- `accepted`
- `declined`

### Calendar enums

- `calendareventtype`: `shift`, `meeting`, `maintenance`, `holiday`, `training`, `personal`, `reminder`, `other`
- `calendaraudiencescope`: `global`, `role`, `users`
- `calendarparticipantrole`: `organizer`, `attendee`, `observer`
- `calendarparticipantstatus`: `needs_action`, `accepted`, `declined`, `tentative`
- `calendarexceptiontype`: `cancelled`, `modified`

## Migration Notes

The current baseline migration is `backend/alembic/versions/2026a1b2c3d4_add_auth_offers_belegung.py`.

It creates:

- `users`
- `offers`
- `daily_briefings`
- `staff_members`
- `rooms`

The earlier migration `44254c85c0fd_create_employees_and_guests_tables.py` creates:

- `employees`
- `guests`

Later migrations:

- `2026c5e6f7a8_add_tokens_invalidated_before.py` — adds `users.tokens_invalidated_before` for JWT revocation on password change.
- `2026d1a2b3c4_enrich_employees_hr_fields.py` — adds HR fields to `employees` (`department`, `position`, `employment_started_on`, `employment_ended_on`, `active`, `notes`).
- `2026e2f3a4b5_create_calendar_tables.py` — creates `calendar_events`, `calendar_event_participants`, `calendar_event_exceptions` and their enums.

## Relationship Notes

Important relationships:

- `users.employee_id -> employees.id` with `ON DELETE SET NULL`
- `employees.role` and `users.role` both use `employeerole`
- `offers` and `guests` are intentionally independent tables
- `calendar_events.created_by_user_id -> users.id` with `ON DELETE SET NULL`
- `calendar_event_participants.event_id -> calendar_events.id` / `user_id -> users.id`, both cascade
- `calendar_event_exceptions.event_id -> calendar_events.id` cascades
- `calendar_events.visible_to_roles` is an array of `employeerole`; used when `audience_scope = 'role'`

## Operational Guidance

- If a model changes, update the Alembic migration and this document.
- If an enum changes, update the SQLAlchemy model, the migration, and this document together.
- If new persistent objects are introduced for the assistant, they should be added here and to the DBML file.
