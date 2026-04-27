import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api, assetUrl } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useRouter } from '../../navigation/Router';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { HotelMap, MapLayer, MapLayerInput } from '../../types/location';


interface LayerDraft {
  name: string;
  image_url: string;
  svg_content: string;
  width: string;
  height: string;
  sort_order: string;
  map_id: number;
}


export default function MapsListScreen() {
  const { addToast } = useToast();
  const { navigate } = useRouter();
  const [maps, setMaps] = useState<HotelMap[]>([]);
  const [loading, setLoading] = useState(true);

  const [mapEditor, setMapEditor] = useState<
    | null
    | { mode: 'create' }
    | { mode: 'edit'; map: HotelMap }
  >(null);
  const [mapDraftName, setMapDraftName] = useState('');
  const [mapDraftDesc, setMapDraftDesc] = useState('');

  const [layerEditor, setLayerEditor] = useState<
    | null
    | { mode: 'create'; mapId: number }
    | { mode: 'edit'; layer: MapLayer }
  >(null);
  const [layerDraft, setLayerDraft] = useState<LayerDraft | null>(null);
  const [confirmDeleteMap, setConfirmDeleteMap] = useState<HotelMap | null>(null);
  const [confirmDeleteLayer, setConfirmDeleteLayer] = useState<MapLayer | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.listMaps()
      .then(setMaps)
      .catch((e: Error) => addToast({ type: 'error', title: 'Error', message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreateMap = () => {
    setMapDraftName('');
    setMapDraftDesc('');
    setMapEditor({ mode: 'create' });
  };

  const openEditMap = (m: HotelMap) => {
    setMapDraftName(m.name);
    setMapDraftDesc(m.description ?? '');
    setMapEditor({ mode: 'edit', map: m });
  };

  const saveMap = async () => {
    if (!mapEditor) return;
    try {
      if (mapEditor.mode === 'create') {
        await api.createMap({
          name: mapDraftName.trim(),
          description: mapDraftDesc.trim() || null,
        });
      } else {
        await api.updateMap(mapEditor.map.id, {
          name: mapDraftName.trim(),
          description: mapDraftDesc.trim() || null,
        });
      }
      setMapEditor(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message });
    }
  };

  const deleteMap = async () => {
    if (!confirmDeleteMap) return;
    try {
      await api.deleteMap(confirmDeleteMap.id);
      setConfirmDeleteMap(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message });
    }
  };

  const openCreateLayer = (mapId: number) => {
    setLayerDraft({ name: '', image_url: '', svg_content: '', width: '', height: '', sort_order: '0', map_id: mapId });
    setLayerEditor({ mode: 'create', mapId });
  };

  const openEditLayer = (layer: MapLayer) => {
    setLayerDraft({
      name: layer.name,
      image_url: layer.image_url ?? '',
      svg_content: layer.svg_content ?? '',
      width: String(layer.width),
      height: String(layer.height),
      sort_order: String(layer.sort_order),
      map_id: layer.map_id,
    });
    setLayerEditor({ mode: 'edit', layer });
  };

  const autoDetectImage = async () => {
    if (!layerDraft?.image_url) return;
    if (typeof Image === 'undefined') return;
    // HTMLImageElement on web — native Image is RN's.
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') return;
    const img = new window.Image();
    img.onload = () => {
      setLayerDraft((d) => d ? { ...d, width: String(img.naturalWidth), height: String(img.naturalHeight) } : d);
    };
    img.onerror = () => {
      addToast({ type: 'warning', title: 'Could not load image', message: 'Check the URL and try again.' });
    };
    img.src = assetUrl(layerDraft.image_url);
  };

  const saveLayer = async () => {
    if (!layerEditor || !layerDraft) return;
    const width = Number(layerDraft.width);
    const height = Number(layerDraft.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      addToast({ type: 'warning', title: 'Image dimensions required', message: 'Please provide width and height.' });
      return;
    }
    if (!layerDraft.image_url && !layerDraft.svg_content) {
      addToast({ type: 'warning', title: 'Image required', message: 'Provide an image URL or SVG markup.' });
      return;
    }
    const input: Partial<MapLayerInput> = {
      name: layerDraft.name.trim(),
      image_url: layerDraft.image_url.trim() || null,
      svg_content: layerDraft.svg_content.trim() || null,
      width,
      height,
      sort_order: Number(layerDraft.sort_order) || 0,
    };
    try {
      if (layerEditor.mode === 'create') {
        await api.createMapLayer({ ...input, map_id: layerEditor.mapId } as MapLayerInput);
      } else {
        await api.updateMapLayer(layerEditor.layer.id, input);
      }
      setLayerEditor(null);
      setLayerDraft(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message });
    }
  };

  const deleteLayer = async () => {
    if (!confirmDeleteLayer) return;
    try {
      await api.deleteMapLayer(confirmDeleteLayer.id);
      setConfirmDeleteLayer(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message });
    }
  };

  if (loading) {
    return <View style={s.loading}><ActivityIndicator color={colors.brand600} /></View>;
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Maps</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={openCreateMap}>
          <Text style={s.primaryBtnText}>+ New map</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.list}>
        {maps.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No maps yet</Text>
            <Text style={s.emptyBody}>
              A map is a collection of layers (floor plans). Create a map, then add one layer per floor or view.{'\n'}
              The default "Bleiche Resort" map is seeded by{' '}
              <Text style={s.mono}>python -m scripts.seed_floorplans</Text>.
            </Text>
          </View>
        )}

        {maps.map((m) => (
          <View key={m.id} style={s.mapCard}>
            <View style={s.mapHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.mapName}>{m.name}</Text>
                {m.description ? <Text style={s.mapDesc}>{m.description}</Text> : null}
              </View>
              <View style={s.mapActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openCreateLayer(m.id)}>
                  <Text style={s.actionText}>+ layer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => openEditMap(m)}>
                  <Text style={s.actionText}>edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => setConfirmDeleteMap(m)}>
                  <Text style={[s.actionText, { color: colors.errorText }]}>delete</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.layersRow}>
              {m.layers.length === 0 && (
                <Text style={s.emptyLayers}>No layers in this map yet.</Text>
              )}
              {m.layers.map((layer) => (
                <View key={layer.id} style={s.layerCard}>
                  <View style={s.layerThumb}>
                    {layer.image_url ? (
                      <Image
                        source={{ uri: assetUrl(layer.image_url) }}
                        style={s.layerThumbImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={s.layerThumbFallback}>SVG</Text>
                    )}
                  </View>
                  <Text style={s.layerName}>{layer.name}</Text>
                  <Text style={s.layerMeta}>{layer.width}×{layer.height}</Text>
                  <View style={s.layerActions}>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.brand100, borderColor: colors.brand400 }]}
                      onPress={() => navigate({ name: 'map-editor', layerId: layer.id })}
                    >
                      <Text style={[s.actionText, { color: colors.brand700 }]}>open editor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => openEditLayer(layer)}>
                      <Text style={s.actionText}>edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => setConfirmDeleteLayer(layer)}>
                      <Text style={[s.actionText, { color: colors.errorText }]}>delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Map editor modal */}
      <Modal visible={!!mapEditor} transparent animationType="fade" onRequestClose={() => setMapEditor(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{mapEditor?.mode === 'create' ? 'New map' : 'Edit map'}</Text>
            <Text style={s.label}>Name</Text>
            <TextInput style={s.input} value={mapDraftName} onChangeText={setMapDraftName} autoFocus />
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, { minHeight: 60 }]}
              value={mapDraftDesc}
              onChangeText={setMapDraftDesc}
              multiline
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setMapEditor(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, !mapDraftName.trim() && s.disabled]}
                onPress={saveMap}
                disabled={!mapDraftName.trim()}
              >
                <Text style={s.primaryBtnText}>{mapEditor?.mode === 'create' ? 'Create' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Layer editor modal */}
      <Modal visible={!!layerEditor} transparent animationType="fade" onRequestClose={() => setLayerEditor(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {layerEditor?.mode === 'create' ? 'New layer' : 'Edit layer'}
            </Text>
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={layerDraft?.name ?? ''}
              onChangeText={(v) => setLayerDraft((d) => d ? { ...d, name: v } : d)}
              autoFocus
            />
            <Text style={s.label}>Image URL</Text>
            <TextInput
              style={s.input}
              value={layerDraft?.image_url ?? ''}
              onChangeText={(v) => setLayerDraft((d) => d ? { ...d, image_url: v } : d)}
              placeholder="/static/floorplans/xyz.png or https://…"
              autoCapitalize="none"
            />
            <Text style={s.label}>SVG markup (optional, instead of image)</Text>
            <TextInput
              style={[s.input, { minHeight: 80 }]}
              value={layerDraft?.svg_content ?? ''}
              onChangeText={(v) => setLayerDraft((d) => d ? { ...d, svg_content: v } : d)}
              multiline
              placeholder="<g>…</g>"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Width (px)</Text>
                <TextInput
                  style={s.input}
                  value={layerDraft?.width ?? ''}
                  onChangeText={(v) => setLayerDraft((d) => d ? { ...d, width: v.replace(/[^0-9]/g, '') } : d)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Height (px)</Text>
                <TextInput
                  style={s.input}
                  value={layerDraft?.height ?? ''}
                  onChangeText={(v) => setLayerDraft((d) => d ? { ...d, height: v.replace(/[^0-9]/g, '') } : d)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ justifyContent: 'flex-end' }}>
                <TouchableOpacity style={s.secondaryBtn} onPress={autoDetectImage}>
                  <Text style={s.secondaryBtnText}>Auto-detect</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={s.label}>Display order</Text>
            <TextInput
              style={s.input}
              value={layerDraft?.sort_order ?? '0'}
              onChangeText={(v) => setLayerDraft((d) => d ? { ...d, sort_order: v.replace(/[^0-9-]/g, '') } : d)}
              keyboardType="numeric"
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => { setLayerEditor(null); setLayerDraft(null); }}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.primaryBtn} onPress={saveLayer}>
                <Text style={s.primaryBtnText}>{layerEditor?.mode === 'create' ? 'Create' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteMap} transparent animationType="fade" onRequestClose={() => setConfirmDeleteMap(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Delete map "{confirmDeleteMap?.name}"?</Text>
            <Text style={s.modalBody}>
              This removes the map and all of its layers and polygons. Locations themselves are not deleted.
            </Text>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setConfirmDeleteMap(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dangerBtn} onPress={deleteMap}>
                <Text style={s.dangerBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteLayer} transparent animationType="fade" onRequestClose={() => setConfirmDeleteLayer(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Delete layer "{confirmDeleteLayer?.name}"?</Text>
            <Text style={s.modalBody}>All polygons on this layer will also be removed.</Text>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setConfirmDeleteLayer(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dangerBtn} onPress={deleteLayer}>
                <Text style={s.dangerBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const s = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, color: colors.brand800 },
  list: { flex: 1 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark500, marginBottom: 8 },
  emptyBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, textAlign: 'center', lineHeight: 18 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.dark700 },
  mapCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 18,
    marginBottom: 18,
  },
  mapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mapName: { fontFamily: fonts.serif, fontSize: 18, color: colors.brand800 },
  mapDesc: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, marginTop: 4 },
  mapActions: { flexDirection: 'row', gap: 6 },
  layersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emptyLayers: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, padding: 16 },
  layerCard: {
    width: 220,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 10,
  },
  layerThumb: {
    height: 120,
    backgroundColor: colors.dark100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  layerThumbImg: { width: '100%', height: '100%' },
  layerThumbFallback: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400 },
  layerName: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', color: colors.dark800 },
  layerMeta: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark400, marginBottom: 6 },
  layerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.dark200,
    borderRadius: 2,
  },
  actionText: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark600 },
  primaryBtn: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 2,
  },
  primaryBtnText: { fontFamily: fonts.sans, fontSize: 13, color: colors.white, fontWeight: '600' },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dark300,
    borderRadius: 2,
  },
  secondaryBtnText: { fontFamily: fonts.sans, fontSize: 13, color: colors.dark600 },
  dangerBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 2,
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
    maxWidth: 580,
    borderRadius: 4,
    gap: 6,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark800, marginBottom: 4 },
  modalBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark500, marginBottom: 4 },
  modalButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 14 },
  label: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark400, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark800,
  },
});
