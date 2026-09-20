import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Linking,
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
import {
  EXERCISE_VIDEO_SOURCES,
  EXERCISE_YOUTUBE_IDS,
  EXERCISE_THUMBNAILS,
} from '../data/exerciseVideoSources';
import { EXERCISE_MP4_DATA_URIS } from '../data/exerciseVideoDataUris';
import { getExerciseLocalMedia } from '../data/exerciseLocalMedia';
import { Biomechanical3DExerciseAnimator } from './Biomechanical3DExerciseAnimator';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not loaded:', e);
  }
}

// Multi-phase photorealistic keyframe dictionary for fallback display
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
    zoom: require('../../assets/exercise_tricep_side.jpg'),
  },
};

function generateHtml5Player(url: string, speed: number, isPlaying: boolean, posterUrl?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body, html { width:100%; height:100%; background:#02050E; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    .video-wrapper { width:100%; height:100%; display:flex; align-items:center; justify-content:center; position:relative; }
    video { width:100%; height:100%; object-fit:contain; background:#000; border-radius:12px; }
  </style>
</head>
<body>
  <div class="video-wrapper">
    <video id="v" src="${url}" poster="${posterUrl || ''}" autoplay loop muted playsinline webkit-playsinline></video>
  </div>
  <script>
    var v = document.getElementById('v');
    if (v) {
      v.playbackRate = ${speed};
      ${isPlaying ? 'v.play().catch(function(e){});' : 'v.pause();'}
    }
    window.setSpeed = function(rate) {
      if (v) v.playbackRate = rate;
    };
    window.togglePlay = function(playing) {
      if (v) {
        if (playing) { v.play().catch(function(){}); }
        else { v.pause(); }
      }
    };
    window.replay = function() {
      if (v) {
        v.currentTime = 0;
        v.play().catch(function(){});
      }
    };
  </script>
</body>
</html>`;
}

function generateYouTubePlayer(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body, html { width:100%; height:100%; background:#060913; overflow:hidden; display:flex; align-items:center; justify-content:center; }
    iframe { width:100%; height:100%; border:none; border-radius:12px; }
  </style>
</head>
<body>
  <iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&origin=https://dailyhisab.app"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</body>
</html>`;
}

export type SceneMode = 'video' | 'biomechanics' | 'anatomy' | 'angles';

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
  const [activeScene, setActiveScene] = useState<SceneMode>('video');
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const [repCount, setRepCount] = useState(1);
  const [activeAngle, setActiveAngle] = useState(165);
  const [muscleTension, setMuscleTension] = useState(25);

  const resolvedVideoUrl = exercise.videoUrl || EXERCISE_VIDEO_SOURCES[exercise.id] || '';
  const resolvedYoutubeId = exercise.youtubeId || EXERCISE_YOUTUBE_IDS[exercise.id] || '';
  const resolvedThumbnail = exercise.thumbnailUrl || EXERCISE_THUMBNAILS[exercise.id] || '';
  const localMedia = getExerciseLocalMedia(exercise.id);

  // High definition offline MP4 video URI
  const resolvedMp4Video =
    EXERCISE_MP4_DATA_URIS[exercise.id] ||
    (exercise.muscleGroup === 'chest' ? EXERCISE_MP4_DATA_URIS['chest_barbell_bench_press'] : '') ||
    EXERCISE_MP4_DATA_URIS['chest_barbell_bench_press'];

  const [videoPlayerType, setVideoPlayerType] = useState<'cloud' | 'youtube'>('cloud');

  // Animated values for 60fps photorealistic motion
  const animPhase = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const camZoomAnim = useRef(new Animated.Value(1)).current;
  const recBlinkAnim = useRef(new Animated.Value(1)).current;

  const videoRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);

  // Sync HTML5 video playback rate and play/pause state for Web
  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      videoRef.current.playbackRate = speed;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, speed, resolvedMp4Video]);

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
        Animated.timing(animPhase, {
          toValue: 1,
          duration: repDuration * 0.35,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animPhase, {
          toValue: 2,
          duration: repDuration * 0.2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(animPhase, {
          toValue: 3,
          duration: repDuration * 0.35,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animPhase, {
          toValue: 0,
          duration: repDuration * 0.1,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    repLoop.start();

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

      setCurrentPhaseIdx(pIdx);
      setActiveAngle(ang);
      setMuscleTension(pump);
    });

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

  const handleCameraChange = (cam: 'front' | 'back' | 'side' | 'iso' | 'zoom') => {
    setCameraView(cam);
    Animated.spring(camZoomAnim, {
      toValue: cam === 'zoom' ? 1.3 : cam === 'iso' ? 1.08 : 1.0,
      friction: 6,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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
    const next = !isPlaying;
    setIsPlaying(next);
    if (Platform.OS === 'web' && videoRef.current) {
      if (next) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.togglePlay && window.togglePlay(${next}); true;`);
    }
  };

  const handleSpeedChange = (s: 0.5 | 1 | 1.5 | 2) => {
    setSpeed(s);
    if (!isPlaying) setIsPlaying(true);
    if (Platform.OS === 'web' && videoRef.current) {
      videoRef.current.playbackRate = s;
      videoRef.current.play().catch(() => {});
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.setSpeed && window.setSpeed(${s}); window.togglePlay && window.togglePlay(true); true;`);
    }
  };

  const handleReplay = () => {
    setIsPlaying(true);
    animPhase.setValue(0);
    if (Platform.OS === 'web' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.replay && window.replay(); true;`);
    }
  };

  const getActiveImageSource = () => {
    if (cameraView === 'back') return keyframes.back || defaultAsset;
    if (cameraView === 'side') return keyframes.side || defaultAsset;
    if (cameraView === 'iso') return keyframes.iso || defaultAsset;
    if (cameraView === 'zoom') return keyframes.zoom || defaultAsset;

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
          source={resolvedThumbnail ? { uri: resolvedThumbnail } : (keyframes.phase2 || defaultAsset)}
          style={styles.miniImage}
          resizeMode="cover"
        />
        <View style={styles.miniLiveTag}>
          <View style={styles.miniDot} />
          <Text style={styles.miniLiveText}>HD VIDEO</Text>
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
            {activeScene === 'video'
              ? 'HD VIDEO DEMONSTRATION'
              : activeScene === 'biomechanics'
              ? '3D SKELETAL BIOMECHANICS'
              : activeScene === 'anatomy'
              ? 'ANATOMICAL MUSCLE HEATMAP'
              : 'MULTI-PERSPECTIVE 3D CAMERAS'}
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

      {/* Exact Scene Selector Tabs */}
      <View style={styles.sceneTabsBar}>
        {[
          { id: 'video', label: '🎬 Video Demo' },
          { id: 'biomechanics', label: '🦴 3D Biomechanics' },
          { id: 'anatomy', label: '🧬 Muscle Anatomy' },
          { id: 'angles', label: '📐 Angles' },
        ].map((tab) => {
          const isSelected = activeScene === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.75}
              style={[
                styles.sceneTabBtn,
                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setActiveScene(tab.id as SceneMode)}
            >
              <Text
                style={[
                  styles.sceneTabText,
                  { color: isSelected ? '#FFFFFF' : theme.muted, fontWeight: isSelected ? '800' : '600' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Interactive Viewport based on selected scene */}
      <View style={styles.videoViewport}>
        {activeScene === 'video' ? (
          // ================= SCENE 1: REAL HD MP4 VIDEO =================
          <View style={styles.videoContainerInner}>
            {Platform.OS === 'web' ? (
              videoPlayerType === 'youtube' && resolvedYoutubeId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${resolvedYoutubeId}?autoplay=1&loop=1&playsinline=1&modestbranding=1&rel=0&controls=1`}
                  style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' } as any}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={resolvedMp4Video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                  }}
                />
              )
            ) : WebView && (videoPlayerType === 'youtube' && resolvedYoutubeId) ? (
              <WebView
                key={`yt-${resolvedYoutubeId}`}
                style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
                source={{
                  html: generateYouTubePlayer(resolvedYoutubeId),
                  baseUrl: 'https://dailyhisab.app',
                  headers: { Referer: 'https://dailyhisab.app' },
                }}
              />
            ) : WebView ? (
              <WebView
                ref={webViewRef}
                key={`mp4-${exercise.id}`}
                style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                mixedContentMode="always"
                source={{
                  html: generateHtml5Player(resolvedMp4Video, speed, isPlaying, resolvedThumbnail),
                  baseUrl: 'https://dailyhisab.app',
                }}
              />
            ) : (
              <Image
                source={resolvedThumbnail ? { uri: resolvedThumbnail } : defaultAsset}
                style={styles.fullHumanImage}
                resizeMode="contain"
              />
            )}

            {/* Video Source Switcher Pill Overlays */}
            <View style={styles.videoFormatSwitcherRow}>
              <View
                style={[
                  styles.formatSwitchBtn,
                  { backgroundColor: 'rgba(0, 229, 255, 0.2)', borderColor: '#00E5FF' },
                ]}
              >
                <Text style={[styles.formatSwitchText, { color: '#00E5FF' }]}>
                  ⚡ HD 60FPS MP4
                </Text>
              </View>

              {resolvedYoutubeId ? (
                <TouchableOpacity
                  style={[
                    styles.formatSwitchBtn,
                    videoPlayerType === 'youtube' && { backgroundColor: '#FF334B', borderColor: '#FF334B' },
                  ]}
                  onPress={() => setVideoPlayerType(videoPlayerType === 'youtube' ? 'cloud' : 'youtube')}
                >
                  <Text style={[styles.formatSwitchText, { color: videoPlayerType === 'youtube' ? '#FFF' : theme.muted }]}>
                    {videoPlayerType === 'youtube' ? '✕ Close YT' : '▶ Coach YT'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {resolvedYoutubeId ? (
                <TouchableOpacity
                  style={styles.externalYtBtn}
                  onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${resolvedYoutubeId}`)}
                >
                  <Text style={styles.externalYtText}>↗ Open App</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : activeScene === 'biomechanics' ? (
          // ================= SCENE 2: 3D BIOMECHANICS SKELETAL MOTION =================
          <View style={styles.biomechanicsContainerInner}>
            <Biomechanical3DExerciseAnimator
              exercise={exercise}
              highlightPart={highlightPart}
            />
          </View>
        ) : activeScene === 'anatomy' ? (
          // ================= SCENE 3: MUSCLE ANATOMY HEATMAP =================
          <View style={styles.anatomySceneContainer}>
            <Image
              source={MUSCLE_ANATOMY_IMAGES[exercise.muscleGroup] || MUSCLE_ANATOMY_IMAGES.arms}
              style={styles.anatomySceneImage}
              resizeMode="contain"
            />
            <View style={styles.anatomyInfoCard}>
              <Text style={styles.anatomyCardTitle}>TARGETED MUSCLE GROUPS</Text>
              <Text style={styles.anatomyCardPrimary}>
                🔥 Primary: {exercise.primaryMuscles.join(', ')}
              </Text>
              {exercise.secondaryMuscles.length > 0 && (
                <Text style={styles.anatomyCardSecondary}>
                  ⚡ Synergists: {exercise.secondaryMuscles.join(', ')}
                </Text>
              )}
              <View style={styles.anatomyMeterRow}>
                <View style={[styles.anatomyMeterTrack, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <View style={[styles.anatomyMeterFill, { width: `${muscleTension}%`, backgroundColor: theme.primary }]} />
                </View>
                <Text style={styles.anatomyMeterText}>{muscleTension}% Tension</Text>
              </View>
            </View>
          </View>
        ) : (
          // ================= SCENE 4: MULTI-ANGLE PERSPECTIVES =================
          <Animated.View
            style={[
              styles.imageMotionContainer,
              {
                transform: [{ scale: camZoomAnim }],
              },
            ]}
          >
            <Image
              source={getActiveImageSource()}
              style={styles.fullHumanImage}
              resizeMode="contain"
            />

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

            {/* Camera Perspective Angle Switcher Buttons */}
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

            {/* Biomechanical Trajectory & Kinematic Vector Badge */}
            <View style={styles.trajectoryOverlayBadge}>
              <View style={styles.vectorPointRow}>
                <View style={[styles.vectorDot, { backgroundColor: theme.accent }]} />
                <Text style={styles.vectorText}>
                  {currentPhaseIdx === 2 ? '⚡ PEAK ISOMETRIC TENSION' : '📐 KINETIC FORM TRAJECTORY: OK'}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Arm Anatomical Muscle Head Selector Chips (when applicable) */}
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

      {/* Bio-Kinematic Movement Scrubber & Progress Bar */}
      <View style={styles.hudTelemetryScrubberBar}>
        <View style={styles.telemetryScrubberTop}>
          <View style={styles.kineticPhaseInfo}>
            <View style={[styles.kineticPhaseDot, { backgroundColor: currentPhaseIdx === 2 ? '#FF334B' : theme.accent }]} />
            <Text style={[styles.kineticPhaseTitle, { color: '#FFFFFF' }]}>
              {phases[currentPhaseIdx].name.split(':')[1] || phases[currentPhaseIdx].name}
            </Text>
          </View>
          <Text style={[styles.kineticFocusBadge, { color: theme.accent }]}>
            {phases[currentPhaseIdx].focus}
          </Text>
        </View>

        {/* Dynamic Glowing Rep Scrubber Track */}
        <View style={styles.scrubberTrack}>
          <Animated.View
            style={[
              styles.scrubberProgressFill,
              {
                width: animPhase.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: ['25%', '50%', '85%', '100%'],
                }),
                backgroundColor: theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Playback Controls & Speed Multipliers */}
      <View style={styles.playbackControlsFooter}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.playPauseBtn, { backgroundColor: isPlaying ? '#FF334B' : theme.primary }]}
          onPress={handleTogglePlay}
        >
          <Text style={styles.playPauseBtnText}>
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.replayBtn, { borderColor: theme.borderSoft }]}
          onPress={handleReplay}
        >
          <Text style={[styles.replayBtnText, { color: theme.text }]}>🔄 REPLAY</Text>
        </TouchableOpacity>

        <View style={styles.speedPillsRow}>
          <Text style={[styles.speedLabel, { color: theme.muted }]}>SPEED:</Text>
          {([0.5, 1, 1.5, 2] as const).map((s) => {
            const isSel = speed === s;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.75}
                style={[
                  styles.speedPillBtn,
                  isSel && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => handleSpeedChange(s)}
              >
                <Text
                  style={[
                    styles.speedPillText,
                    { color: isSel ? '#FFFFFF' : theme.muted, fontWeight: isSel ? '900' : '600' },
                  ]}
                >
                  {s}×
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* VitalPath Video Attribution & Form Guidance Footer */}
      <View style={styles.attributionFooter}>
        <Text style={[styles.attributionText, { color: theme.muted }]}>
          Demonstration verified with VitalPath & wger sports physiology guidelines (CC-BY-SA 4.0).
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  hudTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0A0F1D',
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
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
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
  sceneTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#080D1A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sceneTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  sceneTabText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  videoViewport: {
    width: '100%',
    height: 255,
    backgroundColor: '#020409',
    position: 'relative',
    overflow: 'hidden',
  },
  videoContainerInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  biomechanicsContainerInner: {
    width: '100%',
    height: '100%',
  },
  anatomySceneContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070B16',
    padding: 12,
  },
  anatomySceneImage: {
    width: '100%',
    height: '65%',
  },
  anatomyInfoCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  anatomyCardTitle: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  anatomyCardPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  anatomyCardSecondary: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 6,
  },
  anatomyMeterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anatomyMeterTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  anatomyMeterFill: {
    height: '100%',
    borderRadius: 3,
  },
  anatomyMeterText: {
    color: '#FF334B',
    fontSize: 10,
    fontWeight: '800',
  },
  videoFormatSwitcherRow: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  formatSwitchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  formatSwitchText: {
    fontSize: 10,
    fontWeight: '800',
  },
  externalYtBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
  },
  externalYtText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
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
  headsChipBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0A0F1D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  headsLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  headsChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  headPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  headPillText: {
    fontSize: 10,
  },
  hudTelemetryScrubberBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#080C17',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  telemetryScrubberTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kineticPhaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  kineticPhaseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  kineticPhaseTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  kineticFocusBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  scrubberTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scrubberProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  playbackControlsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#060913',
  },
  playPauseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  playPauseBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  replayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  replayBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  speedPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginRight: 2,
  },
  speedPillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  speedPillText: {
    fontSize: 10,
  },
  attributionFooter: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#04070E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  attributionText: {
    fontSize: 9,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  miniContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#04070F',
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
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00E5FF',
  },
  miniLiveText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
  },
});
