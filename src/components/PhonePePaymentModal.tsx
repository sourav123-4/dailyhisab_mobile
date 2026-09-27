import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { Transaction } from '../types';
import {
  buildUpiUrl,
  launchUpiPayment,
  normalizePayeeUpi,
  POPULAR_UPI_HANDLES,
  UPI_APPS,
  UpiAppChoice,
} from '../services/upiService';

interface PhonePePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Transaction, toastMessage?: string) => void;
  categories: string[];
  currency?: string;
  defaultCategory?: string;
}

export const PhonePePaymentModal = React.memo(function PhonePePaymentModal({
  visible,
  onClose,
  onSaveTransaction,
  categories = ['Food', 'Groceries', 'Shopping', 'Bills', 'Transport', 'General'],
  currency = '₹',
  defaultCategory,
}: PhonePePaymentModalProps) {
  const theme = useAppTheme();

  // Form states
  const [amount, setAmount] = useState('');
  const [payeeUpi, setPayeeUpi] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Food');
  const [selectedApp, setSelectedApp] = useState<UpiAppChoice>('phonepe');

  // Flow states: 'input' -> 'waiting_return' -> 'confirm_save'
  const [step, setStep] = useState<'input' | 'waiting_return' | 'confirm_save'>('input');
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track app state for auto-detecting return from PhonePe
  const waitingRef = useRef(false);
  waitingRef.current = step === 'waiting_return';

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset state on close
      setAmount('');
      setPayeeUpi('');
      setPayeeName('');
      setNote('');
      setStep('input');
      setPendingTx(null);
      setIsLaunching(false);
    }
  }, [visible, scaleAnim]);

  // Pulse animation for confirmation checkmark
  useEffect(() => {
    if (step === 'confirm_save') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [step, pulseAnim]);

  // Listen to AppState (active -> background -> active)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && waitingRef.current) {
        // User came back from PhonePe or UPI app!
        setStep('confirm_save');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + addValue));
  };

  const handleAppendHandle = (handle: string) => {
    if (!payeeUpi) return;
    const cleanBase = payeeUpi.split('@')[0];
    setPayeeUpi(`${cleanBase}${handle}`);
  };

  const handleInitiatePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to pay.');
      return;
    }

    if (!payeeUpi.trim()) {
      Alert.alert('Payee Required', 'Please enter a UPI ID or 10-digit mobile number.');
      return;
    }

    const normalizedUpi = normalizePayeeUpi(payeeUpi);
    const finalTitle = payeeName.trim() || `Paid to ${normalizedUpi}`;
    const txRef = `DH${Date.now()}`;

    // Construct transaction payload
    const newTx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: new Date().toISOString().slice(0, 10),
      title: finalTitle,
      amount: numAmount,
      category: category || 'Food',
      type: 'expense',
      paymentMethod: selectedApp === 'phonepe' ? 'PhonePe UPI' : `${selectedApp.toUpperCase()} UPI`,
      notes: note.trim() ? `${note.trim()} (UPI Ref: ${txRef})` : `UPI Ref: ${txRef}`,
    };

    setPendingTx(newTx);
    setIsLaunching(true);

    try {
      const res = await launchUpiPayment({
        payeeUpi: normalizedUpi,
        payeeName: payeeName.trim() || 'Store',
        amount: numAmount,
        note: note.trim() || 'DailyHisab Payment',
        category,
        app: selectedApp,
        transactionRef: txRef,
      });

      if (!res.success) {
        Alert.alert(
          'Could not open payment app',
          res.error || 'Please make sure PhonePe or a UPI app is installed on your device.'
        );
        setIsLaunching(false);
        return;
      }

      // App opened successfully -> switch to waiting state
      setStep('waiting_return');
      setIsLaunching(false);
    } catch (e: any) {
      setIsLaunching(false);
      Alert.alert('Error', e?.message || 'Failed to trigger UPI payment.');
    }
  };

  const handleConfirmSave = () => {
    if (pendingTx) {
      onSaveTransaction(
        pendingTx,
        `${currency}${pendingTx.amount} paid via ${pendingTx.paymentMethod} saved to Hisab!`
      );
      onClose();
    }
  };

  const handleManualReturnConfirm = () => {
    setStep('confirm_save');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Header with PhonePe branding banner */}
            <View style={styles.phonePeBanner}>
              <View style={styles.bannerRow}>
                <View style={styles.phonePeIconCircle}>
                  <Text style={styles.phonePeIconText}>🟣</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.bannerTitle}>
                    {step === 'confirm_save' ? 'Confirm & Save Hisab' : 'Pay with PhonePe / UPI'}
                  </Text>
                  <Text style={styles.bannerSubtitle}>
                    {step === 'confirm_save'
                      ? 'Payment finished? Add to your daily accounts'
                      : 'Fast UPI payment with automatic expense recording'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AppIcon name="x" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'input' && (
                <>
                  {/* Amount Input */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Amount to Pay ({currency})
                    </Text>
                    <View
                      style={[
                        styles.amountInputRow,
                        {
                          backgroundColor: theme.dark ? '#1a1033' : '#f9f5ff',
                          borderColor: '#7c3aed',
                        },
                      ]}
                    >
                      <Text style={[styles.currencySymbol, { color: '#7c3aed' }]}>{currency}</Text>
                      <TextInput
                        style={[styles.amountTextInput, { color: theme.text }]}
                        placeholder="0"
                        placeholderTextColor={theme.subtle}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={setAmount}
                        autoFocus
                      />
                    </View>

                    {/* Quick Amount Suggestion Chips */}
                    <View style={styles.quickChipsRow}>
                      {[50, 100, 200, 500, 1000].map((val) => (
                        <TouchableOpacity
                          key={val}
                          style={[
                            styles.quickChip,
                            {
                              backgroundColor: theme.dark ? '#271c47' : '#ede9fe',
                              borderColor: theme.dark ? '#4c3580' : '#ddd6fe',
                            },
                          ]}
                          onPress={() => handleQuickAddAmount(val)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.quickChipText, { color: '#7c3aed' }]}>
                            +{currency}
                            {val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Payee UPI ID / Mobile */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Receiver UPI ID or 10-Digit Mobile
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f8fafc'),
                          borderColor: theme.borderSoft || theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="e.g. 9876543210 or store@ybl"
                      placeholderTextColor={theme.subtle}
                      value={payeeUpi}
                      onChangeText={setPayeeUpi}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    {/* Quick Handle Suffix Chips */}
                    {payeeUpi.length > 0 && !payeeUpi.includes('@') && (
                      <View style={styles.quickHandlesRow}>
                        <Text style={[styles.handleHelpText, { color: theme.subtle }]}>Add handle:</Text>
                        {POPULAR_UPI_HANDLES.map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[
                              styles.handleChip,
                              {
                                backgroundColor: theme.dark ? '#221643' : '#f3e8ff',
                                borderColor: '#c084fc',
                              },
                            ]}
                            onPress={() => handleAppendHandle(h)}
                          >
                            <Text style={styles.handleChipText}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Payee / Merchant Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>
                      Payee / Store Name (Optional)
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f8fafc'),
                          borderColor: theme.borderSoft || theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="e.g. Grocery Store, Tea Stall, Auto"
                      placeholderTextColor={theme.subtle}
                      value={payeeName}
                      onChangeText={setPayeeName}
                    />
                  </View>

                  {/* Category Selector */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}
                    >
                      {categories.map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            onPress={() => setCategory(cat)}
                            style={[
                              styles.catChip,
                              {
                                backgroundColor: isSelected
                                  ? '#7c3aed'
                                  : theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f1f5f9'),
                                borderColor: isSelected
                                  ? '#6d28d9'
                                  : theme.borderSoft || theme.border,
                              },
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.catChipText,
                                { color: isSelected ? '#ffffff' : theme.text },
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Note / Remarks */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Note (Optional)</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f8fafc'),
                          borderColor: theme.borderSoft || theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="e.g. Milk & bread, dinner split"
                      placeholderTextColor={theme.subtle}
                      value={note}
                      onChangeText={setNote}
                    />
                  </View>

                  {/* Choose UPI App */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.text }]}>Pay via App</Text>
                    <View style={styles.appsGrid}>
                      {UPI_APPS.map((appOpt) => {
                        const isChosen = selectedApp === appOpt.id;
                        return (
                          <TouchableOpacity
                            key={appOpt.id}
                            style={[
                              styles.appChoiceCard,
                              {
                                backgroundColor: isChosen
                                  ? theme.dark
                                    ? '#2b1b4d'
                                    : '#f3e8ff'
                                  : theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f8fafc'),
                                borderColor: isChosen
                                  ? appOpt.color
                                  : theme.borderSoft || theme.border,
                              },
                            ]}
                            onPress={() => setSelectedApp(appOpt.id)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.appIconText}>{appOpt.icon}</Text>
                            <Text
                              style={[
                                styles.appNameText,
                                {
                                  color: isChosen ? appOpt.color : theme.text,
                                  fontWeight: isChosen ? '700' : '500',
                                },
                              ]}
                            >
                              {appOpt.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Pay Button CTA */}
                  <TouchableOpacity
                    style={[styles.payCtaBtn, { backgroundColor: '#5f259f' }]}
                    onPress={handleInitiatePayment}
                    disabled={isLaunching || !amount || !payeeUpi}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payCtaIcon}>🟣</Text>
                    <Text style={styles.payCtaText}>
                      {isLaunching
                        ? 'Opening PhonePe...'
                        : `Open PhonePe & Pay ${currency}${amount || '0'}`}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* STEP 2: Waiting for Return */}
              {step === 'waiting_return' && (
                <View style={styles.waitingContainer}>
                  <View style={styles.waitingIconCircle}>
                    <Text style={{ fontSize: 36 }}>⏳</Text>
                  </View>
                  <Text style={[styles.waitingTitle, { color: theme.text }]}>
                    Waiting for PhonePe Payment...
                  </Text>
                  <Text style={[styles.waitingDesc, { color: theme.subtle }]}>
                    Please approve the payment of{' '}
                    <Text style={{ fontWeight: '700', color: '#7c3aed' }}>
                      {currency}
                      {pendingTx?.amount}
                    </Text>{' '}
                    in your PhonePe app. Once done, switch back to DailyHisab to save it.
                  </Text>

                  <TouchableOpacity
                    style={[styles.confirmDoneBtn, { backgroundColor: '#10b981' }]}
                    onPress={handleManualReturnConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmDoneText}>✓ I Have Completed the Payment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelReturnBtn}
                    onPress={() => setStep('input')}
                  >
                    <Text style={[styles.cancelReturnText, { color: theme.subtle }]}>
                      Go Back / Edit Details
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Confirm & Auto-Save to Hisab */}
              {step === 'confirm_save' && pendingTx && (
                <View style={styles.confirmSaveContainer}>
                  <Animated.View
                    style={[
                      styles.successCheckCircle,
                      {
                        backgroundColor: '#10b981',
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  >
                    <AppIcon name="check" size={32} color="#ffffff" />
                  </Animated.View>

                  <Text style={[styles.confirmHeading, { color: theme.text }]}>
                    Payment Completed?
                  </Text>
                  <Text style={[styles.confirmSubheading, { color: theme.subtle }]}>
                    Save this expense into your DailyHisab ledger:
                  </Text>

                  {/* Summary Card */}
                  <View
                    style={[
                      styles.summaryCard,
                      {
                        backgroundColor: theme.dark ? '#1a1033' : '#fbf8ff',
                        borderColor: '#ddd6fe',
                      },
                    ]}
                  >
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.subtle }]}>Amount</Text>
                      <Text style={[styles.summaryAmount, { color: '#ef4444' }]}>
                        -{currency}
                        {pendingTx.amount}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.subtle }]}>To</Text>
                      <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>
                        {pendingTx.title}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.subtle }]}>Category</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{pendingTx.category}</Text>
                      </View>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.subtle }]}>Method</Text>
                      <Text style={[styles.summaryValue, { color: '#7c3aed', fontWeight: '700' }]}>
                        {pendingTx.paymentMethod}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.subtle }]}>Date</Text>
                      <Text style={[styles.summaryValue, { color: theme.text }]}>
                        {pendingTx.date}
                      </Text>
                    </View>
                  </View>

                  {/* Save CTA */}
                  <TouchableOpacity
                    style={[styles.saveHisabCtaBtn, { backgroundColor: '#10b981' }]}
                    onPress={handleConfirmSave}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveHisabCtaText}>💾 Yes, Save to My Hisab</Text>
                  </TouchableOpacity>

                  {/* Cancel / Edit */}
                  <TouchableOpacity
                    style={styles.notPaidBtn}
                    onPress={() => {
                      setStep('input');
                    }}
                  >
                    <Text style={[styles.notPaidText, { color: theme.subtle }]}>
                      Payment Did Not Go Through / Edit
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  phonePeBanner: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phonePeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  phonePeIconText: {
    fontSize: 20,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  bannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContent: {
    padding: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 6,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    paddingVertical: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  quickHandlesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  handleHelpText: {
    fontSize: 11,
    marginRight: 2,
  },
  handleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  handleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  appsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  appChoiceCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  appIconText: {
    fontSize: 18,
    marginBottom: 4,
  },
  appNameText: {
    fontSize: 11,
  },
  payCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payCtaIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  payCtaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  waitingIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  confirmDoneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmDoneText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelReturnBtn: {
    paddingVertical: 8,
  },
  cancelReturnText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  confirmSaveContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  successCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmHeading: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  confirmSubheading: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#7c3aed',
    fontSize: 11,
    fontWeight: '700',
  },
  saveHisabCtaBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveHisabCtaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  notPaidBtn: {
    paddingVertical: 6,
  },
  notPaidText: {
    fontSize: 12,
  },
});
