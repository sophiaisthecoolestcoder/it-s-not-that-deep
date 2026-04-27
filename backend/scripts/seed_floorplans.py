"""Seed the default "Bleiche Resort" map with one layer per rendered floor-plan
SVG that lives in `backend/static/floorplans/`.

Idempotent: re-running updates layer metadata (width/height/image_url) but
leaves polygon shapes untouched. Shapes drawn by staff in the editor are
keyed by `(layer_id, location_id)` and survive re-seeds.

`width`/`height` come from the SVG's `viewBox` attribute, which PyMuPDF
emits in PDF points (1 pt = 1/72 inch). Polygon coordinates the editor
stores live in this same point-space, so they round-trip pixel-correct
between editor and viewer regardless of the user's zoom level.

Prerequisite: `python -m scripts.extract_floor_plans` has rendered the SVGs.

Run: python -m scripts.seed_floorplans
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
from app.models.location import Map, MapLayer  # noqa: E402


REPO_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = REPO_ROOT / "backend" / "static" / "floorplans"
URL_PREFIX = "/static/floorplans"

# (floor token in filename, display name, sort order) — matches the 4 reference PDFs
FLOORS = [
    ("eg", "Erdgeschoss", 0),
    ("1og", "1. Obergeschoss", 1),
    ("2og", "2. Obergeschoss", 2),
    ("dg", "Dachgeschoss", 3),
]


_VIEWBOX_RE = re.compile(
    r'viewBox="\s*[\d.\-]+\s+[\d.\-]+\s+([\d.]+)\s+([\d.]+)\s*"'
)


def read_svg_dimensions(path: Path) -> tuple[int, int]:
    """Return (width, height) from the SVG's viewBox, rounded to integers.

    Reads only the first 4 KB to avoid pulling a 20+ MB file into memory just
    to grab the header — the viewBox always lives near the top.
    """
    with path.open("r", encoding="utf-8") as f:
        head = f.read(4096)
    m = _VIEWBOX_RE.search(head)
    if not m:
        raise ValueError(f"Could not find viewBox in {path}")
    return int(round(float(m.group(1)))), int(round(float(m.group(2))))


def find_svg(floor_token: str) -> Path | None:
    """Match filenames produced by extract_floor_plans.slugify() — they end with the token."""
    token = floor_token.lower()
    for candidate in STATIC_DIR.glob("*.svg"):
        stem = candidate.stem.lower()
        parts = stem.split("-")
        # The slug ends with the floor token, e.g. "ubersichtsplan-grundriss-1og"
        if parts and parts[-1] == token:
            return candidate
    return None


def seed_floorplans() -> int:
    if not STATIC_DIR.is_dir():
        print(f"[seed_floorplans] {STATIC_DIR} does not exist. Run scripts.extract_floor_plans first.", file=sys.stderr)
        return 1

    session = SessionLocal()
    try:
        # Get or create the default map
        map_name = "Bleiche Resort"
        m = session.query(Map).filter(Map.name == map_name).first()
        if m is None:
            m = Map(name=map_name, description="Hotel floor plans (vector SVG, rendered server-side from the source PDFs)", sort_order=0)
            session.add(m)
            session.flush()
            print(f"[seed_floorplans] created map '{map_name}' (id={m.id})")
        else:
            print(f"[seed_floorplans] map '{map_name}' already exists (id={m.id})")

        for token, display_name, order in FLOORS:
            svg = find_svg(token)
            if svg is None:
                print(f"[seed_floorplans]   !! no SVG matches token '{token}' — skipping")
                continue
            width, height = read_svg_dimensions(svg)
            # Append the file's mtime as a cache-buster: when the SVG is
            # re-rendered (theme change, OCG cleanup change), the URL also
            # changes and the browser refetches instead of serving a stale
            # `<img>` cache. The static asset itself is unchanged URL-wise
            # at the filesystem; the query string just bypasses HTTP cache.
            mtime = int(svg.stat().st_mtime)
            image_url = f"{URL_PREFIX}/{svg.name}?v={mtime}"

            layer = (
                session.query(MapLayer)
                .filter(MapLayer.map_id == m.id, MapLayer.name == display_name)
                .first()
            )
            if layer is None:
                layer = MapLayer(
                    map_id=m.id,
                    name=display_name,
                    image_url=image_url,
                    svg_content=None,
                    width=width,
                    height=height,
                    sort_order=order,
                )
                session.add(layer)
                print(f"[seed_floorplans]   + created layer '{display_name}' ({width}x{height} pt) -> {image_url}")
            else:
                layer.image_url = image_url
                layer.width = width
                layer.height = height
                layer.sort_order = order
                print(f"[seed_floorplans]   ~ updated layer '{display_name}' ({width}x{height} pt) -> {image_url}")

        session.commit()
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(seed_floorplans())
