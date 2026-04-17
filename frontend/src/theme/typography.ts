import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

const SERIF = Platform.select({ web: '"Noto Serif", Georgia, serif', default: 'Georgia' });
const SANS = Platform.select({ web: '"Noto Sans", Arial, sans-serif', default: 'System' });
const MONO = Platform.select({ web: '"JetBrains Mono", monospace', default: 'Courier' });

export const fonts = { serif: SERIF, sans: SANS, mono: MONO };

export const typography = StyleSheet.create({
  h1: {
    fontFamily: SERIF,
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: 1.4,
    color: colors.brand400,
  },
  pageTitle: {
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: '400',
    color: colors.brand400,
  },
  h2: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '400',
    color: colors.brand400,
  },
  h3: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: '500',
    color: colors.dark500,
  },
  body: {
    fontFamily: SANS,
    fontSize: 14,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontFamily: SANS,
    fontSize: 12,
    color: colors.textPrimary,
  },
  caption: {
    fontFamily: SANS,
    fontSize: 12,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  button: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  mono: {
    fontFamily: MONO,
    fontSize: 12,
    color: colors.dark500,
  },
  doc: {
    fontFamily: SANS,
    fontSize: 13,
    color: colors.dark700,
    lineHeight: 18,
  },
});
