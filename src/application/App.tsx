import React, { useEffect, useMemo } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, Text, TextInput, StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { HisabAppProvider, useHisabApp } from '../navigation/HisabAppContext';
import { FitnessAppProvider, useFitnessApp } from '../navigation/FitnessAppContext';
import { AppModeProvider } from '../navigation/AppModeContext';
import { AppThemeProvider, useAppTheme } from '../theme/appTheme';
import { RootNavigator } from '../navigation/root/RootNavigator';
import { navigationRef } from '../navigation/navigationRef';

enableScreens(true);

// The native splash stays up until stored data is read, so launch never flashes a blank screen.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 200 });

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

const ThemedAppShell = React.memo(function ThemedAppShell() {
  const theme = useAppTheme();
  // Match navigation's own backgrounds to the app theme so no default white shows through
  // (e.g. behind the tab bar's rounded corners or during screen transitions).
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: theme.bg, card: theme.surface, border: theme.border, text: theme.text, primary: theme.primary },
    };
  }, [theme]);

  return (
    <>
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
});

const ThemedAppContainer = () => {
  const fitness = useFitnessApp();
  const hisab = useHisabApp();

  // One theme for the whole app, so TitanFit matches Daily Hisab.
  const activeThemeName = hisab.theme || 'midnight';
  const ready = hisab.loaded && !fitness.isLoading;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  return (
    <AppThemeProvider themeName={activeThemeName}>
      <ThemedAppShell />
    </AppThemeProvider>
  );
};

// TitanFit data follows the signed-in account; the provider is memoized, so Hisab updates
// that keep the same owner don't re-render it.
const FitnessForCurrentAccount = ({ children }: { children: React.ReactNode }) => {
  const { dataOwner, loaded } = useHisabApp();
  return (
    <FitnessAppProvider owner={dataOwner} ready={loaded}>
      {children}
    </FitnessAppProvider>
  );
};

const themedApp = <ThemedAppContainer />;

const App = () => (
  <SafeAreaProvider>
    <GestureHandlerRootView style={styles.root}>
      <AppModeProvider>
        <HisabAppProvider>
          <FitnessForCurrentAccount>{themedApp}</FitnessForCurrentAccount>
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
