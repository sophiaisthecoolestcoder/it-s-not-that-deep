"""Render each floor-plan PDF in `docs/_reference/floorplans/` to a vector SVG
asset served by FastAPI, with the brand theme baked in.

Why SVG and not PNG: floor plans are large (A2/A3) and staff zoom in to read
room numbers. A 600 DPI PNG (~10K px wide) starts pixelating once you zoom
past ~150%. Vector SVG stays crisp at any zoom.

PyMuPDF's `get_svg_image` honours the document's OCG (Optional Content
Group) state at render time, so disabling the bad CAD layers in the default
config before rendering produces an SVG with only the floor-plan content.
The source PDFs in `docs/_reference/floorplans/` are not modified — their
full layer set is preserved as the canonical archive.

PyMuPDF preserves each surviving OCG as a `<g inkscape:groupmode="layer"
inkscape:label="<name>">` group. After rendering we inject a `<style>` block
that hides the layers we don't want in the read-only view (text, 3D
furniture) and re-themes walls + other building features in the Bleiche
brand palette (warm cream/sand). The styles travel inside the SVG itself,
so the frontend can render via plain `<img src="…svg">` and still get the
themed look (CSS in a page can't reach into image-loaded SVGs, but rules
inside the SVG do apply).

Outputs land in `backend/static/floorplans/` and are idempotent: re-running
overwrites existing files. Commit the output so teammates can see the floor
plans without re-running the script.

Usage: python -m scripts.extract_floor_plans
"""
from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF


REPO_ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = REPO_ROOT / "docs" / "_reference" / "floorplans"
OUT_DIR = REPO_ROOT / "backend" / "static" / "floorplans"


# OCG layer names hidden at render time (matched case-insensitively against
# the layer's title in the PDF). Two categories:
#
#   1. Out-of-scope drawings on the EG plan — a separate site plan, a
#      development plan, and a side elevation share the same coordinate
#      system as the floor plan and render on top of each other.
#   2. Content the read-only floor-plan view shouldn't show:
#      - `möblierung 3d` (3D furniture symbols)
#      - `text allgemein` (room-number labels and dimension text)
#      - `undefiniert` (the EG PDF alone has 30+ unnamed OCGs containing
#        decorative furniture, equipment outlines, and incidental detail
#        that isn't in the floor plan's named layers).
#
# Keep names lowercase. To reveal one of these layers later, remove its
# entry and re-run the script.
LAYER_BLACKLIST = {
    # out-of-scope drawings:
    "bebauungsplan_2008",
    "lageplan",
    "ansicht",
    # not part of the read-only floor-plan view:
    "möblierung 3d",
    "text allgemein",
    "undefiniert",
}


# Theme baked into the served SVG. The CSS targets PyMuPDF's preserved OCG
# groups (`inkscape:label="…"`) so each layer can be hidden, recoloured, or
# given a different stroke weight independently. Colours come from the
# Bleiche brand palette in `frontend/src/theme/colors.ts` so the floor plan
# matches the rest of the UI.
#
# Two layers are hidden in the read-only view: room labels (`Text Allgemein`)
# and 3D furniture (`Möblierung 3D`). The user wanted a cleaner "design plan"
# look without those distractions; un-hide them in the future by removing
# the `display: none` rules below.
#
# Walls (`Wand`) are the most prominent feature, drawn warm-dark with a
# thinner stroke than the source PDF (PyMuPDF's SVG export tends to render
# stroke joins thicker than the original). Other building features (plumbing,
# columns, windows, roof, generic outlines) get a subdued mocha tone so they
# stay visible without dominating the page.
THEME_CSS = """\
/* Notes on selectors:

   `[data-layer="…"]` targets the non-namespaced `data-layer` attribute that
   `add_data_layer_attrs` mirrors from each group's `inkscape:label`. This
   works reliably across browsers when the SVG is loaded via `<img>`,
   unlike `[*|label]` / `[inkscape|label]` which depend on each browser's
   XML namespace handling.

   `!important` is required to override the `stroke="#000000"` /
   `fill="…"` presentation attributes PyMuPDF puts on every element.

   The first rule is an aggressive default: re-paint EVERY path/line in the
   warm-dark theme so anything that survives the OCG cleanup but doesn't
   sit in a recognised named layer (the source CAD has 30+ unnamed
   "Undefiniert" groups) still picks up the brand palette. The per-layer
   rules below then upgrade specific groups (walls get a fill, rooms get a
   cream fill, fixtures shift to mocha). */

/* Hide layers we never want in the read-only view. Although the OCG is
   already disabled at PDF level, PyMuPDF emits the geometry into the SVG
   anyway — so hide it again here. */
g[data-layer="Möblierung 3D"],
g[data-layer="Text Allgemein"],
g[data-layer="Undefiniert"] {
    display: none !important;
}

/* Catch-all default — every visible stroke becomes warm-dark, hairline. */
path, line, polyline, polygon {
    stroke: #3a2e22 !important;
    stroke-width: 0.4 !important;
    fill: none !important;
}

/* Walls — same warm-dark stroke, with a solid taupe fill so wall masses
   read clearly. */
g[data-layer="Wand"] path,
g[data-layer="Wand"] line {
    stroke: #3a2e22 !important;
    stroke-width: 0.45 !important;
    fill: #6b5a44 !important;
}

/* Filled rooms / surfaces — slightly warmer cream than the page so rooms
   read "deeper" than the empty page background behind them. */
g[data-layer="Füllfläche"] path {
    fill: #f5ede3 !important;
    stroke: none !important;
}

/* Brand mocha for windows, doors, plumbing, columns, roof, generic
   outlines — visible without dominating. */
g[data-layer="Sanitär"] path,
g[data-layer="WÄNDE_ÖFFNUNGEN"] path,
g[data-layer="Stütze"] path,
g[data-layer="Stilfläche"] path,
g[data-layer="GRUNDRISS"] path,
g[data-layer="Allgemein01"] path,
g[data-layer="Fenstermakro, Türmakro"] path,
g[data-layer="Dach"] path {
    stroke: #b09570 !important;
    stroke-width: 0.3 !important;
    fill: none !important;
}
"""


