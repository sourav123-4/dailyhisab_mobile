import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Exercise } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';

interface AnimatedExerciseMotionProps {
  exercise: Exercise;
}

export const AnimatedExerciseMotion: React.FC<AnimatedExerciseMotionProps> = ({
  exercise,
}) => {
  const theme = useAppTheme();
  const [activePhase, setActivePhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Animation values for visual rep counter and bar progress
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const motionY = useRef(new Animated.Value(0)).current;

  const totalPhases = exercise.animationFrames.length || 4;

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setActivePhase((prev) => (prev + 1) % totalPhases);
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalPhases]);

  useEffect(() => {
    // Smooth looping visual motion
    const motionLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(motionY, {
          toValue: -18,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(motionY, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    if (isPlaying) {
      motionLoop.start();
    } else {
      motionLoop.stop();
    }

    return () => motionLoop.stop();
  }, [isPlaying]);

  const currentFrameText =
    exercise.animationFrames[activePhase] || `Phase ${activePhase + 1}: Executing motion`;

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
      {/* Header controls */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.liveDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.badgeText, { color: theme.text }]}>MOTION SIMULATOR</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.playBtn, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          onPress={() => setIsPlaying(!isPlaying)}
        >
          <Text style={[styles.playBtnText, { color: theme.primary }]}>
            {isPlaying ? 'PAUSE ⏸' : 'PLAY ▶'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Animated Motion Canvas Graphic */}
      <View style={[styles.canvasArea, { backgroundColor: theme.bg }]}>
        {/* Dynamic target muscle glow */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              borderColor: theme.primary,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Dynamic motion figure placeholder */}
        <Animated.View
          style={[
            styles.motionGraphicWrapper,
            {
              transform: [{ translateY: motionY }],
            },
          ]}
        >
          <View style={[styles.weightBar, { backgroundColor: theme.accent }]} />
          <View style={[styles.torsoNode, { backgroundColor: theme.primary }]} />
          <View style={styles.limbRow}>
            <View style={[styles.limbNode, { backgroundColor: theme.text }]} />
            <View style={[styles.limbNode, { backgroundColor: theme.text }]} />
          </View>
        </Animated.View>

        {/* Phase Indicator Counter */}
        <View style={[styles.phaseCounter, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <Text style={[styles.phaseCounterText, { color: theme.accent }]}>
            Phase {activePhase + 1} / {totalPhases}
          </Text>
        </View>
      </View>

      {/* Frame Step description */}
      <View style={styles.descriptionBox}>
        <Text style={[styles.phaseDescription, { color: theme.text }]}>
          {currentFrameText}
        </Text>
      </View>

      {/* Step Progress Bar Dots */}
      <View style={styles.stepsRow}>
        {exercise.animationFrames.map((_, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            style={[
              styles.stepDot,
              {
                backgroundColor:
                  index === activePhase
                    ? theme.primary
                    : index < activePhase
                    ? theme.accent
                    : theme.subtle,
                flex: 1,
              },
            ]}
            onPress={() => setActivePhase(index)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  playBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  playBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  canvasArea: {
    height: 140,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    opacity: 0.4,
  },
  motionGraphicWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightBar: {
    width: 80,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  torsoNode: {
    width: 32,
    height: 38,
    borderRadius: 8,
  },
  limbRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  limbNode: {
    width: 6,
    height: 28,
    borderRadius: 3,
  },
  phaseCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phaseCounterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  descriptionBox: {
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  phaseDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },
});
