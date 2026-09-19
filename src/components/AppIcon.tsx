import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type IconName =
  | 'dashboard'
  | 'home'
  | 'hisab'
  | 'voice'
  | 'loans'
  | 'invest'
  | 'salary'
  | 'debts'
  | 'planner'
  | 'budgets'
  | 'settings'
  | 'menu'
  | 'close'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'back'
  | 'arrow-left'
  | 'search'
  | 'filter'
  | 'cloud'
  | 'lock'
  | 'fingerprint'
  | 'faceid'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'share'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-down-circle'
  | 'circle-arrow-down'
  | 'arrow-right'
  | 'food'
  | 'bills'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'trading'
  | 'stocks'
  | 'income'
  | 'emi'
  | 'refresh'
  | 'reload'
  | 'bell'
  | 'bell-dot'
  | 'eye'
  | 'eye-off'
  | 'clock'
  | 'dots-vertical'
  | 'exchange'
  | 'sliders'
  | 'grid'
  | 'shield-check'
  | 'user'
  | 'scan'
  | 'reports'
  | 'logout'
  | 'power'
  | 'building'
  | 'users'
  | 'contact'
  | 'deal'
  | 'document'
  | 'calendar'
  | 'calendar-clock'
  | 'download'
  | 'upload'
  | 'general';

interface AppIconProps {
  name: IconName | string;
  size?: number;
  color?: string;
}

