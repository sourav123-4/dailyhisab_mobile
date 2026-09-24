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
const DRAWER_WIDTH = Math.min(300, Math.round(SCREEN_WIDTH * 0.76));

export const AppDrawer = React.memo(function AppDrawer({
  isOpen,
  activeTab,
  modules,
  localOnly,
  user,
  onClose,
  onOpenTab,
  onOpenAuth,
  onLogout,
  onOpenProfile,
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
      duration: isOpen ? 220 : 180,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start(() => {
      if (!isOpen) {
        setMounted(false);
      }
    });

    return () => animation.stop();
  }, [isOpen, progress]);

  if (!isOpen && !mounted) return null;
  if (!mounted) return null;

  const drawerTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });
  const scrimOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const displayName = user?.displayName || (localOnly ? 'Guest User' : 'Sourav Mahanty');
  const displayEmail = user?.email || (localOnly ? 'Offline Local Mode' : 'souravrasiknagar@gmail.com');

  // Generate 2-letter monogram
  const getInitials = (name: string) => {
    if (!name || name === 'Guest User') return 'GU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  const monogram = getInitials(displayName);

  return (
    <View style={styles.drawerLayer} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.drawerScrim, { opacity: scrimOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close navigation drawer"
        />
      </Animated.View>

      {/* Main Drawer Slide */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            transform: [{ translateX: drawerTranslateX }],
          },
        ]}
      >
        {/* Top Purple Header */}
        <View
          style={[
            styles.topPurpleHeader,
            {
              paddingTop: Math.max(insets.top + 10, 42),
            },
          ]}
        >
          <View style={styles.headerBrandRow}>
            {/* White Rounded Square Logo Box with Daily Hisab Logo */}
            <View style={styles.whiteLogoBox}>
              <Image
                source={require('../../assets/daily_hisab_logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>

            {/* Title & Subtitle */}
            <View style={styles.brandTitleCol}>
              <Text style={styles.brandTitleText}>Daily Hisab</Text>
              <Text style={styles.brandSubtitleText}>Personal Finance</Text>
            </View>

            {/* Circular Back Button on Right */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.circleCloseBtn}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <AppIcon name="chevron-left" size={15} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* White Rounded Sheet Body */}
        <View style={styles.whiteSheetBody}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.menuScrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
          >
            {/* APP PLATFORM SWITCHER */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                backgroundColor: '#090D1A',
                borderWidth: 1.5,
                borderColor: '#FF4757',
                borderRadius: 14,
                padding: 12,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
              onPress={() => {
                onClose();
                setAppMode('fitness');
              }}
            >
              <Text style={{ fontSize: 24 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FF4757', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 }}>
                  SWITCH TO TITANFIT AI
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 1 }}>
                  3D Muscle & Workout Tracker
                </Text>
              </View>
              <Text style={{ color: '#FF4757', fontWeight: '900', fontSize: 16 }}>➔</Text>
            </TouchableOpacity>

            {/* SECTION: MAIN */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>MAIN</Text>

              {/* Dashboard */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('dashboard');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'dashboard' && styles.activeNavRowMain,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="home"
                  size={18}
                  color={activeTab === 'dashboard' ? '#c2410c' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'dashboard' ? '#c2410c' : '#1e293b',
                      fontWeight: activeTab === 'dashboard' ? '700' : '600',
                    },
                  ]}
                >
                  Dashboard
                </Text>
              </TouchableOpacity>

              {/* Daily Hisab */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('hisab');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'hisab' && styles.activeNavRowMain,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="hisab"
                  size={18}
                  color={activeTab === 'hisab' ? '#c2410c' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'hisab' ? '#c2410c' : '#1e293b',
                      fontWeight: activeTab === 'hisab' ? '700' : '600',
                    },
                  ]}
                >
                  Daily Hisab
                </Text>
              </TouchableOpacity>
            </View>

            {/* SECTION: FINANCIAL MODULES */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>FINANCIAL MODULES</Text>

              {/* Loans & EMIs */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('loans');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'loans' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="loans"
                  size={18}
                  color={activeTab === 'loans' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'loans' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'loans' ? '700' : '600',
                    },
                  ]}
                >
                  Loans & EMIs
                </Text>
              </TouchableOpacity>

              {/* Investments & SIP */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('invest');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'invest' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="invest"
                  size={18}
                  color={activeTab === 'invest' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'invest' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'invest' ? '700' : '600',
                    },
                  ]}
                >
                  Investments & SIP
                </Text>
              </TouchableOpacity>

              {/* Salary & Income */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('salary');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'salary' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="salary"
                  size={18}
                  color={activeTab === 'salary' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'salary' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'salary' ? '700' : '600',
                    },
                  ]}
                >
                  Salary & Income
                </Text>
              </TouchableOpacity>

              {/* Udhar & Debts */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('debts');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'debts' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="debts"
                  size={18}
                  color={activeTab === 'debts' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'debts' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'debts' ? '700' : '600',
                    },
                  ]}
                >
                  Udhar & Debts
                </Text>
              </TouchableOpacity>

              {/* Planner & Goals */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('planner');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'planner' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="planner"
                  size={18}
                  color={activeTab === 'planner' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'planner' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'planner' ? '700' : '600',
                    },
                  ]}
                >
                  Planner & Goals
                </Text>
                <AppIcon name="chevron-right" size={13} color="#94a3b8" />
              </TouchableOpacity>

              {/* Settings & Budgets */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('budgets');
                  onClose();
                }}
                style={[
                  styles.navRow,
                  activeTab === 'budgets' && styles.activeNavRow,
                ]}
                activeOpacity={0.75}
              >
                <AppIcon
                  name="settings"
                  size={18}
                  color={activeTab === 'budgets' ? '#5b21b6' : '#475569'}
                />
                <Text
                  style={[
                    styles.navLabel,
                    {
                      color: activeTab === 'budgets' ? '#5b21b6' : '#1e293b',
                      fontWeight: activeTab === 'budgets' ? '700' : '600',
                    },
                  ]}
                >
                  Settings & Backup
                </Text>
                <AppIcon name="chevron-right" size={13} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* SECTION: ADMINISTRATION */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>ADMINISTRATION</Text>

              {/* Personal Profile */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (onOpenProfile) onOpenProfile();
                }}
                style={styles.navRow}
                activeOpacity={0.75}
              >
                <AppIcon name="building" size={18} color="#475569" />
                <Text style={styles.navLabel}>User Profile</Text>
              </TouchableOpacity>

              {/* Security & Access */}
              <TouchableOpacity
                onPress={() => {
                  onOpenTab('budgets');
                  onClose();
                }}
                style={styles.navRow}
                activeOpacity={0.75}
              >
                <AppIcon name="lock" size={18} color="#475569" />
                <Text style={styles.navLabel}>Security & PIN Lock</Text>
              </TouchableOpacity>

              {/* Help & Feedback */}
              <TouchableOpacity
                onPress={onClose}
                style={styles.navRow}
                activeOpacity={0.75}
              >
                <AppIcon name="shield-check" size={18} color="#475569" />
                <Text style={styles.navLabel}>Help & Feedback</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Floating Bottom Profile Card (Exact Deal Square Match) */}
          <View
            style={[
              styles.bottomProfileContainer,
              {
                paddingBottom: Math.max(insets.bottom + 8, 14),
              },
            ]}
          >
            <View style={styles.profileCard}>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (onOpenProfile) onOpenProfile();
                }}
                style={styles.profileTopRow}
                activeOpacity={0.75}
              >
                <View style={styles.monogramCircle}>
                  <Text style={styles.monogramText}>{monogram}</Text>
                </View>
                <View style={styles.profileDetailsCol}>
                  <Text style={styles.userNameText} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.userEmailText} numberOfLines={1}>
                    {displayEmail}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Full-width Red Outline Logout Button with Power Icon */}
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  if (onLogout) onLogout();
                }}
                style={styles.dealSquareLogoutBtn}
                activeOpacity={0.75}
              >
                <AppIcon name="power" size={15} color="#dc2626" />
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  drawerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  drawerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  drawer: {
    height: '100%',
    backgroundColor: '#4c1d95',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 25,
  },
  topPurpleHeader: {
    backgroundColor: '#4c1d95',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whiteLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  brandTitleCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  brandTitleText: {
    color: '#ffffff',
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtitleText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  circleCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteSheetBody: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  menuScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  menuSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#64748b',
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9.5,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
  },
  activeNavRowMain: {
    backgroundColor: '#fff1ee',
  },
  activeNavRow: {
    backgroundColor: '#f3e8ff',
  },
  navLabel: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  bottomProfileContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    backgroundColor: '#ffffff',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monogramCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#181145',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  profileDetailsCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmailText: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 1,
  },
  dealSquareLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  logoutBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
