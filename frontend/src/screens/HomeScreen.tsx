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
        <Text style={styles.pageLabel}>Dashboard</Text>
        <Text style={styles.tagline}>Bleiche Resort</Text>
        <Text style={styles.subtitle}>Operations Workspace</Text>
        <View style={styles.divider} />
        <Text style={styles.motto}>Verabreden, ankommen. Sein.</Text>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={styles.card} onPress={loadEmployees}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Mitarbeiter</Text>
          <Text style={styles.cardCaption}>Personal ubersicht</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={loadGuests}>
          <Text style={styles.cardIcon}>🛎️</Text>
          <Text style={styles.cardTitle}>Gäste</Text>
          <Text style={styles.cardCaption}>Anreisen und Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={[styles.card, styles.chatCard]} onPress={props.onNavigateToChat}>
          <Text style={styles.cardIcon}>🤖</Text>
          <Text style={styles.cardTitle}>Assistant</Text>
          <Text style={styles.cardCaption}>KI gestutzte Anfragen</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.forest} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && activeView === 'employees' ? (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>Mitarbeiter ({employees.length})</Text>
          {employees.length === 0 ? <Text style={styles.empty}>Keine Mitarbeiter gefunden.</Text> : null}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>Name</Text>
            <Text style={styles.tableHeaderCell}>Rolle</Text>
          </View>
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
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableHeaderCell}>Name</Text>
            <Text style={styles.tableHeaderCell}>Nationalität</Text>
          </View>
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
    paddingTop: 52,
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  pageLabel: {
    ...typography.label,
    color: colors.dark400,
    marginBottom: 8,
  },
  tagline: {
    ...typography.h1,
    fontSize: 38,
    letterSpacing: 1.2,
    color: colors.brand600,
  },
  subtitle: {
    ...typography.label,
    marginTop: 6,
    color: colors.dark500,
  },
  divider: {
    width: 84,
    height: 2,
    backgroundColor: colors.brand400,
    marginTop: 16,
    marginBottom: 12,
  },
  motto: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.dark500,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: 4,
    color: colors.brand700,
  },
  cardCaption: {
    ...typography.label,
    color: colors.dark400,
    fontSize: 10,
  },
  loader: {
    marginTop: 14,
  },
  error: {
    marginTop: 14,
    color: colors.error,
    textAlign: 'left',
  },
  list: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
  },
  listTitle: {
    ...typography.label,
    fontSize: 11,
    color: colors.dark600,
    backgroundColor: colors.brand100,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.dark50,
  },
  tableHeaderCell: {
    ...typography.label,
    color: colors.dark500,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.dark500,
  },
  chatCard: {
    flex: 0.65,
  },
});
