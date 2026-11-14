import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from '../components/KeyboardAvoidingView';
import { AppIcon } from '../components/AppIcon';
import { useAppTheme } from '../theme/appTheme';
import { EMPTY_WEEK, useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppMode } from '../navigation/AppModeContext';
import { ActivityLevel, Difficulty, UserProfile, WeightGoal } from '../types/fitness';
import { dailyTargetsForGoal, muscleGainTargets } from '../utils/musclePlan';

const GENDERS: { id: UserProfile['gender']; label: string; emoji: string }[] = [
  { id: 'male', label: 'Male', emoji: '👨' },
  { id: 'female', label: 'Female', emoji: '👩' },
  { id: 'other', label: 'Other', emoji: '🧑' },
];

const GOALS: { id: WeightGoal; emoji: string; title: string; text: string }[] = [
  { id: 'weight_gain', emoji: '💪', title: 'Gain weight & muscle', text: 'Eat in a small surplus and lift to get bigger' },
  { id: 'muscle_gain', emoji: '⚡', title: 'Build muscle, stay lean', text: 'Hold your weight while adding muscle' },
  { id: 'weight_loss', emoji: '🔥', title: 'Lose fat', text: 'Eat in a gentle deficit and keep your muscle' },
  { id: 'maintenance', emoji: '⚖️', title: 'Stay fit & strong', text: 'Keep your weight, build strength and stamina' },
];

const ACTIVITY: { id: ActivityLevel; title: string; text: string }[] = [
  { id: 'sedentary', title: 'Mostly sitting', text: 'Desk job, little walking' },
  { id: 'lightly_active', title: 'Lightly active', text: 'Some walking, on your feet part of the day' },
  { id: 'moderately_active', title: 'Active', text: 'Walk a lot or train 3–4 days a week' },
  { id: 'very_active', title: 'Very active', text: 'Physical job or hard training most days' },
  { id: 'athlete', title: 'Athlete', text: 'Training twice a day or heavy labour' },
];

const LEVELS: { id: Difficulty; title: string; text: string }[] = [
  { id: 'beginner', title: 'Beginner', text: 'New to training or back after a long break' },
  { id: 'intermediate', title: 'Intermediate', text: 'Training regularly for 6+ months' },
  { id: 'advanced', title: 'Advanced', text: '2+ years of consistent hard training' },
];

const STEPS = ['About you', 'Your body', 'Your goal', 'Your lifestyle', 'Your daily targets'];

const toNumber = (text: string) => Number(text.replace(',', '.'));
const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

/**
 * First-run setup for TitanFit: the person enters their own details and gets calorie and macro
 * targets worked out for them. Nothing is pre-filled except the account name.
 */
