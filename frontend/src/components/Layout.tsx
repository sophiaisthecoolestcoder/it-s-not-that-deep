import React, { useState } from 'react';
import { View, Image, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={s.root}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <View style={s.main}>
        {/* Bleiche logo header */}
        <View style={s.logoHeader}>
          {Platform.OS === 'web' ? (
            <Image
              source={{ uri: '/assets/bleiche-logo-text.png' }}
              style={s.logoImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
        {/* Page content */}
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  logoHeader: {
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    backgroundColor: colors.background,
  },
  logoImage: {
    height: 64,
    width: 260,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
});
