import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { AIChatMessage } from '../types/fitness';

export const AICoachScreen = () => {
  const theme = useAppTheme();
  const { aiChatHistory, sendAICoachQuery, profile } = useFitnessApp();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isTyping) return;

    setInputText('');
    setIsTyping(true);

    try {
      await sendAICoachQuery(textToSend);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('AI query error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const promptSuggestions = [
    `Generate full ${profile.fitnessGoal === 'weight_gain' ? 'Bulking' : 'Fat Loss'} weekly split`,
    'High protein meal ideas under 600 calories',
    'How to build bigger bicep peaks and arm thickness',
    'Best warm-up routine for heavy chest and shoulder day',
  ];

  const renderMessage = ({ item }: { item: AIChatMessage }) => {
    const isUser = item.sender === 'user';
    const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View
        style={[
          styles.msgWrapper,
          isUser ? styles.userMsgWrapper : styles.aiMsgWrapper,
        ]}
      >
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.aiAvatarText}>🤖</Text>
          </View>
        )}

        <View
          style={[
            styles.msgBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primary }]
              : [styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.borderSoft }],
          ]}
        >
          <Text
            style={[
              styles.msgText,
              { color: isUser ? '#ffffff' : theme.text },
            ]}
          >
            {item.text}
          </Text>

          <Text
            style={[
              styles.msgTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : theme.subtle },
            ]}
          >
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.onlineDot, { backgroundColor: theme.success }]} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>TitanAI Fitness Coach</Text>
            <Text style={[styles.headerSub, { color: theme.muted }]}>Powered by Groq High-Speed Llama 3</Text>
          </View>
        </View>

        <View style={[styles.modelBadge, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.modelBadgeText, { color: theme.accent }]}>PRO GYM AI</Text>
        </View>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={aiChatHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.typingText, { color: theme.muted }]}>TitanAI Coach is generating response...</Text>
            </View>
          ) : null
        }
      />

      {/* Suggested Prompts Pills */}
      <View style={styles.suggestionsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={promptSuggestions}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={styles.promptsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.promptPill, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
              onPress={() => handleSend(item)}
            >
              <Text style={[styles.promptPillText, { color: theme.text }]}>⚡ {item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.borderSoft }]}>
        <TextInput
          style={[styles.textInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
          placeholder="Ask workout advice, macros, form tips..."
          placeholderTextColor={theme.subtle}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.sendBtn, { backgroundColor: theme.primary }]}
          onPress={() => handleSend()}
          disabled={isTyping || !inputText.trim()}
        >
          <Text style={styles.sendBtnText}>➔</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  headerSub: {
    fontSize: 10,
    marginTop: 1,
  },
  modelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 20,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
    gap: 8,
  },
  userMsgWrapper: {
    justifyContent: 'flex-end',
  },
  aiMsgWrapper: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontSize: 14,
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingVertical: 8,
  },
  promptsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
});
