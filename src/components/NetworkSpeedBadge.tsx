import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../theme/appTheme';
import { NetworkSpeedInfo } from '../services/networkSpeed';

interface NetworkSpeedBadgeProps {
  speedInfo: NetworkSpeedInfo;
  onPress?: () => void;
  compact?: boolean;
}

export const NetworkSpeedBadge = React.memo(function NetworkSpeedBadge({
  speedInfo,
  onPress,
  compact = false,
}: NetworkSpeedBadgeProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const isVeryCompact = width < 375;

  const getQualityColor = () => {
    if (!speedInfo.isOnline || speedInfo.quality === 'offline') return theme.danger;
    if (speedInfo.isTransferring) return theme.primary;
    if (speedInfo.quality === 'slow') return theme.warning;
    if (speedInfo.quality === 'medium') return '#eab308'; // warm amber
    return theme.success;
  };

  const badgeColor = getQualityColor();

  return (
    <TouchableOpacity
      onPress={() => {
        speedInfo.refresh();
        onPress?.();
      }}
      activeOpacity={0.72}
      accessibilityLabel={`Network ${speedInfo.speedText}, connection ${speedInfo.connectionType}`}
      style={[
        styles.badge,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.indicatorDot, { backgroundColor: badgeColor }]} />
      <Text style={[styles.speedText, { color: theme.text }]} numberOfLines={1}>
        {isVeryCompact || compact ? speedInfo.shortText : speedInfo.speedText}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 10,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  speedText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
