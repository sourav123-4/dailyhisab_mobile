import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Exercise } from '../types/fitness';
import { EXERCISE_3D_VIDEOS, MUSCLE_ANATOMY_IMAGES, MUSCLE_GROUPS_META } from '../data/exercisesData';
import { useAppTheme } from '../theme/appTheme';

interface ExerciseVisualCardProps {
  exercise: Exercise;
  onPress: () => void;
  onQuickAdd?: () => void;
  isAdded?: boolean;
}

export const ExerciseVisualCard: React.FC<ExerciseVisualCardProps> = ({
  exercise,
  onPress,
  onQuickAdd,
  isAdded = false,
}) => {
  const theme = useAppTheme();

  const muscleMeta =
    MUSCLE_GROUPS_META.find((m) => m.id === exercise.muscleGroup) || MUSCLE_GROUPS_META[0];

  const exerciseImage =
    EXERCISE_3D_VIDEOS[exercise.id] ||
    MUSCLE_ANATOMY_IMAGES[exercise.muscleGroup] ||
    MUSCLE_ANATOMY_IMAGES.arms;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isAdded ? theme.primary : theme.borderSoft,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.contentRow}>
        {/* Photorealistic 3D Exercise Thumbnail */}
        <View style={[styles.thumbBox, { backgroundColor: '#02050A', borderColor: theme.borderSoft }]}>
          <Image
            source={exerciseImage}
            style={styles.thumbImage}
            resizeMode="cover"
          />

          <View style={styles.playOverlayBadge}>
            <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
            <Text style={styles.playOverlayText}>3D VIDEO</Text>
          </View>
        </View>

        {/* Exercise Information */}
        <View style={styles.infoCol}>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: `${muscleMeta.color}22` }]}>
              <Text style={[styles.badgeText, { color: muscleMeta.color }]}>
                {exercise.muscleGroup.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: theme.accent }]}>
                ⚡ 3D HUMAN
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {exercise.name}
          </Text>

          <Text style={[styles.musclesText, { color: theme.subtle }]} numberOfLines={1}>
            {exercise.primaryMuscles.join(', ')}
          </Text>

          <View style={styles.statsRow}>
            <Text style={[styles.statValue, { color: theme.accent }]}>
              {exercise.defaultSets} sets × {exercise.defaultReps} reps
            </Text>
            <Text style={[styles.dotSep, { color: theme.subtle }]}>•</Text>
            <Text style={[styles.statValue, { color: theme.muted }]}>
              {exercise.restSeconds}s rest
            </Text>
          </View>
        </View>

        {/* Quick Add or Arrow Action */}
        <View style={styles.actionCol}>
          {onQuickAdd ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.addBtn,
                {
                  backgroundColor: isAdded ? theme.success : theme.primarySoft,
                  borderColor: isAdded ? theme.success : theme.primary,
                },
              ]}
              onPress={onQuickAdd}
            >
              <Text style={[styles.addBtnText, { color: isAdded ? '#fff' : theme.primary }]}>
                {isAdded ? '✓' : '+'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.playCircle, { backgroundColor: 'rgba(0, 229, 255, 0.12)', borderColor: theme.accent }]}>
              <Text style={[styles.arrowIcon, { color: theme.accent }]}>▶</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
    marginHorizontal: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbBox: {
    width: 68,
    height: 74,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  pulseRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  playOverlayBadge: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(3, 6, 12, 0.9)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  playOverlayText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  musclesText: {
    fontSize: 12,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  dotSep: {
    fontSize: 10,
  },
  actionCol: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  playCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 2,
  },
});
