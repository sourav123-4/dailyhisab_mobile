import React, { useCallback, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert, StyleSheet, View } from 'react-native';

import { MainTabParamList, RootStackParamList } from '../route-types';
import { TodayWorkoutScreen } from '../../screens/TodayWorkoutScreen';
import { ExerciseExplorerScreen } from '../../screens/ExerciseExplorerScreen';
import { WeightTrackerScreen } from '../../screens/WeightTrackerScreen';
import { AICoachScreen } from '../../screens/AICoachScreen';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { ActiveWorkoutScreen } from '../../screens/ActiveWorkoutScreen';
import { useHisabApp } from '../HisabAppContext';
import { HisabScreenFrame } from '../HisabScreenFrame';
import { SecurityLockModal } from '../../components/SecurityLockModal';
import { Tab } from '../../types';
import { useAppMode } from '../AppModeContext';

import { TitanFitBottomTabBar } from '../../components/TitanFitBottomTabBar';
import { FitnessHeader } from '../../components/FitnessHeader';
import { AppDrawer, FitnessDrawerConfig } from '../../components/AppDrawer';
import { useFitnessApp } from '../FitnessAppContext';
import { localDateISO } from '../../utils/date';

const TabNav = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TitanFitTabsNavigator({ navigation }: { navigation: any }) {
  const hisab = useHisabApp();
  const { setAppMode } = useAppMode();
  const { activeWorkout, startWorkout, weeklySplit, profile } = useFitnessApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState('Today');

  // "Athlete" is only the placeholder profile name; prefer the signed-in account's name.
  const accountName = (hisab.user?.displayName || hisab.user?.email?.split('@')[0] || '').trim();
  const fullName = profile.name && profile.name !== 'Athlete' ? profile.name : accountName || 'Athlete';
  const firstName = fullName.split(/\s+/)[0];
  const initial = (firstName[0] || 'A').toUpperCase();

  const goToTab = useCallback((route: string) => navigation.navigate('MainTabs', { screen: route }), [navigation]);

  const startTodayWorkout = useCallback(() => {
    if (!activeWorkout) {
      const today = weeklySplit.find(day => day.dayIndex === new Date().getDay());
      if (today && !today.isRestDay && today.exerciseIds.length > 0) {
        startWorkout(today.splitTitle, today.exerciseIds, today.targetMuscles);
      } else {
        startWorkout('Free Workout', [], []);
      }
    }
    navigation.navigate('ActiveWorkout');
  }, [activeWorkout, navigation, startWorkout, weeklySplit]);

  const showStreak = useCallback(() => {
    const doneToday = profile.lastWorkoutDate === localDateISO();
    Alert.alert(
      `🔥 ${profile.streakDays}-day streak`,
      doneToday
        ? "You've trained today. Come back tomorrow to keep it going."
        : 'Finish a workout today to keep your streak alive.',
      doneToday ? [{ text: 'Nice' }] : [{ text: 'Later', style: 'cancel' }, { text: 'Start workout', onPress: startTodayWorkout }]
    );
  }, [profile.lastWorkoutDate, profile.streakDays, startTodayWorkout]);

  const fitnessDrawer = useMemo<FitnessDrawerConfig>(() => ({
    activeRoute,
    onNavigate: goToTab,
    onStartWorkout: startTodayWorkout,
    workoutInProgress: !!activeWorkout,
  }), [activeRoute, goToTab, startTodayWorkout, activeWorkout]);

  return (
    <View style={styles.rootContainer}>
      <TabNav.Navigator
        tabBar={(props) => (
          <TitanFitBottomTabBar {...props} workoutInProgress={!!activeWorkout} onStartWorkout={startTodayWorkout} />
        )}
        screenListeners={{
          state: (e: any) => {
            const tabState = e.data?.state;
            if (tabState) setActiveRoute(tabState.routes[tabState.index].name);
          },
        }}
        screenOptions={({ route }) => ({
          headerShown: true,
          tabBarHideOnKeyboard: true,
          header: () => (
            <FitnessHeader
              routeName={route.name}
              firstName={firstName}
              initial={initial}
              streakDays={profile.streakDays}
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpenProfile={() => goToTab('Profile')}
              onOpenStreak={showStreak}
              onSwitchToHisab={() => setAppMode('hisab')}
            />
          ),
        })}
      >
        <TabNav.Screen name="Today" component={TodayWorkoutScreen} />
        <TabNav.Screen name="MuscleExplore" component={ExerciseExplorerScreen} />
        <TabNav.Screen name="AICoach" component={AICoachScreen} />
        <TabNav.Screen name="Weight" component={WeightTrackerScreen} />
        <TabNav.Screen name="Profile" component={ProfileScreen} />
      </TabNav.Navigator>
      <AppDrawer
        isOpen={drawerOpen}
        activeTab={hisab.activeTab}
        modules={hisab.modules}
        localOnly={hisab.localOnly}
        user={hisab.user}
        onClose={() => setDrawerOpen(false)}
        onOpenTab={(tab) => {
          hisab.openTab(tab);
          setAppMode('hisab');
        }}
        onOpenAuth={hisab.openAuth}
        onLogout={hisab.logoutUser}
        onOpenProfile={() => goToTab('Profile')}
        fitness={fitnessDrawer}
      />
    </View>
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

  const navigationProp = useMemo(() => ({ navigate }), [navigate]);

  return <HisabScreenFrame navigation={navigationProp} tab={activeTab} />;
}

export default function AppFlowNavigator() {
  const { appMode } = useAppMode();
  const {
    isLocked,
    securityPin,
    biometricEnabled,
    unlock,
    shouldShowAuthGate,
    upgradePinHash,
    resetAppLockAfterVerification,
    eraseLocalDataAndSignOut,
  } = useHisabApp();

  return (
    <View style={styles.rootContainer}>
      {/* Signed out: the login screen lives in the Hisab frame, whichever half was open. */}
      {appMode === 'hisab' || shouldShowAuthGate ? (
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
        visible={!shouldShowAuthGate && isLocked}
        storedPin={securityPin}
        biometricEnabled={biometricEnabled}
        onUnlock={unlock}
        onPinUpgrade={upgradePinHash}
        onResetLock={resetAppLockAfterVerification}
        onEraseAndSignOut={eraseLocalDataAndSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});
