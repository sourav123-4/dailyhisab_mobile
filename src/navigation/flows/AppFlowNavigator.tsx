import React, { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../../theme/appTheme';
import { MainTabParamList, RootStackParamList } from '../route-types';
import { TodayWorkoutScreen } from '../../screens/TodayWorkoutScreen';
import { ExerciseExplorerScreen } from '../../screens/ExerciseExplorerScreen';
import { WeightTrackerScreen } from '../../screens/WeightTrackerScreen';
import { AICoachScreen } from '../../screens/AICoachScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { ActiveWorkoutScreen } from '../../screens/ActiveWorkoutScreen';

import { HisabScreenFrame, useHisabApp } from '../HisabAppContext';
import { Tab } from '../../types';
import { useAppMode } from '../AppModeContext';

const TabNav = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({ emoji, label, focused, color }: { emoji: string; label: string; focused: boolean; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, { transform: [{ scale: focused ? 1.15 : 1 }] }]}>{emoji}</Text>
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, { color: focused ? theme.primary : theme.muted, fontWeight: focused ? '800' : '600' }]}
      >
        {label}
      </Text>
    </View>
  );
}

function TitanFitTabsNavigator() {
  const theme = useAppTheme();

  return (
    <TabNav.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSoft,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <TabNav.Screen
        name="Today"
        component={TodayWorkoutScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚡" label="Today" focused={focused} color={color} />
          ),
        }}
      />
      <TabNav.Screen
        name="MuscleExplore"
        component={ExerciseExplorerScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🧬" label="Anatomy" focused={focused} color={color} />
          ),
        }}
      />
      <TabNav.Screen
        name="Weight"
        component={WeightTrackerScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚖️" label="Weight" focused={focused} color={color} />
          ),
        }}
      />
      <TabNav.Screen
        name="AICoach"
        component={AICoachScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🤖" label="AI Coach" focused={focused} color={color} />
          ),
        }}
      />
      <TabNav.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} color={color} />
          ),
        }}
      />
    </TabNav.Navigator>
  );
}

function DailyHisabFrame() {
  const { activeTab, setCurrentTab } = useHisabApp();

  const navigate = useCallback(
    (routeName: string) => {
      setCurrentTab(routeName as Tab);
    },
    [setCurrentTab]
  );

  return <HisabScreenFrame navigation={{ navigate }} tab={activeTab} />;
}

export default function AppFlowNavigator() {
  const { appMode } = useAppMode();

  if (appMode === 'hisab') {
    return <DailyHisabFrame />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TitanFitTabsNavigator} />
      <Stack.Screen
        name="ActiveWorkout"
        component={ActiveWorkoutScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 60,
  },
  tabEmoji: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
