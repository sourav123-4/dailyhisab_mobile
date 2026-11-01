import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/appTheme';

const PulseContext = createContext<Animated.Value | null>(null);

/** Drives one shared pulse for every Skeleton inside it, so a whole placeholder screen breathes together. */
export function SkeletonGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <PulseContext.Provider value={pulse}>
      <View style={style} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
        {children}
      </View>
    </PulseContext.Provider>
  );
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const pulse = useContext(PulseContext);
  const opacity = pulse ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] }) : 0.7;
  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius, backgroundColor: theme.surfaceAlt, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
