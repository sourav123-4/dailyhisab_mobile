import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export type DonutSegment = { key: string; value: number; color: string };

/**
 * Real donut chart: each slice is a category's share of the month's spending, drawn with the
 * same colour as its row in the legend. With no spending it shows an empty grey ring.
 */
export function SpendDonut({
  segments,
  size = 150,
  thickness = 18,
  trackColor,
  centerTop,
  centerBottom,
  textColor,
  subtleColor,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  trackColor: string;
  centerTop: string;
  centerBottom: string;
  textColor: string;
  subtleColor: string;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  // A small gap between slices keeps neighbours readable; none when there is a single slice.
  const gap = segments.length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = total > 0
    ? segments
        .filter(s => s.value > 0)
        .map(s => {
          const length = (s.value / total) * circumference;
          const arc = { key: s.key, color: s.color, dash: Math.max(0.5, length - gap), offset };
          offset += length;
          return arc;
        })
    : [];

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={thickness} fill="none" />
          {arcs.map(arc => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${arc.dash} ${circumference}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.top, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {centerTop}
        </Text>
        <Text style={[styles.bottom, { color: subtleColor }]}>{centerBottom}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  top: { fontSize: 16, fontWeight: '900' },
  bottom: { fontSize: 11, fontWeight: '700', marginTop: 2 },
});
