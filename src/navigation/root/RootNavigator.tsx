import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../route-types';
import { useFitnessApp } from '../FitnessAppContext';
import AppFlowNavigator from '../flows/AppFlowNavigator';
import { OnboardingScreen } from '../../screens/OnboardingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useFitnessApp();
  const [hasCompletedIntro, setHasCompletedIntro] = useState(false);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      {!isAuthenticated && !hasCompletedIntro ? (
        <Stack.Screen name="Onboarding">
          {() => <OnboardingScreen onComplete={() => setHasCompletedIntro(true)} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="AppFlow" component={AppFlowNavigator} />
      )}
    </Stack.Navigator>
  );
};
