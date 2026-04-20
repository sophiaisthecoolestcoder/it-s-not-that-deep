import React, { useRef, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useRouter } from '../navigation/Router';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../components/ui/Toast';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { CHAT_THEME, CHAT_HIGHLIGHT_CSS, CHAT_MARKDOWN_CSS } from '../theme/chat';
import { CopyIcon, ReloadIcon } from '../components/chat/ChatIcons';
import { ROLE_LABELS } from '../types/auth';
import type { AssistantObjectRef } from '../types/assistant';
import { downloadTextFile } from '../utils/downloads';
import { copyTextToClipboard } from '../utils/clipboard';
import { exportConversationAsImage } from '../utils/exportConversationAsImage';

let cssInjected = false;
function injectStyles() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = CHAT_HIGHLIGHT_CSS + CHAT_MARKDOWN_CSS;
  document.head.appendChild(style);
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  references?: AssistantObjectRef[];
};

type MarkdownCodeProps = {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  onCopyCode: (value: string) => void;
  t: (key: string) => string;
};

type MessageActionButtonProps = {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
};

function formatTranscript(messages: Message[]) {
  return messages
    .map((message) => {
      const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
      const referenceText = (message.references || [])
        .map((ref) => `- ${ref.object_type}: ${ref.title}${ref.subtitle ? ` (${ref.subtitle})` : ''}`)
        .join('\n');
      return [
        `${roleLabel}: ${message.content}`,
        referenceText ? `References:\n${referenceText}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function CodeBlock({ inline, className, children, onCopyCode, t }: MarkdownCodeProps) {
  const code = String(children).replace(/\n$/, '');
  if (inline) {
    return <code className={className}>{children}</code>;
  }

  return (
    <View style={s.codeWrap}>
      <View style={s.codeHeader}>
        <Text style={s.codeLabel}>{className?.replace('language-', '') || 'code'}</Text>
        <TouchableOpacity style={s.codeCopyBtn} onPress={() => onCopyCode(code)}>
          <Text style={s.codeCopyBtnText}>{t('chat.copyCode')}</Text>
        </TouchableOpacity>
      </View>
      <Text selectable style={s.codeText}>{code}</Text>
    </View>
  );
}

function ObjectRefCard({
  refItem,
  onOpen,
  onDownload,
  t,
}: {
  refItem: AssistantObjectRef;
  onOpen: (ref: AssistantObjectRef) => void;
  onDownload: (ref: AssistantObjectRef) => void;
  t: (key: string) => string;
}) {
  const canOpen = (refItem.actions || []).includes('open');
  const canDownload = (refItem.actions || []).includes('download');

  return (
    <View style={s.refCard}>
      <Text style={s.refType}>{refItem.object_type}</Text>
      <Text style={s.refTitle}>{refItem.title}</Text>
      {refItem.subtitle ? <Text style={s.refSubtitle}>{refItem.subtitle}</Text> : null}
      <View style={s.refActions}>
        {canOpen && (
          <TouchableOpacity style={s.refBtn} onPress={() => onOpen(refItem)}>
            <Text style={s.refBtnText}>{t('widget.open')}</Text>
          </TouchableOpacity>
        )}
        {canDownload && (
          <TouchableOpacity style={s.refBtn} onPress={() => onDownload(refItem)}>
            <Text style={s.refBtnText}>{t('widget.download')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MessageActionButton({ onPress, label, children, disabled }: MessageActionButtonProps) {
  return (
    <TouchableOpacity
      style={s.msgActionBtn}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      activeOpacity={0.75}
    >
      {children}
    </TouchableOpacity>
  );
}

function AssistantMessage({
  content,
  onCopyCode,
  t,
}: {
  content: string;
  onCopyCode: (value: string) => void;
  t: (key: string) => string;
}) {
  if (Platform.OS !== 'web') {
    return <Text selectable style={s.asstText}>{content}</Text>;
  }
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ inline, className, children }) => (
            <CodeBlock inline={inline} className={className} onCopyCode={onCopyCode} t={t}>
              {children}
            </CodeBlock>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reloadingMessageId, setReloadingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const conversationRef = useRef<View>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const latestAssistantMessageId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;

  const copyText = async (text: string) => {
    await copyTextToClipboard(text);
    addToast({ type: 'success', title: t('common.copy'), message: t('common.copied') });
  };

  const handleCopyConversation = async () => {
    try {
      await copyText(formatTranscript(messages));
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Copy failed' });
    }
  };

  const handleReloadResponse = async (messageId: string) => {
    if (loading || reloadingMessageId) return;

    const messageIndex = messages.findIndex((message) => message.id === messageId);
    if (messageIndex <= 0) return;

    const assistantMessage = messages[messageIndex];
    const previousMessage = messages[messageIndex - 1];
    if (assistantMessage.role !== 'assistant' || previousMessage.role !== 'user') return;
    if (latestAssistantMessageId !== messageId) return;

    const conversation = messages.slice(0, messageIndex).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setLoading(true);
    setReloadingMessageId(messageId);

    try {
      const res = await api.askAssistant(previousMessage.content, conversation);
      setMessages((prev) => prev.map((message) => (
        message.id === messageId
          ? { ...message, content: res.answer, references: res.references || [] }
          : message
      )));
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Reload failed' });
    } finally {
      setLoading(false);
      setReloadingMessageId(null);
    }
  };

  const handleExportConversationImage = async () => {
    if (Platform.OS !== 'web') {
      addToast({ type: 'error', title: t('common.error'), message: 'Conversation image export is only available on web' });
      return;
    }

    const element = conversationRef.current as unknown as HTMLElement | null;
    if (!element) {
      addToast({ type: 'error', title: t('common.error'), message: 'Conversation view is not ready' });
      return;
    }

    try {
      await exportConversationAsImage(element, `chat-${new Date().toISOString().slice(0, 10)}.png`);
      addToast({ type: 'success', title: t('common.download'), message: t('chat.exportImage') });
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Image export failed' });
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: `${Date.now()}`, role: 'user', content: input };
    const q = input;
    setInput('');
    setLoading(true);

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    api
      .askAssistant(q, nextMessages.map((m) => ({ role: m.role, content: m.content })))
      .then((res) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-a`,
            role: 'assistant',
            content: res.answer,
            references: res.references || [],
          },
        ]);
      })
      .catch((e: Error) => {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-err`, role: 'assistant', content: `**Fehler:** ${e.message}` },
        ]);
      })
      .finally(() => setLoading(false));
  };

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenReference = (refItem: AssistantObjectRef) => {
    const numericId = Number(refItem.object_id);
    if (refItem.object_type === 'offer' && !Number.isNaN(numericId)) {
      navigate({ name: 'offer-editor', offerId: numericId });
      return;
    }
    if (refItem.object_type === 'guest' && !Number.isNaN(numericId)) {
      navigate({ name: 'guest-profile', guestId: numericId });
      return;
    }
    if (refItem.object_type === 'employee' && !Number.isNaN(numericId)) {
      navigate({ name: 'employee-profile', employeeId: numericId });
      return;
    }
    if (refItem.object_type === 'daily_briefing') {
      navigate({ name: 'belegung-editor', date: refItem.object_id });
    }
  };

  const handleDownloadReference = async (refItem: AssistantObjectRef) => {
    if (refItem.object_type !== 'offer') return;
    const numericId = Number(refItem.object_id);
    if (Number.isNaN(numericId)) return;

    try {
      const html = await api.exportOfferHtml(numericId, locale);
      downloadTextFile(`offer-${numericId}.html`, html, 'text/html;charset=utf-8');
      addToast({ type: 'success', title: t('common.download'), message: refItem.title });
    } catch (e: any) {
      addToast({ type: 'error', title: t('common.error'), message: e?.message || 'Export failed' });
    }
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerLabel}>{t('nav.assistant')}</Text>
        <Text style={s.title}>{t('chat.title')}</Text>
        {user && (
          <Text style={s.roleTag}>
            {ROLE_LABELS[user.role]} · {t('chat.activeQuery')}
          </Text>
        )}
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={handleCopyConversation}>
            <Text style={s.headerBtnText}>{t('chat.copyConversation')}</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' && (
            <TouchableOpacity style={s.headerBtn} onPress={handleExportConversationImage}>
              <Text style={s.headerBtnText}>{t('chat.exportImage')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.msgs}
        contentContainerStyle={s.msgsContent}
      >
        <View ref={conversationRef} collapsable={false} style={s.conversationCapture}>
          {messages.map((msg) => {
            const isLatestAssistant = msg.role === 'assistant' && msg.id === latestAssistantMessageId;
            return (
              <View
                key={msg.id}
                style={[s.msgShell, msg.role === 'user' ? s.msgShellUser : s.msgShellAssistant]}
              >
                <View
                  style={[
                    s.msg,
                    msg.role === 'user' ? s.userMsg : s.asstMsg,
                    reloadingMessageId === msg.id && s.msgReloading,
                  ]}
                >
                  <Text style={[s.msgRole, msg.role === 'user' ? s.msgRoleUser : s.msgRoleAssistant]}>
                    {msg.role === 'user' ? t('chat.you') : t('chat.assistant')}
                  </Text>
                  {msg.role === 'user' ? (
                    <Text selectable style={s.userText}>{msg.content}</Text>
                  ) : (
                    <View>
                      <AssistantMessage content={msg.content} onCopyCode={copyText} t={t} />
                      {msg.references?.length ? (
                        <View style={s.refList}>
                          {msg.references.map((r) => (
                            <ObjectRefCard
                              key={`${msg.id}-${r.object_type}-${r.object_id}`}
                              refItem={r}
                              onOpen={handleOpenReference}
                              onDownload={handleDownloadReference}
                              t={t}
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
                <View style={[s.msgActions, msg.role === 'user' ? s.msgActionsUser : s.msgActionsAssistant]}>
                  <MessageActionButton onPress={() => copyText(msg.content)} label={t('common.copy')}>
                    <CopyIcon size={CHAT_THEME.actionIconSize} color={CHAT_THEME.actionIcon} />
                  </MessageActionButton>
                  {isLatestAssistant && (
                    <MessageActionButton
                      onPress={() => handleReloadResponse(msg.id)}
                      label={t('common.reload')}
                      disabled={reloadingMessageId === msg.id}
                    >
                      <ReloadIcon size={CHAT_THEME.actionIconSize} color={CHAT_THEME.actionIcon} />
                    </MessageActionButton>
                  )}
                </View>
              </View>
            );
          })}
          {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand600} />}
        </View>
      </ScrollView>

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.textInput}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.dark300}
          value={input}
          onChangeText={setInput}
          editable={!loading}
          multiline
          onKeyPress={handleKeyDown}
        />
        <TouchableOpacity
          style={[s.sendBtn, loading && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={s.sendBtnText}>{t('chat.send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark200,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  headerLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: CHAT_THEME.assistantLabel,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: CHAT_THEME.captureHeaderTitle,
  },
  roleTag: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: CHAT_THEME.assistantLabel,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  headerBtn: {
    borderWidth: 1,
    borderColor: CHAT_THEME.headerButtonBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: CHAT_THEME.headerButtonBg,
  },
  headerBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: CHAT_THEME.headerButtonText,
  },
  msgs: {
    flex: 1,
    backgroundColor: colors.white,
  },
  msgsContent: {
    padding: 16,
  },
  conversationCapture: {
    gap: 10,
  },
  conversationHeader: {
    backgroundColor: CHAT_THEME.captureHeaderBg,
    borderWidth: 1,
    borderColor: CHAT_THEME.captureHeaderBorder,
    padding: 12,
    gap: 2,
  },
  conversationHeaderLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: CHAT_THEME.captureHeaderLabel,
  },
  conversationHeaderTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: CHAT_THEME.captureHeaderTitle,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: CHAT_THEME.assistantLabel,
    marginTop: 32,
    lineHeight: 22,
  },
  msgShell: {
    gap: 6,
  },
  msgShellUser: {
    alignItems: 'flex-end',
  },
  msgShellAssistant: {
    alignItems: 'flex-start',
  },
  msg: {
    maxWidth: '88%',
    paddingHorizontal: CHAT_THEME.messagePaddingH,
    paddingVertical: CHAT_THEME.messagePaddingV,
    gap: 8,
    borderRadius: CHAT_THEME.messageRadius,
  },
  userMsg: {
    backgroundColor: CHAT_THEME.userBubbleBg,
    borderWidth: 1,
    borderColor: CHAT_THEME.userBubbleBorder,
  },
  asstMsg: {
    backgroundColor: CHAT_THEME.assistantBubbleBg,
    borderWidth: 1,
    borderColor: CHAT_THEME.assistantBubbleBorder,
    maxWidth: '92%',
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: CHAT_THEME.userText,
  },
  asstText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: CHAT_THEME.assistantText,
  },
  msgRole: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  msgRoleUser: {
    color: CHAT_THEME.userLabel,
  },
  msgRoleAssistant: {
    color: CHAT_THEME.assistantLabel,
  },
  msgActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CHAT_THEME.actionRowGap,
    paddingHorizontal: 2,
  },
  msgActionsUser: {
    alignSelf: 'flex-end',
  },
  msgActionsAssistant: {
    alignSelf: 'flex-start',
  },
  msgActionBtn: {
    borderWidth: 1,
    borderColor: CHAT_THEME.actionButtonBorder,
    width: CHAT_THEME.actionButtonSize,
    height: CHAT_THEME.actionButtonSize,
    borderRadius: CHAT_THEME.actionButtonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CHAT_THEME.actionButtonBg,
  },
  msgActionBtnPressed: {
    backgroundColor: CHAT_THEME.actionButtonBgActive,
    borderColor: CHAT_THEME.actionButtonBorderActive,
  },
  msgActionBtnDisabled: {
    opacity: 0.5,
  },
  msgReloading: {
    opacity: 0.72,
  },
  refList: {
    marginTop: 10,
    gap: 8,
  },
  codeWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: CHAT_THEME.codeBorder,
    backgroundColor: CHAT_THEME.codeBg,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_THEME.codeBorder,
  },
  codeLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: CHAT_THEME.codeLabel,
  },
  codeCopyBtn: {
    borderWidth: 1,
    borderColor: CHAT_THEME.codeButtonBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
  },
  codeCopyBtnText: {
    fontFamily: fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    color: CHAT_THEME.codeButtonText,
  },
  codeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: CHAT_THEME.assistantText,
  },
  refCard: {
    borderWidth: 1,
    borderColor: CHAT_THEME.refCardBorder,
    padding: 10,
    backgroundColor: CHAT_THEME.refCardBg,
  },
  refType: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: CHAT_THEME.refType,
  },
  refTitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: CHAT_THEME.refTitle,
    marginTop: 2,
  },
  refSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: CHAT_THEME.refSubtitle,
    marginTop: 2,
  },
  refActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  refBtn: {
    borderWidth: 1,
    borderColor: CHAT_THEME.refButtonBorder,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  refBtnText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: CHAT_THEME.refButtonText,
  },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: CHAT_THEME.inputBorder,
    backgroundColor: CHAT_THEME.inputBg,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: CHAT_THEME.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: CHAT_THEME.assistantText,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: colors.brand600,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#fff',
  },
});
