import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppTheme } from '../theme/appTheme';
import { useAppMode } from '../navigation/AppModeContext';
import { useHisabApp } from '../navigation/HisabAppContext';
import { PinSetupModal, PinSetupMode } from '../components/PinSetupModal';
import { BodyStatsCard } from '../components/BodyStatsCard';
import { BodyProfileModal } from '../components/BodyProfileModal';
import { WorkoutSetupModal } from '../components/WorkoutSetupModal';
import { AppIcon, IconName } from '../components/AppIcon';
import { describeSetup } from '../utils/workoutPlanner';

const GOAL_LABEL: Record<string, string> = {
  weight_gain: 'Gain weight & muscle',
  muscle_gain: 'Build muscle, stay lean',
  weight_loss: 'Lose fat',
  maintenance: 'Stay fit & strong',
};

const formatVolume = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)} kg`);

export const ProfileScreen = () => {
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const { profile, setThemeName, workoutHistory, weeklySplit, resetFitnessData } = useFitnessApp();
  const { lock, pinEnabled = false, securityPin, biometricEnabled = true, pinNeedsUpdate, setAppLockPin, patchState, user, localOnly } = useHisabApp();

  const [editingBody, setEditingBody] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);
  const [pinSetupMode, setPinSetupMode] = useState<PinSetupMode | null>(null);

  const displayName = profile.name || user?.displayName || 'You';
  const displayEmail = user?.email || profile.email || '';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase();

  const lifetimeVolume = workoutHistory.reduce((sum, session) => sum + (session.totalVolumeKg || 0), 0);
  const hasPlan = weeklySplit.some(d => !d.isRestDay && d.exerciseIds.length > 0);
  const trainingDays = weeklySplit.filter(d => !d.isRestDay && d.exerciseIds.length > 0).length;

  // TitanFit has one light and one dark look; the choice is shared with Daily Hisab.
  const setAppearance = (dark: boolean) => {
    const next = dark ? 'midnight' : 'light';
    setThemeName(next);
    patchState({ theme: next });
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset TitanFit data?',
      'This erases your TitanFit profile, workout plan, workout history, weigh-ins, measurements and meals, on this phone and in your account backup. You will set everything up again from the start.\n\nYour Daily Hisab money records are not touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase and start over',
          style: 'destructive',
          onPress: () => {
            resetFitnessData();
          },
        },
      ]
    );
  };

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft }];

  const Toggle = ({ on, disabled, onPress, label }: { on: boolean; disabled?: boolean; onPress: () => void; label: string }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      style={[styles.toggle, { backgroundColor: on ? theme.primary : theme.surfaceAlt, borderColor: on ? theme.primary : theme.border, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.toggleThumb, { transform: [{ translateX: on ? 18 : 0 }] }]} />
    </TouchableOpacity>
  );

  const Row = ({ icon, title, sub, right, onPress, last, tint }: { icon: IconName; title: string; sub?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean; tint?: string }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${tint || theme.primary}1f` }]}>
        <AppIcon name={icon} size={16} color={tint || theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: tint && tint === theme.danger ? theme.danger : theme.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: theme.muted }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <AppIcon name="chevron-right" size={13} color={theme.subtle} /> : null)}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Identity */}
        <View style={[card, styles.identity]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>{initials || 'Y'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
            {displayEmail ? <Text style={[styles.email, { color: theme.muted }]} numberOfLines={1}>{displayEmail}</Text> : null}
            <View style={[styles.badge, { backgroundColor: localOnly ? theme.warningSoft : theme.successSoft }]}>
              <Text style={[styles.badgeText, { color: localOnly ? theme.warning : theme.success }]}>
                {localOnly ? 'Saved on this phone only' : 'Backed up to your account'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setEditingBody(true)}
            style={[styles.editBtn, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}
            activeOpacity={0.8}
            accessibilityLabel="Edit name, weight, height, age and goal"
          >
            <AppIcon name="edit" size={13} color={theme.primary} />
            <Text style={[styles.editText, { color: theme.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Lifetime numbers */}
        <View style={styles.statsRow}>
          {[
            { label: 'Workouts', value: `${workoutHistory.length}`, icon: 'dumbbell' as IconName },
            { label: 'Total lifted', value: formatVolume(lifetimeVolume), icon: 'reports' as IconName },
            { label: 'Streak', value: `${profile.streakDays} ${profile.streakDays === 1 ? 'day' : 'days'}`, icon: 'flame' as IconName },
          ].map(stat => (
            <View key={stat.label} style={[styles.statTile, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
              <AppIcon name={stat.icon} size={16} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.subtle }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <BodyStatsCard style={{ marginHorizontal: 0 }} />

        {/* Goal and plan */}
        <Text style={[styles.sectionLabel, { color: theme.subtle }]}>GOAL & PLAN</Text>
        <View style={card}>
          <Row icon="scale" title={GOAL_LABEL[profile.fitnessGoal] || 'Your goal'} sub={`${profile.targetCalories} kcal · ${profile.targetProteinGrams} g protein a day`} onPress={() => setEditingBody(true)} />
          <Row
            icon="dumbbell"
            title={hasPlan ? describeSetup(profile) : 'No workout plan yet'}
            sub={hasPlan ? `${trainingDays} training days a week · tap to change` : 'Build a plan for home or gym'}
            onPress={() => setSetupVisible(true)}
            last
          />
        </View>

        {/* Security */}
        <Text style={[styles.sectionLabel, { color: theme.subtle }]}>SECURITY</Text>
        <View style={card}>
          <Row
            icon="lock"
            title="PIN lock"
            sub="Ask for a PIN when the app opens (Hisab and TitanFit)"
            right={<Toggle on={pinEnabled} label="PIN lock" onPress={() => setPinSetupMode(pinEnabled ? 'disable' : 'create')} />}
          />
          <Row
            icon="faceid"
            title="Fingerprint / Face unlock"
            sub={pinEnabled ? 'Unlock without typing the PIN' : 'Turn on PIN lock first'}
            right={<Toggle on={pinEnabled && biometricEnabled} disabled={!pinEnabled} label="Biometric unlock" onPress={() => patchState({ biometricEnabled: !biometricEnabled })} />}
          />
          <Row
            icon="shield-check"
            title={pinEnabled ? 'Change PIN' : 'Set a PIN'}
            sub={!pinEnabled ? 'No PIN set' : pinNeedsUpdate ? 'Weak PIN, change it' : 'PIN is set'}
            tint={pinEnabled && pinNeedsUpdate ? theme.danger : undefined}
            onPress={() => setPinSetupMode(pinEnabled ? 'change' : 'create')}
          />
          {/* Locking without a PIN would leave nothing to unlock with, so set one up first. */}
          <Row icon="power" title="Lock app now" onPress={() => (pinEnabled ? lock() : setPinSetupMode('create'))} last />
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: theme.subtle }]}>APPEARANCE</Text>
        <View style={[card, styles.appearance]}>
          {[
            { dark: false, label: 'Light', emoji: '☀️' },
            { dark: true, label: 'Dark', emoji: '🌙' },
          ].map(option => {
            const selected = theme.dark === option.dark;
            return (
              <TouchableOpacity
                key={option.label}
                activeOpacity={0.8}
                onPress={() => setAppearance(option.dark)}
                style={[styles.appearanceBtn, { backgroundColor: selected ? theme.primary : theme.surfaceAlt }]}
              >
                <Text style={styles.appearanceEmoji}>{option.emoji}</Text>
                <Text style={[styles.appearanceText, { color: selected ? '#ffffff' : theme.text }]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* App */}
        <Text style={[styles.sectionLabel, { color: theme.subtle }]}>APP</Text>
        <View style={card}>
          <Row icon="hisab" title="Switch to Daily Hisab" sub="Your money, budgets and EMIs" tint="#8B7CF6" onPress={() => setAppMode('hisab')} />
          <Row icon="trash" title="Reset TitanFit data" sub="Erase everything and set up again from the start" tint={theme.danger} onPress={confirmReset} last />
        </View>
      </ScrollView>

      <BodyProfileModal visible={editingBody} onClose={() => setEditingBody(false)} />
      <WorkoutSetupModal visible={setupVisible} onClose={() => setSetupVisible(false)} />

      <PinSetupModal
        visible={pinSetupMode !== null}
        mode={pinSetupMode || 'create'}
        storedPin={securityPin}
        onCancel={() => setPinSetupMode(null)}
        onComplete={pinHash => {
          setAppLockPin(pinHash);
          setPinSetupMode(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 130 },
  card: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, marginBottom: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  name: { fontSize: 19, fontWeight: '900' },
  email: { fontSize: 12.5, marginTop: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  editText: { fontSize: 12.5, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  statTile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  statValue: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10, marginBottom: 8, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14.5, fontWeight: '800' },
  rowSub: { fontSize: 12, lineHeight: 16, marginTop: 1 },
  toggle: { width: 46, height: 28, borderRadius: 14, borderWidth: 1, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff' },
  appearance: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  appearanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12 },
  appearanceEmoji: { fontSize: 16 },
  appearanceText: { fontSize: 14, fontWeight: '800' },
});
