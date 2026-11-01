import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import qrcode from 'qrcode-generator';

const QUIET_ZONE_MODULES = 4; // ISO/IEC 18004 minimum margin, needed for reliable scanning

type QrRow = Array<{ dark: boolean; length: number }>;

/** Encodes on-device and returns horizontal runs per row, so each row renders a handful of Views. */
export function encodeQrRows(value: string): { moduleCount: number; rows: QrRow[] } {
  const qr = qrcode(0, 'M');
  qr.addData(value, 'Byte');
  qr.make();
  const moduleCount = qr.getModuleCount();
  const rows: QrRow[] = [];
  for (let r = 0; r < moduleCount; r++) {
    const row: QrRow = [];
    for (let c = 0; c < moduleCount; c++) {
      const dark = qr.isDark(r, c);
      const last = row[row.length - 1];
      if (last && last.dark === dark) last.length += 1;
      else row.push({ dark, length: 1 });
    }
    rows.push(row);
  }
  return { moduleCount, rows };
}

export const UpiQrCode = React.memo(function UpiQrCode({
  value,
  size = 220,
  accessibilityLabel,
}: {
  value: string;
  size?: number;
  accessibilityLabel?: string;
}) {
  const matrix = useMemo(() => {
    // The default byte mode is Latin-1 only; callers pass percent-encoded ASCII URIs.
    if (!value || /[^\x20-\x7e]/.test(value)) return null;
    try {
      return encodeQrRows(value);
    } catch {
      return null; // payload longer than the largest QR version
    }
  }, [value]);

  if (!matrix) {
    return (
      <View style={[styles.errorBox, { width: size, height: size }]}>
        <Text style={styles.errorText}>Could not create a QR code for these payment details.</Text>
      </View>
    );
  }

  // Whole-pixel modules avoid anti-aliased seams between Views that confuse scanners.
  const cell = Math.max(1, Math.floor(size / (matrix.moduleCount + QUIET_ZONE_MODULES * 2)));
  const margin = cell * QUIET_ZONE_MODULES;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || 'UPI payment QR code'}
      style={[styles.canvas, { padding: margin }]}
    >
      {matrix.rows.map((row, r) => (
        <View key={r} style={[styles.row, { height: cell }]}>
          {row.map((run, i) => (
            <View
              key={i}
              style={{ width: run.length * cell, height: cell, backgroundColor: run.dark ? '#000000' : '#ffffff' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { backgroundColor: '#ffffff' },
  row: { flexDirection: 'row' },
  errorBox: { alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#fef2f2' },
  errorText: { color: '#b91c1c', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
