import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/**
 * Fades and slides its content in whenever `pageKey` changes, so moving between pages reads as a
 * page change. Runs on the native thread (opacity/transform only), so it never blocks a tap.
 */
export function PageTransition({ pageKey, children, style }: { pageKey: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [pageKey, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          // A light touch: barely any fade (a deep fade looked like a dark shadow sweeping the page).
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
