"""Render each floor-plan PDF in `docs/_reference/floorplans/` to a high-DPI
PNG asset served by FastAPI.

We tried SVG (vector at any zoom, but a 24 MB / 50k-path SVG is too heavy
for the browser to repaint smoothly under CSS transforms) and ultimately
came back to PNG: the browser raster-caches a single image element and
pan/zoom is hardware-trivial regardless of file size. At 1500 DPI an A3
page is ~24,800 px wide — pixelation only becomes visible past ~340 %
zoom, which is well past any practical use of the floor plan.

`tint_with(black, white)` remaps the page's grayscale gradient: black stays
black, pure white becomes the brand cream colour. So the rendered PNG has
a cream "page" background that blends seamlessly with the app canvas.

The source PDFs are not modified — `docs/_reference/floorplans/*.pdf` is
the canonical archive.

Outputs land in `backend/static/floorplans/` and are idempotent: re-running
overwrites existing files. Commit the output so teammates can see the floor
plans without re-running the script.

Usage: python -m scripts.extract_floor_plans
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF


REPO_ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = REPO_ROOT / "docs" / "_reference" / "floorplans"
OUT_DIR = REPO_ROOT / "backend" / "static" / "floorplans"
# Inspector-managed config — only `page_background` is consumed by this
# (PNG-render) pipeline. Per-layer theming is SVG-only and isn't applied.
OVERRIDES_PATH = PDF_DIR / "floorplan_overrides.json"

# 1500 DPI on an A3 page = ~24,800 × 17,500 px. PNG file size lands around
# 5–15 MB per layer for these mostly-white CAD drawings, well within the
# range the browser handles instantly via raster GPU compositing.
PNG_DPI = 1500


def load_overrides() -> dict:
    """Load the JSON config edited by the inspector. The PNG pipeline uses
    only `page_background` from it; everything else is preserved for the
    inspector + future SVG-mode use."""
    if OVERRIDES_PATH.is_file():
        try:
            return json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            print(
                f"[extract_floor_plans] {OVERRIDES_PATH.name} is invalid JSON "
                f"({e}); using built-in defaults",
                file=sys.stderr,
            )
    return {"page_background": "#faf6f1"}


def slugify(stem: str) -> str:
    """Simple ASCII slug for filenames. Keeps the floor token (EG, 1OG, 2OG, DG) intact."""
    ascii_only = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return ascii_only or "untitled"


def _hex_to_rgb_int(hex_color: str) -> int:
    """Parse `#rrggbb` to a 24-bit int that PyMuPDF's `tint_with` expects."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h, 16)


def render_one(src: Path, out_dir: Path, overrides: dict) -> tuple[Path, int, int, int]:
    """Render the first page of `src` to a high-DPI PNG, tinted so the page
    background matches the app's brand cream.

    Returns (png_path, width, height, byte_size).
    """
    page_bg = overrides.get("page_background") or "#faf6f1"
    bg_int = _hex_to_rgb_int(page_bg)

    doc = fitz.open(src)
    try:
        page = doc.load_page(0)
        zoom = PNG_DPI / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        # alpha=False — opaque page background (white from PyMuPDF). We then
        # remap white → cream via tint_with so the served PNG matches the
        # canvas surround.
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.tint_with(0x000000, bg_int)
        png_bytes = pix.tobytes("png")
        w, h = pix.width, pix.height
    finally:
        doc.close()

    out_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(src.stem)
    png_path = out_dir / f"{slug}.png"
    png_path.write_bytes(png_bytes)
    return png_path, w, h, len(png_bytes)


def main() -> int:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}", file=sys.stderr)
        return 1

    overrides = load_overrides()
    page_bg = overrides.get("page_background") or "#faf6f1"
    print(f"Rendering at {PNG_DPI} DPI, page background {page_bg}")

    for pdf in pdfs:
        png, w, h, size = render_one(pdf, OUT_DIR, overrides)
        print(
            f"  {pdf.name}  ->  "
            f"{png.name} ({size / 1024 / 1024:.1f} MB, {w}x{h} px)"
        )

    print(f"\nRendered {len(pdfs)} floor plan(s) to {OUT_DIR.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
