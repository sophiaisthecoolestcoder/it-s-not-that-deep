"""Seed the default "Bleiche Resort" map with one layer per rendered floor-plan
PNG that lives in `backend/static/floorplans/`.

Idempotent: re-running updates layer metadata (width/height/image_url) but
leaves polygon shapes untouched. Shapes drawn by staff in the editor are
keyed by `(layer_id, location_id)` and survive re-seeds.

Each layer's `image_url` carries a `?v=<mtime>` cache-buster so the browser
refetches the new PNG immediately after a re-render — without it, `<img>`
caching can hide the new render behind the old one.

Prerequisite: `python -m scripts.extract_floor_plans` has rendered the PNGs.

Run: python -m scripts.seed_floorplans
"""
import os
import struct
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


def read_png_dimensions(path: Path) -> tuple[int, int]:
    """Return (width, height) of a PNG by parsing the header — no decode needed."""
    with path.open("rb") as f:
        sig = f.read(8)
        if sig != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"{path} is not a PNG")
        f.read(4)  # IHDR length
        if f.read(4) != b"IHDR":
            raise ValueError(f"{path} missing IHDR")
        width, height = struct.unpack(">II", f.read(8))
    return width, height


def find_png(floor_token: str) -> Path | None:
    """Match filenames produced by extract_floor_plans.slugify() — they end with the token."""
    token = floor_token.lower()
    for candidate in STATIC_DIR.glob("*.png"):
        stem = candidate.stem.lower()
        parts = stem.split("-")
        if parts and parts[-1] == token:
            return candidate
    return None


def seed_floorplans() -> int:
    if not STATIC_DIR.is_dir():
        print(f"[seed_floorplans] {STATIC_DIR} does not exist. Run scripts.extract_floor_plans first.", file=sys.stderr)
        return 1

    session = SessionLocal()
    try:
        map_name = "Bleiche Resort"
        m = session.query(Map).filter(Map.name == map_name).first()
        if m is None:
            m = Map(name=map_name, description="Hotel floor plans (rendered server-side at high DPI from the source PDFs)", sort_order=0)
            session.add(m)
            session.flush()
            print(f"[seed_floorplans] created map '{map_name}' (id={m.id})")
        else:
            print(f"[seed_floorplans] map '{map_name}' already exists (id={m.id})")

        for token, display_name, order in FLOORS:
            png = find_png(token)
            if png is None:
                print(f"[seed_floorplans]   !! no PNG matches token '{token}' — skipping")
                continue
            width, height = read_png_dimensions(png)
            mtime = int(png.stat().st_mtime)
            image_url = f"{URL_PREFIX}/{png.name}?v={mtime}"

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
                print(f"[seed_floorplans]   + created layer '{display_name}' ({width}x{height} px) -> {image_url}")
            else:
                layer.image_url = image_url
                layer.width = width
                layer.height = height
                layer.sort_order = order
                print(f"[seed_floorplans]   ~ updated layer '{display_name}' ({width}x{height} px) -> {image_url}")

        session.commit()
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(seed_floorplans())
