import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/appTheme';

export const TitanFitBottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute?.key]?.options;
  const isTabBarHiddenByOptions =
    (currentOptions?.tabBarStyle as any)?.display === 'none';

  if (isKeyboardVisible || isTabBarHiddenByOptions) {
    return null;
  }

  const activeColor = theme.primary || '#6d28d9';
  const inactiveColor = theme.muted || '#94a3b8';

  const tabConfigs: Record<string, { label: string; emoji: string }> = {
    Today: { label: 'Today', emoji: '⚡' },
    MuscleExplore: { label: 'Anatomy', emoji: '🧬' },
    AICoach: { label: 'TitanAI', emoji: '🤖' },
    Weight: { label: 'Weight', emoji: '⚖️' },
    Profile: { label: 'Profile', emoji: '👤' },
  };

  return (
    <View
      style={[
        styles.bottomBarContainer,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSoft || theme.border,
          paddingBottom: Math.max(insets.bottom + 6, 12),
          paddingTop: 8,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const cfg = tabConfigs[route.name] || { label: route.name, emoji: '⚡' };
        const isCenter = route.name === 'AICoach';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isCenter) {
          return (
            <View key={route.key} style={styles.centerButtonWrapper}>
              <View
                style={[
                  styles.centerHaloRing,
                  {
                    backgroundColor: isFocused
                      ? `${theme.primary}38`
                      : `${theme.primary}1A`,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={onPress}
                  style={[
                    styles.centerFloatingButton,
                    {
                      backgroundColor: theme.primary,
                      shadowColor: theme.primary,
                    },
                  ]}
                  activeOpacity={0.85}
                  accessibilityLabel="TitanAI Coach"
                >
                  <Text style={{ fontSize: 22 }}>🤖</Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? activeColor : inactiveColor,
                    fontWeight: isFocused ? '800' : '600',
                    marginTop: 1,
                  },
                ]}
              >
                {cfg.label}
              </Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
            accessibilityLabel={cfg.label}
          >
            <Text style={[styles.tabEmoji, { transform: [{ scale: isFocused ? 1.15 : 1 }] }]}>
              {cfg.emoji}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? activeColor : inactiveColor,
                  fontWeight: isFocused ? '800' : '600',
                },
              ]}
            >
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
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
  tabEmoji: {
    fontSize: 18,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
  },
  centerFloatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
});
