import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { localMonthISO } from '../utils/date';
import { AppIcon } from './AppIcon';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthLabel = (monthYear: string) => {
  const [y, m] = monthYear.split('-').map(Number);
  return `${LONG[m - 1] || ''} ${y}`;
};

/** ‹ November 2026 › with arrows, and a tap-to-open month/year grid for jumping further back. */
export const MonthSwitcher = React.memo(function MonthSwitcher({
  month,
  onShift,
  onSelect,
  style,
}: {
  month: string;
  onShift: (delta: number) => void;
  onSelect: (monthYear: string) => void;
  style?: object;
}) {
  const theme = useAppTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(Number(month.slice(0, 4)));
  const thisMonth = localMonthISO();
  const isCurrent = month === thisMonth;
  const atLatest = month >= thisMonth;

  const open = () => {
    setPickerYear(Number(month.slice(0, 4)));
    setPickerOpen(true);
  };

  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border }, style]}>
      <TouchableOpacity
        onPress={() => onShift(-1)}
        style={[styles.arrow, { backgroundColor: theme.surfaceAlt }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Previous month"
      >
        <AppIcon name="chevron-left" size={14} color={theme.text} />
      </TouchableOpacity>

      <TouchableOpacity onPress={open} style={styles.center} activeOpacity={0.7} accessibilityLabel="Choose month">
        <Text style={[styles.label, { color: theme.text }]}>{monthLabel(month)}</Text>
        <Text style={[styles.hint, { color: isCurrent ? theme.subtle : theme.primary }]}>
          {isCurrent ? 'This month · tap to change' : 'Tap to change month'}
        </Text>
      </TouchableOpacity>

      {!isCurrent ? (
        <TouchableOpacity onPress={() => onSelect(thisMonth)} style={[styles.todayBtn, { borderColor: theme.primary }]}>
          <Text style={[styles.todayText, { color: theme.primary }]}>Today</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        onPress={() => onShift(1)}
        disabled={atLatest}
        style={[styles.arrow, { backgroundColor: theme.surfaceAlt, opacity: atLatest ? 0.35 : 1 }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Next month"
      >
        <AppIcon name="chevron-right" size={14} color={theme.text} />
      </TouchableOpacity>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)} statusBarTranslucent navigationBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => undefined}>
            <View style={styles.yearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={[styles.arrow, { backgroundColor: theme.surfaceAlt }]} accessibilityLabel="Previous year">
                <AppIcon name="chevron-left" size={14} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.year, { color: theme.text }]}>{pickerYear}</Text>
              <TouchableOpacity
                onPress={() => setPickerYear(y => y + 1)}
                disabled={pickerYear >= Number(thisMonth.slice(0, 4))}
                style={[styles.arrow, { backgroundColor: theme.surfaceAlt, opacity: pickerYear >= Number(thisMonth.slice(0, 4)) ? 0.35 : 1 }]}
                accessibilityLabel="Next year"
              >
                <AppIcon name="chevron-right" size={14} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {MONTHS.map((name, i) => {
                const value = `${pickerYear}-${String(i + 1).padStart(2, '0')}`;
                const selected = value === month;
                const future = value > thisMonth;
                return (
                  <TouchableOpacity
                    key={name}
                    disabled={future}
                    onPress={() => {
                      onSelect(value);
                      setPickerOpen(false);
                    }}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                        opacity: future ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.cellText, { color: selected ? '#ffffff' : theme.text }]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => {
                onSelect(thisMonth);
                setPickerOpen(false);
              }}
              style={[styles.thisMonthBtn, { borderColor: theme.primary }]}
            >
              <Text style={[styles.todayText, { color: theme.primary }]}>Go to this month</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  arrow: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  label: { fontSize: 15.5, fontWeight: '900' },
  hint: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  todayBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  todayText: { fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 16 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  year: { fontSize: 18, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: '30.5%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cellText: { fontSize: 14, fontWeight: '800' },
  thisMonthBtn: { marginTop: 14, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
});
