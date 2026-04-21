import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useRouter } from '../navigation/Router';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import type { AppScreen } from '../navigation/Router';

interface NavItem {
  screen: AppScreen;
  label: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { screen, navigate } = useRouter();
  const { user, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const ANGEBOTE_ITEMS: NavItem[] = [
    { screen: { name: 'offer-editor' }, label: t('nav.newOffer') },
    { screen: { name: 'offers-list' }, label: t('nav.allOffers') },
  ];

  const BELEGUNG_ITEMS: NavItem[] = [
    { screen: { name: 'belegung-editor' }, label: t('nav.dayView') },
    { screen: { name: 'days-list' }, label: t('nav.allDays') },
    { screen: { name: 'staff-manager' }, label: t('nav.staff') },
  ];

  const hasAngebote = user?.modules.includes('angebote');
  const hasBelegung = user?.modules.includes('belegung');
  const hasAssistant = user?.modules.includes('assistant');

  function isActive(name: AppScreen['name']) {
    return screen.name === name;
  }

  function NavRow({ item, active }: { item: NavItem; active: boolean }) {
    return (
      <TouchableOpacity
        style={[s.navRow, active && s.navRowActive]}
        onPress={() => navigate(item.screen)}
      >
        <View style={[s.activeLine, active && s.activeLineLit]} />
        {!collapsed && (
          <Text style={[s.navText, active && s.navTextActive]}>
            {item.label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[s.sidebar, collapsed ? s.collapsed : s.expanded]}>
      {/* Logo area */}
      <TouchableOpacity style={s.logoArea} onPress={() => navigate({ name: 'home' })}>
        <View style={s.logoMark} />
        {!collapsed && <Text style={s.logoText}>Bleiche Resort & Spa</Text>}
      </TouchableOpacity>

      {/* Nav items */}
      <ScrollView style={s.nav} showsVerticalScrollIndicator={false}>
        {/* Home */}
        <TouchableOpacity
          style={[s.navRow, isActive('home') && s.navRowActive]}
          onPress={() => navigate({ name: 'home' })}
        >
          <View style={[s.activeLine, isActive('home') && s.activeLineLit]} />
          {!collapsed && (
            <Text style={[s.navText, isActive('home') && s.navTextActive]}>
              {t('nav.home')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Angebote */}
        {hasAngebote && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.offers')}</Text>
            )}
            {ANGEBOTE_ITEMS.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={isActive(item.screen.name)}
              />
            ))}
          </View>
        )}

        {/* Belegungsliste */}
        {hasBelegung && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.occupancy')}</Text>
            )}
            {BELEGUNG_ITEMS.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={isActive(item.screen.name)}
              />
            ))}
          </View>
        )}

        {/* Assistant */}
        {hasAssistant && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>{t('nav.assistant')}</Text>
            )}
            <TouchableOpacity
              style={[s.navRow, isActive('chat') && s.navRowActive]}
              onPress={() => navigate({ name: 'chat' })}
            >
              <View style={[s.activeLine, isActive('chat') && s.activeLineLit]} />
              {!collapsed && (
                <Text style={[s.navText, isActive('chat') && s.navTextActive]}>
                  {t('nav.assistant')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.navRow, isActive('conversations-list') && s.navRowActive]}
              onPress={() => navigate({ name: 'conversations-list' })}
            >
              <View style={[s.activeLine, isActive('conversations-list') && s.activeLineLit]} />
              {!collapsed && (
                <Text style={[s.navText, isActive('conversations-list') && s.navTextActive]}>
                  {t('chat.history')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <TouchableOpacity onPress={onToggle} style={s.toggleBtn}>
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
    backgroundColor: colors.brand400,
    flexShrink: 0,
    borderRadius: 0,
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
    height: 18,
    backgroundColor: 'transparent',
    marginRight: 14,
    marginLeft: 0,
  },
  activeLineLit: {
    backgroundColor: colors.brand400,
  },
  navText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.dark300,
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
