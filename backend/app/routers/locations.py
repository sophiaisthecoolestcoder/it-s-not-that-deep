"""CRUD endpoints for the hierarchical locations + maps + layers + shapes feature.

All reads are open to any authenticated user. Writes are limited to
ADMIN / MANAGER, matching the `offers.py` split. Reparent operations go through
the PATCH handler and are guarded by an application-level cycle check (a
recursive CTE from the candidate new_parent upward; reject if the node being
moved appears).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models.employee import EmployeeRole
from app.models.location import Location, LocationShape, Map, MapLayer
from app.models.user import User
from app.schemas.location import (
    LocationCreate,
    LocationRead,
    LocationShapeCreate,
    LocationShapeRead,
    LocationShapeUpdate,
    LocationShapesBulkReplace,
    LocationTreeNode,
    LocationUpdate,
    MapCreate,
    MapLayerCreate,
    MapLayerRead,
    MapLayerUpdate,
    MapRead,
    MapUpdate,
)


router = APIRouter(tags=["Locations"])

_read_access = get_current_user
_write_access = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)


# ── Locations ────────────────────────────────────────────────────────────────


def _build_tree(rows: List[Location]) -> List[LocationTreeNode]:
    """Assemble nested tree from a flat list of Location rows.

    Nodes are constructed with explicit `children=[]` to prevent Pydantic from
    auto-populating children from the ORM `children` relationship — otherwise
    each child would appear twice (once from the relationship load, once from
    the parent-linking loop below).
    """
    by_id: dict[int, LocationTreeNode] = {}
    for row in rows:
        by_id[row.id] = LocationTreeNode(
            id=row.id,
            source_id=row.source_id,
            parent_id=row.parent_id,
            name=row.name,
            description=row.description,
            environment=row.environment,
            category=row.category,
            room_number=row.room_number,
            sort_order=row.sort_order,
            created_at=row.created_at,
            updated_at=row.updated_at,
            children=[],
        )

    roots: List[LocationTreeNode] = []
    # Rows are pre-sorted by (sort_order, name); this preserves child order too.
    for row in rows:
        node = by_id[row.id]
        if row.parent_id is None or row.parent_id not in by_id:
            roots.append(node)
        else:
            by_id[row.parent_id].children.append(node)
    return roots


def _is_descendant_of(db: Session, ancestor_id: int, candidate_id: int) -> bool:
    """Return True iff `candidate_id` is a descendant of `ancestor_id` (inclusive of the node itself)."""
    if ancestor_id == candidate_id:
        return True
    sql = text(
        """
        WITH RECURSIVE descendants AS (
            SELECT id FROM locations WHERE id = :root
            UNION ALL
            SELECT l.id FROM locations l
            JOIN descendants d ON l.parent_id = d.id
        )
        SELECT 1 FROM descendants WHERE id = :target LIMIT 1
        """
    )
    hit = db.execute(sql, {"root": ancestor_id, "target": candidate_id}).first()
    return hit is not None


@router.get("/locations", response_model=List[LocationRead])
def list_locations(
    parent_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    q = db.query(Location)
    if parent_id is not None:
        q = q.filter(Location.parent_id == parent_id)
    return q.order_by(Location.sort_order.asc(), Location.name.asc()).all()


@router.get("/locations/tree", response_model=List[LocationTreeNode])
def get_locations_tree(
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    rows = db.query(Location).order_by(Location.sort_order.asc(), Location.name.asc()).all()
    return _build_tree(rows)


@router.get("/locations/{location_id}", response_model=LocationRead)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.get("/locations/{location_id}/subtree", response_model=LocationTreeNode)
def get_location_subtree(
    location_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    root = db.query(Location).filter(Location.id == location_id).first()
    if not root:
        raise HTTPException(status_code=404, detail="Location not found")
    sql = text(
        """
        WITH RECURSIVE descendants AS (
            SELECT * FROM locations WHERE id = :root
            UNION ALL
            SELECT l.* FROM locations l
            JOIN descendants d ON l.parent_id = d.id
        )
        SELECT id FROM descendants
        """
    )
    ids = [r[0] for r in db.execute(sql, {"root": location_id}).all()]
    rows = (
        db.query(Location)
        .filter(Location.id.in_(ids))
        .order_by(Location.sort_order.asc(), Location.name.asc())
        .all()
    )
    trees = _build_tree(rows)
    # Root may be orphaned from siblings at the tree boundary — always pick the requested root
    for t in trees:
        if t.id == location_id:
            return t
    # Fallback: caller asked for an id we already confirmed exists
    return LocationTreeNode.model_validate(root)


@router.post("/locations", response_model=LocationRead, status_code=201)
def create_location(
    payload: LocationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    if payload.parent_id is not None:
        parent = db.query(Location).filter(Location.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent location does not exist")
    loc = Location(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.patch("/locations/{location_id}", response_model=LocationRead)
def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    data = payload.model_dump(exclude_unset=True)

    if "parent_id" in data:
        new_parent_id = data["parent_id"]
        if new_parent_id is not None:
            if new_parent_id == location_id:
                raise HTTPException(status_code=400, detail="A location cannot be its own parent")
            parent = db.query(Location).filter(Location.id == new_parent_id).first()
            if not parent:
                raise HTTPException(status_code=400, detail="Parent location does not exist")
            if _is_descendant_of(db, location_id, new_parent_id):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot reparent: new parent is a descendant of this location",
                )

    for field, value in data.items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/locations/{location_id}", status_code=204)
def delete_location(
    location_id: int,
    force: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    loc = db.query(Location).filter(Location.id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    has_children = db.query(Location.id).filter(Location.parent_id == location_id).first() is not None
    if has_children and not force:
        raise HTTPException(
            status_code=409,
            detail="Location has children. Pass ?force=true to delete the whole subtree.",
        )

    if force:
        # Delete descendants (and their shapes, via CASCADE) bottom-up
        sql = text(
            """
            WITH RECURSIVE descendants AS (
                SELECT id FROM locations WHERE id = :root
                UNION ALL
                SELECT l.id FROM locations l
                JOIN descendants d ON l.parent_id = d.id
            )
            DELETE FROM locations WHERE id IN (
                SELECT id FROM descendants WHERE id <> :root
            )
            """
        )
        db.execute(sql, {"root": location_id})

    db.delete(loc)
    db.commit()


# ── Maps ─────────────────────────────────────────────────────────────────────


@router.get("/maps", response_model=List[MapRead])
def list_maps(
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    return (
        db.query(Map)
        .options(selectinload(Map.layers))
        .order_by(Map.sort_order.asc(), Map.name.asc())
        .all()
    )


@router.get("/maps/{map_id}", response_model=MapRead)
def get_map(
    map_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    m = (
        db.query(Map)
        .options(selectinload(Map.layers))
        .filter(Map.id == map_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    return m


@router.post("/maps", response_model=MapRead, status_code=201)
def create_map(
    payload: MapCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    m = Map(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.patch("/maps/{map_id}", response_model=MapRead)
def update_map(
    map_id: int,
    payload: MapUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    m = db.query(Map).filter(Map.id == map_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(m, field, value)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/maps/{map_id}", status_code=204)
def delete_map(
    map_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    m = db.query(Map).filter(Map.id == map_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Map not found")
    db.delete(m)
    db.commit()


# ── Map layers ───────────────────────────────────────────────────────────────


@router.get("/map-layers", response_model=List[MapLayerRead])
def list_map_layers(
    map_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    q = db.query(MapLayer)
    if map_id is not None:
        q = q.filter(MapLayer.map_id == map_id)
    return q.order_by(MapLayer.map_id.asc(), MapLayer.sort_order.asc(), MapLayer.id.asc()).all()


@router.get("/map-layers/{layer_id}", response_model=MapLayerRead)
def get_map_layer(
    layer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Map layer not found")
    return layer


@router.post("/map-layers", response_model=MapLayerRead, status_code=201)
def create_map_layer(
    payload: MapLayerCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    parent_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if not parent_map:
        raise HTTPException(status_code=400, detail="Map does not exist")
    layer = MapLayer(**payload.model_dump())
    db.add(layer)
    db.commit()
    db.refresh(layer)
    return layer


@router.patch("/map-layers/{layer_id}", response_model=MapLayerRead)
def update_map_layer(
    layer_id: int,
    payload: MapLayerUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Map layer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(layer, field, value)
    db.commit()
    db.refresh(layer)
    return layer


@router.delete("/map-layers/{layer_id}", status_code=204)
def delete_map_layer(
    layer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Map layer not found")
    db.delete(layer)
    db.commit()


@router.get("/map-layers/{layer_id}/shapes", response_model=List[LocationShapeRead])
def list_layer_shapes(
    layer_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Map layer not found")
    return db.query(LocationShape).filter(LocationShape.layer_id == layer_id).order_by(LocationShape.id).all()


@router.put("/map-layers/{layer_id}/shapes", response_model=List[LocationShapeRead])
def replace_layer_shapes(
    layer_id: int,
    payload: LocationShapesBulkReplace,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    """Atomically replace every shape on this layer with the payload's array.

    The editor's Save button calls this so the layer is a single source of truth
    per request; no per-shape round-trips.
    """
    layer = db.query(MapLayer).filter(MapLayer.id == layer_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Map layer not found")

    # Payload consistency: every shape must target this layer
    for s in payload.shapes:
        if s.layer_id != layer_id:
            raise HTTPException(
                status_code=400,
                detail=f"Shape layer_id={s.layer_id} does not match path layer_id={layer_id}",
            )

    # Referenced locations must exist
    location_ids = {s.location_id for s in payload.shapes}
    if location_ids:
        existing = {
            r[0] for r in db.query(Location.id).filter(Location.id.in_(location_ids)).all()
        }
        missing = location_ids - existing
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown location_id(s): {sorted(missing)}",
            )

    db.query(LocationShape).filter(LocationShape.layer_id == layer_id).delete(synchronize_session=False)
    new_rows = [
        LocationShape(
            location_id=s.location_id,
            layer_id=layer_id,
            points=s.points,
            style=s.style,
            label=s.label,
        )
        for s in payload.shapes
    ]
    db.add_all(new_rows)
    db.commit()
    for r in new_rows:
        db.refresh(r)
    return new_rows


# ── Shapes (individual) ──────────────────────────────────────────────────────


@router.get("/location-shapes", response_model=List[LocationShapeRead])
def list_shapes(
    location_id: Optional[int] = Query(default=None),
    layer_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    q = db.query(LocationShape)
    if location_id is not None:
        q = q.filter(LocationShape.location_id == location_id)
    if layer_id is not None:
        q = q.filter(LocationShape.layer_id == layer_id)
    return q.order_by(LocationShape.id).all()


@router.get("/location-shapes/{shape_id}", response_model=LocationShapeRead)
def get_shape(
    shape_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_read_access),
):
    s = db.query(LocationShape).filter(LocationShape.id == shape_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shape not found")
    return s


@router.post("/location-shapes", response_model=LocationShapeRead, status_code=201)
def create_shape(
    payload: LocationShapeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    if not db.query(Location.id).filter(Location.id == payload.location_id).first():
        raise HTTPException(status_code=400, detail="location_id does not exist")
    if not db.query(MapLayer.id).filter(MapLayer.id == payload.layer_id).first():
        raise HTTPException(status_code=400, detail="layer_id does not exist")
    s = LocationShape(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/location-shapes/{shape_id}", response_model=LocationShapeRead)
def update_shape(
    shape_id: int,
    payload: LocationShapeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    s = db.query(LocationShape).filter(LocationShape.id == shape_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shape not found")
    data = payload.model_dump(exclude_unset=True)
    if "location_id" in data:
        if not db.query(Location.id).filter(Location.id == data["location_id"]).first():
            raise HTTPException(status_code=400, detail="location_id does not exist")
    for field, value in data.items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/location-shapes/{shape_id}", status_code=204)
def delete_shape(
    shape_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_write_access),
):
    s = db.query(LocationShape).filter(LocationShape.id == shape_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Shape not found")
    db.delete(s)
    db.commit()
