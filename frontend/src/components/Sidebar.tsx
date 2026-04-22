import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useRouter } from '../navigation/Router';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import type { AppScreen } from '../navigation/Router';
import {
  CalendarDayIcon,
  CalendarIcon,
  CashierIcon,
  ChatIcon,
  HistoryIcon,
  HomeIcon,
  InvoiceIcon,
  OffersIcon,
  StaffIcon,
  UsersIcon,
} from './nav/NavIcons';

interface NavItem {
  screen: AppScreen;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  /** Additional screen names that should also highlight this item as active. */
  alsoActiveFor?: AppScreen['name'][];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const ICON_SIZE = 20;

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { screen, navigate } = useRouter();
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const hasAngebote = user?.modules.includes('angebote');
  const hasBelegung = user?.modules.includes('belegung');
  const hasEmployees = user?.modules.includes('employees');
  const hasCashier = user?.modules.includes('cashier');
  const hasAssistant = user?.modules.includes('assistant');

  function isActive(name: AppScreen['name']): boolean {
    return screen.name === name;
  }
  function matchesAny(names: AppScreen['name'][]): boolean {
    return names.some(isActive);
  }

  function NavRow({ item }: { item: NavItem }) {
    const activeNames: AppScreen['name'][] = [item.screen.name, ...(item.alsoActiveFor ?? [])];
    const active = matchesAny(activeNames);
    const color = active ? colors.brand400 : colors.dark300;
    const Icon = item.icon;
    return (
      <TouchableOpacity
        style={[s.navRow, active && s.navRowActive]}
        onPress={() => navigate(item.screen)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View style={[s.activeLine, active && s.activeLineLit]} />
        <View style={s.iconWrap}>
          <Icon size={ICON_SIZE} color={color} />
        </View>
        {!collapsed && (
          <Text style={[s.navText, active && s.navTextActive]}>{item.label}</Text>
        )}
      </TouchableOpacity>
    );
  }

  const BELEGUNG_ITEMS: NavItem[] = [
    { screen: { name: 'belegung-editor' }, label: t('nav.dayView'), icon: CalendarDayIcon },
    { screen: { name: 'days-list' }, label: t('nav.allDays'), icon: CalendarIcon },
    { screen: { name: 'staff-manager' }, label: t('nav.staff'), icon: StaffIcon },
  ];

  return (
    <View style={[s.sidebar, collapsed ? s.collapsed : s.expanded]}>
      {/* Logo */}
      <TouchableOpacity style={s.logoArea} onPress={() => navigate({ name: 'home' })}>
        {Platform.OS === 'web' ? (
          <Image
            source={{ uri: '/assets/logo_transparent.png' }}
            style={s.logoMark}
            resizeMode="contain"
          />
        ) : (
          <View style={s.logoMark} />
        )}
        {!collapsed && <Text style={s.logoText}>Bleiche Resort & Spa</Text>}
      </TouchableOpacity>

      {/* Nav */}
      <ScrollView style={s.nav} showsVerticalScrollIndicator={false}>
        <NavRow item={{ screen: { name: 'home' }, label: t('nav.home'), icon: HomeIcon }} />

        {hasAngebote && (
          <View>
            {collapsed ? <View style={s.divider} /> : null}
            <NavRow
              item={{
                screen: { name: 'offers-list' },
                label: t('nav.offers'),
                icon: OffersIcon,
                alsoActiveFor: ['offer-editor'],
              }}
            />
          </View>
        )}

        {hasBelegung && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.occupancy')}</Text>
            )}
            {BELEGUNG_ITEMS.map((item) => (
              <NavRow key={item.label} item={item} />
            ))}
          </View>
        )}

        {hasCashier && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.cashierSection')}</Text>
            )}
            <NavRow
              item={{
                screen: { name: 'cashier' },
                label: t('nav.cashier'),
                icon: CashierIcon,
              }}
            />
            <NavRow
              item={{
                screen: { name: 'invoices-list' },
                label: t('nav.invoices'),
                icon: InvoiceIcon,
                alsoActiveFor: ['invoice-detail'],
              }}
            />
          </View>
        )}

        {hasEmployees && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.hr')}</Text>
            )}
            <NavRow
              item={{
                screen: { name: 'employees-list' },
                label: t('nav.employees'),
                icon: UsersIcon,
                alsoActiveFor: ['employee-profile'],
              }}
            />
          </View>
        )}

        {hasAssistant && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.assistant')}</Text>
            )}
            <NavRow
              item={{
                screen: { name: 'chat' },
                label: t('nav.assistant'),
                icon: ChatIcon,
              }}
            />
            <NavRow
              item={{
                screen: { name: 'conversations-list' },
                label: t('chat.history'),
                icon: HistoryIcon,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity onPress={onToggle} style={s.toggleBtn} accessibilityLabel="Toggle sidebar">
          <Text style={s.toggleArrow}>{collapsed ? '›' : '‹'}</Text>
        </TouchableOpacity>
        {!collapsed && (
          <View style={s.bottomRight}>
            {user && (
              <>
                <Text style={s.userText} numberOfLines={1}>
                  {user.username}
                </Text>
                <Text style={s.userRole} numberOfLines={1}>
                  {user.role}
                </Text>
              </>
            )}
            <TouchableOpacity onPress={logout}>
              <Text style={s.logoutText}>{t('common.logout')}</Text>
            </TouchableOpacity>
            <View style={s.langRow}>
              <TouchableOpacity
                style={[s.langBtn, locale === 'de' && s.langBtnActive]}
                onPress={() => setLocale('de')}
              >
                <Text style={[s.langText, locale === 'de' && s.langTextActive]}>{t('lang.de')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langBtn, locale === 'en' && s.langBtnActive]}
                onPress={() => setLocale('en')}
              >
                <Text style={[s.langText, locale === 'en' && s.langTextActive]}>{t('lang.en')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.dark800,
    flexDirection: 'column',
  },
  expanded: { width: 280 },
  collapsed: { width: 72 },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark700,
  },
  logoMark: {
    width: 36,
    height: 36,
    flexShrink: 0,
  },
  logoText: {
    fontFamily: fonts.serif,
    fontSize: 13,
    color: colors.brand400,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  sectionLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.dark500,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark700,
    marginHorizontal: 12,
    marginVertical: 6,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 16,
  },
  navRowActive: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  activeLine: {
    width: 2,
    height: 22,
    backgroundColor: 'transparent',
    marginRight: 12,
    marginLeft: 0,
  },
  activeLineLit: {
    backgroundColor: colors.brand400,
  },
  iconWrap: {
    width: ICON_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark300,
    marginLeft: 10,
  },
  navTextActive: {
    color: colors.brand400,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark700,
  },
  toggleBtn: { padding: 4 },
  toggleArrow: {
    color: colors.dark400,
    fontSize: 22,
    lineHeight: 24,
  },
  bottomRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand300,
  },
  userRole: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.dark400,
    backgroundColor: 'rgba(194, 169, 140, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  logoutText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
    letterSpacing: 0.6,
  },
  langRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  langBtn: {
    borderWidth: 1,
    borderColor: colors.dark700,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  langBtnActive: {
    borderColor: colors.brand400,
    backgroundColor: 'rgba(194, 169, 140, 0.15)',
  },
  langText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    color: colors.dark500,
  },
  langTextActive: {
    color: colors.brand300,
    fontWeight: '600',
  },
});
