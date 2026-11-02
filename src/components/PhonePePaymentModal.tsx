import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from './KeyboardAvoidingView';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { UpiQrCode } from './UpiQrCode';
import { Transaction } from '../types';
import {
  buildUpiPaymentUri,
  copyUpiIdAndOpenApp,
  isMerchantUpiUri,
  launchUpiUri,
  normalizePayeeUpi,
  POPULAR_UPI_HANDLES,
  UPI_APPS,
  UpiAppChoice,
  validateUpiPayment,
  withAmountIfMissing,
} from '../services/upiService';
import {
  PhonePeContact,
  searchPhonePeAccounts,
  extractUpiContactsFromTransactions,
  parseUpiQrCode,
  getBankNameFromUpi,
} from '../services/phonepeContacts';
import { localDateISO } from '../utils/date';
import * as Clipboard from 'expo-clipboard';
import { useSheetBottomPadding } from './useSheetBottomPadding';

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
  const sheetBottomPadding = useSheetBottomPadding();
  // "Rs 150" needs a space; "₹150" does not.
  const currencyPrefix = /[a-z]$/i.test(currency) ? `${currency} ` : currency;

  // Navigation steps: 'search' | 'qr_scan' | 'transfer' | 'show_qr' | 'waiting_return' | 'confirm_save'
  const [step, setStep] = useState<'search' | 'qr_scan' | 'transfer' | 'show_qr' | 'waiting_return' | 'confirm_save'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<PhonePeContact | null>(null);

  // Transfer form state
  const [amount, setAmount] = useState('');
  const [payeeUpi, setPayeeUpi] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Food');
  const [selectedApp, setSelectedApp] = useState<UpiAppChoice>('phonepe');

  // Pending transaction
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  // The scanned QR text, kept verbatim: merchant QRs only pay when forwarded unchanged.
  const [scannedQrUri, setScannedQrUri] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<'success' | 'submitted' | 'unknown'>('unknown');
  const awaitingUpiResultRef = useRef(false);

  // Camera permissions & QR Scanner state
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  // Track app state for auto-detecting return from PhonePe/UPI app
  const waitingRef = useRef(false);
  waitingRef.current = step === 'waiting_return';

  // Request camera permission when entering qr_scan
  useEffect(() => {
    if (step === 'qr_scan') {
      setScanned(false);
      if (!cameraPermission?.granted) {
        requestCameraPermission();
      }
    }
  }, [step, cameraPermission?.granted]);

  // Laser scan line animation (active ONLY during qr_scan to save CPU & battery)
  useEffect(() => {
    if (step === 'qr_scan' && cameraPermission?.granted) {
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
  }, [step, cameraPermission?.granted, laserAnim]);

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
      setIsEditingUpi(false);
      setNote('');
      setStep('search');
      setPendingTx(null);
      setIsLaunching(false);
      setScannedQrUri(null);
      setPaymentResult('unknown');
      setTorchOn(false);
      setScanned(false);
    }
  }, [visible, scaleAnim]);

  // Pulse animation for confirmation checkmark
  useEffect(() => {
    if (step === 'confirm_save') {
      const pulseLoop = Animated.loop(
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
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [step, pulseAnim]);

  // Detect when user returns from external UPI app
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && waitingRef.current && !awaitingUpiResultRef.current) {
        setStep('confirm_save');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Performance Optimization: Extract ledger contacts ONLY when transactions change
  const ledgerContacts = useMemo(() => {
    return extractUpiContactsFromTransactions(transactions);
  }, [transactions]);

  // Fast In-Memory Search (runs in < 0.2ms with zero UI lag)
  const { results: searchResults, isSearching, hasLedgerHistory } = useMemo(() => {
    return searchPhonePeAccounts(searchQuery, ledgerContacts);
  }, [searchQuery, ledgerContacts]);

  // Select contact handler
  const handleSelectContact = (contact: PhonePeContact) => {
    setSelectedContact(contact);
    setScannedQrUri(null);
    setPayeeUpi(contact.upiId);
    setPayeeName(contact.name);
    setIsEditingUpi(false);
    if (contact.category) {
      setCategory(contact.category);
    }
    setStep('transfer');
  };

  // QR Code scanned handler
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!data || scanned) return;
    setScanned(true);

    const parsed = parseUpiQrCode(data);
    if (parsed && parsed.payeeUpi) {
      setScannedQrUri(/^upi:\/\/pay\?/i.test(data.trim()) ? data.trim() : null);
      setPayeeUpi(parsed.payeeUpi);
      setPayeeName(parsed.payeeName);
      setIsEditingUpi(false);
      if (parsed.amount) {
        setAmount(String(parsed.amount));
      }
      if (parsed.note) {
        setNote(parsed.note);
      }
      setSelectedContact({
        id: `qr-${Date.now()}`,
        name: parsed.payeeName,
        phone: /^\d{10}$/.test(parsed.payeeUpi.split('@')[0]) ? parsed.payeeUpi.split('@')[0] : '',
        upiId: parsed.payeeUpi,
        bankName: getBankNameFromUpi(parsed.payeeUpi),
        hasPhonePe: /@(ybl|ibl|axl)$/i.test(parsed.payeeUpi),
        avatarColor: '#5f259f',
      });
      setStep('transfer');
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This is not a recognized UPI payment QR code.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
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
        const imageUri = res.assets[0].uri;
        try {
          const scanResults = await scanFromURLAsync(imageUri, ['qr']);
          if (scanResults && scanResults.length > 0 && scanResults[0].data) {
            handleBarCodeScanned({ data: scanResults[0].data });
            return;
          }
        } catch (e) {
          // Native barcode scanning fallback
        }

        // Fallback prompt if image barcode wasn't detected automatically
        Alert.prompt
          ? Alert.prompt(
              'UPI QR Code',
              'Could not auto-read QR. Please paste or enter the UPI ID / Link:',
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
          : Alert.alert('QR Not Detected', 'Please point camera directly at the QR code or enter UPI ID manually.');
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not pick image.');
    }
  };

  // Quick Amount chips (+100, +200, +500, +1000, +2000)
  const handleQuickAddAmount = (addVal: number) => {
    const currentNum = parseFloat(amount) || 0;
    setAmount(String(currentNum + addVal));
  };

  // Change UPI Handle suffix (@ybl, @okaxis, @paytm, etc.)
  const handleSelectUpiSuffix = (suffix: string) => {
    const base = payeeUpi.includes('@') ? payeeUpi.split('@')[0] : payeeUpi;
    const newUpi = `${base}${suffix}`;
    setPayeeUpi(newUpi);

    // Auto switch app if matching suffix
    if (suffix === '@ybl' || suffix === '@ibl' || suffix === '@axl') {
      setSelectedApp('phonepe');
    } else if (suffix.startsWith('@ok')) {
      setSelectedApp('gpay');
    } else if (suffix === '@paytm') {
      setSelectedApp('paytm');
    } else if (suffix === '@upi') {
      setSelectedApp('bhim');
    }
  };

  const selectedAppName = UPI_APPS.find(a => a.id === selectedApp)?.name || 'UPI app';
  // Editing the payee after a scan means this is no longer that merchant's QR.
  const isMerchantPayment = Boolean(
    scannedQrUri && isMerchantUpiUri(scannedQrUri) && parseUpiQrCode(scannedQrUri)?.payeeUpi === normalizePayeeUpi(payeeUpi)
  );

  const buildPendingTx = (method: string, numAmount: number, normalizedUpi: string): Transaction => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: localDateISO(),
    title: payeeName.trim() || `Paid to ${normalizedUpi}`,
    amount: numAmount,
    category: category || 'Food',
    type: 'expense',
    paymentMethod: method,
    // UPI ID kept in notes so the payee shows up in contact search next time
    notes: `UPI: ${normalizedUpi}${note.trim() ? ' | ' + note.trim() : ''}`,
  });

  const handleProceedToPay = async () => {
    // A merchant QR with a printed amount is paid for exactly that amount.
    const fixedQrAmount = isMerchantPayment ? parseUpiQrCode(scannedQrUri!)?.amount : undefined;
    const numAmount = fixedQrAmount || parseFloat(amount);
    const problem = validateUpiPayment({ payeeUpi, amount: numAmount });
    if (problem) {
      Alert.alert('Check payment details', problem);
      return;
    }
    const normalizedUpi = normalizePayeeUpi(payeeUpi);

    if (!isMerchantPayment) {
      // Person-to-person: UPI apps block pre-filled links from other apps, so hand over the UPI ID.
      setPendingTx(buildPendingTx(`${selectedAppName} Payment`, numAmount, normalizedUpi));
      const opened = await copyUpiIdAndOpenApp(normalizedUpi, selectedApp);
      setStep('waiting_return');
      if (!opened) {
        Alert.alert('UPI ID copied', `Open ${selectedApp === 'generic' ? 'your UPI app' : selectedAppName}, choose "Pay to UPI ID / mobile number", paste the ID and pay ${currencyPrefix}${numAmount}.`);
      }
      return;
    }

    setPendingTx(buildPendingTx('UPI Merchant Payment', numAmount, normalizedUpi));
    setIsLaunching(true);
    awaitingUpiResultRef.current = true;
    setStep('waiting_return');
    try {
      const result = await launchUpiUri(withAmountIfMissing(scannedQrUri!, numAmount));
      if (!result.opened) {
        Alert.alert('No UPI app found', 'Install PhonePe, Google Pay, Paytm or another UPI app to pay this QR.');
        setStep('transfer');
        return;
      }
      if (result.status === 'failure') {
        Alert.alert('Payment not completed', 'The UPI app reported that the payment failed or was cancelled. No money was saved to your Hisab.');
        setStep('transfer');
        return;
      }
      setPaymentResult(result.status);
      setStep('confirm_save');
    } finally {
      awaitingUpiResultRef.current = false;
      setIsLaunching(false);
    }
  };

  const handleCopyUpiAndOpenApp = async () => {
    const normalizedUpi = normalizePayeeUpi(payeeUpi);
    if (!normalizedUpi) return;
    const opened = await copyUpiIdAndOpenApp(normalizedUpi, selectedApp);
    if (!opened) {
      Alert.alert('UPI ID copied', `${normalizedUpi} is on your clipboard. Open your UPI app and paste it to pay.`);
    }
  };

  // UPI payment URI encoded into the QR on-device; payment details never leave the phone
  const qrPaymentError = useMemo(
    () => validateUpiPayment({ payeeUpi, amount: parseFloat(amount) }),
    [payeeUpi, amount]
  );
  const qrPaymentUri = useMemo(() => {
    if (qrPaymentError) return '';
    return buildUpiPaymentUri({
      payeeUpi: normalizePayeeUpi(payeeUpi),
      payeeName: payeeName.trim() || 'Payee',
      amount: parseFloat(amount),
      note: note.trim() || (category || 'Payment'),
    });
  }, [qrPaymentError, payeeUpi, payeeName, amount, note, category]);

  // Confirm and Save into DailyHisab
  const handleConfirmSave = () => {
    if (pendingTx) {
      onSaveTransaction(
        pendingTx,
        `${currencyPrefix}${pendingTx.amount} paid via ${pendingTx.paymentMethod} saved to Hisab!`
      );
      onClose();
    }
  };

  // Header arrow and Android back step back through the flow instead of discarding it.
  const handleBack = () => {
    if (step === 'show_qr' || step === 'waiting_return') {
      setStep('transfer');
    } else if (step === 'transfer' || step === 'qr_scan') {
      setStep('search');
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleBack}
      statusBarTranslucent navigationBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardContainer}
        >
          <Animated.View
            style={[
              styles.modalCard,
              {
                paddingBottom: sheetBottomPadding, backgroundColor: theme.surface,
                borderColor: theme.borderSoft || theme.border,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Top PhonePe Purple Header */}
            <View style={styles.phonePeHeader}>
              <View style={styles.headerLeftCol}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppIcon
                    name={step === 'transfer' || step === 'qr_scan' || step === 'show_qr' ? 'arrow-left' : 'x'}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.headerTitleText}>
                    {step === 'qr_scan'
                      ? 'Scan any QR Code'
                      : step === 'show_qr'
                      ? 'Scan QR to Pay'
                      : step === 'transfer'
                      ? 'Pay with UPI'
                      : step === 'confirm_save'
                      ? 'Save to Hisab'
                      : step === 'waiting_return'
                      ? 'Finish in your UPI app'
                      : 'Send Money via UPI'}
                  </Text>
                  <Text style={styles.headerSubtitleText} numberOfLines={1}>
                    {step === 'qr_scan'
                      ? 'PhonePe, GPay, Paytm, BharatPe, BHIM'
                      : step === 'show_qr'
                      ? (payeeName || payeeUpi)
                      : step === 'transfer'
                      ? selectedContact?.upiId || payeeUpi
                      : step === 'confirm_save' || step === 'waiting_return'
                      ? `${currencyPrefix}${amount || '0'} to ${payeeName || normalizePayeeUpi(payeeUpi)}`
                      : 'Pay any mobile number or UPI ID'}
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
                    placeholder="Enter mobile number, UPI ID, or name"
                    placeholderTextColor={theme.subtle}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
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
                    {isSearching
                      ? 'SEARCH RESULTS'
                      : hasLedgerHistory
                      ? 'RECENT UPI TRANSFERS'
                      : 'PAY ANYONE'}
                  </Text>
                  {!isSearching && (
                    <TouchableOpacity onPress={() => setStep('qr_scan')}>
                      <Text style={styles.scanQrLinkText}>📷 Scan Any QR</Text>
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
                          {contact.phone && !contact.upiId.startsWith(contact.phone) ? `+91 ${contact.phone} • ` : ''}{contact.upiId}
                        </Text>

                        {/* UPI handle badge: describes the ID's provider, never claims it was verified */}
                        <View style={styles.phonePeBadgeRow}>
                          <View style={styles.phonePeMiniBadge}>
                            <Text style={styles.phonePeMiniIcon}>{contact.isGuess ? '⚠️' : '🟣'}</Text>
                            <Text style={styles.phonePeMiniText}>
                              {contact.isGuess ? 'Not verified' : contact.hasPhonePe ? 'PhonePe UPI ID' : 'UPI ID'}
                            </Text>
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
                            {currencyPrefix}{contact.recentAmount}
                          </Text>
                          {contact.recentDate && (
                            <Text style={[styles.recentDateText, { color: theme.subtle }]}>
                              {contact.recentDate}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.chevronBox}>
                          <AppIcon name="chevron-right" size={16} color={theme.subtle} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}

                  {searchResults.length === 0 && (
                    <View style={styles.noResultsBox}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                      <Text style={[styles.noResultsTitle, { color: theme.text }]}>
                        {isSearching ? 'No contacts found' : 'No UPI payments yet'}
                      </Text>
                      <Text style={[styles.noResultsDesc, { color: theme.subtle }]}>
                        {isSearching
                          ? 'Enter a 10-digit mobile number or a UPI ID such as name@okaxis.'
                          : 'Search a mobile number or UPI ID above, or scan a QR code. People you pay will appear here.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* SCREEN 2: DEDICATED QR CODE SCANNER */}
            {step === 'qr_scan' && (
              <View style={styles.qrScannerContainer}>
                {!cameraPermission?.granted ? (
                  <View style={styles.permissionBox}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>📷</Text>
                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                    <Text style={styles.permissionSub}>
                      Allow DailyHisab camera access to scan any PhonePe, Google Pay, Paytm, or BharatPe QR code.
                    </Text>

                    <TouchableOpacity
                      style={styles.permissionBtn}
                      onPress={() => requestCameraPermission()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.permissionBtnText}>Enable Camera</Text>
                    </TouchableOpacity>

                    <View style={styles.permissionFallbackRow}>
                      <TouchableOpacity
                        style={styles.permSubBtn}
                        onPress={handlePickQrImage}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.permSubBtnText}>🖼️ Upload from Gallery</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.permSubBtn}
                        onPress={() => setStep('search')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.permSubBtnText}>⌨️ Enter UPI ID</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.cameraBox}>
                    <CameraView
                      style={StyleSheet.absoluteFill}
                      facing="back"
                      enableTorch={torchOn}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
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
                      <Text style={styles.qrGuideText}>Align any UPI QR code inside the box</Text>
                    </View>
                  </View>
                )}

                {/* QR Bottom Toolbar */}
                <View style={styles.qrToolbar}>
                  <TouchableOpacity
                    style={styles.qrToolBtn}
                    onPress={() => setTorchOn(!torchOn)}
                    disabled={!cameraPermission?.granted}
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
                      {payeeName || 'Payee'}
                    </Text>

                    {isEditingUpi ? (
                      <TextInput
                        style={[
                          styles.editUpiInput,
                          {
                            color: theme.text,
                            backgroundColor: theme.dark ? '#110c22' : '#ffffff',
                            borderColor: '#7c3aed',
                          },
                        ]}
                        value={payeeUpi}
                        onChangeText={setPayeeUpi}
                        placeholder="user@bank"
                        placeholderTextColor={theme.subtle}
                        autoFocus
                        onBlur={() => setIsEditingUpi(false)}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => setIsEditingUpi(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      >
                        <Text style={[styles.recipientUpiText, { color: '#7c3aed' }]}>
                          {payeeUpi}
                        </Text>
                        <Text style={{ fontSize: 12 }}>✏️</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.verifiedRow}>
                      <Text style={{ fontSize: 11, color: theme.subtle, fontWeight: '700' }}>
                        {getBankNameFromUpi(payeeUpi)} · check the name your UPI app shows before paying
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => setStep('search')}
                    style={styles.changePayeeBtn}
                  >
                    <Text style={styles.changePayeeText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick UPI Handle Selector Chips */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.inputLabel, { color: theme.subtle, fontSize: 11 }]}>
                    QUICK UPI SUFFIX
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 4 }}>
                    {POPULAR_UPI_HANDLES.map((suffix) => {
                      const isActive = payeeUpi.toLowerCase().endsWith(suffix.toLowerCase());
                      return (
                        <TouchableOpacity
                          key={suffix}
                          onPress={() => handleSelectUpiSuffix(suffix)}
                          style={[
                            styles.suffixChip,
                            {
                              backgroundColor: isActive ? '#5f259f' : (theme.dark ? '#1f1638' : '#f1f5f9'),
                              borderColor: isActive ? '#5f259f' : (theme.borderSoft || '#cbd5e1'),
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.suffixChipText, { color: isActive ? '#ffffff' : theme.text }]}>
                            {suffix}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
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
                    <Text style={[styles.currencySymbol, { color: '#7c3aed' }]}>{currencyPrefix}</Text>
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
                          +{currencyPrefix}{val}
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
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: isSelected
                                ? '#5f259f'
                                : theme.dark
                                ? '#1e1b2e'
                                : '#f1f5f9',
                              borderColor: isSelected ? '#5f259f' : theme.borderSoft || '#cbd5e1',
                            },
                          ]}
                          onPress={() => setCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
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

                {/* Note / Message Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Add a Note (Optional)</Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: theme.dark ? '#1a1033' : '#f8fafc',
                        color: theme.text,
                        borderColor: theme.borderSoft || '#cbd5e1',
                      },
                    ]}
                    placeholder="e.g. Chai, Groceries, Dinner split"
                    placeholderTextColor={theme.subtle}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {/* UPI Application Selector (6 Apps 3x2 Grid) */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Select Payment App</Text>
                  <View style={styles.upiAppsGrid}>
                    {UPI_APPS.map((appOpt) => {
                      const isSelected = selectedApp === appOpt.id;
                      return (
                        <TouchableOpacity
                          key={appOpt.id}
                          style={[
                            styles.upiAppCardGrid,
                            {
                              backgroundColor: isSelected ? appOpt.bgColor : (theme.dark ? '#181230' : '#f8fafc'),
                              borderColor: isSelected ? appOpt.color : (theme.borderSoft || '#e2e8f0'),
                              borderWidth: isSelected ? 2 : 1,
                            },
                          ]}
                          onPress={() => setSelectedApp(appOpt.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 22 }}>{appOpt.icon}</Text>
                          <Text
                            style={[
                              styles.upiAppName,
                              { color: isSelected ? appOpt.color : theme.text },
                            ]}
                            numberOfLines={1}
                          >
                            {appOpt.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.selectedCheckCircle, { backgroundColor: appOpt.color }]}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Big Proceed To Pay Button */}
                <TouchableOpacity
                  style={[
                    styles.proceedPayBtn,
                    { opacity: isLaunching || !amount.trim() ? 0.7 : 1 },
                  ]}
                  onPress={handleProceedToPay}
                  disabled={isLaunching || !amount.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.proceedPayBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    {isLaunching
                      ? 'OPENING PAYMENT APP...'
                      : isMerchantPayment
                      ? `PAY ${amount ? currencyPrefix + amount : ''}`
                      : selectedApp === 'generic'
                      ? 'COPY UPI ID & PAY'
                      : `COPY UPI ID & OPEN ${selectedAppName.toUpperCase()}`}
                  </Text>
                  <AppIcon name="arrow-right" size={18} color="#ffffff" />
                </TouchableOpacity>

                {/* Alternate 1-Tap Options: Show QR or Copy & Open App */}
                <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 10 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.dark ? '#221938' : '#ede9fe',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#7c3aed',
                    }}
                    onPress={() => {
                      if (qrPaymentError) {
                        Alert.alert('Check payment details', qrPaymentError);
                        return;
                      }
                      setStep('show_qr');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>📷</Text>
                    <Text style={{ color: theme.dark ? '#c4b5fd' : '#5b21b6', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      Show QR Code
                    </Text>
                    <Text style={{ color: theme.subtle, fontSize: 10, textAlign: 'center' }}>
                      Scan with any UPI app
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: theme.dark ? '#1c1c28' : '#f1f5f9',
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.borderSoft || '#cbd5e1',
                    }}
                    onPress={async () => {
                      const copied = normalizePayeeUpi(payeeUpi);
                      if (!copied) return;
                      await Clipboard.setStringAsync(copied).catch(() => undefined);
                      Alert.alert('UPI ID copied', copied);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 16, marginBottom: 2 }}>📋</Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                      Copy UPI ID
                    </Text>
                    <Text style={{ color: theme.subtle, fontSize: 10, textAlign: 'center' }}>
                      Paste in any UPI app
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Hint Notice */}
                <View style={styles.securityNoticeRow}>
                  <Text style={styles.securityNoticeIcon}>🔒</Text>
                  <Text style={[styles.securityNoticeText, { color: theme.subtle }]}>
                    {isMerchantPayment
                      ? 'You approve the payment inside your UPI app. DailyHisab reads the result and offers to save it to your ledger.'
                      : `UPI apps block pre-filled payments to people from other apps, so DailyHisab copies the UPI ID and opens ${selectedApp === 'generic' ? 'your UPI app' : selectedAppName}. Paste it there, enter ${amount ? currencyPrefix + amount : 'the amount'} and pay.`}
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* SCREEN: SHOW DYNAMIC UPI QR CODE */}
            {step === 'show_qr' && (
              <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20 }}>
                <View style={{
                  backgroundColor: '#ffffff',
                  padding: 16,
                  borderRadius: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 5,
                  alignItems: 'center',
                }}>
                  <UpiQrCode
                    value={qrPaymentUri}
                    size={220}
                    accessibilityLabel={`UPI QR code to pay ${currencyPrefix}${amount} to ${payeeName || normalizePayeeUpi(payeeUpi)}`}
                  />
                  <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '700', color: '#1e1b4b' }}>
                    Scan with PhonePe, GPay, or Paytm
                  </Text>
                </View>

                <View style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: theme.text }}>
                    {currencyPrefix}{amount || '0'}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.subtle, marginTop: 2 }}>
                    Paying to: <Text style={{ fontWeight: '600', color: theme.text }}>{payeeName || payeeUpi}</Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.subtle, marginTop: 2 }}>
                    UPI: {normalizePayeeUpi(payeeUpi)}
                  </Text>
                </View>

                <View style={{
                  backgroundColor: theme.dark ? 'rgba(95, 37, 159, 0.15)' : '#f3e8ff',
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 16,
                  width: '100%',
                }}>
                  <Text style={{ fontSize: 12, color: theme.dark ? '#d8b4fe' : '#581c87', lineHeight: 16, textAlign: 'center' }}>
                    💡 <Text style={{ fontWeight: '700' }}>Pay by scanning:</Text> scan this screen from another phone, or save a screenshot and open it from the gallery in PhonePe or Google Pay.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.manualReturnBtn, { width: '100%', marginTop: 16 }]}
                  onPress={() => {
                    const normalizedUpi = normalizePayeeUpi(payeeUpi);
                    const newTx: Transaction = {
                      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                      date: localDateISO(),
                      title: payeeName.trim() || `Paid to ${normalizedUpi}`,
                      amount: parseFloat(amount) || 0,
                      category: category || 'Food',
                      type: 'expense',
                      paymentMethod: 'UPI QR Payment',
                      notes: `UPI: ${normalizedUpi}${note.trim() ? ' | ' + note.trim() : ''}`,
                    };
                    setPendingTx(newTx);
                    setStep('confirm_save');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualReturnBtnText}>
                    I Have Paid → Save to Hisab
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14 }}
                  onPress={() => setStep('transfer')}
                >
                  <Text style={{ color: theme.subtle, fontSize: 13, fontWeight: '600' }}>
                    ← Back to Options
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* SCREEN 4: WAITING FOR RETURN FROM UPI APP */}
            {step === 'waiting_return' && (
              <View style={styles.waitingContainer}>
                <View style={styles.waitingCircle}>
                  <Text style={{ fontSize: 42 }}>{isMerchantPayment ? '🟣' : '📋'}</Text>
                </View>
                <Text style={[styles.waitingTitle, { color: theme.text }]}>
                  {isMerchantPayment ? 'Payment in progress' : 'UPI ID copied'}
                </Text>
                <Text style={[styles.waitingDesc, { color: theme.subtle }]}>
                  {isMerchantPayment
                    ? 'Complete the payment in your UPI app. You will come back here automatically.'
                    : 'Finish the payment in your UPI app, then come back to save it.'}
                </Text>

                {!isMerchantPayment && (
                  <View style={{
                    backgroundColor: theme.dark ? '#1c152e' : '#f5f3ff',
                    borderRadius: 10,
                    padding: 12,
                    marginVertical: 12,
                    width: '100%',
                    borderWidth: 1,
                    borderColor: theme.dark ? '#3b2063' : '#e9d5ff',
                  }}>
                    <Text style={{ color: theme.dark ? '#c4b5fd' : '#6b21a8', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                      In {selectedApp === 'generic' ? 'your UPI app' : selectedAppName}:
                    </Text>
                    <Text style={{ color: theme.text, fontSize: 12, lineHeight: 18 }}>
                      1. Tap "To Mobile Number" / "Pay UPI ID"{'\n'}
                      2. Paste <Text style={{ fontWeight: '800' }}>{normalizePayeeUpi(payeeUpi)}</Text>{'\n'}
                      3. Check the name, enter {currencyPrefix}{amount || '0'} and pay
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#5f259f',
                        borderRadius: 8,
                        paddingVertical: 9,
                        marginTop: 10,
                      }}
                      onPress={handleCopyUpiAndOpenApp}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                        📋 Copy again & open {selectedApp === 'generic' ? 'app' : selectedAppName}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.manualReturnBtn}
                  onPress={() => setStep('confirm_save')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualReturnBtnText}>
                    I Have Paid → Save to Hisab
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14 }}
                  onPress={() => setStep('transfer')}
                >
                  <Text style={{ color: theme.subtle, fontSize: 13, fontWeight: '600' }}>
                    Cancel & Return
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SCREEN 5: CONFIRM & AUTO-SAVE TRANSACTION */}
            {step === 'confirm_save' && (
              <View style={styles.confirmContainer}>
                <Animated.View
                  style={[
                    styles.successBadge,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Text style={{ fontSize: 36 }}>{paymentResult === 'success' ? '✅' : '🧾'}</Text>
                </Animated.View>

                <Text style={[styles.confirmTitle, { color: theme.text }]}>
                  {paymentResult === 'success'
                    ? 'Payment successful'
                    : paymentResult === 'submitted'
                    ? 'Payment submitted'
                    : 'Did the payment go through?'}
                </Text>
                <Text style={[styles.confirmSubtitle, { color: theme.subtle }]}>
                  {paymentResult === 'success'
                    ? 'Your UPI app confirmed it. Save it to your DailyHisab ledger:'
                    : paymentResult === 'submitted'
                    ? 'Your bank is still processing it. Save it now or check your UPI app first:'
                    : 'Save it only if your UPI app showed the payment as successful:'}
                </Text>

                {pendingTx && (
                  <View
                    style={[
                      styles.receiptCard,
                      {
                        backgroundColor: theme.dark ? '#1a1033' : '#f9f5ff',
                        borderColor: '#7c3aed',
                      },
                    ]}
                  >
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: theme.subtle }]}>Amount</Text>
                      <Text style={styles.receiptAmount}>
                        {currencyPrefix}{pendingTx.amount}
                      </Text>
                    </View>

                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: theme.subtle }]}>Payee</Text>
                      <Text style={[styles.receiptVal, { color: theme.text }]} numberOfLines={1}>
                        {pendingTx.title}
                      </Text>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: theme.subtle }]}>Category</Text>
                      <Text style={[styles.receiptVal, { color: theme.text }]}>
                        {pendingTx.category}
                      </Text>
                    </View>

                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: theme.subtle }]}>Method</Text>
                      <Text style={[styles.receiptVal, { color: '#7c3aed', fontWeight: '800' }]}>
                        {pendingTx.paymentMethod}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.confirmSaveBtn}
                  onPress={handleConfirmSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmSaveBtnText}>
                    Save to My Hisab ✓
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 14 }}
                  onPress={onClose}
                >
                  <Text style={{ color: theme.subtle, fontSize: 13, fontWeight: '600' }}>
                    {paymentResult === 'success' ? 'Skip without saving' : "Not paid · don't save"}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    // statusBarTranslucent draws under the status bar; keep the sheet clear of it.
    paddingTop: 48,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '100%',
  },
  // Bottom sheet, like UPI apps' own pay screens: tall enough to show the flow without scrolling.
  modalCard: {
    flexShrink: 1,
    minHeight: "62%",
    paddingBottom: 12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 16,
  },
  phonePeHeader: {
    backgroundColor: '#5f259f',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backCloseBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 1,
  },
  qrHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  qrHeaderBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scanQrLinkText: {
    color: '#7c3aed',
    fontSize: 12,
    fontWeight: '700',
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
  chevronBox: {
    marginLeft: 6,
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
  qrGuideText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f0c1f',
  },
  permissionTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  permissionSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  permissionBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  permissionFallbackRow: {
    flexDirection: 'row',
    gap: 10,
  },
  permSubBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  permSubBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '800',
  },
  recipientUpiText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  editUpiInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  suffixChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  suffixChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedRow: {
    marginTop: 4,
  },
  changePayeeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(95, 37, 159, 0.12)',
  },
  changePayeeText: {
    color: '#5f259f',
    fontSize: 11,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    padding: 0,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  upiAppsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upiAppCardGrid: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 4,
    position: 'relative',
  },
  selectedCheckCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiAppName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  proceedPayBtn: {
    backgroundColor: '#5f259f',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#5f259f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  proceedPayBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
    paddingHorizontal: 10,
  },
  securityNoticeIcon: {
    fontSize: 12,
  },
  securityNoticeText: {
    fontSize: 11,
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  waitingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(95, 37, 159, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  waitingDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  manualReturnBtn: {
    backgroundColor: '#5f259f',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  manualReturnBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  successBadge: {
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  confirmSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptAmount: {
    color: '#7c3aed',
    fontSize: 20,
    fontWeight: '900',
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    marginVertical: 8,
  },
  confirmSaveBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  confirmSaveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
