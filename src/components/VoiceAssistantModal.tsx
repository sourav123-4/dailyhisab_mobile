import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { Transaction } from '../types';

interface VoiceAssistantModalProps {
  visible: boolean;
  isRecording: boolean;
  isTranscribing?: boolean;
  recordingDuration?: number;
  transcribedText?: string;
  parsedEntries?: Transaction[];
  currency?: string;
  onClose: () => void;
  onToggleRecording: () => void;
  onConfirmEntries?: (entries: Transaction[]) => void;
  onEditInHisab?: (text: string) => void;
  onResetVoice?: () => void;
  onSelectSuggestion?: (text: string) => void;
}

export const VoiceAssistantModal = React.memo(function VoiceAssistantModal({
  visible,
  isRecording,
  isTranscribing = false,
  recordingDuration = 0,
  transcribedText = '',
  parsedEntries = [],
  currency = '₹',
  onClose,
  onToggleRecording,
  onConfirmEntries,
  onEditInHisab,
  onResetVoice,
  onSelectSuggestion,
}: VoiceAssistantModalProps) {
  const theme = useAppTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Waveform equalizer bars animations
  const bar1 = useRef(new Animated.Value(8)).current;
  const bar2 = useRef(new Animated.Value(16)).current;
  const bar3 = useRef(new Animated.Value(24)).current;
  const bar4 = useRef(new Animated.Value(12)).current;
  const bar5 = useRef(new Animated.Value(20)).current;
  const bar6 = useRef(new Animated.Value(14)).current;
  const bar7 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible) {
      // Pulsing wave animation for radial microphone halo
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: isRecording ? 1.25 : 1.12,
            duration: isRecording ? 700 : 1300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: isRecording ? 700 : 1300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      // Subtle floating animation for category bubbles
      const float = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -6,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      float.start();

      return () => {
        pulse.stop();
        float.stop();
      };
    }
  }, [visible, isRecording, pulseAnim, floatAnim]);

  // Audio equalizer bars bouncing while recording
  useEffect(() => {
    if (isRecording) {
      const animateBar = (anim: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: max,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: min,
              duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
      };

      const a1 = animateBar(bar1, 6, 28, 300);
      const a2 = animateBar(bar2, 10, 36, 380);
      const a3 = animateBar(bar3, 12, 42, 260);
      const a4 = animateBar(bar4, 8, 32, 340);
      const a5 = animateBar(bar5, 12, 38, 290);
      const a6 = animateBar(bar6, 6, 30, 360);
      const a7 = animateBar(bar7, 8, 26, 420);

      a1.start();
      a2.start();
      a3.start();
      a4.start();
      a5.start();
      a6.start();
      a7.start();

      return () => {
        a1.stop();
        a2.stop();
        a3.stop();
        a4.stop();
        a5.stop();
        a6.stop();
        a7.stop();
      };
    }
  }, [isRecording, bar1, bar2, bar3, bar4, bar5, bar6, bar7]);

  if (!visible) return null;

  const hasResult = (parsedEntries && parsedEntries.length > 0) || (transcribedText && transcribedText.trim().length > 0 && !isRecording && !isTranscribing);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const categoryIconMap: Record<string, string> = {
    Food: 'food',
    Transport: 'transport',
    Bills: 'bills',
    Shopping: 'shopping',
    Entertainment: 'entertainment',
    Health: 'health',
    Investment: 'invest',
    Income: 'income',
    EMI: 'emi',
    Others: 'hisab',
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        {/* Main Card Container */}
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft || theme.border,
            },
          ]}
        >
          {/* Drag Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBadge, { backgroundColor: theme.dark ? '#312e81' : '#ede9fe' }]}>
                <AppIcon name="voice" size={16} color="#7c3aed" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Voice AI Assistant</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.dark ? '#1e293b' : '#f1f5f9' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeButtonText, { color: theme.subtle }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body Content based on State */}
          {hasResult ? (
            /* Result Preview Screen */
            <View style={styles.resultContainer}>
              <View style={[styles.speechQuoteBox, { backgroundColor: theme.dark ? '#1e1b4b' : '#f5f3ff', borderColor: theme.dark ? '#4338ca' : '#ddd6fe' }]}>
                <Text style={styles.speechQuoteLabel}>🎙️ Heard:</Text>
                <Text style={[styles.speechQuoteText, { color: theme.text }]} numberOfLines={3}>
                  "{transcribedText}"
                </Text>
              </View>

              {parsedEntries.length > 0 ? (
                <View style={styles.entriesSection}>
                  <Text style={[styles.entriesSectionTitle, { color: theme.muted }]}>
                    Recognized {parsedEntries.length} {parsedEntries.length === 1 ? 'Entry' : 'Entries'}:
                  </Text>
                  <ScrollView style={styles.entriesList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
                    {parsedEntries.map((entry, idx) => {
                      const isIncome = entry.type === 'income';
                      const isInvest = entry.type === 'investment';
                      const isEmi = entry.type === 'emi';
                      const badgeColor = isIncome ? '#10b981' : isInvest ? '#6366f1' : isEmi ? '#f59e0b' : '#ef4444';
                      const badgeBg = isIncome ? 'rgba(16,185,129,0.12)' : isInvest ? 'rgba(99,102,241,0.12)' : isEmi ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';

                      return (
                        <View
                          key={entry.id || idx}
                          style={[
                            styles.entryCard,
                            {
                              backgroundColor: theme.dark ? '#1e293b' : '#f8fafc',
                              borderColor: theme.borderSoft || theme.border,
                            },
                          ]}
                        >
                          <View style={[styles.entryIconBox, { backgroundColor: badgeBg }]}>
                            <AppIcon
                              name={categoryIconMap[entry.category] || 'hisab'}
                              size={18}
                              color={badgeColor}
                            />
                          </View>
                          <View style={styles.entryDetails}>
                            <Text style={[styles.entryTitle, { color: theme.text }]} numberOfLines={1}>
                              {entry.title}
                            </Text>
                            <View style={styles.entryMetaRow}>
                              <Text style={[styles.entryCategory, { color: theme.subtle }]}>
                                {entry.category}
                              </Text>
                              <Text style={[styles.entryBullet, { color: theme.subtle }]}>•</Text>
                              <Text style={[styles.entryMethod, { color: '#8b5cf6' }]}>
                                {entry.paymentMethod || 'UPI'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.entryAmountBox}>
                            <Text style={[styles.entryAmount, { color: badgeColor }]}>
                              {isIncome ? '+' : '-'}{currency}{entry.amount.toLocaleString('en-IN')}
                            </Text>
                            <View style={[styles.entryTypeTag, { backgroundColor: badgeBg }]}>
                              <Text style={[styles.entryTypeTagText, { color: badgeColor }]}>
                                {entry.type.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.noEntriesBox}>
                  <Text style={[styles.noEntriesText, { color: theme.subtle }]}>
                    Could not detect specific amount. You can edit the text in Hisab screen.
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.resultActions}>
                {parsedEntries.length > 0 && onConfirmEntries && (
                  <TouchableOpacity
                    style={[styles.primaryActionButton, { backgroundColor: '#7c3aed' }]}
                    onPress={() => onConfirmEntries(parsedEntries)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryActionButtonText}>
                      Add {parsedEntries.length > 1 ? `All (${parsedEntries.length}) to Hisab` : 'to Hisab'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.secondaryActionRow}>
                  {onEditInHisab && (
                    <TouchableOpacity
                      style={[
                        styles.secondaryActionButton,
                        {
                          borderColor: theme.borderSoft || theme.border,
                          backgroundColor: theme.dark ? '#1e293b' : '#ffffff',
                        },
                      ]}
                      onPress={() => onEditInHisab(transcribedText)}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="edit" size={14} color="#7c3aed" />
                      <Text style={[styles.secondaryActionButtonText, { color: theme.text }]}>
                        Edit in Hisab
                      </Text>
                    </TouchableOpacity>
                  )}

                  {onResetVoice && (
                    <TouchableOpacity
                      style={[
                        styles.secondaryActionButton,
                        {
                          borderColor: theme.borderSoft || theme.border,
                          backgroundColor: theme.dark ? '#1e293b' : '#ffffff',
                        },
                      ]}
                      onPress={onResetVoice}
                      activeOpacity={0.7}
                    >
                      <AppIcon name="refresh" size={14} color="#7c3aed" />
                      <Text style={[styles.secondaryActionButtonText, { color: theme.text }]}>
                        Speak Again
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ) : (
            /* Active Interactive Listening / Ready Screen */
            <View style={styles.interactiveArea}>
              {/* Floating Category Icon Bubbles */}
              {!isRecording && !isTranscribing && (
                <>
                  <Animated.View style={[styles.floatingBubble, styles.bubbleDoc, { transform: [{ translateY: floatAnim }] }]}>
                    <AppIcon name="hisab" size={16} color="#8b5cf6" />
                  </Animated.View>
                  <Animated.View style={[styles.floatingBubble, styles.bubbleCart, { transform: [{ translateY: floatAnim }] }]}>
                    <AppIcon name="shopping" size={16} color="#8b5cf6" />
                  </Animated.View>
                  <Animated.View style={[styles.floatingBubble, styles.bubbleHome, { transform: [{ translateY: floatAnim }] }]}>
                    <AppIcon name="food" size={16} color="#8b5cf6" />
                  </Animated.View>
                  <Animated.View style={[styles.floatingBubble, styles.bubbleCar, { transform: [{ translateY: floatAnim }] }]}>
                    <AppIcon name="transport" size={16} color="#8b5cf6" />
                  </Animated.View>
                </>
              )}

              {/* Pulsing Halo Rings */}
              <Animated.View
                style={[
                  styles.pulseRingOuter,
                  {
                    backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.25)' : 'rgba(139, 92, 246, 0.2)',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRingInner,
                  {
                    backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.38)' : 'rgba(139, 92, 246, 0.35)',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />

              {/* Central Glowing Microphone Button */}
              <TouchableOpacity
                onPress={onToggleRecording}
                disabled={isTranscribing}
                activeOpacity={0.85}
                style={[
                  styles.centerGlowingMicButton,
                  {
                    backgroundColor: isTranscribing ? '#4f46e5' : isRecording ? '#ef4444' : '#7c3aed',
                    shadowColor: isRecording ? '#ef4444' : '#7c3aed',
                  },
                ]}
              >
                {isTranscribing ? (
                  <ActivityIndicator color="#ffffff" size="large" />
                ) : (
                  <AppIcon name="voice" size={38} color="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Status Header / Timer */}
              {isRecording ? (
                <View style={styles.recordingTimerBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimerText}>{formatTimer(recordingDuration)}</Text>
                </View>
              ) : null}

              {/* Equalizer Sound Wave Bars when Recording */}
              {isRecording ? (
                <View style={styles.equalizerRow}>
                  <Animated.View style={[styles.equalizerBar, { height: bar1, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar2, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar3, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar4, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar5, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar6, backgroundColor: '#ef4444' }]} />
                  <Animated.View style={[styles.equalizerBar, { height: bar7, backgroundColor: '#ef4444' }]} />
                </View>
              ) : null}

              {/* Status Text Bubble */}
              <View
                style={[
                  styles.tooltipBubble,
                  {
                    backgroundColor: theme.dark ? '#1e293b' : '#f8fafc',
                    borderColor: theme.borderSoft || theme.border,
                  },
                ]}
              >
                <Text style={[styles.tooltipTitle, { color: theme.text }]}>
                  {isTranscribing
                    ? 'Transcribing with AI...'
                    : isRecording
                    ? 'Listening... Tap mic when done'
                    : 'Tap microphone to speak'}
                </Text>
                <Text style={[styles.tooltipSubtitle, { color: theme.subtle }]}>
                  {isTranscribing
                    ? 'Whisper & Groq AI are extracting transactions...'
                    : isRecording
                    ? 'Say: "Petrol 450 UPI" or "350 groceries cash"'
                    : 'Works in English, Hindi, and Bengali naturally'}
                </Text>
              </View>

              {/* Suggestion Chips when Idle */}
              {!isRecording && !isTranscribing && (
                <View style={styles.quickSuggestionsSection}>
                  <Text style={[styles.quickSuggestionsLabel, { color: theme.subtle }]}>Try saying:</Text>
                  <View style={styles.suggestionChipsWrap}>
                    {[
                      { text: 'Chai 20 cash', label: '☕ Chai ₹20 Cash' },
                      { text: 'Petrol 500 upi', label: '⛽ Petrol ₹500 UPI' },
                      { text: 'Groceries 350', label: '🛒 Groceries ₹350' },
                      { text: 'Salary 50000', label: '💼 Salary ₹50000' },
                    ].map((chip, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: theme.dark ? '#312e81' : '#ede9fe',
                            borderColor: theme.dark ? '#4338ca' : '#ddd6fe',
                          },
                        ]}
                        onPress={() => {
                          if (onSelectSuggestion) onSelectSuggestion(chip.text);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.suggestionChipText, { color: '#7c3aed' }]}>{chip.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  interactiveArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    top: 5,
  },
  pulseRingInner: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    top: 25,
  },
  centerGlowingMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
    zIndex: 10,
    marginVertical: 10,
  },
  recordingTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    gap: 6,
  },
  recordingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  recordingTimerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
    marginTop: 10,
  },
  equalizerBar: {
    width: 4,
    borderRadius: 2,
  },
  floatingBubble: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 5,
  },
  bubbleDoc: {
    top: 6,
    left: 24,
  },
  bubbleCart: {
    top: 6,
    right: 24,
  },
  bubbleHome: {
    top: 68,
    left: 8,
  },
  bubbleCar: {
    top: 68,
    right: 8,
  },
  tooltipBubble: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  tooltipTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  quickSuggestionsSection: {
    width: '100%',
    marginTop: 14,
    alignItems: 'center',
  },
  quickSuggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  suggestionChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultContainer: {
    width: '100%',
  },
  speechQuoteBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  speechQuoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  speechQuoteText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  entriesSection: {
    marginBottom: 14,
  },
  entriesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  entriesList: {
    maxHeight: 180,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entryDetails: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  entryCategory: {
    fontSize: 11,
    fontWeight: '500',
  },
  entryBullet: {
    fontSize: 10,
  },
  entryMethod: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryAmountBox: {
    alignItems: 'flex-end',
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  entryTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  entryTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  noEntriesBox: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEntriesText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  resultActions: {
    gap: 8,
    marginTop: 4,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
