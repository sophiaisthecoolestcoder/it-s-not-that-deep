# Employees (HR)

Admin-facing staff directory. Distinct from `staff_members` (the Belegung dropdown list used only for the daily occupancy sheet).

## Schema

Table `employees` — see `docs/database.dbml` for the authoritative shape. HR-relevant columns:

| column | type | notes |
|---|---|---|
| `first_name`, `last_name` | `varchar(100)` | required |
| `email` | `varchar(255)` | required, unique |
| `phone` | `varchar(30)` | |
| `role` | enum `employeerole` | one of admin/manager/receptionist/housekeeper/spa_therapist/chef/waiter/concierge/maintenance |
| `department` | `varchar(100)` | free text (e.g. "Reception", "Housekeeping", "Kitchen", "Spa", "Service", "Maintenance", "Administration") |
| `position` | `varchar(150)` | specific job title (e.g. "Senior Rezeptionist") |
| `employment_started_on` | `date` | |
| `employment_ended_on` | `date` | null while active |
| `active` | `boolean` not null, default `true` | flips to false when the employee leaves |
| `notes` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

`User.employee_id` optionally links a login account to one employee row.

## Access control

Read side is any authenticated user (needed for LLM tools that look up a colleague's contact details). Write side (POST / PATCH / DELETE) requires `admin` or `manager`. The admin **HR view** in the sidebar is gated on `user.modules.includes('employees')` — this module is granted to `admin` and `manager` by `MODULE_ACCESS` in `backend/app/auth.py`.

## Endpoints

- `GET /api/employees/?department=&role=&active=&search=&skip=&limit=` → `EmployeeRead[]`
- `GET /api/employees/{id}` → `EmployeeRead`
- `POST /api/employees/` → `EmployeeRead` (admin/manager)
- `PATCH /api/employees/{id}` → `EmployeeRead` (admin/manager)
- `DELETE /api/employees/{id}` → 204 (admin/manager)

`search` is a case-insensitive `ILIKE` match against `first_name`, `last_name`, `email`, and `position`.

## Frontend URLs

- `/employees` — list with filters (department, role, active state, text search)
- `/employees/:id` — profile in **view** mode
- `/employees/:id/edit` — profile in **edit** mode

Pattern mirrors offers: list → row click loads view, Edit button flips URL to `/:id/edit`, Save/Discard returns to view.

## Seed data

`backend/scripts/seed_sample_data.py` inserts ~15 realistic records spanning all departments, employment start dates from 2017–2024, and one inactive entry to exercise the filter UI.
