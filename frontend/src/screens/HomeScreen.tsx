import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useRouter } from '../navigation/Router';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

function ModuleCard({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardIcon} />
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardDesc}>{description}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  const hasAngebote = user?.modules.includes('angebote');
  const hasBelegung = user?.modules.includes('belegung');
  const hasAssistant = user?.modules.includes('assistant');

  return (
    <View style={s.root}>
      <View style={s.cards}>
        {hasAngebote && (
          <ModuleCard
            title="Angebote"
            description="Angebote für Gäste erstellen und verwalten"
            onPress={() => navigate({ name: 'offers-list' })}
          />
        )}
        {hasBelegung && (
          <ModuleCard
            title="Belegungsliste"
            description="Tägliche Gästebelegung und Betriebsinformationen"
            onPress={() => navigate({ name: 'belegung-editor' })}
          />
        )}
        {hasAssistant && (
          <ModuleCard
            title="KI-Assistent"
            description="Anfragen mit Live-Datenzugriff"
            onPress={() => navigate({ name: 'chat' })}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    paddingVertical: 40,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
    maxWidth: 720,
    width: '100%',
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 36,
    alignItems: 'center',
    gap: 12,
    minWidth: 220,
    maxWidth: 280,
    flex: 1,
  },
  cardIcon: {
    width: 56,
    height: 56,
    backgroundColor: colors.brand100,
    borderWidth: 1,
    borderColor: colors.brand300,
  },
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.dark500,
    textAlign: 'center',
  },
  cardDesc: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
    textAlign: 'center',
  },
});
