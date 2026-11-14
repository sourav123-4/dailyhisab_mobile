import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { MUSCLE_GROUPS_META } from '../data/exercisesData';
import { ExerciseVisualCard } from '../components/ExerciseVisualCard';
import { VoiceWorkoutModal } from '../components/VoiceWorkoutModal';
import { FoodScannerModal } from '../components/FoodScannerModal';
import { MuscleGainPlanModal } from '../components/MuscleGainPlanModal';
import { WorkoutSetupModal } from '../components/WorkoutSetupModal';
import { describeSetup } from '../utils/workoutPlanner';
import { BodyStatsCard } from '../components/BodyStatsCard';
import { AppIcon, IconName } from '../components/AppIcon';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { Exercise } from '../types/fitness';
import { formatRecordDate, localDateISO } from '../utils/date';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WATER_STEP_ML = 250;

/** Dates (YYYY-MM-DD) of the current Sunday-to-Saturday week, matching the split's day indexes. */
function currentWeekDates() {
  const now = new Date();
  return DAYS_SHORT.map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + index);
    return localDateISO(date);
  });
}

// Softer than pure blue/amber/pink so the bars are easy to read on both themes.
export const MACRO_COLORS = { protein: '#2DB3A6', carbs: '#D9B45A', fats: '#D98AB0' };

