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
- timestamps

Notes:

- `role` uses the PostgreSQL `employeerole` enum.
- `employee_id` is optional and links login identity to a staff record when needed.

### 2. `employees`

Staff directory table.

Key fields:

- `first_name`
- `last_name`
- `email`
- `phone`
- `role`
- timestamps

Notes:

- `email` is unique.
- `role` uses the PostgreSQL `employeerole` enum.
- This table is the basis for user-role assignment and assistant access rules.

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

## Relationship Notes

Important relationships:

- `users.employee_id -> employees.id` with `ON DELETE SET NULL`
- `employees.role` and `users.role` both use `employeerole`
- `offers` and `guests` are intentionally independent tables

## Operational Guidance

- If a model changes, update the Alembic migration and this document.
- If an enum changes, update the SQLAlchemy model, the migration, and this document together.
- If new persistent objects are introduced for the assistant, they should be added here and to the DBML file.
