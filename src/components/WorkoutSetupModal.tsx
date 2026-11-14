import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAppTheme } from '../theme/appTheme';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { Difficulty, GearId, TrainingLocation, WeightGoal } from '../types/fitness';
import { EXERCISES_DATABASE, MUSCLE_GROUPS_META } from '../data/exercisesData';
import {
  ALL_GEAR,
  GEAR_OPTIONS,
  buildWeeklyPlan,
  canDoExercise,
  describeSetup,
  gearForProfile,
  planToSplit,
  recommendedDays,
  defaultTrainingDays,
} from '../utils/workoutPlanner';
import { dailyTargetsForGoal } from '../utils/musclePlan';
import { EquipmentScanUnavailableError, scanEquipmentPhoto } from '../services/equipmentScanService';
import { AppIcon } from './AppIcon';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STEP_TITLES = ['Where do you train?', 'What equipment do you have?', 'Your schedule & goal', 'Your full plan'];

const LOCATIONS: { id: TrainingLocation; emoji: string; title: string; text: string }[] = [
  { id: 'home', emoji: '🏠', title: 'Home workout', text: 'Bodyweight plus whatever you have at home' },
  { id: 'gym', emoji: '🏋️', title: 'Gym', text: 'Dumbbells, barbells, benches, cables and machines' },
  { id: 'other', emoji: '🧰', title: 'Whatever I have', text: 'Park, hostel, office or travel: pick your equipment' },
];

const GOALS: { id: WeightGoal; label: string; emoji: string }[] = [
  { id: 'weight_gain', label: 'Gain weight & muscle', emoji: '💪' },
  { id: 'muscle_gain', label: 'Build muscle, stay lean', emoji: '⚡' },
  { id: 'weight_loss', label: 'Lose fat', emoji: '🔥' },
  { id: 'maintenance', label: 'Stay fit & strong', emoji: '⚖️' },
];

const LEVELS: { id: Difficulty; label: string; text: string }[] = [
  { id: 'beginner', label: 'Beginner', text: 'New or back after a break' },
  { id: 'intermediate', label: 'Intermediate', text: '6+ months of regular training' },
  { id: 'advanced', label: 'Advanced', text: '2+ years, training hard' },
];

