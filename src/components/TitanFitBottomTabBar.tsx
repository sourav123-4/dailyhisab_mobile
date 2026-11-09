import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from './AppIcon';

const TABS: { route: string; label: string; icon: IconName }[] = [
  { route: 'Today', label: 'Today', icon: 'home' },
  { route: 'MuscleExplore', label: 'Exercises', icon: 'dumbbell' },
  { route: 'AICoach', label: 'Coach', icon: 'spark' },
  { route: 'Weight', label: 'Progress', icon: 'scale' },
];

/**
 * Same shape as Daily Hisab's BottomTabBar: two tabs, a raised centre action, two tabs. The centre
 * button starts (or resumes) today's workout instead of voice entry.
 */
export function TitanFitBottomTabBar({
  state,
  navigation,
  workoutInProgress,
  onStartWorkout,
}: BottomTabBarProps & { workoutInProgress: boolean; onStartWorkout: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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

  if (keyboardVisible) return null;

  const currentRoute = state.routes[state.index]?.name;
  const activeColor = theme.primary;
  const inactiveColor = theme.muted;

  const renderTab = ({ route, label, icon }: (typeof TABS)[number]) => {
    const focused = currentRoute === route;
    const target = state.routes.find(r => r.name === route);
    return (
      <TouchableOpacity
        key={route}
        onPress={() => {
          if (!target) return;
          const event = navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route);
        }}
        style={styles.tabButton}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
      >
        <AppIcon name={icon} size={20} color={focused ? activeColor : inactiveColor} />
        <Text style={[styles.tabLabel, { color: focused ? activeColor : inactiveColor, fontWeight: focused ? '700' : '500' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderColor: theme.borderSoft || theme.border,
          paddingBottom: Math.max(insets.bottom + 8, 14),
        },
      ]}
    >
      {TABS.slice(0, 2).map(renderTab)}

      <View style={styles.centerWrapper}>
        <View style={[styles.centerHalo, { backgroundColor: `${theme.primary}29` }]}>
          <TouchableOpacity
            onPress={onStartWorkout}
            style={[
              styles.centerButton,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
            ]}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={workoutInProgress ? 'Resume workout' : "Start today's workout"}
          >
            <AppIcon name="play" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.centerLabel, { color: workoutInProgress ? theme.primary : inactiveColor }]}>
          {workoutInProgress ? 'Resume' : 'Start'}
        </Text>
      </View>

      {TABS.slice(2).map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  centerWrapper: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  centerHalo: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
  },
  centerButton: {
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
  centerLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: -2,
  },
});
