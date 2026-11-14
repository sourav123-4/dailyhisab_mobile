import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Transaction } from '../types';
import { money } from './UI';
import { useAppTheme } from '../theme/appTheme';
import { localDateISO } from '../utils/date';

type Mode = 'expense' | 'investment' | 'income' | 'emi';

// EMIs are counted the same way the Hisab page counts them, so both screens always agree.
const isEmi = (t: Transaction) => t.type === 'emi' || t.category?.trim().toLowerCase() === 'emi';

const MODES: { id: Mode; label: string; color: string; verb: string; match: (t: Transaction) => boolean }[] = [
  { id: 'expense', label: 'Spent', color: '#E11D48', verb: 'spent', match: t => t.type === 'expense' && !isEmi(t) },
  { id: 'investment', label: 'Invested', color: '#7C3AED', verb: 'invested', match: t => t.type === 'investment' },
  { id: 'income', label: 'Income', color: '#059669', verb: 'received', match: t => t.type === 'income' },
  { id: 'emi', label: 'EMI', color: '#EA580C', verb: 'paid in EMIs', match: isEmi },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_HEIGHT = 120;

/**
 * Day-by-day bars for one month: how much was spent, invested, received or paid in EMIs on each
 * day. Tapping a day with entries opens the Hisab page filtered to that date.
 */
export function DailyActivityChart({
  transactions,
  month,
  currency,
  onOpenDay,
}: {
  /** Transactions of `month` (YYYY-MM). */
  transactions: Transaction[];
  month: string;
  currency: string;
  onOpenDay?: (dateISO: string, typeName?: string) => void;
}) {
  const theme = useAppTheme();
  const [mode, setMode] = useState<Mode>('expense');
  const [emptyNote, setEmptyNote] = useState<number | null>(null);
  const active = MODES.find(m => m.id === mode)!;

  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const today = localDateISO();
  const todayDay = today.startsWith(month) ? Number(today.slice(8, 10)) : null;
  const dateOf = (day: number) => `${month}-${String(day).padStart(2, '0')}`;
  const label = (day: number) => `${day} ${MONTHS[monthNum - 1]}`;

  const { perDay, counts, total, maxDay, activeDays } = useMemo(() => {
    const sums = Array(daysInMonth).fill(0);
    const n = Array(daysInMonth).fill(0);
    transactions.forEach(t => {
      if (!t.date || !active.match(t)) return;
      const day = Number(t.date.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) {
        sums[day - 1] += Number(t.amount || 0);
        n[day - 1] += 1;
      }
    });
    let max = -1;
    sums.forEach((v, i) => {
      if (v > 0 && (max < 0 || v > sums[max])) max = i;
    });
    return {
      perDay: sums,
      counts: n,
      total: sums.reduce((a, b) => a + b, 0),
      maxDay: max >= 0 ? max + 1 : null,
      activeDays: sums.filter(v => v > 0).length,
    };
  }, [transactions, active, daysInMonth]);

  const peak = maxDay ? perDay[maxDay - 1] : 0;
  const daysSoFar = todayDay ?? daysInMonth;
  const average = daysSoFar > 0 ? total / daysSoFar : 0;
  const tint = `${active.color}14`;

  const openDay = (day: number) => {
    if (perDay[day - 1] > 0) {
      setEmptyNote(null);
      onOpenDay?.(dateOf(day), mode);
    } else {
      setEmptyNote(day);
    }
  };

  const showLabel = (day: number) =>
    day === todayDay || ((day === 1 || day % 5 === 0 || day === daysInMonth) && (todayDay === null || Math.abs(day - todayDay) > 1));

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft || theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: tint }]}>
          <Text style={styles.headerEmoji}>📅</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Day by day</Text>
          <Text style={[styles.sub, { color: theme.subtle }]}>
            {MONTHS[monthNum - 1]} {year} · tap a day to see its entries
          </Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={[styles.total, { color: active.color }]} numberOfLines={1}>
            {money(total, currency)}
          </Text>
          <Text style={[styles.sub, { color: theme.subtle }]}>{active.verb}</Text>
        </View>
      </View>

      {/* Mode pills */}
      <View style={styles.pills}>
        {MODES.map(m => {
          const on = m.id === mode;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => {
                setMode(m.id);
                setEmptyNote(null);
              }}
              activeOpacity={0.8}
              style={[
                styles.pill,
                on
                  ? { backgroundColor: `${m.color}18`, borderColor: `${m.color}66` }
                  : { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' },
              ]}
            >
              <View style={[styles.pillDot, { backgroundColor: m.color, opacity: on ? 1 : 0.55 }]} />
              <Text style={[styles.pillText, { color: on ? m.color : theme.muted }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart */}
      <View style={[styles.panel, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: theme.borderSoft || theme.border }]}>
        <View style={styles.scaleRow}>
          <Text style={[styles.scaleText, { color: theme.subtle }]}>{peak > 0 ? money(Math.round(peak), currency) : ''}</Text>
          {average > 0 ? (
            <View style={styles.avgKey}>
              <View style={[styles.avgKeyLine, { borderColor: theme.subtle }]} />
              <Text style={[styles.scaleText, { color: theme.subtle }]}>avg {money(Math.round(average), currency)}/day</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.plot}>
          {average > 0 && peak > 0 ? (
            <View pointerEvents="none" style={[styles.avgLine, { bottom: (Math.min(average, peak) / peak) * CHART_HEIGHT, borderColor: theme.subtle }]} />
          ) : null}
          <View style={styles.bars}>
            {perDay.map((value, i) => {
              const day = i + 1;
              const isPeak = day === maxDay;
              const isFuture = todayDay !== null && day > todayDay;
              const h = peak > 0 && value > 0 ? Math.max(6, (value / peak) * CHART_HEIGHT) : 0;
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.slot}
                  activeOpacity={0.6}
                  onPress={() => openDay(day)}
                  accessibilityLabel={`${label(day)}: ${money(value, currency)}${value > 0 ? ', open entries' : ''}`}
                >
                  <View style={[styles.track, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : '#EEF2F7', opacity: isFuture ? 0.45 : 1 }]}>
                    {h > 0 ? (
                      <View style={[styles.bar, { height: h, backgroundColor: active.color, opacity: isPeak ? 1 : 0.7 }]} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.labels}>
          {perDay.map((_, i) => {
            const day = i + 1;
            return (
              <Text
                key={day}
                style={[
                  styles.dayLabel,
                  { color: day === todayDay ? theme.primary : theme.subtle, fontWeight: day === todayDay ? '900' : '700' },
                ]}
                numberOfLines={1}
              >
                {showLabel(day) ? day : ''}
              </Text>
            );
          })}
        </View>
      </View>

      {emptyNote ? (
        <Text style={[styles.note, { color: theme.muted }]}>
          Nothing {active.verb} on {label(emptyNote)}.
        </Text>
      ) : null}

      {/* Summary tiles */}
      <View style={styles.tiles}>
        <TouchableOpacity
          activeOpacity={maxDay ? 0.75 : 1}
          disabled={!maxDay}
          onPress={() => maxDay && openDay(maxDay)}
          style={[styles.tile, { backgroundColor: tint, borderColor: `${active.color}33` }]}
        >
          <Text style={[styles.tileLabel, { color: theme.muted }]}>🏆 Biggest day</Text>
          {maxDay ? (
            <>
              <Text style={[styles.tileValue, { color: active.color }]} numberOfLines={1}>
                {money(perDay[maxDay - 1], currency)}
              </Text>
              <Text style={[styles.tileSub, { color: theme.text }]}>
                {label(maxDay)} · {counts[maxDay - 1]} {counts[maxDay - 1] === 1 ? 'entry' : 'entries'} ›
              </Text>
            </>
          ) : (
            <Text style={[styles.tileSub, { color: theme.muted, marginTop: 6 }]}>Nothing {active.verb} yet</Text>
          )}
        </TouchableOpacity>
        <View style={[styles.tile, { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }]}>
          <Text style={[styles.tileLabel, { color: theme.muted }]}>📊 Daily average</Text>
          <Text style={[styles.tileValue, { color: theme.text }]} numberOfLines={1}>
            {money(Math.round(average), currency)}
          </Text>
          <Text style={[styles.tileSub, { color: theme.muted }]}>
            {activeDays} of {daysSoFar} days active
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerEmoji: { fontSize: 18 },
  title: { fontSize: 16, fontWeight: '900' },
  sub: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  totalBox: { alignItems: 'flex-end', maxWidth: '40%' },
  total: { fontSize: 18, fontWeight: '900' },
  pills: { flexDirection: 'row', gap: 6, marginTop: 14 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '800' },
  panel: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 6, marginTop: 12 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 },
  scaleText: { fontSize: 10, fontWeight: '800' },
  avgKey: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  avgKeyLine: { width: 14, borderTopWidth: 1.5, borderStyle: 'dashed' },
  plot: { height: CHART_HEIGHT, justifyContent: 'flex-end' },
  avgLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed', opacity: 0.6, zIndex: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  track: { width: '68%', maxWidth: 9, height: '100%', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 5 },
  labels: { flexDirection: 'row', marginTop: 5 },
  dayLabel: { flex: 1, fontSize: 9, textAlign: 'center' },
  note: { fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  tile: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  tileLabel: { fontSize: 11.5, fontWeight: '800' },
  tileValue: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  tileSub: { fontSize: 11.5, fontWeight: '700', marginTop: 2 },
});
