import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Exercise } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';
import { getExerciseLocalMedia } from '../data/exerciseLocalMedia';
import { EXERCISE_VIDEO_LOOKUP } from '../data/exerciseVideoLookup';
import { EXERCISE_YOUTUBE_IDS } from '../data/exerciseVideoSources';
import { EXERCISE_3D_VIDEOS, MUSCLE_ANATOMY_IMAGES } from '../data/exercisesData';
import { fetchExerciseVideoUrl } from '../services/aiProxy';

const SPEEDS = [0.5, 1] as const;

type Source = 'pending' | 'exercisedb' | 'bundled' | 'none';

/**
 * Demo for one exercise. Streams the ExerciseDB anatomy video when one exists for it (fetched fresh
 * each time, as the plan requires); otherwise plays the bundled 3D demo, or shows a still.
 */
export function ExerciseVideoPlayer({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  const theme = useAppTheme();
  const media = getExerciseLocalMedia(exercise.id);
  const lookup = EXERCISE_VIDEO_LOOKUP[exercise.id];
  const youtubeId = exercise.youtubeId || EXERCISE_YOUTUBE_IDS[exercise.id];
  const still = media?.posterJpg || EXERCISE_3D_VIDEOS[exercise.id] || MUSCLE_ANATOMY_IMAGES[exercise.muscleGroup];

  const player = useVideoPlayer(null, p => {
    p.loop = true;
    p.muted = true;
  });
  const [source, setSource] = useState<Source>('pending');
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const sourceRef = useRef<Source>('pending');
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const remote = lookup ? await fetchExerciseVideoUrl(lookup) : null;
      if (cancelled) return;
      const next: Source = remote ? 'exercisedb' : media ? 'bundled' : 'none';
      setReady(false);
      setFailed(false);
      setSource(next);
      if (next === 'none') return;
      await player.replaceAsync(remote ? { uri: remote } : media!.video);
      if (!cancelled) player.play();
    };
    load().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // media and lookup are fixed per exercise id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id, player]);

  useEffect(() => {
    const playingSub = player.addListener('playingChange', ({ isPlaying }) => setPlaying(isPlaying));
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') setReady(true);
      if (status !== 'error') return;
      // A streamed video that fails falls back to the bundled demo.
      if (sourceRef.current === 'exercisedb' && media) {
        setReady(false);
        setSource('bundled');
        player.replaceAsync(media.video).then(() => player.play()).catch(() => setFailed(true));
      } else {
        setFailed(true);
      }
    });
    return () => {
      playingSub.remove();
      statusSub.remove();
    };
  }, [player, media]);

  const hasVideo = source === 'exercisedb' || source === 'bundled';
  const fromExerciseDb = source === 'exercisedb';
  const togglePlay = () => (player.playing ? player.pause() : player.play());
  const changeSpeed = (next: (typeof SPEEDS)[number]) => {
    player.playbackRate = next;
    setSpeed(next);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
      <View style={[styles.stage, compact && styles.stageCompact, fromExerciseDb && styles.stageWide]}>
        {still && !fromExerciseDb ? <Image source={still} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {hasVideo && !failed ? (
          <VideoView
            player={player}
            style={[StyleSheet.absoluteFill, !ready && styles.hidden]}
            contentFit={fromExerciseDb ? 'contain' : 'cover'}
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            allowsPictureInPicture={false}
          />
        ) : null}

        {source === 'pending' || (hasVideo && !failed) ? (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause demo' : 'Play demo'}
          >
            {!ready ? (
              <View style={styles.pausedOverlay}>
                <ActivityIndicator color="#ffffff" size="large" />
              </View>
            ) : !playing ? (
              <View style={styles.pausedOverlay}>
                <View style={styles.bigPlay}>
                  <Text style={styles.bigPlayIcon}>▶</Text>
                </View>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.noClipBadge}>
            <Text style={styles.noClipText}>No demo clip yet</Text>
          </View>
        )}
        {hasVideo ? (
          <View style={[styles.legend, fromExerciseDb && styles.legendBottom]} pointerEvents="none">
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Working muscle</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        {hasVideo && !failed ? (
          <>
            <TouchableOpacity
              onPress={togglePlay}
              style={[styles.controlBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlBtnText, { color: theme.primaryText }]}>{playing ? '❚❚  Pause' : '▶  Play'}</Text>
            </TouchableOpacity>
            <View style={[styles.speedGroup, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              {SPEEDS.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => changeSpeed(s)}
                  style={[styles.speedBtn, speed === s && { backgroundColor: theme.primarySoft }]}
                  activeOpacity={0.8}
                  accessibilityLabel={`${s}x speed`}
                >
                  <Text style={[styles.speedText, { color: speed === s ? theme.primary : theme.muted }]}>{s === 0.5 ? 'Slow' : '1×'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}
        {youtubeId ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`).catch(() => undefined)}
            style={[styles.youtubeBtn, { borderColor: theme.borderSoft }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.youtubeText, { color: theme.text }]}>▶ Full tutorial</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#8a8a8c',
  },
  stageCompact: {
    aspectRatio: 4 / 3,
  },
  hidden: {
    opacity: 0,
  },
  stageWide: {
    aspectRatio: 16 / 9,
    backgroundColor: '#ffffff',
  },
  legendBottom: {
    top: undefined,
    bottom: 10,
  },
  legend: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#e0301e',
  },
  legendText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigPlayIcon: {
    color: '#ffffff',
    fontSize: 22,
    marginLeft: 3,
  },
  noClipBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noClipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  controlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  speedGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '800',
  },
  youtubeBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  youtubeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});
