import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModuleItem, Tab } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon, IconName } from './AppIcon';
import { useAppMode } from '../navigation/AppModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(310, Math.round(SCREEN_WIDTH * 0.8));

type NavItem = { tab: string; label: string; hint: string; icon: IconName; tint: string };

const MAIN_ITEMS: NavItem[] = [
  { tab: 'dashboard', label: 'Dashboard', hint: 'Balance & insights', icon: 'home', tint: '#8b5cf6' },
  { tab: 'hisab', label: 'Daily Hisab', hint: 'All transactions', icon: 'hisab', tint: '#0ea5e9' },
  { tab: 'notifications', label: 'Notifications', hint: 'EMI and Udhar reminders', icon: 'bell', tint: '#f59e0b' },
];

const MONEY_ITEMS: NavItem[] = [
  { tab: 'loans', label: 'Loans & EMIs', hint: 'Dues and repayments', icon: 'loans', tint: '#f43f5e' },
  { tab: 'invest', label: 'Investments & SIP', hint: 'Portfolio and returns', icon: 'invest', tint: '#10b981' },
  { tab: 'salary', label: 'Salary & Income', hint: 'Credits and payouts', icon: 'salary', tint: '#f59e0b' },
  { tab: 'debts', label: 'Udhar & Debts', hint: 'Lent and borrowed', icon: 'debts', tint: '#ec4899' },
  { tab: 'planner', label: 'Planner & Goals', hint: 'EMI calendar, goals', icon: 'planner', tint: '#6366f1' },
];

const FITNESS_ITEMS: NavItem[] = [
  { tab: 'Today', label: 'Today', hint: 'Plan, streak & nutrition', icon: 'home', tint: '#8b5cf6' },
  { tab: 'MuscleExplore', label: 'Exercises', hint: 'Demos by muscle group', icon: 'dumbbell', tint: '#0ea5e9' },
  { tab: 'AICoach', label: 'AI Coach', hint: 'Ask about training & diet', icon: 'spark', tint: '#f59e0b' },
  { tab: 'Weight', label: 'Progress', hint: 'Weight, body & history', icon: 'scale', tint: '#10b981' },
  { tab: 'Profile', label: 'Profile & goals', hint: 'Targets and preferences', icon: 'user', tint: '#ec4899' },
];

/** When set, the drawer shows TitanFit's sections and routes instead of Daily Hisab's. */
export type FitnessDrawerConfig = {
  activeRoute: string;
  onNavigate: (route: string) => void;
  onStartWorkout: () => void;
  workoutInProgress: boolean;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'G';
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
};

