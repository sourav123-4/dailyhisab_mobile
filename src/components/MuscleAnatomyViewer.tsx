import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MuscleGroup } from '../types/fitness';
import { MUSCLE_ANATOMY_IMAGES, MUSCLE_GROUPS_META, EXERCISES_DATABASE } from '../data/exercisesData';
import { useAppTheme } from '../theme/appTheme';
import { Exercise3DVideoPlayer } from './Exercise3DVideoPlayer';

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

  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const activeMeta =
    MUSCLE_GROUPS_META.find((m) => m.id === selectedMuscle) || MUSCLE_GROUPS_META[0];

  const representativeExercise =
    EXERCISES_DATABASE.find((e) => e.muscleGroup === selectedMuscle) || EXERCISES_DATABASE[0];

  useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  const handleSelect = (muscle: MuscleGroup) => {
    onSelectMuscle(muscle);
    if (muscle === 'back') {
      setViewAngle('back');
    } else if (muscle === 'chest' || muscle === 'abs' || muscle === 'shoulders') {
      setViewAngle('front');
    }
  };

  const imageSource = MUSCLE_ANATOMY_IMAGES[selectedMuscle] || MUSCLE_ANATOMY_IMAGES.arms;
  const scanY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
      {/* Header bar with Mode Switcher */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.pulseDot, { backgroundColor: activeMeta.color }]} />
          <Text style={[styles.title, { color: theme.text }]}>3D Interactive Anatomy</Text>
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
              ⚡ 3D Motion
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
          <Exercise3DVideoPlayer
            exercise={representativeExercise}
          />
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.anatomyImage}
            resizeMode="contain"
          />

          {/* Animated Laser Scanline */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                borderColor: `${activeMeta.color}88`,
                transform: [{ translateY: scanY }],
              },
            ]}
          />

          {/* Pulsing Target Heatmap Beacon */}
          <Animated.View
            style={[
              styles.targetBeacon,
              {
                borderColor: activeMeta.color,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />

          {/* Target Overlay Badge */}
          <View style={[styles.targetBadge, { borderColor: activeMeta.color, backgroundColor: 'rgba(10, 15, 29, 0.88)' }]}>
            <Text style={[styles.targetBadgeText, { color: activeMeta.color }]}>
              TARGET: {activeMeta.title.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Interactive Muscle Group Selector Chips */}
      <View style={styles.pillsContainer}>
        {MUSCLE_GROUPS_META.map((meta) => {
          const isSelected = selectedMuscle === meta.id;
          return (
            <TouchableOpacity
              key={meta.id}
              activeOpacity={0.75}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? meta.color : theme.surfaceAlt,
                  borderColor: isSelected ? meta.color : theme.borderSoft,
                },
              ]}
              onPress={() => handleSelect(meta.id)}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: isSelected ? '#ffffff' : theme.text, fontWeight: isSelected ? '800' : '500' },
                ]}
              >
                {meta.title.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Details Box */}
      {showDetails && (
        <View style={[styles.detailsBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <View style={styles.detailsHeader}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>
              {activeMeta.title} Anatomy & Kinematics
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
                  { backgroundColor: `${activeMeta.color}22`, borderColor: `${activeMeta.color}55` },
                ]}
              >
                <Text style={[styles.muscleTagText, { color: activeMeta.color }]}>
                  🔥 {muscleName}
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
  imageContainer: {
    width: '100%',
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: '#04070D',
    borderRadius: 16,
    overflow: 'hidden',
  },
  anatomyImage: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderBottomWidth: 2,
    zIndex: 5,
  },
  targetBeacon: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.6,
  },
  targetBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
