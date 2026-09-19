import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppMode = 'hisab' | 'fitness';

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  toggleAppMode: () => void;
}

const AppModeContext = createContext<AppModeContextType>({
  appMode: 'hisab',
  setAppMode: () => {},
  toggleAppMode: () => {},
});

const APP_MODE_STORAGE_KEY = '@app_active_mode';

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appMode, setAppModeState] = useState<AppMode>('hisab');

  useEffect(() => {
    AsyncStorage.getItem(APP_MODE_STORAGE_KEY).then((saved) => {
      if (saved === 'fitness' || saved === 'hisab') {
        setAppModeState(saved as AppMode);
      }
    });
  }, []);

  const setAppMode = (mode: AppMode) => {
    setAppModeState(mode);
    AsyncStorage.setItem(APP_MODE_STORAGE_KEY, mode);
  };

  const toggleAppMode = () => {
    const next = appMode === 'hisab' ? 'fitness' : 'hisab';
    setAppMode(next);
  };

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode, toggleAppMode }}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => useContext(AppModeContext);
