# Calendar

A general-purpose calendar domain. The same `calendar_events` table backs shifts, meetings, maintenance windows, holidays, personal reminders, and any future event type — distinguished by an `event_type` enum. Recurrence is stored as an RFC 5545 RRULE string on the master row and expanded at query time. Audience scoping supports global, role-based, and per-user visibility. Exceptions to a recurring series (cancel or modify a single occurrence) live in a dedicated table.

## Tables

All tables live in the `public` schema, prefixed with `calendar_` for visual grouping.

### `calendar_events`

One row per **series** (or per single event when `recurrence_rule` is null).

| column | type | notes |
|---|---|---|
| `id` | `serial` PK | |
| `title` | `varchar(200)` | required |
| `description` | `text` | |
| `event_type` | enum `calendareventtype` | `shift`, `meeting`, `maintenance`, `holiday`, `training`, `personal`, `reminder`, `other` (default `other`) |
| `starts_at` | `timestamptz` | required; the DTSTART of the series |
| `ends_at` | `timestamptz` | null = point-in-time event with no duration |
| `is_all_day` | `boolean` | |
| `recurrence_rule` | `text` | RFC 5545 RRULE body (e.g. `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`). `RRULE:` prefix is stripped server-side. |
| `recurrence_end_at` | `timestamptz` | denormalized UNTIL bound for indexable range queries |
| `audience_scope` | enum `calendaraudiencescope` | `global`, `role`, or `users` (default `users`) |
| `visible_to_roles` | `employeerole[]` | used when `audience_scope='role'` |
| `location` | `varchar(200)` | free text for now; future FK to a `locations` table |
| `created_by_user_id` | FK `users.id` ON DELETE SET NULL | |
| `created_at`, `updated_at` | `timestamptz` | |

Indexes: `starts_at`, `(event_type, starts_at)`, `created_by_user_id`.

### `calendar_event_participants`

Many-to-many join between events and users. Used when `audience_scope='users'`.

| column | notes |
|---|---|
| `event_id` | FK, cascade delete |
| `user_id` | FK, cascade delete |
| `role` | `organizer` \| `attendee` \| `observer` (default `attendee`) |
| `response_status` | `needs_action` \| `accepted` \| `declined` \| `tentative` (default `needs_action`) |
| PRIMARY KEY | `(event_id, user_id)` |

### `calendar_event_exceptions`

Per-occurrence overrides for a recurring series.

| column | notes |
|---|---|
| `event_id` | FK, cascade delete |
| `occurrence_at` | the original (unmodified) occurrence timestamp this exception applies to |
| `exception_type` | `cancelled` (skip the occurrence) or `modified` (override fields) |
| `override_starts_at`, `override_ends_at`, `override_title`, `override_description` | populated when `exception_type='modified'` |
| `reason` | free text |
| UNIQUE | `(event_id, occurrence_at)` |

## Recurrence expansion

`backend/app/services/calendar_expand.py` is the single expansion site:

- Uses `dateutil.rrule.rrulestr(rule, dtstart=event.starts_at)`.
- `rule.between(range_start, range_end, inc=True)` yields raw occurrence starts; end time is `start + duration` when `ends_at` is set on the master.
- Exceptions by `occurrence_at` are applied last: `cancelled` drops the occurrence; `modified` overrides start/end/title/description on the returned `EventOccurrence`.

Expansion is always done on read. We do not materialise occurrences, so editing the series simply re-expands; no "drift" between the stored series and its instances.

## Access model

`GET /api/calendar/events?from=…&to=…` filters rows by audience before expansion:

- **Admins** see everything.
- For non-admins, keep the row if any of:
  - `audience_scope = 'global'`
  - `audience_scope = 'role'` AND the caller's role is in `visible_to_roles`
  - `audience_scope = 'users'` AND the caller is in `calendar_event_participants`
  - the caller is the event creator (so you can always see what you scheduled)

Admins can pass `user_id=<id>` to query "what does this user see" (impersonation for calendar purposes only).

## Endpoints

- `GET /api/calendar/events?from=&to=&event_type=` → `EventOccurrence[]`
- `GET /api/calendar/events/{id}` → `EventRead` (master row + participants + exceptions)
- `POST /api/calendar/events` → `EventRead` (creator is auto-added as participant when scope=users and no participants provided)
- `PATCH /api/calendar/events/{id}` → `EventRead` (creator / admin / manager)
- `DELETE /api/calendar/events/{id}` → 204 (cascades to participants + exceptions)
- `POST /api/calendar/events/{id}/exceptions` → `ExceptionRead`
- `DELETE /api/calendar/events/{id}/exceptions/{exception_id}` → 204

Max range is 366 days. Events with an invalid RRULE silently expand to zero occurrences.

## Future integrations

- **Locations**: the `location` column will become a FK once a `locations` table lands.
- **Shift-specific HR data**: clock-in/out, pay rate, overtime would live in a sidecar `calendar_shift_details` table keyed by `event_id`, not as nullable columns on `calendar_events`.
- **`RANGE=THISANDFUTURE` series splits**: not supported in v1. Editing a series applies to all occurrences including historical ones; to "change going forward only" create a new series with `starts_at = <cutover>` and cap the old one via `recurrence_end_at`.
- **External sync**: iCal export and inbound calendar imports are out of scope now.

## Seed data

`backend/scripts/seed_sample_data.py` inserts three illustrative rows:

1. **Weekly team meeting** — `event_type=meeting`, `scope=role` (managers + admin), Wednesdays 09:00–10:00, with one `cancelled` exception.
2. **Reception early shift** — `event_type=shift`, `scope=users` with the reception user as sole participant, Mon–Fri 07:00–15:00.
3. **Heating maintenance window** — `event_type=maintenance`, `scope=global`, one-off, 30 days from seeding.
