import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { colors, typography } from '../theme';

type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
};

type Guest = {
  id: number;
  first_name: string;
  last_name: string;
  nationality?: string;
};

interface HomeScreenProps {
  onNavigateToChat?: () => void;
}

export default function HomeScreen(props: HomeScreenProps) {
  const [activeView, setActiveView] = useState<'employees' | 'guests' | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEmployees = () => {
    setLoading(true);
    setError('');
    setActiveView('employees');
    api
      .getEmployees()
      .then((data) => {
        setEmployees(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load employees');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadGuests = () => {
    setLoading(true);
    setError('');
    setActiveView('guests');
    api
      .getGuests()
      .then((data) => {
        setGuests(data);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load guests');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tagline}>BLEICHE</Text>
        <Text style={styles.subtitle}>Resort & Spa</Text>
        <View style={styles.divider} />
        <Text style={styles.motto}>Verabreden, ankommen. Sein.</Text>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={styles.card} onPress={loadEmployees}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Mitarbeiter</Text>
          <Text style={styles.cardCaption}>Verwaltung</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={loadGuests}>
          <Text style={styles.cardIcon}>🛎️</Text>
          <Text style={styles.cardTitle}>Gäste</Text>
          <Text style={styles.cardCaption}>Verwaltung</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={[styles.card, styles.chatCard]} onPress={props.onNavigateToChat}>
          <Text style={styles.cardIcon}>🤖</Text>
          <Text style={styles.cardTitle}>Assistant</Text>
          <Text style={styles.cardCaption}>AI-Anfragen</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.forest} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && activeView === 'employees' ? (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>Mitarbeiter ({employees.length})</Text>
          {employees.length === 0 ? <Text style={styles.empty}>Keine Mitarbeiter gefunden.</Text> : null}
          {employees.map((employee) => (
            <View key={employee.id} style={styles.row}>
              <Text style={styles.rowTitle}>
                {employee.first_name} {employee.last_name}
              </Text>
              <Text style={styles.rowMeta}>{employee.role}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!loading && activeView === 'guests' ? (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>Gäste ({guests.length})</Text>
          {guests.length === 0 ? <Text style={styles.empty}>Keine Gäste gefunden.</Text> : null}
          {guests.map((guest) => (
            <View key={guest.id} style={styles.row}>
              <Text style={styles.rowTitle}>
                {guest.first_name} {guest.last_name}
              </Text>
              <Text style={styles.rowMeta}>{guest.nationality || 'Unknown nationality'}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  tagline: {
    ...typography.h1,
    fontSize: 36,
    letterSpacing: 8,
    color: colors.forest,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 14,
    letterSpacing: 4,
    marginTop: 4,
    color: colors.sage,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: colors.gold,
    marginVertical: 16,
  },
  motto: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: 4,
  },
  cardCaption: {
    ...typography.caption,
  },
  loader: {
    marginTop: 20,
  },
  error: {
    marginTop: 16,
    color: '#B3261E',
    textAlign: 'center',
  },
  list: {
    marginTop: 20,
  },
  listTitle: {
    ...typography.h3,
    marginBottom: 12,
    color: colors.forest,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    marginTop: 4,
    color: colors.textSecondary,
  },
  chatCard: {
    flex: 0.5,
  },
});
