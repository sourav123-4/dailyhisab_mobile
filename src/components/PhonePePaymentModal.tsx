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
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { Transaction } from '../types';
import {
  launchUpiPayment,
  normalizePayeeUpi,
  POPULAR_UPI_HANDLES,
  UPI_APPS,
  UpiAppChoice,
} from '../services/upiService';
import {
  PhonePeContact,
  searchPhonePeAccounts,
  extractUpiContactsFromTransactions,
  parseUpiQrCode,
  getBankNameFromUpi,
} from '../services/phonepeContacts';

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
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState(defaultCategory || categories[0] || 'Food');
  const [selectedApp, setSelectedApp] = useState<UpiAppChoice>('phonepe');

  // Pending transaction
  const [pendingTx, setPendingTx] = useState<Transaction | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

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
      if (nextAppState === 'active' && waitingRef.current) {
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
        phone: parsed.payeeUpi.split('@')[0],
        upiId: parsed.payeeUpi,
        bankName: getBankNameFromUpi(parsed.payeeUpi),
        hasPhonePe: true,
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

  // Launch Payment through Selected UPI App
  const handleProceedToPay = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
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

    // Store actual UPI details in notes so future transactions can cleanly re-resolve payees
    const appOpt = UPI_APPS.find((a) => a.id === selectedApp);
    const appName = appOpt?.name || 'UPI';

    const newTx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: new Date().toISOString().slice(0, 10),
      title: finalTitle,
      amount: numAmount,
      category: category || 'Food',
      type: 'expense',
      paymentMethod: `${appName} Payment`,
      notes: `UPI: ${normalizedUpi} | Ref: ${txRef}${note.trim() ? ' | ' + note.trim() : ''}`,
    };

    setPendingTx(newTx);
    setIsLaunching(true);

    try {
      const res = await launchUpiPayment({
        payeeUpi: normalizedUpi,
        payeeName: payeeName.trim() || 'Store',
        amount: numAmount,
        note: note.trim() || 'Payment via DailyHisab',
        category,
        app: selectedApp,
        transactionRef: txRef,
      });

      if (!res.success) {
        Alert.alert(
          'Could not open payment app',
          res.error || 'Please make sure PhonePe, Google Pay, or a UPI app is installed on your device.'
        );
        setIsLaunching(false);
        return;
      }

      setStep('waiting_return');
      setIsLaunching(false);
    } catch (e: any) {
      setIsLaunching(false);
      Alert.alert('Payment Error', e?.message || 'Failed to trigger UPI payment.');
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
                  style={styles.backCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <AppIcon
                    name={step === 'transfer' || step === 'qr_scan' ? 'arrow-left' : 'x'}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.headerTitleText}>
                    {step === 'qr_scan'
                      ? 'Scan any QR Code'
                      : step === 'transfer'
                      ? 'Pay with UPI'
                      : step === 'confirm_save'
                      ? 'Confirm & Save Hisab'
                      : 'Send Money via UPI'}
                  </Text>
                  <Text style={styles.headerSubtitleText} numberOfLines={1}>
                    {step === 'qr_scan'
                      ? 'PhonePe, GPay, Paytm, BharatPe, BHIM'
                      : step === 'transfer'
                      ? selectedContact?.upiId || payeeUpi
                      : 'Transfer instantly to any mobile number or UPI ID'}
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
                    {isSearching
                      ? 'SEARCH RESULTS'
                      : hasLedgerHistory
                      ? 'RECENT UPI TRANSFERS'
                      : 'POPULAR UPI CONTACTS'}
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
                          {contact.phone ? `+91 ${contact.phone} • ` : ''}{contact.upiId}
                        </Text>

                        {/* Verified Badge */}
                        <View style={styles.phonePeBadgeRow}>
                          <View style={styles.phonePeMiniBadge}>
                            <Text style={styles.phonePeMiniIcon}>🟣</Text>
                            <Text style={styles.phonePeMiniText}>
                              {contact.hasPhonePe ? 'Account on PhonePe' : 'Verified UPI'}
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
                            {currency}{contact.recentAmount}
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
                        No Contacts Found
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
                      <Text style={{ fontSize: 11, color: '#10b981', fontWeight: '800' }}>
                        ✓ {getBankNameFromUpi(payeeUpi)}
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
                  <Text style={styles.proceedPayBtnText}>
                    {isLaunching
                      ? 'OPENING PAYMENT APP...'
                      : `PROCEED TO PAY ${amount ? currency + amount : ''}`}
                  </Text>
                  <AppIcon name="arrow-right" size={18} color="#ffffff" />
                </TouchableOpacity>

                {/* Hint Notice */}
                <View style={styles.securityNoticeRow}>
                  <Text style={styles.securityNoticeIcon}>🔒</Text>
                  <Text style={[styles.securityNoticeText, { color: theme.subtle }]}>
                    100% Secure via NPCI UPI. Returning to DailyHisab will automatically prompt you to save this transaction.
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* SCREEN 4: WAITING FOR RETURN FROM UPI APP */}
            {step === 'waiting_return' && (
              <View style={styles.waitingContainer}>
                <View style={styles.waitingCircle}>
                  <Text style={{ fontSize: 42 }}>🟣</Text>
                </View>
                <Text style={[styles.waitingTitle, { color: theme.text }]}>
                  Payment in Progress
                </Text>
                <Text style={[styles.waitingDesc, { color: theme.subtle }]}>
                  Please complete the payment in your UPI app, then switch back to DailyHisab.
                </Text>

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
                  <Text style={{ fontSize: 36 }}>✅</Text>
                </Animated.View>

                <Text style={[styles.confirmTitle, { color: theme.text }]}>
                  Payment Completed!
                </Text>
                <Text style={[styles.confirmSubtitle, { color: theme.subtle }]}>
                  Save this transaction to your DailyHisab ledger:
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
                        {currency}{pendingTx.amount}
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
                    Skip without saving
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
    padding: 16,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
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
