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
  if (!name) return 'Sourav Mahanty';
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
}) {
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const currentModule = modules.find((item) => item.id === activeTab);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning 👋';
    if (hours < 17) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  };

  const displayName = user?.displayName || 'sourav mahanty';
  const userInitial = (user?.displayName?.[0] || user?.email?.[0] || 'S').toUpperCase();

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
          <Text style={[styles.greetingSub, { color: theme.subtle || '#94a3b8' }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.greetingName, { color: '#7c3aed' }]} numberOfLines={1}>
            {formatDisplayName(displayName)}
          </Text>
        </View>

        {/* Right Notification Bell + (S) Profile Avatar */}
        <View style={styles.rightActionsRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 71, 87, 0.15)',
              borderColor: '#FF4757',
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 5,
              gap: 4,
              marginRight: 4,
            }}
            onPress={() => setAppMode('fitness')}
          >
            <Text style={{ fontSize: 13 }}>⚡</Text>
            <Text style={{ color: '#FF4757', fontWeight: '800', fontSize: 11 }}>TitanFit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNotificationPress || onOpenDrawer}
            style={[
              styles.actionIconButton,
              {
                backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)',
                borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <AppIcon name="bell" size={17} color={theme.text} />
            {typeof unreadNotificationsCount === 'number' && unreadNotificationsCount > 0 && (
              <View style={[styles.bellBadgeDot, { borderColor: theme.surface }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenProfile || onOpenDrawer}
            style={styles.avatarMiniCircle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <AppIcon name="user" size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>
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

      {/* Right Action Icons */}
      <View style={styles.headerActions}>
        <View style={styles.rightActionsRow}>
          {activeTab !== 'notifications' && (
            <TouchableOpacity
              onPress={onNotificationPress || onOpenDrawer}
              style={[
                styles.actionIconButton,
                {
                  backgroundColor: theme.surfaceAlt || 'rgba(255,255,255,0.06)',
                  borderColor: theme.borderSoft || 'rgba(255,255,255,0.08)',
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <AppIcon name="bell" size={17} color={theme.text} />
              {typeof unreadNotificationsCount === 'number' && unreadNotificationsCount > 0 && (
                <View style={[styles.bellBadgeDot, { borderColor: theme.surface }]} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onOpenProfile || onOpenDrawer}
            style={styles.avatarMiniCircle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <AppIcon name="user" size={17} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
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
