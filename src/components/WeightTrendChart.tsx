import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WeightEntry, WeightGoal } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';

interface WeightTrendChartProps {
  entries: WeightEntry[];
  startWeight: number;
  targetWeight: number;
  currentWeight: number;
  unit?: 'kg' | 'lbs';
  goal?: WeightGoal;
}

const { width } = Dimensions.get('window');

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({
  entries,
  startWeight,
  targetWeight,
  currentWeight,
  unit = 'kg',
  goal = 'weight_loss',
}) => {
  const theme = useAppTheme();

  // Sort entries chronologically
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const displayEntries = sorted.length > 7 ? sorted.slice(-7) : sorted;

  const weights = displayEntries.map((e) => e.weightKg);
  const minW = Math.min(...weights, targetWeight, startWeight, currentWeight) - 1.5;
  const maxW = Math.max(...weights, targetWeight, startWeight, currentWeight) + 1.5;
  const range = maxW - minW > 0 ? maxW - minW : 1;

  const chartHeight = 120;

  // Calculate progress percent towards target
  const totalChangeNeeded = Math.abs(targetWeight - startWeight);
  const changeAchieved = Math.abs(currentWeight - startWeight);
  const progressPercent =
    totalChangeNeeded > 0
      ? Math.min(100, Math.round((changeAchieved / totalChangeNeeded) * 100))
      : 100;

  const delta = currentWeight - startWeight;
  const deltaFormatted = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      {/* Header with Stats */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Weight Transformation</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {goal === 'weight_loss' ? 'Fat Loss & Cutting' : goal === 'weight_gain' ? 'Hypertrophy & Bulking' : 'Body Recomposition'}
          </Text>
        </View>

        <View style={styles.deltaBox}>
          <Text
            style={[
              styles.deltaText,
              {
                color:
                  goal === 'weight_loss'
                    ? delta <= 0
                      ? theme.success
                      : theme.danger
                    : delta >= 0
                    ? theme.success
                    : theme.danger,
              },
            ]}
          >
            {deltaFormatted}
          </Text>
          <Text style={[styles.deltaLabel, { color: theme.subtle }]}>Since Start</Text>
        </View>
      </View>

      {/* Goal Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressVal, { color: theme.muted }]}>
            Start: {startWeight} {unit}
          </Text>
          <Text style={[styles.progressVal, { color: theme.accent, fontWeight: '700' }]}>
            Current: {currentWeight} {unit}
          </Text>
          <Text style={[styles.progressVal, { color: theme.primary, fontWeight: '700' }]}>
            Target: {targetWeight} {unit}
          </Text>
        </View>

        <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceAlt }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressPercentText, { color: theme.accent }]}>
          {progressPercent}% Goal Completed
        </Text>
      </View>

      {/* Chart Bars Visualizer */}
      <View style={[styles.chartBox, { backgroundColor: theme.bg }]}>
        <View style={[styles.targetLine, { top: `${((maxW - targetWeight) / range) * 100}%`, borderColor: theme.accent }]} />

        <View style={styles.barsRow}>
          {displayEntries.map((entry, idx) => {
            const hPercent = ((entry.weightKg - minW) / range) * 100;
            const isLatest = idx === displayEntries.length - 1;
            const dateStr = new Date(entry.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <View key={entry.id || idx} style={styles.barCol}>
                <Text style={[styles.barValText, { color: isLatest ? theme.primary : theme.muted }]}>
                  {entry.weightKg}
                </Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(12, hPercent)}%`,
                        backgroundColor: isLatest ? theme.primary : theme.surfaceAlt,
                        borderColor: isLatest ? theme.primary : theme.borderSoft,
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.barDateText, { color: theme.subtle }]}>{dateStr}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  deltaBox: {
    alignItems: 'flex-end',
  },
  deltaText: {
    fontSize: 16,
    fontWeight: '900',
  },
  deltaLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressVal: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 4,
  },
  chartBox: {
    height: 150,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    zIndex: 2,
  },
  barCol: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    flex: 1,
  },
  barValText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 90,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
  },
  barDateText: {
    fontSize: 9,
    marginTop: 4,
  },
});
