import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/appTheme';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { EXERCISES_DATABASE } from '../data/exercisesData';
import {
  MUSCLE_GAIN_RULES,
  muscleGainMeals,
  muscleGainSplit,
  muscleGainTargets,
  muscleGainWeek,
} from '../utils/musclePlan';
import { AppIcon } from './AppIcon';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const exerciseName = (id: string) => EXERCISES_DATABASE.find(e => e.id === id)?.name || id;

/** Muscle-gain diet and training plan built from the profile, with one-tap apply. */
export function MuscleGainPlanModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, replaceWeeklySplit } = useFitnessApp();
  const [vegetarian, setVegetarian] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(1);

  const targets = useMemo(() => muscleGainTargets(profile), [profile]);
  const week = useMemo(() => muscleGainWeek(profile.experience), [profile.experience]);
  const meals = useMemo(() => muscleGainMeals(targets.calories, vegetarian), [targets.calories, vegetarian]);

  const applyPlan = () => {
    Alert.alert(
      'Use this plan?',
      `Your daily targets become ${targets.calories} kcal and ${targets.proteinG} g protein, and your weekly workouts are replaced with the ${week.name} plan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use plan',
          onPress: async () => {
            await updateProfile({
              fitnessGoal: 'weight_gain',
              targetCalories: targets.calories,
              targetProteinGrams: targets.proteinG,
              targetCarbsGrams: targets.carbsG,
              targetFatsGrams: targets.fatsG,
              dailyWaterTargetMl: targets.waterMl,
            });
            await replaceWeeklySplit(muscleGainSplit(profile.experience));
            onClose();
            Alert.alert('Plan set ✅', 'Your Today screen now shows the new workouts and nutrition targets.');
          },
        },
      ]
    );
  };

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityLabel="Close" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppIcon name="chevron-left" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Muscle Gain Plan</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: theme.muted }]}>
            Built for you: {profile.currentWeightKg} kg, {profile.heightCm} cm, {profile.age} yrs, {profile.experience}. Change these in
            Profile and the plan updates.
          </Text>

          {/* Daily targets */}
          <View style={[styles.hero, { backgroundColor: theme.primary }]}>
            <Text style={styles.heroEyebrow}>EAT EVERY DAY</Text>
            <Text style={styles.heroValue}>{targets.calories} kcal</Text>
            <Text style={styles.heroSub}>
              Maintenance ≈ {targets.maintenanceCalories} kcal + a lean-bulk surplus of {targets.calories - targets.maintenanceCalories} kcal
            </Text>
            <View style={styles.macroRow}>
              {[
                { label: 'Protein', value: `${targets.proteinG} g` },
                { label: 'Carbs', value: `${targets.carbsG} g` },
                { label: 'Fats', value: `${targets.fatsG} g` },
                { label: 'Water', value: `${(targets.waterMl / 1000).toFixed(1)} L` },
              ].map(m => (
                <View key={m.label} style={styles.macroTile}>
                  <Text style={styles.macroValue}>{m.value}</Text>
                  <Text style={styles.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={card}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>📈 Expected progress</Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              Aim to gain about {targets.weeklyGainKg} kg per week, mostly muscle.
              {targets.weeksToTarget
                ? ` At that pace you reach ${profile.targetWeightKg} kg in about ${targets.weeksToTarget} weeks.`
                : ' Set a target weight above your current weight in Profile to see a timeline.'}
            </Text>
          </View>

          {/* Workout plan */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Workout · {week.name}</Text>
          {week.days.map((day, index) => {
            const open = openDay === index;
            return (
              <View key={DAYS[index]} style={card}>
                <TouchableOpacity
                  style={styles.dayHeader}
                  activeOpacity={0.7}
                  disabled={!day}
                  onPress={() => setOpenDay(open ? null : index)}
                >
                  <View style={[styles.dayBadge, { backgroundColor: day ? `${theme.primary}22` : theme.surfaceAlt }]}>
                    <Text style={[styles.dayBadgeText, { color: day ? theme.primary : theme.subtle }]}>{DAYS[index]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayTitle, { color: day ? theme.text : theme.subtle }]}>{day ? day.title : 'Rest & recovery'}</Text>
                    {day ? <Text style={[styles.daySub, { color: theme.subtle }]}>{day.exercises.length} exercises</Text> : null}
                  </View>
                  {day ? <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.subtle} /> : null}
                </TouchableOpacity>
                {day && open
                  ? day.exercises.map(ex => (
                      <View key={ex.id} style={[styles.exerciseRow, { borderTopColor: theme.borderSoft }]}>
                        <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>{exerciseName(ex.id)}</Text>
                        <Text style={[styles.exerciseSets, { color: theme.primary }]}>{ex.prescription}</Text>
                      </View>
                    ))
                  : null}
              </View>
            );
          })}

          {/* Meals */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0, marginBottom: 0 }]}>Sample day of eating</Text>
            <View style={[styles.toggle, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              {[false, true].map(veg => (
                <TouchableOpacity
                  key={String(veg)}
                  onPress={() => setVegetarian(veg)}
                  style={[styles.toggleBtn, vegetarian === veg && { backgroundColor: theme.primary }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, { color: vegetarian === veg ? '#ffffff' : theme.muted }]}>{veg ? 'Veg' : 'Non-veg'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {meals.map(meal => (
            <View key={meal.title} style={card}>
              <View style={styles.mealHeader}>
                <Text style={[styles.dayTitle, { color: theme.text }]}>{meal.title}</Text>
                <Text style={[styles.daySub, { color: theme.subtle }]}>{meal.time}</Text>
                <Text style={[styles.mealMacros, { color: theme.primary }]}>
                  {meal.calories} kcal · {meal.protein} g P
                </Text>
              </View>
              {meal.items.map(item => (
                <Text key={item} style={[styles.body, { color: theme.muted }]}>• {item}</Text>
              ))}
            </View>
          ))}

          {/* Rules */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Rules that make it work</Text>
          <View style={card}>
            {MUSCLE_GAIN_RULES.map((rule, i) => (
              <Text key={rule} style={[styles.body, { color: theme.muted, marginBottom: 8 }]}>
                <Text style={{ color: theme.primary, fontWeight: '800' }}>{i + 1}. </Text>
                {rule}
              </Text>
            ))}
          </View>
          <Text style={[styles.disclaimer, { color: theme.subtle }]}>
            General guidance for healthy adults, not medical advice. Check with a doctor if you have a health condition.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.borderSoft, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85} onPress={applyPlan}>
            <Text style={styles.applyText}>Use this plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 28, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18.5, fontWeight: '800' },
  content: { padding: 16 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  hero: { borderRadius: 22, padding: 18, marginBottom: 12 },
  heroEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroValue: { color: '#ffffff', fontSize: 30, fontWeight: '900', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 2 },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  macroTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  macroValue: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  macroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  body: { fontSize: 13.5, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 12.5, fontWeight: '800' },
  dayTitle: { fontSize: 14.5, fontWeight: '800' },
  daySub: { fontSize: 12, marginTop: 1 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10, marginTop: 10, gap: 10 },
  exerciseName: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  exerciseSets: { fontSize: 13, fontWeight: '800' },
  toggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  toggleText: { fontSize: 12, fontWeight: '800' },
  mealHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  mealMacros: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '800' },
  disclaimer: { fontSize: 11.5, textAlign: 'center', marginTop: 6 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyText: { color: '#ffffff', fontSize: 15.5, fontWeight: '800' },
});
