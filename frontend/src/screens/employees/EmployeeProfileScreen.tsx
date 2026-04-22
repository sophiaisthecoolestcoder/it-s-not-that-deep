import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/client';
import { BleicheSelect } from '../../components/ui/NativeSelect';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { useRouter } from '../../navigation/Router';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { EmployeeRole } from '../../types/auth';
import type { Employee, EmployeeInput } from '../../types/employee';

const ROLE_VALUES: EmployeeRole[] = [
  'admin',
  'manager',
  'receptionist',
  'housekeeper',
  'spa_therapist',
  'chef',
  'waiter',
  'concierge',
  'maintenance',
];

interface Props {
  employeeId: number;
  mode?: 'view' | 'edit';
}

function toInput(e: Employee): EmployeeInput {
  return {
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    department: e.department,
    position: e.position,
    employment_started_on: e.employment_started_on,
    employment_ended_on: e.employment_ended_on,
    active: e.active,
    notes: e.notes,
  };
}

export default function EmployeeProfileScreen({ employeeId, mode = 'view' }: Props) {
  const { navigate, goBack, canGoBack } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EmployeeInput | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getEmployee(employeeId)
      .then((e) => {
        setEmployee(e);
        setDraft(toInput(e));
      })
      .catch((err: Error) =>
        addToast({ type: 'error', title: t('common.error'), message: err.message }),
      )
      .finally(() => setLoading(false));
  }, [employeeId, addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const roleOptions = useMemo(
    () => ROLE_VALUES.map((r) => ({ value: r, label: t(`role.${r}`) })),
    [t],
  );
  const activeOptions = useMemo(
    () => [
      { value: 'true', label: t('employee.active') },
      { value: 'false', label: t('employee.inactive') },
    ],
    [t],
  );

  function set<K extends keyof EmployeeInput>(field: K, value: EmployeeInput[K]) {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleSave() {
    if (!draft) return;
    setSaving(true);
    api
      .updateEmployee(employeeId, draft)
      .then((e) => {
        setEmployee(e);
        setDraft(toInput(e));
        addToast({ type: 'success', title: t('employee.saved') });
        navigate({ name: 'employee-profile', employeeId, mode: 'view' });
      })
      .catch((err: Error) =>
        addToast({ type: 'error', title: t('common.error'), message: err.message }),
      )
      .finally(() => setSaving(false));
  }

  function handleDiscard() {
    Alert.alert(
      t('employee.discardConfirmTitle'),
      t('employee.discardConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('offer.discard'),
          style: 'destructive',
          onPress: () => {
            if (employee) setDraft(toInput(employee));
            navigate({ name: 'employee-profile', employeeId, mode: 'view' });
          },
        },
      ],
    );
  }

  if (loading || !employee || !draft) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  const isEdit = mode === 'edit';
  const pageTitle = isEdit ? t('employee.edit') : t('employee.viewTitle');

  return (
    <View style={s.root}>
      <View style={s.toolbar}>
        <View style={s.toolbarLeft}>
          <Text style={s.pageTitle}>{pageTitle}</Text>
          <View style={[s.badge, employee.active ? s.badgeActive : s.badgeInactive]}>
            <Text style={[s.badgeText, employee.active ? s.badgeActiveText : s.badgeInactiveText]}>
              {employee.active ? t('employee.active') : t('employee.inactive')}
            </Text>
          </View>
        </View>
        <View style={s.toolbarRight}>
          {!isEdit ? (
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigate({ name: 'employee-profile', employeeId, mode: 'edit' })}
            >
              <Text style={s.btnPrimaryText}>{t('offer.editAction')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={s.btnSecondary} onPress={handleDiscard}>
                <Text style={s.btnSecondaryText}>{t('offer.discard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, saving && s.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={s.btnPrimaryText}>{saving ? t('common.saving') : t('common.save')}</Text>
              </TouchableOpacity>
            </>
          )}
          {canGoBack && (
            <TouchableOpacity style={s.btnSecondary} onPress={goBack}>
              <Text style={s.btnSecondaryText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={s.card} contentContainerStyle={s.cardInner}>
        <View style={s.grid}>
          <Field label={t('employee.firstName')} value={draft.first_name} isEdit={isEdit}
            onChange={(v) => set('first_name', v)} />
          <Field label={t('employee.lastName')} value={draft.last_name} isEdit={isEdit}
            onChange={(v) => set('last_name', v)} />
          <Field label={t('employee.email')} value={draft.email} isEdit={isEdit}
            onChange={(v) => set('email', v)} />
          <Field label={t('employee.phone')} value={draft.phone ?? ''} isEdit={isEdit}
            onChange={(v) => set('phone', v || null)} />
          <View style={s.field}>
            <Text style={s.label}>{t('employee.role')}</Text>
            {isEdit ? (
              <BleicheSelect
                value={draft.role}
                onChange={(v) => set('role', v as EmployeeRole)}
                options={roleOptions}
              />
            ) : (
              <Text style={s.valueText}>{t(`role.${draft.role}`)}</Text>
            )}
          </View>
          <Field label={t('employee.department')} value={draft.department ?? ''} isEdit={isEdit}
            onChange={(v) => set('department', v || null)} />
          <Field label={t('employee.position')} value={draft.position ?? ''} isEdit={isEdit}
            onChange={(v) => set('position', v || null)} />
          <Field label={t('employee.employmentStart')} value={draft.employment_started_on ?? ''}
            placeholder="YYYY-MM-DD" isEdit={isEdit}
            onChange={(v) => set('employment_started_on', v || null)} />
          <Field label={t('employee.employmentEnd')} value={draft.employment_ended_on ?? ''}
            placeholder="YYYY-MM-DD" isEdit={isEdit}
            onChange={(v) => set('employment_ended_on', v || null)} />
          <View style={s.field}>
            <Text style={s.label}>{t('employee.active')}</Text>
            {isEdit ? (
              <BleicheSelect
                value={String(draft.active ?? true)}
                onChange={(v) => set('active', v === 'true')}
                options={activeOptions}
              />
            ) : (
              <Text style={s.valueText}>
                {draft.active ? t('employee.active') : t('employee.inactive')}
              </Text>
            )}
          </View>
        </View>

        <View style={[s.field, s.notesField]}>
          <Text style={s.label}>{t('employee.notes')}</Text>
          {isEdit ? (
            <TextInput
              style={[s.input, s.notesInput]}
              value={draft.notes ?? ''}
              onChangeText={(v) => set('notes', v || null)}
              multiline
            />
          ) : (
            <Text style={s.valueText}>
              {draft.notes || '—'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  isEdit,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isEdit: boolean;
  placeholder?: string;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {isEdit ? (
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.dark300}
        />
      ) : (
        <Text style={s.valueText}>{value || '—'}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolbarRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.brand700,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeActive: { backgroundColor: '#dcf3e2' },
  badgeInactive: { backgroundColor: '#ececec' },
  badgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeActiveText: { color: '#1e6b37' },
  badgeInactiveText: { color: '#535353' },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#fff',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
  },
  cardInner: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  field: {
    width: 260,
    gap: 4,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  valueText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark700,
    paddingVertical: 6,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  notesField: { marginTop: 12 },
  notesInput: { minHeight: 80 },
});
