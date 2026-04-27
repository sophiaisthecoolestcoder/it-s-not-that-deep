import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';
import type { Location, MapLayer, Point, ShapeStyle } from '../types/location';

/**
 * Renders one map layer (vector SVG or raster image) overlaid with polygon
 * shapes. Shape coordinates live in the layer's native coordinate space
 * (`layer.width × layer.height`, in PDF points for our floor plans). Pan +
 * zoom are owned here via a CSS transform on the wrapper, so the floor plan
 * and the polygon overlay scale together.
 *
 * The floor plan is rendered as an HTML `<img>` (NOT an `<image>` inside
 * SVG): browsers definitively render an `<img src=foo.svg>` as vector at
 * the displayed size, which is what we need for crisp text/lines at any
 * zoom level. The polygon overlay is a sibling `<svg>` positioned on top,
 * so the two share the same wrapper transform but render through their own
 * pipelines. (`<image href=foo.svg>` inside SVG rasterises once at the
 * natural size and pixelates when CSS-scaled past it; that's the whole
 * reason for this layout.)
 *
 * Tools:
 *   - `select`: single-pointer drag pans; clicking a shape selects it,
 *     vertices and the shape body are draggable.
 *   - `draw`:   click to add a vertex; live-tracking line follows the cursor
 *     from the last placed vertex. Click near the first vertex (or press
 *     Enter at the call site) to close the polygon.
 *   - `pan`:    everywhere is a pan handle; shapes don't intercept events.
 *   - `view`:   shapes are clickable but not editable; single-pointer drag
 *     on background pans. Used by the read-only floor-plan viewer.
 *
 * Touch input: a 2-pointer pinch zooms around the midpoint of the two
 * fingers; single-pointer drag pans (in any tool that allows panning).
 *
 * Web-first; native renders a stub View.
 */

export interface DraftShape {
  /** Temporary id used while drawing (replaced on save). */
  id: number;
  location_id: number | null;
  points: Point[];
  style?: ShapeStyle | null;
  label?: string | null;
}

export type Tool = 'select' | 'draw' | 'pan' | 'view';

interface Props {
  layer: MapLayer;
  imageSrc?: string | null;
  shapes: DraftShape[];
  locations: Location[];
  selectedShapeId: number | null;
  draftPoints?: Point[] | null;
  tool: Tool;
  /** Render every shape's location name as a centred label. Used by the viewer. */
  showLabels?: boolean;
  onPickPoint?: (p: Point) => void;
  onSelectShape?: (id: number | null) => void;
  onMoveVertex?: (shapeId: number, vertexIndex: number, next: Point) => void;
  onMoveShape?: (shapeId: number, dx: number, dy: number) => void;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 24;
// Snap-to-first-vertex threshold, expressed as a fraction of the larger of
// the layer's two dimensions. Same as the close-detection threshold in
// MapEditorScreen.onPickPoint, kept in sync here so the visual snap matches
// the actual close-on-click behaviour.
const SNAP_FRACTION = 0.01;


// Deterministic color hash → HSL hue. The fill is the same hue at low alpha;
// the stroke is the same hue at higher saturation.
function colorFor(locationId: number | null): { fill: string; stroke: string } {
  if (locationId == null) {
    return { fill: 'rgba(176, 149, 112, 0.28)', stroke: 'rgba(139, 106, 67, 0.95)' };
  }
  const hue = (locationId * 67) % 360;
  return {
    fill: `hsla(${hue}, 72%, 52%, 0.22)`,
    stroke: `hsla(${hue}, 72%, 38%, 0.95)`,
  };
}

function pointsToString(points: Point[]): string {
  return points.map((p) => `${p[0]},${p[1]}`).join(' ');
}

function centroid(points: Point[]): Point {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of points) {
    cx += x;
    cy += y;
  }
  return [cx / points.length, cy / points.length];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function getWebSvgPoint(clientX: number, clientY: number, svg: SVGSVGElement): Point {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return [0, 0];
  const transformed = pt.matrixTransform(ctm.inverse());
  return [transformed.x, transformed.y];
}

function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}


