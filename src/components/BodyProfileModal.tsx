import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from './KeyboardAvoidingView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/appTheme';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useHisabApp } from '../navigation/HisabAppContext';
import type { ActivityLevel, Difficulty, UserProfile, WeightGoal } from '../types/fitness';
import { dailyTargetsForGoal } from '../utils/musclePlan';
import { AppIcon } from './AppIcon';

const GOALS: { id: WeightGoal; label: string; emoji: string }[] = [
  { id: 'weight_gain', label: 'Build muscle', emoji: '💪' },
  { id: 'weight_loss', label: 'Lose fat', emoji: '🔥' },
  { id: 'maintenance', label: 'Stay fit', emoji: '⚖️' },
];
const ACTIVITY: { id: ActivityLevel; label: string }[] = [
  { id: 'sedentary', label: 'Desk job' },
  { id: 'lightly_active', label: 'Light' },
  { id: 'moderately_active', label: 'Moderate' },
  { id: 'very_active', label: 'Very active' },
  { id: 'athlete', label: 'Athlete' },
];
const EXPERIENCE: { id: Difficulty; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];
const GENDERS: { id: UserProfile['gender']; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' },
];

type Draft = {
  name: string;
  gender: UserProfile['gender'];
  age: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  fitnessGoal: WeightGoal;
  activityLevel: ActivityLevel;
  experience: Difficulty;
};

const draftFrom = (p: UserProfile): Draft => ({
  name: p.name || '',
  gender: p.gender,
  age: String(p.age || ''),
  heightCm: String(p.heightCm || ''),
  currentWeightKg: String(p.currentWeightKg || ''),
  targetWeightKg: String(p.targetWeightKg || ''),
  fitnessGoal: p.fitnessGoal === 'muscle_gain' ? 'weight_gain' : p.fitnessGoal,
  activityLevel: p.activityLevel,
  experience: p.experience,
});

const num = (text: string) => Number(text.replace(',', '.'));

