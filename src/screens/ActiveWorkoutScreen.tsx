import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { RestTimerModal } from '../components/RestTimerModal';
import { MUSCLE_GROUPS_META } from '../data/exercisesData';

export const ActiveWorkoutScreen = ({ navigation }: any) => {
  const theme = useAppTheme();
  const {
    activeWorkout,
    logSetToActiveWorkout,
    deleteSetFromActiveWorkout,
    finishActiveWorkout,
    cancelActiveWorkout,
    profile,
  } = useFitnessApp();

  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restSeconds, setRestSeconds] = useState(profile.restTimerSeconds || 90);

  if (!activeWorkout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.emptyEmoji]}>🏋️</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Active Workout</Text>
        <Text style={[styles.emptySub, { color: theme.muted }]}>
          Head over to the Today tab or Muscle Explorer to start a training session!
        </Text>
        <TouchableOpacity
          style={[styles.backHomeBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Today' })}
        >
          <Text style={styles.backHomeBtnText}>GO TO TODAY'S ROUTINE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFinish = async () => {
    const finished = await finishActiveWorkout();
    if (finished) {
      Alert.alert(
        '🔥 Workout Crushed!',
        `Total Volume Lifted: ${finished.totalVolumeKg} ${profile.unit}\nEstimated Burn: ${finished.caloriesBurned} kcal\nStreak: ${profile.streakDays + 1} Days`,
        [{ text: 'Awesome!', onPress: () => navigation.navigate('MainTabs', { screen: 'Today' }) }]
      );
    }
  };

  const handleCancel = () => {
    Alert.alert('Discard Workout?', 'Are you sure you want to cancel and discard this active session?', [
      { text: 'Keep Training', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => {
        cancelActiveWorkout();
        navigation.navigate('MainTabs', { screen: 'Today' });
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Today' })} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.text }]}>✕ Minimize</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>LIVE GYM COMPANION</Text>
        </View>

        <TouchableOpacity onPress={() => setRestTimerVisible(true)} style={[styles.restHeaderBtn, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.restHeaderBtnText, { color: theme.accent }]}>⏱ Rest</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Workout Session Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View>
            <Text style={[styles.sessionTitle, { color: theme.text }]}>{activeWorkout.title}</Text>
            <Text style={[styles.sessionTime, { color: theme.muted }]}>
              Started at {activeWorkout.startTime} • {activeWorkout.exercises.length} Exercises
            </Text>
          </View>

          <View style={styles.volumeBadge}>
            <Text style={[styles.volumeNumber, { color: theme.primary }]}>
              {activeWorkout.totalVolumeKg}
            </Text>
            <Text style={[styles.volumeLabel, { color: theme.subtle }]}>VOL ({profile.unit.toUpperCase()})</Text>
          </View>
        </View>

        {/* Exercises Logger List */}
        {activeWorkout.exercises.map((exLog, exIdx) => {
          const meta = MUSCLE_GROUPS_META.find((m) => m.id === exLog.muscleGroup);

          return (
            <View
              key={exLog.exerciseId || exIdx}
              style={[styles.exerciseCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
            >
              {/* Exercise Header */}
              <View style={styles.exCardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={[styles.muscleTag, { backgroundColor: `${meta?.color || theme.primary}22` }]}>
                    <Text style={[styles.muscleTagText, { color: meta?.color || theme.primary }]}>
                      {exLog.muscleGroup.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.exName, { color: theme.text }]}>{exLog.exerciseName}</Text>
                </View>

                {/* Rest Timer Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.timerPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
                  onPress={() => setRestTimerVisible(true)}
                >
                  <Text style={[styles.timerPillText, { color: theme.accent }]}>⏱ 90s</Text>
                </TouchableOpacity>
              </View>

              {/* Set Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, { flex: 0.8, color: theme.subtle }]}>SET</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, color: theme.subtle }]}>PREVIOUS</Text>
                <Text style={[styles.tableColHeader, { flex: 1.4, color: theme.subtle }]}>{profile.unit.toUpperCase()}</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, color: theme.subtle }]}>REPS</Text>
                <Text style={[styles.tableColHeader, { flex: 0.9, textAlign: 'center', color: theme.subtle }]}>DONE</Text>
              </View>

              {/* Sets Rows */}
              {exLog.sets.map((set, setIdx) => {
                return (
                  <View
                    key={set.id || setIdx}
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: set.isCompleted ? `${theme.success}15` : theme.surfaceAlt,
                        borderColor: set.isCompleted ? theme.success : theme.borderSoft,
                      },
                    ]}
                  >
                    <Text style={[styles.setNumCol, { flex: 0.8, color: theme.text }]}>
                      #{set.setNumber}
                    </Text>

                    <Text style={[styles.prevCol, { flex: 1.2, color: theme.muted }]}>
                      {set.previousWeight ? `${set.previousWeight}kg × ${set.previousReps}` : '—'}
                    </Text>

                    {/* Weight Input */}
                    <View style={{ flex: 1.4, paddingRight: 6 }}>
                      <TextInput
                        style={[styles.numInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
                        keyboardType="numeric"
                        defaultValue={set.weightKg.toString()}
                        onEndEditing={(e) => {
                          const w = parseFloat(e.nativeEvent.text) || 0;
                          logSetToActiveWorkout(exLog.exerciseId, { id: set.id, weightKg: w });
                        }}
                      />
                    </View>

                    {/* Reps Input */}
                    <View style={{ flex: 1.2, paddingRight: 6 }}>
                      <TextInput
                        style={[styles.numInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
                        keyboardType="numeric"
                        defaultValue={set.reps.toString()}
                        onEndEditing={(e) => {
                          const r = parseInt(e.nativeEvent.text, 10) || 0;
                          logSetToActiveWorkout(exLog.exerciseId, { id: set.id, reps: r });
                        }}
                      />
                    </View>

                    {/* Completion Checkmark */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                      style={[
                        styles.checkBtn,
                        {
                          backgroundColor: set.isCompleted ? theme.success : theme.surface,
                          borderColor: set.isCompleted ? theme.success : theme.subtle,
                        },
                      ]}
                      onPress={() => {
                        const nextCompleted = !set.isCompleted;
                        logSetToActiveWorkout(exLog.exerciseId, {
                          id: set.id,
                          isCompleted: nextCompleted,
                        });
                        if (nextCompleted) {
                          setRestTimerVisible(true);
                        }
                      }}
                    >
                      <Text style={[styles.checkBtnText, { color: set.isCompleted ? '#fff' : theme.muted }]}>
                        {set.isCompleted ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.addSetBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
                onPress={() => logSetToActiveWorkout(exLog.exerciseId, {})}
              >
                <Text style={[styles.addSetBtnText, { color: theme.accent }]}>+ ADD SET</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Another Exercise Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.addMoreExBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'MuscleExplore' })}
        >
          <Text style={[styles.addMoreExBtnText, { color: theme.text }]}>+ ADD MORE EXERCISES</Text>
        </TouchableOpacity>

        {/* Action Buttons: Finish Workout & Cancel */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.finishBtn, { backgroundColor: theme.primary }]}
            onPress={handleFinish}
          >
            <Text style={styles.finishBtnText}>FINISH & SAVE WORKOUT 🔥</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.cancelBtn, { borderColor: theme.dangerSoft }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelBtnText, { color: theme.danger }]}>Discard Workout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Circular Rest Timer Modal */}
      <RestTimerModal
        visible={restTimerVisible}
        initialSeconds={restSeconds}
        onClose={() => setRestTimerVisible(false)}
      />
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
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  restHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  sessionTime: {
    fontSize: 11,
    marginTop: 2,
  },
  volumeBadge: {
    alignItems: 'flex-end',
  },
  volumeNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  volumeLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  exerciseCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  exCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  muscleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  muscleTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  exName: {
    fontSize: 16,
    fontWeight: '800',
  },
  timerPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  timerPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  tableColHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  setNumCol: {
    fontSize: 13,
    fontWeight: '800',
  },
  prevCol: {
    fontSize: 11,
  },
  numInput: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },
  addSetBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  addSetBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addMoreExBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 10,
  },
  addMoreExBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bottomButtons: {
    gap: 10,
    marginTop: 14,
  },
  finishBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  backHomeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backHomeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
