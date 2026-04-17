import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1.5,
    color: colors.forest,
  },
  h2: {
    fontSize: 22,
    fontWeight: '400',
    letterSpacing: 0.8,
    color: colors.charcoal,
  },
  h3: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.charcoal,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
});
