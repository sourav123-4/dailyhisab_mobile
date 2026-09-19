import React, { useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Exercise } from '../types/fitness';
import {
  MUSCLE_GROUPS_META,
  ARMS_PARTS_BREAKDOWN,
  MUSCLE_ANATOMY_IMAGES,
  EXERCISE_3D_VIDEOS,
} from '../data/exercisesData';
import { useAppTheme } from '../theme/appTheme';
import { Exercise3DVideoPlayer } from '../components/Exercise3DVideoPlayer';
import { useFitnessApp } from '../navigation/FitnessAppContext';

interface ExerciseDetailModalProps {
  visible: boolean;
  exercise: Exercise;
  highlightPart?: string;
  onClose: () => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  visible,
  exercise,
  highlightPart: initialHighlight,
  onClose,
}) => {
  const theme = useAppTheme();
  const { addExerciseToActiveWorkout, activeWorkout } = useFitnessApp();
  const [selectedArmPart, setSelectedArmPart] = useState<string | undefined>(initialHighlight);

  const muscleMeta =
    MUSCLE_GROUPS_META.find((m) => m.id === exercise.muscleGroup) || MUSCLE_GROUPS_META[0];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: `${muscleMeta.color}22` }]}>
                <Text style={[styles.badgeText, { color: muscleMeta.color }]}>
                  {exercise.muscleGroup.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.badgeText, { color: theme.muted }]}>
                  {exercise.equipment.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Text style={[styles.badgeText, { color: theme.accent }]}>
                  ⚡ 60 FPS 3D
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Exercise Title & Description */}
          <Text style={[styles.title, { color: theme.text }]}>{exercise.name}</Text>
          <Text style={[styles.description, { color: theme.muted }]}>{exercise.description}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Unified 3D Video Player & Scene Switcher */}
            <Exercise3DVideoPlayer
              exercise={exercise}
              highlightPart={selectedArmPart}
              onSelectPart={(partId) => setSelectedArmPart(partId)}
            />

            {/* Biomechanical Execution Guide */}
            <View style={{ paddingHorizontal: 4, marginTop: 16 }}>
              <Text style={[styles.subHeading, { color: theme.text }]}>BIOMECHANICAL EXECUTION GUIDE</Text>
              {exercise.instructions.map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNumBox, { backgroundColor: theme.primarySoft }]}>
                    <Text style={[styles.stepNumText, { color: theme.primary }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
                </View>
              ))}

              {/* Form Checklist Pro Tips */}
              {exercise.tips && exercise.tips.length > 0 && (
                <>
                  <Text style={[styles.subHeading, { color: theme.accent, marginTop: 14 }]}>PRO FORM CHECKLIST</Text>
                  {exercise.tips.map((tip, idx) => (
                    <View key={idx} style={[styles.tipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}>
                      <Text style={styles.tipIcon}>💡</Text>
                      <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Mistakes to Avoid */}
              {exercise.mistakes && exercise.mistakes.length > 0 && (
                <>
                  <Text style={[styles.subHeading, { color: theme.danger, marginTop: 14 }]}>CRITICAL MISTAKES TO AVOID</Text>
                  {exercise.mistakes.map((mistake, idx) => (
                    <View key={idx} style={[styles.tipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.danger }]}>
                      <Text style={styles.tipIcon}>⚠️</Text>
                      <Text style={[styles.tipText, { color: theme.text }]}>{mistake}</Text>
                    </View>
                  ))}
                </>
              )}

              {/* Target Muscles Summary */}
              <Text style={[styles.subHeading, { color: theme.text, marginTop: 14 }]}>TARGETED MUSCLE FIBERS</Text>
              <View style={styles.tagsWrap}>
                {exercise.primaryMuscles.map((m, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: `${muscleMeta.color}22`, borderColor: muscleMeta.color }]}>
                    <Text style={[styles.tagText, { color: muscleMeta.color }]}>🔥 {m} (Agonist)</Text>
                  </View>
                ))}
                {exercise.secondaryMuscles.map((m, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                    <Text style={[styles.tagText, { color: theme.muted }]}>⚡ {m} (Synergist)</Text>
                  </View>
                ))}
              </View>

              {/* Variations */}
              {exercise.beginnerModifications && (
                <View style={[styles.tipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft, marginTop: 12 }]}>
                  <Text style={styles.tipIcon}>🌱</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>BEGINNER MODIFICATION</Text>
                    <Text style={[styles.tipText, { color: theme.text, marginTop: 2 }]}>{exercise.beginnerModifications}</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Add to Workout Action */}
          <View style={styles.bottomActions}>
            {activeWorkout && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.addWorkoutBtn, { backgroundColor: theme.primary }]}
                onPress={() => {
                  addExerciseToActiveWorkout(exercise.id);
                  onClose();
                }}
              >
                <Text style={styles.addWorkoutBtnText}>+ ADD TO ACTIVE WORKOUT</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 13, 0.88)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    height: '94%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  visualizerModePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  visualizerModePill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  visualizerModePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 5,
  },
  stepNumBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  anatomyBreakdownBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  partDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  partItemName: {
    fontSize: 12,
    fontWeight: '800',
  },
  partItemDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginVertical: 3,
  },
  tipIcon: {
    fontSize: 13,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  bottomActions: {
    paddingTop: 10,
  },
  addWorkoutBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  addWorkoutBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
