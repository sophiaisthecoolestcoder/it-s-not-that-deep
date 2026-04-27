from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Locations ────────────────────────────────────────────────────────────────


# Free-form for now (validated as Literal at the schema layer rather than as a
# DB enum, so adding a new category later doesn't require a migration).
LocationEnvironment = Literal["indoor", "outdoor"]
LocationCategory = Literal["building", "floor", "room"]


class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    environment: LocationEnvironment = "indoor"
    category: LocationCategory = "room"
    room_number: Optional[str] = Field(default=None, max_length=64)
    sort_order: int = 0


class LocationCreate(LocationBase):
    # source_id is settable at create time so JSON imports preserve identity.
    source_id: Optional[str] = Field(default=None, max_length=64)


class LocationUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    environment: Optional[LocationEnvironment] = None
    category: Optional[LocationCategory] = None
    room_number: Optional[str] = Field(default=None, max_length=64)
    sort_order: Optional[int] = None
    # `source_id` is intentionally NOT updatable — once a row has an external
    # identity, mutating it would break re-import idempotency.
    # Explicit sentinel: front-end sends `{"parent_id": null}` to make a node a root.
    # Pydantic distinguishes "field omitted" from "field set to None" via model_dump(exclude_unset=True)
    # in the router.


class LocationRead(LocationBase):
    id: int
    source_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LocationTreeNode(LocationRead):
    children: List["LocationTreeNode"] = Field(default_factory=list)


LocationTreeNode.model_rebuild()


# ── Maps + layers ────────────────────────────────────────────────────────────


class MapBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sort_order: int = 0


class MapCreate(MapBase):
    pass


class MapUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    sort_order: Optional[int] = None


class MapLayerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=500)
    svg_content: Optional[str] = None
    width: int = Field(..., gt=0, le=100_000)
    height: int = Field(..., gt=0, le=100_000)
    sort_order: int = 0

    @model_validator(mode="after")
    def _one_of_image_or_svg(self) -> "MapLayerBase":
        if not self.image_url and not self.svg_content:
            raise ValueError("Either image_url or svg_content must be provided")
        return self


class MapLayerCreate(MapLayerBase):
    map_id: int


class MapLayerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    image_url: Optional[str] = Field(default=None, max_length=500)
    svg_content: Optional[str] = None
    width: Optional[int] = Field(default=None, gt=0, le=100_000)
    height: Optional[int] = Field(default=None, gt=0, le=100_000)
    sort_order: Optional[int] = None


class MapLayerRead(MapLayerBase):
    id: int
    map_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MapRead(MapBase):
    id: int
    created_at: datetime
    updated_at: datetime
    layers: List[MapLayerRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ── Location shapes ──────────────────────────────────────────────────────────


Point = List[float]  # exactly 2 floats


def _validate_points(points: Any) -> List[Point]:
    if not isinstance(points, list) or len(points) < 3:
        raise ValueError("A polygon requires at least 3 points")
    out: List[Point] = []
    for p in points:
        if not isinstance(p, (list, tuple)) or len(p) != 2:
            raise ValueError("Each point must be a [x, y] pair")
        x, y = p
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            raise ValueError("Point coordinates must be numbers")
        out.append([float(x), float(y)])
    return out


class LocationShapeBase(BaseModel):
    location_id: int
    layer_id: int
    points: List[Point]
    style: Optional[dict] = None
    label: Optional[str] = Field(default=None, max_length=200)

    @field_validator("points", mode="before")
    @classmethod
    def _validate_points_field(cls, v):
        return _validate_points(v)


class LocationShapeCreate(LocationShapeBase):
    pass


class LocationShapeUpdate(BaseModel):
    location_id: Optional[int] = None
    points: Optional[List[Point]] = None
    style: Optional[dict] = None
    label: Optional[str] = Field(default=None, max_length=200)

    @field_validator("points", mode="before")
    @classmethod
    def _validate_points_field(cls, v):
        if v is None:
            return v
        return _validate_points(v)


class LocationShapeRead(LocationShapeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LocationShapesBulkReplace(BaseModel):
    """Payload for `PUT /api/map-layers/{id}/shapes` — the full desired set for that layer."""
    shapes: List[LocationShapeCreate]
