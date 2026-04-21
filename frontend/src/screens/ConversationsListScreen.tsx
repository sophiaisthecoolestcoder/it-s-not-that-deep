import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { api, ConversationSummary } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import { useRouter } from '../navigation/Router';
import { useToast } from '../components/ui/Toast';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { formatDateShort } from '../utils/helpers';

export default function ConversationsListScreen() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listConversations()
      .then(setItems)
      .catch((e: Error) => addToast({ type: 'error', title: t('common.error'), message: e.message }))
      .finally(() => setLoading(false));
  }, [addToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = (id: number) => {
    navigate({ name: 'chat', conversationId: id });
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      t('conversations.deleteConfirmTitle'),
      t('conversations.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            api
              .deleteConversation(id)
              .then(() => {
                setItems((prev) => prev.filter((c) => c.id !== id));
                addToast({ type: 'success', title: t('conversations.deleted'), message: '' });
              })
              .catch((e: Error) =>
                addToast({ type: 'error', title: t('common.error'), message: e.message }),
              );
          },
        },
      ],
    );
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.pageTitle}>{t('conversations.title')}</Text>
        <TouchableOpacity
          style={s.btnPrimary}
          onPress={() => navigate({ name: 'chat' })}
          accessibilityRole="button"
          accessibilityLabel={t('conversations.new')}
        >
          <Text style={s.btnPrimaryText}>+ {t('chat.newConversation')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.brand600} />
      ) : items.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>{t('conversations.empty')}</Text>
          <TouchableOpacity style={s.btnSecondary} onPress={() => navigate({ name: 'chat' })}>
            <Text style={s.btnSecondaryText}>{t('conversations.new')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView>
          <View style={s.list}>
            {items.map((c) => (
              <View key={c.id} style={s.row}>
                <TouchableOpacity
                  style={s.rowMain}
                  onPress={() => handleOpen(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={c.title}
                >
                  <Text style={s.rowTitle} numberOfLines={1}>
                    {c.title || `#${c.id}`}
                  </Text>
                  <Text style={s.rowMeta}>{formatDateShort(c.last_active_at)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnDanger]}
                  onPress={() => handleDelete(c.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.delete')}
                >
                  <Text style={[s.actionBtnText, { color: colors.errorText }]}>
                    {t('common.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.brand700,
  },
  btnPrimary: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.brand600,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#fff',
  },
  loader: { marginTop: 40 },
  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark400,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
    letterSpacing: 0.6,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.dark200,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark100,
  },
  rowMain: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowMeta: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark400,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  actionBtnDanger: {
    borderColor: colors.errorBorder,
  },
  actionBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.dark500,
  },
});
