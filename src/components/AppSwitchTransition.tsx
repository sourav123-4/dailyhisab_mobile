import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { AppMode } from '../navigation/AppModeContext';

const BRAND: Record<AppMode, { name: string; tagline: string; emoji: string; colors: [string, string] }> = {
  hisab: { name: 'Daily Hisab', tagline: 'Your money', emoji: '💰', colors: ['#6D5BD0', '#8B7CF6'] },
  fitness: { name: 'TitanFit', tagline: 'Your fitness', emoji: '💪', colors: ['#1D4ED8', '#3B82F6'] },
};

/**
 * Plays a short branded cover when switching between Daily Hisab and TitanFit: the new app's
 * colour sweeps in, the screens swap underneath it, then it fades away. The person sees clearly
 * which app they are in, and the (heavier) first render of the other app happens behind it.
 */
export function AppSwitchTransition({
  mode,
  children,
}: {
  mode: AppMode;
  children: (shownMode: AppMode) => React.ReactNode;
}) {
  const [shownMode, setShownMode] = useState(mode);
  const [coverMode, setCoverMode] = useState<AppMode | null>(null);
  const cover = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(1)).current;
  const running = useRef<Animated.CompositeAnimation | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (mode === shownMode) return;
    // The saved mode is restored just after launch: show it straight away, no animation.
    if (Date.now() - mountedAt.current < 1500) {
      setShownMode(mode);
      return;
    }
    running.current?.stop();
    setCoverMode(mode);
    cover.setValue(0);
    running.current = Animated.parallel([
      Animated.timing(cover, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(content, { toValue: 0.96, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    running.current.start(({ finished }) => {
      if (!finished) return;
      setShownMode(mode);
      // Give the new app a moment to lay out under the cover before revealing it.
      requestAnimationFrame(() => {
        content.setValue(1.03);
        running.current = Animated.parallel([
          Animated.timing(cover, { toValue: 0, duration: 320, delay: 140, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.timing(content, { toValue: 1, duration: 360, delay: 140, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]);
        running.current.start(({ finished: done }) => done && setCoverMode(null));
      });
    });
    // shownMode is read only to skip no-op changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const brand = coverMode ? BRAND[coverMode] : null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.root, { transform: [{ scale: content }] }]}>{children(shownMode)}</Animated.View>
      {brand ? (
        <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.cover, { backgroundColor: brand.colors[0], opacity: cover }]}>
          <View style={[styles.glow, { backgroundColor: brand.colors[1] }]} />
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [
                  { scale: cover.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                  { translateY: cover.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                ],
              },
            ]}
          >
            <Text style={styles.emoji}>{brand.emoji}</Text>
            <Text style={styles.name}>{brand.name}</Text>
            <Text style={styles.tagline}>{brand.tagline}</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 520, height: 520, borderRadius: 260, top: -180, right: -200, opacity: 0.55 },
  badge: { alignItems: 'center' },
  emoji: { fontSize: 54, marginBottom: 10 },
  name: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: 0.3 },
  tagline: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '700', marginTop: 4 },
});
