import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useRouter } from '../navigation/Router';
import { useI18n } from '../i18n/I18nContext';
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
  const { t } = useI18n();

  const hasAngebote = user?.modules.includes('angebote');
  const hasBelegung = user?.modules.includes('belegung');
  const hasAssistant = user?.modules.includes('assistant');

  return (
    <View style={s.root}>
      {/* User profile card */}
      {user && (
        <View style={s.profileCard}>
          <Text style={s.profileLabel}>{t('home.loggedInAs')}</Text>
          <Text style={s.profileUsername}>{user.username}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
      )}

      <View style={s.cards}>
        {hasAngebote && (
          <ModuleCard
            title={t('nav.offers')}
            description={t('home.offersDesc')}
            onPress={() => navigate({ name: 'offers-list' })}
          />
        )}
        {hasBelegung && (
          <ModuleCard
            title={t('nav.occupancy')}
            description={t('home.occupancyDesc')}
            onPress={() => navigate({ name: 'belegung-editor' })}
          />
        )}
        {hasAssistant && (
          <ModuleCard
            title={t('nav.assistant')}
            description={t('home.assistantDesc')}
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
    paddingVertical: 40,
  },
  profileCard: {
    marginBottom: 32,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand300,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 2,
    maxWidth: 300,
  },
  profileLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  profileUsername: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
    fontWeight: '500',
  },
  roleBadge: {
    backgroundColor: colors.brand100,
    borderWidth: 1,
    borderColor: colors.brand400,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  roleBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: colors.brand700,
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
