import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme, AppThemeName } from '../theme/appTheme';
import { useAppMode } from '../navigation/AppModeContext';

export const ProfileScreen = () => {
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

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age.toString());
  const [height, setHeight] = useState(profile.heightCm.toString());
  const [targetWeight, setTargetWeight] = useState(profile.targetWeightKg.toString());

  const handleSaveProfile = async () => {
    await updateProfile({
      name,
      age: parseInt(age, 10) || 25,
      heightCm: parseInt(height, 10) || 178,
      targetWeightKg: parseFloat(targetWeight) || 80,
    });
    setIsEditing(false);
    Alert.alert('✅ Profile Updated', 'Athlete settings saved.');
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
        <View>
          <Text style={[styles.headerSub, { color: theme.muted }]}>ATHLETE SETTINGS</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profile & Stats</Text>
        </View>

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: isEditing ? theme.primary : theme.surfaceAlt }]}
          onPress={isEditing ? handleSaveProfile : () => setIsEditing(true)}
        >
          <Text style={[styles.editBtnText, { color: isEditing ? '#fff' : theme.accent }]}>
            {isEditing ? 'SAVE' : 'EDIT'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Avatar & Identity Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>

          {isEditing ? (
            <TextInput
              style={[styles.nameInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
              value={name}
              onChangeText={setName}
            />
          ) : (
            <Text style={[styles.userName, { color: theme.text }]}>{profile.name}</Text>
          )}

          <Text style={[styles.userGoalText, { color: theme.muted }]}>
            Goal: {profile.fitnessGoal === 'weight_gain' ? 'Muscle Gain & Hypertrophy' : 'Fat Loss & Cutting'}
          </Text>

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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>APP THEME</Text>
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
                  onPress={() => setThemeName(t.id)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
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
  userGoalText: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
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
