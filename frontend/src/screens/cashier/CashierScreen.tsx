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
import type {
  InvoiceVenue,
  PaymentMethod,
  Product,
} from '../../types/cashier';

interface CartLine {
  tempId: string;
  productId: number | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  vatRateBp: number;
}

const VENUE_OPTIONS: InvoiceVenue[] = ['reception', 'restaurant', 'spa', 'other'];
const PAYMENT_OPTIONS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'room_charge', 'other'];
const VAT_CHOICES = [
  { value: 1900, label: '19%' },
  { value: 700, label: '7%' },
  { value: 0, label: '0%' },
];

function formatEuro(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${(abs / 100).toFixed(2).replace('.', ',')} €`;
}

function lineTotals(line: CartLine) {
  const gross = Math.round(line.unitPriceCents * line.quantity);
  const vat =
    line.vatRateBp > 0
      ? Math.round((gross * line.vatRateBp) / (10000 + line.vatRateBp))
      : 0;
  return { gross, vat, net: gross - vat };
}

export default function CashierScreen() {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const { t } = useI18n();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [venue, setVenue] = useState<InvoiceVenue>('restaurant');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [finalizing, setFinalizing] = useState(false);

  // Custom line form
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customVat, setCustomVat] = useState(1900);

  const loadProducts = useCallback(() => {
    setLoadingCatalog(true);
    api
      .listProducts({ active: true })
      .then(setProducts)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoadingCatalog(false));
  }, [addToast, t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const venueOptions = useMemo(
    () => VENUE_OPTIONS.map((v) => ({ value: v, label: t(`cashier.venue.${v}`) })),
    [t],
  );
  const paymentOptions = useMemo(
    () => PAYMENT_OPTIONS.map((p) => ({ value: p, label: t(`cashier.payment.${p}`) })),
    [t],
  );
  const vatOptions = VAT_CHOICES.map((c) => ({ value: String(c.value), label: c.label }));

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products
      .filter((p) => p.venue === venue || venue === 'other')
      .filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.sku || '').toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, venue, search]);

  const totals = useMemo(() => {
    let gross = 0;
    let vat = 0;
    for (const line of cart) {
      const lt = lineTotals(line);
      gross += lt.gross;
      vat += lt.vat;
    }
    return { gross, vat, net: gross - vat };
  }, [cart]);

  function addProduct(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          tempId: `p-${product.id}-${Date.now()}`,
          productId: product.id,
          description: product.name,
          quantity: 1,
          unitPriceCents: product.unit_price_cents,
          vatRateBp: product.vat_rate_bp,
        },
      ];
    });
  }

  function addCustom() {
    const priceNum = Number(String(customPrice).replace(',', '.'));
    if (!customName.trim() || !Number.isFinite(priceNum) || priceNum <= 0) return;
    const priceCents = Math.round(priceNum * 100);
    setCart((prev) => [
      ...prev,
      {
        tempId: `c-${Date.now()}`,
        productId: null,
        description: customName.trim(),
        quantity: 1,
        unitPriceCents: priceCents,
        vatRateBp: customVat,
      },
    ]);
    setCustomName('');
    setCustomPrice('');
  }

  function updateQty(tempId: string, quantity: number) {
    setCart((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, quantity: Math.max(0.001, quantity) } : l)));
  }

  function removeLine(tempId: string) {
    setCart((prev) => prev.filter((l) => l.tempId !== tempId));
  }

  async function handleFinalize() {
    if (cart.length === 0) return;
    setFinalizing(true);
    try {
      const created = await api.createInvoice({
        venue,
        reference: reference.trim() || null,
        items: cart.map((l) => ({
          product_id: l.productId,
          description: l.description,
          quantity: l.quantity,
          unit_price_cents: l.unitPriceCents,
          vat_rate_bp: l.vatRateBp,
        })),
      });
      const finalized = await api.finalizeInvoice(created.id, payment);
      addToast({ type: 'success', title: t('cashier.finalized'), message: finalized.number ?? '' });
      if (finalized.receipt?.provider === 'mock') {
        addToast({ type: 'warning', title: 'MOCK', message: t('cashier.mockWarning') });
      }
      setCart([]);
      setReference('');
      navigate({ name: 'invoice-detail', invoiceId: finalized.id });
    } catch (e: any) {
      addToast({ type: 'error', title: t('cashier.notFinalized'), message: e?.message ?? '' });
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <View style={s.root}>
      <View style={s.toolbar}>
        <Text style={s.pageTitle}>{t('cashier.title')}</Text>
      </View>

      <View style={s.body}>
        {/* Left: venue + catalog */}
        <View style={s.left}>
          <View style={s.topControls}>
            <View style={s.venueWrap}>
              <Text style={s.label}>{t('cashier.venue')}</Text>
              <BleicheSelect
                value={venue}
                onChange={(v) => setVenue(v as InvoiceVenue)}
                options={venueOptions}
              />
            </View>
            <View style={s.referenceWrap}>
              <Text style={s.label}>{t('cashier.reference')}</Text>
              <TextInput
                style={s.input}
                value={reference}
                onChangeText={setReference}
                placeholder={t('cashier.referencePlaceholder')}
                placeholderTextColor={colors.dark300}
              />
            </View>
          </View>

          <View style={s.catalogHeader}>
            <Text style={s.sectionTitle}>{t('cashier.catalog')}</Text>
            <TextInput
              style={[s.input, s.searchInput]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('cashier.search')}
              placeholderTextColor={colors.dark300}
            />
          </View>

          {loadingCatalog ? (
            <ActivityIndicator color={colors.brand600} style={s.loader} />
          ) : (
            <ScrollView style={s.catalogList}>
              <View style={s.catalogGrid}>
                {filteredProducts.map((p) => (
                  <TouchableOpacity key={p.id} style={s.productCard} onPress={() => addProduct(p)}>
                    <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                    <Text style={s.productPrice}>{formatEuro(p.unit_price_cents)}</Text>
                    <Text style={s.productVat}>
                      {(p.vat_rate_bp / 100).toFixed(0)}% • {t(`cashier.venue.${p.venue}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={s.customCard}>
            <Text style={s.sectionTitle}>{t('cashier.addCustomItem')}</Text>
            <View style={s.customRow}>
              <TextInput
                style={[s.input, s.customName]}
                value={customName}
                onChangeText={setCustomName}
                placeholder={t('cashier.customItemName')}
                placeholderTextColor={colors.dark300}
              />
              <TextInput
                style={[s.input, s.customPrice]}
                value={customPrice}
                onChangeText={setCustomPrice}
                placeholder="0,00"
                placeholderTextColor={colors.dark300}
                keyboardType="decimal-pad"
              />
              <View style={s.customVat}>
                <BleicheSelect
                  value={String(customVat)}
                  onChange={(v) => setCustomVat(Number(v))}
                  options={vatOptions}
                />
              </View>
              <TouchableOpacity style={s.btnAdd} onPress={addCustom}>
                <Text style={s.btnAddText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Right: cart */}
        <View style={s.right}>
          <Text style={s.sectionTitle}>{t('cashier.cart')}</Text>
          {cart.length === 0 ? (
            <View style={s.cartEmpty}>
              <Text style={s.cartEmptyText}>{t('cashier.cartEmpty')}</Text>
            </View>
          ) : (
            <ScrollView style={s.cartList}>
              {cart.map((line) => {
                const lt = lineTotals(line);
                return (
                  <View key={line.tempId} style={s.cartRow}>
                    <View style={s.cartRowLeft}>
                      <Text style={s.cartDesc}>{line.description}</Text>
                      <Text style={s.cartMeta}>
                        {formatEuro(line.unitPriceCents)} • {(line.vatRateBp / 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={s.cartQty}>
                      <TouchableOpacity
                        style={s.qtyBtn}
                        onPress={() => updateQty(line.tempId, line.quantity - 1)}
                      >
                        <Text style={s.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={s.qtyText}>{line.quantity}</Text>
                      <TouchableOpacity
                        style={s.qtyBtn}
                        onPress={() => updateQty(line.tempId, line.quantity + 1)}
                      >
                        <Text style={s.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.cartLineTotal}>{formatEuro(lt.gross)}</Text>
                    <TouchableOpacity style={s.removeBtn} onPress={() => removeLine(line.tempId)}>
                      <Text style={s.removeBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={s.totals}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{t('cashier.subtotal')}</Text>
              <Text style={s.totalsValue}>{formatEuro(totals.net)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>{t('cashier.vat')}</Text>
              <Text style={s.totalsValue}>{formatEuro(totals.vat)}</Text>
            </View>
            <View style={[s.totalsRow, s.grandTotalRow]}>
              <Text style={s.grandTotalLabel}>{t('cashier.total')}</Text>
              <Text style={s.grandTotalValue}>{formatEuro(totals.gross)}</Text>
            </View>
          </View>

          <View style={s.paymentBlock}>
            <Text style={s.label}>{t('cashier.paymentMethod')}</Text>
            <BleicheSelect
              value={payment}
              onChange={(v) => setPayment(v as PaymentMethod)}
              options={paymentOptions}
            />
          </View>

          <TouchableOpacity
            style={[s.finalizeBtn, (cart.length === 0 || finalizing) && s.btnDisabled]}
            onPress={handleFinalize}
            disabled={cart.length === 0 || finalizing}
          >
            <Text style={s.finalizeBtnText}>
              {finalizing ? t('cashier.finalizing') : t('cashier.finalize')}
            </Text>
          </TouchableOpacity>
        </View>
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
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  left: { flex: 1.6 },
  right: {
    width: 380,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 16,
  },
  topControls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  venueWrap: { width: 180 },
  referenceWrap: { flex: 1 },
  label: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark400,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark700,
    marginBottom: 6,
  },
  searchInput: { width: 260 },
  catalogList: {
    flex: 1,
    marginBottom: 12,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  productCard: {
    width: 180,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 10,
  },
  productName: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark700,
    marginBottom: 4,
  },
  productPrice: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand700,
  },
  productVat: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    marginTop: 2,
  },
  loader: { margin: 24 },
  customCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 12,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  customName: { flex: 2 },
  customPrice: { width: 100 },
  customVat: { width: 90 },
  btnAdd: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand600,
  },
  btnAddText: {
    color: '#fff',
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: '700',
  },
  cartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cartEmptyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark400,
  },
  cartList: {
    flex: 1,
    marginBottom: 10,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    paddingVertical: 8,
  },
  cartRowLeft: { flex: 1 },
  cartDesc: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
  },
  cartMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
  },
  cartQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.dark200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark500,
  },
  qtyText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    width: 28,
    textAlign: 'center',
    color: colors.dark700,
  },
  cartLineTotal: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.dark700,
    width: 80,
    textAlign: 'right',
  },
  removeBtn: { paddingHorizontal: 6 },
  removeBtnText: {
    color: colors.dark400,
    fontSize: 16,
  },
  totals: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.dark200,
    paddingTop: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalsLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
  },
  totalsValue: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark700,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.dark200,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.brand700,
  },
  grandTotalValue: {
    fontFamily: fonts.serif,
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand700,
  },
  paymentBlock: { marginTop: 14 },
  finalizeBtn: {
    marginTop: 14,
    backgroundColor: colors.brand600,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finalizeBtnText: {
    color: '#fff',
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  btnDisabled: { opacity: 0.5 },
});
