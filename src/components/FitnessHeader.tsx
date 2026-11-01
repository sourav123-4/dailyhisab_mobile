import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';

const TITLES: Record<string, string> = {
  MuscleExplore: 'Exercises',
  AICoach: 'AI Coach',
  Weight: 'Progress',
  Profile: 'Profile & Goals',
};

const greeting = () => {
  const hours = new Date().getHours();
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
};

/** TitanFit's top bar, laid out like Daily Hisab's TopHeader so both halves of the app feel the same. */
export const FitnessHeader = React.memo(function FitnessHeader({
  routeName,
  firstName,
  initial,
  streakDays,
  onOpenDrawer,
  onOpenProfile,
  onOpenStreak,
  onSwitchToHisab,
}: {
  routeName: string;
  firstName: string;
  initial: string;
  streakDays: number;
  onOpenDrawer: () => void;
  onOpenProfile: () => void;
  onOpenStreak: () => void;
  onSwitchToHisab: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isHome = routeName === 'Today';

  return (
    <View style={[styles.chrome, { backgroundColor: theme.surface, borderBottomColor: theme.borderSoft, paddingTop: insets.top + 10 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onOpenDrawer}
          style={styles.menuButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityLabel="Open navigation menu"
          activeOpacity={0.7}
        >
          <AppIcon name="menu" size={22} color={theme.primary} />
        </TouchableOpacity>

        {isHome ? (
          <View style={styles.titleCol}>
            <Text style={[styles.greetingSub, { color: theme.subtle }]} numberOfLines={1}>
              {greeting()}
            </Text>
            <Text style={[styles.greetingName, { color: theme.primary }]} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
        ) : (
          <Text style={[styles.screenTitle, { color: theme.primary }]} numberOfLines={1}>
            {TITLES[routeName] || 'TitanFit'}
          </Text>
        )}

        <View style={styles.actions}>
          {isHome ? (
            <TouchableOpacity
              onPress={onOpenStreak}
              style={[styles.streakPill, { backgroundColor: 'rgba(249,115,22,0.14)', borderColor: 'rgba(249,115,22,0.45)' }]}
              activeOpacity={0.75}
              accessibilityLabel={`${streakDays} day workout streak`}
            >
              <AppIcon name="flame" size={14} color="#f97316" />
              <Text style={styles.streakText}>{streakDays}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onSwitchToHisab}
            style={[styles.modePill, { backgroundColor: 'rgba(20,184,166,0.14)', borderColor: '#14B8A6' }]}
            activeOpacity={0.75}
            accessibilityLabel="Switch to Daily Hisab"
          >
            <Text style={styles.modeEmoji}>💰</Text>
            <Text style={styles.modeText}>Hisab</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenProfile}
            style={[styles.avatar, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
            accessibilityLabel="Open profile"
          >
            <Text style={styles.avatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  chrome: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 20,
  },
  topBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 28,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  greetingSub: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  greetingName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  screenTitle: {
    flex: 1,
    paddingLeft: 14,
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  streakText: {
    color: '#f97316',
    fontWeight: '800',
    fontSize: 12,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  modeEmoji: {
    fontSize: 12,
  },
  modeText: {
    color: '#14B8A6',
    fontWeight: '800',
    fontSize: 11,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
