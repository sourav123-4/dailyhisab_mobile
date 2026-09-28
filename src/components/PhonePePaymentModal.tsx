import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
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
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { Transaction } from '../types';
import {
  launchUpiPayment,
  normalizePayeeUpi,
  UPI_APPS,
  UpiAppChoice,
} from '../services/upiService';
import {
  PhonePeContact,
  POPULAR_CONTACTS,
  searchPhonePeAccounts,
  parseUpiQrCode,
} from '../services/phonepeContacts';

// Safe CameraView import
let CameraView: any = null;
let useCameraPermissionsHook: any = null;
try {
  const expoCam = require('expo-camera');
  CameraView = expoCam.CameraView;
  useCameraPermissionsHook = expoCam.useCameraPermissions;
} catch (e) {
  // Graceful fallback
}

interface PhonePePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveTransaction: (tx: Transaction, toastMessage?: string) => void;
  categories: string[];
  currency?: string;
  defaultCategory?: string;
  transactions?: Transaction[];
}

export const PhonePePaymentModal = React.memo(function PhonePePaymentModal({
  visible,
  onClose,
  onSaveTransaction,
  categories = ['Food', 'Groceries', 'Shopping', 'Bills', 'Transport', 'General'],
  currency = '₹',
  defaultCategory,
  transactions = [],
}: PhonePePaymentModalProps) {
  const theme = useAppTheme();

  // Navigation steps: 'search' | 'qr_scan' | 'transfer' | 'waiting_return' | 'confirm_save'
  const [step, setStep] = useState<'search' | 'qr_scan' | 'transfer' | 'waiting_return' | 'confirm_save'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<PhonePeContact | null>(null);

  // Transfer form state
  const [amount, setAmount] = useState('');
  const [payeeUpi, setPayeeUpi] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Food');
  const [selectedApp, setSelectedApp] = useState<UpiAppChoice>('phonepe');

  // Pending transaction
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Camera permissions & QR Scanner state
  const [cameraPermission, requestCameraPermission] = useCameraPermissionsHook
    ? useCameraPermissionsHook()
    : [null, async () => ({ granted: false })];
  const [torchOn, setTorchOn] = useState(false);
  const [manualQrText, setManualQrText] = useState('');

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Track app state for auto-detecting return from PhonePe
  const waitingRef = useRef(false);
  waitingRef.current = step === 'waiting_return';

  // Laser scan line animation
  useEffect(() => {
    if (step === 'qr_scan') {
      const laserLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 200,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      laserLoop.start();
      return () => laserLoop.stop();
    }
  }, [step, laserAnim]);

  // Modal open reset
  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }).start();
    } else {
      setSearchQuery('');
      setSelectedContact(null);
      setAmount('');
      setPayeeUpi('');
      setPayeeName('');
      setNote('');
      setStep('search');
      setPendingTx(null);
      setIsLaunching(false);
      setTorchOn(false);
      setManualQrText('');
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
        setStep('confirm_save');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    return searchPhonePeAccounts(searchQuery, transactions);
  }, [searchQuery, transactions]);

  // Select Contact & Proceed to Transfer
  const handleSelectContact = (contact: PhonePeContact) => {
    setSelectedContact(contact);
    setPayeeUpi(contact.upiId);
    setPayeeName(contact.name);
    if (contact.category && categories.includes(contact.category)) {
      setCategory(contact.category);
    }
    setStep('transfer');
  };

  // QR Code scanned handler
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!data) return;
    const parsed = parseUpiQrCode(data);
    if (parsed && parsed.payeeUpi) {
      setPayeeUpi(parsed.payeeUpi);
      setPayeeName(parsed.payeeName);
      if (parsed.amount) {
        setAmount(String(parsed.amount));
      }
      if (parsed.note) {
        setNote(parsed.note);
      }
      setSelectedContact({
        id: `qr-${Date.now()}`,
        name: parsed.payeeName,
        phone: parsed.payeeUpi,
        upiId: parsed.payeeUpi,
        bankName: 'Verified QR Merchant',
        hasPhonePe: true,
        avatarColor: '#5f259f',
      });
      setStep('transfer');
    } else {
      Alert.alert('Invalid QR Code', 'This is not a recognized UPI payment QR code.');
    }
  };

  // Upload QR from Gallery
  const handlePickQrImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        // Fallback prompt for demo/image paste
        Alert.prompt
          ? Alert.prompt(
              'Scanned QR Image',
              'Enter the UPI ID or raw text from the selected QR:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Proceed',
                  onPress: (text?: string) => {
                    if (text) handleBarCodeScanned({ data: text });
                  },
                },
              ]
            )
          : Alert.alert('QR Image Selected', 'Point your camera at the QR code for instant auto-scan.');
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not pick image.');
    }
  };

  // Quick Amount add
  const handleQuickAddAmount = (addVal: number) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(cur + addVal));
  };

  // Initiate PhonePe Payment
  const handleInitiatePayment = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (!payeeUpi.trim()) {
      Alert.alert('Payee Required', 'Please enter a valid UPI ID or mobile number.');
      return;
    }

    const normalizedUpi = normalizePayeeUpi(payeeUpi);
    const finalTitle = payeeName.trim() || `Paid to ${normalizedUpi}`;
    const txRef = `DH${Date.now()}`;

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

      setStep('waiting_return');
      setIsLaunching(false);
    } catch (e: any) {
      setIsLaunching(false);
      Alert.alert('Error', e?.message || 'Failed to trigger UPI payment.');
    }
  };

  // Confirm and Save into DailyHisab
  const handleConfirmSave = () => {
    if (pendingTx) {
      onSaveTransaction(
        pendingTx,
        `${currency}${pendingTx.amount} paid via ${pendingTx.paymentMethod} saved to Hisab!`
      );
      onClose();
    }
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
            {/* Top PhonePe Purple Header */}
            <View style={styles.phonePeHeader}>
              <View style={styles.headerLeftCol}>
                <TouchableOpacity
                  onPress={() => {
                    if (step === 'transfer' || step === 'qr_scan') {
                      setStep('search');
                    } else {
                      onClose();
                    }
                  }}
                  style={styles.headerNavBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <AppIcon
                    name={step === 'search' || step === 'confirm_save' ? 'x' : 'chevron-left'}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.headerTitleText}>
                    {step === 'qr_scan'
                      ? 'Scan any QR Code'
                      : step === 'transfer'
                      ? 'Transfer Money'
                      : step === 'confirm_save'
                      ? 'Confirm & Save Hisab'
                      : 'To Mobile Number'}
                  </Text>
                  <Text style={styles.headerSubtitleText} numberOfLines={1}>
                    {step === 'qr_scan'
                      ? 'PhonePe, GPay, Paytm, BharatPe'
                      : step === 'transfer'
                      ? selectedContact?.upiId || payeeUpi
                      : 'Send money to any PhonePe or UPI account'}
                  </Text>
                </View>
              </View>

              {/* QR Button in Header */}
              {step !== 'qr_scan' && step !== 'confirm_save' && (
                <TouchableOpacity
                  style={styles.qrHeaderBtn}
                  onPress={() => setStep('qr_scan')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 16 }}>📷</Text>
                  <Text style={styles.qrHeaderBtnText}>Scan QR</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SCREEN 1: SEARCH & CONTACTS DIRECTORY */}
            {step === 'search' && (
              <View style={styles.contentWrap}>
                {/* Search Bar Input */}
                <View
                  style={[
                    styles.searchBarBox,
                    {
                      backgroundColor: theme.dark ? '#1a1033' : '#f8f5ff',
                      borderColor: '#7c3aed',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                  <TextInput
                    style={[styles.searchTextInput, { color: theme.text }]}
                    placeholder="Enter a mobile number or name"
                    placeholderTextColor={theme.subtle}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                  {searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                      <AppIcon name="x" size={16} color={theme.subtle} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setStep('qr_scan')} style={{ padding: 4 }}>
                      <Text style={{ fontSize: 16 }}>📷</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Subtitle / Category Label */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: theme.subtle }]}>
                    {searchQuery.trim().length > 0 ? 'SEARCH RESULTS' : 'RECENT PAYMENTS'}
                  </Text>
                  {searchQuery.trim().length === 0 && (
                    <TouchableOpacity onPress={() => setStep('qr_scan')}>
                      <Text style={styles.scanQrLinkText}>+ Scan QR</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Contacts List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 380 }}
                >
                  {searchResults.map((contact) => (
                    <TouchableOpacity
                      key={contact.id}
                      style={[
                        styles.contactCard,
                        {
                          backgroundColor: theme.surfaceAlt || (theme.dark ? '#181230' : '#ffffff'),
                          borderColor: theme.borderSoft || '#e2e8f0',
                        },
                      ]}
                      onPress={() => handleSelectContact(contact)}
                      activeOpacity={0.7}
                    >
                      {/* Avatar */}
                      <View
                        style={[
                          styles.contactAvatar,
                          { backgroundColor: contact.avatarColor || '#5f259f' },
                        ]}
                      >
                        <Text style={styles.avatarInitial}>
                          {contact.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Contact Details */}
                      <View style={styles.contactDetailsCol}>
                        <View style={styles.contactNameRow}>
                          <Text
                            style={[styles.contactNameText, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {contact.name}
                          </Text>
                        </View>

                        <Text style={[styles.contactUpiText, { color: theme.subtle }]} numberOfLines={1}>
                          +91 {contact.phone} • {contact.upiId}
                        </Text>

                        {/* PhonePe Verified Badge */}
                        <View style={styles.phonePeBadgeRow}>
                          <View style={styles.phonePeMiniBadge}>
                            <Text style={styles.phonePeMiniIcon}>🟣</Text>
                            <Text style={styles.phonePeMiniText}>Account on PhonePe</Text>
                          </View>
                          <Text style={[styles.bankNameText, { color: theme.subtle }]}>
                            • {contact.bankName}
                          </Text>
                        </View>
                      </View>

                      {/* Right Amount / Chevron */}
                      {contact.recentAmount ? (
                        <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
                          <Text style={[styles.recentAmountText, { color: theme.text }]}>
                            {currency}{contact.recentAmount}
                          </Text>
                          <Text style={[styles.recentDateText, { color: theme.subtle }]}>
                            {contact.recentDate}
                          </Text>
                        </View>
                      ) : (
                        <AppIcon name="chevron-right" size={16} color={theme.subtle} />
                      )}
                    </TouchableOpacity>
                  ))}

                  {searchResults.length === 0 && (
                    <View style={styles.noResultsBox}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                      <Text style={[styles.noResultsTitle, { color: theme.text }]}>
                        No account found
                      </Text>
                      <Text style={[styles.noResultsDesc, { color: theme.subtle }]}>
                        Enter a valid 10-digit mobile number or UPI ID (e.g. 9876543210 or user@ybl).
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* SCREEN 2: DEDICATED QR CODE SCANNER */}
            {step === 'qr_scan' && (
              <View style={styles.qrScannerContainer}>
                {CameraView ? (
                  <View style={styles.cameraBox}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      enableTorch={torchOn}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={handleBarCodeScanned}
                    />

                    {/* Translucent Dark Mask with Cutout Frame */}
                    <View style={styles.qrFrameOverlay}>
                      <View style={styles.scanTargetSquare}>
                        {/* Glowing Laser animation line */}
                        <Animated.View
                          style={[
                            styles.laserLine,
                            { transform: [{ translateY: laserAnim }] },
                          ]}
                        />
                        {/* 4 Corner Markers */}
                        <View style={[styles.cornerMarker, styles.cornerTL]} />
                        <View style={[styles.cornerMarker, styles.cornerTR]} />
                        <View style={[styles.cornerMarker, styles.cornerBL]} />
                        <View style={[styles.cornerMarker, styles.cornerBR]} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.cameraFallbackBox, { backgroundColor: '#0f0c1f' }]}>
                    <Text style={{ fontSize: 44, marginBottom: 10 }}>📷</Text>
                    <Text style={styles.fallbackTitle}>Scan Any UPI QR Code</Text>
                    <Text style={styles.fallbackSub}>
                      Point your phone's camera at any BharatPe, PhonePe, Paytm, or GPay QR code.
                    </Text>

                    <TextInput
                      style={styles.manualQrInput}
                      placeholder="Paste UPI Link or UPI ID here..."
                      placeholderTextColor="#94a3b8"
                      value={manualQrText}
                      onChangeText={setManualQrText}
                    />
                    <TouchableOpacity
                      style={styles.manualQrSubmitBtn}
                      onPress={() => handleBarCodeScanned({ data: manualQrText })}
                    >
                      <Text style={styles.manualQrSubmitText}>Verify & Proceed</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* QR Bottom Toolbar */}
                <View style={styles.qrToolbar}>
                  <TouchableOpacity
                    style={styles.qrToolBtn}
                    onPress={() => setTorchOn(!torchOn)}
                  >
                    <Text style={{ fontSize: 20 }}>{torchOn ? '🔦' : '💡'}</Text>
                    <Text style={styles.qrToolBtnText}>{torchOn ? 'Flash Off' : 'Flash On'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.qrToolBtn} onPress={handlePickQrImage}>
                    <Text style={{ fontSize: 20 }}>🖼️</Text>
                    <Text style={styles.qrToolBtnText}>Gallery QR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.qrToolBtn} onPress={() => setStep('search')}>
                    <Text style={{ fontSize: 20 }}>⌨️</Text>
                    <Text style={styles.qrToolBtnText}>Enter Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* SCREEN 3: TRANSFER / PAYMENT SCREEN */}
            {step === 'transfer' && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Recipient Profile Card */}
                <View style={styles.recipientHeaderCard}>
                  <View
                    style={[
                      styles.recipientAvatar,
                      { backgroundColor: selectedContact?.avatarColor || '#5f259f' },
                    ]}
                  >
                    <Text style={styles.recipientAvatarText}>
                      {(payeeName || payeeUpi).charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.recipientNameText, { color: theme.text }]} numberOfLines={1}>
                      {payeeName || 'Store'}
                    </Text>
                    <Text style={[styles.recipientUpiText, { color: theme.subtle }]}>
                      {payeeUpi}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '800' }}>
                        ✓ Banking Name: {payeeName || 'Verified Account'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Enter Amount ({currency})</Text>
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
                    {[100, 200, 500, 1000, 2000].map((val) => (
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
                          +{currency}{val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Add a Message / Note</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.surfaceAlt || (theme.dark ? '#1e1b4b' : '#f8fafc'),
                        borderColor: theme.borderSoft || theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="e.g. Dinner with team, Groceries..."
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

                {/* Giant Pay Button CTA */}
                <TouchableOpacity
                  style={[styles.payCtaBtn, { backgroundColor: '#5f259f' }]}
                  onPress={handleInitiatePayment}
                  disabled={isLaunching || !amount || parseFloat(amount) <= 0}
                  activeOpacity={0.8}
                >
                  <Text style={styles.payCtaIcon}>🟣</Text>
                  <Text style={styles.payCtaText}>
                    {isLaunching
                      ? 'Opening PhonePe...'
                      : `PROCEED TO PAY ${currency}${amount || '0'}`}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* SCREEN 4: WAITING RETURN */}
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
                  in PhonePe. When completed, switch back to DailyHisab to save it.
                </Text>

                <TouchableOpacity
                  style={[styles.confirmDoneBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => setStep('confirm_save')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmDoneText}>✓ I Have Completed the Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelReturnBtn}
                  onPress={() => setStep('transfer')}
                >
                  <Text style={[styles.cancelReturnText, { color: theme.subtle }]}>
                    Go Back / Edit Details
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SCREEN 5: CONFIRM & AUTO-SAVE */}
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
                </View>

                {/* Save CTA */}
                <TouchableOpacity
                  style={[styles.saveHisabCtaBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleConfirmSave}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveHisabCtaText}>💾 Yes, Save to My Hisab</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.notPaidBtn}
                  onPress={() => setStep('transfer')}
                >
                  <Text style={[styles.notPaidText, { color: theme.subtle }]}>
                    Payment Did Not Go Through / Edit
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  phonePeHeader: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerNavBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  qrHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  qrHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  contentWrap: {
    padding: 16,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scanQrLinkText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '800',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  contactDetailsCol: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactUpiText: {
    fontSize: 12,
    marginTop: 2,
  },
  phonePeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phonePeMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(95, 37, 159, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    gap: 3,
  },
  phonePeMiniIcon: {
    fontSize: 10,
  },
  phonePeMiniText: {
    color: '#5f259f',
    fontSize: 10,
    fontWeight: '800',
  },
  bankNameText: {
    fontSize: 10,
  },
  recentAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  recentDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  noResultsDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  qrScannerContainer: {
    height: 380,
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraBox: {
    flex: 1,
    overflow: 'hidden',
  },
  qrFrameOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetSquare: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  laserLine: {
    width: '100%',
    height: 3,
    backgroundColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  cornerMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#7c3aed',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  cameraFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  fallbackSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  manualQrInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#64748b',
    marginBottom: 10,
  },
  manualQrSubmitBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  manualQrSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  qrToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#110c22',
    paddingVertical: 12,
  },
  qrToolBtn: {
    alignItems: 'center',
    gap: 4,
  },
  qrToolBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 18,
  },
  recipientHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(95, 37, 159, 0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(95, 37, 159, 0.2)',
    marginBottom: 16,
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientAvatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  recipientNameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  recipientUpiText: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedRow: {
    marginTop: 3,
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
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
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
    paddingVertical: 26,
    paddingHorizontal: 16,
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
    padding: 18,
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
