import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import {
  getActiveGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
} from '../services/geminiAiService';

export const AICoachScreen = () => {
  const theme = useAppTheme();
  const { aiChatHistory, sendAICoachQuery, profile } = useFitnessApp();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Gemini Settings Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasConfiguredKey, setHasConfiguredKey] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkActiveKey();
  }, []);

  const checkActiveKey = async () => {
    const k = await getActiveGeminiApiKey();
    setHasConfiguredKey(!!k && k.length > 5);
    if (k) setGeminiKeyInput(k);
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      await clearGeminiApiKey();
      setHasConfiguredKey(false);
      setShowKeyModal(false);
      Alert.alert('Key Removed', 'Using TitanAI default sports physiology engine.');
      return;
    }
    await saveGeminiApiKey(geminiKeyInput.trim());
    setHasConfiguredKey(true);
    setShowKeyModal(false);
    Alert.alert('Gemini Connected', 'Google Gemini API key saved. Real-time AI fitness reasoning is active!');
  };

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
    'Analyze my daily calorie & macro targets',
    'How to break through a strength plateau on bench press',
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
            <Text style={styles.aiAvatarText}>✨</Text>
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
              { color: isUser ? '#FFFFFF' : theme.text },
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
          <View style={[styles.onlineDot, { backgroundColor: hasConfiguredKey ? '#00E5FF' : theme.success }]} />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>TitanAI Fitness Coach</Text>
            <Text style={[styles.headerSub, { color: theme.muted }]}>
              Powered by Google Gemini AI · Sports Science
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            styles.modelBadge,
            { backgroundColor: hasConfiguredKey ? 'rgba(0, 229, 255, 0.15)' : theme.surfaceAlt },
          ]}
          onPress={() => setShowKeyModal(true)}
        >
          <Text style={[styles.modelBadgeText, { color: hasConfiguredKey ? '#00E5FF' : theme.accent }]}>
            {hasConfiguredKey ? '✨ GEMINI PRO' : '⚙️ SETUP KEY'}
          </Text>
        </TouchableOpacity>
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
              <Text style={[styles.typingText, { color: theme.muted }]}>
                Google Gemini is analyzing biomechanics...
              </Text>
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
          style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
          placeholder="Ask about workout splits, form, or macros..."
          placeholderTextColor={theme.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={300}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.sendBtn,
            { backgroundColor: inputText.trim() && !isTyping ? theme.primary : theme.borderSoft },
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Google Gemini API Key Configuration Modal */}
      <Modal visible={showKeyModal} transparent animationType="fade" onRequestClose={() => setShowKeyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>✨ Google Gemini AI Settings</Text>
              <TouchableOpacity onPress={() => setShowKeyModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.muted }]}>
              Enter your Google AI Studio API key below. TitanAI uses Gemini for sports science reasoning, routine optimization, and food photo identification (adapted from VitalPath).
            </Text>

            <TextInput
              style={[
                styles.keyTextInput,
                { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft },
              ]}
              placeholder="AIzaSy... (leave empty to use default)"
              placeholderTextColor={theme.muted}
              value={geminiKeyInput}
              onChangeText={setGeminiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: theme.borderSoft }]}
                onPress={() => {
                  setGeminiKeyInput('');
                }}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: theme.muted }]}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: theme.primary }]}
                onPress={handleSaveGeminiKey}
              >
                <Text style={styles.modalBtnPrimaryText}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modelBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatListContent: {
    padding: 16,
    gap: 12,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  userMsgWrapper: {
    justifyContent: 'flex-end',
  },
  aiMsgWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  aiAvatarText: {
    fontSize: 14,
  },
  msgBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 40,
  },
  typingText: {
    fontSize: 12,
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
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    padding: 4,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  keyTextInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnPrimary: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
