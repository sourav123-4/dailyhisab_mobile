import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { PinPad, usePinEntry } from './PinPad';
import {
  PIN_LENGTH,
  attemptsLeftMessage,
  formatLockout,
  getPinFailureCount,
  getPinLockoutRemaining,
  hashPin,
  isWeakPin,
  recordPinFailure,
  resetPinFailures,
  verifyPin,
} from '../services/appLock';

export type PinSetupMode = 'create' | 'change' | 'disable';
type Step = 'current' | 'new' | 'confirm';

const COPY: Record<PinSetupMode, string> = {
  create: 'Turn on App Lock',
  change: 'Change PIN',
  disable: 'Turn off App Lock',
};

/**
 * Creating a PIN asks for it twice; changing or removing one first requires the current PIN,
 * so an unlocked phone left on the table cannot quietly swap or drop the lock.
 */
export function PinSetupModal({
  visible,
  mode,
  storedPin,
  onComplete,
  onCancel,
}: {
  visible: boolean;
  mode: PinSetupMode;
  storedPin?: string;
  /** Receives the new PIN hash, or null when the lock is being turned off. */
  onComplete: (pinHash: string | null) => void;
  onCancel: () => void;
}) {
  const theme = useAppTheme();
  const [step, setStep] = useState<Step>(mode === 'create' ? 'new' : 'current');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { value: entry, onDigit, onBackspace, clear: clearEntry } = usePinEntry(pin => {
    setError('');
    submit(pin);
  }, busy);

  useEffect(() => {
    if (!visible) return;
    setStep(mode === 'create' ? 'new' : 'current');
    clearEntry();
    setFirstPin('');
    setError('');
    setBusy(false);
  }, [visible, mode, clearEntry]);

  const submit = async (pin: string) => {
    setBusy(true);
    try {
      if (step === 'current') {
        const lockout = await getPinLockoutRemaining();
        if (lockout > 0) {
          setError(`Too many wrong attempts. Try again in ${formatLockout(lockout)}.`);
          return;
        }
        if (!(await verifyPin(pin, storedPin))) {
          const nextLockout = await recordPinFailure();
          setError(nextLockout ? `Too many wrong attempts. Try again in ${formatLockout(nextLockout)}.` : attemptsLeftMessage(await getPinFailureCount()));
          return;
        }
        await resetPinFailures();
        if (mode === 'disable') {
          onComplete(null);
          return;
        }
        setStep('new');
        return;
      }
      if (step === 'new') {
        if (isWeakPin(pin)) {
          setError('That PIN is too easy to guess. Avoid repeated digits and sequences like 1234.');
          return;
        }
        setFirstPin(pin);
        setStep('confirm');
        return;
      }
      if (pin !== firstPin) {
        setError("PINs didn't match. Enter your new PIN again.");
        setFirstPin('');
        setStep('new');
        return;
      }
      onComplete(await hashPin(pin));
    } finally {
      clearEntry();
      setBusy(false);
    }
  };

  const prompt =
    step === 'current' ? 'Enter your current PIN' : step === 'new' ? `Choose a new ${PIN_LENGTH}-digit PIN` : 'Enter the new PIN again to confirm';

  return (
    <Modal visible={visible} transparent={false} animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: theme.bg }]}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: theme.text }]}>{COPY[mode]}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{prompt}</Text>
          <PinPad value={entry} onDigit={onDigit} onBackspace={onBackspace} disabled={busy} />
          <View style={styles.statusRow}>
            {busy ? <ActivityIndicator size="small" color={theme.primary} /> : null}
            {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
          </View>
          <TouchableOpacity onPress={onCancel} style={styles.cancel} accessibilityRole="button" hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
            <Text style={[styles.cancelText, { color: theme.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { width: '100%', maxWidth: 340, alignItems: 'center' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 18, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  statusRow: { minHeight: 40, marginTop: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  error: { fontSize: 12.5, fontWeight: '800', textAlign: 'center' },
  cancel: { marginTop: 8, paddingVertical: 8 },
  cancelText: { fontSize: 14, fontWeight: '700' },
});