/** Home / gym / own-equipment flow that builds and applies a full weekly workout plan. */
export function WorkoutSetupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, replaceWeeklySplit } = useFitnessApp();

  const [step, setStep] = useState(0);
  const [location, setLocation] = useState<TrainingLocation>(profile.trainingLocation || 'home');
  // A first-time setup starts with nothing ticked; after that, with the saved equipment.
  const savedGear = () => (profile.trainingLocation ? gearForProfile(profile) : []);
  const [gear, setGear] = useState<GearId[]>(savedGear);
  // The weekdays the person trains (0 = Sunday); everything else is a rest day.
  const savedDays = () =>
    profile.trainingDayIndexes?.length
      ? profile.trainingDayIndexes
      : defaultTrainingDays(profile.trainingDaysPerWeek || recommendedDays(profile.experience));
  const [trainingDays, setTrainingDays] = useState<number[]>(savedDays);
  const days = trainingDays.length;
  const [goal, setGoal] = useState<WeightGoal>(profile.fitnessGoal);
  const [level, setLevel] = useState<Difficulty>(profile.experience);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);


  // Start from the saved setup each time the flow opens.
  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setLocation(profile.trainingLocation || 'home');
    setGear(savedGear());
    setTrainingDays(savedDays());
    setGoal(profile.fitnessGoal);
    setLevel(profile.experience);
    setFound([]);
    setOpenDay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const plan = useMemo(
    () => buildWeeklyPlan({ gear, days, goal, experience: level, location, trainingDays }),
    [gear, days, goal, level, location, trainingDays]
  );

  const toggleTrainingDay = (dayIndex: number) => {
    const on = trainingDays.includes(dayIndex);
    if (on && trainingDays.length <= 2) {
      Alert.alert('At least 2 days', 'Train at least 2 days a week to make progress.');
      return;
    }
    if (!on && trainingDays.length >= 6) {
      Alert.alert('Keep a rest day', 'Muscles grow while you rest, so keep at least one rest day a week.');
      return;
    }
    setTrainingDays(prev => (on ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]));
  };
  const available = useMemo(() => EXERCISES_DATABASE.filter(e => canDoExercise(e.id, gear)).length, [gear]);
  const targets = useMemo(() => dailyTargetsForGoal({ ...profile, experience: level, fitnessGoal: goal }, goal), [profile, level, goal]);

  // Each step starts at the top, not where the previous step was scrolled to.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // Open the first workout day of the plan so the exercises are visible straight away.
    if (step === 3) setOpenDay([1, 2, 3, 4, 5, 6, 0].find(i => plan.days[i] !== null) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const chooseLocation = (id: TrainingLocation) => {
    setLocation(id);
    if (id === 'gym') setGear(ALL_GEAR);
    else if (location === 'gym') setGear([]);
  };

  const toggleGear = (id: GearId) => setGear(prev => (prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]));

  const scan = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', `Allow ${fromCamera ? 'camera' : 'photo'} access in Settings to scan your equipment.`);
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled || !result.assets?.length) return;

      setScanning(true);
      const context = ImageManipulator.manipulate(result.assets[0].uri);
      context.resize({ width: 896, height: null });
      const rendered = await context.renderAsync();
      const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const res = await scanEquipmentPhoto(small.base64 || '');

      if (!res.items.length) {
        Alert.alert('No equipment found', `This looks like ${res.seen || 'something else'}. Take a clear photo of your equipment, or tick it below.`);
        return;
      }
      setFound(prev => [...new Set([...prev, ...res.items])]);
      setGear(prev => [...new Set([...prev, ...res.gear])]);
      const added = res.gear.map(g => GEAR_OPTIONS.find(o => o.id === g)?.label).filter(Boolean);
      Alert.alert(
        'Equipment found ✅',
        `${res.items.join(', ')}.${added.length ? `\n\nTicked: ${added.join(', ')}.` : '\n\nNothing new to add; bodyweight moves are always included.'}\n\nScan another photo for more, or adjust the list.`
      );
    } catch (e) {
      Alert.alert(
        "Couldn't scan",
        e instanceof EquipmentScanUnavailableError ? e.message : 'Could not read this photo. Try again in good light, or tick your equipment below.'
      );
    } finally {
      setScanning(false);
    }
  };

  const apply = () => {
    Alert.alert('Use this plan?', `Your weekly workouts will be replaced with ${plan.name}, and your daily target becomes ${targets.calories} kcal with ${targets.proteinG} g protein.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Use plan',
        onPress: async () => {
          await updateProfile({
            trainingLocation: location,
            gear,
            trainingDaysPerWeek: days,
            trainingDayIndexes: trainingDays,
            fitnessGoal: goal,
            experience: level,
            targetCalories: targets.calories,
            targetProteinGrams: targets.proteinG,
            targetCarbsGrams: targets.carbsG,
            targetFatsGrams: targets.fatsG,
            dailyWaterTargetMl: targets.waterMl,
          });
          await replaceWeeklySplit(planToSplit(plan));
          onClose();
          Alert.alert('Plan ready ✅', 'Today now shows each day\'s workout with sets and reps. Tap a day in the week strip to see it, and Start workout when it\'s time.');
        },
      },
    ]);
  };

  const next = () => setStep(s => Math.min(3, s + 1));
  const back = () => (step === 0 ? onClose() : setStep(s => s - 1));
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];
  const selectedStyle = { borderColor: theme.primary, backgroundColor: theme.primarySoft };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          <TouchableOpacity onPress={back} style={styles.headerBtn} accessibilityLabel="Back" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppIcon name="chevron-left" size={20} color={theme.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stepLabel, { color: theme.subtle }]}>STEP {step + 1} OF 4</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{STEP_TITLES[step]}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Close">
            <Text style={[styles.close, { color: theme.subtle }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceAlt }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${((step + 1) / 4) * 100}%` }]} />
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
          {step === 0 ? (
            <>
              <Text style={[styles.intro, { color: theme.muted }]}>We'll build your whole week of workouts around the place and equipment you really have.</Text>
              {LOCATIONS.map(loc => (
                <TouchableOpacity
                  key={loc.id}
                  activeOpacity={0.8}
                  onPress={() => chooseLocation(loc.id)}
                  style={[card, styles.optionRow, location === loc.id && selectedStyle]}
                >
                  <Text style={styles.optionEmoji}>{loc.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionTitle, { color: theme.text }]}>{loc.title}</Text>
                    <Text style={[styles.optionText, { color: theme.muted }]}>{loc.text}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: location === loc.id ? theme.primary : theme.border }]}>
                    {location === loc.id ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <View style={[card, { borderColor: theme.primary }]}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>📷 Scan your equipment</Text>
                <Text style={[styles.optionText, { color: theme.muted, marginTop: 4 }]}>
                  Take a photo of your dumbbells, bench, bar or gym and we'll tick what we see. Scan as many photos as you like.
                </Text>
                {scanning ? (
                  <View style={styles.scanningRow}>
                    <ActivityIndicator color={theme.primary} />
                    <Text style={[styles.optionText, { color: theme.muted }]}>Looking at your equipment…</Text>
                  </View>
                ) : (
                  <View style={styles.scanRow}>
                    <TouchableOpacity style={[styles.scanBtn, { backgroundColor: theme.primary }]} onPress={() => scan(true)} activeOpacity={0.85}>
                      <Text style={styles.scanBtnText}>Take photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.scanBtn, styles.scanBtnAlt, { borderColor: theme.primary }]} onPress={() => scan(false)} activeOpacity={0.85}>
                      <Text style={[styles.scanBtnText, { color: theme.primary }]}>From gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {found.length ? (
                  <Text style={[styles.found, { color: theme.success }]}>Found: {found.join(', ')}</Text>
                ) : null}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Or tick what you have</Text>
              <Text style={[styles.optionText, { color: theme.muted, marginBottom: 8 }]}>
                Bodyweight exercises (floor, chair, towel) are always included.
              </Text>
              {GEAR_OPTIONS.map(option => {
                const on = gear.includes(option.id);
                return (
                  <TouchableOpacity key={option.id} activeOpacity={0.8} onPress={() => toggleGear(option.id)} style={[card, styles.optionRow, on && selectedStyle]}>
                    <Text style={styles.gearEmoji}>{option.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gearTitle, { color: theme.text }]}>{option.label}</Text>
                      <Text style={[styles.optionText, { color: theme.muted }]}>{option.hint}</Text>
                    </View>
                    <View style={[styles.check, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : 'transparent' }]}>
                      {on ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={[styles.countNote, { color: theme.subtle }]}>
                With this you can do {available} of {EXERCISES_DATABASE.length} exercises in the library.
              </Text>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 4 }]}>Which days will you train?</Text>
              <Text style={[styles.optionText, { color: theme.muted, marginBottom: 10 }]}>
                Tap a day to switch it between workout and rest. Pick the days that suit your week.
              </Text>
              <View style={styles.weekRow}>
                {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                  const on = trainingDays.includes(dayIndex);
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      onPress={() => toggleTrainingDay(dayIndex)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${DAYS[dayIndex]}: ${on ? 'workout' : 'rest'}`}
                      style={[
                        styles.weekDay,
                        { borderColor: on ? theme.primary : theme.borderSoft, backgroundColor: on ? theme.primary : theme.surface },
                      ]}
                    >
                      <Text style={[styles.weekDayName, { color: on ? '#ffffff' : theme.text }]}>{DAYS[dayIndex]}</Text>
                      <Text style={[styles.weekDayTag, { color: on ? 'rgba(255,255,255,0.85)' : theme.subtle }]}>{on ? 'Train' : 'Rest'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.optionText, { color: theme.muted, marginTop: 10 }]}>
                {days} days a week · {plan.name.split(' · ')[0]}. Recommended for {level}s: {recommendedDays(level)} days.
              </Text>
              <View style={[styles.chipRow, { marginTop: 10 }]}>
                {[3, 4, 5].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setTrainingDays(defaultTrainingDays(n))}
                    activeOpacity={0.8}
                    style={[styles.presetChip, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}
                  >
                    <Text style={[styles.presetText, { color: theme.primary }]}>Usual {n} days</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your goal</Text>
              {GOALS.map(g => (
                <TouchableOpacity key={g.id} onPress={() => setGoal(g.id)} activeOpacity={0.8} style={[card, styles.optionRow, goal === g.id && selectedStyle]}>
                  <Text style={styles.gearEmoji}>{g.emoji}</Text>
                  <Text style={[styles.gearTitle, { color: theme.text, flex: 1 }]}>{g.label}</Text>
                  <View style={[styles.radio, { borderColor: goal === g.id ? theme.primary : theme.border }]}>
                    {goal === g.id ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                  </View>
                </TouchableOpacity>
              ))}

              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your level</Text>
              {LEVELS.map(l => (
                <TouchableOpacity key={l.id} onPress={() => setLevel(l.id)} activeOpacity={0.8} style={[card, styles.optionRow, level === l.id && selectedStyle]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.gearTitle, { color: theme.text }]}>{l.label}</Text>
                    <Text style={[styles.optionText, { color: theme.muted }]}>{l.text}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: level === l.id ? theme.primary : theme.border }]}>
                    {level === l.id ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={[styles.hero, { backgroundColor: theme.primary }]}>
                <Text style={styles.heroEyebrow}>YOUR PLAN</Text>
                <Text style={styles.heroTitle}>{plan.name}</Text>
                <Text style={styles.heroSub}>{describeSetup({ trainingLocation: location, gear })}</Text>
                <Text style={styles.heroSub}>
                  {GOALS.find(g => g.id === goal)?.label} · {level} · eat {targets.calories} kcal, {targets.proteinG} g protein a day
                </Text>
              </View>

              {/* Monday first, matching the day picker. */}
              {[1, 2, 3, 4, 5, 6, 0].map(index => {
                const day = plan.days[index];
                const open = openDay === index;
                return (
                  <View key={DAYS[index]} style={card}>
                    <TouchableOpacity style={styles.dayHeader} activeOpacity={0.7} disabled={!day} onPress={() => setOpenDay(open ? null : index)}>
                      <View style={[styles.dayBadge, { backgroundColor: day ? theme.primarySoft : theme.surfaceAlt }]}>
                        <Text style={[styles.dayBadgeText, { color: day ? theme.primary : theme.subtle }]}>{DAYS[index]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gearTitle, { color: day ? theme.text : theme.subtle }]}>{day ? day.title : 'Rest & recovery'}</Text>
                        <Text style={[styles.optionText, { color: theme.subtle }]}>
                          {day
                            ? `${day.exercises.length} exercises · ~${Math.max(25, day.exercises.length * 8)} min`
                            : goal === 'weight_loss'
                              ? 'Walk 30–45 min, stretch'
                              : 'Light walk and stretching'}
                        </Text>
                      </View>
                      {day ? <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={theme.subtle} /> : null}
                    </TouchableOpacity>
                    {day && open
                      ? day.exercises.map((ex, i) => (
                          <View key={ex.id} style={[styles.exerciseRow, { borderTopColor: theme.borderSoft }]}>
                            <Text style={[styles.exerciseIndex, { color: theme.subtle }]}>{i + 1}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.exerciseName, { color: theme.text }]} numberOfLines={1}>{ex.name}</Text>
                              <Text style={[styles.exerciseGroup, { color: theme.subtle }]}>
                                {MUSCLE_GROUPS_META.find(m => m.id === ex.muscleGroup)?.title || ex.muscleGroup}
                              </Text>
                            </View>
                            <Text style={[styles.exerciseSets, { color: theme.primary }]}>{ex.prescription}</Text>
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}

              <Text style={[styles.sectionTitle, { color: theme.text }]}>How to follow it</Text>
              <View style={card}>
                {plan.notes.map((note, i) => (
                  <Text key={note} style={[styles.note, { color: theme.muted }]}>
                    <Text style={{ color: theme.primary, fontWeight: '800' }}>{i + 1}. </Text>
                    {note}
                  </Text>
                ))}
              </View>
              {goal === 'weight_gain' ? (
                <Text style={[styles.optionText, { color: theme.subtle, marginTop: 8 }]}>
                  Your meals for gaining are in the Muscle Gain plan on the Today screen.
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.borderSoft, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: scanning ? 0.5 : 1 }]}
            activeOpacity={0.85}
            disabled={scanning}
            onPress={step === 3 ? apply : next}
          >
            <Text style={styles.primaryText}>{step === 2 ? 'Build my plan' : step === 3 ? 'Use this plan' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingHorizontal: 16, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 28, height: 36, justifyContent: 'center' },
  stepLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { fontSize: 17, fontWeight: '900' },
  close: { fontSize: 18, paddingHorizontal: 4 },
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  content: { padding: 16 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionEmoji: { fontSize: 30 },
  optionTitle: { fontSize: 16, fontWeight: '800' },
  optionText: { fontSize: 12.5, lineHeight: 18 },
  gearEmoji: { fontSize: 22 },
  gearTitle: { fontSize: 14.5, fontWeight: '800' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  scanRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  scanBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  scanBtnAlt: { borderWidth: 1.5, backgroundColor: 'transparent' },
  scanBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  found: { fontSize: 12.5, fontWeight: '700', marginTop: 10, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 16, marginBottom: 8 },
  countNote: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 10 },
  weekRow: { flexDirection: 'row', gap: 6 },
  weekDay: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  weekDayName: { fontSize: 13, fontWeight: '900' },
  weekDayTag: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  presetChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  presetText: { fontSize: 12, fontWeight: '800' },
  dayChip: { flex: 1, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  dayChipText: { fontSize: 17, fontWeight: '900' },
  hero: { borderRadius: 18, padding: 16, marginBottom: 12 },
  heroEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, lineHeight: 18 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 13, fontWeight: '900' },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingVertical: 10, marginTop: 8 },
  exerciseIndex: { width: 16, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  exerciseName: { fontSize: 14, fontWeight: '700' },
  exerciseGroup: { fontSize: 11, marginTop: 1 },
  exerciseSets: { fontSize: 12.5, fontWeight: '800', maxWidth: 130, textAlign: 'right' },
  note: { fontSize: 13, lineHeight: 19, marginBottom: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  primaryBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
