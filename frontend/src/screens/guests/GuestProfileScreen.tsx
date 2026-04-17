import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Guest } from '../../types/guest';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface Props {
  guestId: number;
}

export default function GuestProfileScreen({ guestId }: Props) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getGuest(guestId).then(setGuest).catch((e: Error) => setError(e.message));
  }, [guestId]);

  if (error) {
    return <Text style={s.error}>{error}</Text>;
  }

  if (!guest) {
    return <ActivityIndicator color={colors.brand600} />;
  }

  return (
    <View style={s.card}>
      <Text style={s.title}>{guest.first_name} {guest.last_name}</Text>
      <Text style={s.row}>Email: {guest.email || '-'}</Text>
      <Text style={s.row}>Nationality: {guest.nationality || '-'}</Text>
      <Text style={s.row}>Notes: {guest.notes || '-'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 20,
    gap: 8,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.brand700,
    marginBottom: 6,
  },
  row: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.error,
  },
});