export function MapCanvas(props: Props) {
  if (Platform.OS !== 'web') {
    return <View style={styles.nativeFallback} />;
  }
  return <WebCanvas {...props} />;
}


function WebCanvas({
  layer,
  imageSrc,
  shapes,
  locations,
  selectedShapeId,
  draftPoints,
  tool,
  showLabels = false,
  onPickPoint,
  onSelectShape,
  onMoveVertex,
  onMoveShape,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Active pointer tracking — keyed by pointerId. Used to distinguish
  // single-pointer drag (pan / vertex / shape) from two-pointer pinch.
  const pointers = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinchStart = useRef<
    | null
    | {
        distance: number;
        midX: number;
        midY: number;
        viewport: { x: number; y: number; zoom: number };
      }
  >(null);

  const [vertexDrag, setVertexDrag] = useState<{ shapeId: number; vertexIndex: number } | null>(null);
  const [shapeDrag, setShapeDrag] = useState<{ shapeId: number; last: Point } | null>(null);

  // Cursor position in canvas coordinates while drawing — drives the live
  // preview line from the last placed vertex to the cursor.
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);

  // Fit-to-container on first mount, and only re-fit if the layer's intrinsic
  // dimensions change (a swap to a layer of the same size — e.g. switching
  // floors when every plan is rendered at the same resolution — keeps the
  // user's current zoom/pan, so navigation feels stacked).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const zoom = Math.min(rect.width / layer.width, rect.height / layer.height);
    const zx = clampZoom(zoom);
    setViewport({
      x: (rect.width - layer.width * zx) / 2,
      y: (rect.height - layer.height * zx) / 2,
      zoom: zx,
    });
  }, [layer.width, layer.height]);

  // Drop the cursor preview when the tool changes or there's nothing to preview from
  useEffect(() => {
    if (tool !== 'draw' || !draftPoints?.length) {
      setCursorPoint(null);
    }
  }, [tool, draftPoints]);

  const locationById = useMemo(() => {
    const m = new Map<number, Location>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const snapThreshold = Math.max(layer.width, layer.height) * SNAP_FRACTION;
  const snapToStart = useMemo(() => {
    if (tool !== 'draw' || !draftPoints || draftPoints.length < 3 || !cursorPoint) return false;
    return distance(draftPoints[0], cursorPoint) < snapThreshold;
  }, [tool, draftPoints, cursorPoint, snapThreshold]);

  const wantsBackgroundPan = tool === 'select' || tool === 'pan' || tool === 'view';

  // Mouse-wheel zoom around the cursor.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!wrapperRef.current) return;
      e.preventDefault();
      const rect = wrapperRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setViewport((v) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const nextZoom = clampZoom(v.zoom * factor);
        const localX = (mouseX - v.x) / v.zoom;
        const localY = (mouseY - v.y) / v.zoom;
        return {
          zoom: nextZoom,
          x: mouseX - localX * nextZoom,
          y: mouseY - localY * nextZoom,
        };
      });
    },
    [],
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const cursor = (() => {
    if (panning) return 'grabbing';
    if (vertexDrag || shapeDrag) return 'grabbing';
    if (tool === 'pan') return 'grab';
    if (tool === 'view') return 'grab';
    if (tool === 'draw') return 'crosshair';
    return 'default';
  })();

  // ── Pointer handlers ────────────────────────────────────────────────────

  // The img + overlay SVG both have pointer-events: none, so background
  // pointer events bubble to the wrapper. Polygons inside the overlay opt
  // back in with pointer-events: auto (in interactive tools) and call their
  // own handler before bubbling.

  const beginPinch = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    pinchStart.current = {
      distance: dist || 1,
      midX: (a.clientX + b.clientX) / 2,
      midY: (a.clientY + b.clientY) / 2,
      viewport,
    };
    panStart.current = null;
    setPanning(false);
    setVertexDrag(null);
    setShapeDrag(null);
  };

  const onWrapperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    (e.currentTarget as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);

    if (pointers.current.size >= 2) {
      beginPinch();
      e.preventDefault();
      return;
    }

    // The polygon overlay has its own handlers that stopPropagation when a
    // shape/vertex is clicked. So if we get here, the click is on background.

    const wantsPan = e.button === 1 || e.shiftKey || wantsBackgroundPan;
    if (wantsPan) {
      panStart.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y };
      setPanning(true);
      e.preventDefault();
      return;
    }

    if (tool === 'draw') {
      const svg = overlaySvgRef.current;
      if (!svg) return;
      const pt = getWebSvgPoint(e.clientX, e.clientY, svg);
      onPickPoint?.(pt);
      // The new vertex becomes the start of a fresh preview segment.
      setCursorPoint(pt);
      return;
    }
    if (tool === 'select') {
      onSelectShape?.(null);
      return;
    }
  };

  const onWrapperPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    if (pointers.current.size >= 2 && pinchStart.current && wrapperRef.current) {
      const pts = [...pointers.current.values()];
      const [a, b] = pts;
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
      const startV = pinchStart.current.viewport;
      const factor = dist / pinchStart.current.distance;
      const nextZoom = clampZoom(startV.zoom * factor);
      const rect = wrapperRef.current.getBoundingClientRect();
      const startSx = pinchStart.current.midX - rect.left;
      const startSy = pinchStart.current.midY - rect.top;
      const localX = (startSx - startV.x) / startV.zoom;
      const localY = (startSy - startV.y) / startV.zoom;
      const sx = midX - rect.left;
      const sy = midY - rect.top;
      setViewport({
        zoom: nextZoom,
        x: sx - localX * nextZoom,
        y: sy - localY * nextZoom,
      });
      return;
    }

    if (panning && panStart.current) {
      const start = panStart.current;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      setViewport((v) => ({ zoom: v.zoom, x: start.vx + dx, y: start.vy + dy }));
      return;
    }
    if (vertexDrag && overlaySvgRef.current) {
      const pt = getWebSvgPoint(e.clientX, e.clientY, overlaySvgRef.current);
      onMoveVertex?.(vertexDrag.shapeId, vertexDrag.vertexIndex, pt);
      return;
    }
    if (shapeDrag && overlaySvgRef.current) {
      const pt = getWebSvgPoint(e.clientX, e.clientY, overlaySvgRef.current);
      const dx = pt[0] - shapeDrag.last[0];
      const dy = pt[1] - shapeDrag.last[1];
      onMoveShape?.(shapeDrag.shapeId, dx, dy);
      setShapeDrag({ ...shapeDrag, last: pt });
      return;
    }

    // Track the cursor for the live draw preview.
    if (tool === 'draw' && draftPoints && draftPoints.length > 0 && overlaySvgRef.current) {
      const pt = getWebSvgPoint(e.clientX, e.clientY, overlaySvgRef.current);
      setCursorPoint(pt);
    }
  };

  const onWrapperPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as unknown as { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2 && pinchStart.current) {
      pinchStart.current = null;
      const remaining = [...pointers.current.values()][0];
      if (remaining && wantsBackgroundPan) {
        panStart.current = {
          x: remaining.clientX,
          y: remaining.clientY,
          vx: viewport.x,
          vy: viewport.y,
        };
        setPanning(true);
      }
    }

    if (pointers.current.size === 0) {
      panStart.current = null;
      setPanning(false);
      setVertexDrag(null);
      setShapeDrag(null);
    }
  };

  const onWrapperPointerLeave = () => {
    if (tool === 'draw') setCursorPoint(null);
  };

  const onVertexDown = (e: React.PointerEvent, shapeId: number, vertexIndex: number) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    (e.currentTarget as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
    setVertexDrag({ shapeId, vertexIndex });
  };

  const onShapePointerDown = (e: React.PointerEvent, shape: DraftShape) => {
    if (tool === 'pan' || tool === 'draw') return;
    e.stopPropagation();
    onSelectShape?.(shape.id);
    if (tool === 'select' && overlaySvgRef.current) {
      const pt = getWebSvgPoint(e.clientX, e.clientY, overlaySvgRef.current);
      (e.currentTarget as unknown as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
      setShapeDrag({ shapeId: shape.id, last: pt });
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  // Plain `translate(...)` rather than `translate3d(...)`. The 3d variant
  // and `will-change: transform` both promote the subtree to a GPU layer
  // cached at the current rendered size; when the user then zooms in, the
  // browser stretches the cached raster instead of re-rasterising the SVG
  // at the new scale, and we get visible pixelation. Plain 2D transforms
  // let the browser re-rasterise on scale changes — slower per zoom step,
  // but the floor plan stays vector-crisp at every zoom level.
  const transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

  // First-vertex highlight when the cursor is in snap range.
  const firstDraft = draftPoints && draftPoints.length > 0 ? draftPoints[0] : null;
  const lastDraft = draftPoints && draftPoints.length > 0 ? draftPoints[draftPoints.length - 1] : null;
  const previewEnd: Point | null = (() => {
    if (tool !== 'draw' || !lastDraft || !cursorPoint) return null;
    if (snapToStart && firstDraft) return firstDraft;
    return cursorPoint;
  })();

  const interactiveShapes = tool !== 'pan' && tool !== 'draw';

  return (
    <View style={styles.root}>
      <div
        ref={wrapperRef}
        onPointerDown={onWrapperPointerDown}
        onPointerMove={onWrapperPointerMove}
        onPointerUp={onWrapperPointerUp}
        onPointerCancel={onWrapperPointerUp}
        onPointerLeave={onWrapperPointerLeave}
        style={
          {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: colors.dark100,
            position: 'relative',
            cursor,
            userSelect: 'none',
            touchAction: 'none',
          } as unknown as React.CSSProperties
        }
      >
        <div
          style={
            {
              position: 'absolute',
              left: 0,
              top: 0,
              transform,
              transformOrigin: '0 0',
              width: layer.width,
              height: layer.height,
              pointerEvents: 'none',
              // Deliberately NO `will-change: transform` / `translate3d` /
              // `backface-visibility: hidden`. All three promote this
              // subtree to a GPU texture layer cached at the *current*
              // rasterised size. When the user zooms in, the browser
              // stretches that cached texture instead of re-rasterising
              // the SVG — that's exactly what causes the pixelation we
              // saw. Plain 2D transforms let the browser re-rasterise on
              // every scale change.
            } as unknown as React.CSSProperties
          }
        >
          {/* "Page" background — brand cream so the floor plan reads as part
              of the UI rather than a generic white sheet. The themed SVG
              tints rooms slightly darker on top of this. */}
          <div
            style={
              {
                position: 'absolute',
                left: 0,
                top: 0,
                width: layer.width,
                height: layer.height,
                background: colors.brand50,
              } as unknown as React.CSSProperties
            }
          />
          {/* Floor plan — HTML <img> renders SVG sources as vector at any zoom. */}
          {imageSrc && (
            <img
              src={imageSrc}
              alt={layer.name}
              draggable={false}
              style={
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: layer.width,
                  height: layer.height,
                  pointerEvents: 'none',
                  userSelect: 'none',
                } as unknown as React.CSSProperties
              }
            />
          )}
          {/* Polygon overlay — same coordinate system, sits on top. */}
          <svg
            ref={overlaySvgRef}
            width={layer.width}
            height={layer.height}
            viewBox={`0 0 ${layer.width} ${layer.height}`}
            style={
              {
                position: 'absolute',
                left: 0,
                top: 0,
                display: 'block',
                pointerEvents: 'none',
                overflow: 'visible',
              } as unknown as React.CSSProperties
            }
          >
            {/* Shapes — children opt back in to pointer events when interactive. */}
            {shapes.map((s) => {
              const selected = s.id === selectedShapeId;
              const { fill, stroke } = colorFor(s.location_id);
              const applied: ShapeStyle = s.style ?? {};
              return (
                <g key={s.id} pointerEvents={interactiveShapes ? 'auto' : 'none'}>
                  <polygon
                    points={pointsToString(s.points)}
                    fill={applied.fill ?? fill}
                    stroke={applied.stroke ?? stroke}
                    strokeWidth={selected ? 3 / viewport.zoom : 2 / viewport.zoom}
                    opacity={applied.opacity ?? 1}
                    onPointerDown={(e) => onShapePointerDown(e, s)}
                  />
                  {selected && tool === 'select' &&
                    s.points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p[0]}
                        cy={p[1]}
                        r={7 / viewport.zoom}
                        fill={colors.white}
                        stroke={stroke}
                        strokeWidth={2 / viewport.zoom}
                        style={{ cursor: 'grab' } as unknown as React.CSSProperties}
                        onPointerDown={(e) => onVertexDown(e, s.id, i)}
                      />
                    ))}
                  {(showLabels || selected) &&
                    (() => {
                      const loc = s.location_id != null ? locationById.get(s.location_id) : null;
                      const label = s.label ?? loc?.name ?? (selected ? 'Unassigned' : null);
                      if (!label) return null;
                      const [cx, cy] = centroid(s.points);
                      return (
                        <text
                          x={cx}
                          y={cy}
                          fontSize={14 / viewport.zoom}
                          fill={colors.dark800}
                          stroke={colors.white}
                          strokeWidth={3 / viewport.zoom}
                          paintOrder="stroke"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          pointerEvents="none"
                        >
                          {label}
                        </text>
                      );
                    })()}
                </g>
              );
            })}

            {/* Draft polygon — placed segments + live preview to the cursor */}
            {draftPoints && draftPoints.length > 0 && (
              <g pointerEvents="none">
                <polyline
                  points={pointsToString(draftPoints)}
                  fill="none"
                  stroke={colors.brand600}
                  strokeWidth={2 / viewport.zoom}
                  strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
                />
                {previewEnd && lastDraft && (
                  <line
                    x1={lastDraft[0]}
                    y1={lastDraft[1]}
                    x2={previewEnd[0]}
                    y2={previewEnd[1]}
                    stroke={snapToStart ? '#16a34a' : colors.brand600}
                    strokeWidth={(snapToStart ? 2.5 : 1.5) / viewport.zoom}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                  />
                )}
                {snapToStart && firstDraft && (
                  <line
                    x1={firstDraft[0]}
                    y1={firstDraft[1]}
                    x2={lastDraft ? lastDraft[0] : firstDraft[0]}
                    y2={lastDraft ? lastDraft[1] : firstDraft[1]}
                    stroke="#16a34a"
                    strokeWidth={2.5 / viewport.zoom}
                    strokeDasharray={`${4 / viewport.zoom} ${4 / viewport.zoom}`}
                  />
                )}
                {draftPoints.map((p, i) => {
                  const isFirst = i === 0;
                  const highlight = isFirst && snapToStart;
                  return (
                    <circle
                      key={i}
                      cx={p[0]}
                      cy={p[1]}
                      r={(highlight ? 9 : 6) / viewport.zoom}
                      fill={highlight ? '#16a34a' : colors.brand400}
                      stroke={highlight ? '#15803d' : colors.brand700}
                      strokeWidth={2 / viewport.zoom}
                    />
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      </div>
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.dark100,
  },
  nativeFallback: {
    flex: 1,
    backgroundColor: colors.dark100,
  },
});
