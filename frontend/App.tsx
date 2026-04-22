import React, { useEffect, Component } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { RouterProvider, useRouter } from './src/navigation/Router';
import { ToastProvider } from './src/components/ui/Toast';
import { I18nProvider } from './src/i18n/I18nContext';

import Layout from './src/components/Layout';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import OffersListScreen from './src/screens/offers/OffersListScreen';
import OfferEditorScreen from './src/screens/offers/OfferEditorScreen';
import BelegungEditorScreen from './src/screens/belegung/BelegungEditorScreen';
import DaysListScreen from './src/screens/belegung/DaysListScreen';
import StaffManagerScreen from './src/screens/belegung/StaffManagerScreen';
import ChatScreen from './src/screens/ChatScreen';
import ConversationsListScreen from './src/screens/ConversationsListScreen';
import GuestProfileScreen from './src/screens/guests/GuestProfileScreen';
import EmployeeProfileScreen from './src/screens/employees/EmployeeProfileScreen';
import EmployeesListScreen from './src/screens/employees/EmployeesListScreen';
import CashierScreen from './src/screens/cashier/CashierScreen';
import InvoicesListScreen from './src/screens/cashier/InvoicesListScreen';
import InvoiceDetailScreen from './src/screens/cashier/InvoiceDetailScreen';
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

  let body: React.ReactNode;
  switch (screen.name) {
    case 'home':
      body = <HomeScreen />;
      break;
    case 'offers-list':
      body = <OffersListScreen />;
      break;
    case 'offer-editor':
      body = <OfferEditorScreen offerId={screen.offerId} mode={screen.mode} />;
      break;
    case 'guest-profile':
      body = <GuestProfileScreen guestId={screen.guestId} />;
      break;
    case 'employees-list':
      body = <EmployeesListScreen />;
      break;
    case 'employee-profile':
      body = <EmployeeProfileScreen employeeId={screen.employeeId} mode={screen.mode} />;
      break;
    case 'belegung-editor':
      body = <BelegungEditorScreen initialDate={screen.date} />;
      break;
    case 'days-list':
      body = <DaysListScreen />;
      break;
    case 'staff-manager':
      body = <StaffManagerScreen />;
      break;
    case 'chat':
      body = <ChatScreen conversationId={screen.conversationId} />;
      break;
    case 'conversations-list':
      body = <ConversationsListScreen />;
      break;
    case 'cashier':
      body = <CashierScreen />;
      break;
    case 'invoices-list':
      body = <InvoicesListScreen />;
      break;
    case 'invoice-detail':
      body = <InvoiceDetailScreen invoiceId={screen.invoiceId} />;
      break;
    default:
      body = <HomeScreen />;
  }
  // Re-key the boundary per screen so one screen's error doesn't permanently
  // poison the next one — navigating away resets the boundary.
  return <ErrorBoundary key={screen.name}>{body}</ErrorBoundary>;
}

// ── App content (auth-aware) ────────────────────────────────────────────────

function AppContent() {
  const { user, loading } = useAuth();
  const { screen, replace } = useRouter();

  useEffect(() => {
    if (loading) return;
    // Use replace so the auth redirect doesn't pollute browser history:
    // someone who lands on /offers while logged out shouldn't see /login
    // show up as a back-target once they sign in.
    if (user && screen.name === 'login') replace({ name: 'home' });
    if (!user && screen.name !== 'login') replace({ name: 'login' });
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
            <I18nProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </I18nProvider>
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
