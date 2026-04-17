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
        <Text style={styles.title}>Bleiche Assistant</Text>
        <Text style={styles.subtitle}>Ask about guests or employees</Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.length === 0 ? (
          <Text style={styles.emptyState}>
            Ask me anything about guests or employees at Bleiche Resort & Spa.
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
          placeholder="Ask a question..."
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
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    ...typography.h2,
    color: colors.forest,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  message: {
    marginBottom: 12,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.forest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.forest,
    borderRadius: 20,
    paddingHorizontal: 24,
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
