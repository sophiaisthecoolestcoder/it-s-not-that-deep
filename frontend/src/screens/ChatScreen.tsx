import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { colors, typography } from '../theme';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    api.askAssistant(currentInput)
      .then((response) => {
        const assistantMessage: Message = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: response.answer,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
      })
      .catch((error) => {
        const errorMessage: Message = {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setLoading(false);
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Assistant</Text>
        <Text style={styles.title}>Bleiche Knowledge Desk</Text>
        <Text style={styles.subtitle}>Guest and staff insights with live data lookup</Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <Text style={styles.emptyState}>
            Ask about arrivals, nationality filters, staff roles, and guest notes.
          </Text>
        ) : null}
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[styles.message, msg.role === 'user' ? styles.userMessage : styles.assistantMessage]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
              ]}
            >
              {msg.content}
            </Text>
          </View>
        ))}
        {loading ? <ActivityIndicator style={styles.loader} color={colors.forest} /> : null}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your request..."
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          <Text style={styles.sendButtonText}>Senden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.dark200,
    marginBottom: 10,
  },
  headerLabel: {
    ...typography.label,
    color: colors.dark400,
    marginBottom: 6,
  },
  title: {
    ...typography.h2,
    color: colors.brand700,
    marginBottom: 6,
  },
  subtitle: {
    ...typography.caption,
    color: colors.dark500,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.dark200,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyState: {
    ...typography.body,
    color: colors.dark500,
    textAlign: 'left',
    marginTop: 40,
  },
  message: {
    marginBottom: 12,
    maxWidth: '92%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand600,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dark200,
  },
  messageText: {
    ...typography.body,
  },
  userMessageText: {
    color: 'white',
  },
  assistantMessageText: {
    color: colors.textPrimary,
  },
  loader: {
    marginVertical: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.dark200,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.dark300,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.brand600,
    borderRadius: 0,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.brand600,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    ...typography.button,
    color: 'white',
  },
});
