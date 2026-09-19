import React, { createContext, ReactNode, useContext, useMemo } from 'react';

export type AppThemeName = 'cyber' | 'midnight' | 'oled' | 'light' | 'emerald';

export type AppTheme = {
  name: AppThemeName;
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  input: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  borderSoft: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  infoSoft: string;
  highlightMuscle: string;
};

const themes: Record<AppThemeName, AppTheme> = {
  cyber: {
    name: 'cyber',
    dark: true,
    bg: '#080B12',
    surface: '#121826',
    surfaceAlt: '#1B2438',
    card: '#151E30',
    input: '#0D1320',
    text: '#F8FBFF',
    muted: '#9CB0CC',
    subtle: '#627694',
    border: 'rgba(255, 71, 87, 0.25)',
    borderSoft: 'rgba(255, 255, 255, 0.09)',
    primary: '#FF4757', // Flame Red
    primarySoft: 'rgba(255, 71, 87, 0.18)',
    primaryText: '#FFFFFF',
    accent: '#00E5FF', // Cyber Cyan
    accentSoft: 'rgba(0, 229, 255, 0.18)',
    danger: '#FF4757',
    dangerSoft: 'rgba(255, 71, 87, 0.16)',
    success: '#2ED573',
    successSoft: 'rgba(46, 213, 115, 0.18)',
    warning: '#FFA502',
    warningSoft: 'rgba(255, 165, 2, 0.18)',
    infoSoft: 'rgba(0, 229, 255, 0.14)',
    highlightMuscle: '#FF4757',
  },
  midnight: {
    name: 'midnight',
    dark: true,
    bg: '#0A0F1D',
    surface: '#121A2B',
    surfaceAlt: '#1B273A',
    card: '#162033',
    input: '#0D1626',
    text: '#F8FBFF',
    muted: '#A9B7CE',
    subtle: '#74839A',
    border: 'rgba(201, 213, 232, 0.14)',
    borderSoft: 'rgba(201, 213, 232, 0.08)',
    primary: '#7C3AED',
    primarySoft: 'rgba(124, 58, 237, 0.20)',
    primaryText: '#FFFFFF',
    accent: '#38BDF8',
    accentSoft: 'rgba(56, 189, 248, 0.18)',
    danger: '#FB7185',
    dangerSoft: 'rgba(251, 113, 133, 0.16)',
    success: '#2DD4BF',
    successSoft: 'rgba(45, 212, 191, 0.15)',
    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    infoSoft: 'rgba(56, 189, 248, 0.13)',
    highlightMuscle: '#FB7185',
  },
  oled: {
    name: 'oled',
    dark: true,
    bg: '#000000',
    surface: '#0A0A0A',
    surfaceAlt: '#171717',
    card: '#121212',
    input: '#060606',
    text: '#FFFFFF',
    muted: '#D4D4D4',
    subtle: '#8B8B8B',
    border: 'rgba(255, 255, 255, 0.16)',
    borderSoft: 'rgba(255, 255, 255, 0.09)',
    primary: '#00E5FF',
    primarySoft: 'rgba(0, 229, 255, 0.20)',
    primaryText: '#000000',
    accent: '#FF4757',
    accentSoft: 'rgba(255, 71, 87, 0.18)',
    danger: '#FF5A7A',
    dangerSoft: 'rgba(255, 90, 122, 0.16)',
    success: '#4ADE80',
    successSoft: 'rgba(74, 222, 128, 0.15)',
    warning: '#FFA502',
    warningSoft: 'rgba(255, 165, 2, 0.15)',
    infoSoft: 'rgba(0, 229, 255, 0.13)',
    highlightMuscle: '#00E5FF',
  },
  light: {
    name: 'light',
    dark: false,
    bg: '#F4F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EAEFF8',
    card: '#FFFFFF',
    input: '#FFFFFF',
    text: '#0F172A',
    muted: '#475569',
    subtle: '#64748B',
    border: '#E2E8F0',
    borderSoft: '#F1F5F9',
    primary: '#E11D48',
    primarySoft: '#FFE4E6',
    primaryText: '#FFFFFF',
    accent: '#0284C7',
    accentSoft: '#E0F2FE',
    danger: '#E11D48',
    dangerSoft: '#FFE4E6',
    success: '#059669',
    successSoft: '#D1FAE5',
    warning: '#D97706',
    warningSoft: '#FEF3C7',
    infoSoft: '#E0E7FF',
    highlightMuscle: '#E11D48',
  },
  emerald: {
    name: 'emerald',
    dark: true,
    bg: '#041411',
    surface: '#0B211F',
    surfaceAlt: '#12362F',
    card: '#0D2722',
    input: '#071C18',
    text: '#F0FDFA',
    muted: '#A0D8CA',
    subtle: '#6AA99B',
    border: 'rgba(153, 246, 228, 0.18)',
    borderSoft: 'rgba(153, 246, 228, 0.10)',
    primary: '#14B8A6',
    primarySoft: 'rgba(20, 184, 166, 0.20)',
    primaryText: '#FFFFFF',
    accent: '#2ED573',
    accentSoft: 'rgba(46, 213, 115, 0.18)',
    danger: '#FB7185',
    dangerSoft: 'rgba(251, 113, 133, 0.16)',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.16)',
    warning: '#F59E0B',
    warningSoft: 'rgba(245, 158, 11, 0.16)',
    infoSoft: 'rgba(45, 212, 191, 0.13)',
    highlightMuscle: '#14B8A6',
  },
};

const AppThemeContext = createContext<AppTheme>(themes.cyber);

export function AppThemeProvider({
  themeName = 'cyber',
  children,
}: {
  themeName?: AppThemeName;
  children: ReactNode;
}) {
  const value = useMemo(() => themes[themeName] || themes.cyber, [themeName]);
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}

export function getAppTheme(themeName: AppThemeName = 'cyber') {
  return themes[themeName] || themes.cyber;
}
