import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useAppMode } from '../navigation/AppModeContext';
import { useAppTheme } from '../theme/appTheme';
import { WeightTrendChart } from '../components/WeightTrendChart';
import { MacroPlanModal } from '../components/MacroPlanModal';
import { WeightGoal } from '../types/fitness';

export const WeightTrackerScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { setAppMode } = useAppMode();
  const {
    profile,
    weightHistory,
    bodyMeasurements,
    logWeight,
    logMeasurement,
    logWater,
    updateProfile,
  } = useFitnessApp();

  const [weightInputModal, setWeightInputModal] = useState(false);
  const [newWeight, setNewWeight] = useState(profile.currentWeightKg.toString());
  const [weightNotes, setWeightNotes] = useState('');
  const [macroModalVisible, setMacroModalVisible] = useState(false);
  const [measureModalVisible, setMeasureModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 350));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Measurement form state
  const [bicepsL, setBicepsL] = useState('38.5');
  const [bicepsR, setBicepsR] = useState('39.0');
  const [chest, setChest] = useState('104');
  const [waist, setWaist] = useState('81');
  const [thighs, setThighs] = useState('60');

  // BMI Calculation
  const heightM = (profile.heightCm || 178) / 100;
  const bmi = (profile.currentWeightKg / (heightM * heightM)).toFixed(1);

  const handleSaveWeight = async () => {
    const w = parseFloat(newWeight);
    if (!w || isNaN(w)) return;
    await logWeight(w, weightNotes);
    setWeightInputModal(false);
    setWeightNotes('');
  };

  const handleSaveMeasurement = async () => {
    await logMeasurement({
      bicepsLeftCm: parseFloat(bicepsL) || 0,
      bicepsRightCm: parseFloat(bicepsR) || 0,
      chestCm: parseFloat(chest) || 0,
      waistCm: parseFloat(waist) || 0,
      thighsCm: parseFloat(thighs) || 0,
    });
    setMeasureModalVisible(false);
    Alert.alert('✅ Saved!', 'Body measurements updated successfully.');
  };

  const goalsList: { id: WeightGoal; label: string; emoji: string }[] = [
    { id: 'weight_loss', label: 'Fat Loss (Cut)', emoji: '🔥' },
    { id: 'weight_gain', label: 'Muscle Gain (Bulk)', emoji: '💪' },
    { id: 'muscle_gain', label: 'Lean Mass (Recomp)', emoji: '⚡' },
    { id: 'maintenance', label: 'Maintain & Strength', emoji: '⚖️' },
  ];

  const waterPercent = Math.min(
    100,
    Math.round(((profile.todayWaterMl || 0) / (profile.dailyWaterTargetMl || 3000)) * 100)
  );

  const weightDelta = (profile.currentWeightKg - profile.targetWeightKg).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Two-Tier Dashboard Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderSoft, paddingTop: Math.max(insets.top, 14) }]}>
        {/* Tier 1: Brand & Top Actions */}
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={[styles.pulseDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.brandTitle, { color: theme.text }]}>TITANFIT</Text>
            <View style={[styles.proBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.proBadgeText, { color: theme.primary }]}>PRO</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.modeSwitchBtn, { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14B8A6' }]}
              onPress={() => setAppMode('hisab')}
            >
              <Text style={{ fontSize: 13 }}>💰</Text>
              <Text style={{ color: '#14B8A6', fontWeight: '800', fontSize: 11.5 }}>Daily Hisab</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.logWeightBtn, { backgroundColor: theme.primary }]}
              onPress={() => setWeightInputModal(true)}
            >
              <Text style={styles.logWeightBtnText}>+ Log Weight</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tier 2: Subtitle, Title & Goal Pill */}
        <View style={styles.headerBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: theme.muted }]}>BODY COMPOSITION & MACROS</Text>
            <Text style={[styles.mainHeading, { color: theme.text }]}>Weight & Nutrition</Text>
          </View>

          <View style={[styles.targetPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
            <Text style={[styles.targetPillLabel, { color: theme.muted }]}>TARGET</Text>
            <Text style={[styles.targetPillVal, { color: theme.primary }]}>{profile.targetWeightKg} kg</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Goal Mode Switcher Pills */}
        <View style={styles.goalSection}>
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>ACTIVE FITNESS GOAL:</Text>
          <View style={styles.goalsRow}>
            {goalsList.map((g) => {
              const isSelected = profile.fitnessGoal === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  activeOpacity={0.75}
                  style={[
                    styles.goalPill,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surface,
                      borderColor: isSelected ? theme.primary : theme.borderSoft,
                    },
                  ]}
                  onPress={() => updateProfile({ fitnessGoal: g.id })}
                >
                  <Text style={styles.goalEmoji}>{g.emoji}</Text>
                  <Text
                    style={[
                      styles.goalLabel,
                      { color: isSelected ? '#ffffff' : theme.text, fontWeight: isSelected ? '800' : '500' },
                    ]}
                  >
                    {g.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weight Trend Progress Chart */}
        <WeightTrendChart
          entries={weightHistory}
          startWeight={profile.startWeightKg}
          targetWeight={profile.targetWeightKg}
          currentWeight={profile.currentWeightKg}
          unit={profile.unit}
          goal={profile.fitnessGoal}
        />

        {/* Quick Body Stats & Metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>CURRENT BMI</Text>
            <Text style={[styles.metricValue, { color: theme.accent }]}>{bmi}</Text>
            <Text style={[styles.metricSub, { color: theme.subtle }]}>
              {parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal Fit' : 'Overweight'}
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>DAILY TARGET</Text>
            <Text style={[styles.metricValue, { color: theme.primary }]}>{profile.targetCalories}</Text>
            <Text style={[styles.metricSub, { color: theme.subtle }]}>kcal / day</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>DAILY PROTEIN</Text>
            <Text style={[styles.metricValue, { color: theme.success }]}>{profile.targetProteinGrams}g</Text>
            <Text style={[styles.metricSub, { color: theme.subtle }]}>2.2g / kg mass</Text>
          </View>
        </View>

        {/* Nutrition Plan Banner */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.macroBanner, { backgroundColor: theme.surfaceAlt, borderColor: theme.primary }]}
          onPress={() => setMacroModalVisible(true)}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.macroBannerTitle, { color: theme.text }]}>
              📊 Macro & Calorie Calculator
            </Text>
            <Text style={[styles.macroBannerSub, { color: theme.muted }]}>
              Protein: {profile.targetProteinGrams}g • Carbs: {profile.targetCarbsGrams}g • Fats: {profile.targetFatsGrams}g
            </Text>
          </View>
          <Text style={[styles.macroBannerArrow, { color: theme.primary }]}>Customize ➔</Text>
        </TouchableOpacity>

        {/* Water / Hydration Tracker */}
        <View style={[styles.waterCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.waterHeader}>
            <View>
              <Text style={[styles.waterTitle, { color: theme.text }]}>💧 Daily Hydration</Text>
              <Text style={[styles.waterSub, { color: theme.muted }]}>
                {profile.todayWaterMl} / {profile.dailyWaterTargetMl} ml ({waterPercent}%)
              </Text>
            </View>

            <View style={styles.waterActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.waterBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
                onPress={() => logWater(250)}
              >
                <Text style={[styles.waterBtnText, { color: theme.accent }]}>+250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.waterBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
                onPress={() => logWater(500)}
              >
                <Text style={[styles.waterBtnText, { color: theme.accent }]}>+500ml</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Water Progress Bar */}
          <View style={[styles.waterBarTrack, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.waterBarFill, { width: `${waterPercent}%`, backgroundColor: theme.accent }]} />
          </View>
        </View>

        {/* Body Circumference Measurements */}
        <View style={[styles.measureCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          <View style={styles.measureHeader}>
            <View>
              <Text style={[styles.measureTitle, { color: theme.text }]}>📏 Muscle Circumference</Text>
              <Text style={[styles.measureSub, { color: theme.muted }]}>Track arm, chest, and waist growth</Text>
            </View>
            <TouchableOpacity
              style={[styles.measureEditBtn, { backgroundColor: theme.surfaceAlt }]}
              onPress={() => setMeasureModalVisible(true)}
            >
              <Text style={[styles.measureEditText, { color: theme.accent }]}>+ Update</Text>
            </TouchableOpacity>
          </View>

          {bodyMeasurements.length > 0 && (
            <View style={styles.measureGrid}>
              <View style={[styles.measureItem, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.measureItemLabel, { color: theme.muted }]}>Left Bicep</Text>
                <Text style={[styles.measureItemVal, { color: theme.text }]}>
                  {bodyMeasurements[0].bicepsLeftCm || '—'} cm
                </Text>
              </View>
              <View style={[styles.measureItem, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.measureItemLabel, { color: theme.muted }]}>Right Bicep</Text>
                <Text style={[styles.measureItemVal, { color: theme.text }]}>
                  {bodyMeasurements[0].bicepsRightCm || '—'} cm
                </Text>
              </View>
              <View style={[styles.measureItem, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.measureItemLabel, { color: theme.muted }]}>Chest</Text>
                <Text style={[styles.measureItemVal, { color: theme.text }]}>
                  {bodyMeasurements[0].chestCm || '—'} cm
                </Text>
              </View>
              <View style={[styles.measureItem, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.measureItemLabel, { color: theme.muted }]}>Waist</Text>
                <Text style={[styles.measureItemVal, { color: theme.text }]}>
                  {bodyMeasurements[0].waistCm || '—'} cm
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Weight Log History */}
        <Text style={[styles.historyHeading, { color: theme.text }]}>RECENT WEIGH-INS</Text>
        {[...weightHistory].reverse().map((entry) => (
          <View
            key={entry.id}
            style={[styles.historyRow, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
          >
            <View>
              <Text style={[styles.historyDate, { color: theme.text }]}>{entry.date}</Text>
              <Text style={[styles.historyNotes, { color: theme.muted }]}>{entry.notes}</Text>
            </View>
            <Text style={[styles.historyWeight, { color: theme.primary }]}>
              {entry.weightKg} {profile.unit}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal visible={weightInputModal} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setWeightInputModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>LOG TODAY'S WEIGHT</Text>

            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.weightNumInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.primary }]}
                keyboardType="numeric"
                value={newWeight}
                onChangeText={setNewWeight}
                autoFocus
              />
              <Text style={[styles.unitText, { color: theme.muted }]}>{profile.unit.toUpperCase()}</Text>
            </View>

            <TextInput
              style={[styles.notesInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.borderSoft }]}
              placeholder="Notes (e.g. Morning fasted, post-workout...)"
              placeholderTextColor={theme.subtle}
              value={weightNotes}
              onChangeText={setWeightNotes}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setWeightInputModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveWeight}
              >
                <Text style={styles.modalSaveText}>SAVE ENTRY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Measurements Modal */}
      <Modal visible={measureModalVisible} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setMeasureModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>LOG BODY MEASUREMENTS (CM)</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.measFormRow}>
                <Text style={[styles.measFormLabel, { color: theme.text }]}>Left Bicep:</Text>
                <TextInput style={[styles.measInput, { color: theme.text, backgroundColor: theme.input }]} keyboardType="numeric" value={bicepsL} onChangeText={setBicepsL} />
              </View>

              <View style={styles.measFormRow}>
                <Text style={[styles.measFormLabel, { color: theme.text }]}>Right Bicep:</Text>
                <TextInput style={[styles.measInput, { color: theme.text, backgroundColor: theme.input }]} keyboardType="numeric" value={bicepsR} onChangeText={setBicepsR} />
              </View>

              <View style={styles.measFormRow}>
                <Text style={[styles.measFormLabel, { color: theme.text }]}>Chest:</Text>
                <TextInput style={[styles.measInput, { color: theme.text, backgroundColor: theme.input }]} keyboardType="numeric" value={chest} onChangeText={setChest} />
              </View>

              <View style={styles.measFormRow}>
                <Text style={[styles.measFormLabel, { color: theme.text }]}>Waist:</Text>
                <TextInput style={[styles.measInput, { color: theme.text, backgroundColor: theme.input }]} keyboardType="numeric" value={waist} onChangeText={setWaist} />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceAlt }]} onPress={() => setMeasureModalVisible(false)}>
                  <Text style={[styles.modalCancelText, { color: theme.muted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveMeasurement}>
                  <Text style={styles.modalSaveText}>SAVE MEASUREMENTS</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Macro Plan Modal */}
      <MacroPlanModal
        visible={macroModalVisible}
        profile={profile}
        onClose={() => setMacroModalVisible(false)}
        onSaveTargets={async (targets) => {
          await updateProfile({
            targetCalories: targets.calories,
            targetProteinGrams: targets.protein,
            targetCarbsGrams: targets.carbs,
            targetFatsGrams: targets.fats,
          });
        }}
      />
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
  logWeightBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logWeightBtnText: {
    color: '#fff',
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
  targetPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  targetPillVal: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  goalSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  goalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  goalEmoji: {
    fontSize: 14,
  },
  goalLabel: {
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 10,
  },
  macroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
  },
  macroBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  macroBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  macroBannerArrow: {
    fontSize: 12,
    fontWeight: '800',
  },
  waterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  waterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  waterSub: {
    fontSize: 11,
    marginTop: 2,
  },
  waterActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  waterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  waterBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  waterBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  measureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginVertical: 10,
  },
  measureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  measureTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  measureSub: {
    fontSize: 11,
    marginTop: 2,
  },
  measureEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  measureEditText: {
    fontSize: 11,
    fontWeight: '700',
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureItem: {
    flex: 1,
    minWidth: '45%',
    padding: 10,
    borderRadius: 10,
  },
  measureItemLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  measureItemVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  historyHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyNotes: {
    fontSize: 11,
    marginTop: 2,
  },
  historyWeight: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  weightNumInput: {
    width: 120,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '800',
  },
  notesInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  measFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  measFormLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  measInput: {
    width: 80,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
});