/** One place to edit weight, height, age and goals; recalculates daily calorie and macro targets on save. */
export function BodyProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, logWeight } = useFitnessApp();
  const { saveProfile, user, localOnly } = useHisabApp();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(profile));
  const [updateTargets, setUpdateTargets] = useState(true);

  useEffect(() => {
    if (visible) setDraft(draftFrom(profile));
    // Only reset when the sheet opens, not while the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => ({ ...prev, [key]: value }));

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Draft, string>> = {};
    const age = num(draft.age);
    const h = num(draft.heightCm);
    const w = num(draft.currentWeightKg);
    const t = num(draft.targetWeightKg);
    if (!(age >= 12 && age <= 90)) e.age = '12–90';
    if (!(h >= 120 && h <= 230)) e.heightCm = '120–230 cm';
    if (!(w >= 30 && w <= 250)) e.currentWeightKg = '30–250 kg';
    if (!(t >= 30 && t <= 250)) e.targetWeightKg = '30–250 kg';
    return e;
  }, [draft]);
  const valid = Object.keys(errors).length === 0;

  const preview = useMemo(() => {
    if (!valid) return null;
    return dailyTargetsForGoal(
      {
        ...profile,
        gender: draft.gender,
        age: num(draft.age),
        heightCm: num(draft.heightCm),
        currentWeightKg: num(draft.currentWeightKg),
        activityLevel: draft.activityLevel,
        experience: draft.experience,
      },
      draft.fitnessGoal
    );
  }, [valid, draft, profile]);

  const save = async () => {
    if (!valid) {
      Alert.alert('Check your numbers', 'Fix the highlighted fields before saving.');
      return;
    }
    const weight = Math.round(num(draft.currentWeightKg) * 10) / 10;
    const updates: Partial<UserProfile> = {
      name: draft.name.trim() || profile.name,
      gender: draft.gender,
      age: Math.round(num(draft.age)),
      heightCm: Math.round(num(draft.heightCm)),
      targetWeightKg: Math.round(num(draft.targetWeightKg) * 10) / 10,
      fitnessGoal: draft.fitnessGoal,
      activityLevel: draft.activityLevel,
      experience: draft.experience,
    };
    if (!profile.startWeightKg) updates.startWeightKg = weight;
    if (updateTargets && preview) {
      updates.targetCalories = preview.calories;
      updates.targetProteinGrams = preview.proteinG;
      updates.targetCarbsGrams = preview.carbsG;
      updates.targetFatsGrams = preview.fatsG;
      updates.dailyWaterTargetMl = preview.waterMl;
    }
    await updateProfile(updates);
    if (updates.name && updates.name !== profile.name && user && !localOnly) {
      // Keeps the signed-in account's name (shown in the header and Daily Hisab) in step.
      saveProfile({ displayName: updates.name }).catch(() => undefined);
    }
    // A changed weight is also a weigh-in, so it shows on the Progress chart.
    if (weight !== profile.currentWeightKg) await logWeight(weight, 'Updated in profile');
    onClose();
  };

  const field = (key: 'age' | 'heightCm' | 'currentWeightKg' | 'targetWeightKg', label: string, unit: string) => (
    <View style={styles.fieldBox}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: theme.surfaceAlt, borderColor: errors[key] ? theme.danger : theme.borderSoft },
        ]}
      >
        <TextInput
          value={draft[key]}
          onChangeText={text => set(key, text.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={[styles.input, { color: theme.text }]}
          maxLength={5}
          selectTextOnFocus
          accessibilityLabel={label}
        />
        <Text style={[styles.unit, { color: theme.subtle }]}>{unit}</Text>
      </View>
      {errors[key] ? <Text style={[styles.err, { color: theme.danger }]}>{errors[key]}</Text> : null}
    </View>
  );

  const chips = <T extends string>(options: { id: T; label: string; emoji?: string }[], value: T, onPick: (v: T) => void) => (
    <View style={styles.chipRow}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => onPick(o.id)}
            activeOpacity={0.8}
            style={[styles.chip, { backgroundColor: on ? theme.primary : theme.surfaceAlt, borderColor: on ? theme.primary : theme.borderSoft }]}
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipText, { color: on ? '#ffffff' : theme.text }]}>
              {o.emoji ? `${o.emoji} ` : ''}
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.bg, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close">
              <AppIcon name="close" size={20} color={theme.muted} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>Body & goals</Text>
            <TouchableOpacity onPress={save} style={[styles.saveTop, { backgroundColor: valid ? theme.primary : theme.surfaceAlt }]} disabled={!valid}>
              <Text style={[styles.saveTopText, { color: valid ? '#ffffff' : theme.subtle }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={[styles.section, { color: theme.subtle }]}>NAME</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <TextInput
                value={draft.name}
                onChangeText={text => set('name', text)}
                style={[styles.input, { color: theme.text }]}
                placeholder="Your name"
                placeholderTextColor={theme.subtle}
                maxLength={40}
              />
            </View>

            <Text style={[styles.section, { color: theme.subtle }]}>WEIGHT</Text>
            <View style={styles.grid}>
              {field('currentWeightKg', 'Current weight', 'kg')}
              {field('targetWeightKg', 'Target weight', 'kg')}
            </View>

            <Text style={[styles.section, { color: theme.subtle }]}>BODY</Text>
            <View style={styles.grid}>
              {field('heightCm', 'Height', 'cm')}
              {field('age', 'Age', 'yrs')}
            </View>
            {chips(GENDERS, draft.gender, v => set('gender', v))}

            <Text style={[styles.section, { color: theme.subtle }]}>GOAL</Text>
            {chips(GOALS, draft.fitnessGoal, v => set('fitnessGoal', v))}

            <Text style={[styles.section, { color: theme.subtle }]}>DAILY ACTIVITY</Text>
            {chips(ACTIVITY, draft.activityLevel, v => set('activityLevel', v))}

            <Text style={[styles.section, { color: theme.subtle }]}>TRAINING EXPERIENCE</Text>
            {chips(EXPERIENCE, draft.experience, v => set('experience', v))}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setUpdateTargets(v => !v)}
              style={[styles.targetsCard, { backgroundColor: theme.surface, borderColor: updateTargets ? theme.primary : theme.borderSoft }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: updateTargets }}
            >
              <View style={[styles.check, { borderColor: theme.primary, backgroundColor: updateTargets ? theme.primary : 'transparent' }]}>
                {updateTargets ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.targetsTitle, { color: theme.text }]}>Update my daily targets</Text>
                <Text style={[styles.targetsSub, { color: theme.muted }]}>
                  {preview
                    ? `${preview.calories} kcal · ${preview.proteinG} g protein · ${preview.carbsG} g carbs · ${preview.fatsG} g fat · ${(preview.waterMl / 1000).toFixed(1)} L water`
                    : 'Enter valid numbers to see your targets'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={save}
              disabled={!valid}
              activeOpacity={0.85}
              style={[styles.saveBtn, { backgroundColor: valid ? theme.primary : theme.surfaceAlt }]}
            >
              <Text style={[styles.saveBtnText, { color: valid ? '#ffffff' : theme.subtle }]}>Save changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '900' },
  saveTop: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  saveTopText: { fontSize: 13, fontWeight: '800' },
  body: { padding: 16, paddingBottom: 24 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 10 },
  fieldBox: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 17, fontWeight: '800', paddingVertical: 10 },
  unit: { fontSize: 13, fontWeight: '700' },
  err: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '700' },
  targetsCard: { flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1.5, borderRadius: 16, padding: 14, marginTop: 20 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  targetsTitle: { fontSize: 14, fontWeight: '800' },
  targetsSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  saveBtn: { marginTop: 18, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '900' },
});
