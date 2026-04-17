# Architecture Overview — Bleiche Resort & Spa Hotel Software

## Monorepo Structure

```
bleiche-it's not so deep!!!/
├── backend/          # Python FastAPI server
├── frontend/         # React Native mobile app
├── docs/             # Documentation
└── CLAUDE.md         # AI assistant project context
```

## Backend

### Technology Stack

| Layer        | Technology      | Rationale                                                                 |
|-------------|-----------------|---------------------------------------------------------------------------|
| Framework   | FastAPI         | Async-capable, auto-generates OpenAPI docs, strong type validation via Pydantic |
| ORM         | SQLAlchemy 2.0  | Mature, battle-tested ORM with excellent PostgreSQL support               |
| Migrations  | Alembic         | First-party SQLAlchemy migration tool, supports auto-generation           |
| Database    | PostgreSQL 18   | ACID-compliant, robust ENUM support, ideal for relational hotel data      |
| Validation  | Pydantic v2     | Schema validation with EmailStr, date types, and from_attributes support  |

### API Design

- RESTful JSON API under `/api/` prefix
- Full CRUD for employees and guests
- CORS enabled for mobile client access
- Health check endpoint at `/api/health`
- Pagination via `skip` and `limit` query parameters

### Project Layout

```
backend/
├── app/
│   ├── main.py          # FastAPI app, middleware, router registration
│   ├── database.py      # Engine, session, Base, get_db dependency
│   ├── models/          # SQLAlchemy ORM models
│   │   ├── employee.py  # Employee model with EmployeeRole enum
│   │   └── guest.py     # Guest model
│   ├── routers/         # API route handlers
│   │   ├── employees.py # /api/employees CRUD
│   │   └── guests.py    # /api/guests CRUD
│   └── schemas/         # Pydantic request/response schemas
│       ├── employee.py  # EmployeeCreate, EmployeeRead, EmployeeUpdate
│       └── guest.py     # GuestCreate, GuestRead, GuestUpdate
├── alembic/             # Database migration scripts
├── alembic.ini          # Alembic configuration
├── requirements.txt     # Python dependencies
└── .env                 # Database connection string (not committed)
```

## Frontend

### Technology Stack

| Layer      | Technology     | Rationale                                                    |
|-----------|----------------|--------------------------------------------------------------|
| Framework | React Native   | Cross-platform mobile (iOS/Android) from a single codebase  |
| Language  | TypeScript     | Type safety, better IDE support, fewer runtime errors         |

### Design System

The UI follows the **Bleiche Resort & Spa** brand identity:

- **Color palette**: Forest greens (#2C3E2D), sage (#6B7F5E), gold accents (#B8975A), warm cream backgrounds (#FAF8F5)
- **Typography**: Light weights, generous letter-spacing, uppercase labels — reflecting the luxury spa aesthetic
- **Components**: Card-based layout with subtle shadows, minimal borders

### Project Layout

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts      # API client with typed fetch wrapper
│   ├── screens/
│   │   └── HomeScreen.tsx  # Main dashboard screen
│   └── theme/
│       ├── colors.ts       # Brand color palette
│       ├── typography.ts   # Text style definitions
│       └── index.ts        # Theme barrel export
├── App.tsx                 # Root component
└── package.json
```

## Database

### Design Decisions

1. **PostgreSQL ENUM for roles**: Using a native PostgreSQL ENUM type (`employeerole`) for the employee role column. This enforces valid values at the database level, is more storage-efficient than a VARCHAR check constraint, and maps cleanly to Python's `enum.Enum`.

2. **Separate employees and guests tables**: Rather than a single "person" table with a type discriminator, employees and guests are separate tables because they have fundamentally different attributes (roles vs. booking-related fields) and will diverge further as the system grows.

3. **Timestamps on all tables**: Both tables include `created_at` and `updated_at` with timezone-aware server defaults for audit trails.

4. **Email as unique index**: Both tables enforce unique emails and index them for fast lookups during check-in and login flows.

5. **Nullable optional fields**: Fields like phone, address, and notes are nullable to allow partial registration — a guest can be added at check-in with minimal data and enriched later.

## Decisions Log

| Decision | Choice | Alternatives Considered | Reason |
|----------|--------|------------------------|--------|
| Monorepo | Single repo, two top-level dirs | Separate repos | Simplifies CI, shared docs, atomic cross-stack changes |
| API prefix | `/api/` | No prefix | Clean separation if a web frontend is added later |
| Employee roles | PostgreSQL ENUM | Lookup table, VARCHAR | Type safety, storage efficiency, simple enough for a fixed set |
| Migration tool | Alembic | Raw SQL, Django-style | First-party SQLAlchemy support, auto-generation |
| Mobile framework | React Native | Flutter, native | JavaScript ecosystem, large community, cross-platform |