export function FitnessOnboardingScreen({ accountName }: { accountName: string }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile, hasHistory, weightHistory, updateProfile, logWeight, replaceWeeklySplit, resetFitnessData, setPlanSetupRequested } = useFitnessApp();
  const { setAppMode } = useAppMode();
  const scrollRef = useRef<ScrollView>(null);

  // Older installs may hold records from before onboarding existed: ask once what to do with them.
  const [historyChoice, setHistoryChoice] = useState<'ask' | 'fresh' | 'keep' | 'none'>(hasHistory ? 'ask' : 'none');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(accountName);
  const [gender, setGender] = useState<UserProfile['gender'] | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<WeightGoal | null>(null);
  const [target, setTarget] = useState('');
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);

  const weightKg = toNumber(weight);
  const needsTarget = goal === 'weight_gain' || goal === 'weight_loss';
  const targetKg = needsTarget ? toNumber(target) : weightKg;

  const draft: UserProfile = useMemo(
    () => ({
      ...profile,
      name: name.trim(),
      gender: gender || 'other',
      age: toNumber(age) || 0,
      heightCm: toNumber(height) || 0,
      startWeightKg: weightKg || 0,
      currentWeightKg: weightKg || 0,
      targetWeightKg: targetKg || 0,
      fitnessGoal: goal || 'maintenance',
      activityLevel: activity || 'moderately_active',
      experience: level || 'beginner',
    }),
    [profile, name, gender, age, height, weightKg, targetKg, goal, activity, level]
  );
  const targets = useMemo(() => dailyTargetsForGoal(draft, draft.fitnessGoal), [draft]);
  const maintenance = useMemo(() => muscleGainTargets(draft).maintenanceCalories, [draft]);
  const bmi = draft.heightCm > 0 ? draft.currentWeightKg / (draft.heightCm / 100) ** 2 : 0;
  const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy range' : bmi < 30 ? 'Overweight' : 'Obese range';

  /** What is still missing on the current step, or '' when it is complete. */
  const problem = (): string => {
    if (step === 0) {
      if (!name.trim()) return 'Enter your name.';
      if (!gender) return 'Choose your gender (it changes the calorie maths).';
      if (!inRange(toNumber(age), 13, 90)) return 'Enter your age (13–90).';
    }
    if (step === 1) {
      if (!inRange(toNumber(height), 120, 230)) return 'Enter your height in cm (120–230).';
      if (!inRange(weightKg, 30, 250)) return 'Enter your weight in kg (30–250).';
    }
    if (step === 2) {
      if (!goal) return 'Choose a goal.';
      if (needsTarget) {
        if (!inRange(targetKg, 30, 250)) return 'Enter your target weight in kg.';
        if (goal === 'weight_gain' && targetKg <= weightKg) return `To gain, your target must be above ${weightKg} kg.`;
        if (goal === 'weight_loss' && targetKg >= weightKg) return `To lose, your target must be below ${weightKg} kg.`;
      }
    }
    if (step === 3) {
      if (!activity) return 'Choose how active your day is.';
      if (!level) return 'Choose your training level.';
    }
    return '';
  };

  const goTo = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const finish = async (buildPlan: boolean) => {
    setSaving(true);
    try {
      // Only an explicit "Start fresh" erases records (and replaces the cloud backup).
      if (historyChoice === 'fresh') await resetFitnessData();
      // With no history there is nothing to erase; just drop any preset week from older builds.
      else if (historyChoice === 'none' && !profile.trainingLocation) await replaceWeeklySplit(EMPTY_WEEK);
      await updateProfile({
        name: draft.name,
        gender: draft.gender,
        age: draft.age,
        heightCm: draft.heightCm,
        startWeightKg: draft.startWeightKg,
        currentWeightKg: draft.currentWeightKg,
        targetWeightKg: draft.targetWeightKg,
        fitnessGoal: draft.fitnessGoal,
        activityLevel: draft.activityLevel,
        experience: draft.experience,
        unit: 'kg',
        targetCalories: targets.calories,
        targetProteinGrams: targets.proteinG,
        targetCarbsGrams: targets.carbsG,
        targetFatsGrams: targets.fatsG,
        dailyWaterTargetMl: targets.waterMl,
        onboarded: true,
      });
      if (historyChoice === 'fresh' || weightHistory.length === 0) await logWeight(draft.currentWeightKg, 'Starting weight');
      setPlanSetupRequested(buildPlan);
    } catch {
      setSaving(false);
      Alert.alert('Could not save', 'Something went wrong saving your details. Please try again.');
    }
  };

  const next = () => {
    const issue = problem();
    if (issue) {
      Alert.alert('One more thing', issue);
      return;
    }
    if (step < 4) goTo(step + 1);
  };

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];
  const selected = { borderColor: theme.primary, backgroundColor: theme.primarySoft };
  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }];

  const Radio = ({ on }: { on: boolean }) => (
    <View style={[styles.radio, { borderColor: on ? theme.primary : theme.border }]}>
      {on ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
    </View>
  );

  if (historyChoice === 'ask') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.askBody}>
          <Text style={styles.heroEmoji}>🧹</Text>
          <Text style={[styles.title, { color: theme.text }]}>Set up TitanFit your way</Text>
          <Text style={[styles.lead, { color: theme.muted }]}>
            You'll enter your own details next. This phone already has some TitanFit records (workouts, weigh-ins or meals). What should
            happen to them?
          </Text>
          <TouchableOpacity activeOpacity={0.85} style={[card, styles.optionRow, { borderColor: theme.primary }]} onPress={() => setHistoryChoice('fresh')}>
            <Text style={styles.optionEmoji}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Start fresh</Text>
              <Text style={[styles.optionText, { color: theme.muted }]}>Erase the old TitanFit records and begin from zero</Text>
            </View>
            <AppIcon name="chevron-right" size={14} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={[card, styles.optionRow]} onPress={() => setHistoryChoice('keep')}>
            <Text style={styles.optionEmoji}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>Keep my history</Text>
              <Text style={[styles.optionText, { color: theme.muted }]}>Keep past workouts and logs, just update my details</Text>
            </View>
            <AppIcon name="chevron-right" size={14} color={theme.subtle} />
          </TouchableOpacity>
          <Text style={[styles.hint, { color: theme.subtle }]}>Your Daily Hisab money records are not affected either way.</Text>
          <TouchableOpacity onPress={() => setAppMode('hisab')} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.muted }]}>‹ Back to Daily Hisab</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => goTo(step - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Back">
            <AppIcon name="chevron-left" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setAppMode('hisab')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Back to Daily Hisab">
            <Text style={[styles.exitText, { color: theme.muted }]}>‹ Hisab</Text>
          </TouchableOpacity>
        )}
        <View style={styles.dots}>
          {STEPS.map((label, i) => (
            <View key={label} style={[styles.dot, { backgroundColor: i <= step ? theme.primary : theme.surfaceAlt, flex: i === step ? 2 : 1 }]} />
          ))}
        </View>
        <Text style={[styles.stepCount, { color: theme.subtle }]}>
          {step + 1}/{STEPS.length}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: theme.primary }]}>{step === 0 ? 'WELCOME TO TITANFIT' : STEPS[step].toUpperCase()}</Text>

        {step === 0 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Let's set you up</Text>
            <Text style={[styles.lead, { color: theme.muted }]}>
              A few details about you, and we'll work out your calories, protein and a workout plan. Nothing is pre-filled: it's all yours.
            </Text>
            <Text style={[styles.label, { color: theme.muted }]}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sourav"
              placeholderTextColor={theme.subtle}
              style={inputStyle}
              autoCapitalize="words"
              maxLength={40}
            />
            <Text style={[styles.label, { color: theme.muted }]}>Gender</Text>
            <View style={styles.row}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g.id} activeOpacity={0.8} onPress={() => { Keyboard.dismiss(); setGender(g.id); }} style={[card, styles.genderCard, gender === g.id && selected]}>
                  <Text style={styles.genderEmoji}>{g.emoji}</Text>
                  <Text style={[styles.genderLabel, { color: gender === g.id ? theme.primary : theme.text }]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: theme.muted }]}>Age</Text>
            <View style={styles.unitRow}>
              <TextInput value={age} onChangeText={setAge} placeholder="Years" placeholderTextColor={theme.subtle} style={[inputStyle, styles.unitInput]} keyboardType="number-pad" maxLength={2} />
              <Text style={[styles.unit, { color: theme.muted }]}>years</Text>
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Height and weight</Text>
            <Text style={[styles.lead, { color: theme.muted }]}>These set your calorie needs. Weigh yourself in the morning for the most accurate number.</Text>
            <Text style={[styles.label, { color: theme.muted }]}>Height</Text>
            <View style={styles.unitRow}>
              <TextInput value={height} onChangeText={setHeight} placeholder="e.g. 172" placeholderTextColor={theme.subtle} style={[inputStyle, styles.unitInput]} keyboardType="decimal-pad" maxLength={5} />
              <Text style={[styles.unit, { color: theme.muted }]}>cm</Text>
            </View>
            <Text style={[styles.label, { color: theme.muted }]}>Current weight</Text>
            <View style={styles.unitRow}>
              <TextInput value={weight} onChangeText={setWeight} placeholder="e.g. 68.5" placeholderTextColor={theme.subtle} style={[inputStyle, styles.unitInput]} keyboardType="decimal-pad" maxLength={5} />
              <Text style={[styles.unit, { color: theme.muted }]}>kg</Text>
            </View>
            {bmi > 0 && inRange(weightKg, 30, 250) ? (
              <View style={[card, styles.bmiCard]}>
                <Text style={[styles.bmiValue, { color: theme.primary }]}>{bmi.toFixed(1)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>Your BMI · {bmiLabel}</Text>
                  <Text style={[styles.optionText, { color: theme.muted }]}>A rough guide only; it can't tell muscle from fat.</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>What do you want to achieve?</Text>
            <Text style={[styles.lead, { color: theme.muted }]}>Your calories, workouts and progress tracking follow this. You can change it anytime.</Text>
            {GOALS.map(g => (
              <TouchableOpacity key={g.id} activeOpacity={0.8} onPress={() => { Keyboard.dismiss(); setGoal(g.id); }} style={[card, styles.optionRow, goal === g.id && selected]}>
                <Text style={styles.optionEmoji}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{g.title}</Text>
                  <Text style={[styles.optionText, { color: theme.muted }]}>{g.text}</Text>
                </View>
                <Radio on={goal === g.id} />
              </TouchableOpacity>
            ))}
            {needsTarget ? (
              <>
                <Text style={[styles.label, { color: theme.muted }]}>Target weight (you're {weightKg} kg now)</Text>
                <View style={styles.unitRow}>
                  <TextInput
                    value={target}
                    onChangeText={setTarget}
                    placeholder={goal === 'weight_gain' ? `e.g. ${Math.round(weightKg + 5)}` : `e.g. ${Math.round(weightKg - 5)}`}
                    placeholderTextColor={theme.subtle}
                    style={[inputStyle, styles.unitInput]}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.unit, { color: theme.muted }]}>kg</Text>
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>Your day and your training</Text>
            <Text style={[styles.label, { color: theme.muted }]}>How active is a normal day?</Text>
            {ACTIVITY.map(a => (
              <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={() => setActivity(a.id)} style={[card, styles.optionRow, styles.compact, activity === a.id && selected]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{a.title}</Text>
                  <Text style={[styles.optionText, { color: theme.muted }]}>{a.text}</Text>
                </View>
                <Radio on={activity === a.id} />
              </TouchableOpacity>
            ))}
            <Text style={[styles.label, { color: theme.muted }]}>Your training level</Text>
            {LEVELS.map(l => (
              <TouchableOpacity key={l.id} activeOpacity={0.8} onPress={() => setLevel(l.id)} style={[card, styles.optionRow, styles.compact, level === l.id && selected]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: theme.text }]}>{l.title}</Text>
                  <Text style={[styles.optionText, { color: theme.muted }]}>{l.text}</Text>
                </View>
                <Radio on={level === l.id} />
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Text style={[styles.title, { color: theme.text }]}>You're set, {draft.name.split(/\s+/)[0]}</Text>
            <Text style={[styles.lead, { color: theme.muted }]}>Worked out from your details. Hit these each day and track your weight weekly.</Text>
            <View style={[styles.hero, { backgroundColor: theme.primary }]}>
              <Text style={styles.heroEyebrow}>EAT EVERY DAY</Text>
              <Text style={styles.heroValue}>{targets.calories} kcal</Text>
              <Text style={styles.heroSub}>
                You burn about {maintenance} kcal a day.{' '}
                {targets.calories > maintenance
                  ? `+${targets.calories - maintenance} kcal to gain.`
                  : targets.calories < maintenance
                    ? `−${maintenance - targets.calories} kcal to lose fat steadily.`
                    : 'Eating the same keeps your weight steady.'}
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
              {[
                ['Goal', GOALS.find(g => g.id === draft.fitnessGoal)?.title || ''],
                ['Weight', needsTarget ? `${draft.currentWeightKg} kg → ${draft.targetWeightKg} kg` : `${draft.currentWeightKg} kg`],
                ['Height · Age', `${draft.heightCm} cm · ${draft.age} yrs`],
                ['BMI', `${bmi.toFixed(1)} · ${bmiLabel}`],
                ['Level', LEVELS.find(l => l.id === draft.experience)?.title || ''],
              ].map(([k, v], i) => (
                <View key={k} style={[styles.summaryRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.borderSoft }]}>
                  <Text style={[styles.summaryKey, { color: theme.muted }]}>{k}</Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>{v}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.hint, { color: theme.subtle }]}>
              General guidance for healthy adults, not medical advice. You can edit all of this later in Profile.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.borderSoft, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {saving ? (
          <ActivityIndicator color={theme.primary} style={{ paddingVertical: 14 }} />
        ) : step < 4 ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85} onPress={next}>
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85} onPress={() => finish(true)}>
              <Text style={styles.primaryText}>Next: build my workout plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipBtn} activeOpacity={0.7} onPress={() => finish(false)}>
              <Text style={[styles.skipText, { color: theme.muted }]}>Skip, I'll do it later</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, height: 52 },
  dots: { flex: 1, flexDirection: 'row', gap: 6 },
  dot: { height: 5, borderRadius: 3 },
  stepCount: { fontSize: 12, fontWeight: '800' },
  exitText: { fontSize: 13, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },
  lead: { fontSize: 14.5, lineHeight: 21, marginTop: 8, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unitInput: { flex: 1 },
  unit: { fontSize: 15, fontWeight: '800', width: 48 },
  card: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 10 },
  genderCard: { flex: 1, alignItems: 'center', paddingVertical: 16, marginBottom: 0 },
  genderEmoji: { fontSize: 28 },
  genderLabel: { fontSize: 14, fontWeight: '800', marginTop: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compact: { paddingVertical: 12, marginBottom: 8 },
  optionEmoji: { fontSize: 28 },
  optionTitle: { fontSize: 15.5, fontWeight: '800' },
  optionText: { fontSize: 12.5, lineHeight: 18, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  bmiCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 },
  bmiValue: { fontSize: 30, fontWeight: '900' },
  hero: { borderRadius: 20, padding: 18, marginTop: 14, marginBottom: 12 },
  heroEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  heroValue: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 13, lineHeight: 19, marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  macroTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  macroValue: { color: '#ffffff', fontSize: 15, fontWeight: '900' },
  macroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', marginTop: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: 12 },
  summaryKey: { fontSize: 13, fontWeight: '700' },
  summaryValue: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 6, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  primaryBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, fontWeight: '700' },
  askBody: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  heroEmoji: { fontSize: 44, marginBottom: 8 },
});
