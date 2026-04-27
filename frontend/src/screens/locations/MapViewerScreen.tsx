import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { api, assetUrl } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { MapCanvas, type DraftShape } from '../../components/MapCanvas';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { useRouter } from '../../navigation/Router';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { HotelMap, Location, LocationShape, MapLayer } from '../../types/location';

/**
 * Read-only floor-plan viewer.
 *
 * One canvas per layer: a server-rendered 600 DPI PNG of the source PDF
 * (rendered by `backend/scripts/extract_floor_plans.py`, with the bad
 * non-floor-plan layers turned off in PyMuPDF's OCG default config) plus an
 * SVG polygon overlay rendered through `MapCanvas` in `view` mode. Pan,
 * pinch-zoom, and mouse-wheel zoom all share the same coordinate system, so
 * the polygons stay anchored to the floor plan at every zoom level.
 *
 * Each polygon shows its assigned location's name as a centred label
 * (`MapCanvas` `showLabels`), so the read-only viewer doubles as a
 * "what room is this?" reference.
 *
 * Loads the default map (the first one by `sort_order, name` — for now the
 * single seeded "Bleiche Resort" map; the API and data model already support
 * multiple maps, so when more are added we'll grow a map switcher into this
 * screen).
 *
 * Admin / manager users see an "Edit polygons" button that takes them to the
 * `MapEditorScreen` for the active layer; everyone else sees the viewer
 * strictly read-only.
 */


// Roles allowed to edit polygons. Mirrors the backend's
// require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER) on the mutating
// /api/location-shapes endpoints.
const EDIT_ROLES = new Set(['admin', 'manager']);


export default function MapViewerScreen() {
  const { addToast } = useToast();
  const { t } = useI18n();
  const [maps, setMaps] = useState<HotelMap[] | null>(null);

  useEffect(() => {
    api.listMaps()
      .then(setMaps)
      .catch((e: Error) => {
        setMaps([]);
        addToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load maps' });
      });
  }, [addToast]);

  if (maps === null) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  if (maps.length === 0 || maps[0].layers.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyTitle}>{t('floorPlans.empty.title')}</Text>
        <Text style={s.emptyBody}>{t('floorPlans.empty.body')}</Text>
      </View>
    );
  }

  // Convention: the first map is the default. The data model supports more,
  // but the UI currently treats `maps[0]` as "the" hotel map.
  return <Viewer map={maps[0]} />;
}


function Viewer({ map }: { map: HotelMap }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { addToast } = useToast();

  const [layerIdx, setLayerIdx] = useState(0);
  const layer = map.layers[layerIdx];
  const imageSrc = useMemo(() => assetUrl(layer.image_url), [layer.image_url]);

  const [shapes, setShapes] = useState<LocationShape[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  // Load shapes whenever the active layer changes; locations once.
  useEffect(() => {
    setShapes(null);
    api.getLayerShapes(layer.id)
      .then(setShapes)
      .catch((e: Error) => {
        setShapes([]);
        addToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load shapes' });
      });
  }, [layer.id, addToast]);

  useEffect(() => {
    api.listLocations()
      .then(setLocations)
      .catch((e: Error) => addToast({ type: 'error', title: 'Error', message: e.message }));
  }, [addToast]);

  const draftShapes: DraftShape[] = useMemo(() => {
    if (!shapes) return [];
    return shapes.map((s) => ({
      id: s.id,
      location_id: s.location_id,
      points: s.points,
      style: s.style,
      label: s.label,
    }));
  }, [shapes]);

  const canEdit = !!user && EDIT_ROLES.has(user.role);

  return (
    <View style={s.root}>
      <View style={s.canvasWrap}>
        <MapCanvas
          layer={layer}
          imageSrc={imageSrc}
          shapes={draftShapes}
          locations={locations}
          selectedShapeId={null}
          tool="view"
          showLabels
        />
      </View>

      {/* Top-left: map name + floor switcher */}
      <View style={s.topbarLeft} pointerEvents="box-none">
        <Text style={s.mapName} numberOfLines={1}>
          {map.name}
        </Text>
        <View style={s.pills}>
          {map.layers.map((l, idx) => {
            const active = idx === layerIdx;
            return (
              <TouchableOpacity
                key={l.id}
                style={[s.pill, active && s.pillActive]}
                onPress={() => setLayerIdx(idx)}
                accessibilityRole="button"
                accessibilityLabel={l.name}
                accessibilityState={{ selected: active }}
              >
                <Text style={[s.pillShort, active && s.pillShortActive]}>{shortLabel(l.name)}</Text>
                <Text style={[s.pillFull, active && s.pillFullActive]} numberOfLines={1}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Top-right: shape count + admin edit CTA */}
      <View style={s.topbarRight} pointerEvents="box-none">
        {shapes && (
          <View style={s.statBox}>
            <Text style={s.statText}>
              {t('floorPlans.shapeCount').replace('{count}', String(shapes.length))}
            </Text>
          </View>
        )}
        {canEdit && (
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => navigate({ name: 'map-editor', layerId: layer.id })}
            accessibilityRole="button"
            accessibilityLabel={t('floorPlans.editPolygons')}
          >
            <Text style={s.editBtnText}>✎ {t('floorPlans.editPolygons')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}


function shortLabel(name: string): string {
  // Compact form for floor pills:
  //   "Erdgeschoss" → "EG"
  //   "1. Obergeschoss" → "1.OG"
  //   "Dachgeschoss" → "DG"
  // Falls back to the full name when no obvious short form exists.
  const m = name.match(/^(\d+)\s*\.\s*Obergeschoss/i);
  if (m) return `${m[1]}.OG`;
  if (/^Erdgeschoss$/i.test(name)) return 'EG';
  if (/^Dachgeschoss$/i.test(name)) return 'DG';
  if (/^Untergeschoss$/i.test(name)) return 'UG';
  return name;
}


const s = StyleSheet.create({
  root: { flex: 1, position: 'relative', backgroundColor: colors.brand50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark500, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, textAlign: 'center', maxWidth: 480, lineHeight: 18 },

  canvasWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },

  topbarLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start',
    maxWidth: '70%',
  },
  topbarRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  mapName: {
    fontFamily: fonts.serif,
    fontSize: 14,
    color: colors.brand800,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.belSoftBorder,
    letterSpacing: 0.4,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.belSoftBorder,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    minWidth: 56,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.brand600,
  },
  pillShort: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark600,
    letterSpacing: 0.5,
  },
  pillShortActive: {
    color: colors.white,
  },
  pillFull: {
    fontFamily: fonts.sans,
    fontSize: 9,
    color: colors.dark400,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pillFullActive: {
    color: 'rgba(255,255,255,0.85)',
  },

  statBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.belSoftBorder,
  },
  statText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
    letterSpacing: 0.4,
  },
  editBtn: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
  },
  editBtnText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.4,
  },
});
