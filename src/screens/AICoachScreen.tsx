import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from '../components/KeyboardAvoidingView';
import { useNavigation } from '@react-navigation/native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppMode } from '../navigation/AppModeContext';
import { useAppTheme } from '../theme/appTheme';
import { AIChatMessage } from '../types/fitness';
import {
  getActiveGeminiApiKey,
  isGeminiConfigured,
  saveGeminiApiKey,
  clearGeminiApiKey,
} from '../services/geminiAiService';
import { isAiProxyAvailable, transcribeAudioFile } from '../services/aiProxy';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as Speech from 'expo-speech';
import { ACTIVE_ENV } from '../config/active-env';

const COACH_STT_PROMPT = 'Fitness coach question: workout, sets, reps, bench press, squat, deadlift, protein, creatine, bulking, cutting, calories, macros, roti, dal, paneer, chicken, rest day';

// Speech reads plain sentences; drop markdown symbols and emoji so they are not spoken.
function toSpeakable(text: string) {
  return text
    .replace(/\*\*|\*|#+|`|_/g, '')
    .replace(/^[ \t]*[-•][ \t]+/gm, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3800);
}

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

// AI replies use **bold**, *italic* and leading "* " / "- " bullets; show them as formatting, not symbols.
function renderInlineMarkdown(text: string) {
  const normalized = text.replace(/^[ \t]*[*-][ \t]+/gm, '• ');
  return normalized.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <Text key={idx} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <Text key={idx} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    }
    return part;
  });
}

