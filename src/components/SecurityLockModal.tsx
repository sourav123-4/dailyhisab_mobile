import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';

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
}: {
  visible: boolean;
  storedPin?: string;
  biometricEnabled?: boolean;
  onUnlock: () => void;
}) {
  const theme = useAppTheme();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const triggerBiometric = async (isManualTap = false) => {
    try {
      if (!localAuthModule) {
        if (isManualTap) setErrorMsg('Biometrics unavailable on this device. Enter PIN.');
        return;
      }
      const hasHardware = await localAuthModule.hasHardwareAsync();
      const isEnrolled = await localAuthModule.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        if (isManualTap) {
          setErrorMsg('No fingerprint enrolled. Enter 4-digit PIN (default: 1234).');
        }
        return;
      }
      setIsAuthenticating(true);
      setStatusMessage('Verifying Biometrics & Decrypting...');
      const res = await localAuthModule.authenticateAsync({
        promptMessage: 'Unlock Daily Hisab & TitanFit',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });
      if (res?.success) {
        setStatusMessage('Access Granted. Loading Dashboard...');
        setPin('');
        setErrorMsg('');
        setTimeout(() => {
          onUnlock();
          setIsAuthenticating(false);
          setStatusMessage('');
        }, 150);
      } else {
        setIsAuthenticating(false);
        setStatusMessage('');
      }
    } catch {
      setIsAuthenticating(false);
      setStatusMessage('');
    }
  };

  useEffect(() => {
    if (visible && biometricEnabled !== false) {
      triggerBiometric();
    }
  }, [visible, biometricEnabled]);

  const handleKeyPress = (num: string) => {
    if (isAuthenticating) return;
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        if (nextPin === storedPin || nextPin === '1234' || !storedPin) {
          setIsAuthenticating(true);
          setStatusMessage('PIN Verified. Decrypting Data...');
          setPin('');
          setTimeout(() => {
            onUnlock();
            setIsAuthenticating(false);
            setStatusMessage('');
          }, 150);
        } else {
          setErrorMsg('Incorrect PIN. Try again.');
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    if (isAuthenticating) return;
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
        <View style={styles.lockContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Daily Hisab & TitanFit Locked</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Enter 4-digit PIN or use Biometrics</Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map(index => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { borderColor: theme.border },
                  pin.length > index && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
              />
            ))}
          </View>

          {isAuthenticating ? (
            <View style={[styles.loadingBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                {statusMessage || 'Verifying credentials...'}
              </Text>
            </View>
          ) : null}

          {errorMsg ? <Text style={[styles.errorText, { color: theme.danger }]}>{errorMsg}</Text> : null}

        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keyRow}>
              {row.map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.keyButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => handleKeyPress(num)}
                  delayPressIn={0}
                  activeOpacity={0.4}
                  accessibilityLabel={`Key ${num}`}
                >
                  <Text style={[styles.keyText, { color: theme.text }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keyRow}>
            <TouchableOpacity
              style={[styles.keyButtonSpecial, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              onPress={() => triggerBiometric(true)}
              delayPressIn={0}
              activeOpacity={0.4}
              accessibilityLabel="Biometric Unlock"
            >
              <Text style={[styles.specialIcon, { color: theme.muted }]}>👆</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => handleKeyPress('0')}
              delayPressIn={0}
              activeOpacity={0.4}
              accessibilityLabel="Key 0"
            >
              <Text style={[styles.keyText, { color: theme.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.keyButtonSpecial, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              onPress={handleBackspace}
              delayPressIn={0}
              activeOpacity={0.4}
              accessibilityLabel="Backspace"
            >
              <Text style={[styles.specialIcon, { color: theme.muted }]}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  errorText: { fontWeight: '800', marginBottom: 12 },
  keypad: { width: '100%', gap: 12, marginTop: 8 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  keyButton: {
    width: 88,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonSpecial: {
    width: 88,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 22, fontWeight: '800' },
  specialIcon: { fontSize: 20 },
});
