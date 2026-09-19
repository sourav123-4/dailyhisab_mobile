import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Exercise, MuscleGroup } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';
import {
  EXERCISE_3D_VIDEOS,
  MUSCLE_ANATOMY_IMAGES,
  MUSCLE_GROUPS_META,
  ARMS_PARTS_BREAKDOWN,
} from '../data/exercisesData';
import { EXERCISE_VIDEO_SOURCES } from '../data/exerciseVideoSources';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not loaded:', e);
  }
}

// Multi-phase photorealistic keyframe dictionary for all exercises and camera perspectives
const EXERCISE_KEYFRAMES: Record<
  string,
  {
    phase1: any;
    phase2: any;
    phase3: any;
    phase4: any;
    front: any;
    back: any;
    side: any;
    iso: any;
    zoom: any;
  }
> = {
  arms_barbell_curl: {
    phase1: require('../../assets/exercise_bicep_phase1_setup.jpg'),
    phase2: require('../../assets/exercise_bicep_phase2_concentric.jpg'),
    phase3: require('../../assets/exercise_bicep_phase3_peak.jpg'),
    phase4: require('../../assets/exercise_bicep_phase2_concentric.jpg'),
    front: require('../../assets/exercise_bicep_3d.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_bicep_side_profile.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_bicep_phase3_peak.jpg'),
  },
  arms_incline_dumbbell_curl: {
    phase1: require('../../assets/exercise_bicep_phase1_setup.jpg'),
    phase2: require('../../assets/exercise_bicep_phase2_concentric.jpg'),
    phase3: require('../../assets/exercise_bicep_phase3_peak.jpg'),
    phase4: require('../../assets/exercise_bicep_phase2_concentric.jpg'),
    front: require('../../assets/exercise_bicep_3d.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_bicep_side_profile.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_bicep_phase3_peak.jpg'),
  },
  arms_dumbbell_hammer_curl: {
    phase1: require('../../assets/exercise_hammer_3d.jpg'),
    phase2: require('../../assets/exercise_bicep_phase2_concentric.jpg'),
    phase3: require('../../assets/exercise_hammer_3d.jpg'),
    phase4: require('../../assets/exercise_bicep_phase1_setup.jpg'),
    front: require('../../assets/exercise_hammer_3d.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_bicep_side_profile.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_hammer_3d.jpg'),
  },
  arms_cable_tricep_pushdown: {
    phase1: require('../../assets/exercise_tricep_side.jpg'),
    phase2: require('../../assets/exercise_tricep_side.jpg'),
    phase3: require('../../assets/exercise_tricep_back.jpg'),
    phase4: require('../../assets/exercise_tricep_side.jpg'),
    front: require('../../assets/exercise_tricep_side.jpg'),
    back: require('../../assets/exercise_tricep_back.jpg'),
    side: require('../../assets/exercise_tricep_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_tricep_side.jpg'),
  },
  arms_skullcrushers: {
    phase1: require('../../assets/exercise_tricep_side.jpg'),
    phase2: require('../../assets/exercise_tricep_side.jpg'),
    phase3: require('../../assets/exercise_tricep_back.jpg'),
    phase4: require('../../assets/exercise_tricep_side.jpg'),
    front: require('../../assets/exercise_tricep_side.jpg'),
    back: require('../../assets/exercise_tricep_back.jpg'),
    side: require('../../assets/exercise_tricep_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_tricep_back.jpg'),
  },
  arms_overhead_tricep_extension: {
    phase1: require('../../assets/exercise_tricep_side.jpg'),
    phase2: require('../../assets/exercise_tricep_side.jpg'),
    phase3: require('../../assets/exercise_tricep_back.jpg'),
    phase4: require('../../assets/exercise_tricep_side.jpg'),
    front: require('../../assets/exercise_tricep_side.jpg'),
    back: require('../../assets/exercise_tricep_back.jpg'),
    side: require('../../assets/exercise_tricep_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_tricep_back.jpg'),
  },
  chest_barbell_bench_press: {
    phase1: require('../../assets/exercise_chest_side.jpg'),
    phase2: require('../../assets/exercise_chest_front.jpg'),
    phase3: require('../../assets/exercise_chest_front.jpg'),
    phase4: require('../../assets/exercise_chest_side.jpg'),
    front: require('../../assets/exercise_chest_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_chest_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_chest_front.jpg'),
  },
  chest_incline_dumbbell_press: {
    phase1: require('../../assets/exercise_chest_side.jpg'),
    phase2: require('../../assets/exercise_chest_front.jpg'),
    phase3: require('../../assets/exercise_chest_front.jpg'),
    phase4: require('../../assets/exercise_chest_side.jpg'),
    front: require('../../assets/exercise_chest_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_chest_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_chest_front.jpg'),
  },
  chest_cable_crossover: {
    phase1: require('../../assets/exercise_chest_side.jpg'),
    phase2: require('../../assets/exercise_chest_front.jpg'),
    phase3: require('../../assets/exercise_chest_front.jpg'),
    phase4: require('../../assets/exercise_chest_side.jpg'),
    front: require('../../assets/exercise_chest_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_chest_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_chest_front.jpg'),
  },
  back_lat_pulldown: {
    phase1: require('../../assets/exercise_back_side.jpg'),
    phase2: require('../../assets/exercise_back_posterior.jpg'),
    phase3: require('../../assets/exercise_back_posterior.jpg'),
    phase4: require('../../assets/exercise_back_side.jpg'),
    front: require('../../assets/exercise_back_side.jpg'),
    back: require('../../assets/exercise_back_posterior.jpg'),
    side: require('../../assets/exercise_back_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_back_posterior.jpg'),
  },
  back_barbell_deadlift: {
    phase1: require('../../assets/exercise_back_side.jpg'),
    phase2: require('../../assets/exercise_back_posterior.jpg'),
    phase3: require('../../assets/exercise_back_side.jpg'),
    phase4: require('../../assets/exercise_back_side.jpg'),
    front: require('../../assets/exercise_back_side.jpg'),
    back: require('../../assets/exercise_back_posterior.jpg'),
    side: require('../../assets/exercise_back_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_back_side.jpg'),
  },
  back_bent_over_row: {
    phase1: require('../../assets/exercise_back_side.jpg'),
    phase2: require('../../assets/exercise_back_posterior.jpg'),
    phase3: require('../../assets/exercise_back_posterior.jpg'),
    phase4: require('../../assets/exercise_back_side.jpg'),
    front: require('../../assets/exercise_back_side.jpg'),
    back: require('../../assets/exercise_back_posterior.jpg'),
    side: require('../../assets/exercise_back_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_back_posterior.jpg'),
  },
  shoulders_barbell_overhead_press: {
    phase1: require('../../assets/exercise_shoulder_side.jpg'),
    phase2: require('../../assets/exercise_shoulder_front.jpg'),
    phase3: require('../../assets/exercise_shoulder_front.jpg'),
    phase4: require('../../assets/exercise_shoulder_side.jpg'),
    front: require('../../assets/exercise_shoulder_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_shoulder_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_shoulder_front.jpg'),
  },
  shoulders_dumbbell_lateral_raise: {
    phase1: require('../../assets/exercise_shoulder_side.jpg'),
    phase2: require('../../assets/exercise_shoulder_front.jpg'),
    phase3: require('../../assets/exercise_shoulder_front.jpg'),
    phase4: require('../../assets/exercise_shoulder_side.jpg'),
    front: require('../../assets/exercise_shoulder_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_shoulder_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_shoulder_front.jpg'),
  },
  legs_barbell_squat: {
    phase1: require('../../assets/exercise_squat_front.jpg'),
    phase2: require('../../assets/exercise_squat_side.jpg'),
    phase3: require('../../assets/exercise_squat_side.jpg'),
    phase4: require('../../assets/exercise_squat_front.jpg'),
    front: require('../../assets/exercise_squat_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_squat_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_squat_side.jpg'),
  },
  legs_leg_press: {
    phase1: require('../../assets/exercise_squat_front.jpg'),
    phase2: require('../../assets/exercise_squat_side.jpg'),
    phase3: require('../../assets/exercise_squat_side.jpg'),
    phase4: require('../../assets/exercise_squat_front.jpg'),
    front: require('../../assets/exercise_squat_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_squat_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_squat_side.jpg'),
  },
  legs_romanian_deadlift: {
    phase1: require('../../assets/exercise_back_side.jpg'),
    phase2: require('../../assets/exercise_squat_side.jpg'),
    phase3: require('../../assets/exercise_squat_side.jpg'),
    phase4: require('../../assets/exercise_back_side.jpg'),
    front: require('../../assets/exercise_squat_front.jpg'),
    back: require('../../assets/exercise_back_posterior.jpg'),
    side: require('../../assets/exercise_back_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_squat_side.jpg'),
  },
  abs_straight_arm_crunch: {
    phase1: require('../../assets/exercise_crunch_front.jpg'),
    phase2: require('../../assets/exercise_crunch_side.jpg'),
    phase3: require('../../assets/exercise_crunch_side.jpg'),
    phase4: require('../../assets/exercise_crunch_front.jpg'),
    front: require('../../assets/exercise_crunch_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_crunch_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_crunch_side.jpg'),
  },
  abs_hanging_leg_raise: {
    phase1: require('../../assets/exercise_crunch_front.jpg'),
    phase2: require('../../assets/exercise_crunch_side.jpg'),
    phase3: require('../../assets/exercise_crunch_side.jpg'),
    phase4: require('../../assets/exercise_crunch_front.jpg'),
    front: require('../../assets/exercise_crunch_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_crunch_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_crunch_front.jpg'),
  },
  abs_plank: {
    phase1: require('../../assets/exercise_crunch_side.jpg'),
    phase2: require('../../assets/exercise_crunch_front.jpg'),
    phase3: require('../../assets/exercise_crunch_side.jpg'),
    phase4: require('../../assets/exercise_crunch_front.jpg'),
    front: require('../../assets/exercise_crunch_front.jpg'),
    back: require('../../assets/exercise_arms_back.jpg'),
    side: require('../../assets/exercise_crunch_side.jpg'),
    iso: require('../../assets/exercise_fullbody_orbit.jpg'),
    zoom: require('../../assets/exercise_crunch_side.jpg'),
  },
};

