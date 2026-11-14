import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MuscleGroup } from '../types/fitness';
import { MUSCLE_GROUPS_META, EXERCISES_DATABASE } from '../data/exercisesData';
import { useAppTheme } from '../theme/appTheme';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';
import { MuscleBodyMap, muscleTargetsForGroup } from './MuscleBodyMap';

interface MuscleAnatomyViewerProps {
  selectedMuscle: MuscleGroup;
  onSelectMuscle: (muscle: MuscleGroup) => void;
  showDetails?: boolean;
}

export const MuscleAnatomyViewer: React.FC<MuscleAnatomyViewerProps> = ({
  selectedMuscle,
  onSelectMuscle,
  showDetails = true,
}) => {
  const theme = useAppTheme();
  const [viewMode, setViewMode] = useState<'map' | 'motion'>('motion');
  const [viewAngle, setViewAngle] = useState<'front' | 'back'>(
    selectedMuscle === 'back' ? 'back' : 'front'
  );

  const activeMeta =
    MUSCLE_GROUPS_META.find((m) => m.id === selectedMuscle) || MUSCLE_GROUPS_META[0];

  const representativeExercise =
    EXERCISES_DATABASE.find((e) => e.muscleGroup === selectedMuscle) || EXERCISES_DATABASE[0];

  const handleSelect = (muscle: MuscleGroup) => {
    onSelectMuscle(muscle);
    if (muscle === 'back') {
      setViewAngle('back');
    } else if (muscle === 'chest' || muscle === 'abs' || muscle === 'shoulders') {
      setViewAngle('front');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: `${activeMeta.color}44` }]}>
      {/* Header bar with Mode Switcher & Active Muscle Indicator */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.pulseDot, { backgroundColor: activeMeta.color }]} />
          <View>
            <Text style={[styles.title, { color: theme.text }]}>{activeMeta.title}</Text>
            <Text style={[styles.activeMuscleLabel, { color: activeMeta.color }]}>
              {viewMode === 'motion' ? 'EXAMPLE EXERCISE' : 'MUSCLES WORKED'}
            </Text>
          </View>
        </View>

        <View style={[styles.modeToggle, { backgroundColor: theme.surfaceAlt }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              viewMode === 'motion' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setViewMode('motion')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: viewMode === 'motion' ? '#fff' : theme.muted },
              ]}
            >
              ▶ Demo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.modeBtn,
              viewMode === 'map' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setViewMode('map')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: viewMode === 'map' ? '#fff' : theme.muted },
              ]}
            >
              🗺 Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Viewport Display: 3D Human Video or Map */}
      {viewMode === 'motion' ? (
        <View style={styles.motionStage}>
          <ExerciseVideoPlayer exercise={representativeExercise} compact />
        </View>
      ) : (
        <View style={[styles.mapStage, { backgroundColor: theme.surfaceAlt }]}>
          <MuscleBodyMap
            {...muscleTargetsForGroup(selectedMuscle)}
            primaryNames={activeMeta.keyMuscles}
            title=""
            scale={0.62}
            bare
          />
        </View>
      )}

      {/* Biomechanical Kinematics & Target Muscle Heads Details Box */}
      {showDetails && (
        <View style={[styles.detailsBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              Muscles in this group
            </Text>
            <Text style={[styles.detailsSubtitle, { color: theme.muted }]}>
              {activeMeta.subtitle}
            </Text>
          </View>
          <View style={styles.tagsRow}>
            {activeMeta.keyMuscles.map((muscleName, index) => (
              <View
                key={index}
                style={[
                  styles.muscleTag,
                  { backgroundColor: `${activeMeta.color}1E`, borderColor: `${activeMeta.color}55` },
                ]}
              >
                <Text style={[styles.muscleTagText, { color: activeMeta.color }]}>
                  ⚡ {muscleName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginVertical: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeMuscleLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  motionStage: {
    width: '100%',
  },
  mapStage: {
    borderRadius: 16,
    padding: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
  detailsBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailsHeader: {
    marginBottom: 6,
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  detailsSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  muscleTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
