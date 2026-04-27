# Locations, maps, and the polygon editor

Hierarchical places (building → floor → zone → room → point-of-interest) plus a
web-based polygon editor that associates those places with painted regions on
floor-plan images.

## Goals

- Give staff a single source of truth for **what exists** (tree of locations)
  separate from **where it is visually** (shapes on a map layer). Either side
  can change without the other falling out of sync.
- Support the common "multiple layers per map" shape — in our case one map,
  four layers, one per floor — without hardcoding "floor" as a concept.
- Let any location have **multiple shapes on the same layer** (e.g. a suite that
  occupies two rooms, or a zone split across a corridor).
- Keep drawings editable: extracted floor plans are rendered as PNGs, but the
  model also accepts raw SVG so future layers can be styled via CSS.

## Data model

Four tables, all in `backend/alembic/versions/202705b2c3d4_*.py`:

| Table             | Key columns                                                                                        | Notes |
| ----------------- | -------------------------------------------------------------------------------------------------- | ----- |
| `locations`       | `id`, `parent_id` (self-FK, `RESTRICT`), `source_id` (UNIQUE), `name`, `description`, `environment`, `category`, `room_number`, `sort_order`, timestamps | Hierarchy is one `parent_id`. `source_id` carries an external UUID so the canonical JSON export round-trips across databases. `environment` ∈ {`indoor`, `outdoor`}; `category` ∈ {`building`, `floor`, `room`} (extensible — validated in Pydantic, no DB enum). |
| `maps`            | `id`, `name`, `description`, `sort_order`, timestamps                                              | Container for one or more layers. |
| `map_layers`      | `id`, `map_id` (CASCADE), `name`, `image_url`, `svg_content`, `width`, `height`, `sort_order`     | One of `image_url` / `svg_content` must be set. `width`/`height` is the native pixel size — shape coordinates live in this space. |
| `location_shapes` | `id`, `location_id` (CASCADE), `layer_id` (CASCADE), `points` JSONB, `style` JSONB, `label`, timestamps | `points`: `[[x, y], [x, y], ...]` in the layer's native coordinate system. Multiple shapes per `(location, layer)` are allowed. |

### Tree semantics

- Delete is `RESTRICT`. `DELETE /api/locations/{id}` returns `409` if the node
  has children; pass `?force=true` to wipe the whole subtree (shapes follow via
  `CASCADE`).
- Reparenting (`PATCH /api/locations/{id}` with `parent_id`) runs a recursive
  CTE to reject moves that would form a cycle.
- The tree endpoint uses a second recursive CTE for the `/subtree` variant; flat
  reads use an ordinary query sorted by `(sort_order, name)`.

### Shape coordinates

Coordinates are stored in the **native pixel / viewBox space of the layer** —
not normalized. The frontend overlays an `<svg viewBox="0 0 width height">`
directly on top of the image, so shapes render without conversion. If a layer's
background image is swapped for one at a different resolution, the
`width`/`height` should be updated in the same migration; polygons can then be
re-scaled client-side with a one-off transform.

## Backend API

Mounted at `/api`; writes require `ADMIN` or `MANAGER`.

```
GET    /api/locations?parent_id=      flat list, optionally filtered
GET    /api/locations/tree            full nested tree
GET    /api/locations/{id}/subtree    nested subtree rooted at id
POST   /api/locations                 create
PATCH  /api/locations/{id}            update (parent_id change triggers cycle check)
DELETE /api/locations/{id}?force=     409 if children exist; force=true wipes subtree

GET    /api/maps                      list (with nested layers)
GET    /api/maps/{id}
POST   /api/maps
PATCH  /api/maps/{id}
DELETE /api/maps/{id}

GET    /api/map-layers?map_id=
GET    /api/map-layers/{id}
POST   /api/map-layers
PATCH  /api/map-layers/{id}
DELETE /api/map-layers/{id}

GET    /api/map-layers/{id}/shapes    list shapes on this layer
PUT    /api/map-layers/{id}/shapes    bulk replace — single source of truth per save

GET    /api/location-shapes?location_id=&layer_id=
GET    /api/location-shapes/{id}
POST   /api/location-shapes
PATCH  /api/location-shapes/{id}
DELETE /api/location-shapes/{id}
```

### Module access

Added `locations` to `ALL_MODULES` in `backend/app/auth.py`. Roles with view
access: admin, manager, receptionist, concierge, housekeeper, spa_therapist,
maintenance. Writes are further restricted by `require_roles(ADMIN, MANAGER)`
on the mutating endpoints.

## Frontend

All web-first, targeting `Platform.OS === 'web'`. Native renders a stub
fallback for screens whose primary surface is the canvas.