const formatVolume = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`);

export const TodayWorkoutScreen = ({ navigation }: any) => {
  const theme = useAppTheme();
  const {
    weeklySplit,
    activeWorkout,
    startWorkout,
    profile,
    exercises,
    workoutHistory,
    sendAICoachQuery,
    logWeight,
    logWater,
    totalConsumedCalories,
    totalConsumedProtein,
    totalConsumedCarbs,
    totalConsumedFats,
    isLoading,
    planSetupRequested,
    setPlanSetupRequested,
  } = useFitnessApp();

  const todayIndex = new Date().getDay();
  const todayISO = localDateISO();
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [foodScannerVisible, setFoodScannerVisible] = useState(false);
  const [planVisible, setPlanVisible] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);

  // Straight after onboarding, open the plan builder once.
  useEffect(() => {
    if (!planSetupRequested) return;
    setPlanSetupRequested(false);
    setSetupVisible(true);
  }, [planSetupRequested, setPlanSetupRequested]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const selectedDay = weeklySplit.find(d => d.dayIndex === selectedDayIndex) || weeklySplit[0];
  const isToday = selectedDayIndex === todayIndex;
  const hasPlan = weeklySplit.some(d => !d.isRestDay && d.exerciseIds.length > 0);

  const scheduledExercises = useMemo(
    () => selectedDay.exerciseIds.map(id => exercises.find(e => e.id === id)).filter((e): e is Exercise => !!e),
    [selectedDay, exercises]
  );

  // Recomputed when the date changes, e.g. the app stays open past midnight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const weekDates = useMemo(() => currentWeekDates(), [todayISO]);
  const completed = useMemo(() => workoutHistory.filter(w => w.isCompleted), [workoutHistory]);
  const weekStats = useMemo(() => {
    const inWeek = completed.filter(w => weekDates.includes(w.date));
    return {
      trainedDates: new Set(inWeek.map(w => w.date)),
      sessions: inWeek.length,
      minutes: inWeek.reduce((sum, w) => sum + (w.durationMinutes || 0), 0),
      volume: inWeek.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0),
      planned: weeklySplit.filter(d => !d.isRestDay && d.exerciseIds.length > 0).length,
    };
  }, [completed, weekDates, weeklySplit]);
  const recentWorkouts = useMemo(() => [...completed].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3), [completed]);
  const trainedToday = weekStats.trainedDates.has(todayISO);

  const waterToday = profile.waterLogDate === todayISO ? profile.todayWaterMl : 0;
  const estMinutes = Math.max(20, scheduledExercises.length * 8);

  const handleStartWorkout = () => {
    if (!activeWorkout) startWorkout(selectedDay.splitTitle, selectedDay.exerciseIds, selectedDay.targetMuscles, selectedDay.prescriptions);
    navigation.navigate('ActiveWorkout');
  };

  const pct = (value: number, target: number) => (target > 0 ? Math.min(1, value / target) : 0);

  const macroRows: { label: string; value: number; target: number; unit: string; color: string }[] = [
    { label: 'Protein', value: totalConsumedProtein, target: profile.targetProteinGrams, unit: 'g', color: MACRO_COLORS.protein },
    { label: 'Carbs', value: totalConsumedCarbs, target: profile.targetCarbsGrams, unit: 'g', color: MACRO_COLORS.carbs },
    { label: 'Fats', value: totalConsumedFats, target: profile.targetFatsGrams, unit: 'g', color: MACRO_COLORS.fats },
  ];

  const quickActions: { label: string; icon: IconName; tint: string; onPress: () => void }[] = [
    { label: 'Scan food', icon: 'scan', tint: theme.primary, onPress: () => setFoodScannerVisible(true) },
    { label: 'Log weight', icon: 'scale', tint: theme.accent, onPress: () => navigation.navigate('Weight') },
    { label: 'Ask coach', icon: 'spark', tint: '#9C8CE0', onPress: () => navigation.navigate('AICoach') },
    { label: 'Voice log', icon: 'voice', tint: '#5AA9D6', onPress: () => setVoiceModalVisible(true) },
  ];

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];

  if (isLoading) return <TodaySkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeWorkout ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.resumeBanner, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('ActiveWorkout')}
          >
            <View style={styles.liveDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>Workout in progress</Text>
              <Text style={styles.resumeSub} numberOfLines={1}>
                {activeWorkout.title} · {activeWorkout.exercises.length} exercises
              </Text>
            </View>
            <Text style={styles.resumeAction}>Resume ›</Text>
          </TouchableOpacity>
        ) : null}

        {/* Home / gym setup: prompt until done, then a compact row to change it */}
        {!profile.trainingLocation && hasPlan ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setSetupVisible(true)} style={[card, styles.setupPrompt, { borderColor: theme.primary }]}>
            <Text style={styles.planPromoEmoji}>🏠🏋️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Home or gym? Build your plan</Text>
              <Text style={[styles.emptySub, { color: theme.muted, textAlign: 'left', marginTop: 2 }]}>
                Tell us where you train and scan or tick your equipment. We'll make your full weekly plan.
              </Text>
            </View>
            <AppIcon name="chevron-right" size={14} color={theme.primary} />
          </TouchableOpacity>
        ) : null}

        {/* Week strip */}
        <View style={styles.weekRow}>
          {DAYS_SHORT.map((dayName, idx) => {
            const selected = selectedDayIndex === idx;
            const day = weeklySplit.find(d => d.dayIndex === idx);
            const trained = weekStats.trainedDates.has(weekDates[idx]);
            const rest = !day || day.isRestDay || day.exerciseIds.length === 0;
            return (
              <TouchableOpacity
                key={dayName}
                activeOpacity={0.75}
                onPress={() => setSelectedDayIndex(idx)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: selected ? theme.primary : theme.surface,
                    borderColor: selected ? theme.primary : idx === todayIndex ? theme.primary : theme.borderSoft,
                  },
                ]}
                accessibilityLabel={`${dayName}${trained ? ', trained' : rest ? ', rest day' : ''}`}
              >
                <Text style={[styles.dayName, { color: selected ? '#ffffff' : theme.muted }]}>{dayName}</Text>
                <Text style={[styles.dayDate, { color: selected ? '#ffffff' : theme.text }]}>{Number(weekDates[idx].slice(8))}</Text>
                <View
                  style={[
                    styles.dayMark,
                    {
                      backgroundColor: trained ? theme.success : rest ? 'transparent' : selected ? 'rgba(255,255,255,0.6)' : theme.borderSoft,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Plan card */}
        <View style={[styles.planCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.planGlow, { backgroundColor: theme.primary }]} />
          <Text style={[styles.planEyebrow, { color: theme.primary }]}>
            {!hasPlan ? 'GET STARTED' : isToday ? (trainedToday ? 'TODAY · DONE ✓' : "TODAY'S PLAN") : `${selectedDay.dayName.toUpperCase()}'S PLAN`}
          </Text>
          <Text style={[styles.planTitle, { color: theme.text }]} numberOfLines={2}>
            {!hasPlan ? 'No workout plan yet' : selectedDay.isRestDay || scheduledExercises.length === 0 ? 'Rest & recovery' : selectedDay.splitTitle}
          </Text>
          {!hasPlan ? (
            <>
              <Text style={[styles.planMeta, { color: theme.muted }]}>
                Tell us where you train (home or gym) and what equipment you have. We'll build your full week with sets and reps.
              </Text>
              <TouchableOpacity activeOpacity={0.85} style={[styles.planButton, { backgroundColor: theme.primary, marginTop: 14 }]} onPress={() => setSetupVisible(true)}>
                <AppIcon name="plus" size={14} color="#ffffff" />
                <Text style={[styles.planButtonText, { color: '#ffffff' }]}>Build my workout plan</Text>
              </TouchableOpacity>
            </>
          ) : selectedDay.isRestDay || scheduledExercises.length === 0 ? (
            <Text style={[styles.planMeta, { color: theme.muted }]}>Stretch, walk and hydrate. Muscles grow while you recover.</Text>
          ) : (
            <>
              <Text style={[styles.planMeta, { color: theme.muted }]}>
                {scheduledExercises.length} exercises · ~{estMinutes} min
              </Text>
              <View style={styles.muscleRow}>
                {selectedDay.targetMuscles.map(mg => {
                  const meta = MUSCLE_GROUPS_META.find(m => m.id === mg);
                  return (
                    <View key={mg} style={[styles.musclePill, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.musclePillText, { color: theme.primary }]}>{meta?.title || mg}</Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity activeOpacity={0.85} style={[styles.planButton, { backgroundColor: theme.primary }]} onPress={handleStartWorkout}>
                <AppIcon name="play" size={14} color="#ffffff" />
                <Text style={[styles.planButtonText, { color: '#ffffff' }]}>
                  {activeWorkout ? 'Resume workout' : isToday ? 'Start workout' : `Do ${selectedDay.dayName}'s workout now`}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {profile.trainingLocation ? (
          <TouchableOpacity activeOpacity={0.8} onPress={() => setSetupVisible(true)} style={[styles.setupRow, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={styles.setupRowEmoji}>{profile.trainingLocation === 'gym' ? '🏋️' : profile.trainingLocation === 'home' ? '🏠' : '🧰'}</Text>
            <Text style={[styles.setupRowText, { color: theme.text }]} numberOfLines={1}>{describeSetup(profile)}</Text>
            <Text style={[styles.cardLink, { color: theme.primary }]}>Change plan ›</Text>
          </TouchableOpacity>
        ) : null}

        {/* This week */}
        <View style={styles.statsRow}>
          {[
            { label: 'Streak', value: `${profile.streakDays}d`, icon: 'flame' as IconName, tint: theme.primary },
            { label: 'This week', value: `${weekStats.sessions}/${weekStats.planned || 0}`, icon: 'dumbbell' as IconName, tint: theme.primary },
            { label: 'Volume', value: formatVolume(weekStats.volume), icon: 'reports' as IconName, tint: theme.accent },
          ].map(stat => (
            <View key={stat.label} style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.tint}22` }]}>
                <AppIcon name={stat.icon} size={18} color={stat.tint} />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.subtle }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {quickActions.map(action => (
            <TouchableOpacity key={action.label} style={styles.quickItem} activeOpacity={0.75} onPress={action.onPress}>
              <View style={[styles.quickIcon, { backgroundColor: `${action.tint}1f`, borderColor: `${action.tint}40` }]}>
                <AppIcon name={action.icon} size={18} color={action.tint} />
              </View>
              <Text style={[styles.quickLabel, { color: theme.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <BodyStatsCard />

        {/* Muscle gain plan: only when gaining is the goal */}
        {profile.fitnessGoal === 'weight_gain' ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => setPlanVisible(true)} style={[card, styles.planPromo]}>
          <Text style={styles.planPromoEmoji}>💪</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Muscle gain plan</Text>
            <Text style={[styles.emptySub, { color: theme.muted, textAlign: 'left', marginTop: 2 }]}>
              Your calories, protein, meals and weekly workouts, worked out for your body
            </Text>
          </View>
          <AppIcon name="chevron-right" size={14} color={theme.subtle} />
        </TouchableOpacity>
        ) : null}

        {/* Nutrition */}
        <View style={card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Nutrition today</Text>
            <TouchableOpacity onPress={() => setFoodScannerVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.cardLink, { color: theme.primary }]}>Log food ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calorieRow}>
            <Text style={[styles.calorieValue, { color: theme.text }]}>{Math.round(totalConsumedCalories)}</Text>
            <Text style={[styles.calorieTarget, { color: theme.subtle }]}> / {profile.targetCalories} kcal</Text>
            <Text style={[styles.calorieLeft, { color: theme.muted }]}>
              {Math.max(0, profile.targetCalories - Math.round(totalConsumedCalories))} left
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${pct(totalConsumedCalories, profile.targetCalories) * 100}%`, backgroundColor: theme.primary }]} />
          </View>
          <View style={styles.macroRow}>
            {macroRows.map(m => (
              <View key={m.label} style={styles.macroCol}>
                <Text style={[styles.macroLabel, { color: theme.subtle }]}>{m.label}</Text>
                <Text style={[styles.macroValue, { color: theme.text }]}>
                  {Math.round(m.value)}
                  <Text style={{ color: theme.subtle, fontWeight: '600' }}>/{m.target}{m.unit}</Text>
                </Text>
                <View style={[styles.trackThin, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={[styles.fill, { width: `${pct(m.value, m.target) * 100}%`, backgroundColor: m.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Water */}
        <View style={[card, styles.waterCard]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(14,165,233,0.14)' }]}>
            <Text style={{ fontSize: 15 }}>💧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {(waterToday / 1000).toFixed(2).replace(/\.?0+$/, '')} L
              <Text style={{ color: theme.subtle, fontWeight: '600', fontSize: 13 }}> / {(profile.dailyWaterTargetMl / 1000).toFixed(1)} L water</Text>
            </Text>
            <View style={[styles.trackThin, { backgroundColor: theme.surfaceAlt, marginTop: 8 }]}>
              <View style={[styles.fill, { width: `${pct(waterToday, profile.dailyWaterTargetMl) * 100}%`, backgroundColor: '#5AA9D6' }]} />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.waterButton, { backgroundColor: '#5AA9D6' }]}
            activeOpacity={0.8}
            onPress={() => logWater(WATER_STEP_ML)}
            accessibilityLabel="Add a glass of water"
          >
            <Text style={styles.waterButtonText}>+250 ml</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises for the selected day */}
        {scheduledExercises.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Exercises · {scheduledExercises.length}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MuscleExplore')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.cardLink, { color: theme.primary }]}>Browse all ›</Text>
              </TouchableOpacity>
            </View>
            {scheduledExercises.map(exercise => (
              <ExerciseVisualCard
                key={exercise.id}
                exercise={exercise}
                prescription={selectedDay.prescriptions?.[exercise.id]}
                onPress={() => setSelectedExercise(exercise)}
              />
            ))}
          </>
        ) : null}

        {/* Recent workouts */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent workouts</Text>
        </View>
        {recentWorkouts.length === 0 ? (
          <View style={[card, styles.emptyCard]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No workouts yet</Text>
            <Text style={[styles.emptySub, { color: theme.muted }]}>Finish your first session and it will show up here.</Text>
          </View>
        ) : (
          recentWorkouts.map(w => (
            <View key={w.id} style={[card, styles.historyRow]}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.primary}22` }]}>
                <AppIcon name="dumbbell" size={15} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>{w.title}</Text>
                <Text style={[styles.historyMeta, { color: theme.subtle }]}>
                  {formatRecordDate(w.date).label} · {w.durationMinutes} min · {w.exercises.length} exercises
                </Text>
              </View>
              <Text style={[styles.historyVolume, { color: theme.text }]}>{formatVolume(w.totalVolumeKg)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <VoiceWorkoutModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onProcessAIQuery={sendAICoachQuery}
        onParsedWeight={logWeight}
      />

      <FoodScannerModal visible={foodScannerVisible} onClose={() => setFoodScannerVisible(false)} />
      <MuscleGainPlanModal visible={planVisible} onClose={() => setPlanVisible(false)} />
      <WorkoutSetupModal visible={setupVisible} onClose={() => setSetupVisible(false)} />

      {selectedExercise ? (
        <ExerciseDetailModal visible exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />
      ) : null}
    </View>
  );
};

/** Same layout as the dashboard, so nothing jumps when the saved numbers arrive. */
function TodaySkeleton() {
  const theme = useAppTheme();
  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];
  return (
    <SkeletonGroup style={[styles.container, styles.scrollContent, { backgroundColor: theme.bg }]}>
      <View style={styles.weekRow}>
        {DAYS_SHORT.map(day => (
          <Skeleton key={day} height={58} radius={14} style={{ flex: 1 }} width={undefined} />
        ))}
      </View>
      <Skeleton height={168} radius={22} style={{ marginBottom: 14 }} />
      <View style={styles.statsRow}>
        {[0, 1, 2].map(i => (
          <Skeleton key={i} height={92} radius={16} style={{ flex: 1 }} width={undefined} />
        ))}
      </View>
      <View style={styles.quickRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.quickItem}>
            <Skeleton width={50} height={50} radius={16} />
            <Skeleton width={46} height={9} />
          </View>
        ))}
      </View>
      <View style={card}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="60%" height={26} style={{ marginTop: 12 }} />
        <Skeleton height={10} style={{ marginTop: 10 }} />
        <View style={styles.macroRow}>
          {[0, 1, 2].map(i => (
            <Skeleton key={i} height={30} style={{ flex: 1 }} width={undefined} />
          ))}
        </View>
      </View>
      <Skeleton height={64} radius={18} />
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff' },
  resumeTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  resumeSub: { color: '#ffffff', opacity: 0.9, fontSize: 12, marginTop: 1 },
  resumeAction: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 14 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayName: { fontSize: 10.5, fontWeight: '700' },
  dayDate: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  dayMark: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  planCard: { borderRadius: 22, borderWidth: 1, padding: 18, overflow: 'hidden', marginBottom: 14 },
  planGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#ffffff',
    opacity: 0.07,
    top: -80,
    right: -60,
  },
  planEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  planTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 4, letterSpacing: -0.4 },
  planMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  musclePill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  musclePillText: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  planButton: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  planButtonText: { fontSize: 15, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statTile: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  statLabel: { fontSize: 11.5, fontWeight: '600', marginTop: 1 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11.5, fontWeight: '700' },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardLink: { fontSize: 13, fontWeight: '700' },
  calorieRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
  calorieValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  calorieTarget: { fontSize: 13, fontWeight: '600' },
  calorieLeft: { marginLeft: 'auto', fontSize: 12.5, fontWeight: '700' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  trackThin: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 5 },
  fill: { height: '100%', borderRadius: 5 },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  macroCol: { flex: 1 },
  macroLabel: { fontSize: 11.5, fontWeight: '700' },
  macroValue: { fontSize: 13.5, fontWeight: '800', marginTop: 2 },
  planPromo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  setupPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, marginBottom: 12 },
  setupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 12, marginBottom: 14 },
  setupRowEmoji: { fontSize: 18 },
  setupRowText: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  planPromoEmoji: { fontSize: 28 },
  waterCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterButton: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  waterButtonText: { color: '#ffffff', fontSize: 12.5, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  emptyCard: { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '800' },
  emptySub: { fontSize: 12.5, marginTop: 4, textAlign: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  historyTitle: { fontSize: 14, fontWeight: '800' },
  historyMeta: { fontSize: 12, marginTop: 2 },
  historyVolume: { fontSize: 13, fontWeight: '800' },
});
