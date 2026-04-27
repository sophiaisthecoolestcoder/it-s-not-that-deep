"""Hierarchical locations with free-form polygon shapes on floor-plan layers.

The tree is `(id, name, parent_id)` plus a few semantic columns:

- `source_id` — external identifier (typically a UUID) that survives re-imports.
  When a JSON export is loaded into a fresh database, rows with the same
  `source_id` are upserted in place rather than duplicated. This is what lets
  two databases (e.g. dev and a teammate's) host the same logical hierarchy.
- `environment` — `"indoor"` or `"outdoor"`.
- `category` — `"building"`, `"floor"`, or `"room"` (extensible; validated in Pydantic).
- `room_number` — free-form room label like `"0.30"` or `"1.604"`.

Maps and their layers are independent records; a `LocationShape` links any
number of polygons on a given layer back to a location, so one location can
appear on multiple maps / layers and a single location can have several shapes
on the same layer (e.g. a split suite occupying two rooms in a floor plan).
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(
        Integer,
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    source_id = Column(String(64), nullable=True, unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    environment = Column(String(16), nullable=False, server_default="indoor")
    category = Column(String(32), nullable=False, server_default="room")
    room_number = Column(String(64), nullable=True)
    sort_order = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent = relationship("Location", remote_side="Location.id", back_populates="children")
    children = relationship(
        "Location",
        back_populates="parent",
        cascade="save-update",
        order_by="Location.sort_order, Location.name",
    )
    shapes = relationship("LocationShape", back_populates="location", cascade="all, delete-orphan")


class Map(Base):
    __tablename__ = "maps"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    layers = relationship(
        "MapLayer",
        back_populates="map",
        cascade="all, delete-orphan",
        order_by="MapLayer.sort_order, MapLayer.id",
    )


class MapLayer(Base):
    __tablename__ = "map_layers"

    id = Column(Integer, primary_key=True, index=True)
    map_id = Column(Integer, ForeignKey("maps.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    # One of image_url / svg_content must be populated by the time the layer is saved.
    # image_url: absolute URL or /static/floorplans/... path served by StaticFiles.
    # svg_content: inline SVG markup, allowing CSS-based restyling.
    image_url = Column(String(500), nullable=True)
    svg_content = Column(Text, nullable=True)
    # Native pixel/viewBox dimensions. Polygon coordinates are stored in this space.
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    sort_order = Column(Integer, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    map = relationship("Map", back_populates="layers")
    shapes = relationship(
        "LocationShape",
        back_populates="layer",
        cascade="all, delete-orphan",
        order_by="LocationShape.id",
    )


class LocationShape(Base):
    __tablename__ = "location_shapes"

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True)
    layer_id = Column(Integer, ForeignKey("map_layers.id", ondelete="CASCADE"), nullable=False, index=True)
    # Polygon points as `[[x, y], [x, y], ...]` in the layer's native coordinate space.
    # Multiple shapes per (location, layer) are allowed — no unique constraint.
    points = Column(JSONB, nullable=False)
    # Optional per-shape style override: {fill, stroke, opacity}.
    style = Column(JSONB, nullable=True)
    label = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    location = relationship("Location", back_populates="shapes")
    layer = relationship("MapLayer", back_populates="shapes")
