import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppMode } from '../navigation/AppModeContext';
import { useAppTheme } from '../theme/appTheme';
import { AIChatMessage } from '../types/fitness';
import {
  getActiveGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
} from '../services/geminiAiService';

function TypingBubble({ theme }: { theme: any }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounce = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: -6,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(560 - delay),
        ])
      );

    const a1 = createBounce(dot1, 0);
    const a2 = createBounce(dot2, 160);
    const a3 = createBounce(dot3, 320);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.typingMessageWrapper}>
      <View style={[styles.aiAvatar, { backgroundColor: theme.primarySoft, borderColor: theme.primary, borderWidth: 1 }]}>
        <Text style={styles.aiAvatarText}>🤖</Text>
      </View>
      <View style={[styles.typingBubbleCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
        <View style={styles.typingDotsRow}>
          <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary, transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary, transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: theme.primary, transform: [{ translateY: dot3 }] }]} />
        </View>
        <Text style={[styles.typingStatusText, { color: theme.muted }]}>TitanAI is analyzing plan...</Text>
      </View>
    </View>
  );
}

export const AICoachScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const { aiChatHistory, sendAICoachQuery, profile } = useFitnessApp();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // AI Intelligence Settings Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [hasConfiguredKey, setHasConfiguredKey] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkActiveKey();

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (aiChatHistory.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [aiChatHistory.length]);

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
    Alert.alert('AI Engine Connected', 'TitanAI Engine API key saved. Real-time sports science intelligence is active!');
  };

  const handleSend = async (customText?: string) => {
    const messageToSend = customText || inputText;
    if (!messageToSend.trim() || isTyping) return;

    setInputText('');
    setIsTyping(true);

    try {
      await sendAICoachQuery(messageToSend.trim());
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.warn('AI Coach error:', e);
    } finally {
      setIsTyping(false);
    }
  };

  const promptSuggestions = [
    'Generate full Bulking weekly split',
    'High protein meal ideas for 80kg',
    'How to break Bench Press plateau',
    'Pre-workout creatine & hydration protocol',
  ];

  const renderMessage = ({ item }: { item: AIChatMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgWrapper, isUser ? styles.userMsgWrapper : styles.aiMsgWrapper]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: theme.primarySoft, borderColor: theme.primary, borderWidth: 1 }]}>
            <Text style={styles.aiAvatarText}>🤖</Text>
          </View>
        )}
        <View
          style={[
            styles.msgBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: theme.primary }]
              : [styles.aiBubble, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }],
          ]}
        >
          <Text style={[styles.msgText, { color: isUser ? '#FFFFFF' : theme.text }]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, { color: isUser ? 'rgba(255,255,255,0.7)' : theme.muted }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      {/* Clean Screen Header without Daily Hisab top row */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: theme.muted }]}>
              SPORTS SCIENCE & HYPERTROPHY
            </Text>
            <Text style={[styles.mainHeading, { color: theme.text }]}>TitanAI Coach</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={[
                styles.modelBadge,
                { backgroundColor: hasConfiguredKey ? 'rgba(0, 229, 255, 0.18)' : theme.surfaceAlt, borderColor: '#00E5FF', borderWidth: hasConfiguredKey ? 1 : 0 },
              ]}
              onPress={() => setShowKeyModal(true)}
            >
              <Text style={[styles.modelBadgeText, { color: hasConfiguredKey ? '#00E5FF' : theme.accent, fontWeight: '800' }]}>
                {hasConfiguredKey ? '✨ PRO AI' : '⚙️ AI KEY'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.aiStatusBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.aiStatusText, { color: theme.text }]}>AI Active</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={aiChatHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chatListContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          isTyping ? <TypingBubble theme={theme} /> : null
        }
      />

      {/* Suggested Prompts Pills (compact when typing) */}
      {!isKeyboardVisible && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
      )}

      {/* Input Bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.borderSoft,
            paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 10),
            marginBottom: Platform.OS === 'android' && keyboardHeight > 0 ? keyboardHeight + 48 : 0,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
          placeholder="Ask TitanAI about workout splits, form, or macros..."
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

      {/* AI Intelligence Engine Key Modal */}
      <Modal visible={showKeyModal} transparent animationType="fade" onRequestClose={() => setShowKeyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>✨ TitanAI Intelligence Settings</Text>
              <TouchableOpacity onPress={() => setShowKeyModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.muted }]}>
              Enter your AI Intelligence API key below. TitanAI uses sports science reasoning for routine optimization, nutrition tracking, and kinematic analysis.
            </Text>

            <TextInput
              style={[
                styles.keyTextInput,
                { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft },
              ]}
              placeholder="Enter API key... (or leave empty for default)"
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  aiStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
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
  typingMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  typingBubbleCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 14,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  typingStatusText: {
    fontSize: 11.5,
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
