import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { Location, LocationInput, LocationTreeNode } from '../../types/location';


function flattenTree(nodes: LocationTreeNode[], depth = 0): Array<LocationTreeNode & { depth: number }> {
  const out: Array<LocationTreeNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children?.length) {
      out.push(...flattenTree(n.children, depth + 1));
    }
  }
  return out;
}

function descendantIds(node: LocationTreeNode): Set<number> {
  const set = new Set<number>([node.id]);
  const walk = (n: LocationTreeNode) => {
    for (const c of n.children ?? []) {
      set.add(c.id);
      walk(c);
    }
  };
  walk(node);
  return set;
}

function findNode(nodes: LocationTreeNode[], id: number): LocationTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children ?? [], id);
    if (hit) return hit;
  }
  return null;
}


export default function LocationsTreeScreen() {
  const { addToast } = useToast();
  const [tree, setTree] = useState<LocationTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editor, setEditor] = useState<null | { mode: 'create' | 'edit'; parentId: number | null; locationId?: number; draft: LocationInput }>(null);
  const [moving, setMoving] = useState<Location | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getLocationsTree()
      .then((rows) => setTree(rows))
      .catch((e: Error) => addToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load locations' }))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Tree starts fully collapsed — the user expands what they want to see
  // via the chevrons. Auto-expanding roots used to be the default but
  // ended up dominating the screen with 9 buildings + their floors.

  const flat = useMemo(() => flattenTree(tree), [tree]);
  const visible = useMemo(() => {
    const hiddenByAncestor = new Set<number>();
    const walk = (nodes: LocationTreeNode[], parentOpen: boolean) => {
      for (const n of nodes) {
        if (!parentOpen) hiddenByAncestor.add(n.id);
        const isOpen = expanded.has(n.id) && parentOpen;
        walk(n.children ?? [], isOpen);
      }
    };
    // Roots are always visible — walk children gated by open state
    for (const root of tree) {
      walk(root.children ?? [], expanded.has(root.id));
    }
    return flat.filter((n) => !hiddenByAncestor.has(n.id));
  }, [flat, tree, expanded]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = (parentId: number | null) => {
    setEditor({
      mode: 'create',
      parentId,
      draft: { name: '', description: '', parent_id: parentId, sort_order: 0 },
    });
  };

  const handleEdit = (node: LocationTreeNode) => {
    setEditor({
      mode: 'edit',
      parentId: node.parent_id,
      locationId: node.id,
      draft: {
        name: node.name,
        description: node.description ?? '',
        parent_id: node.parent_id,
        sort_order: node.sort_order,
      },
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    const { mode, locationId, draft } = editor;
    try {
      if (mode === 'create') {
        await api.createLocation({
          name: draft.name.trim(),
          description: draft.description?.trim() || null,
          parent_id: draft.parent_id ?? null,
          sort_order: draft.sort_order ?? 0,
        });
      } else if (locationId != null) {
        await api.updateLocation(locationId, {
          name: draft.name.trim(),
          description: draft.description?.trim() || null,
          sort_order: draft.sort_order ?? 0,
        });
      }
      setEditor(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message || 'Save failed' });
    }
  };

  const doMove = async (newParentId: number | null) => {
    if (!moving) return;
    try {
      await api.updateLocation(moving.id, { parent_id: newParentId });
      setMoving(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message || 'Move failed' });
    }
  };

  const doDelete = async (force: boolean) => {
    if (!confirmDelete) return;
    try {
      await api.deleteLocation(confirmDelete.id, force);
      setConfirmDelete(null);
      load();
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: (e as Error).message || 'Delete failed' });
    }
  };

  const disallowedMoveIds = useMemo(() => {
    if (!moving) return new Set<number>();
    const node = findNode(tree, moving.id);
    return node ? descendantIds(node) : new Set<number>([moving.id]);
  }, [moving, tree]);

  if (loading) {
    return <View style={s.loading}><ActivityIndicator color={colors.brand600} /></View>;
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Locations</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => handleCreate(null)}>
          <Text style={s.primaryBtnText}>+ New root location</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.tree} contentContainerStyle={s.treeContent}>
        {flat.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No locations yet</Text>
            <Text style={s.emptyBody}>
              Start by creating a root — e.g. "Main building" — then add children (floors, rooms, …).
              You can also bulk-import a tree with{'\n'}
              <Text style={s.mono}>python -m scripts.load_locations path/to/tree.json</Text>
            </Text>
          </View>
        )}

        {visible.map((n) => {
          const hasChildren = (n.children?.length ?? 0) > 0;
          const open = expanded.has(n.id);
          return (
            <View key={n.id} style={[s.row, { paddingLeft: 12 + n.depth * 20 }]}>
              <TouchableOpacity
                style={s.chevron}
                onPress={() => hasChildren && toggleExpand(n.id)}
                disabled={!hasChildren}
              >
                <Text style={[s.chevronText, !hasChildren && { opacity: 0 }]}>
                  {open ? '▾' : '▸'}
                </Text>
              </TouchableOpacity>
              <View style={s.rowMain}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{n.name}</Text>
                  <Text style={s.meta}>
                    {n.category}
                    {n.room_number ? ` · ${n.room_number}` : ''}
                    {n.environment === 'outdoor' ? ' · outdoor' : ''}
                  </Text>
                </View>
                {n.description ? <Text style={s.desc}>{n.description}</Text> : null}
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleCreate(n.id)}>
                  <Text style={s.actionText}>+ child</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(n)}>
                  <Text style={s.actionText}>edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => setMoving(n)}>
                  <Text style={s.actionText}>move</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => setConfirmDelete(n)}>
                  <Text style={[s.actionText, { color: colors.errorText }]}>delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create / edit modal */}
      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {editor?.mode === 'create' ? 'New location' : 'Edit location'}
            </Text>
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={editor?.draft.name ?? ''}
              onChangeText={(v) => setEditor((e) => (e ? { ...e, draft: { ...e.draft, name: v } } : e))}
              placeholder="e.g. Room 101"
              autoFocus
            />
            <Text style={s.label}>Description (optional)</Text>
            <TextInput
              style={[s.input, { minHeight: 60 }]}
              value={editor?.draft.description ?? ''}
              onChangeText={(v) => setEditor((e) => (e ? { ...e, draft: { ...e.draft, description: v } } : e))}
              multiline
            />
            <Text style={s.label}>Display order</Text>
            <TextInput
              style={s.input}
              value={String(editor?.draft.sort_order ?? 0)}
              onChangeText={(v) => {
                const n = Number(v.replace(/[^0-9-]/g, '')) || 0;
                setEditor((e) => (e ? { ...e, draft: { ...e.draft, sort_order: n } } : e));
              }}
              keyboardType="numeric"
            />
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditor(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, !editor?.draft.name?.trim() && s.disabled]}
                onPress={saveEditor}
                disabled={!editor?.draft.name?.trim()}
              >
                <Text style={s.primaryBtnText}>{editor?.mode === 'create' ? 'Create' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move modal */}
      <Modal visible={!!moving} transparent animationType="fade" onRequestClose={() => setMoving(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Move "{moving?.name}"</Text>
            <Text style={s.modalBody}>Pick a new parent (or "Make root"):</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Pressable style={s.pickRow} onPress={() => doMove(null)}>
                <Text style={s.pickText}>— Make root —</Text>
              </Pressable>
              {flat.filter((n) => !disallowedMoveIds.has(n.id)).map((n) => (
                <Pressable
                  key={n.id}
                  style={[s.pickRow, { paddingLeft: 12 + n.depth * 16 }]}
                  onPress={() => doMove(n.id)}
                >
                  <Text style={s.pickText}>{n.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setMoving(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Delete "{confirmDelete?.name}"?</Text>
            <Text style={s.modalBody}>
              If this location has children they must be removed first, or delete the whole subtree.
            </Text>
            <View style={s.modalButtons}>
              <TouchableOpacity style={s.secondaryBtn} onPress={() => setConfirmDelete(null)}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dangerBtn} onPress={() => doDelete(false)}>
                <Text style={s.dangerBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dangerBtn} onPress={() => doDelete(true)}>
                <Text style={s.dangerBtnText}>Delete subtree</Text>
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
  tree: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.dark200 },
  treeContent: { paddingVertical: 8 },
  empty: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark500, marginBottom: 8 },
  emptyBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark400, textAlign: 'center', lineHeight: 18 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.dark700 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.belSoftBorder,
  },
  chevron: { width: 22, alignItems: 'center' },
  chevronText: { fontSize: 12, color: colors.dark500 },
  rowMain: { flex: 1, paddingHorizontal: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  name: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '500', color: colors.dark800 },
  meta: { fontFamily: fonts.sans, fontSize: 10, color: colors.dark400, textTransform: 'lowercase' },
  desc: { fontFamily: fonts.sans, fontSize: 11, color: colors.dark400, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
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
    paddingHorizontal: 16,
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
    maxWidth: 520,
    borderRadius: 4,
    gap: 10,
  },
  modalTitle: { fontFamily: fonts.serif, fontSize: 18, color: colors.dark800, marginBottom: 4 },
  modalBody: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark500, marginBottom: 4 },
  modalButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' },
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
  pickRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.belSoftBorder,
  },
  pickText: { fontFamily: fonts.sans, fontSize: 12, color: colors.dark700 },
});
