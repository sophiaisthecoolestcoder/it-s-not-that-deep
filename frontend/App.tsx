import React, { useEffect, Component } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RouterProvider, useRouter } from './src/navigation/Router';
import { ToastProvider } from './src/components/ui/Toast';

import Layout from './src/components/Layout';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import OffersListScreen from './src/screens/offers/OffersListScreen';
import OfferEditorScreen from './src/screens/offers/OfferEditorScreen';
import BelegungEditorScreen from './src/screens/belegung/BelegungEditorScreen';
import DaysListScreen from './src/screens/belegung/DaysListScreen';
import StaffManagerScreen from './src/screens/belegung/StaffManagerScreen';
import ChatScreen from './src/screens/ChatScreen';
import { colors } from './src/theme/colors';

// ── Error boundary so crashes show a message instead of blank page ──────────

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>Rendering error</Text>
          <Text style={s.errorMsg}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Screen router ───────────────────────────────────────────────────────────

function ScreenRouter() {
  const { screen } = useRouter();

  switch (screen.name) {
    case 'home':
      return <HomeScreen />;
    case 'offers-list':
      return <OffersListScreen />;
    case 'offer-editor':
      return <OfferEditorScreen offerId={(screen as any).offerId} />;
    case 'belegung-editor':
      return <BelegungEditorScreen initialDate={(screen as any).date} />;
    case 'days-list':
      return <DaysListScreen />;
    case 'staff-manager':
      return <StaffManagerScreen />;
    case 'chat':
      return <ChatScreen />;
    default:
      return <HomeScreen />;
  }
}

// ── App content (auth-aware) ────────────────────────────────────────────────

function AppContent() {
  const { user, loading } = useAuth();
  const { screen, navigate } = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && screen.name === 'login') navigate({ name: 'home' });
    if (!user && screen.name !== 'login') navigate({ name: 'login' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) {
    return (
      <View style={s.splash}>
        <ActivityIndicator size="large" color={colors.brand600} />
      </View>
    );
  }

  if (!user || screen.name === 'login') {
    return <LoginScreen />;
  }

  return (
    <Layout>
      <ScreenRouter />
    </Layout>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider style={s.root}>
        <StatusBar barStyle="dark-content" />
        <AuthProvider>
          <RouterProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </RouterProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 32,
    backgroundColor: '#fff1f0',
    justifyContent: 'center',
    zIndex: 9999,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 12,
  },
  errorMsg: {
    fontSize: 13,
    color: '#7f1d1d',
    fontFamily: 'monospace',
  },
});
