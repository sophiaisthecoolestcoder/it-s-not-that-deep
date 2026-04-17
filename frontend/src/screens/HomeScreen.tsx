import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, typography } from '../theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.tagline}>BLEICHE</Text>
        <Text style={styles.subtitle}>Resort & Spa</Text>
        <View style={styles.divider} />
        <Text style={styles.motto}>Verabreden, ankommen. Sein.</Text>
      </View>

      <View style={styles.cardRow}>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Mitarbeiter</Text>
          <Text style={styles.cardCaption}>Verwaltung</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardIcon}>🛎️</Text>
          <Text style={styles.cardTitle}>Gäste</Text>
          <Text style={styles.cardCaption}>Verwaltung</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 80,
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
});
