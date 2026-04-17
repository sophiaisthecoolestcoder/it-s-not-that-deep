import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  h1: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: 1.8,
    color: colors.brand600,
  },
  h2: {
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 1,
    color: colors.dark600,
  },
  h3: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: colors.dark600,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: colors.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 0.6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  button: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
