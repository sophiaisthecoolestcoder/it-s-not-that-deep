import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { api } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import type { StaffMember } from '../../types/belegung';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function StaffManagerScreen() {
  const { addToast } = useToast();
  const { t } = useI18n();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listStaff()
      .then(setStaff)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    if (staff.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      addToast({ type: 'warning', title: t('staff.existsTitle'), message: name });
      return;
    }
    setAdding(true);
    api
      .addStaff(name)
      .then((member) => {
        setStaff((prev) => [...prev, member]);
        setNewName('');
        addToast({ type: 'success', title: t('staff.addedTitle'), message: name });
      })
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setAdding(false));
  }

  function handleRemove(member: StaffMember) {
    api
      .removeStaff(member.id as number)
      .then(() => {
        setStaff((prev) => prev.filter((s) => s.id !== member.id));
        addToast({ type: 'success', title: t('staff.removedTitle'), message: member.name });
      })
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }));
  }

  const sorted = [...staff].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topBar}>
        <Text style={s.pageTitle}>{t('staff.title')}</Text>
        <Text style={s.subtitle}>{t('staff.subtitle')}</Text>
      </View>

      {/* Add form */}
      <View style={s.addCard}>
        <Text style={s.addLabel}>{t('staff.addTitle')}</Text>
        <View style={s.addRow}>
          <View style={s.addInputWrap}>
            <Text style={s.fieldLabel}>{t('belegung.name')}</Text>
            <TextInput
              style={s.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('staff.namePlaceholder')}
              placeholderTextColor={colors.dark300}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            style={[s.btnPrimary, (!newName.trim() || adding) && { opacity: 0.5 }]}
            onPress={handleAdd}
            disabled={!newName.trim() || adding}
          >
            <Text style={s.btnPrimaryText}>
              {adding ? t('common.adding') : t('staff.addAction')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Staff list */}
      <View style={s.listCard}>
        <View style={s.listHeader}>
          <Text style={s.listHeaderText}>{t('staff.listHeader', { count: String(staff.length) })}</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ margin: 24 }} color={colors.brand600} />
        ) : sorted.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('staff.empty')}</Text>
          </View>
        ) : (
          <ScrollView>
            {sorted.map((member) => (
              <View key={member.id} style={s.memberRow}>
                <Text style={s.memberName}>{member.name}</Text>
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => handleRemove(member)}
                >
                  <Text style={s.removeBtnText}>{t('staff.removeAction')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: { marginBottom: 20 },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark400,
    marginTop: 4,
  },
  addCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  addLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  addInputWrap: { flex: 1, maxWidth: 320 },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginBottom: 4,
  },
  addInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#fff',
  },
  listCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.dark50,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
  },
  listHeaderText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.dark500,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
  },
  memberName: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark700,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark400,
  },
});
