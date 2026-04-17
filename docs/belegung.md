# Belegung / Daily Operations

## Overview

The Belegung area stores the daily operational snapshot for the hotel.

It combines occupancy data, staff names, and supporting room information.

## Main Files

Backend:

- `backend/app/models/belegung.py`
- `backend/app/schemas/belegung.py`
- `backend/app/routers/belegung.py`

Frontend:

- `frontend/src/screens/belegung/BelegungEditorScreen.tsx`
- `frontend/src/screens/belegung/DaysListScreen.tsx`
- `frontend/src/screens/belegung/StaffManagerScreen.tsx`
- `frontend/src/api/client.ts`

## Data Model

### DailyBriefing

The daily briefing is stored as one row per date.

Fields:

- `date`
- `data` JSON payload
- timestamps

The JSON payload contains the full occupancy editor structure.

### StaffMember

A simple supporting table used for selector data in the occupancy editor.

Fields:

- `name`
- timestamps

### Room

Static room inventory data.

Fields:

- `number`
- `category`
- `floor`

## Route Behavior

### Days List

`GET /api/belegung/days`

Returns the saved daily briefings, newest first.

### Single Day

`GET /api/belegung/days/{day}`

Returns one day record by date.

### Upsert Day

`PUT /api/belegung/days/{day}`

Creates or updates a day record.

The path date and the payload date must match.

### Staff Management

`GET /api/belegung/staff`
`POST /api/belegung/staff`
`DELETE /api/belegung/staff/{staff_id}`

### Rooms

`GET /api/belegung/rooms`

Returns the current room inventory.

## Assistant Integration

The assistant can inspect daily briefing data through tools.

It can also produce references for a specific date so the frontend can open the occupancy editor directly.

## Operational Notes

This area is meant for daily hotel operations, not just archival data.

It should stay easy to edit, easy to scan, and easy to export or reference from the assistant.

## Documentation Rule

Any changes to the occupancy schema should update:

- the backend model,
- the backend schema,
- the frontend screens,
- the Belegung-related tool output,
- and `docs/database.dbml`.
