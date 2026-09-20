import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme, AppThemeName } from '../theme/appTheme';
import { useAppMode } from '../navigation/AppModeContext';
import { useHisabApp } from '../navigation/HisabAppContext';

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const {
    profile,
    updateProfile,
    themeName,
    setThemeName,
    workoutHistory,
    weightHistory,
  } = useFitnessApp();

  const {
    isLocked,
    lock,
    pinEnabled = false,
    securityPin = '1234',
    biometricEnabled = true,
    patchState,
    saveProfile,
    user,
    localOnly,
  } = useHisabApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name || 'Sourav Mahanty');
  const [age, setAge] = useState(profile.age.toString());
  const [height, setHeight] = useState(profile.heightCm.toString());
  const [targetWeight, setTargetWeight] = useState(profile.targetWeightKg.toString());

  // Security PIN Change Modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  const displayName = profile.name || user?.displayName || 'Sourav Mahanty';
  const displayEmail = user?.email || profile.email || 'souravrasiknagar@gmail.com';

  const getInitials = (n: string) => {
    if (!n || n === 'Guest User') return 'SM';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const handleSaveProfile = async () => {
    const trimmedName = name.trim() || 'Sourav Mahanty';
    await updateProfile({
      name: trimmedName,
      age: parseInt(age, 10) || 26,
      heightCm: parseInt(height, 10) || 178,
      targetWeightKg: parseFloat(targetWeight) || 80,
    });
    if (saveProfile) {
      try {
        await saveProfile({ displayName: trimmedName });
      } catch (e) {
        // silent fallback
      }
    }
    setIsEditing(false);
    Alert.alert('✅ Profile Synchronized', 'Identity saved across Daily Hisab and TitanFit.');
  };

  const handleSavePin = () => {
    const clean = newPinInput.replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit numeric PIN.');
      return;
    }
    patchState({ securityPin: clean, pinEnabled: true });
    setShowPinModal(false);
    setNewPinInput('');
    Alert.alert('✅ PIN Updated', `Your app security PIN is now updated.`);
  };

  const handleThemeChange = (newTheme: AppThemeName) => {
    setThemeName(newTheme);
    patchState({ theme: newTheme });
  };

  const themesList: { id: AppThemeName; label: string; dot: string }[] = [
    { id: 'cyber', label: 'Cyber Athletic', dot: '#FF4757' },
    { id: 'midnight', label: 'Midnight Obsidian', dot: '#7C3AED' },
    { id: 'oled', label: 'Pure OLED Stealth', dot: '#00E5FF' },
    { id: 'light', label: 'Crisp Light', dot: '#E11D48' },
  ];

  // Calculate total volume lifted all time
  const totalLifetimeVolume = workoutHistory.reduce(
    (acc, sess) => acc + (sess.totalVolumeKg || 0),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Clean Screen Header without Daily Hisab top row */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: theme.muted }]}>ATHLETE & ACCOUNT SETTINGS</Text>
            <Text style={[styles.mainHeading, { color: theme.text }]}>Profile & Security</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: isEditing ? theme.primary : theme.surfaceAlt }]}
              onPress={isEditing ? handleSaveProfile : () => setIsEditing(true)}
            >
              <Text style={[styles.editBtnText, { color: isEditing ? '#fff' : theme.accent }]}>
                {isEditing ? 'SAVE' : 'EDIT'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.proAthletePill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <Text style={[styles.proAthleteText, { color: theme.primary }]}>PRO Athlete</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Avatar & Identity Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
          </View>

          {isEditing ? (
            <TextInput
              style={[styles.nameInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
              value={name}
              onChangeText={setName}
            />
          ) : (
            <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
          )}

          <Text style={[styles.userEmailText, { color: theme.muted }]}>{displayEmail}</Text>

          <View style={[styles.badgePill, { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14B8A6' }]}>
            <Text style={[styles.badgePillText, { color: '#14B8A6' }]}>
              {localOnly ? '⚡ OFFLINE LOCAL ACCOUNT' : '☁️ DAILY HISAB & TITANFIT SYNCED'}
            </Text>
          </View>

          {/* Quick Stats Triple */}
          <View style={styles.tripleStats}>
            <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statLabel, { color: theme.muted }]}>CURRENT</Text>
              <Text style={[styles.statVal, { color: theme.accent }]}>{profile.currentWeightKg} {profile.unit}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statLabel, { color: theme.muted }]}>TARGET</Text>
              <Text style={[styles.statVal, { color: theme.primary }]}>{profile.targetWeightKg} {profile.unit}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statLabel, { color: theme.muted }]}>STREAK</Text>
              <Text style={[styles.statVal, { color: theme.success }]}>{profile.streakDays} Days</Text>
            </View>
          </View>
        </View>

        {/* SECURITY & APP LOCK CARD */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.securityHeaderRow}>
            <Text style={{ fontSize: 18 }}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 2 }]}>SECURITY & APP LOCK</Text>
              <Text style={[styles.securitySubDesc, { color: theme.muted }]}>
                Unified PIN & biometric lock protecting both Daily Hisab & TitanFit
              </Text>
            </View>
          </View>

          {/* Lock App Now Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.lockNowButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.danger }]}
            onPress={() => lock()}
          >
            <Text style={[styles.lockNowText, { color: theme.danger }]}>🔒 LOCK APP NOW</Text>
          </TouchableOpacity>

          {/* PIN Lock Toggle Row */}
          <View style={styles.rowField}>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>PIN Protection</Text>
              <Text style={[styles.fieldSub, { color: theme.muted }]}>
                Require 4-digit PIN upon app launch
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => patchState({ pinEnabled: !pinEnabled })}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: pinEnabled ? theme.success : theme.surfaceAlt,
                  borderColor: pinEnabled ? theme.success : theme.borderSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: pinEnabled ? 18 : 0 }] },
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Biometric Toggle Row */}
          <View style={styles.rowField}>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Biometric Unlock</Text>
              <Text style={[styles.fieldSub, { color: theme.muted }]}>
                Unlock using fingerprint / Face ID
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => patchState({ biometricEnabled: !biometricEnabled })}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: biometricEnabled ? theme.accent : theme.surfaceAlt,
                  borderColor: biometricEnabled ? theme.accent : theme.borderSoft,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: biometricEnabled ? 18 : 0 }] },
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Change PIN Row */}
          <View style={[styles.rowField, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>App Security PIN</Text>
              <Text style={[styles.fieldSub, { color: theme.muted }]}>Current: ••••</Text>
            </View>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}
              onPress={() => {
                setNewPinInput('');
                setShowPinModal(true);
              }}
            >
              <Text style={[styles.smallBtnText, { color: theme.accent }]}>CHANGE PIN</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editable Body Specifications */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>BIOMETRIC PROFILE</Text>

          <View style={styles.rowField}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Age</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.input }]}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
              />
            ) : (
              <Text style={[styles.fieldVal, { color: theme.text }]}>{profile.age} yrs</Text>
            )}
          </View>

          <View style={styles.rowField}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Height</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.input }]}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            ) : (
              <Text style={[styles.fieldVal, { color: theme.text }]}>{profile.heightCm} cm</Text>
            )}
          </View>

          <View style={styles.rowField}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Target Weight</Text>
            {isEditing ? (
              <TextInput
                style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.input }]}
                keyboardType="numeric"
                value={targetWeight}
                onChangeText={setTargetWeight}
              />
            ) : (
              <Text style={[styles.fieldVal, { color: theme.text }]}>{profile.targetWeightKg} {profile.unit}</Text>
            )}
          </View>

          <View style={styles.rowField}>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>Weight Unit</Text>
            <View style={styles.unitToggleRow}>
              <TouchableOpacity
                style={[
                  styles.unitPill,
                  profile.unit === 'kg' && { backgroundColor: theme.primary },
                ]}
                onPress={() => updateProfile({ unit: 'kg' })}
              >
                <Text style={[styles.unitPillText, { color: profile.unit === 'kg' ? '#fff' : theme.muted }]}>KG</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitPill,
                  profile.unit === 'lbs' && { backgroundColor: theme.primary },
                ]}
                onPress={() => updateProfile({ unit: 'lbs' })}
              >
                <Text style={[styles.unitPillText, { color: profile.unit === 'lbs' ? '#fff' : theme.muted }]}>LBS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Lifetime Workout Stats */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>LIFETIME TRAINING STATS</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statGridItem, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statGridNum, { color: theme.primary }]}>{workoutHistory.length}</Text>
              <Text style={[styles.statGridLabel, { color: theme.muted }]}>Workouts Logged</Text>
            </View>
            <View style={[styles.statGridItem, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statGridNum, { color: theme.accent }]}>{totalLifetimeVolume.toLocaleString()}</Text>
              <Text style={[styles.statGridLabel, { color: theme.muted }]}>Total Volume ({profile.unit})</Text>
            </View>
            <View style={[styles.statGridItem, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statGridNum, { color: theme.success }]}>{weightHistory.length}</Text>
              <Text style={[styles.statGridLabel, { color: theme.muted }]}>Weigh-in Checkpoints</Text>
            </View>
            <View style={[styles.statGridItem, { backgroundColor: theme.surfaceAlt }]}>
              <Text style={[styles.statGridNum, { color: theme.warning }]}>100%</Text>
              <Text style={[styles.statGridLabel, { color: theme.muted }]}>Offline Ready</Text>
            </View>
          </View>
        </View>

        {/* App Theme Selector */}
        <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>APP THEME (SYNCED WITH DAILY HISAB)</Text>
          <View style={styles.themesWrap}>
            {themesList.map((t) => {
              const isSelected = themeName === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.75}
                  style={[
                    styles.themeItem,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: isSelected ? theme.primary : theme.borderSoft,
                    },
                  ]}
                  onPress={() => handleThemeChange(t.id)}
                >
                  <View style={[styles.themeDot, { backgroundColor: t.dot }]} />
                  <Text style={[styles.themeLabel, { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '800' : '500' }]}>
                    {t.label}
                  </Text>
                  {isSelected && <Text style={[styles.checkMark, { color: theme.primary }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Platform Switcher Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: '#14B8A6' }]}
          onPress={() => setAppMode('hisab')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 26 }}>💰</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#14B8A6', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>
                SWITCH TO DAILY HISAB
              </Text>
              <Text style={{ color: theme.muted, fontSize: 11, marginTop: 2 }}>
                Personal Finance, Accounting & Budgets
              </Text>
            </View>
            <Text style={{ color: '#14B8A6', fontSize: 16, fontWeight: '900' }}>➔</Text>
          </View>
        </TouchableOpacity>

        {/* Cloud Sync & Firebase Status */}
        <View style={[styles.cloudCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
          <View style={styles.cloudRow}>
            <Text style={styles.cloudIcon}>☁️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cloudTitle, { color: theme.text }]}>Firebase Cloud Sync & Offline Storage</Text>
              <Text style={[styles.cloudSub, { color: theme.muted }]}>
                Data auto-syncs securely with Firebase and persists locally via AsyncStorage.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Change PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pinModalCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.pinModalTitle, { color: theme.text }]}>Set 4-Digit Security PIN</Text>
            <Text style={[styles.pinModalSub, { color: theme.muted }]}>
              Enter a 4-digit code to protect Daily Hisab and TitanFit.
            </Text>

            <TextInput
              style={[styles.pinInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.primary }]}
              placeholder="1234"
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPinInput}
              onChangeText={setNewPinInput}
            />

            <View style={styles.pinModalActions}>
              <TouchableOpacity
                style={[styles.pinCancelBtn, { borderColor: theme.borderSoft }]}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={{ color: theme.muted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSavePin}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>SAVE PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  proAthletePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  proAthleteText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  nameInput: {
    height: 38,
    width: 180,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  securitySubDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  lockNowButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockNowText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fieldSub: {
    fontSize: 10,
    marginTop: 2,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pinModalCard: {
    width: '100%',
    maxWidth: 320,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  pinModalSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  pinInput: {
    width: 140,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 8,
    marginBottom: 20,
  },
  pinModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  pinSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tripleStats: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  statVal: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rowField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  fieldInput: {
    width: 70,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    fontSize: 13,
  },
  unitToggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statGridItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
  },
  statGridNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  statGridLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  themesWrap: {
    gap: 8,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  themeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeLabel: {
    flex: 1,
    fontSize: 13,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '800',
  },
  cloudCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cloudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cloudIcon: {
    fontSize: 22,
  },
  cloudTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cloudSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
});
