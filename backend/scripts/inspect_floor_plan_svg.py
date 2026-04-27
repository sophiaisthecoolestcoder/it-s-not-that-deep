"""Diagnostic — analyse a generated floor-plan SVG so we know exactly what's
in it before tweaking the theme. Reports:

  - all distinct `data-layer` values and their occurrence counts
  - count of `<image>` elements (embedded raster images, which pixelate at
    zoom regardless of vector pipeline)
  - count of `<text>` elements (residual labels)
  - distinct `font-family` values referenced
  - paths that sit OUTSIDE any labelled group (not under any data-layer)
  - the first few suspicious raw paths (so we know what's in the
    "no-layer" bucket)

Usage: python -m scripts.inspect_floor_plan_svg [filename]
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SVG = REPO_ROOT / "backend" / "static" / "floorplans" / "ubersichtsplan-grundriss-eg.svg"


def main(argv: list[str]) -> int:
    path = Path(argv[1]) if len(argv) >= 2 else DEFAULT_SVG
    if not path.is_file():
        print(f"Not a file: {path}", file=sys.stderr)
        return 1
    text = path.read_text(encoding="utf-8")

    print(f"=== {path.name} ({len(text) / 1024 / 1024:.1f} MB) ===\n")

    # 1. data-layer values
    layer_re = re.compile(r'data-layer="([^"]*)"')
    counts = Counter(layer_re.findall(text))
    print(f"-- data-layer values ({sum(counts.values())} groups, {len(counts)} distinct) --")
    for name, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        print(f"  {n:6d}  {name!r}")

    # 2. <image> elements (raster blobs)
    images = re.findall(r"<image\b[^>]*?(?:href|xlink:href)=\"([^\"]{0,80})", text)
    print(f"\n-- embedded raster <image> elements: {len(images)} --")
    for href in images[:5]:
        print(f"    href starts with: {href!r}")
    if len(images) > 5:
        print(f"    ... and {len(images) - 5} more")

    # 3. <text> elements
    text_count = len(re.findall(r"<text\b", text))
    tspan_count = len(re.findall(r"<tspan\b", text))
    print(f"\n-- text elements: <text>={text_count}, <tspan>={tspan_count} --")
    fonts = re.findall(r'font-family="([^"]*)"', text)
    if fonts:
        print(f"   distinct font-family: {sorted(set(fonts))}")

    # 4. Paths that are not under a data-layer group.
    # We approximate: count ALL <path> tags, then subtract paths that fall
    # inside a `<g ... data-layer=...> ... </g>` block.
    total_paths = len(re.findall(r"<path\b", text))
    layer_block_re = re.compile(r"<g\b[^>]*?\bdata-layer=\"[^\"]*\"[^>]*>(.*?)</g>", re.DOTALL)
    paths_in_layers = 0
    for m in layer_block_re.finditer(text):
        paths_in_layers += len(re.findall(r"<path\b", m.group(1)))
    print(f"\n-- paths total: {total_paths}; inside data-layer groups: {paths_in_layers}; outside: {total_paths - paths_in_layers}")

    # 5. Show snippets of paths outside any labelled group (the "loose" content)
    # Strip out everything inside data-layer groups to find what's left.
    stripped = layer_block_re.sub("", text)
    loose_paths = re.findall(r"<path\b[^>]{0,160}?d=\"[^\"]{0,80}", stripped)
    print(f"\n-- sample loose-path snippets (top 10) --")
    seen = set()
    shown = 0
    for snip in loose_paths:
        # Group by their stroke/fill signature so we don't drown in dupes.
        sig_match = re.search(r'(stroke|fill)="([^"]*)"', snip)
        sig = sig_match.group(0) if sig_match else "(no fill/stroke)"
        if sig in seen:
            continue
        seen.add(sig)
        print(f"   {sig}  ::  {snip[:140]!r}")
        shown += 1
        if shown >= 10:
            break

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
