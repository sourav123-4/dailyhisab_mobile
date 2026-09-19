import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { MUSCLE_ANATOMY_IMAGES, MUSCLE_GROUPS_META } from '../data/exercisesData';
import { ExerciseVisualCard } from '../components/ExerciseVisualCard';
import { VoiceWorkoutModal } from '../components/VoiceWorkoutModal';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { Exercise } from '../types/fitness';
import { useAppMode } from '../navigation/AppModeContext';

export const TodayWorkoutScreen = ({ navigation }: any) => {
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const {
    weeklySplit,
    activeWorkout,
    startWorkout,
    profile,
    exercises,
    workoutHistory,
    sendAICoachQuery,
    logWeight,
  } = useFitnessApp();

  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<Exercise | null>(null);

  const currentSplitDay =
    weeklySplit.find((d) => d.dayIndex === selectedDayIndex) || weeklySplit[1];

  const scheduledExercises = currentSplitDay.exerciseIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e);

  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayIndex = new Date().getDay();

  const handleStartWorkout = () => {
    if (activeWorkout) {
      navigation.navigate('ActiveWorkout');
    } else {
      startWorkout(
        currentSplitDay.splitTitle,
        currentSplitDay.exerciseIds,
        currentSplitDay.targetMuscles
      );
      navigation.navigate('ActiveWorkout');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
        <View>
          <Text style={[styles.greetingText, { color: theme.muted }]}>
            WELCOME BACK, {profile.name.toUpperCase()}
          </Text>
          <Text style={[styles.mainHeading, { color: theme.text }]}>Daily Routine</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Switch to Daily Hisab */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              borderColor: '#14B8A6',
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 5,
              gap: 4,
            }}
            onPress={() => setAppMode('hisab')}
          >
            <Text style={{ fontSize: 13 }}>💰</Text>
            <Text style={{ color: '#14B8A6', fontWeight: '800', fontSize: 11 }}>Hisab</Text>
          </TouchableOpacity>

          {/* Streak Badge */}
          <View style={[styles.streakBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={[styles.streakText, { color: theme.primary }]}>{profile.streakDays}d Streak</Text>
          </View>

          {/* Voice Assistant Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.voiceBtn, { backgroundColor: theme.primary }]}
            onPress={() => setVoiceModalVisible(true)}
          >
            <Text style={styles.voiceBtnIcon}>🎙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Active Workout Resume Card (if in progress) */}
        {activeWorkout && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.activeBanner, { backgroundColor: theme.primary, borderColor: theme.accent }]}
            onPress={() => navigation.navigate('ActiveWorkout')}
          >
            <View style={styles.activeBannerRow}>
              <View style={styles.activeBannerDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>WORKOUT IN PROGRESS</Text>
                <Text style={styles.activeBannerSub}>
                  {activeWorkout.title} • {activeWorkout.exercises.length} Exercises Logged
                </Text>
              </View>
              <Text style={styles.resumeBtnText}>RESUME ➔</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 7-Day Split Calendar Bar */}
        <View style={styles.daysBar}>
          {daysShort.map((dayName, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isToday = todayIndex === idx;
            const splitDay = weeklySplit.find((d) => d.dayIndex === idx);

            return (
              <TouchableOpacity
                key={dayName}
                activeOpacity={0.75}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: isSelected
                      ? theme.primary
                      : isToday
                      ? theme.surfaceAlt
                      : theme.surface,
                    borderColor: isSelected
                      ? theme.primary
                      : isToday
                      ? theme.accent
                      : theme.borderSoft,
                  },
                ]}
                onPress={() => setSelectedDayIndex(idx)}
              >
                <Text
                  style={[
                    styles.dayNameText,
                    { color: isSelected ? '#ffffff' : theme.muted },
                  ]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.dayDot,
                    { color: splitDay?.isRestDay ? theme.subtle : theme.accent },
                  ]}
                >
                  {splitDay?.isRestDay ? '💤' : '⚡'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Daily Split Focus Card */}
        <View style={[styles.focusCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.focusHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.splitBadgeRow}>
                <View style={[styles.liveTag, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.liveTagText, { color: theme.primary }]}>
                    {selectedDayIndex === todayIndex ? "TODAY'S SPLIT" : currentSplitDay.dayName.toUpperCase()}
                  </Text>
                </View>
                {currentSplitDay.isRestDay && (
                  <View style={[styles.liveTag, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.liveTagText, { color: theme.muted }]}>REST DAY</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.splitTitle, { color: theme.text }]}>
                {currentSplitDay.splitTitle}
              </Text>
            </View>

            {/* Target Muscle Badges */}
            <View style={styles.muscleThumbnails}>
              {currentSplitDay.targetMuscles.map((mg) => {
                const img = MUSCLE_ANATOMY_IMAGES[mg] || MUSCLE_ANATOMY_IMAGES.arms;
                return (
                  <Image
                    key={mg}
                    source={img}
                    style={[styles.smallMuscleThumb, { borderColor: theme.borderSoft }]}
                    resizeMode="contain"
                  />
                );
              })}
            </View>
          </View>

          {/* Target muscles summary pills */}
          <View style={styles.musclesRow}>
            {currentSplitDay.targetMuscles.map((mg) => {
              const meta = MUSCLE_GROUPS_META.find((m) => m.id === mg);
              return (
                <View
                  key={mg}
                  style={[
                    styles.targetPill,
                    { backgroundColor: `${meta?.color || theme.primary}22`, borderColor: `${meta?.color || theme.primary}55` },
                  ]}
                >
                  <Text style={[styles.targetPillText, { color: meta?.color || theme.primary }]}>
                    🎯 {meta?.title || mg}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Action Button: Start Workout or Edit Split */}
          {!currentSplitDay.isRestDay ? (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.startWorkoutBtn, { backgroundColor: theme.primary }]}
              onPress={handleStartWorkout}
            >
              <Text style={styles.startWorkoutBtnText}>
                {activeWorkout ? 'RESUME WORKOUT' : 'START THIS WORKOUT NOW ⚡'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.restBox, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.restText, { color: theme.muted }]}>
                Take today to stretch, hydrate, and let muscle fibers repair for maximum hypertrophy.
              </Text>
            </View>
          )}
        </View>

        {/* Scheduled Exercises Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            PLANNED EXERCISES ({scheduledExercises.length})
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MuscleExplore')}
          >
            <Text style={[styles.seeAllText, { color: theme.accent }]}>+ Browse Anatomy</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises List */}
        {scheduledExercises.map((exercise) => (
          <ExerciseVisualCard
            key={exercise.id}
            exercise={exercise}
            onPress={() => setSelectedExerciseForModal(exercise)}
          />
        ))}

        {scheduledExercises.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No exercises scheduled for this day</Text>
            <Text style={[styles.emptySub, { color: theme.muted }]}>
              Tap the button below to browse muscle anatomy and add exercises to your routine.
            </Text>
            <TouchableOpacity
              style={[styles.addExBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('MuscleExplore')}
            >
              <Text style={styles.addExBtnText}>EXPLORE MUSCLE EXERCISES</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Daily Motivation Card */}
        <View style={[styles.aiCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardEmoji}>🤖</Text>
            <View>
              <Text style={[styles.aiCardTitle, { color: theme.accent }]}>TITAN AI COACH TIP</Text>
              <Text style={[styles.aiCardSub, { color: theme.muted }]}>Adaptive Progressive Overload</Text>
            </View>
          </View>
          <Text style={[styles.aiCardBody, { color: theme.text }]}>
            "For optimal {profile.fitnessGoal === 'weight_gain' ? 'muscle hypertrophy' : 'fat preservation'}, aim to add 1 extra rep or 1.25kg to your primary compound lifts today. Rest 90 seconds between heavy sets."
          </Text>
        </View>
      </ScrollView>

      {/* Voice Assistant Modal */}
      <VoiceWorkoutModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onProcessAIQuery={sendAICoachQuery}
        onParsedWeight={logWeight}
      />

      {/* Exercise Detail Modal */}
      {selectedExerciseForModal && (
        <ExerciseDetailModal
          visible={!!selectedExerciseForModal}
          exercise={selectedExerciseForModal}
          onClose={() => setSelectedExerciseForModal(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mainHeading: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnIcon: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  activeBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  activeBannerTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeBannerSub: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    marginTop: 1,
  },
  resumeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  daysBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayCard: {
    width: 44,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dayDot: {
    fontSize: 10,
  },
  focusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  splitBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  liveTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  splitTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  muscleThumbnails: {
    flexDirection: 'row',
    gap: 4,
  },
  smallMuscleThumb: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#04070D',
  },
  musclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  targetPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  startWorkoutBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  startWorkoutBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  restBox: {
    padding: 12,
    borderRadius: 12,
  },
  restText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  addExBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addExBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  aiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiCardEmoji: {
    fontSize: 18,
  },
  aiCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  aiCardSub: {
    fontSize: 10,
  },
  aiCardBody: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