def slugify(stem: str) -> str:
    """Simple ASCII slug for filenames. Keeps the floor token (EG, 1OG, 2OG, DG) intact."""
    ascii_only = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    ascii_only = ascii_only.lower()
    ascii_only = re.sub(r"[^a-z0-9]+", "-", ascii_only).strip("-")
    return ascii_only or "untitled"


_LABEL_RE = re.compile(r'inkscape:label="([^"]*)"')


def add_data_layer_attrs(svg: str) -> str:
    """Mirror every `inkscape:label="X"` as a non-namespaced `data-layer="X"`.

    `inkscape:label` is a namespaced attribute. CSS attribute selectors
    against namespaced attributes (`[*|label="…"]`, `[inkscape|label="…"]`)
    are inconsistently honoured across browsers when the SVG is loaded via
    `<img>` and parsed in strict XML mode. A plain non-namespaced `data-*`
    attribute on the same group is matched reliably in every browser, so we
    duplicate the label as `data-layer` and target THAT in the theme.
    """
    return _LABEL_RE.sub(
        lambda m: f'inkscape:label="{m.group(1)}" data-layer="{m.group(1)}"',
        svg,
    )


def inject_theme(svg: str) -> str:
    """Insert the brand theme `<style>` block into the SVG.

    Goes right after the closing `</defs>` so it parses before any drawing
    instructions; falls back to immediately after the opening `<svg ...>` if
    there's no `<defs>` (shouldn't happen with PyMuPDF output, but defensive).
    The CSS lives inside a `<![CDATA[...]]>` so the literal `&` and `<` it
    contains can't break XML parsing.
    """
    style_block = (
        '<style type="text/css"><![CDATA[\n' + THEME_CSS + ']]></style>\n'
    )
    if "</defs>" in svg:
        return svg.replace("</defs>", "</defs>\n" + style_block, 1)
    m = re.search(r"<svg[^>]*>", svg)
    if m:
        i = m.end()
        return svg[:i] + "\n" + style_block + svg[i:]
    return svg


def render_one(src: Path, out_dir: Path) -> tuple[Path, int, list[str]]:
    """Render the first page of `src` to a themed SVG with blacklisted layers off.

    Returns (svg_path, byte_size, hidden_layer_names).
    """
    doc = fitz.open(src)
    try:
        ocgs = doc.get_ocgs()  # {xref: {'name': str, 'on': bool, ...}}
        off_xrefs: list[int] = []
        hidden_names: list[str] = []
        for xref, info in ocgs.items():
            name = (info.get("name") or "").strip()
            if name.lower() in LAYER_BLACKLIST:
                off_xrefs.append(xref)
                hidden_names.append(name)
        if off_xrefs:
            doc.set_layer(-1, off=off_xrefs)

        page = doc.load_page(0)
        svg = page.get_svg_image(text_as_path=False)
    finally:
        doc.close()

    svg = add_data_layer_attrs(svg)
    svg = inject_theme(svg)

    out_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(src.stem)
    svg_path = out_dir / f"{slug}.svg"
    svg_path.write_text(svg, encoding="utf-8")
    return svg_path, len(svg), hidden_names


def main() -> int:
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs found in {PDF_DIR}", file=sys.stderr)
        return 1

    for pdf in pdfs:
        svg, size, hidden = render_one(pdf, OUT_DIR)
        hidden_note = (
            f"hid layer(s): {', '.join(hidden)}"
            if hidden
            else "no layer cleanup needed"
        )
        print(
            f"  {pdf.name}  ->  "
            f"{svg.name} ({size / 1024 / 1024:.1f} MB; {hidden_note})"
        )

    print(f"\nRendered {len(pdfs)} floor plan(s) to {OUT_DIR.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