export const AppIcon = React.memo(function AppIcon({
  name,
  size = 20,
  color = '#ffffff',
}: AppIconProps) {
  const iconSize = size;
  const strokeWidth = Math.max(1.8, Math.round(size / 10));

  switch (name) {
    case 'dashboard':
      // 4-box modern grid icon
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'space-between', padding: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: (iconSize - 4) / 2 }}>
            <View style={{ width: (iconSize - 4) / 2, backgroundColor: color, borderRadius: 2.5 }} />
            <View style={{ width: (iconSize - 4) / 2, backgroundColor: color, borderRadius: 2.5, opacity: 0.65 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: (iconSize - 4) / 2 }}>
            <View style={{ width: (iconSize - 4) / 2, backgroundColor: color, borderRadius: 2.5, opacity: 0.65 }} />
            <View style={{ width: (iconSize - 4) / 2, backgroundColor: color, borderRadius: 2.5 }} />
          </View>
        </View>
      );

    case 'hisab':
      // Clean ledger sheet with horizontal lines
      return (
        <View
          style={{
            width: iconSize * 0.85,
            height: iconSize,
            borderRadius: 3,
            borderWidth: strokeWidth,
            borderColor: color,
            padding: 2,
            justifyContent: 'space-around',
          }}
        >
          <View style={{ height: strokeWidth, backgroundColor: color, width: '70%', borderRadius: 1 }} />
          <View style={{ height: strokeWidth, backgroundColor: color, width: '85%', borderRadius: 1 }} />
          <View style={{ height: strokeWidth, backgroundColor: color, width: '50%', borderRadius: 1 }} />
        </View>
      );

    case 'voice':
      // Microphone capsule icon
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.44,
              height: iconSize * 0.65,
              borderRadius: iconSize * 0.22,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 2,
              width: iconSize * 0.72,
              height: iconSize * 0.45,
              borderBottomLeftRadius: iconSize * 0.36,
              borderBottomRightRadius: iconSize * 0.36,
              borderWidth: strokeWidth,
              borderTopWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'edit':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.72,
              height: strokeWidth * 1.3,
              borderRadius: strokeWidth,
              backgroundColor: color,
              transform: [{ rotate: '-38deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.12,
              top: iconSize * 0.18,
              width: strokeWidth * 2.2,
              height: strokeWidth * 2.2,
              borderRadius: 1,
              backgroundColor: color,
              transform: [{ rotate: '-38deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: iconSize * 0.13,
              bottom: iconSize * 0.12,
              width: iconSize * 0.62,
              height: strokeWidth,
              borderRadius: strokeWidth,
              backgroundColor: color,
              opacity: 0.45,
            }}
          />
        </View>
      );

    case 'loans':
      // Card with magnetic strip
      return (
        <View
          style={{
            width: iconSize * 1.05,
            height: iconSize * 0.75,
            borderRadius: 3.5,
            borderWidth: strokeWidth,
            borderColor: color,
            justifyContent: 'space-between',
            paddingVertical: 2,
          }}
        >
          <View style={{ height: strokeWidth * 1.3, backgroundColor: color, width: '100%' }} />
          <View style={{ height: strokeWidth, backgroundColor: color, width: '35%', marginLeft: 2, borderRadius: 1 }} />
        </View>
      );

    case 'invest':
    case 'trading':
    case 'stocks':
      // Trending upward chart icon
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'flex-end', paddingBottom: 1, paddingLeft: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', height: '80%' }}>
            <View style={{ width: (iconSize - 6) / 3, height: '40%', backgroundColor: color, borderRadius: 1.5, opacity: 0.7 }} />
            <View style={{ width: (iconSize - 6) / 3, height: '70%', backgroundColor: color, borderRadius: 1.5, opacity: 0.85 }} />
            <View style={{ width: (iconSize - 6) / 3, height: '100%', backgroundColor: color, borderRadius: 1.5 }} />
          </View>
        </View>
      );

    case 'salary':
    case 'income':
      // Cash / Banknote icon
      return (
        <View
          style={{
            width: iconSize * 1.05,
            height: iconSize * 0.72,
            borderRadius: 3.5,
            borderWidth: strokeWidth,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: iconSize * 0.32, height: iconSize * 0.32, borderRadius: (iconSize * 0.32) / 2, borderWidth: strokeWidth * 0.9, borderColor: color }} />
        </View>
      );

    case 'debts':
      // Two-way horizontal transaction arrows
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'center', gap: iconSize * 0.16 }}>
          {/* Top arrow pointing right */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: strokeWidth, backgroundColor: color, width: '68%', borderRadius: strokeWidth / 2 }} />
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: iconSize * 0.16,
                borderBottomWidth: iconSize * 0.16,
                borderLeftWidth: iconSize * 0.22,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: color,
              }}
            />
          </View>
          {/* Bottom arrow pointing left */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: iconSize * 0.16,
                borderBottomWidth: iconSize * 0.16,
                borderRightWidth: iconSize * 0.22,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderRightColor: color,
              }}
            />
            <View style={{ height: strokeWidth, backgroundColor: color, width: '68%', borderRadius: strokeWidth / 2 }} />
          </View>
        </View>
      );

    case 'planner':
      // Calendar / Target icon
      return (
        <View
          style={{
            width: iconSize * 0.9,
            height: iconSize * 0.95,
            borderRadius: 3.5,
            borderWidth: strokeWidth,
            borderColor: color,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: strokeWidth * 2.2, backgroundColor: color, width: '100%' }} />
          <View style={{ flex: 1, padding: 2, justifyContent: 'space-around' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
            </View>
          </View>
        </View>
      );

    case 'budgets':
    case 'settings':
      // Modern 3-slider equalizer settings icon
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'space-around', paddingVertical: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 1, borderRadius: 1 }} />
            <View style={{ width: strokeWidth * 2.8, height: strokeWidth * 2.8, borderRadius: strokeWidth * 1.4, backgroundColor: color, marginHorizontal: 2 }} />
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 2, borderRadius: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 2, borderRadius: 1 }} />
            <View style={{ width: strokeWidth * 2.8, height: strokeWidth * 2.8, borderRadius: strokeWidth * 1.4, backgroundColor: color, marginHorizontal: 2 }} />
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 1, borderRadius: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 1.2, borderRadius: 1 }} />
            <View style={{ width: strokeWidth * 2.8, height: strokeWidth * 2.8, borderRadius: strokeWidth * 1.4, backgroundColor: color, marginHorizontal: 2 }} />
            <View style={{ height: strokeWidth, backgroundColor: color, flex: 1.8, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'menu':
      // Bold 3-bar Hamburger Icon
      return (
        <View style={{ width: iconSize, height: iconSize * 0.72, justifyContent: 'space-between' }}>
          <View style={{ height: Math.max(2.8, strokeWidth * 1.5), backgroundColor: color, borderRadius: 99, width: '100%' }} />
          <View style={{ height: Math.max(2.8, strokeWidth * 1.5), backgroundColor: color, borderRadius: 99, width: '100%' }} />
          <View style={{ height: Math.max(2.8, strokeWidth * 1.5), backgroundColor: color, borderRadius: 99, width: '100%' }} />
        </View>
      );

    case 'close':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              width: iconSize * 0.72,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: strokeWidth / 2,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: iconSize * 0.72,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: strokeWidth / 2,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.32,
              height: iconSize * 0.55,
              borderBottomWidth: Math.max(2.2, strokeWidth * 1.15),
              borderRightWidth: Math.max(2.2, strokeWidth * 1.15),
              borderColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
              marginTop: -iconSize * 0.12,
              marginLeft: iconSize * 0.06,
            }}
          />
        </View>
      );

    case 'chevron-left':
    case 'arrow-left':
    case 'back':
      // Sleek, balanced back navigation chevron
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.44,
              height: iconSize * 0.44,
              borderLeftWidth: Math.max(2.4, strokeWidth * 1.2),
              borderBottomWidth: Math.max(2.4, strokeWidth * 1.2),
              borderColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }],
              marginLeft: iconSize * 0.12,
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.44,
              height: iconSize * 0.44,
              borderRightWidth: Math.max(2.4, strokeWidth * 1.2),
              borderTopWidth: Math.max(2.4, strokeWidth * 1.2),
              borderColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }],
              marginRight: iconSize * 0.12,
            }}
          />
        </View>
      );

    case 'chevron-up':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.44,
              height: iconSize * 0.44,
              borderLeftWidth: Math.max(2.2, strokeWidth),
              borderTopWidth: Math.max(2.2, strokeWidth),
              borderColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }],
              marginTop: iconSize * 0.16,
            }}
          />
        </View>
      );

    case 'chevron-down':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.44,
              height: iconSize * 0.44,
              borderRightWidth: Math.max(2.2, strokeWidth),
              borderBottomWidth: Math.max(2.2, strokeWidth),
              borderColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }],
              marginBottom: iconSize * 0.16,
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.56,
              height: iconSize * 0.56,
              borderRadius: (iconSize * 0.56) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              marginTop: -iconSize * 0.12,
              marginLeft: -iconSize * 0.12,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.12,
              bottom: iconSize * 0.12,
              width: iconSize * 0.32,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: strokeWidth / 2,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'share':
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'space-between', padding: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: strokeWidth * 2.2, height: strokeWidth * 2.2, borderRadius: strokeWidth * 1.1, backgroundColor: color }} />
            <View style={{ width: strokeWidth * 2.2, height: strokeWidth * 2.2, borderRadius: strokeWidth * 1.1, backgroundColor: color }} />
          </View>
          <View style={{ width: strokeWidth * 2.2, height: strokeWidth * 2.2, borderRadius: strokeWidth * 1.1, backgroundColor: color, alignSelf: 'center' }} />
        </View>
      );

    case 'plus':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: iconSize * 0.72, height: strokeWidth, backgroundColor: color, borderRadius: strokeWidth / 2 }} />
          <View style={{ position: 'absolute', width: strokeWidth, height: iconSize * 0.72, backgroundColor: color, borderRadius: strokeWidth / 2 }} />
        </View>
      );

    case 'trash':
      return (
        <View style={{ width: iconSize * 0.85, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ height: strokeWidth, backgroundColor: color, width: '90%', borderRadius: 1, marginBottom: 2 }} />
          <View
            style={{
              width: '75%',
              height: iconSize * 0.65,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopWidth: 0,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          />
        </View>
      );

    case 'lock':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View
            style={{
              width: iconSize * 0.55,
              height: iconSize * 0.5,
              borderWidth: strokeWidth,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: iconSize * 0.28,
              borderTopRightRadius: iconSize * 0.28,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.55,
              borderRadius: 3.5,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'cloud':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.82,
              height: iconSize * 0.48,
              borderRadius: iconSize * 0.24,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: iconSize * 0.16,
              left: iconSize * 0.26,
              width: iconSize * 0.38,
              height: iconSize * 0.38,
              borderRadius: (iconSize * 0.38) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomColor: 'transparent',
            }}
          />
        </View>
      );

    case 'arrow-up':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: strokeWidth, height: iconSize * 0.65, backgroundColor: color, borderRadius: strokeWidth / 2 }} />
          <View
            style={{
              position: 'absolute',
              top: iconSize * 0.16,
              width: iconSize * 0.35,
              height: iconSize * 0.35,
              borderTopWidth: strokeWidth,
              borderLeftWidth: strokeWidth,
              borderColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-down':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: strokeWidth, height: iconSize * 0.65, backgroundColor: color, borderRadius: strokeWidth / 2 }} />
          <View
            style={{
              position: 'absolute',
              bottom: iconSize * 0.16,
              width: iconSize * 0.35,
              height: iconSize * 0.35,
              borderBottomWidth: strokeWidth,
              borderRightWidth: strokeWidth,
              borderColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-down-circle':
    case 'circle-arrow-down':
      return (
        <View
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            borderWidth: Math.max(1.4, strokeWidth * 0.85),
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Arrow stem */}
          <View
            style={{
              width: Math.max(2, strokeWidth),
              height: iconSize * 0.38,
              backgroundColor: color,
              borderRadius: 1,
              marginBottom: -1,
            }}
          />
          {/* Downward triangle arrow head */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: iconSize * 0.22,
              borderRightWidth: iconSize * 0.22,
              borderTopWidth: iconSize * 0.22,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
        </View>
      );

    case 'food':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.72,
              height: iconSize * 0.72,
              borderRadius: (iconSize * 0.72) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: iconSize * 0.36, height: iconSize * 0.36, borderRadius: (iconSize * 0.36) / 2, borderWidth: strokeWidth * 0.8, borderColor: color }} />
          </View>
        </View>
      );

    case 'bills':
    case 'emi':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: iconSize * 0.2,
              borderRightWidth: iconSize * 0.2,
              borderBottomWidth: iconSize * 0.35,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '15deg' }],
              marginTop: -2,
            }}
          />
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: iconSize * 0.2,
              borderRightWidth: iconSize * 0.2,
              borderTopWidth: iconSize * 0.35,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
              transform: [{ rotate: '15deg' }],
              marginTop: -2,
            }}
          />
        </View>
      );

    case 'transport':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.55,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              justifyContent: 'space-between',
              paddingHorizontal: 2,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1 }}>
              <View style={{ width: 3, height: 2, backgroundColor: color }} />
              <View style={{ width: 3, height: 2, backgroundColor: color }} />
            </View>
          </View>
        </View>
      );

    case 'shopping':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
          <View
            style={{
              width: iconSize * 0.45,
              height: iconSize * 0.35,
              borderWidth: strokeWidth,
              borderBottomWidth: 0,
              borderColor: color,
              borderTopLeftRadius: iconSize * 0.22,
              borderTopRightRadius: iconSize * 0.22,
              marginBottom: -1,
            }}
          />
          <View
            style={{
              width: iconSize * 0.8,
              height: iconSize * 0.55,
              borderRadius: 2.5,
              borderWidth: strokeWidth,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'entertainment':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.65,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderTopWidth: iconSize * 0.15,
                borderBottomWidth: iconSize * 0.15,
                borderLeftWidth: iconSize * 0.22,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: color,
                marginLeft: 2,
              }}
            />
          </View>
        </View>
      );

    case 'health':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: iconSize * 0.68, height: strokeWidth * 1.5, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', width: strokeWidth * 1.5, height: iconSize * 0.68, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'refresh':
    case 'reload':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.76,
              height: iconSize * 0.76,
              borderRadius: (iconSize * 0.76) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: 'transparent',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: iconSize * 0.08,
              right: iconSize * 0.12,
              width: 0,
              height: 0,
              borderLeftWidth: strokeWidth * 1.5,
              borderRightWidth: strokeWidth * 1.5,
              borderBottomWidth: strokeWidth * 2.2,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'bell':
    case 'bell-dot':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.6,
              height: iconSize * 0.6,
              borderTopLeftRadius: iconSize * 0.3,
              borderTopRightRadius: iconSize * 0.3,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
          <View style={{ width: iconSize * 0.8, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: iconSize * 0.2, height: strokeWidth * 1.2, backgroundColor: color, borderRadius: 1, marginTop: 1 }} />
          {name === 'bell-dot' ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#ef4444',
                borderWidth: 1,
                borderColor: '#ffffff',
              }}
            />
          ) : null}
        </View>
      );

    case 'eye':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.52,
              borderRadius: iconSize * 0.26,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: iconSize * 0.22, height: iconSize * 0.22, borderRadius: iconSize * 0.11, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'eye-off':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.52,
              borderRadius: iconSize * 0.26,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: iconSize * 0.22, height: iconSize * 0.22, borderRadius: iconSize * 0.11, backgroundColor: color }} />
          </View>
          <View
            style={{
              position: 'absolute',
              width: iconSize * 0.9,
              height: strokeWidth,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'clock':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.82,
              height: iconSize * 0.82,
              borderRadius: (iconSize * 0.82) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: strokeWidth, height: iconSize * 0.25, backgroundColor: color, position: 'absolute', top: iconSize * 0.14 }} />
            <View style={{ width: iconSize * 0.2, height: strokeWidth, backgroundColor: color, position: 'absolute', right: iconSize * 0.18 }} />
          </View>
        </View>
      );

    case 'dots-vertical':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'space-around', paddingVertical: 2 }}>
          <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: color }} />
        </View>
      );

    case 'filter':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: iconSize * 0.8, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginBottom: 3 }} />
          <View style={{ width: iconSize * 0.55, height: strokeWidth, backgroundColor: color, borderRadius: 1, marginBottom: 3 }} />
          <View style={{ width: iconSize * 0.3, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'exchange':
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'space-around', paddingVertical: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            <View style={{ width: iconSize * 0.55, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
            <Text style={{ color, fontSize: 10, lineHeight: 10, marginLeft: -2, fontWeight: '900' }}>▶</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ color, fontSize: 10, lineHeight: 10, marginRight: -2, fontWeight: '900' }}>◀</Text>
            <View style={{ width: iconSize * 0.55, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'sliders':
      return (
        <View style={{ width: iconSize, height: iconSize, justifyContent: 'space-around', paddingVertical: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: iconSize * 0.3, height: strokeWidth, backgroundColor: color }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
            <View style={{ flex: 1, height: strokeWidth, backgroundColor: color }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: strokeWidth, backgroundColor: color }} />
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
            <View style={{ width: iconSize * 0.3, height: strokeWidth, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'shield-check':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: iconSize * 0.88, lineHeight: iconSize, textAlign: 'center' }}>🛡️</Text>
        </View>
      );

    case 'home':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: iconSize * 0.45,
              borderRightWidth: iconSize * 0.45,
              borderBottomWidth: iconSize * 0.38,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
          <View
            style={{
              width: iconSize * 0.65,
              height: iconSize * 0.45,
              borderWidth: strokeWidth,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <View style={{ width: iconSize * 0.22, height: iconSize * 0.25, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
          </View>
        </View>
      );

    case 'arrow-right':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: iconSize * 0.65, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.15,
              width: iconSize * 0.32,
              height: iconSize * 0.32,
              borderTopWidth: strokeWidth,
              borderRightWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'logout':
      // Doorway frame on left with exit arrow on right
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          {/* Left Doorway Frame */}
          <View
            style={{
              position: 'absolute',
              left: iconSize * 0.1,
              width: iconSize * 0.44,
              height: iconSize * 0.8,
              borderLeftWidth: strokeWidth,
              borderTopWidth: strokeWidth,
              borderBottomWidth: strokeWidth,
              borderColor: color,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
            }}
          />
          {/* Arrow Exit Shaft */}
          <View
            style={{
              position: 'absolute',
              left: iconSize * 0.32,
              width: iconSize * 0.48,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          {/* Arrow Exit Head */}
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.1,
              width: iconSize * 0.28,
              height: iconSize * 0.28,
              borderTopWidth: strokeWidth,
              borderRightWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'scan':
      return (
        <View style={{ width: iconSize, height: iconSize, padding: 2, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: iconSize * 0.25, height: iconSize * 0.25, borderTopWidth: strokeWidth, borderLeftWidth: strokeWidth, borderColor: color, borderTopLeftRadius: 3 }} />
            <View style={{ width: iconSize * 0.25, height: iconSize * 0.25, borderTopWidth: strokeWidth, borderRightWidth: strokeWidth, borderColor: color, borderTopRightRadius: 3 }} />
          </View>
          <View style={{ width: '80%', height: strokeWidth, backgroundColor: color, alignSelf: 'center', opacity: 0.8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: iconSize * 0.25, height: iconSize * 0.25, borderBottomWidth: strokeWidth, borderLeftWidth: strokeWidth, borderColor: color, borderBottomLeftRadius: 3 }} />
            <View style={{ width: iconSize * 0.25, height: iconSize * 0.25, borderBottomWidth: strokeWidth, borderRightWidth: strokeWidth, borderColor: color, borderBottomRightRadius: 3 }} />
          </View>
        </View>
      );

    case 'reports':
      return (
        <View style={{ width: iconSize, height: iconSize, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', padding: 2 }}>
          <View style={{ width: iconSize * 0.2, height: iconSize * 0.45, backgroundColor: color, borderRadius: 2 }} />
          <View style={{ width: iconSize * 0.2, height: iconSize * 0.8, backgroundColor: color, borderRadius: 2 }} />
          <View style={{ width: iconSize * 0.2, height: iconSize * 0.6, backgroundColor: color, borderRadius: 2 }} />
        </View>
      );

    case 'wallet':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.65,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingRight: 2,
            }}
          >
            <View style={{ width: iconSize * 0.2, height: iconSize * 0.2, borderRadius: iconSize * 0.1, backgroundColor: color }} />
          </View>
        </View>
      );

    case 'mail':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.85,
              height: iconSize * 0.6,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <View
              style={{
                width: iconSize * 0.45,
                height: iconSize * 0.35,
                borderBottomWidth: strokeWidth,
                borderRightWidth: strokeWidth,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -iconSize * 0.12,
              }}
            />
          </View>
        </View>
      );

    case 'faceid':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: iconSize * 0.8, height: iconSize * 0.8, borderRadius: 4, borderWidth: strokeWidth, borderColor: color, justifyContent: 'space-around', alignItems: 'center', padding: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '60%' }}>
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: color }} />
              <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: color }} />
            </View>
            <View style={{ width: 3, height: 4, borderLeftWidth: strokeWidth, borderColor: color }} />
            <View style={{ width: 8, height: 3, borderBottomWidth: strokeWidth, borderColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'download':
    case 'upload':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: strokeWidth, height: iconSize * 0.5, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', bottom: 2, width: iconSize * 0.7, height: strokeWidth, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'user':
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.4,
              height: iconSize * 0.4,
              borderRadius: (iconSize * 0.4) / 2,
              backgroundColor: color,
              marginBottom: iconSize * 0.08,
            }}
          />
          <View
            style={{
              width: iconSize * 0.72,
              height: iconSize * 0.38,
              borderTopLeftRadius: iconSize * 0.36,
              borderTopRightRadius: iconSize * 0.36,
              borderBottomLeftRadius: iconSize * 0.18,
              borderBottomRightRadius: iconSize * 0.18,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'power':
      // Power / Standby symbol (circular ring with top opening and vertical notch)
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.78,
              height: iconSize * 0.78,
              borderRadius: (iconSize * 0.78) / 2,
              borderWidth: Math.max(1.8, strokeWidth),
              borderColor: color,
              borderTopColor: 'transparent',
              alignItems: 'center',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: iconSize * 0.1,
              width: Math.max(1.8, strokeWidth),
              height: iconSize * 0.42,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'building':
      // Office / Company building with window grid
      return (
        <View
          style={{
            width: iconSize * 0.75,
            height: iconSize * 0.95,
            borderWidth: Math.max(1.6, strokeWidth * 0.9),
            borderColor: color,
            borderRadius: 2.5,
            justifyContent: 'space-around',
            alignItems: 'center',
            paddingVertical: 2,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '80%' }}>
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 0.5 }} />
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 0.5 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '80%' }}>
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 0.5 }} />
            <View style={{ width: 2.5, height: 2.5, backgroundColor: color, borderRadius: 0.5 }} />
          </View>
          <View style={{ width: 3.5, height: 4.5, borderTopLeftRadius: 1, borderTopRightRadius: 1, backgroundColor: color }} />
        </View>
      );

    case 'users':
      // Multiple users / Leads icon
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          {/* Back user */}
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.12,
              top: iconSize * 0.12,
              width: iconSize * 0.3,
              height: iconSize * 0.3,
              borderRadius: (iconSize * 0.3) / 2,
              borderWidth: strokeWidth * 0.8,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: iconSize * 0.08,
              top: iconSize * 0.45,
              width: iconSize * 0.44,
              height: iconSize * 0.32,
              borderTopLeftRadius: iconSize * 0.22,
              borderTopRightRadius: iconSize * 0.22,
              borderWidth: strokeWidth * 0.8,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
          {/* Front user */}
          <View
            style={{
              position: 'absolute',
              left: iconSize * 0.12,
              top: iconSize * 0.18,
              width: iconSize * 0.34,
              height: iconSize * 0.34,
              borderRadius: (iconSize * 0.34) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: iconSize * 0.06,
              bottom: iconSize * 0.1,
              width: iconSize * 0.52,
              height: iconSize * 0.34,
              borderTopLeftRadius: iconSize * 0.26,
              borderTopRightRadius: iconSize * 0.26,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomWidth: 0,
              backgroundColor: '#ffffff',
            }}
          />
        </View>
      );

    case 'contact':
      // ID Contact Card icon
      return (
        <View
          style={{
            width: iconSize * 0.9,
            height: iconSize * 0.72,
            borderRadius: 3,
            borderWidth: strokeWidth,
            borderColor: color,
            padding: 2,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2.5,
          }}
        >
          <View style={{ width: iconSize * 0.24, height: iconSize * 0.24, borderRadius: (iconSize * 0.24) / 2, backgroundColor: color }} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ height: strokeWidth, backgroundColor: color, width: '100%', borderRadius: 0.5 }} />
            <View style={{ height: strokeWidth, backgroundColor: color, width: '65%', borderRadius: 0.5 }} />
          </View>
        </View>
      );

    case 'deal':
      // Deals / Handshake icon
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: iconSize * 0.75,
              height: iconSize * 0.5,
              borderRadius: 3,
              borderWidth: strokeWidth,
              borderColor: color,
              transform: [{ rotate: '-25deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: iconSize * 0.3,
              height: strokeWidth,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
        </View>
      );

    case 'document':
      // Document / Quotations page icon with folded corner
      return (
        <View
          style={{
            width: iconSize * 0.72,
            height: iconSize * 0.92,
            borderRadius: 2.5,
            borderWidth: strokeWidth,
            borderColor: color,
            padding: 2.5,
            justifyContent: 'space-around',
          }}
        >
          <View style={{ height: strokeWidth, backgroundColor: color, width: '60%', borderRadius: 0.5 }} />
          <View style={{ height: strokeWidth, backgroundColor: color, width: '85%', borderRadius: 0.5 }} />
          <View style={{ height: strokeWidth, backgroundColor: color, width: '75%', borderRadius: 0.5 }} />
        </View>
      );

    case 'calendar':
      // Calendar icon with top rings
      return (
        <View
          style={{
            width: iconSize * 0.85,
            height: iconSize * 0.85,
            borderRadius: 3,
            borderWidth: strokeWidth,
            borderColor: color,
            overflow: 'hidden',
          }}
        >
          <View style={{ height: strokeWidth * 2, backgroundColor: color, width: '100%' }} />
          <View style={{ flex: 1, justifyContent: 'space-around', padding: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
              <View style={{ width: 2, height: 2, backgroundColor: color, borderRadius: 1 }} />
            </View>
          </View>
        </View>
      );

    case 'calendar-clock':
      // Calendar with follow-up clock badge
      return (
        <View style={{ width: iconSize, height: iconSize, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              position: 'absolute',
              top: iconSize * 0.08,
              left: iconSize * 0.08,
              width: iconSize * 0.68,
              height: iconSize * 0.68,
              borderRadius: 2.5,
              borderWidth: strokeWidth * 0.9,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: iconSize * 0.08,
              right: iconSize * 0.08,
              width: iconSize * 0.44,
              height: iconSize * 0.44,
              borderRadius: (iconSize * 0.44) / 2,
              borderWidth: strokeWidth * 0.9,
              borderColor: color,
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 1, height: iconSize * 0.12, backgroundColor: color }} />
          </View>
        </View>
      );

    default:
      return <View style={{ width: iconSize * 0.6, height: iconSize * 0.6, borderRadius: (iconSize * 0.6) / 2, backgroundColor: color }} />;
  }
});
