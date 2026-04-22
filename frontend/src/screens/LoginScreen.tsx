import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    login(username.trim(), password)
      .catch((e: Error) => setError(e.message || 'Login failed'))
      .finally(() => setLoading(false));
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        {/* Brand header */}
        <View style={s.brandArea}>
          {Platform.OS === 'web' && (
            <Image
              source={{ uri: '/assets/logo_transparent.png' }}
              style={s.brandMark}
              resizeMode="contain"
            />
          )}
          <Text style={s.brandTitle}>Bleiche Resort & Spa</Text>
          <Text style={s.brandSub}>{t('login.workspace')}</Text>
        </View>

        <View style={s.divider} />

        {/* Form */}
        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>{t('login.username')}</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              placeholderTextColor={colors.dark300}
              placeholder="benutzername"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>{t('login.password')}</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              placeholderTextColor={colors.dark300}
              placeholder="••••••••"
            />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>{t('login.signIn')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Verabreden, ankommen. Sein.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 40,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  brandMark: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  brandTitle: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.brand700,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  brandSub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark400,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.brand200,
    marginBottom: 28,
  },
  form: {
    gap: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.dark400,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.error,
  },
  btn: {
    backgroundColor: colors.brand600,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  footer: {
    marginTop: 32,
    fontFamily: fonts.serif,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.dark400,
    textAlign: 'center',
  },
});
