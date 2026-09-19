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
  const [activeTab, setActiveTab] = useState<'motion' | 'anatomy' | 'tips'>('motion');
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

          {/* Tab Navigation */}
          <View style={[styles.tabsRow, { backgroundColor: theme.surfaceAlt }]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'motion' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('motion')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'motion' ? '#fff' : theme.muted }]}>
                🎬 3D Human Animation
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'anatomy' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('anatomy')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'anatomy' ? '#fff' : theme.muted }]}>
                🔬 Muscle Anatomy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'tips' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('tips')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'tips' ? '#fff' : theme.muted }]}>
                💡 Form Checklist
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {activeTab === 'motion' && (
              <View>
                {/* 3D Photorealistic Anatomical Human Video Player */}
                <Exercise3DVideoPlayer
                  exercise={exercise}
                  highlightPart={selectedArmPart}
                  onSelectPart={(partId) => setSelectedArmPart(partId)}
                />

                {/* Step-by-Step Biomechanical Execution Steps */}
                <Text style={[styles.subHeading, { color: theme.text, marginTop: 14 }]}>BIOMECHANICAL EXECUTION GUIDE</Text>
                {exercise.instructions.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={[styles.stepNumBox, { backgroundColor: theme.primarySoft }]}>
                      <Text style={[styles.stepNumText, { color: theme.primary }]}>{idx + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'anatomy' && (
              <View>
                {/* 3D Anatomical Reference Graphic */}
                <View
                  style={{
                    borderRadius: 14,
                    overflow: 'hidden',
                    marginBottom: 16,
                    borderWidth: 1.5,
                    borderColor: `${muscleMeta.color}88`,
                    backgroundColor: '#05070D',
                  }}
                >
                  <Image
                    source={
                      EXERCISE_3D_VIDEOS[exercise.id] ||
                      MUSCLE_ANATOMY_IMAGES[exercise.muscleGroup] ||
                      MUSCLE_ANATOMY_IMAGES.arms
                    }
                    style={{ width: '100%', height: 210, resizeMode: 'cover' }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 10,
                      backgroundColor: 'rgba(5, 7, 13, 0.85)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: muscleMeta.color, fontWeight: '800', fontSize: 12 }}>
                      🔬 3D HYPERTROPHY FIBER ENGAGEMENT
                    </Text>
                    <Text style={{ color: '#00E5FF', fontWeight: '700', fontSize: 11 }}>
                      {exercise.muscleGroup.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Primary Targeted Muscles */}
                <Text style={[styles.subHeading, { color: theme.text }]}>PRIMARY TARGET MUSCLE FIBERS</Text>
                <View style={styles.tagsWrap}>
                  {exercise.primaryMuscles.map((m, idx) => (
                    <View key={idx} style={[styles.tag, { backgroundColor: `${muscleMeta.color}22`, borderColor: muscleMeta.color }]}>
                      <Text style={[styles.tagText, { color: muscleMeta.color }]}>🔥 {m} (Major Contraction)</Text>
                    </View>
                  ))}
                </View>

                {/* Secondary Stabilizers */}
                <Text style={[styles.subHeading, { color: theme.text, marginTop: 14 }]}>SECONDARY SYNERGISTS & STABILIZERS</Text>
                <View style={styles.tagsWrap}>
                  {exercise.secondaryMuscles.map((m, idx) => (
                    <View key={idx} style={[styles.tag, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                      <Text style={[styles.tagText, { color: theme.muted }]}>⚡ {m} (Assisting Tension)</Text>
                    </View>
                  ))}
                </View>

                {/* Arm Anatomy Breakdown Details if Arms */}
                {exercise.muscleGroup === 'arms' && (
                  <View style={[styles.anatomyBreakdownBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                    <Text style={[styles.breakdownTitle, { color: theme.text }]}>ARM ANATOMICAL SPECIALIZATION</Text>
                    {ARMS_PARTS_BREAKDOWN.map((p) => (
                      <View key={p.id} style={styles.partItemRow}>
                        <View style={[styles.partDot, { backgroundColor: p.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partItemName, { color: theme.text }]}>{p.name}</Text>
                          <Text style={[styles.partItemDesc, { color: theme.muted }]}>{p.target}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'tips' && (
              <View>
                <Text style={[styles.subHeading, { color: theme.accent }]}>PRO FORM CHECKLIST</Text>
                {exercise.tips.map((tip, idx) => (
                  <View key={idx} style={[styles.tipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}>
                    <Text style={styles.tipIcon}>💡</Text>
                    <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
                  </View>
                ))}

                <Text style={[styles.subHeading, { color: theme.danger, marginTop: 14 }]}>CRITICAL MISTAKES TO AVOID</Text>
                {exercise.mistakes.map((mistake, idx) => (
                  <View key={idx} style={[styles.tipCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.danger }]}>
                    <Text style={styles.tipIcon}>⚠️</Text>
                    <Text style={[styles.tipText, { color: theme.text }]}>{mistake}</Text>
                  </View>
                ))}
              </View>
            )}
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
