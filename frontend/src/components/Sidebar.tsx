import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { useRouter } from '../navigation/Router';
import { useAuth } from '../auth/AuthContext';
import type { AppScreen } from '../navigation/Router';

interface NavItem {
  screen: AppScreen;
  label: string;
}

const ANGEBOTE_ITEMS: NavItem[] = [
  { screen: { name: 'offer-editor' }, label: 'Neues Angebot' },
  { screen: { name: 'offers-list' }, label: 'Alle Angebote' },
];

const BELEGUNG_ITEMS: NavItem[] = [
  { screen: { name: 'belegung-editor' }, label: 'Tagesansicht' },
  { screen: { name: 'days-list' }, label: 'Alle Tage' },
  { screen: { name: 'staff-manager' }, label: 'Mitarbeiter' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { screen, navigate } = useRouter();
  const { user, logout } = useAuth();

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
              Startseite
            </Text>
          )}
        </TouchableOpacity>

        {/* Angebote */}
        {hasAngebote && (
          <View>
            {collapsed ? (
              <View style={s.divider} />
            ) : (
              <Text style={s.sectionLabel}>Angebote</Text>
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
              <Text style={s.sectionLabel}>Belegungsliste</Text>
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
              <Text style={s.sectionLabel}>KI-Assistent</Text>
            )}
            <TouchableOpacity
              style={[s.navRow, isActive('chat') && s.navRowActive]}
              onPress={() => navigate({ name: 'chat' })}
            >
              <View style={[s.activeLine, isActive('chat') && s.activeLineLit]} />
              {!collapsed && (
                <Text style={[s.navText, isActive('chat') && s.navTextActive]}>
                  Assistant
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
              <Text style={s.userText} numberOfLines={1}>
                {user.username}
              </Text>
            )}
            <TouchableOpacity onPress={logout}>
              <Text style={s.logoutText}>Abmelden</Text>
            </TouchableOpacity>
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
    gap: 2,
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
  },
  logoutText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
    letterSpacing: 0.6,
  },
});
