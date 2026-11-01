import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { AppIcon } from './AppIcon';
import { BodyProfileModal } from './BodyProfileModal';

const GOAL_LABEL: Record<string, string> = {
  weight_gain: 'Build muscle',
  muscle_gain: 'Build muscle',
  weight_loss: 'Lose fat',
  maintenance: 'Stay fit',
};

/** Current weight, target, height and age at a glance, with an Edit button that opens the editor. */
export function BodyStatsCard({ style }: { style?: object }) {
  const theme = useAppTheme();
  const { profile } = useFitnessApp();
  const [editing, setEditing] = useState(false);
  const toGo = Math.round((profile.targetWeightKg - profile.currentWeightKg) * 10) / 10;

  const stats = [
    { label: 'Current', value: `${profile.currentWeightKg}`, unit: 'kg' },
    { label: 'Target', value: `${profile.targetWeightKg}`, unit: 'kg' },
    { label: 'Height', value: `${profile.heightCm}`, unit: 'cm' },
    { label: 'Age', value: `${profile.age}`, unit: 'yrs' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, style]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Body stats</Text>
          <Text style={[styles.sub, { color: theme.muted }]} numberOfLines={1}>
            {GOAL_LABEL[profile.fitnessGoal] || 'Goal'}
            {toGo !== 0 ? ` · ${Math.abs(toGo)} kg to ${toGo > 0 ? 'gain' : 'lose'}` : ' · at target 🎯'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setEditing(true)}
          style={[styles.editBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
          activeOpacity={0.8}
          accessibilityLabel="Edit weight, height, age and goal"
        >
          <AppIcon name="edit" size={13} color={theme.primary} />
          <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {stats.map(s => (
          <TouchableOpacity key={s.label} style={styles.stat} onPress={() => setEditing(true)} activeOpacity={0.7}>
            <Text style={[styles.value, { color: theme.text }]}>
              {s.value}
              <Text style={[styles.unit, { color: theme.subtle }]}> {s.unit}</Text>
            </Text>
            <Text style={[styles.label, { color: theme.subtle }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <BodyProfileModal visible={editing} onClose={() => setEditing(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6 },
  editText: { fontSize: 12.5, fontWeight: '800' },
  row: { flexDirection: 'row', marginTop: 12 },
  stat: { flex: 1 },
  value: { fontSize: 17, fontWeight: '900' },
  unit: { fontSize: 11, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});
