export type Point = [number, number];

export type LocationEnvironment = 'indoor' | 'outdoor';
export type LocationCategory = 'building' | 'floor' | 'room';

export interface Location {
  id: number;
  /**
   * External identifier (typically a UUID) carried by JSON imports. Lets the
   * same export load into another database while preserving identity.
   * `null` for rows created directly in the UI.
   */
  source_id: string | null;
  name: string;
  description: string | null;
  parent_id: number | null;
  environment: LocationEnvironment;
  category: LocationCategory;
  room_number: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LocationTreeNode extends Location {
  children: LocationTreeNode[];
}

export interface LocationInput {
  name: string;
  description?: string | null;
  parent_id?: number | null;
  environment?: LocationEnvironment;
  category?: LocationCategory;
  room_number?: string | null;
  sort_order?: number;
}

export interface MapLayer {
  id: number;
  map_id: number;
  name: string;
  image_url: string | null;
  svg_content: string | null;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MapLayerInput {
  map_id: number;
  name: string;
  image_url?: string | null;
  svg_content?: string | null;
  width: number;
  height: number;
  sort_order?: number;
}

export interface HotelMap {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  layers: MapLayer[];
}

export interface MapInput {
  name: string;
  description?: string | null;
  sort_order?: number;
}

export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  opacity?: number;
}

export interface LocationShape {
  id: number;
  location_id: number;
  layer_id: number;
  points: Point[];
  style: ShapeStyle | null;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocationShapeInput {
  location_id: number;
  layer_id: number;
  points: Point[];
  style?: ShapeStyle | null;
  label?: string | null;
}
