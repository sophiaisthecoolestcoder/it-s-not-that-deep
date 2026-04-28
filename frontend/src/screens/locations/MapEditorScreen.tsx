import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api, assetUrl } from '../../api/client';
import { MapCanvas, type DraftShape, type Tool } from '../../components/MapCanvas';
import { useToast } from '../../components/ui/Toast';
import { useRouter } from '../../navigation/Router';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type {
  Location,
  LocationShape,
  LocationShapeInput,
  MapLayer,
  Point,
} from '../../types/location';


interface Props {
  layerId: number;
}

// Tree helpers (mirror LocationsTreeScreen's minimal implementation)
interface TreeRow extends Location {
  depth: number;
  hasChildren: boolean;
}

function buildIndentedList(flat: Location[]): TreeRow[] {
  const byParent = new Map<number | null, Location[]>();
  for (const l of flat) {
    const key = l.parent_id;
    const list = byParent.get(key) ?? [];
    list.push(l);
    byParent.set(key, list);
  }
  const sortEach = (arr: Location[]) =>
    arr.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
  for (const v of byParent.values()) sortEach(v);

  const out: TreeRow[] = [];
  const walk = (parentId: number | null, depth: number) => {
    const kids = byParent.get(parentId) ?? [];
    for (const k of kids) {
      out.push({ ...k, depth, hasChildren: (byParent.get(k.id)?.length ?? 0) > 0 });
      walk(k.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}


// Draft / committed shape bookkeeping.
// Editor state converts server shapes into `DraftShape` with a local numeric id;
// on Save we POST a bulk replace that strips the local ids.
let nextLocalId = -1;

function toDraft(shape: LocationShape): DraftShape {
  return {
    id: shape.id,
    location_id: shape.location_id,
    points: shape.points,
    style: shape.style,
    label: shape.label,
  };
}


export default function MapEditorScreen({ layerId }: Props) {
  const { addToast } = useToast();
  const { navigate } = useRouter();

  const [layer, setLayer] = useState<MapLayer | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [shapes, setShapes] = useState<DraftShape[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const [tool, setTool] = useState<Tool>('select');
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');

  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaveTargetRef = useRef<null | (() => void)>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.getMapLayer(layerId),
      api.listLocations(),
      api.getLayerShapes(layerId),
    ])
      .then(([layerRow, locationRows, shapeRows]) => {
        setLayer(layerRow);
        setLocations(locationRows);
        setShapes(shapeRows.map(toDraft));
        setHasUnsaved(false);
      })
      .catch((e: Error) => addToast({ type: 'error', title: 'Error', message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast, layerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Keyboard shortcuts (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'v' || e.key === 'V') setTool('select');
      else if (e.key === 'p' || e.key === 'P') setTool('draw');
      else if (e.key === 'h' || e.key === 'H') setTool('pan');
      else if (e.key === 'Escape') {
        if (tool === 'draw' && draftPoints.length) setDraftPoints([]);
        else setSelectedShapeId(null);
      } else if (e.key === 'Enter') {
        if (tool === 'draw' && draftPoints.length >= 3) commitDraftPolygon();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedShapeId != null) {
          setShapes((prev) => prev.filter((p) => p.id !== selectedShapeId));
          setSelectedShapeId(null);
          setHasUnsaved(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, draftPoints, selectedShapeId]);

  const treeRows = useMemo(() => buildIndentedList(locations), [locations]);

  // Locations tree starts fully collapsed (only roots visible). Each row's
  // chevron toggles expansion; while a filter is active we ignore the
  // collapse state so search hits aren't hidden.
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const toggleNodeExpansion = useCallback((id: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredTree = useMemo(() => {
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      return treeRows.filter((r) => r.name.toLowerCase().includes(q));
    }
    // No filter — collapse non-expanded subtrees.
    const byId = new Map(treeRows.map((r) => [r.id, r]));
    return treeRows.filter((row) => {
      let pid: number | null = row.parent_id;
      while (pid != null) {
        if (!expandedNodes.has(pid)) return false;
        const parent = byId.get(pid);
        if (!parent) break;
        pid = parent.parent_id;
      }
      return true;
    });
  }, [treeRows, filterText, expandedNodes]);

  const locationById = useMemo(() => {
    const m = new Map<number, Location>();
    locations.forEach((l) => m.set(l.id, l));
    return m;
  }, [locations]);

  const shapeCountByLocation = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of shapes) {
      if (s.location_id == null) continue;
      m.set(s.location_id, (m.get(s.location_id) ?? 0) + 1);
    }
    return m;
  }, [shapes]);

  const commitDraftPolygon = useCallback(() => {
    if (draftPoints.length < 3) return;
    const id = nextLocalId--;
    setShapes((prev) => [
      ...prev,
      {
        id,
        location_id: selectedLocationId,
        points: draftPoints,
      },
    ]);
    setDraftPoints([]);
    setSelectedShapeId(id);
    setHasUnsaved(true);
  }, [draftPoints, selectedLocationId]);

  const onPickPoint = useCallback(
    (p: Point) => {
      if (tool !== 'draw') return;
      // Double-click-close: if new point is very close to the first point, close instead.
      if (draftPoints.length >= 3) {
        const dx = p[0] - draftPoints[0][0];
        const dy = p[1] - draftPoints[0][1];
        const closeEnough = Math.hypot(dx, dy) < Math.max(layer?.width ?? 1, layer?.height ?? 1) * 0.01;
        if (closeEnough) {
          commitDraftPolygon();
          return;
        }
      }
      setDraftPoints((prev) => [...prev, p]);
    },
    [tool, draftPoints, commitDraftPolygon, layer?.width, layer?.height],
  );

  const onMoveVertex = useCallback((shapeId: number, vertexIndex: number, next: Point) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === shapeId
          ? { ...s, points: s.points.map((pt, i) => (i === vertexIndex ? next : pt)) }
          : s,
      ),
    );
    setHasUnsaved(true);
  }, []);

  const onMoveShape = useCallback((shapeId: number, dx: number, dy: number) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === shapeId
          ? { ...s, points: s.points.map(([x, y]) => [x + dx, y + dy] as Point) }
          : s,
      ),
    );
    setHasUnsaved(true);
  }, []);

  // Insert a new vertex into a surface partway along an edge — fired when
  // the user double-clicks an already-selected surface's edge.
  const onSplitEdge = useCallback((shapeId: number, edgeIndex: number, point: Point) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        const next = [...s.points];
        next.splice(edgeIndex + 1, 0, point);
        return { ...s, points: next };
      }),
    );
    setHasUnsaved(true);
  }, []);

  // Remove a vertex — fired when the user shift-clicks a vertex handle on
  // the selected surface. We never let a polygon collapse below 3 points.
  const onDeleteVertex = useCallback((shapeId: number, vertexIndex: number) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        if (s.points.length <= 3) return s;
        return { ...s, points: s.points.filter((_, i) => i !== vertexIndex) };
      }),
    );
    setHasUnsaved(true);
  }, []);

  const onSelectShape = (id: number | null) => {
    setSelectedShapeId(id);
    if (id != null) {
      const shape = shapes.find((s) => s.id === id);
      if (shape?.location_id != null) setSelectedLocationId(shape.location_id);
    }
  };

  const deleteShape = (id: number) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
    setHasUnsaved(true);
  };

  const assignShapeToLocation = (shapeId: number, locationId: number | null) => {
    setShapes((prev) => prev.map((s) => s.id === shapeId ? { ...s, location_id: locationId } : s));
    setHasUnsaved(true);
  };

  const save = async () => {
    const unassigned = shapes.filter((s) => s.location_id == null);
    if (unassigned.length) {
      addToast({
        type: 'warning',
        title: 'Unassigned surfaces',
        message: `${unassigned.length} surface(s) have no location. Assign each before saving.`,
      });
      return;
    }
    const payload: LocationShapeInput[] = shapes.map((s) => ({
      location_id: s.location_id as number,
      layer_id: layerId,
      points: s.points,
      style: s.style ?? null,
      label: s.label ?? null,
    }));
    try {
      setSaving(true);
      const saved = await api.replaceLayerShapes(layerId, payload);
      setShapes(saved.map(toDraft));
      setHasUnsaved(false);
      addToast({ type: 'success', title: 'Saved', message: `${saved.length} surface(s) on this layer.` });
    } catch (e) {
      addToast({ type: 'error', title: 'Save failed', message: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const onBack = () => {
    if (hasUnsaved) {
      leaveTargetRef.current = () => navigate({ name: 'maps-list' });
      setConfirmLeave(true);
    } else {
      navigate({ name: 'maps-list' });
    }
  };

  if (loading || !layer) {
    return <View style={s.loading}><ActivityIndicator color={colors.brand600} /></View>;
  }

  const selectedShape = selectedShapeId != null ? shapes.find((x) => x.id === selectedShapeId) : null;

  return (
    <View style={s.root}>
      {/* Top toolbar */}
      <View style={s.topbar}>
        <TouchableOpacity style={s.secondaryBtn} onPress={onBack}>
          <Text style={s.secondaryBtnText}>← Maps</Text>
        </TouchableOpacity>
        <Text style={s.title}>{layer.name}</Text>

        <View style={s.toolGroup}>
          <ToolButton label="Select (V)" active={tool === 'select'} onPress={() => setTool('select')} />
          <ToolButton label="Draw (P)" active={tool === 'draw'} onPress={() => setTool('draw')} />
          <ToolButton label="Pan (H)" active={tool === 'pan'} onPress={() => setTool('pan')} />
        </View>

        <View style={{ flex: 1 }} />

        {hasUnsaved && <Text style={s.unsaved}>● Unsaved changes</Text>}
        <TouchableOpacity
          style={[s.primaryBtn, (!hasUnsaved || saving) && s.disabled]}
          disabled={!hasUnsaved || saving}
          onPress={save}
        >
          <Text style={s.primaryBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {/* Left panel: locations */}
        <View style={s.leftPanel}>
          <Text style={s.panelTitle}>Locations</Text>
          <TextInput
            style={s.input}
            value={filterText}
            onChangeText={setFilterText}
            placeholder="Filter…"
            autoCapitalize="none"
          />
          <ScrollView style={s.treeList}>
            <Pressable
              onPress={() => setSelectedLocationId(null)}
              style={[s.treeRow, selectedLocationId == null && s.treeRowActive]}
            >
              <View style={s.chevronCell} />
              <Text style={s.treeRowText}>— None —</Text>
            </Pressable>
            {filteredTree.map((row) => {
              const isSelected = selectedLocationId === row.id;
              const count = shapeCountByLocation.get(row.id) ?? 0;
              const open = expandedNodes.has(row.id);
              return (
                <Pressable
                  key={row.id}
                  style={[s.treeRow, { paddingLeft: 6 + row.depth * 14 }, isSelected && s.treeRowActive]}
                  onPress={() => setSelectedLocationId(row.id)}
                >
                  {row.hasChildren ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleNodeExpansion(row.id);
                      }}
                      style={s.chevronCell}
                      hitSlop={8}
                    >
                      <Text style={s.chevronText}>{open ? '▾' : '▸'}</Text>
                    </Pressable>
                  ) : (
                    <View style={s.chevronCell} />
                  )}
                  <Text style={[s.treeRowText, isSelected && s.treeRowTextActive]} numberOfLines={1}>{row.name}</Text>
                  {count > 0 && <Text style={s.treeCount}>{count}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={s.hintBox}>
            <Text style={s.hintText}>
              1. Click a location on the left (use ▸ to expand).{'\n'}
              2. Use "Draw" (P) to place vertices on the plan. Click the first vertex (or press Enter) to close.{'\n'}
              3. The new surface attaches to the selected location. One location can carry multiple surfaces.{'\n'}
              4. Edit: Select (V) a surface, drag vertices, drag the body to move it.{'\n'}
              5. Double-click an edge to insert a vertex. Shift-click a vertex to remove it.
            </Text>
          </View>
        </View>

        {/* Canvas */}
        <View style={s.canvasWrap}>
          <MapCanvas
            layer={layer}
            imageSrc={layer.image_url ? assetUrl(layer.image_url) : null}
            shapes={shapes}
            locations={locations}
            selectedShapeId={selectedShapeId}
            draftPoints={tool === 'draw' ? draftPoints : null}
            tool={tool}
            onPickPoint={onPickPoint}
            onSelectShape={onSelectShape}
            onMoveVertex={onMoveVertex}
            onMoveShape={onMoveShape}
            onSplitEdge={onSplitEdge}
            onDeleteVertex={onDeleteVertex}
          />
        </View>

        {/* Right panel: surface list + properties */}
        <View style={s.rightPanel}>
          <Text style={s.panelTitle}>Surfaces on this layer ({shapes.length})</Text>
          <ScrollView style={s.shapesList}>
            {shapes.length === 0 && (
              <Text style={s.emptyText}>No surfaces yet. Pick a location, switch to Draw (P), and click around the room on the plan.</Text>
            )}
            {shapes.map((shape) => {
              const loc = shape.location_id != null ? locationById.get(shape.location_id) : null;
              const isSelected = shape.id === selectedShapeId;
              return (
                <Pressable
                  key={shape.id}
                  onPress={() => onSelectShape(shape.id)}
                  style={[s.shapeRow, isSelected && s.shapeRowActive]}
                >
                  <View style={[s.shapeDot, { backgroundColor: shape.location_id == null ? colors.dark300 : `hsl(${(shape.location_id * 67) % 360}, 72%, 48%)` }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.shapeRowName} numberOfLines={1}>{loc?.name ?? 'Unassigned'}</Text>
                    <Text style={s.shapeRowMeta}>{shape.points.length} points</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteShape(shape.id)}>
                    <Text style={s.shapeRemove}>✕</Text>
                  </TouchableOpacity>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedShape && (
            <View style={s.propsBox}>
              <Text style={s.panelTitle}>Selected surface</Text>
              <Text style={s.label}>Assigned location</Text>
              <ScrollView style={{ maxHeight: 180 }}>
                <Pressable
                  onPress={() => assignShapeToLocation(selectedShape.id, null)}
                  style={[s.treeRow, selectedShape.location_id == null && s.treeRowActive]}
                >
                  <Text style={s.treeRowText}>— Unassigned —</Text>
                </Pressable>
                {treeRows.map((row) => (
                  <Pressable
                    key={row.id}
                    style={[s.treeRow, { paddingLeft: 10 + row.depth * 12 }, selectedShape.location_id === row.id && s.treeRowActive]}
                    onPress={() => assignShapeToLocation(selectedShape.id, row.id)}
                  >
                    <Text style={[s.treeRowText, selectedShape.location_id === row.id && s.treeRowTextActive]} numberOfLines={1}>{row.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TouchableOpacity style={[s.dangerBtn, { marginTop: 10 }]} onPress={() => deleteShape(selectedShape.id)}>
                <Text style={s.dangerBtnText}>Delete surface (Del)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Modal visible={confirmLeave} transparent animationType="fade" onRequestClose={() => setConfirmLeave(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Unsaved changes</Text>
            <Text style={s.modalBody}>You have unsaved surface changes on this layer. Leave anyway?</Text>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setConfirmLeave(false)}>
                <Text style={s.secondaryBtnText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.dangerBtn}
                onPress={() => {
                  setConfirmLeave(false);
                  leaveTargetRef.current?.();
                }}
              >
                <Text style={s.dangerBtnText}>Discard & leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


function ToolButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.toolBtn, active && s.toolBtnActive]} onPress={onPress}>
      <Text style={[s.toolBtnText, active && s.toolBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}


const PANEL_WIDTH_LEFT = 280;
const PANEL_WIDTH_RIGHT = 300;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.dark100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
  },
  title: { fontFamily: fonts.serif, fontSize: 16, color: colors.brand800, marginLeft: 4 },
  toolGroup: { flexDirection: 'row', gap: 4, marginLeft: 10 },
  toolBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.dark200,
    backgroundColor: colors.white,
  },
  toolBtnActive: {
    backgroundColor: colors.brand100,
    borderColor: colors.brand500,
  },
  toolBtnText: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark600 },
  toolBtnTextActive: { color: colors.brand700, fontWeight: '600' },
  unsaved: { fontFamily: fonts.sans, fontSize: 11, color: colors.error, marginRight: 8 },

  body: { flex: 1, flexDirection: 'row' },
  leftPanel: {
    width: PANEL_WIDTH_LEFT,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.dark200,
    padding: 12,
    gap: 8,
  },
  canvasWrap: { flex: 1 },
  rightPanel: {
    width: PANEL_WIDTH_RIGHT,
    backgroundColor: colors.white,
    borderLeftWidth: 1,
    borderLeftColor: colors.dark200,
    padding: 12,
    gap: 10,
  },
  panelTitle: { fontFamily: fonts.sans, fontSize: 11, fontWeight: '600', color: colors.dark500, letterSpacing: 0.8, textTransform: 'uppercase' },

  treeList: { flex: 1, borderWidth: 1, borderColor: colors.dark200 },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.belSoftBorder,
  },
  treeRowActive: { backgroundColor: colors.brand50 },
  treeRowText: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark700, flex: 1 },
  treeRowTextActive: { color: colors.brand700, fontWeight: '600' },
  chevronCell: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 10,
    color: colors.dark500,
    fontFamily: fonts.sans,
  },
  treeCount: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.brand700,
    backgroundColor: colors.brand100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  hintBox: {
    backgroundColor: colors.brand50,
    borderWidth: 1,
    borderColor: colors.brand200,
    padding: 10,
  },
  hintText: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark600, lineHeight: 16 },

  shapesList: { flex: 1, borderWidth: 1, borderColor: colors.dark200 },
  shapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.belSoftBorder,
  },
  shapeRowActive: { backgroundColor: colors.brand50 },
  shapeDot: { width: 10, height: 10, borderRadius: 5 },
  shapeRowName: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark800 },
  shapeRowMeta: { fontFamily: fonts.sans, fontSize: 10, color: colors.dark400 },
  shapeRemove: { fontSize: 14, color: colors.dark400, paddingHorizontal: 4 },
  emptyText: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, padding: 14, lineHeight: 18 },
  propsBox: { borderTopWidth: 1, borderTopColor: colors.dark200, paddingTop: 10 },

  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark800,
    backgroundColor: colors.white,
  },
  label: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark400, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 },

  primaryBtn: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 2,
  },
  primaryBtnText: { fontFamily: fonts.sans, fontSize: 13, color: colors.white, fontWeight: '600' },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.dark300,
    borderRadius: 2,
  },
  secondaryBtnText: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark600 },
  dangerBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    alignItems: 'center',
  },
  dangerBtnText: { fontFamily: fonts.sans, fontSize: 12, color: colors.white, fontWeight: '600' },
  disabled: { opacity: 0.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderRadius: 4,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark800, marginBottom: 6 },
  modalBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark500, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
});
