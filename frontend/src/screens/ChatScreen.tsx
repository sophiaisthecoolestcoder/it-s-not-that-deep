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
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { ROLE_LABELS } from '../types/auth';

// Inline highlight.js theme (github-style, brand-tinted)
const HIGHLIGHT_CSS = `
.hljs { background: #f6f2ee; color: #3a3a3a; padding: 0; }
.hljs-keyword, .hljs-selector-tag { color: #8B6A43; font-weight: 600; }
.hljs-string, .hljs-attr { color: #6d5234; }
.hljs-number, .hljs-literal { color: #b09570; }
.hljs-comment { color: #a5a6a6; font-style: italic; }
.hljs-title, .hljs-section { color: #503c26; font-weight: 600; }
.hljs-variable, .hljs-template-variable { color: #8B6A43; }
.hljs-built_in { color: #6d5234; }
.hljs-type { color: #b09570; }
`;

// Markdown component styles injected once into <head>
const MARKDOWN_CSS = `
.md-body { font-family: "Noto Sans", Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #3a3a3a; }
.md-body p { margin: 0 0 10px; }
.md-body p:last-child { margin-bottom: 0; }
.md-body h1, .md-body h2, .md-body h3, .md-body h4 {
  font-family: "Noto Serif", Georgia, serif;
  color: #6d5234;
  margin: 14px 0 6px;
  font-weight: 500;
  line-height: 1.3;
}
.md-body h1 { font-size: 20px; }
.md-body h2 { font-size: 17px; }
.md-body h3 { font-size: 15px; }
.md-body h4 { font-size: 14px; }
.md-body ul, .md-body ol { margin: 0 0 10px 0; padding-left: 22px; }
.md-body li { margin-bottom: 3px; }
.md-body li > p { margin: 0; }
.md-body strong { font-weight: 600; color: #3a3a3a; }
.md-body em { font-style: italic; }
.md-body del { text-decoration: line-through; color: #787978; }
.md-body blockquote {
  margin: 8px 0;
  padding: 8px 14px;
  border-left: 3px solid #C2A98C;
  background: #faf6f1;
  color: #535353;
  font-style: italic;
}
.md-body blockquote p { margin: 0; }
.md-body code {
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  background: #f6f2ee;
  border: 1px solid #EEE5DA;
  padding: 1px 5px;
  border-radius: 2px;
  color: #6d5234;
}
.md-body pre {
  background: #f6f2ee;
  border: 1px solid #EEE5DA;
  padding: 12px 14px;
  margin: 8px 0;
  overflow-x: auto;
  border-radius: 2px;
}
.md-body pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 12.5px;
  color: inherit;
}
.md-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 13px;
}
.md-body th {
  background: #faf0ea;
  border: 1px solid #EEE5DA;
  padding: 6px 10px;
  text-align: left;
  font-weight: 600;
  color: #6d5234;
}
.md-body td {
  border: 1px solid #EEE5DA;
  padding: 5px 10px;
}
.md-body tr:nth-child(even) td { background: #faf6f1; }
.md-body a { color: #8B6A43; text-decoration: underline; }
.md-body hr { border: none; border-top: 1px solid #EEE5DA; margin: 12px 0; }
.md-body input[type="checkbox"] { margin-right: 6px; }
`;

let cssInjected = false;
function injectStyles() {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = HIGHLIGHT_CSS + MARKDOWN_CSS;
  document.head.appendChild(style);
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function AssistantMessage({ content }: { content: string }) {
  if (Platform.OS !== 'web') {
    return <Text style={s.asstText}>{content}</Text>;
  }
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: `${Date.now()}`, role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    const q = input;
    setInput('');
    setLoading(true);

    api
      .askAssistant(q)
      .then((res) => {
        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-a`, role: 'assistant', content: res.answer },
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

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerLabel}>KI-Assistent</Text>
        <Text style={s.title}>Bleiche Knowledge Desk</Text>
        {user && (
          <Text style={s.roleTag}>
            {ROLE_LABELS[user.role]} · Aktive Datenabfrage
          </Text>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={s.msgs}
        contentContainerStyle={s.msgsContent}
      >
        {messages.length === 0 && (
          <Text style={s.empty}>
            Stellen Sie Fragen zu Anreisen, Gästen, Personal oder tagesaktuellen Daten.
          </Text>
        )}
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[s.msg, msg.role === 'user' ? s.userMsg : s.asstMsg]}
          >
            {msg.role === 'user' ? (
              <Text style={s.userText}>{msg.content}</Text>
            ) : (
              <AssistantMessage content={msg.content} />
            )}
          </View>
        ))}
        {loading && <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brand600} />}
      </ScrollView>

      {/* Input */}
      <View style={s.inputBar}>
        <TextInput
          style={s.textInput}
          placeholder="Anfrage eingeben… (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
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
          <Text style={s.sendBtnText}>Senden</Text>
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
    color: colors.dark400,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    color: colors.brand700,
  },
  roleTag: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.dark500,
  },
  msgs: {
    flex: 1,
    backgroundColor: colors.white,
  },
  msgsContent: {
    padding: 16,
    gap: 10,
  },
  empty: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.dark500,
    marginTop: 32,
    lineHeight: 22,
  },
  msg: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userMsg: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand600,
  },
  asstMsg: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.dark200,
    maxWidth: '92%',
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: '#fff',
  },
  asstText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark200,
    backgroundColor: colors.white,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
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
