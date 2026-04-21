import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { api } from '../../api/client';
import { useRouter } from '../../navigation/Router';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { formatDateGerman, formatWeekday, todayISO } from '../../utils/helpers';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function DaysListScreen() {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();
  const [days, setDays] = useState<{ date: string; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState(todayISO());
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listDays()
      .then(setDays)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date));

  function handleOpenDay(date: string) {
    navigate({ name: 'belegung-editor', date });
  }

  function handleCreateDay() {
    if (!newDate) return;
    setCreating(true);
    api
      .upsertDay(newDate, {
        date: newDate,
        header: { standDate: newDate, standTime: '', tkName: '', tkTimeRange: '', hskName: '', hskTimeRange: '', chefDerNacht: '', chefTimeRange: '' },
        stats: { anrZi: '', anrPer: '', abrZi: '', abrPer: '', bleiberZi: '', bleiberPer: '', uenZi: '', uenPer: '', fruehAnreisen: '', spaetAbreisen: '', spaetAnreisen: '' },
        weeklyOccupancy: { mo: '', di: '', mi: '', do_: '', fr: '', sa: '', so: '' },
        arrivals: [], stayers: [],
        infoSection: '', fruehschicht: '', fruehExtern: '', fruehOps: [],
        spaetschicht: '', spaetAeExtern: '', spaetOps: [],
        kueche: '', kuecheFsExtern: '', kuecheAeExtern: '',
        kuecheLaktose: [], kuecheGluten: [], kuecheAllergien: [], kuecheUnvertraeglichkeiten: [], kuecheSonstiges: [], kuecheOps: [],
        veranstaltungenBankett: '', tischwuensche: '', tischwuenscheAeExtern: '', tischwuenscheOps: [],
        englischeMenuekarten: '',
        geburtstage: [], housekeeping: [], empfangChauffeure: [],
        ltExtern: '', eAuto: '',
        landtherme: [], landthermeLtExtern: '',
        newspapers: [], newGuests: [], freeRooms: [],
      })
      .then(() => {
        addToast({ type: 'success', title: t('days.created'), message: formatDateGerman(newDate) });
        navigate({ name: 'belegung-editor', date: newDate });
      })
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setCreating(false));
  }

  function handleDeleteDay(date: string) {
    Alert.alert(
      t('days.deleteConfirmTitle'),
      t('days.deleteConfirmBody', { date: formatDateGerman(date) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            api
              .deleteDay(date)
              .then(() => {
                addToast({ type: 'success', title: t('days.deleted'), message: formatDateGerman(date) });
                setDays((prev) => prev.filter((d) => d.date !== date));
              })
              .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }));
          },
        },
      ],
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.topBar}>
        <Text style={s.pageTitle}>{t('days.title')}</Text>
      </View>

      {/* Create new day */}
      <View style={s.createCard}>
        <Text style={s.createLabel}>{t('days.newDay')}</Text>
        <View style={s.createRow}>
          <View>
            <Text style={s.fieldLabel}>{t('days.date')}</Text>
            <TextInput
              style={s.dateInput}
              value={newDate}
              onChangeText={setNewDate}
              placeholder={t('days.datePlaceholder')}
              placeholderTextColor={colors.dark300}
            />
          </View>
          <TouchableOpacity
            style={[s.btnPrimary, creating && { opacity: 0.6 }]}
            onPress={handleCreateDay}
            disabled={creating}
          >
            <Text style={s.btnPrimaryText}>
              {creating ? t('days.creating') : t('days.create')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Days table */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.brand600} />
      ) : (
        <View style={s.table}>
          {/* Header */}
          <View style={[s.tr, s.thead]}>
            {[
              { key: 'date', label: t('days.col.date') },
              { key: 'weekday', label: t('days.col.weekday') },
              { key: 'arrivals', label: t('days.col.arrivals') },
              { key: 'stayers', label: t('days.col.stayers') },
              { key: 'actions', label: t('days.col.actions') },
            ].map((h) => (
              <View key={h.key} style={[s.th, h.key === 'actions' && s.thActions]}>
                <Text style={s.thText}>{h.label}</Text>
              </View>
            ))}
          </View>
          <ScrollView>
            {sortedDays.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>{t('days.empty')}</Text>
              </View>
            ) : (
              sortedDays.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={s.tr}
                  onPress={() => handleOpenDay(day.date)}
                >
                  <View style={s.td}>
                    <Text style={s.dateText}>{formatDateGerman(day.date)}</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.cellText}>{formatWeekday(day.date)}</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.mutedText}>—</Text>
                  </View>
                  <View style={s.td}>
                    <Text style={s.mutedText}>—</Text>
                  </View>
                  <View style={[s.td, s.tdActions]}>
                    <TouchableOpacity
                      style={s.actionBtn}
                      onPress={() => handleOpenDay(day.date)}
                    >
                      <Text style={s.actionBtnText}>{t('common.open')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, s.actionBtnDanger]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDeleteDay(day.date);
                      }}
                    >
                      <Text style={[s.actionBtnText, { color: colors.errorText }]}>
                        {t('common.delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {sortedDays.length > 0 && (
        <Text style={s.summary}>
          {t(sortedDays.length === 1 ? 'days.summary.one' : 'days.summary.other', { count: String(sortedDays.length) })}
        </Text>
      )}
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
  createCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  createLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    width: 160,
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
  table: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    flex: 1,
  },
  thead: {
    backgroundColor: colors.dark50,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
  },
  th: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  thActions: { flex: 1.2 },
  thText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.dark500,
  },
  td: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  tdActions: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark700,
  },
  cellText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark500,
  },
  mutedText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark300,
    textAlign: 'center',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBtnDanger: {
    borderColor: colors.errorBorder,
  },
  actionBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
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
  summary: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
    textAlign: 'right',
    marginTop: 8,
  },
});
