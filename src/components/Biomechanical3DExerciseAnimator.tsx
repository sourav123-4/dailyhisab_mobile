import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Exercise, MuscleGroup } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';

let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('react-native-webview not loaded:', e);
  }
}

interface BiomechanicalAnimatorProps {
  exercise: Exercise;
  highlightPart?: string;
  isMiniPreview?: boolean;
}

export const Biomechanical3DExerciseAnimator: React.FC<BiomechanicalAnimatorProps> = ({
  exercise,
  highlightPart,
  isMiniPreview = false,
}) => {
  const theme = useAppTheme();
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.25 | 0.5 | 1 | 1.5 | 2>(1);
  const [cameraView, setCameraView] = useState<'side' | 'front' | 'iso' | 'zoom'>('side');
  const [repCount, setRepCount] = useState(1);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(1);
  const [currentAngle, setCurrentAngle] = useState(165);
  const [muscleTension, setMuscleTension] = useState(30);

  const canvasRef = useRef<any>(null);
  const webViewRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const manualPhaseRef = useRef<number | null>(null);

  const exerciseType = getExerciseType(exercise.id, exercise.muscleGroup);

  const phases = [
    { name: '1. Setup & Pre-Stretch', time: '0.0s', desc: 'Joint alignment & scapular stability' },
    { name: '2. Concentric Explosive Drive', time: '1.1s', desc: 'Explosive muscle shortening & drive' },
    { name: '3. Peak Isometric Contraction', time: '1.6s', desc: 'Maximal hypertrophic squeeze' },
    { name: '4. Controlled Eccentric Negative', time: '3.4s', desc: '3-second deep fiber stretch' },
  ];

  // WEB RENDERING LOOP (Direct DOM Canvas on Web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let active = true;

    const render = () => {
      if (!active) return;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext ? canvas.getContext('2d') : null;
        if (ctx) {
          const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 2) : 2;
          const displayWidth = canvas.clientWidth || (isMiniPreview ? 80 : 460);
          const displayHeight = canvas.clientHeight || (isMiniPreview ? 80 : 380);

          if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
            canvas.width = displayWidth * dpr;
            canvas.height = displayHeight * dpr;
          }

          ctx.save();
          ctx.scale(dpr, dpr);

          const w = displayWidth;
          const h = displayHeight;

          const repDurationMs = 3600 / speed;
          const elapsed = (Date.now() - startTimeRef.current) % repDurationMs;
          let progress = elapsed / repDurationMs;

          if (!isPlaying && manualPhaseRef.current !== null) {
            progress = manualPhaseRef.current;
          }

          let liftProgress = 0;
          let phaseIndex = 0;

          if (progress < 0.32) {
            const t = progress / 0.32;
            liftProgress = Math.sin((t * Math.PI) / 2);
            phaseIndex = 1;
          } else if (progress < 0.46) {
            liftProgress = 1;
            phaseIndex = 2;
          } else if (progress < 0.90) {
            const t = (progress - 0.46) / 0.44;
            liftProgress = (1 + Math.cos(t * Math.PI)) / 2;
            phaseIndex = 3;
          } else {
            liftProgress = 0;
            phaseIndex = 0;
          }

          setCurrentPhaseIdx(phaseIndex);
          const angle = Math.round(165 - liftProgress * 115);
          setCurrentAngle(angle);
          const pump = Math.round(25 + liftProgress * 75);
          setMuscleTension(pump);

          renderMuscleWikiStyleLifterWeb(
            ctx,
            w,
            h,
            exercise,
            exerciseType,
            liftProgress,
            cameraView,
            highlightPart,
            isMiniPreview,
            currentAngle,
            muscleTension
          );

          ctx.restore();
        }
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, cameraView, exerciseType, highlightPart, isMiniPreview, exercise]);

  const handleSelectPhase = (idx: number) => {
    setIsPlaying(false);
    const phaseOffsets = [0.0, 0.28, 0.40, 0.70];
    manualPhaseRef.current = phaseOffsets[idx];
    setCurrentPhaseIdx(idx);

    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'SEEK_PHASE', offset: phaseOffsets[idx], phaseIdx: idx }));
    }
  };

  const handleResumePlay = () => {
    manualPhaseRef.current = null;
    startTimeRef.current = Date.now();
    setIsPlaying(true);

    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'PLAY' }));
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'PAUSE' }));
    }
  };

  const handleSpeedChange = (s: 0.25 | 0.5 | 1 | 1.5 | 2) => {
    setSpeed(s);
    if (!isPlaying) handleResumePlay();
    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'SET_SPEED', speed: s }));
    }
  };

  const handleCameraChange = (cam: 'side' | 'front' | 'iso' | 'zoom') => {
    setCameraView(cam);
    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'SET_CAMERA', cameraView: cam }));
    }
  };

  // NATIVE WEBVIEW HTML SOURCE GENERATION
  const webViewHTML = useMemo(() => {
    if (Platform.OS === 'web') return '';
    return buildAnatomicalHTML(
      exercise,
      exerciseType,
      cameraView,
      speed,
      isPlaying,
      highlightPart,
      isMiniPreview
    );
  }, [exercise, exerciseType, cameraView, speed, isPlaying, highlightPart, isMiniPreview]);

  if (isMiniPreview) {
    return (
      <View style={styles.miniContainer}>
        {Platform.OS === 'web' ? (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              borderRadius: 10,
            }}
          />
        ) : WebView ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: webViewHTML }}
            style={styles.miniWebView}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            androidHardwareAccelerationDisabled={false}
            androidLayerType="hardware"
          />
        ) : (
          <View style={[styles.miniFallback, { backgroundColor: '#14181E' }]}>
            <Text style={{ fontSize: 14 }}>💪</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, { backgroundColor: '#13171D', borderColor: theme.borderSoft }]}>
      {/* Telemetry Bar */}
      <View style={styles.headerBar}>
        <View style={styles.titleRow}>
          <View style={[styles.pulseLiveDot, { backgroundColor: '#FF3B30' }]} />
          <Text style={[styles.headerTitleText, { color: '#E2E8F0' }]}>
            3D ANATOMICAL VIDEO ENGINE
          </Text>
        </View>

        <View style={styles.headerBadges}>
          <View style={[styles.hudBadge, { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderColor: '#FF3B30' }]}>
            <Text style={[styles.hudBadgeText, { color: '#FF3B30' }]}>
              REP {repCount} / 10
            </Text>
          </View>
          <View style={[styles.hudBadge, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
            <Text style={[styles.hudBadgeText, { color: '#F1F5F9' }]}>
              {muscleTension}% PUMP
            </Text>
          </View>
          <View style={[styles.hudBadge, { backgroundColor: 'rgba(0, 229, 255, 0.12)', borderColor: theme.accent }]}>
            <Text style={[styles.hudBadgeText, { color: theme.accent }]}>
              {currentAngle}° ANGLE
            </Text>
          </View>
        </View>
      </View>

      {/* Main 3D Canvas Viewport */}
      <View style={styles.viewportArea}>
        {Platform.OS === 'web' ? (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: 380,
              display: 'block',
            }}
          />
        ) : WebView ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: webViewHTML }}
            style={styles.fullWebView}
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            androidHardwareAccelerationDisabled={false}
            androidLayerType="hardware"
            onMessage={(event: any) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'TELEMETRY') {
                  if (data.phaseIdx !== undefined) setCurrentPhaseIdx(data.phaseIdx);
                  if (data.angle !== undefined) setCurrentAngle(data.angle);
                  if (data.pump !== undefined) setMuscleTension(data.pump);
                  if (data.rep !== undefined) setRepCount(data.rep);
                }
              } catch (e) {}
            }}
          />
        ) : (
          <View style={{ width: '100%', height: 380, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>3D Anatomical Video</Text>
          </View>
        )}

        {/* Camera Perspective Angle Switcher */}
        <View style={styles.cameraPillsRow}>
          {(
            [
              { id: 'side', label: 'Side 3D', icon: '📐' },
              { id: 'front', label: 'Front 3D', icon: '👤' },
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
                  isSel && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
                ]}
                onPress={() => handleCameraChange(cam.id)}
              >
                <Text style={[styles.camBtnText, { color: isSel ? '#fff' : '#94A3B8' }]}>
                  {cam.icon} {cam.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Live Phase Indicator Overlay */}
        <View style={styles.phaseHUDCard}>
          <View style={styles.phaseIndicatorRow}>
            <View style={[styles.phaseDot, { backgroundColor: '#FF3B30' }]} />
            <Text style={[styles.phaseHUDTitle, { color: '#FF3B30' }]}>
              {phases[currentPhaseIdx].name}
            </Text>
          </View>
          <Text style={styles.phaseHUDDesc}>
            {phases[currentPhaseIdx].desc}
          </Text>
        </View>
      </View>

      {/* Interactive Phase Scrubber Bar */}
      <View style={styles.scrubberContainer}>
        <View style={styles.scrubberRow}>
          {phases.map((p, idx) => {
            const isCurrent = currentPhaseIdx === idx;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                style={[
                  styles.scrubBlock,
                  {
                    backgroundColor: isCurrent
                      ? '#FF3B30'
                      : idx < currentPhaseIdx
                      ? '#E2E8F0'
                      : 'rgba(255,255,255,0.12)',
                  },
                ]}
                onPress={() => handleSelectPhase(idx)}
              >
                <Text
                  style={[
                    styles.scrubBlockLabel,
                    { color: isCurrent ? '#fff' : idx < currentPhaseIdx ? '#0F172A' : 'rgba(255,255,255,0.5)' },
                  ]}
                >
                  Phase {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Playback Controls & Speed Multipliers */}
      <View style={styles.controlDeck}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.playPauseButton, { backgroundColor: '#FF3B30' }]}
          onPress={isPlaying ? handlePause : handleResumePlay}
        >
          <Text style={styles.playPauseButtonText}>
            {isPlaying ? '⏸ PAUSE VIDEO' : '▶ PLAY 3D VIDEO'}
          </Text>
        </TouchableOpacity>

        <View style={styles.speedButtonGroup}>
          <Text style={[styles.speedLabel, { color: '#94A3B8' }]}>SPEED:</Text>
          {([0.25, 0.5, 1, 1.5, 2] as const).map((s) => {
            const isSel = speed === s;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.7}
                style={[
                  styles.speedPillBtn,
                  isSel && { backgroundColor: '#FF3B30' },
                ]}
                onPress={() => handleSpeedChange(s)}
              >
                <Text
                  style={[
                    styles.speedPillBtnText,
                    {
                      color: isSel ? '#fff' : '#94A3B8',
                      fontWeight: isSel ? '900' : '600',
                    },
                  ]}
                >
                  {s}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// ==========================================================================
// PURE JAVASCRIPT CANVAS DRAWING ENGINE (FOR BOTH WEBVIEW & WEB CANVAS)
// ==========================================================================
const ANATOMICAL_CANVAS_ENGINE_JS = `
function renderMuscleWikiStyleLifter(ctx, w, h, exercise, type, prog, view, highlightPart, isMini, deg, tension) {
  ctx.clearRect(0, 0, w, h);

  var bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#242A33');
  bgGrad.addColorStop(0.6, '#181D23');
  bgGrad.addColorStop(1, '#111419');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  var lightVignette = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.75);
  lightVignette.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
  lightVignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = lightVignette;
  ctx.fillRect(0, 0, w, h);

  if (!isMini) {
    ctx.save();
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Impact", "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    var name = (exercise && exercise.name) ? exercise.name : 'Exercise';
    var words = name.split(' ');
    if (words.length > 2) {
      var line1 = words.slice(0, 2).join(' ');
      var line2 = words.slice(2).join(' ');
      ctx.fillText(line1, w * 0.5, 36);
      ctx.fillText(line2, w * 0.5, 64);
    } else {
      ctx.fillText(name, w * 0.5, 44);
    }
    ctx.restore();
  }

  if (!isMini) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.90, w * 0.32, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.restore();
  }

  var exId = (exercise && exercise.id) ? exercise.id : '';
  if (type === 'abs_crunch' || exId.indexOf('crunch') !== -1 || exId.indexOf('leg_raise') !== -1 || exId.indexOf('plank') !== -1) {
    drawAnatomicalStraightArmCrunch(ctx, w, h, prog, view, highlightPart, isMini, deg, tension);
  } else if (view === 'front') {
    drawAnatomicalFrontalView(ctx, w, h, prog, highlightPart, type, isMini, deg, tension);
  } else if (type === 'bicep_curl' || type === 'incline_curl' || type === 'preacher_curl' || type === 'hammer_curl') {
    drawAnatomicalBicepCurl(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'tricep_pushdown' || type === 'skullcrushers' || type === 'overhead_tricep') {
    drawAnatomicalTricepPushdown(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'bench_press' || type === 'incline_press' || type === 'chest_fly') {
    drawAnatomicalBenchPress(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'deadlift') {
    drawAnatomicalDeadlift(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'overhead_press') {
    drawAnatomicalOverheadPress(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'lateral_raise') {
    drawAnatomicalLateralRaise(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'lat_pulldown' || type === 'barbell_row') {
    drawAnatomicalLatPulldown(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else if (type === 'squat' || type === 'leg_extension' || type === 'calf_raise') {
    drawAnatomicalSquat(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension);
  } else {
    drawAnatomicalBicepCurl(ctx, w, h, prog, view, highlightPart, 'bicep_curl', isMini, deg, tension);
  }
}

function drawAnatomicalStraightArmCrunch(ctx, w, h, prog, view, highlightPart, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.15;
  var centerX = w * 0.5;
  var groundY = isMini ? h * 0.72 : h * 0.78;

  var silverBase = '#CBD5E1';
  var silverHighlight = '#F8FAFC';
  var silverShadow = '#475569';
  var silverDeep = '#1E293B';
  var activeRed = '#FF3B30';
  var redHighlight = '#FF6B6B';
  var redDeep = '#990000';

  var crunchLift = prog * 28 * scale;
  var crunchAngle = prog * 0.22;

  ctx.save();
  var legGrad = ctx.createLinearGradient(centerX - 160 * scale, groundY, centerX - 80 * scale, groundY - 70 * scale);
  legGrad.addColorStop(0, silverDeep);
  legGrad.addColorStop(0.5, silverBase);
  legGrad.addColorStop(1, silverHighlight);

  ctx.beginPath();
  ctx.moveTo(centerX - 85 * scale, groundY - 20 * scale);
  ctx.quadraticCurveTo(centerX - 120 * scale, groundY - 95 * scale, centerX - 145 * scale, groundY - 80 * scale);
  ctx.lineTo(centerX - 125 * scale, groundY - 70 * scale);
  ctx.quadraticCurveTo(centerX - 105 * scale, groundY - 45 * scale, centerX - 65 * scale, groundY - 15 * scale);
  ctx.closePath();
  ctx.fillStyle = legGrad;
  ctx.fill();

  drawAnatomicalStriations(ctx, centerX - 120 * scale, groundY - 55 * scale, 35 * scale, -0.6, silverHighlight, silverDeep);

  ctx.beginPath();
  ctx.moveTo(centerX - 145 * scale, groundY - 80 * scale);
  ctx.quadraticCurveTo(centerX - 180 * scale, groundY - 40 * scale, centerX - 195 * scale, groundY);
  ctx.lineTo(centerX - 165 * scale, groundY);
  ctx.quadraticCurveTo(centerX - 155 * scale, groundY - 35 * scale, centerX - 125 * scale, groundY - 70 * scale);
  ctx.closePath();
  ctx.fillStyle = legGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX - 135 * scale, groundY - 75 * scale, 8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = silverHighlight;
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(centerX - 88 * scale, groundY - 35 * scale, 48 * scale, 34 * scale, 8);
  ctx.fillStyle = '#090D12';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(centerX - 60 * scale, groundY - 15 * scale);
  ctx.rotate(-crunchAngle);

  ctx.fillStyle = silverShadow;
  ctx.beginPath();
  ctx.roundRect(0, 0, 110 * scale, 24 * scale, 6);
  ctx.fill();

  var abGrad = ctx.createLinearGradient(15 * scale, -10 * scale, 85 * scale, 15 * scale);
  abGrad.addColorStop(0, redDeep);
  abGrad.addColorStop(0.4, activeRed);
  abGrad.addColorStop(0.8, redHighlight);
  abGrad.addColorStop(1, redDeep);

  ctx.beginPath();
  ctx.moveTo(15 * scale, -16 * scale);
  ctx.lineTo(85 * scale, -14 * scale);
  ctx.lineTo(80 * scale, 8 * scale);
  ctx.lineTo(10 * scale, 6 * scale);
  ctx.closePath();
  ctx.fillStyle = abGrad;
  ctx.shadowColor = activeRed;
  ctx.shadowBlur = 12 + prog * 16;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = redDeep;
  for (var i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.rect(20 * scale + i * 16 * scale, -16 * scale, 2.5 * scale, 22 * scale);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.rect(15 * scale, -5 * scale, 68 * scale, 2.5 * scale);
  ctx.fill();

  ctx.fillStyle = redHighlight;
  for (var s = 0; s < 3; s++) {
    ctx.beginPath();
    ctx.ellipse(65 * scale + s * 8 * scale, -2 * scale + s * 3 * scale, 6 * scale, 2.5 * scale, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  var chestGrad = ctx.createLinearGradient(70 * scale, -18 * scale, 115 * scale, 5 * scale);
  chestGrad.addColorStop(0, silverHighlight);
  chestGrad.addColorStop(0.7, silverBase);
  chestGrad.addColorStop(1, silverDeep);

  ctx.beginPath();
  ctx.moveTo(80 * scale, -16 * scale);
  ctx.quadraticCurveTo(105 * scale, -24 * scale, 125 * scale, -10 * scale);
  ctx.lineTo(120 * scale, 8 * scale);
  ctx.lineTo(75 * scale, 8 * scale);
  ctx.closePath();
  ctx.fillStyle = chestGrad;
  ctx.fill();

  var headX = 135 * scale;
  var headY = -6 * scale - crunchLift * 0.4;

  ctx.beginPath();
  ctx.moveTo(118 * scale, -10 * scale);
  ctx.lineTo(headX - 6 * scale, headY + 8 * scale);
  ctx.lineTo(headX + 6 * scale, headY + 8 * scale);
  ctx.lineTo(124 * scale, 4 * scale);
  ctx.closePath();
  ctx.fillStyle = silverBase;
  ctx.fill();

  var headGrad = ctx.createRadialGradient(headX + 4 * scale, headY - 4 * scale, 2, headX, headY, 16 * scale);
  headGrad.addColorStop(0, silverHighlight);
  headGrad.addColorStop(0.7, silverBase);
  headGrad.addColorStop(1, silverShadow);

  ctx.beginPath();
  ctx.moveTo(headX - 10 * scale, headY + 6 * scale);
  ctx.lineTo(headX + 14 * scale, headY + 2 * scale);
  ctx.lineTo(headX + 8 * scale, headY - 14 * scale);
  ctx.quadraticCurveTo(headX - 12 * scale, headY - 20 * scale, headX - 18 * scale, headY - 4 * scale);
  ctx.closePath();
  ctx.fillStyle = headGrad;
  ctx.fill();

  var shoulderX = 110 * scale;
  var shoulderY = -12 * scale;

  ctx.beginPath();
  ctx.arc(shoulderX, shoulderY, 14 * scale, 0, Math.PI * 2);
  ctx.fillStyle = silverHighlight;
  ctx.fill();

  var armLen = 110 * scale;
  var armGrad = ctx.createLinearGradient(shoulderX, shoulderY, shoulderX - 10 * scale, shoulderY - armLen);
  armGrad.addColorStop(0, silverDeep);
  armGrad.addColorStop(0.4, silverBase);
  armGrad.addColorStop(0.8, silverHighlight);
  armGrad.addColorStop(1, silverBase);

  ctx.beginPath();
  ctx.moveTo(shoulderX - 8 * scale, shoulderY);
  ctx.lineTo(shoulderX - 18 * scale, shoulderY - armLen);
  ctx.lineTo(shoulderX + 6 * scale, shoulderY - armLen);
  ctx.lineTo(shoulderX + 14 * scale, shoulderY);
  ctx.closePath();
  ctx.fillStyle = armGrad;
  ctx.fill();

  drawAnatomicalStriations(ctx, shoulderX - 4 * scale, shoulderY - armLen * 0.45, 26 * scale, -1.57, silverHighlight, silverDeep);
  drawAnatomicalStriations(ctx, shoulderX - 8 * scale, shoulderY - armLen * 0.78, 20 * scale, -1.57, silverHighlight, silverDeep);

  var handsY = shoulderY - armLen;
  var handsX = shoulderX - 6 * scale;

  ctx.fillStyle = silverHighlight;
  for (var f = -2; f <= 2; f++) {
    ctx.beginPath();
    ctx.roundRect(handsX + f * 5.5 * scale, handsY - 22 * scale, 4 * scale, 22 * scale, 2);
    ctx.fill();
  }

  var dbY = handsY - 26 * scale;
  var dbX = handsX + 4 * scale;

  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(dbX - 16 * scale, dbY - 4 * scale, 32 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(dbX - 28 * scale, dbY - 22 * scale, 14 * scale, 44 * scale, 4);
  ctx.roundRect(dbX + 14 * scale, dbY - 22 * scale, 14 * scale, 44 * scale, 4);
  ctx.fill();

  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function drawAnatomicalBicepCurl(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : view === 'zoom' ? 1.75 : 1.22;
  var originX = isMini ? w * 0.44 : w * 0.45;
  var originY = isMini ? h * 0.20 : view === 'zoom' ? h * 0.24 : h * 0.16;

  var silverBase = '#CBD5E1';
  var silverHighlight = '#F8FAFC';
  var silverShadow = '#475569';
  var silverDeep = '#1E293B';
  var activeRed = highlightPart === 'brachialis' || type === 'hammer_curl' ? '#FF6B00' : '#FF3B30';
  var redHighlight = '#FFA39E';
  var redDeep = '#990000';

  var headX = originX - (isMini ? 8 : 16 * scale);
  var headY = originY + (isMini ? 12 : 24 * scale);
  var shoulderX = originX;
  var shoulderY = originY + (isMini ? 26 : 68 * scale);

  var upperArmLen = (isMini ? 26 : 72) * scale;
  var elbowX = shoulderX + 2;
  var elbowY = shoulderY + upperArmLen;

  var forearmLen = (isMini ? 28 : 76) * scale;
  var startRad = (Math.PI / 2) + 0.08;
  var curlRad = startRad - (prog * (Math.PI * 0.68));
  var wristX = elbowX + Math.cos(curlRad) * forearmLen;
  var wristY = elbowY + Math.sin(curlRad) * forearmLen;

  if (!isMini && view !== 'zoom') {
    var legGrad = ctx.createLinearGradient(originX - 35 * scale, originY + 140 * scale, originX, originY + 240 * scale);
    legGrad.addColorStop(0, silverDeep);
    legGrad.addColorStop(0.5, silverBase);
    legGrad.addColorStop(1, silverHighlight);

    ctx.beginPath();
    ctx.moveTo(originX - 32 * scale, originY + 130 * scale);
    ctx.quadraticCurveTo(originX - 42 * scale, originY + 160 * scale, originX - 26 * scale, originY + 190 * scale);
    ctx.lineTo(originX - 8 * scale, originY + 190 * scale);
    ctx.quadraticCurveTo(originX - 5 * scale, originY + 160 * scale, originX - 8 * scale, originY + 130 * scale);
    ctx.closePath();
    ctx.fillStyle = legGrad;
    ctx.fill();

    drawAnatomicalStriations(ctx, originX - 24 * scale, originY + 160 * scale, 30 * scale, 1.4, silverHighlight, silverDeep);

    ctx.beginPath();
    ctx.arc(originX - 18 * scale, originY + 190 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fillStyle = silverHighlight;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(originX - 26 * scale, originY + 192 * scale);
    ctx.quadraticCurveTo(originX - 36 * scale, originY + 215 * scale, originX - 24 * scale, originY + 242 * scale);
    ctx.lineTo(originX - 8 * scale, originY + 242 * scale);
    ctx.quadraticCurveTo(originX - 4 * scale, originY + 215 * scale, originX - 10 * scale, originY + 192 * scale);
    ctx.closePath();
    ctx.fillStyle = legGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(originX - 36 * scale, originY + 115 * scale, 38 * scale, 42 * scale, 6);
    ctx.fillStyle = '#0B0F14';
    ctx.fill();
  }

  if (!isMini && view !== 'zoom') {
    var torsoGrad = ctx.createLinearGradient(originX - 40 * scale, 0, originX + 10 * scale, 0);
    torsoGrad.addColorStop(0, silverDeep);
    torsoGrad.addColorStop(0.6, silverBase);
    torsoGrad.addColorStop(1, silverHighlight);

    ctx.beginPath();
    ctx.moveTo(originX - 14 * scale, originY + 40 * scale);
    ctx.lineTo(originX + 12 * scale, originY + 44 * scale);
    ctx.lineTo(originX + 8 * scale, originY + 70 * scale);
    ctx.quadraticCurveTo(originX + 14 * scale, originY + 95 * scale, originX + 2 * scale, originY + 120 * scale);
    ctx.lineTo(originX - 34 * scale, originY + 120 * scale);
    ctx.quadraticCurveTo(originX - 44 * scale, originY + 80 * scale, originX - 36 * scale, originY + 44 * scale);
    ctx.closePath();
    ctx.fillStyle = torsoGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(originX - 26 * scale, originY + 50 * scale, 32 * scale, 22 * scale, 6);
    ctx.fillStyle = silverHighlight;
    ctx.fill();

    ctx.fillStyle = silverDeep;
    for (var ab = 0; ab < 3; ab++) {
      ctx.beginPath();
      ctx.roundRect(originX - 18 * scale, originY + (78 + ab * 13) * scale, 12 * scale, 9 * scale, 3);
      ctx.fill();
    }
  }

  if (!isMini && view !== 'zoom') {
    var headGrad = ctx.createRadialGradient(headX + 4 * scale, headY - 4 * scale, 4, headX, headY, 18 * scale);
    headGrad.addColorStop(0, silverHighlight);
    headGrad.addColorStop(0.8, silverBase);
    headGrad.addColorStop(1, silverShadow);

    ctx.beginPath();
    ctx.arc(headX, headY, 16 * scale, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(headX - 2 * scale, headY - 4 * scale, 16 * scale, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowX, elbowY);
  ctx.strokeStyle = silverShadow;
  ctx.lineWidth = (isMini ? 6 : 16) * scale;
  ctx.lineCap = 'round';
  ctx.stroke();

  var bicepBulge = (isMini ? 4 : 14) + prog * (isMini ? 8 : 22) * scale;
  var bicepMidX = (shoulderX + elbowX) / 2 - bicepBulge * 0.85;
  var bicepMidY = (shoulderY + elbowY) / 2;

  var bicepGrad = ctx.createRadialGradient(bicepMidX, bicepMidY, 2, bicepMidX, bicepMidY, bicepBulge * 1.6);
  bicepGrad.addColorStop(0, '#FFFFFF');
  bicepGrad.addColorStop(0.25, activeRed);
  bicepGrad.addColorStop(0.75, redDeep);
  bicepGrad.addColorStop(1, 'rgba(153, 0, 0, 0)');

  ctx.beginPath();
  ctx.moveTo(shoulderX - 4 * scale, shoulderY + 8 * scale);
  ctx.quadraticCurveTo(bicepMidX - bicepBulge * 0.95, bicepMidY, elbowX - 4 * scale, elbowY - 6 * scale);
  ctx.quadraticCurveTo(bicepMidX + 8 * scale, bicepMidY, shoulderX - 4 * scale, shoulderY + 8 * scale);
  ctx.fillStyle = bicepGrad;
  if (!isMini) {
    ctx.shadowColor = activeRed;
    ctx.shadowBlur = 16 + prog * 18;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  if (!isMini) {
    ctx.strokeStyle = redHighlight;
    ctx.lineWidth = 1.5;
    for (var f = 0.2; f <= 0.8; f += 0.12) {
      var fx1 = shoulderX + (elbowX - shoulderX) * f - bicepBulge * 0.35;
      var fy1 = shoulderY + (elbowY - shoulderY) * f;
      var fx2 = fx1 - (8 + prog * 14);
      var fy2 = fy1 + 2;
      ctx.beginPath();
      ctx.moveTo(fx1, fy1);
      ctx.lineTo(fx2, fy2);
      ctx.stroke();
    }
  }

  var forearmGrad = ctx.createLinearGradient(elbowX, elbowY, wristX, wristY);
  forearmGrad.addColorStop(0, silverBase);
  forearmGrad.addColorStop(0.5, silverHighlight);
  forearmGrad.addColorStop(1, silverShadow);

  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(wristX, wristY);
  ctx.strokeStyle = forearmGrad;
  ctx.lineWidth = (isMini ? 5 : 13) * scale;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(wristX, wristY, (isMini ? 3 : 7) * scale, 0, Math.PI * 2);
  ctx.fillStyle = silverHighlight;
  ctx.fill();

  var barX = wristX + (isMini ? 2 : 6);
  var barY = wristY;

  ctx.save();
  ctx.translate(barX, barY);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(-4 * scale, -38 * scale, 8 * scale, 76 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-16 * scale, -42 * scale, 32 * scale, 10 * scale, 3);
  ctx.roundRect(-16 * scale, 32 * scale, 32 * scale, 10 * scale, 3);
  ctx.fill();
  ctx.fillStyle = '#FF3B30';
  ctx.fillRect(-14 * scale, -41 * scale, 28 * scale, 2 * scale);
  ctx.fillRect(-14 * scale, 39 * scale, 28 * scale, 2 * scale);
  ctx.restore();

  ctx.restore();
}

function drawAnatomicalTricepPushdown(ctx, w, h, prog, view, highlightPart, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : view === 'zoom' ? 1.75 : 1.22;
  var originX = isMini ? w * 0.45 : w * 0.46;
  var originY = isMini ? h * 0.20 : h * 0.16;

  var silverBase = '#CBD5E1';
  var silverHighlight = '#F8FAFC';
  var silverShadow = '#475569';
  var activeRed = '#FF3B30';
  var redDeep = '#990000';

  if (!isMini && view !== 'zoom') {
    ctx.save();
    ctx.translate(originX - 16 * scale, originY + 80 * scale);
    ctx.rotate(0.16);
    ctx.beginPath();
    ctx.roundRect(-24 * scale, -50 * scale, 48 * scale, 96 * scale, 10);
    ctx.fillStyle = silverShadow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-4 * scale, -68 * scale, 16 * scale, 0, Math.PI * 2);
    ctx.fillStyle = silverHighlight;
    ctx.fill();
    ctx.restore();
  }

  var shoulderX = originX - 4 * scale;
  var shoulderY = originY + (isMini ? 12 : 46 * scale);

  var upperArmLen = (isMini ? 24 : 64) * scale;
  var elbowX = shoulderX + 6 * scale;
  var elbowY = shoulderY + upperArmLen;

  var forearmLen = (isMini ? 26 : 68) * scale;
  var startRad = -Math.PI * 0.52;
  var pushRad = startRad + prog * (Math.PI * 0.54);
  var wristX = elbowX + Math.cos(pushRad) * forearmLen;
  var wristY = elbowY + Math.sin(pushRad) * forearmLen;

  if (!isMini) {
    ctx.beginPath();
    ctx.arc(elbowX + 24 * scale, 16, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#334E68';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(elbowX + 24 * scale, 16);
    ctx.lineTo(wristX + 4 * scale, wristY);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowX, elbowY);
  ctx.strokeStyle = silverShadow;
  ctx.lineWidth = (isMini ? 5 : 15) * scale;
  ctx.lineCap = 'round';
  ctx.stroke();

  var flare = (isMini ? 4 : 12) + prog * (isMini ? 6 : 20) * scale;
  var midX = (shoulderX + elbowX) / 2 + flare * 0.85;
  var midY = (shoulderY + elbowY) / 2;

  var tricepGrad = ctx.createRadialGradient(midX, midY, 2, midX, midY, flare * 1.6);
  tricepGrad.addColorStop(0, '#FFFFFF');
  tricepGrad.addColorStop(0.3, activeRed);
  tricepGrad.addColorStop(0.85, redDeep);
  tricepGrad.addColorStop(1, 'rgba(153, 0, 0, 0)');

  ctx.beginPath();
  ctx.moveTo(shoulderX + 4 * scale, shoulderY + 4 * scale);
  ctx.quadraticCurveTo(midX + flare * 0.75, midY, elbowX + 4 * scale, elbowY - 4 * scale);
  ctx.quadraticCurveTo(midX - 6 * scale, midY, shoulderX + 4 * scale, shoulderY + 4 * scale);
  ctx.fillStyle = tricepGrad;
  if (!isMini) {
    ctx.shadowColor = activeRed;
    ctx.shadowBlur = 16 + prog * 18;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(wristX, wristY);
  ctx.strokeStyle = silverBase;
  ctx.lineWidth = (isMini ? 5 : 13) * scale;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.fillStyle = '#E2E8F0';
  ctx.roundRect(wristX - 4 * scale, wristY - 2 * scale, 12 * scale, 16 * scale, 4);
  ctx.fill();
  ctx.fillStyle = '#FF3B30';
  ctx.beginPath();
  ctx.arc(wristX + 2 * scale, wristY + 16 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAnatomicalFrontalView(ctx, w, h, prog, highlightPart, type, isMini, deg, tension) {
  ctx.save();
  var scale = 1.15;
  var centerX = w * 0.5;
  var originY = h * 0.16;

  var silverBase = '#CBD5E1';
  var silverHighlight = '#F8FAFC';
  var silverShadow = '#475569';
  var activeRed = '#FF3B30';

  ctx.beginPath();
  ctx.arc(centerX, originY + 20 * scale, 16 * scale, 0, Math.PI * 2);
  ctx.fillStyle = silverHighlight;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX - 42 * scale, originY + 54 * scale);
  ctx.lineTo(centerX + 42 * scale, originY + 54 * scale);
  ctx.lineTo(centerX + 26 * scale, originY + 140 * scale);
  ctx.lineTo(centerX - 26 * scale, originY + 140 * scale);
  ctx.closePath();
  ctx.fillStyle = silverShadow;
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(centerX - 38 * scale, originY + 58 * scale, 35 * scale, 26 * scale, 6);
  ctx.roundRect(centerX + 3 * scale, originY + 58 * scale, 35 * scale, 26 * scale, 6);
  ctx.fillStyle = silverHighlight;
  ctx.fill();

  var shoulderY = originY + 58 * scale;
  var leftShoulderX = centerX - 42 * scale;
  var rightShoulderX = centerX + 42 * scale;
  var armLen = 58 * scale;
  var leftElbowX = leftShoulderX - 4 * scale;
  var leftElbowY = shoulderY + armLen;
  var rightElbowX = rightShoulderX + 4 * scale;
  var rightElbowY = shoulderY + armLen;

  ctx.strokeStyle = silverShadow;
  ctx.lineWidth = 14 * scale;
  ctx.beginPath();
  ctx.moveTo(leftShoulderX, shoulderY);
  ctx.lineTo(leftElbowX, leftElbowY);
  ctx.moveTo(rightShoulderX, shoulderY);
  ctx.lineTo(rightElbowX, rightElbowY);
  ctx.stroke();

  var bicepFlex = 6 + prog * 16 * scale;
  ctx.fillStyle = activeRed;
  ctx.shadowColor = activeRed;
  ctx.shadowBlur = 16 * prog;
  ctx.beginPath();
  ctx.arc(leftElbowX - 6 * scale, leftElbowY - 24 * scale, bicepFlex, 0, Math.PI * 2);
  ctx.arc(rightElbowX + 6 * scale, rightElbowY - 24 * scale, bicepFlex, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  var handY = leftElbowY - prog * 62 * scale;
  var leftHandX = leftElbowX + 6 * scale;
  var rightHandX = rightElbowX - 6 * scale;

  ctx.beginPath();
  ctx.moveTo(leftElbowX, leftElbowY);
  ctx.lineTo(leftHandX, handY);
  ctx.moveTo(rightElbowX, rightElbowY);
  ctx.lineTo(rightHandX, handY);
  ctx.strokeStyle = silverBase;
  ctx.lineWidth = 12 * scale;
  ctx.stroke();

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(centerX - 100 * scale, handY - 4 * scale, 200 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(centerX - 95 * scale, handY - 22 * scale, 14 * scale, 44 * scale, 3);
  ctx.roundRect(centerX + 81 * scale, handY - 22 * scale, 14 * scale, 44 * scale, 3);
  ctx.fill();

  ctx.restore();
}

function drawAnatomicalBenchPress(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var centerY = isMini ? h * 0.5 : h * 0.55;

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(centerX - 140 * scale, centerY + 28 * scale, 280 * scale, 18 * scale, 4);
  ctx.fill();

  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(centerX - 100 * scale, centerY + 2 * scale, 200 * scale, 28 * scale, 8);
  ctx.fill();

  var barY = centerY + 10 * scale - prog * 85 * scale;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 8 * scale, 52 * scale * (1 + prog * 0.4), 20 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(centerX - 130 * scale, barY - 4 * scale, 260 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(centerX - 125 * scale, barY - 26 * scale, 16 * scale, 52 * scale, 4);
  ctx.roundRect(centerX + 109 * scale, barY - 26 * scale, 16 * scale, 52 * scale, 4);
  ctx.fill();
  ctx.restore();
}

function drawAnatomicalLatPulldown(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var centerY = isMini ? h * 0.5 : h * 0.48;

  var barY = centerY - 75 * scale + prog * 90 * scale;

  var latWingSpan = 42 * scale + prog * 35 * scale;
  ctx.beginPath();
  ctx.moveTo(centerX - 16 * scale, centerY - 20 * scale);
  ctx.quadraticCurveTo(centerX - latWingSpan, centerY + 20 * scale, centerX - 12 * scale, centerY + 65 * scale);
  ctx.quadraticCurveTo(centerX, centerY + 75 * scale, centerX + 12 * scale, centerY + 65 * scale);
  ctx.quadraticCurveTo(centerX + latWingSpan, centerY + 20 * scale, centerX + 16 * scale, centerY - 20 * scale);
  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(centerX - 115 * scale, barY - 4 * scale, 230 * scale, 8 * scale, 4);
  ctx.fill();
  ctx.restore();
}

function drawAnatomicalSquat(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var centerY = isMini ? h * 0.5 : h * 0.48;
  var drop = prog * 60 * scale;

  ctx.beginPath();
  ctx.ellipse(centerX - 22 * scale, centerY + 45 * scale + drop * 0.5, 20 * scale * (1 + prog * 0.4), 38 * scale, 0.2, 0, Math.PI * 2);
  ctx.ellipse(centerX + 22 * scale, centerY + 45 * scale + drop * 0.5, 20 * scale * (1 + prog * 0.4), 38 * scale, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(centerX - 110 * scale, centerY - 45 * scale + drop, 220 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(centerX - 105 * scale, centerY - 65 * scale + drop, 14 * scale, 48 * scale);
  ctx.fillRect(centerX + 91 * scale, centerY - 65 * scale + drop, 14 * scale, 48 * scale);
  ctx.restore();
}

function drawAnatomicalDeadlift(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var groundY = h * 0.85;

  var liftHeight = prog * 80 * scale;
  var barY = groundY - 15 * scale - liftHeight;

  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(centerX - 20 * scale, barY - 70 * scale, 40 * scale, 75 * scale, 6);
  ctx.fill();

  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.beginPath();
  ctx.roundRect(centerX - 14 * scale, barY - 45 * scale, 28 * scale, 40 * scale, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(centerX - 115 * scale, barY - 4 * scale, 230 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(centerX - 110 * scale, barY - 24 * scale, 16 * scale, 48 * scale, 4);
  ctx.roundRect(centerX + 94 * scale, barY - 24 * scale, 16 * scale, 48 * scale, 4);
  ctx.fill();
  ctx.restore();
}

function drawAnatomicalOverheadPress(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var originY = h * 0.28;

  var barY = originY + 45 * scale - prog * 80 * scale;

  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(centerX - 24 * scale, originY + 40 * scale, 48 * scale, 85 * scale, 8);
  ctx.fill();

  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.beginPath();
  ctx.arc(centerX - 26 * scale, originY + 42 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.arc(centerX + 26 * scale, originY + 42 * scale, 14 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(centerX - 110 * scale, barY - 4 * scale, 220 * scale, 8 * scale);
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(centerX - 105 * scale, barY - 22 * scale, 14 * scale, 44 * scale, 3);
  ctx.roundRect(centerX + 91 * scale, barY - 22 * scale, 14 * scale, 44 * scale, 3);
  ctx.fill();
  ctx.restore();
}

function drawAnatomicalLateralRaise(ctx, w, h, prog, view, highlight, type, isMini, deg, tension) {
  ctx.save();
  var scale = isMini ? 0.38 : 1.2;
  var centerX = w * 0.5;
  var originY = h * 0.30;

  ctx.fillStyle = '#CBD5E1';
  ctx.beginPath();
  ctx.roundRect(centerX - 24 * scale, originY + 30 * scale, 48 * scale, 80 * scale, 8);
  ctx.fill();

  ctx.fillStyle = '#FF3B30';
  ctx.shadowColor = '#FF3B30';
  ctx.shadowBlur = 16 * prog;
  ctx.beginPath();
  ctx.arc(centerX - 26 * scale, originY + 34 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.arc(centerX + 26 * scale, originY + 34 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  var armAngle = 0.2 + prog * 1.35;
  var armLen = 70 * scale;

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 10 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 26 * scale, originY + 34 * scale);
  ctx.lineTo(centerX - 26 * scale - Math.sin(armAngle) * armLen, originY + 34 * scale + Math.cos(armAngle) * armLen);
  ctx.moveTo(centerX + 26 * scale, originY + 34 * scale);
  ctx.lineTo(centerX + 26 * scale + Math.sin(armAngle) * armLen, originY + 34 * scale + Math.cos(armAngle) * armLen);
  ctx.stroke();

  var lHandX = centerX - 26 * scale - Math.sin(armAngle) * armLen;
  var lHandY = originY + 34 * scale + Math.cos(armAngle) * armLen;
  var rHandX = centerX + 26 * scale + Math.sin(armAngle) * armLen;
  var rHandY = originY + 34 * scale + Math.cos(armAngle) * armLen;

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(lHandX - 8 * scale, lHandY - 14 * scale, 16 * scale, 28 * scale, 3);
  ctx.roundRect(rHandX - 8 * scale, rHandY - 14 * scale, 16 * scale, 28 * scale, 3);
  ctx.fill();
  ctx.restore();
}

function drawAnatomicalStriations(ctx, x, y, length, angle, colorHighlight, colorShadow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (var i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, -length * 0.5);
    ctx.lineTo(i * 4 + 2, length * 0.5);
    ctx.strokeStyle = i % 2 === 0 ? colorHighlight : colorShadow;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
`;

// Helper for Web canvas rendering
function renderMuscleWikiStyleLifterWeb(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  exercise: Exercise,
  type: string,
  prog: number,
  view: 'side' | 'front' | 'iso' | 'zoom',
  highlightPart: string | undefined,
  isMini: boolean,
  deg: number,
  tension: number
) {
  if (typeof (window as any).eval !== 'undefined') {
    if (!(window as any).__musclewiki_engine_initialized) {
      try {
        (0, eval)(ANATOMICAL_CANVAS_ENGINE_JS);
        (window as any).__musclewiki_engine_initialized = true;
      } catch (e) {}
    }
    if (typeof (window as any).renderMuscleWikiStyleLifter === 'function') {
      (window as any).renderMuscleWikiStyleLifter(ctx, w, h, exercise, type, prog, view, highlightPart, isMini, deg, tension);
      return;
    }
  }
}

function getExerciseType(id: string, group: MuscleGroup): string {
  if (id.includes('crunch') || id.includes('leg_raise') || id.includes('plank')) return 'abs_crunch';
  if (id.includes('hammer')) return 'hammer_curl';
  if (id.includes('incline_dumbbell_curl')) return 'incline_curl';
  if (id.includes('preacher')) return 'preacher_curl';
  if (id.includes('pushdown') || id.includes('tricep_pushdown')) return 'tricep_pushdown';
  if (id.includes('skullcrushers')) return 'skullcrushers';
  if (id.includes('overhead_tricep')) return 'overhead_tricep';
  if (id.includes('curl') || (group === 'arms' && !id.includes('tricep') && !id.includes('skull'))) return 'bicep_curl';
  if (id.includes('deadlift')) return 'deadlift';
  if (id.includes('lateral_raise')) return 'lateral_raise';
  if (id.includes('overhead_press') || (group === 'shoulders' && id.includes('press'))) return 'overhead_press';
  if (id.includes('bench') || (id.includes('press') && group === 'chest')) return 'bench_press';
  if (id.includes('fly') || id.includes('crossover')) return 'chest_fly';
  if (id.includes('lat') || id.includes('pull') || group === 'back') return 'lat_pulldown';
  if (id.includes('squat') || id.includes('leg') || group === 'legs') return 'squat';
  return 'bicep_curl';
}

// ==========================================================================
// SELF-CONTAINED HTML GENERATOR FOR ANDROID / IOS WEBVIEW
// ==========================================================================
function buildAnatomicalHTML(
  exercise: Exercise,
  exerciseType: string,
  cameraView: string,
  speed: number,
  isPlaying: boolean,
  highlightPart: string | undefined,
  isMini: boolean
): string {
  const exerciseJson = JSON.stringify(exercise);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #14171C;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
    canvas {
      width: 100vw;
      height: 100vh;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    (function() {
      var canvas = document.getElementById('c');
      var ctx = canvas.getContext('2d');

      // RoundRect polyfill
      if (!ctx.roundRect) {
        ctx.roundRect = function(x, y, w, h, r) {
          if (typeof r === 'undefined') r = 0;
          if (typeof r === 'number') r = [r, r, r, r];
          var tl = r[0] || 0, tr = r[1] || tl, br = r[2] || tl, bl = r[3] || tr;
          this.beginPath();
          this.moveTo(x + tl, y);
          this.lineTo(x + w - tr, y);
          this.quadraticCurveTo(x + w, y, x + w, y + tr);
          this.lineTo(x + w, y + h - br);
          this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
          this.lineTo(x + bl, y + h);
          this.quadraticCurveTo(x, y + h, x, y + h - bl);
          this.lineTo(x, y + tl);
          this.quadraticCurveTo(x, y, x + tl, y);
          this.closePath();
          return this;
        };
      }

      ${ANATOMICAL_CANVAS_ENGINE_JS}

      var exercise = ${exerciseJson};
      var type = "${exerciseType}";
      var view = "${cameraView}";
      var speed = ${speed};
      var isPlaying = ${isPlaying ? 'true' : 'false'};
      var highlightPart = ${highlightPart ? `"${highlightPart}"` : 'undefined'};
      var isMini = ${isMini ? 'true' : 'false'};

      var startTime = Date.now();
      var manualProgress = null;

      function handleMsg(e) {
        try {
          var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (data.type === 'SET_CAMERA') view = data.cameraView;
          if (data.type === 'SET_SPEED') speed = data.speed;
          if (data.type === 'PAUSE') isPlaying = false;
          if (data.type === 'PLAY') {
            isPlaying = true;
            manualProgress = null;
            startTime = Date.now();
          }
          if (data.type === 'SEEK_PHASE') {
            isPlaying = false;
            manualProgress = data.offset;
          }
        } catch(err) {}
      }

      window.addEventListener('message', handleMsg);
      document.addEventListener('message', handleMsg);

      function loop() {
        var dpr = window.devicePixelRatio || 2;
        var displayWidth = window.innerWidth || canvas.clientWidth || 380;
        var displayHeight = window.innerHeight || canvas.clientHeight || (isMini ? 74 : 380);

        if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
          canvas.width = displayWidth * dpr;
          canvas.height = displayHeight * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        var w = displayWidth;
        var h = displayHeight;

        var repDurationMs = 3600 / (speed || 1);
        var elapsed = (Date.now() - startTime) % repDurationMs;
        var progress = elapsed / repDurationMs;

        if (!isPlaying && manualProgress !== null) {
          progress = manualProgress;
        }

        var liftProgress = 0;
        var phaseIdx = 0;

        if (progress < 0.32) {
          var t = progress / 0.32;
          liftProgress = Math.sin((t * Math.PI) / 2);
          phaseIdx = 1;
        } else if (progress < 0.46) {
          liftProgress = 1;
          phaseIdx = 2;
        } else if (progress < 0.90) {
          var t = (progress - 0.46) / 0.44;
          liftProgress = (1 + Math.cos(t * Math.PI)) / 2;
          phaseIdx = 3;
        } else {
          liftProgress = 0;
          phaseIdx = 0;
        }

        var angle = Math.round(165 - liftProgress * 115);
        var pump = Math.round(25 + liftProgress * 75);

        renderMuscleWikiStyleLifter(ctx, w, h, exercise, type, liftProgress, view, highlightPart, isMini, angle, pump);

        ctx.restore();

        if (window.ReactNativeWebView && Math.random() < 0.08) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'TELEMETRY',
            phaseIdx: phaseIdx,
            angle: angle,
            pump: pump
          }));
        }

        requestAnimationFrame(loop);
      }

      loop();
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginVertical: 10,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitleText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  hudBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  hudBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  viewportArea: {
    width: '100%',
    height: 380,
    position: 'relative',
    backgroundColor: '#14171C',
    overflow: 'hidden',
  },
  fullWebView: {
    width: '100%',
    height: 380,
    backgroundColor: '#14171C',
  },
  cameraPillsRow: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    padding: 3,
    gap: 4,
    zIndex: 10,
  },
  camBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  camBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  phaseHUDCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 20, 26, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  phaseIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseHUDTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  phaseHUDDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  scrubberContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#0F1318',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  scrubberRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scrubBlock: {
    flex: 1,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubBlockLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  controlDeck: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#12161D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  playPauseButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  playPauseButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  speedButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  speedLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  speedPillBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  speedPillBtnText: {
    fontSize: 10,
  },
  miniContainer: {
    width: 68,
    height: 74,
    borderRadius: 10,
    overflow: 'hidden',
  },
  miniWebView: {
    width: 68,
    height: 74,
    backgroundColor: '#14171C',
  },
  miniFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
