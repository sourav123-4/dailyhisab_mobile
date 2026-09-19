import React from 'react';
import { StyleSheet, Text, TextInput, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { HisabAppProvider, useHisabApp } from '../navigation/HisabAppContext';
import { FitnessAppProvider, useFitnessApp } from '../navigation/FitnessAppContext';
import { AppModeProvider, useAppMode } from '../navigation/AppModeContext';
import { AppThemeProvider, useAppTheme } from '../theme/appTheme';
import { RootNavigator } from '../navigation/root/RootNavigator';
import { navigationRef } from '../navigation/navigationRef';

enableScreens(true);

const textDefaults = Text as typeof Text & { defaultProps?: Record<string, unknown> };
textDefaults.defaultProps = {
  ...(textDefaults.defaultProps || {}),
  maxFontSizeMultiplier: 1.12,
};

const inputDefaults = TextInput as typeof TextInput & { defaultProps?: Record<string, unknown> };
inputDefaults.defaultProps = {
  ...(inputDefaults.defaultProps || {}),
  maxFontSizeMultiplier: 1.12,
};

const ThemedAppShell = () => {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
};

const ThemedAppContainer = () => {
  const { appMode } = useAppMode();
  const fitness = useFitnessApp();
  const hisab = useHisabApp();

  const activeThemeName = appMode === 'fitness' ? fitness.themeName : (hisab.theme || 'cyber');

  return (
    <AppThemeProvider themeName={activeThemeName}>
      <ThemedAppShell />
    </AppThemeProvider>
  );
};

const App = () => (
  <SafeAreaProvider>
    <GestureHandlerRootView style={styles.root}>
      <AppModeProvider>
        <HisabAppProvider>
          <FitnessAppProvider>
            <ThemedAppContainer />
          </FitnessAppProvider>
        </HisabAppProvider>
      </AppModeProvider>
    </GestureHandlerRootView>
  </SafeAreaProvider>
);

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
