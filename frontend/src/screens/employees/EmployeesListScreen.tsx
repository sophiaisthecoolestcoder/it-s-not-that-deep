import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import type { Employee } from '../../types/employee';

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

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function EmployeesListScreen() {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

  const load = useCallback(() => {
    setLoading(true);
    api
      .listEmployees()
      .then(setEmployees)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const e of employees) if (e.department) set.add(e.department);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (departmentFilter && e.department !== departmentFilter) return false;
      if (roleFilter && e.role !== roleFilter) return false;
      if (activeFilter === 'active' && !e.active) return false;
      if (activeFilter === 'inactive' && e.active) return false;
      if (needle) {
        const hay = [
          e.first_name,
          e.last_name,
          e.email,
          e.position ?? '',
          e.department ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [employees, departmentFilter, roleFilter, activeFilter, search]);

  const roleOptions = [
    { value: '', label: t('employees.allRoles') },
    ...ROLE_VALUES.map((r) => ({ value: r, label: t(`role.${r}`) })),
  ];
  const departmentOptions = [
    { value: '', label: t('employees.allDepartments') },
    ...departments.map((d) => ({ value: d, label: d })),
  ];
  const activeOptions: { value: ActiveFilter; label: string }[] = [
    { value: 'active', label: t('employees.filter.active') },
    { value: 'all', label: t('employees.filter.all') },
    { value: 'inactive', label: t('employees.filter.inactive') },
  ];

  function countLabel(n: number) {
    return t(n === 1 ? 'employees.count.one' : 'employees.count.other', { count: String(n) });
  }

  return (
    <View style={s.root}>
      <View style={s.toolbar}>
        <Text style={s.pageTitle}>{t('employees.title')}</Text>
      </View>

      <View style={s.filterBar}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('employees.search')}
          placeholderTextColor={colors.dark300}
        />
        <View style={s.filterDepartment}>
          <BleicheSelect
            value={departmentFilter}
            onChange={setDepartmentFilter}
            options={departmentOptions}
          />
        </View>
        <View style={s.filterRole}>
          <BleicheSelect
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as EmployeeRole | '')}
            options={roleOptions}
          />
        </View>
        <View style={s.filterActive}>
          <BleicheSelect
            value={activeFilter}
            onChange={(v) => setActiveFilter(v as ActiveFilter)}
            options={activeOptions}
          />
        </View>
      </View>

      <View style={s.card}>
        <View style={s.listHeader}>
          <View style={[s.col, s.colName]}><Text style={s.th}>{t('employees.col.name')}</Text></View>
          <View style={[s.col, s.colRole]}><Text style={s.th}>{t('employees.col.role')}</Text></View>
          <View style={[s.col, s.colDept]}><Text style={s.th}>{t('employees.col.department')}</Text></View>
          <View style={[s.col, s.colPos]}><Text style={s.th}>{t('employees.col.position')}</Text></View>
          <View style={[s.col, s.colSince]}><Text style={s.th}>{t('employees.col.since')}</Text></View>
          <View style={[s.col, s.colStatus]}><Text style={s.th}>{t('employees.col.status')}</Text></View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand600} style={s.loader} />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>
              {employees.length === 0 ? t('employees.none') : t('employees.noneFound')}
            </Text>
          </View>
        ) : (
          <ScrollView>
            {filtered.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={s.row}
                onPress={() => navigate({ name: 'employee-profile', employeeId: e.id, mode: 'view' })}
              >
                <View style={[s.col, s.colName]}>
                  <Text style={s.nameText}>
                    {e.first_name} {e.last_name}
                  </Text>
                  <Text style={s.subText}>{e.email}</Text>
                </View>
                <View style={[s.col, s.colRole]}>
                  <Text style={s.cellText}>{t(`role.${e.role}`)}</Text>
                </View>
                <View style={[s.col, s.colDept]}>
                  <Text style={s.cellText}>{e.department || '—'}</Text>
                </View>
                <View style={[s.col, s.colPos]}>
                  <Text style={s.cellText}>{e.position || '—'}</Text>
                </View>
                <View style={[s.col, s.colSince]}>
                  <Text style={s.cellText}>{e.employment_started_on || '—'}</Text>
                </View>
                <View style={[s.col, s.colStatus]}>
                  <View style={[s.badge, e.active ? s.badgeActive : s.badgeInactive]}>
                    <Text style={[s.badgeText, e.active ? s.badgeActiveText : s.badgeInactiveText]}>
                      {e.active ? t('employee.active') : t('employee.inactive')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={s.footer}>{countLabel(filtered.length)}</Text>
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
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.white,
    flex: 1,
    minWidth: 220,
  },
  filterDepartment: { width: 180 },
  filterRole: { width: 170 },
  filterActive: { width: 150 },
  loader: { margin: 24 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    backgroundColor: colors.dark50,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    alignItems: 'center',
  },
  col: { paddingRight: 8 },
  colName: { flex: 2.2 },
  colRole: { flex: 1.1 },
  colDept: { flex: 1.2 },
  colPos: { flex: 1.6 },
  colSince: { flex: 1 },
  colStatus: { width: 100, paddingRight: 0 },
  th: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark500,
  },
  nameText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark700,
  },
  subText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginTop: 2,
  },
  cellText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark600,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
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
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark400,
  },
  footer: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginTop: 8,
  },
});
