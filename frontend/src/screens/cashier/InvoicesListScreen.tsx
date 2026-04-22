import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
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
import type {
  InvoiceStatus,
  InvoiceSummary,
  InvoiceVenue,
} from '../../types/cashier';

const STATUS_VALUES: InvoiceStatus[] = ['open', 'finalized', 'voided'];
const VENUE_VALUES: InvoiceVenue[] = ['reception', 'restaurant', 'spa', 'other'];

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InvoicesListScreen() {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [venueFilter, setVenueFilter] = useState<InvoiceVenue | ''>('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .listInvoices({
        status: statusFilter || undefined,
        venue: venueFilter || undefined,
        limit: 200,
      })
      .then(setInvoices)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [statusFilter, venueFilter, addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('invoices.filterAllStatus') },
      ...STATUS_VALUES.map((v) => ({ value: v, label: t(`invoices.status.${v}`) })),
    ],
    [t],
  );
  const venueOptions = useMemo(
    () => [
      { value: '', label: t('invoices.filterAllVenues') },
      ...VENUE_VALUES.map((v) => ({ value: v, label: t(`cashier.venue.${v}`) })),
    ],
    [t],
  );

  return (
    <View style={s.root}>
      <View style={s.toolbar}>
        <Text style={s.pageTitle}>{t('invoices.title')}</Text>
      </View>

      <View style={s.filterBar}>
        <View style={s.filterWrap}>
          <BleicheSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as InvoiceStatus | '')}
            options={statusOptions}
          />
        </View>
        <View style={s.filterWrap}>
          <BleicheSelect
            value={venueFilter}
            onChange={(v) => setVenueFilter(v as InvoiceVenue | '')}
            options={venueOptions}
          />
        </View>
      </View>

      <View style={s.card}>
        <View style={s.listHeader}>
          <View style={[s.col, s.colNumber]}><Text style={s.th}>{t('invoices.col.number')}</Text></View>
          <View style={[s.col, s.colStatus]}><Text style={s.th}>{t('invoices.col.status')}</Text></View>
          <View style={[s.col, s.colVenue]}><Text style={s.th}>{t('invoices.col.venue')}</Text></View>
          <View style={[s.col, s.colPayment]}><Text style={s.th}>{t('invoices.col.payment')}</Text></View>
          <View style={[s.col, s.colDate]}><Text style={s.th}>{t('invoices.col.date')}</Text></View>
          <View style={[s.col, s.colTotal]}><Text style={s.th}>{t('invoices.col.total')}</Text></View>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.brand600} style={s.loader} />
        ) : invoices.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>{t('invoices.none')}</Text>
          </View>
        ) : (
          <ScrollView>
            {invoices.map((inv) => (
              <TouchableOpacity
                key={inv.id}
                style={s.row}
                onPress={() => navigate({ name: 'invoice-detail', invoiceId: inv.id })}
              >
                <View style={[s.col, s.colNumber]}>
                  <Text style={s.numberText}>{inv.number ?? `#${inv.id}`}</Text>
                </View>
                <View style={[s.col, s.colStatus]}>
                  <View style={[s.badge, s[`badge_${inv.status}` as keyof typeof s] as any]}>
                    <Text style={s.badgeText}>{t(`invoices.status.${inv.status}`)}</Text>
                  </View>
                </View>
                <View style={[s.col, s.colVenue]}>
                  <Text style={s.cellText}>{t(`cashier.venue.${inv.venue}`)}</Text>
                </View>
                <View style={[s.col, s.colPayment]}>
                  <Text style={s.cellText}>
                    {inv.payment_method ? t(`cashier.payment.${inv.payment_method}`) : '—'}
                  </Text>
                </View>
                <View style={[s.col, s.colDate]}>
                  <Text style={s.cellText}>
                    {inv.finalized_at ? formatDate(inv.finalized_at) : formatDate(inv.created_at)}
                  </Text>
                </View>
                <View style={[s.col, s.colTotal]}>
                  <Text style={s.totalText}>{formatEuro(inv.total_cents)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { marginBottom: 12 },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  filterWrap: { width: 200 },
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
  colNumber: { width: 130 },
  colStatus: { width: 110 },
  colVenue: { width: 120 },
  colPayment: { width: 130 },
  colDate: { flex: 1 },
  colTotal: { width: 120, paddingRight: 0 },
  th: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark500,
  },
  numberText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark700,
  },
  cellText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark600,
  },
  totalText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark700,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badge_open: { backgroundColor: '#f5ede3' },
  badge_finalized: { backgroundColor: '#dcf3e2' },
  badge_voided: { backgroundColor: '#fbe0e0' },
  badgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.dark700,
  },
  loader: { margin: 24 },
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