- `src/screens/locations/MapViewerScreen.tsx` — the **default user-facing
  screen** for the locations module. Loads the first map (current convention:
  the single seeded "Bleiche Resort" map; the data model already supports
  multiple) and shows one layer at a time. The floor-plan PNG is rendered
  inside a `MapCanvas` in `view` tool mode with `showLabels` on, so every
  polygon stamped over the plan carries its assigned location's name as a
  centred label. Floor pills swap layers; pan via drag, zoom via wheel or
  pinch (touch). Strictly read-only.
- `src/screens/locations/LocationsTreeScreen.tsx` — collapsible tree with
  create / edit / move / delete (subtree); shows the imported metadata
  (`category`, `room_number`, `outdoor` flag) inline. Admin / manager only.
- `src/screens/locations/MapsListScreen.tsx` — list of maps with a card per
  layer. Create/edit map; create/edit/delete layer. Admin / manager only.
- `src/screens/locations/MapEditorScreen.tsx` — three-panel editor (admin /
  manager only): location tree on the left, pan/zoom canvas in the middle,
  shape list + properties on the right. Drawing UX:
   - Pick **Draw (P)** as the tool.
   - Click on the canvas to place a vertex. A live dashed line follows the
     cursor from the last placed vertex; placed vertices show as small dots,
     placed segments as a dashed polyline.
   - When the cursor enters snap range of the first vertex, that vertex
     enlarges and turns green and the preview line snaps to it. Click (or
     press **Enter**) to commit and close the polygon.
   - The new polygon attaches to whichever location was selected in the
     left panel; you can re-assign from the right panel after the fact.
   - Other shortcuts: **V** select, **H** pan, **Esc** cancel current draft
     / deselect, **Delete** remove selected shape.
   - **Save** sends a single `PUT /api/map-layers/{id}/shapes` with the full
     array — the bulk replace is the layer's source of truth.
- `src/components/MapCanvas.tsx` — the shared SVG canvas used by viewer and
  editor. Pan via single-pointer drag (in `select` / `pan` / `view` tools);
  pinch zoom on touch (two pointers); mouse-wheel zoom around the cursor.
  Tool semantics:
   - `view` — shape clicks fire `onSelectShape`; background drag pans; nothing
     is editable. Used by the viewer.
   - `select` — shape clicks select; vertices are draggable; shape body is
     draggable.
   - `draw` — clicks add vertices; cursor preview line, snap-to-first-vertex.
   - `pan` — everywhere is a pan handle; shapes ignore events.
  Colours are derived from `location_id` so each location gets a stable hue.

### Why server-side SVG rendering

We iterated through four PDF-rendering strategies before landing here:

- **Iframe + browser-native PDF viewer** rendered the PDFs perfectly but
  there's no way to overlay an editable polygon layer on top — the iframe
  owns its own pan/zoom state and intercepts pointer events, so an SVG
  overlay drifts the moment the user scrolls inside the viewer.
- **PDF.js to canvas** gave us overlay control but had fidelity issues on
  these specific PDFs (font substitution, occasional clipping) even with
  the standard fonts + cmaps shipped.
- **Server-side PNG via PyMuPDF** worked once we identified that the
  apparent "rendering bugs" were OCG layer garbage in the source PDFs (a
  site plan + side elevation overlaid on the EG floor plan). But PNG at any
  fixed DPI pixelates once you zoom past the rasterisation resolution, and
  with A2/A3 plans staff really do want to zoom in.
- **Server-side SVG via PyMuPDF** is what we ship: vector at any zoom, no
  pixelation, ~2–23 MB per file (gzipped over the wire), and as a bonus
  PyMuPDF preserves OCG layers as `<g inkscape:groupmode="layer"
  inkscape:label="Wand">` groups, so the SVG is *styleable* — see "Per-layer
  styling" below.

So the rendering path is: PDF → PyMuPDF (OCG cleanup at render time) →
vector SVG → HTML `<img src=*.svg>` (browsers render `<img>`-loaded SVG as
vector at any zoom, unlike SVG `<image href>` which rasterises once at the
natural size) + a sibling SVG overlay for polygons, both inside one
pan/zoom wrapper. One coordinate system end-to-end, identical across
browsers and on touch.

### Per-layer styling

PyMuPDF emits each PDF OCG as one or more `<g inkscape:groupmode="layer"
inkscape:label="<name>">` groups in the SVG. Layer names from the source CAD
exports include `Wand` (walls), `Möblierung 3D` (furniture), `Sanitär`
(plumbing), `Text Allgemein` (labels), `Füllfläche` (filled areas), `Dach`
(roof), `GRUNDRISS` (floor plan outline).

These groups are present in the served SVG but NOT styleable while the SVG
is loaded via `<img>` — page CSS can't reach inside an image-loaded SVG.
Two follow-up options when per-layer theming is needed:

1. **Bake the theme into the SVG server-side** — extend `extract_floor_plans.py`
   to inject a `<style>` block before saving (e.g. `g[inkscape\:label="Wand"] path { stroke: #2a2a2a; }`).
   Single theme per render; rebuild the SVGs to change. Simple, fast.
2. **Inline the SVG client-side** — fetch the SVG content, strip the outer
   wrapper, embed via `dangerouslySetInnerHTML` inside the canvas SVG. Page
   CSS can target layer groups directly, even at runtime. Heavier (parse
   cost on a 23 MB tree), but allows live theme switching.

## Floor plans

Source PDFs live in `docs/_reference/floorplans/*.pdf` (one per floor —
EG, 1OG, 2OG, DG). They're the source of truth and are not modified.

A dev-time script renders each PDF to a vector SVG with the bad layers
turned off:

```
cd backend
source venv/Scripts/activate      # venv/bin/activate on macOS/Linux
python -m scripts.extract_floor_plans
```

The script slugifies each PDF's stem (e.g. `Übersichtsplan - Grundriss EG.pdf`
→ `ubersichtsplan-grundriss-eg.svg`) and writes vector SVGs (~1.9–23.4 MB
each, viewBox in PDF points) to `backend/static/floorplans/`. The blacklist
of non-floor-plan layer names (`bebauungsplan_2008`, `lageplan`, `ansicht`)
lives at the top of the script — extend it if other layers turn out to be
inappropriate. Re-running the script is idempotent.

After rendering, seed the default map + 4 layers:

```
python -m scripts.seed_floorplans
```

This creates (or updates in-place) the `Bleiche Resort` map and one layer per
floor — Erdgeschoss, 1.–2. Obergeschoss, Dachgeschoss — with `width`/`height`
read from each SVG's `viewBox` attribute (PDF points: 1191×842 for A3
landscape). Polygon coordinates in the editor live in this same point-space,
so a polygon drawn at one zoom renders pixel-correct at any other zoom and
on any device. Re-running the seed leaves any drawn polygons untouched.

## Bulk-load locations from JSON

The canonical export lives at `docs/_reference/floorplans/locations_for_import.json`
and is the single file two databases (yours and a teammate's) share to end up
with the same logical hierarchy. The format is a **flat array** of nodes whose
hierarchy is expressed via UUID `parent_id` references — not nested children:

```json
[
  {
    "id": "33c1d18c-8c7b-43de-a1d6-440d3fddca18",
    "parent_id": null,
    "name": "Bleichehaus",
    "description": null,
    "environment": "indoor",
    "category": "building",
    "room_number": null,
    "sort_order": 15
  },
  {
    "id": "bb85bea6-651e-46ab-962a-6af2e3d450db",
    "parent_id": "6e1f9083-28fd-4917-be85-049d654cd08b",
    "name": "1. OG",
    "environment": "indoor",
    "category": "floor",
    "room_number": null,
    "sort_order": 1000
  }
]
```

Run with:

```
cd backend
python -m scripts.load_locations ../docs/_reference/floorplans/locations_for_import.json
```

Matching key is `source_id` (the JSON `id` UUID): a row whose `source_id`
already exists is updated in place, others are inserted with a fresh integer
primary key. The script makes two passes — first upsert, then parent wiring —
so the input array doesn't have to be topologically sorted. Nothing is ever
deleted; a node removed from the JSON stays in the database until you delete it
explicitly. Re-running an identical file is a clean no-op
(`0 created, N updated, 0 parents (re-)wired`).

## Verification

- Migration round-trip: `alembic downgrade -1 && alembic upgrade head` must
  succeed without errors.
- End-to-end smoke (viewer): log in as any user with the `locations` module,
  navigate to **Floor plans**, switch through all 4 floors. Each layer
  cross-fades to a sharp PNG; pan with drag, zoom with mouse wheel, pinch on
  touch. If polygons exist, every one carries its assigned location's name
  as a centred label.
- End-to-end smoke (editor): log in as `admin`, navigate to **Maps** → pick
  a layer to edit, switch to **Draw (P)**, click a few times around a room
  on the plan — a dashed line should follow the cursor between clicks; when
  you bring the cursor near the first vertex, it enlarges and turns green.
  Click to close, save, reload — the polygon persists, and visiting **Floor
  plans** shows the same polygon labelled with its location.
- Role gating: log in as a non-admin / non-manager (e.g. receptionist) — the
  sidebar shows only **Floor plans** under Places, and the viewer has no
  "Edit polygons" button.
- Cycle check: try to reparent a building under one of its own rooms — returns
  `400` with `"new parent is a descendant of this location"`.
