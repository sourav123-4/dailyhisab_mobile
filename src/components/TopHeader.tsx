import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ModuleItem, Tab } from '../types';
import { useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { useAppMode } from '../navigation/AppModeContext';

const formatDisplayName = (name?: string) => {
  if (!name) return 'Guest User';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export const TopHeader = React.memo(function TopHeader({
  activeTab,
  modules,
  syncStatus,
  localOnly,
  user,
  isRecording,
  isRefreshing,
  onOpenDrawer,
  onOpenProfile,
  onVoiceToggle,
  onOpenAuth,
  onNotificationPress,
  unreadNotificationsCount,
  onBack,
  onSearchPress,
  onFilterPress,
  onHistoryPress,
  onAddPress,
  onSpeedPress,
  onQrPress,
}: {
  activeTab: Tab;
  modules: ModuleItem[];
  syncStatus: string;
  localOnly: boolean;
  user?: any;
  isRecording: boolean;
  isRefreshing?: boolean;
  onOpenDrawer: () => void;
  onOpenProfile?: () => void;
  onVoiceToggle: () => void;
  onOpenAuth: () => void;
  onNotificationPress?: () => void;
  unreadNotificationsCount?: number;
  onBack?: () => void;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  onHistoryPress?: () => void;
  onAddPress?: () => void;
  onSpeedPress?: (info: any) => void;
  onQrPress?: () => void;
}) {
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const currentModule = modules.find((item) => item.id === activeTab);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest User';
  const userInitial = (user?.displayName?.[0] || user?.email?.[0] || 'G').toUpperCase();

  const getScreenTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'hisab':
        return 'Daily Hisab';
      case 'debts':
        return 'Udhar & Debts';
      case 'loans':
        return 'Loans & EMIs';
      case 'budgets':
        return 'Budgets & Backup';
      case 'invest':
        return 'Investments & SIP';
      case 'salary':
        return 'Salary & Income';
      case 'planner':
        return 'Planner & Goals';
      case 'notifications':
        return 'Notifications';
      default:
        return currentModule?.label || 'Daily Hisab';
    }
  };

  // Same on every Daily Hisab page, mirroring TitanFit's header (which has a "Hisab" pill on every page).
  const rightActions = (
    <View style={styles.rightActionsRow}>
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.titanPill}
        onPress={() => setAppMode('fitness')}
        accessibilityLabel="Switch to TitanFit"
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
      >
        <Text style={styles.titanPillIcon}>💪</Text>
        <Text style={styles.titanPillText}>TitanFit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onOpenProfile || onOpenDrawer}
        style={styles.avatarMiniCircle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.8}
        accessibilityLabel="Open profile"
      >
        <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>{userInitial}</Text>
      </TouchableOpacity>
    </View>
  );

  if (activeTab === 'dashboard') {
    return (
      <View style={[styles.topBar, { backgroundColor: theme.surface }]}>
        {/* Left Hamburger Button - Aligned flush to 16px page margin */}
        <TouchableOpacity
          onPress={onOpenDrawer}
          style={styles.menuIconButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityLabel="Open navigation menu"
          activeOpacity={0.7}
        >
          <AppIcon name="menu" size={22} color="#7c3aed" />
        </TouchableOpacity>

        {/* Center Greeting & Formatted User Name */}
        <View style={styles.centerGreetingCol}>
          <Text style={[styles.greetingSub, { color: theme.subtle || '#94a3b8' }]} numberOfLines={1}>
            {getGreeting()}
          </Text>
          <Text style={[styles.greetingName, { color: '#7c3aed' }]} numberOfLines={1}>
            {formatDisplayName(displayName).split(' ')[0]}
          </Text>
        </View>

        {/* Right: switch to TitanFit + profile (same on every page) */}
        {rightActions}
      </View>
    );
  }

  return (
    <View style={[styles.topBar, { backgroundColor: theme.surface }]}>
      {/* Left Hamburger / Back Button + Title */}
      <View style={styles.headerLeftGroup}>
        <TouchableOpacity
          onPress={activeTab === 'notifications' && onBack ? onBack : onOpenDrawer}
          style={[
            styles.menuIconButton,
            activeTab === 'notifications' && [
              styles.backIconButton,
              { backgroundColor: theme.surfaceAlt || 'rgba(124, 58, 237, 0.08)' },
            ],
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={activeTab === 'notifications' ? 'Back to Dashboard' : 'Open navigation menu'}
          activeOpacity={0.7}
        >
          <AppIcon
            name={activeTab === 'notifications' ? 'chevron-left' : 'menu'}
            size={activeTab === 'notifications' ? 20 : 22}
            color="#7c3aed"
          />
        </TouchableOpacity>

        <Text style={[styles.screenTitle, { color: '#7c3aed' }]} numberOfLines={1}>
          {getScreenTitle()}
        </Text>
      </View>

      {/* Right: switch to TitanFit + profile (same on every page) */}
      {rightActions}
    </View>
  );
});

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIconButton: {
    width: 28,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  centerGreetingCol: {
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
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
    borderWidth: 1.2,
  },
  titanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 141, 246, 0.12)',
    borderColor: 'rgba(91, 141, 246, 0.55)',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  titanPillIcon: { fontSize: 12 },
  titanPillText: { color: '#3B6FE0', fontWeight: '800', fontSize: 12 },
  avatarMiniCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#a855f7',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarMiniText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
