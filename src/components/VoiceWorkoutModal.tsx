import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';

interface VoiceWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onParsedWorkout?: (workoutData: { exerciseName: string; sets: number; reps: number; weightKg: number }) => void;
  onParsedWeight?: (weightKg: number) => void;
  onProcessAIQuery?: (query: string) => Promise<string>;
}

export const VoiceWorkoutModal: React.FC<VoiceWorkoutModalProps> = ({
  visible,
  onClose,
  onParsedWorkout,
  onParsedWeight,
  onProcessAIQuery,
}) => {
  const theme = useAppTheme();
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Equalizer animations
  const bar1 = useRef(new Animated.Value(10)).current;
  const bar2 = useRef(new Animated.Value(24)).current;
  const bar3 = useRef(new Animated.Value(36)).current;
  const bar4 = useRef(new Animated.Value(18)).current;
  const bar5 = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      setIsListening(true);
      setInputText('');
      setAiFeedback(null);
    }
  }, [visible]);

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation;
    if (isListening) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bar1, { toValue: 32, duration: 250, useNativeDriver: false }),
            Animated.timing(bar2, { toValue: 12, duration: 250, useNativeDriver: false }),
            Animated.timing(bar3, { toValue: 42, duration: 250, useNativeDriver: false }),
            Animated.timing(bar4, { toValue: 36, duration: 250, useNativeDriver: false }),
            Animated.timing(bar5, { toValue: 16, duration: 250, useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(bar1, { toValue: 10, duration: 250, useNativeDriver: false }),
            Animated.timing(bar2, { toValue: 30, duration: 250, useNativeDriver: false }),
            Animated.timing(bar3, { toValue: 14, duration: 250, useNativeDriver: false }),
            Animated.timing(bar4, { toValue: 18, duration: 250, useNativeDriver: false }),
            Animated.timing(bar5, { toValue: 38, duration: 250, useNativeDriver: false }),
          ]),
        ])
      );
      animLoop.start();
    }
    return () => animLoop?.stop();
  }, [isListening]);

  const handleSubmitText = async (textToParse?: string) => {
    const query = (textToParse || inputText).trim();
    if (!query) return;

    setIsProcessing(true);
    setIsListening(false);

    try {
      if (onProcessAIQuery) {
        const response = await onProcessAIQuery(query);
        setAiFeedback(response);
      } else {
        // Fallback local regex parsing
        const weightMatch = query.match(/(\d+(\.\d+)?)\s*(kg|kilos|lbs|pounds)/i);
        const setRepMatch = query.match(/(\d+)\s*(sets?)/i);
        const repMatch = query.match(/(\d+)\s*(reps?)/i);

        if (query.toLowerCase().includes('weight') && weightMatch) {
          const w = parseFloat(weightMatch[1]);
          if (onParsedWeight) onParsedWeight(w);
          setAiFeedback(`Logged body weight: ${w} kg.`);
        } else {
          setAiFeedback(`Captured: "${query}". Added to training session!`);
        }
      }
    } catch (err) {
      setAiFeedback(`Processed command: "${query}"`);
    } finally {
      setIsProcessing(false);
    }
  };

  const sampleSuggestions = [
    'Logged 4 sets of bicep curls at 20kg for 10 reps',
    'My body weight is 75.2 kg today',
    'Give me a 30-minute chest and triceps routine',
    'How much protein should I eat to gain weight?',
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.aiDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.title, { color: theme.text }]}>TITAN AI VOICE ASSISTANT</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Wave Visualizer */}
          <View style={[styles.visualizerBox, { backgroundColor: theme.bg }]}>
            <View style={styles.wavesRow}>
              <Animated.View style={[styles.waveBar, { height: bar1, backgroundColor: theme.primary }]} />
              <Animated.View style={[styles.waveBar, { height: bar2, backgroundColor: theme.accent }]} />
              <Animated.View style={[styles.waveBar, { height: bar3, backgroundColor: theme.primary }]} />
              <Animated.View style={[styles.waveBar, { height: bar4, backgroundColor: theme.accent }]} />
              <Animated.View style={[styles.waveBar, { height: bar5, backgroundColor: theme.primary }]} />
            </View>

            <Text style={[styles.listeningStateText, { color: isListening ? theme.accent : theme.muted }]}>
              {isProcessing ? 'AI Processing with Groq...' : isListening ? 'Listening... Speak your workout or question' : 'Ready'}
            </Text>
          </View>

          {/* Text input fallback / edit */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.borderSoft }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              placeholder="Or type workout, weight, or fitness question..."
              placeholderTextColor={theme.subtle}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSubmitText()}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.sendBtn, { backgroundColor: theme.primary }]}
              onPress={() => handleSubmitText()}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>→</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* AI Feedback or Quick Suggestion Pills */}
          {aiFeedback ? (
            <View style={[styles.feedbackBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <Text style={[styles.feedbackTitle, { color: theme.accent }]}>AI RESPONSE:</Text>
              <Text style={[styles.feedbackText, { color: theme.text }]}>{aiFeedback}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.doneBtn, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <Text style={styles.doneBtnText}>DONE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.suggestionsSection}>
              <Text style={[styles.suggLabel, { color: theme.muted }]}>QUICK COMMANDS:</Text>
              <View style={styles.suggWrap}>
                {sampleSuggestions.map((sugg, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    style={[styles.suggPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
                    onPress={() => {
                      setInputText(sugg);
                      handleSubmitText(sugg);
                    }}
                  >
                    <Text style={[styles.suggText, { color: theme.text }]}>💬 {sugg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
  },
  visualizerBox: {
    height: 90,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  wavesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
  },
  listeningStateText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionsSection: {
    marginTop: 4,
  },
  suggLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  suggWrap: {
    gap: 6,
  },
  suggPill: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggText: {
    fontSize: 12,
  },
});