export const AppDrawer = React.memo(function AppDrawer({
  isOpen,
  activeTab,
  localOnly,
  user,
  onClose,
  onOpenTab,
  onOpenAuth,
  onLogout,
  onOpenProfile,
  onOpenPhonePe,
  fitness,
}: {
  isOpen: boolean;
  activeTab: Tab;
  modules: ModuleItem[];
  localOnly: boolean;
  user: any;
  onClose: () => void;
  onOpenTab: (tab: Tab) => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenPhonePe?: () => void;
  fitness?: FitnessDrawerConfig;
}) {
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const [mounted, setMounted] = useState(isOpen);

  if (isOpen && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? 240 : 180,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(() => {
      if (!isOpen) setMounted(false);
    });
    return () => animation.stop();
  }, [isOpen, progress]);

  if (!mounted) return null;

  const drawerTranslateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH, 0] });

  const signedIn = Boolean(user && !user.isAnonymous);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest';
  const displayEmail = user?.email || (localOnly ? 'Offline · saved on this phone' : 'Not signed in');

  const currentTab: string = fitness ? fitness.activeRoute : activeTab;
  const go = (tab: string) => {
    onClose();
    if (tab === currentTab) return;
    if (fitness && FITNESS_ITEMS.some(item => item.tab === tab)) fitness.onNavigate(tab);
    else onOpenTab(tab as Tab);
  };

  const renderItem = (item: NavItem) => {
    const active = currentTab === item.tab;
    return (
      <TouchableOpacity
        key={item.tab}
        onPress={() => go(item.tab)}
        style={[styles.navRow, active && { backgroundColor: theme.primarySoft || `${theme.primary}22` }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        {active ? <View style={[styles.activeBar, { backgroundColor: theme.primary }]} /> : null}
        <View style={[styles.iconTile, { backgroundColor: `${item.tint}22` }]}>
          <AppIcon name={item.icon} size={17} color={item.tint} />
        </View>
        <View style={styles.navTextCol}>
          <Text style={[styles.navLabel, { color: active ? theme.primary : theme.text }]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[styles.navHint, { color: theme.subtle }]} numberOfLines={1}>
            {item.hint}
          </Text>
        </View>
        <AppIcon name="chevron-right" size={13} color={active ? theme.primary : theme.subtle} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.drawerLayer} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View style={[styles.drawerScrim, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close navigation drawer" />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: theme.surface,
            borderColor: theme.borderSoft || theme.border,
            transform: [{ translateX: drawerTranslateX }],
          },
        ]}
      >
        {/* Header: brand + account */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 12, 40) }]}>
          <View style={styles.headerGlow} />
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Image source={require('../../assets/app_logo.png')} style={styles.logoImage} resizeMode="cover" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>Wellth</Text>
              <Text style={styles.brandSubtitle}>{fitness ? 'Fitness · workouts & nutrition' : 'Money · personal finance'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7} accessibilityLabel="Close menu">
              <AppIcon name="close" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.accountCard}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              if (signedIn) onOpenProfile?.();
              else onOpenAuth();
            }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>{displayEmail}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: signedIn ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.16)' }]}>
              <View style={[styles.statusDot, { backgroundColor: signedIn ? '#34d399' : '#cbd5e1' }]} />
              <Text style={styles.statusText}>{signedIn ? 'Synced' : localOnly ? 'Offline' : 'Sign in'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Quick actions */}
          {fitness ? (
            <>
              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={[styles.quickCard, { backgroundColor: theme.dark ? '#24123f' : '#f3e8ff', borderColor: theme.dark ? '#4c1d95' : '#ddd6fe' }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    fitness.onStartWorkout();
                  }}
                >
                  <Text style={styles.quickEmoji}>💪</Text>
                  <Text style={[styles.quickTitle, { color: theme.dark ? '#d8b4fe' : '#5b21b6' }]}>
                    {fitness.workoutInProgress ? 'Resume workout' : 'Start workout'}
                  </Text>
                  <Text style={[styles.quickHint, { color: theme.subtle }]}>Today's plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickCard, { backgroundColor: theme.dark ? '#0f2a24' : '#ccfbf1', borderColor: theme.dark ? '#115e59' : '#99f6e4' }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    setAppMode('hisab');
                  }}
                >
                  <Text style={styles.quickEmoji}>💰</Text>
                  <Text style={[styles.quickTitle, { color: theme.dark ? '#5eead4' : '#0f766e' }]}>Daily Hisab</Text>
                  <Text style={[styles.quickHint, { color: theme.subtle }]}>Money & UPI</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.subtle }]}>TRAINING</Text>
              {FITNESS_ITEMS.map(renderItem)}
            </>
          ) : (
            <>
              <View style={styles.quickRow}>
                {onOpenPhonePe ? (
                  <TouchableOpacity
                    style={[styles.quickCard, { backgroundColor: theme.dark ? '#24123f' : '#f3e8ff', borderColor: theme.dark ? '#4c1d95' : '#ddd6fe' }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      onClose();
                      onOpenPhonePe();
                    }}
                  >
                    <Text style={styles.quickEmoji}>💸</Text>
                    <Text style={[styles.quickTitle, { color: theme.dark ? '#d8b4fe' : '#5b21b6' }]}>Pay via UPI</Text>
                    <Text style={[styles.quickHint, { color: theme.subtle }]}>PhonePe, GPay…</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[styles.quickCard, { backgroundColor: theme.dark ? '#2a0f16' : '#ffe4e6', borderColor: theme.dark ? '#7f1d1d' : '#fecdd3' }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    setAppMode('fitness');
                  }}
                >
                  <Text style={styles.quickEmoji}>⚡</Text>
                  <Text style={[styles.quickTitle, { color: theme.dark ? '#5eead4' : '#0f766e' }]}>TitanFit</Text>
                  <Text style={[styles.quickHint, { color: theme.subtle }]}>Workouts & diet</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.subtle }]}>OVERVIEW</Text>
              {MAIN_ITEMS.map(renderItem)}

              <Text style={[styles.sectionTitle, { color: theme.subtle }]}>MONEY</Text>
              {MONEY_ITEMS.map(renderItem)}
            </>
          )}

          <Text style={[styles.sectionTitle, { color: theme.subtle }]}>ACCOUNT</Text>
          {renderItem({ tab: 'budgets', label: 'Settings & Backup', hint: 'Budgets, app lock, theme', icon: 'settings', tint: '#64748b' })}
          {signedIn ? (
            <TouchableOpacity
              style={styles.navRow}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onOpenProfile?.();
              }}
            >
              <View style={[styles.iconTile, { backgroundColor: '#0ea5e922' }]}>
                <AppIcon name="user" size={17} color="#0ea5e9" />
              </View>
              <View style={styles.navTextCol}>
                <Text style={[styles.navLabel, { color: theme.text }]}>Profile</Text>
                <Text style={[styles.navHint, { color: theme.subtle }]}>Name, password, account</Text>
              </View>
              <AppIcon name="chevron-right" size={13} color={theme.subtle} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.borderSoft || theme.border, paddingBottom: Math.max(insets.bottom + 10, 16) }]}>
          {signedIn || localOnly ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onLogout?.();
              }}
              style={[styles.logoutBtn, { backgroundColor: theme.dangerSoft || 'rgba(239,68,68,0.12)' }]}
              activeOpacity={0.75}
            >
              <AppIcon name="logout" size={15} color={theme.danger || '#dc2626'} />
              <Text style={[styles.logoutText, { color: theme.danger || '#dc2626' }]}>{signedIn ? 'Sign out' : 'Leave offline mode'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onOpenAuth();
              }}
              style={[styles.logoutBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <AppIcon name="user" size={15} color="#ffffff" />
              <Text style={[styles.logoutText, { color: '#ffffff' }]}>Sign in to sync</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  drawerLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  drawerScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
  },
  drawer: {
    height: '100%',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderRightWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#34d399',
    opacity: 0.22,
    top: -90,
    right: -70,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '900',
  },
  accountName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  accountEmail: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11.5,
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  quickEmoji: {
    fontSize: 20,
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  quickHint: {
    fontSize: 11,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 2,
    overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTextCol: {
    flex: 1,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  navHint: {
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
