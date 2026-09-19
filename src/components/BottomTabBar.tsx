import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabItem, Tab } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

export const BottomTabBar = React.memo(function BottomTabBar({
  activeTab,
  bottomTabs,
  isRecording,
  onOpenTab,
  onActionPress,
  onVoiceAction,
}: {
  activeTab: Tab;
  bottomTabs: BottomTabItem[];
  isRecording: boolean;
  onOpenTab: (tab: Tab) => void;
  onActionPress?: () => void;
  onVoiceAction?: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const handleAction = onActionPress || onVoiceAction || (() => {});

  const isHomeActive = activeTab === 'dashboard';
  const isHisabActive = activeTab === 'hisab';
  const isInsightsActive = activeTab === 'invest' || activeTab === 'loans' || activeTab === 'debts';
  const isSettingsActive = activeTab === 'budgets';

  const activeColor = theme.primary || '#6d28d9';
  const inactiveColor = theme.muted || '#94a3b8';

  return (
    <View
      style={[
        styles.bottomBarContainer,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSoft || theme.border,
          paddingBottom: Math.max(insets.bottom + 8, 14),
          paddingTop: 10,
        },
      ]}
    >
      {/* Tab 1: Home */}
      <TouchableOpacity
        onPress={() => onOpenTab('dashboard')}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <AppIcon
          name="home"
          size={20}
          color={isHomeActive ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isHomeActive ? activeColor : inactiveColor,
              fontWeight: isHomeActive ? '700' : '500',
            },
          ]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Tab 2: Hisab */}
      <TouchableOpacity
        onPress={() => onOpenTab('hisab')}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <AppIcon
          name="hisab"
          size={19}
          color={isHisabActive ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isHisabActive ? activeColor : inactiveColor,
              fontWeight: isHisabActive ? '700' : '500',
            },
          ]}
        >
          Hisab
        </Text>
      </TouchableOpacity>

      {/* Center Floating Elevated Mic Button (🎤) */}
      <View style={styles.centerButtonWrapper}>
        <View
          style={[
            styles.centerHaloRing,
            {
              backgroundColor: isRecording
                ? 'rgba(239, 68, 68, 0.18)'
                : 'rgba(124, 58, 237, 0.16)',
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleAction}
            style={[
              styles.centerFloatingButton,
              {
                backgroundColor: isRecording ? '#ef4444' : '#6d28d9',
                shadowColor: isRecording ? '#ef4444' : '#6d28d9',
              },
            ]}
            activeOpacity={0.85}
          >
            <AppIcon
              name="voice"
              size={22}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab 4: Insights */}
      <TouchableOpacity
        onPress={() => onOpenTab('invest')}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <AppIcon
          name="reports"
          size={19}
          color={isInsightsActive ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isInsightsActive ? activeColor : inactiveColor,
              fontWeight: isInsightsActive ? '700' : '500',
            },
          ]}
        >
          Insights
        </Text>
      </TouchableOpacity>

      {/* Tab 5: Settings (Settings icon and Settings label as requested) */}
      <TouchableOpacity
        onPress={() => onOpenTab('budgets')}
        style={styles.tabButton}
        activeOpacity={0.7}
      >
        <AppIcon
          name="settings"
          size={20}
          color={isSettingsActive ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isSettingsActive ? activeColor : inactiveColor,
              fontWeight: isSettingsActive ? '700' : '500',
            },
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  centerButtonWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHaloRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
  },
  centerFloatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
});
