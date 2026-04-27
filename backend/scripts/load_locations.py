"""Idempotent importer for the canonical locations JSON format.

The expected input is a flat array of nodes whose hierarchy is expressed via
`parent_id` references between `id` UUIDs (NOT a nested `children` tree). This
matches the export shipped at `docs/_reference/floorplans/locations_for_import.json`
and is the format any teammate's database can be reseeded from.

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
        ...
      },
      ...
    ]

Identity is preserved by `source_id` (the JSON `id` UUID): a row whose
`source_id` already exists is updated in place; otherwise it's inserted with a
fresh integer primary key. Two databases that import the same JSON end up with
the same logical hierarchy even though their internal `id` sequences differ.

Forward-reference parent_ids in the JSON are tolerated: the script does a first
pass to insert/update every row with `parent_id=NULL`, then a second pass to
wire up parents — this works whether the array is topologically sorted or not.

Run: python -m scripts.load_locations <path-to-json>
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal  # noqa: E402
from app.models.location import Location  # noqa: E402


_REQUIRED_FIELDS = ("id", "name")
_ALLOWED_ENVIRONMENTS = {"indoor", "outdoor"}
_ALLOWED_CATEGORIES = {"building", "floor", "room"}


def _validate_node(node: Any) -> dict[str, Any]:
    if not isinstance(node, dict):
        raise ValueError(f"Each entry must be an object, got {type(node).__name__}")
    for key in _REQUIRED_FIELDS:
        if not node.get(key):
            raise ValueError(f"Entry missing required field '{key}': {node!r}")
    env = node.get("environment", "indoor")
    cat = node.get("category", "room")
    if env not in _ALLOWED_ENVIRONMENTS:
        raise ValueError(f"Invalid environment {env!r} for {node['name']!r}; allowed: {sorted(_ALLOWED_ENVIRONMENTS)}")
    if cat not in _ALLOWED_CATEGORIES:
        raise ValueError(f"Invalid category {cat!r} for {node['name']!r}; allowed: {sorted(_ALLOWED_CATEGORIES)}")
    return {
        "source_id": str(node["id"]),
        "parent_source_id": str(node["parent_id"]) if node.get("parent_id") else None,
        "name": str(node["name"]).strip(),
        "description": node.get("description"),
        "environment": env,
        "category": cat,
        "room_number": node.get("room_number"),
        "sort_order": int(node.get("sort_order", 0)),
    }


def _upsert(session, fields: dict[str, Any]) -> tuple[int, str]:
    """Insert or update one row keyed by source_id. Returns (pk, action).

    `parent_id` is intentionally NOT set here — wiring is deferred to a second
    pass so the input array can be in any order. Newly-inserted rows start with
    `parent_id=NULL`; existing rows keep whatever parent they had (the second
    pass overwrites it iff the JSON specifies a different parent).
    """
    existing = session.query(Location).filter(Location.source_id == fields["source_id"]).first()
    if existing:
        existing.name = fields["name"]
        existing.description = fields["description"]
        existing.environment = fields["environment"]
        existing.category = fields["category"]
        existing.room_number = fields["room_number"]
        existing.sort_order = fields["sort_order"]
        return existing.id, "updated"

    loc = Location(
        source_id=fields["source_id"],
        parent_id=None,
        name=fields["name"],
        description=fields["description"],
        environment=fields["environment"],
        category=fields["category"],
        room_number=fields["room_number"],
        sort_order=fields["sort_order"],
    )
    session.add(loc)
    session.flush()
    return loc.id, "created"


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("Usage: python -m scripts.load_locations <path-to-json>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 2

    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, list):
        print("Top-level JSON must be an array of location entries", file=sys.stderr)
        return 2

    nodes = [_validate_node(n) for n in raw]

    # Detect duplicate source_ids in the input
    seen_ids: set[str] = set()
    for n in nodes:
        if n["source_id"] in seen_ids:
            print(f"Duplicate source_id in input: {n['source_id']!r}", file=sys.stderr)
            return 2
        seen_ids.add(n["source_id"])

    # Detect dangling parent references
    declared = {n["source_id"] for n in nodes}
    dangling = sorted({n["parent_source_id"] for n in nodes if n["parent_source_id"] and n["parent_source_id"] not in declared})
    if dangling:
        print(f"parent_id references not present in the input: {dangling}", file=sys.stderr)
        return 2

    session = SessionLocal()
    try:
        # Two-pass insert with parent wiring deferred to the second pass so the
        # input's row order doesn't have to be topological.
        # Pass 1: upsert every row, build source_id → pk map.
        pk_by_source: dict[str, int] = {}
        created = updated = 0
        for n in nodes:
            pk, action = _upsert(session, n)
            pk_by_source[n["source_id"]] = pk
            if action == "created":
                created += 1
            else:
                updated += 1

        # Pass 2: align parent_id with what the JSON specifies. Touches a row
        # only when its current parent differs from the desired one, so a
        # genuine no-op re-import reports 0 rewires.
        rewired = 0
        for n in nodes:
            child_pk = pk_by_source[n["source_id"]]
            desired_parent_pk = (
                pk_by_source[n["parent_source_id"]] if n["parent_source_id"] else None
            )
            row = session.query(Location).filter(Location.id == child_pk).first()
            if row.parent_id != desired_parent_pk:
                row.parent_id = desired_parent_pk
                rewired += 1

        session.commit()

        print(f"[load_locations] {created} created, {updated} updated, {rewired} parents (re-)wired ({len(nodes)} entries total)")
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv))
