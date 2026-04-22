import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n/I18nContext';
import { useRouter } from '../../navigation/Router';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import type { Invoice } from '../../types/cashier';

interface Props {
  invoiceId: number;
}

function formatEuro(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

export default function InvoiceDetailScreen({ invoiceId }: Props) {
  const { goBack, canGoBack } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .getInvoice(invoiceId)
      .then(setInvoice)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [invoiceId, addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePrint() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      (window as any).print();
    }
  }

  if (loading || !invoice) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.brand600} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.toolbar}>
        <View style={s.toolbarLeft}>
          <Text style={s.pageTitle}>
            {t('invoices.detailTitle')} {invoice.number ?? `#${invoice.id}`}
          </Text>
          <View style={[s.badge, s[`badge_${invoice.status}` as keyof typeof s] as any]}>
            <Text style={s.badgeText}>{t(`invoices.status.${invoice.status}`)}</Text>
          </View>
        </View>
        <View style={s.toolbarRight}>
          <TouchableOpacity style={s.btnSecondary} onPress={handlePrint}>
            <Text style={s.btnSecondaryText}>{t('common.print')}</Text>
          </TouchableOpacity>
          {canGoBack && (
            <TouchableOpacity style={s.btnSecondary} onPress={goBack}>
              <Text style={s.btnSecondaryText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={s.sheet} contentContainerStyle={s.sheetContent}>
        <View style={s.header}>
          <Text style={s.brand}>Bleiche Resort & Spa</Text>
          <Text style={s.metaLine}>
            {t('cashier.venue')}: {t(`cashier.venue.${invoice.venue}`)}
            {invoice.reference ? ` • ${invoice.reference}` : ''}
          </Text>
          <Text style={s.metaLine}>
            {t('invoices.col.date')}: {formatDate(invoice.finalized_at ?? invoice.created_at)}
          </Text>
          {invoice.payment_method && (
            <Text style={s.metaLine}>
              {t('invoices.col.payment')}: {t(`cashier.payment.${invoice.payment_method}`)}
            </Text>
          )}
        </View>

        <View style={s.itemsTable}>
          {invoice.items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemQty}>{item.quantity}x</Text>
              <View style={s.itemBody}>
                <Text style={s.itemDesc}>{item.description}</Text>
                <Text style={s.itemMeta}>
                  {formatEuro(item.unit_price_cents)} • {(item.vat_rate_bp / 100).toFixed(0)}% {t('cashier.vat')}
                </Text>
              </View>
              <Text style={s.itemTotal}>{formatEuro(item.line_total_cents)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>{t('cashier.subtotal')}</Text>
            <Text style={s.totalsValue}>{formatEuro(invoice.subtotal_cents)}</Text>
          </View>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>{t('cashier.vat')}</Text>
            <Text style={s.totalsValue}>{formatEuro(invoice.vat_total_cents)}</Text>
          </View>
          <View style={[s.totalsRow, s.grandRow]}>
            <Text style={s.grandLabel}>{t('cashier.total')}</Text>
            <Text style={s.grandValue}>{formatEuro(invoice.total_cents)}</Text>
          </View>
        </View>

        {invoice.receipt && (
          <View style={s.receipt}>
            <Text style={s.receiptTitle}>{t('invoices.receiptQr')}</Text>
            <Text style={s.qrData} selectable numberOfLines={4}>
              {invoice.receipt.qr_code_data ?? '—'}
            </Text>
            <View style={s.receiptGrid}>
              <View style={s.receiptCell}>
                <Text style={s.receiptLabel}>{t('invoices.receiptTss')}</Text>
                <Text style={s.receiptValue} selectable>{invoice.receipt.provider_tss_id ?? '—'}</Text>
              </View>
              <View style={s.receiptCell}>
                <Text style={s.receiptLabel}>{t('invoices.receiptTransaction')}</Text>
                <Text style={s.receiptValue} selectable>
                  {invoice.receipt.transaction_number ?? '—'} / {invoice.receipt.provider_transaction_id ?? ''}
                </Text>
              </View>
              <View style={s.receiptCell}>
                <Text style={s.receiptLabel}>{t('invoices.receiptSignature')}</Text>
                <Text style={s.receiptValue} selectable numberOfLines={2}>
                  {invoice.receipt.signature_counter ?? '—'} • {invoice.receipt.signature_algorithm ?? ''}
                </Text>
              </View>
              <View style={s.receiptCell}>
                <Text style={s.receiptLabel}>Provider</Text>
                <Text style={s.receiptValue}>{invoice.receipt.provider}</Text>
              </View>
            </View>
            {invoice.receipt.provider === 'mock' && (
              <Text style={s.mockWarning}>⚠ {t('cashier.mockWarning')}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  badge_open: { backgroundColor: '#f5ede3' },
  badge_finalized: { backgroundColor: '#dcf3e2' },
  badge_voided: { backgroundColor: '#fbe0e0' },
  badgeText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark700,
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
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
  },
  sheetContent: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    paddingBottom: 12,
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 20,
    color: colors.brand700,
    marginBottom: 6,
  },
  metaLine: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
    marginTop: 2,
  },
  itemsTable: { marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    paddingVertical: 8,
    gap: 12,
  },
  itemQty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark500,
    width: 50,
  },
  itemBody: { flex: 1 },
  itemDesc: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
  },
  itemMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginTop: 2,
  },
  itemTotal: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark700,
    width: 100,
    textAlign: 'right',
  },
  totals: {
    borderTopWidth: 1,
    borderTopColor: colors.dark200,
    paddingTop: 10,
    gap: 6,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalsLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark500,
  },
  totalsValue: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
  },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: colors.dark200,
    paddingTop: 6,
    marginTop: 6,
  },
  grandLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.brand700,
  },
  grandValue: {
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: colors.brand700,
  },
  receipt: {
    marginTop: 24,
    padding: 14,
    backgroundColor: colors.dark50,
    borderWidth: 1,
    borderColor: colors.dark200,
  },
  receiptTitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark500,
    marginBottom: 8,
  },
  qrData: {
    fontFamily: Platform.OS === 'web' ? ('monospace' as any) : fonts.sans,
    fontSize: 11,
    color: colors.dark700,
    backgroundColor: colors.white,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.dark200,
    marginBottom: 10,
  },
  receiptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  receiptCell: { width: 220 },
  receiptLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark400,
    marginBottom: 2,
  },
  receiptValue: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark700,
  },
  mockWarning: {
    marginTop: 10,
    fontFamily: fonts.sans,
    fontSize: 12,
    color: '#b45309',
  },
});