interface Exercise3DVideoPlayerProps {
  exercise: Exercise;
  highlightPart?: string;
  onSelectPart?: (partId: string) => void;
  isMiniPreview?: boolean;
}

export const Exercise3DVideoPlayer: React.FC<Exercise3DVideoPlayerProps> = ({
  exercise,
  highlightPart,
  onSelectPart,
  isMiniPreview = false,
}) => {
  const theme = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [cameraView, setCameraView] = useState<'front' | 'back' | 'side' | 'iso' | 'zoom'>('front');
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [repCount, setRepCount] = useState(1);
  const [activeAngle, setActiveAngle] = useState(165);
  const [muscleTension, setMuscleTension] = useState(25);

  // Animated values for 60fps photorealistic motion
  const animPhase = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const camZoomAnim = useRef(new Animated.Value(1)).current;
  const recBlinkAnim = useRef(new Animated.Value(1)).current;

  const videoSource = EXERCISE_VIDEO_SOURCES[exercise.id];
  const videoRef = useRef<any>(null);

  // Sync HTML5 video playback rate and play/pause state
  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      videoRef.current.playbackRate = speed;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, speed, videoSource]);

  // Keyframes configuration
  const defaultAsset =
    EXERCISE_3D_VIDEOS[exercise.id] ||
    MUSCLE_ANATOMY_IMAGES[exercise.muscleGroup] ||
    MUSCLE_ANATOMY_IMAGES.arms;

  const keyframes = EXERCISE_KEYFRAMES[exercise.id] || {
    phase1: defaultAsset,
    phase2: defaultAsset,
    phase3: defaultAsset,
    phase4: defaultAsset,
    front: defaultAsset,
    back: defaultAsset,
    side: defaultAsset,
    iso: defaultAsset,
    zoom: defaultAsset,
  };

  const phases = [
    { name: 'Phase 1: Starting Setup & Pre-Stretch', focus: 'Form Alignment', angle: 165, pump: 25 },
    { name: 'Phase 2: Concentric Power Drive', focus: 'Maximum Acceleration', angle: 90, pump: 75 },
    { name: 'Phase 3: Peak Hypertrophy Contraction', focus: '1s Peak Flexion', angle: 45, pump: 100 },
    { name: 'Phase 4: Eccentric Negative Descent', focus: 'Controlled 3s Stretch', angle: 140, pump: 40 },
  ];

  // REC Red Dot Blinker Loop
  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(recBlinkAnim, {
          toValue: 0.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(recBlinkAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [recBlinkAnim]);

  // Main 3D Continuous Rep Motion Loop
  useEffect(() => {
    if (!isPlaying) {
      animPhase.stopAnimation();
      return;
    }

    const repDuration = 3200 / speed;

    const repLoop = Animated.loop(
      Animated.sequence([
        // Phase 1 -> Phase 2 (Concentric Drive: 0% -> 33%)
        Animated.timing(animPhase, {
          toValue: 1,
          duration: repDuration * 0.35,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        // Phase 2 -> Phase 3 (Peak Contraction Hold: 33% -> 50%)
        Animated.timing(animPhase, {
          toValue: 2,
          duration: repDuration * 0.2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Phase 3 -> Phase 4 (Controlled Eccentric Descent: 50% -> 85%)
        Animated.timing(animPhase, {
          toValue: 3,
          duration: repDuration * 0.35,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        // Phase 4 -> Phase 1 (Reset / Pre-stretch: 85% -> 100%)
        Animated.timing(animPhase, {
          toValue: 0,
          duration: repDuration * 0.1,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    repLoop.start();

    // Listener for real-time telemetry updates
    const listenerId = animPhase.addListener(({ value }) => {
      let pIdx = 0;
      let ang = 165;
      let pump = 25;

      if (value < 0.7) {
        pIdx = 0;
        const prog = value / 0.7;
        ang = Math.round(165 - prog * 75);
        pump = Math.round(25 + prog * 50);
      } else if (value < 1.7) {
        pIdx = 1;
        const prog = (value - 0.7) / 1.0;
        ang = Math.round(90 - prog * 45);
        pump = Math.round(75 + prog * 25);
      } else if (value < 2.5) {
        pIdx = 2;
        const prog = (value - 1.7) / 0.8;
        ang = Math.round(45 + prog * 95);
        pump = Math.round(100 - prog * 60);
      } else {
        pIdx = 3;
        const prog = (value - 2.5) / 0.5;
        ang = Math.round(140 + prog * 25);
        pump = Math.round(40 - prog * 15);
      }

      setCurrentPhaseIdx(Math.min(pIdx, 3));
      setActiveAngle(ang);
      setMuscleTension(pump);
    });

    // Hypertrophy pulse breathing loop
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.9,
          duration: repDuration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: repDuration * 0.5,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    // Increment rep count periodically
    const repTimer = setInterval(() => {
      setRepCount((r) => (r >= 12 ? 1 : r + 1));
    }, repDuration);

    return () => {
      animPhase.removeListener(listenerId);
      repLoop.stop();
      glowLoop.stop();
      clearInterval(repTimer);
    };
  }, [isPlaying, speed, animPhase, glowAnim]);

  // Camera view angle switch handler
  const handleCameraChange = (cam: 'front' | 'back' | 'side' | 'iso' | 'zoom') => {
    setCameraView(cam);
    Animated.spring(camZoomAnim, {
      toValue: cam === 'zoom' ? 1.3 : cam === 'iso' ? 1.08 : 1.0,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Phase selector button click handler
  const handleSelectPhase = (idx: number) => {
    setIsPlaying(false);
    animPhase.stopAnimation();
    Animated.timing(animPhase, {
      toValue: idx,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setCurrentPhaseIdx(idx);
    setActiveAngle(phases[idx].angle);
    setMuscleTension(phases[idx].pump);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (s: 0.5 | 1 | 1.5 | 2) => {
    setSpeed(s);
    if (!isPlaying) setIsPlaying(true);
  };

  // Compute active image source based on camera view and motion phase
  const getActiveImageSource = () => {
    if (cameraView === 'back') {
      return keyframes.back || defaultAsset;
    }
    if (cameraView === 'side') {
      return keyframes.side || defaultAsset;
    }
    if (cameraView === 'iso') {
      return keyframes.iso || defaultAsset;
    }
    if (cameraView === 'zoom') {
      return keyframes.zoom || defaultAsset;
    }

    // Default Front 3D: Dynamic animated movement across phases
    if (currentPhaseIdx === 0) return keyframes.phase1 || keyframes.front || defaultAsset;
    if (currentPhaseIdx === 1) return keyframes.phase2 || keyframes.front || defaultAsset;
    if (currentPhaseIdx === 2) return keyframes.phase3 || keyframes.front || defaultAsset;
    return keyframes.phase4 || keyframes.front || defaultAsset;
  };

  // Mini Preview for Exercise Cards
  if (isMiniPreview) {
    return (
      <View style={styles.miniContainer}>
        <Image
          source={keyframes.phase2 || defaultAsset}
          style={styles.miniImage}
          resizeMode="cover"
        />
        <View style={styles.miniLiveTag}>
          <View style={styles.miniDot} />
          <Text style={styles.miniLiveText}>3D CGI</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#060913', borderColor: theme.borderSoft }]}>
      {/* HUD Header Bar */}
      <View style={styles.hudTopHeader}>
        <View style={styles.liveIndicatorRow}>
          <Animated.View style={[styles.recBlinkDot, { opacity: recBlinkAnim }]} />
          <Text style={[styles.hudHeaderTitle, { color: '#FFFFFF' }]}>
            3D HUMAN BIOMECHANICAL VIDEO
          </Text>
        </View>

        <View style={styles.hudRightPills}>
          <View style={[styles.telemetryPill, { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: theme.accent }]}>
            <Text style={[styles.telemetryText, { color: theme.accent }]}>
              REP {repCount} / 10
            </Text>
          </View>
          <View style={[styles.telemetryPill, { backgroundColor: 'rgba(255, 51, 75, 0.18)', borderColor: '#FF334B' }]}>
            <Text style={[styles.telemetryText, { color: '#FF334B' }]}>
              {muscleTension}% PUMP
            </Text>
          </View>
          <View style={[styles.telemetryPill, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Text style={[styles.telemetryText, { color: '#FFFFFF' }]}>
              {activeAngle}°
            </Text>
          </View>
        </View>
      </View>

      {/* Main 3D Continuous Animated Human Lifter Viewport */}
      <View style={styles.videoViewport}>
        <Animated.View
          style={[
            styles.imageMotionContainer,
            {
              transform: [{ scale: camZoomAnim }],
            },
          ]}
        >
          {Platform.OS === 'web' && videoSource && cameraView === 'front' ? (
            <video
              ref={videoRef}
              src={videoSource}
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Image
              source={getActiveImageSource()}
              style={styles.fullHumanImage}
              resizeMode="cover"
            />
          )}

          {/* Hypertrophy Glow Pulse Filter */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.hypertrophyGlowOverlay,
              {
                opacity: glowAnim,
              },
            ]}
          />
        </Animated.View>

        {/* Biomechanical Trajectory & Kinematic Vector Badge */}
        <View style={styles.trajectoryOverlayBadge}>
          <View style={styles.vectorPointRow}>
            <View style={[styles.vectorDot, { backgroundColor: theme.accent }]} />
            <Text style={styles.vectorText}>
              {currentPhaseIdx === 2 ? '⚡ PEAK ISOMETRIC TENSION' : '📐 KINETIC FORM TRAJECTORY: OK'}
            </Text>
          </View>
        </View>

        {/* Camera Perspective Angle Switcher */}
        <View style={styles.cameraPillsOverlay}>
          {(
            [
              { id: 'front', label: 'Front 3D', icon: '👤' },
              { id: 'back', label: 'Back 3D', icon: '🔄' },
              { id: 'side', label: 'Side 3D', icon: '📐' },
              { id: 'iso', label: 'Orbit 3D', icon: '🌐' },
              { id: 'zoom', label: 'Muscle Zoom', icon: '🔬' },
            ] as const
          ).map((cam) => {
            const isSel = cameraView === cam.id;
            return (
              <TouchableOpacity
                key={cam.id}
                activeOpacity={0.75}
                style={[
                  styles.camBtn,
                  isSel && { backgroundColor: '#FF334B', borderColor: '#FF334B' },
                ]}
                onPress={() => handleCameraChange(cam.id)}
              >
                <Text style={[styles.camBtnText, { color: isSel ? '#FFFFFF' : '#94A3B8' }]}>
                  {cam.icon} {cam.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Real-Time Phase & Telemetry Banner */}
        <View style={styles.phaseOverlayCard}>
          <View style={styles.phaseBadgeRow}>
            <View style={[styles.phaseDot, { backgroundColor: '#FF334B' }]} />
            <Text style={[styles.phaseTitleText, { color: theme.accent }]}>
              {phases[currentPhaseIdx].name}
            </Text>
          </View>
          <Text style={styles.phaseDescText}>
            Focus: {phases[currentPhaseIdx].focus} • {activeAngle}° Joint Angle • {muscleTension}% Muscle Activation
          </Text>
        </View>
      </View>

      {/* Arm Anatomical Muscle Head Selector Chips */}
      {exercise.muscleGroup === 'arms' && (
        <View style={styles.headsChipBar}>
          <Text style={[styles.headsLabel, { color: theme.muted }]}>ANATOMICAL HEADS:</Text>
          <View style={styles.headsChipList}>
            {ARMS_PARTS_BREAKDOWN.map((part) => {
              const isSel = highlightPart === part.id;
              return (
                <TouchableOpacity
                  key={part.id}
                  activeOpacity={0.75}
                  style={[
                    styles.headPill,
                    {
                      backgroundColor: isSel ? part.color : 'rgba(255,255,255,0.06)',
                      borderColor: isSel ? part.color : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                  onPress={() => onSelectPart && onSelectPart(part.id)}
                >
                  <Text
                    style={[
                      styles.headPillText,
                      { color: isSel ? '#000' : theme.text, fontWeight: isSel ? '900' : '600' },
                    ]}
                  >
                    {part.name.split('(')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Interactive Phase Scrubber Timeline */}
      <View style={styles.phaseTimelineRow}>
        {phases.map((p, idx) => {
          const isCurrent = currentPhaseIdx === idx;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.75}
              style={[
                styles.timelineStepBlock,
                {
                  backgroundColor: isCurrent
                    ? '#FF334B'
                    : idx < currentPhaseIdx
                    ? theme.accent
                    : 'rgba(255,255,255,0.12)',
                },
              ]}
              onPress={() => handleSelectPhase(idx)}
            >
              <Text
                style={[
                  styles.timelineStepText,
                  { color: isCurrent ? '#FFFFFF' : idx < currentPhaseIdx ? '#000000' : 'rgba(255,255,255,0.6)' },
                ]}
              >
                Phase {idx + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Playback Controls & Speed Multipliers */}
      <View style={styles.playbackControlsFooter}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.playPauseBtn, { backgroundColor: '#FF334B' }]}
          onPress={handleTogglePlay}
        >
          <Text style={styles.playPauseBtnText}>
            {isPlaying ? '⏸ PAUSE VIDEO' : '▶ RESUME 3D VIDEO'}
          </Text>
        </TouchableOpacity>

        <View style={styles.speedPillsRow}>
          <Text style={[styles.speedLabel, { color: theme.muted }]}>SPEED:</Text>
          {([0.5, 1, 1.5, 2] as const).map((s) => (
            <TouchableOpacity
              key={s}
              activeOpacity={0.75}
              style={[
                styles.speedBtn,
                speed === s && { backgroundColor: theme.accent },
              ]}
              onPress={() => handleSpeedChange(s)}
            >
              <Text
                style={[
                  styles.speedBtnText,
                  { color: speed === s ? '#000000' : '#CBD5E1', fontWeight: speed === s ? '900' : '600' },
                ]}
              >
                {s}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 12,
  },
  hudTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a0f1d',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recBlinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF334B',
  },
  hudHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hudRightPills: {
    flexDirection: 'row',
    gap: 6,
  },
  telemetryPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  telemetryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoViewport: {
    width: '100%',
    height: 340,
    backgroundColor: '#020409',
    position: 'relative',
    overflow: 'hidden',
  },
  imageMotionContainer: {
    width: '100%',
    height: '100%',
  },
  fullHumanImage: {
    width: '100%',
    height: '100%',
  },
  hypertrophyGlowOverlay: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  trajectoryOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(10, 15, 29, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  vectorPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vectorText: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cameraPillsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'column',
    gap: 6,
  },
  camBtn: {
    backgroundColor: 'rgba(10, 15, 29, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  camBtnText: {
    fontSize: 9,
    fontWeight: '700',
  },
  phaseOverlayCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(10, 15, 29, 0.88)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  phaseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseTitleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  phaseDescText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  headsChipBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a0f1d',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  headsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  headsChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  headPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  headPillText: {
    fontSize: 11,
  },
  phaseTimelineRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0a0f1d',
  },
  timelineStepBlock: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineStepText: {
    fontSize: 10,
    fontWeight: '800',
  },
  playbackControlsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#060913',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  playPauseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  speedPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  speedBtnText: {
    fontSize: 11,
  },
  miniContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  miniImage: {
    width: '100%',
    height: '100%',
  },
  miniLiveTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF334B',
  },
  miniLiveText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
});