export const AICoachScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
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

  // Voice: speak a question, the coach answers in text and reads the answer aloud.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isListening) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isListening, pulse]);

  // Stop talking and recording when leaving the screen.
  useEffect(() => () => {
    Speech.stop();
    try {
      if (recorder.isRecording) recorder.stop();
    } catch { }
  }, [recorder]);

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const speakReply = (reply: string) => {
    const text = toSpeakable(reply);
    if (!text) return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'en-IN',
      rate: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const startListening = async () => {
    if (isTyping || isTranscribing) return;
    if (!isAiProxyAvailable()) {
      Alert.alert('Sign in needed', 'Voice questions need you to be signed in and online. You can still type your question.');
      return;
    }
    try {
      stopSpeaking();
      Keyboard.dismiss();
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access in your phone settings to ask by voice.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (e: any) {
      console.warn('Coach mic error:', e);
      Alert.alert('Microphone error', 'Could not start the microphone. Please try again.');
    }
  };

  const cancelListening = async () => {
    setIsListening(false);
    try {
      await recorder.stop();
    } catch { }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  };

  const finishListening = async () => {
    if (!isListening) return;
    const heldMs = recorderState.durationMillis || 0;
    setIsListening(false);
    setIsTranscribing(true);
    try {
      // Android's recorder fails to stop if it ran for under ~0.7s.
      if (heldMs < 700) await new Promise(r => setTimeout(r, 700 - heldMs));
      await recorder.stop();
      // Release the mic so the answer plays through the speaker at normal volume.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio was recorded.');
      const text = await transcribeAudioFile(uri, ACTIVE_ENV.GROQ_STT_MODEL || 'whisper-large-v3-turbo', COACH_STT_PROMPT);
      if (!text) throw new Error('No speech detected');
      setIsTranscribing(false);
      await handleSend(text, true);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/short|No speech|No audio/i.test(msg) || heldMs < 900) {
        Alert.alert("Didn't catch that", 'Hold on a second longer and speak clearly, then tap stop.');
      } else if (/Network/i.test(msg)) {
        Alert.alert('No connection', 'Could not reach the voice service. Check your internet and try again.');
      } else {
        Alert.alert('Voice', msg || 'Could not understand the recording. Please try again.');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    checkActiveKey();

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
      navigation.setOptions({ tabBarStyle: undefined });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  useEffect(() => {
    if (aiChatHistory.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [aiChatHistory.length]);

  const checkActiveKey = async () => {
    // Only a personal key is ever shown in the input; the app's key lives server-side.
    const k = await getActiveGeminiApiKey();
    setHasConfiguredKey(await isGeminiConfigured());
    if (k) setGeminiKeyInput(k);
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      await clearGeminiApiKey();
      setHasConfiguredKey(isAiProxyAvailable());
      setShowKeyModal(false);
      Alert.alert('Key Removed', 'Using TitanAI default sports physiology engine.');
      return;
    }
    await saveGeminiApiKey(geminiKeyInput.trim());
    setHasConfiguredKey(true);
    setShowKeyModal(false);
    Alert.alert('AI Engine Connected', 'TitanAI Engine API key saved. Real-time sports science intelligence is active!');
  };

  const handleSend = async (customText?: string, fromVoice = false) => {
    const messageToSend = customText || inputText;
    if (!messageToSend.trim() || isTyping) return;

    if (!fromVoice) setInputText('');
    setIsTyping(true);

    try {
      const reply = await sendAICoachQuery(messageToSend.trim());
      if (fromVoice && reply) speakReply(reply);
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
            {renderInlineMarkdown(item.text)}
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
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Toolbar under the shared TitanFit header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: 10 }]}>
        <View style={styles.headerBottomRow}>
          {isSpeaking ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={stopSpeaking}
              style={[styles.speakingPill, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
            >
              <Text style={[styles.speakingPillText, { color: theme.primary }]}>🔊 Speaking · Tap to stop</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.toolbarCaption, { color: theme.muted }]} numberOfLines={1}>Training, form & diet answers</Text>
          )}

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
                {hasConfiguredKey ? '⚙️ AI settings' : '⚙️ Set up AI'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.aiStatusBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: hasConfiguredKey ? '#10B981' : '#F59E0B' }]} />
              <Text style={[styles.aiStatusText, { color: theme.text }]}>{hasConfiguredKey ? 'AI online' : 'Offline tips'}</Text>
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
            // Clears the tab bar's raised Start button, which overlaps the bottom of this screen.
            paddingBottom: 38,
            marginBottom: 0,
          },
        ]}
      >
        {isListening || isTranscribing ? (
          <View style={[styles.listenBar, { backgroundColor: theme.surfaceAlt, borderColor: isListening ? '#EF4444' : theme.borderSoft }]}>
            {isListening ? (
              <>
                <Animated.View
                  style={[
                    styles.recDot,
                    { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] },
                  ]}
                />
                <Text style={[styles.listenText, { color: theme.text }]} numberOfLines={1}>
                  Listening… {Math.floor((recorderState.durationMillis || 0) / 1000)}s
                </Text>
                <TouchableOpacity onPress={cancelListening} hitSlop={10}>
                  <Text style={[styles.listenCancel, { color: theme.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.listenText, { color: theme.text }]}>Understanding your question…</Text>
              </>
            )}
          </View>
        ) : (
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
            placeholder="Ask TitanAI, or tap 🎤 to speak"
            placeholderTextColor={theme.muted}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => {
              setKeyboardVisible(true);
              navigation.setOptions({ tabBarStyle: { display: 'none' } });
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 120);
            }}
            multiline
            maxLength={300}
          />
        )}

        {inputText.trim() && !isListening && !isTranscribing ? (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.sendBtn, { backgroundColor: !isTyping ? theme.primary : theme.borderSoft }]}
            onPress={() => handleSend()}
            disabled={isTyping}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityLabel={isListening ? 'Stop and ask' : 'Ask by voice'}
            style={[styles.sendBtn, { backgroundColor: isListening ? '#EF4444' : isTyping || isTranscribing ? theme.borderSoft : theme.primary }]}
            onPress={isListening ? finishListening : startListening}
            disabled={isTyping || isTranscribing}
          >
            <Text style={styles.micBtnText}>{isListening ? '■' : '🎤'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI Intelligence Engine Key Modal */}
      <Modal visible={showKeyModal} transparent animationType="fade" onRequestClose={() => setShowKeyModal(false)} statusBarTranslucent navigationBarTranslucent>
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
  toolbarCaption: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    marginRight: 8,
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
  micBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  listenBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  listenText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  listenCancel: {
    fontSize: 13,
    fontWeight: '700',
  },
  speakingPill: {
    flexShrink: 1,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  speakingPillText: {
    fontSize: 11.5,
    fontWeight: '800',
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
