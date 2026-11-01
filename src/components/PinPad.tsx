import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { PIN_LENGTH } from '../services/appLock';

/**
 * PIN entry state kept in a ref as well as state, so quick taps that land before the next render
 * still append to the latest value instead of a stale one.
 */
export function usePinEntry(onFull: (pin: string) => void, blocked: boolean) {
  const [value, setValue] = useState('');
  const valueRef = useRef('');
  const set = useCallback((next: string) => {
    valueRef.current = next;
    setValue(next);
  }, []);
  const onDigit = (digit: string) => {
    if (blocked || valueRef.current.length >= PIN_LENGTH) return;
    const next = valueRef.current + digit;
    set(next);
    if (next.length === PIN_LENGTH) onFull(next);
  };
  const onBackspace = () => set(valueRef.current.slice(0, -1));
  const clear = useCallback(() => set(''), [set]);
  return { value, onDigit, onBackspace, clear };
}

type SpecialKey = { icon: string; accessibilityLabel: string; onPress: () => void };

/** PIN dots plus a 0-9 keypad, shared by the lock screen and PIN setup so both behave the same. */
export function PinPad({
  value,
  onDigit,
  onBackspace,
  leftKey,
  disabled,
}: {
  value: string;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  leftKey?: SpecialKey;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const key = (label: string, onPress: () => void, accessibilityLabel: string, special = false) => (
    <TouchableOpacity
      key={accessibilityLabel}
      style={[styles.key, { backgroundColor: special ? theme.surfaceAlt : theme.surface, borderColor: theme.border, opacity: disabled ? 0.45 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      activeOpacity={0.4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={[special ? styles.specialText : styles.keyText, { color: special ? theme.muted : theme.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.dotsRow} accessible accessibilityLabel={`${value.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[styles.dot, { borderColor: theme.border }, value.length > index && { backgroundColor: theme.primary, borderColor: theme.primary }]}
          />
        ))}
      </View>
      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map(row => (
          <View key={row[0]} style={styles.keyRow}>
            {row.map(digit => key(digit, () => onDigit(digit), `Key ${digit}`))}
          </View>
        ))}
        <View style={styles.keyRow}>
          {leftKey ? key(leftKey.icon, leftKey.onPress, leftKey.accessibilityLabel, true) : <View style={styles.keySpacer} />}
          {key('0', () => onDigit('0'), 'Key 0')}
          {key('⌫', onBackspace, 'Backspace', true)}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dotsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, backgroundColor: 'transparent' },
  keypad: { width: '100%', gap: 12, marginTop: 8 },
  keyRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  key: { width: 88, height: 58, borderRadius: 29, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keySpacer: { width: 88, height: 58 },
  keyText: { fontSize: 22, fontWeight: '800' },
  specialText: { fontSize: 20 },
});
