"""create locations, maps, map_layers, location_shapes

Revision ID: 202705b2c3d4
Revises: 202704a1b2c3
Create Date: 2026-04-24 15:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "202705b2c3d4"
down_revision: Union[str, None] = "202704a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # locations — hierarchy via self-referencing parent_id (RESTRICT on delete).
    #
    # `source_id` carries an external identifier (typically a UUID) so the same
    # JSON export can be re-imported into any database and preserve identity.
    # `environment` and `category` are plain VARCHARs validated at the Pydantic
    # layer rather than DB enums, so the set of allowed values can grow without
    # a schema migration.
    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("locations.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("source_id", sa.String(length=64), nullable=True, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("environment", sa.String(length=16), nullable=False, server_default="indoor"),
        sa.Column("category", sa.String(length=32), nullable=False, server_default="room"),
        sa.Column("room_number", sa.String(length=64), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_locations_parent_id", "locations", ["parent_id"])
    op.create_index("ix_locations_id", "locations", ["id"])
    op.create_index("ix_locations_source_id", "locations", ["source_id"], unique=True)

    # maps
    op.create_table(
        "maps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_maps_id", "maps", ["id"])

    # map_layers
    op.create_table(
        "map_layers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "map_id",
            sa.Integer(),
            sa.ForeignKey("maps.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("svg_content", sa.Text(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_map_layers_map_id", "map_layers", ["map_id"])
    op.create_index("ix_map_layers_id", "map_layers", ["id"])

    # location_shapes — polygon per (location, layer); multiple allowed
    op.create_table(
        "location_shapes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "location_id",
            sa.Integer(),
            sa.ForeignKey("locations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "layer_id",
            sa.Integer(),
            sa.ForeignKey("map_layers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("points", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("style", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("label", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_location_shapes_location_id", "location_shapes", ["location_id"])
    op.create_index("ix_location_shapes_layer_id", "location_shapes", ["layer_id"])
    op.create_index("ix_location_shapes_id", "location_shapes", ["id"])


def downgrade() -> None:
    op.drop_index("ix_location_shapes_id", table_name="location_shapes")
    op.drop_index("ix_location_shapes_layer_id", table_name="location_shapes")
    op.drop_index("ix_location_shapes_location_id", table_name="location_shapes")
    op.drop_table("location_shapes")

    op.drop_index("ix_map_layers_id", table_name="map_layers")
    op.drop_index("ix_map_layers_map_id", table_name="map_layers")
    op.drop_table("map_layers")

    op.drop_index("ix_maps_id", table_name="maps")
    op.drop_table("maps")

    # `IF EXISTS` here is defensive: it lets a downgrade succeed even if a
    # teammate applied an earlier draft of this migration that didn't create
    # this index (the schema was iterated in-place before the first commit).
    op.execute("DROP INDEX IF EXISTS ix_locations_source_id")
    op.drop_index("ix_locations_id", table_name="locations")
    op.drop_index("ix_locations_parent_id", table_name="locations")
    op.drop_table("locations")
