import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { PinPad, usePinEntry } from './PinPad';
import {
  attemptsLeftMessage,
  formatLockout,
  getPinFailureCount,
  getPinLockoutRemaining,
  hashPin,
  isPinHash,
  recordPinFailure,
  resetPinFailures,
  verifyPin,
} from '../services/appLock';

const localAuthModule = (() => {
  try {
    const mod = require('expo-local-authentication');
    if (mod && typeof mod.hasHardwareAsync === 'function') {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
})();

export function SecurityLockModal({
  visible,
  storedPin,
  biometricEnabled,
  onUnlock,
  onPinUpgrade,
  onResetLock,
  onEraseAndSignOut,
}: {
  visible: boolean;
  storedPin?: string;
  biometricEnabled?: boolean;
  onUnlock: () => void;
  /** Re-saves a pre-hash plain-text PIN in hashed form after it is entered correctly. */
  onPinUpgrade: (pinHash: string) => void;
  /** Turns the lock off after the phone's own screen lock confirmed the owner. */
  onResetLock: () => void;
  /** Last resort for a forgotten PIN on a phone with no screen lock. */
  onEraseAndSignOut: () => void;
}) {
  const theme = useAppTheme();
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const { value: pin, onDigit, onBackspace, clear: clearPin } = usePinEntry(entered => {
    setErrorMsg('');
    submitPin(entered);
  }, busy || lockoutMs > 0);

  const refreshLockout = useCallback(async () => {
    const remaining = await getPinLockoutRemaining();
    setLockoutMs(remaining);
    return remaining;
  }, []);

  // Count down an active lockout once per second; no timer runs otherwise.
  useEffect(() => {
    if (!visible || lockoutMs <= 0) return;
    const timer = setTimeout(refreshLockout, Math.min(1000, lockoutMs));
    return () => clearTimeout(timer);
  }, [visible, lockoutMs, refreshLockout]);

  const triggerBiometric = useCallback(async (isManualTap = false) => {
    try {
      if (!localAuthModule) {
        if (isManualTap) setErrorMsg('Biometrics are unavailable on this device. Enter your PIN.');
        return;
      }
      const [hasHardware, isEnrolled] = await Promise.all([localAuthModule.hasHardwareAsync(), localAuthModule.isEnrolledAsync()]);
      if (!hasHardware || !isEnrolled) {
        if (isManualTap) setErrorMsg('No fingerprint or face is enrolled on this phone. Enter your PIN.');
        return;
      }
      setBusy(true);
      const res = await localAuthModule.authenticateAsync({
        promptMessage: 'Unlock Wellth',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (res?.success) {
        clearPin();
        setErrorMsg('');
        await resetPinFailures();
        onUnlock();
      }
    } catch {
      // A cancelled or failed prompt simply leaves the PIN pad available.
    } finally {
      setBusy(false);
    }
  }, [onUnlock, clearPin]);

  useEffect(() => {
    if (!visible) return;
    clearPin();
    setErrorMsg('');
    refreshLockout().then(remaining => {
      if (remaining <= 0 && biometricEnabled !== false) triggerBiometric();
    });
  }, [visible, biometricEnabled, refreshLockout, triggerBiometric, clearPin]);

  const submitPin = async (entered: string) => {
    setBusy(true);
    try {
      if ((await refreshLockout()) > 0) return;
      if (await verifyPin(entered, storedPin)) {
        await resetPinFailures();
        if (!isPinHash(storedPin)) onPinUpgrade(await hashPin(entered));
        setErrorMsg('');
        onUnlock();
        return;
      }
      const nextLockout = await recordPinFailure();
      setLockoutMs(nextLockout);
      setErrorMsg(nextLockout ? '' : attemptsLeftMessage(await getPinFailureCount()));
    } finally {
      clearPin();
      setBusy(false);
    }
  };

  const handleForgotPin = async () => {
    const level = localAuthModule ? await localAuthModule.getEnrolledLevelAsync().catch(() => 0) : 0;
    if (level > 0) {
      const res = await localAuthModule.authenticateAsync({
        promptMessage: "Confirm it's you to reset the app PIN",
        disableDeviceFallback: false,
      }).catch(() => null);
      if (res?.success) {
        await resetPinFailures();
        onResetLock();
      }
      return;
    }
    Alert.alert(
      'Reset app lock',
      "This phone has no screen lock, so Wellth can't confirm it's you. You can sign out and erase this app's data on this phone. Records synced to your account return when you sign in again; offline-only records will be lost.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out & erase', style: 'destructive', onPress: onEraseAndSignOut },
      ],
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
        <View style={styles.lockContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Wellth is locked</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {biometricEnabled !== false ? 'Enter your PIN or use biometrics' : 'Enter your PIN'}
          </Text>

          <PinPad
            value={pin}
            onDigit={onDigit}
            onBackspace={onBackspace}
            disabled={busy || lockoutMs > 0}
            leftKey={biometricEnabled !== false ? { icon: '👆', accessibilityLabel: 'Unlock with biometrics', onPress: () => triggerBiometric(true) } : undefined}
          />

          <View style={styles.statusRow}>
            {busy ? <ActivityIndicator size="small" color={theme.primary} /> : null}
            {lockoutMs > 0 ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>Too many wrong attempts. Try again in {formatLockout(lockoutMs)}.</Text>
            ) : errorMsg ? (
              <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={handleForgotPin} disabled={busy} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
            <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot PIN?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockIcon: { fontSize: 25 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 12.5, lineHeight: 17, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  statusRow: { minHeight: 40, marginTop: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  errorText: { fontSize: 12.5, fontWeight: '800', textAlign: 'center' },
  forgotText: { fontSize: 13.5, fontWeight: '800', marginTop: 4 },
});
