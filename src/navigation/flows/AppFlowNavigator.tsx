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
import { SecurityLockModal } from '../../components/SecurityLockModal';
import { Tab } from '../../types';
import { useAppMode } from '../AppModeContext';

import { TitanFitBottomTabBar } from '../../components/TitanFitBottomTabBar';

const TabNav = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TitanFitTabsNavigator() {
  return (
    <TabNav.Navigator
      tabBar={(props) => <TitanFitBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <TabNav.Screen name="Today" component={TodayWorkoutScreen} />
      <TabNav.Screen name="MuscleExplore" component={ExerciseExplorerScreen} />
      <TabNav.Screen name="AICoach" component={AICoachScreen} />
      <TabNav.Screen name="Weight" component={WeightTrackerScreen} />
      <TabNav.Screen name="Profile" component={ProfileScreen} />
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
  const { isLocked, securityPin, biometricEnabled, unlock } = useHisabApp();

  return (
    <View style={styles.rootContainer}>
      {appMode === 'hisab' ? (
        <DailyHisabFrame />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={TitanFitTabsNavigator} />
          <Stack.Screen
            name="ActiveWorkout"
            component={ActiveWorkoutScreen}
            options={{ presentation: 'fullScreenModal' }}
          />
        </Stack.Navigator>
      )}

      <SecurityLockModal
        visible={isLocked}
        storedPin={securityPin}
        biometricEnabled={biometricEnabled}
        onUnlock={unlock}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
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
