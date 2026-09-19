import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { UserProfile, WeightGoal } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';

interface MacroPlanModalProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSaveTargets: (targets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => void;
}

export const MacroPlanModal: React.FC<MacroPlanModalProps> = ({
  visible,
  profile,
  onClose,
  onSaveTargets,
}) => {
  const theme = useAppTheme();

  // Calculate BMR (Mifflin-St Jeor Equation)
  const weightKg = profile.currentWeightKg || 70;
  const heightCm = profile.heightCm || 175;
  const age = profile.age || 25;
  const isMale = profile.gender !== 'female';

  const bmr = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161)
  );

  // Multipliers for activity level
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    athlete: 1.9,
  };
  const multiplier = activityMultipliers[profile.activityLevel] || 1.4;
  const tdee = Math.round(bmr * multiplier);

  // Determine target calories based on goal
  let calculatedCalories = tdee;
  if (profile.fitnessGoal === 'weight_gain' || profile.fitnessGoal === 'muscle_gain') {
    calculatedCalories = Math.round(tdee + 400); // Surplus for bulk
  } else if (profile.fitnessGoal === 'weight_loss') {
    calculatedCalories = Math.round(tdee - 500); // Deficit for cut
  }

  const [customCalories, setCustomCalories] = useState(
    (profile.targetCalories || calculatedCalories).toString()
  );

  const activeCalories = parseInt(customCalories, 10) || calculatedCalories;

  // Macro distribution:
  // Protein: 2.2g per kg bodyweight
  const targetProteinGrams = Math.round(weightKg * 2.2);
  const proteinCalories = targetProteinGrams * 4;

  // Fat: 25% of total calories
  const fatCalories = Math.round(activeCalories * 0.25);
  const targetFatGrams = Math.round(fatCalories / 9);

  // Carbs: remaining calories
  const carbsCalories = Math.max(0, activeCalories - proteinCalories - fatCalories);
  const targetCarbsGrams = Math.round(carbsCalories / 4);

  const handleSave = () => {
    onSaveTargets({
      calories: activeCalories,
      protein: targetProteinGrams,
      carbs: targetCarbsGrams,
      fats: targetFatGrams,
    });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>METABOLIC & MACRO ENGINE</Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Tailored for {profile.fitnessGoal === 'weight_loss' ? 'Fat Loss' : 'Muscle Gain & Bulk'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Energy Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.statLabel, { color: theme.muted }]}>BMR (Base Burn)</Text>
                <Text style={[styles.statNumber, { color: theme.text }]}>{bmr}</Text>
                <Text style={[styles.statUnit, { color: theme.subtle }]}>kcal/day</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.statLabel, { color: theme.muted }]}>TDEE (Maintenance)</Text>
                <Text style={[styles.statNumber, { color: theme.accent }]}>{tdee}</Text>
                <Text style={[styles.statUnit, { color: theme.subtle }]}>kcal/day</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                <Text style={[styles.statLabel, { color: theme.muted }]}>Goal Target</Text>
                <Text style={[styles.statNumber, { color: theme.primary }]}>{activeCalories}</Text>
                <Text style={[styles.statUnit, { color: theme.subtle }]}>kcal/day</Text>
              </View>
            </View>

            {/* Editable Calories */}
            <View style={[styles.inputBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Adjust Daily Calorie Target:</Text>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.primary, backgroundColor: theme.input }]}
                keyboardType="numeric"
                value={customCalories}
                onChangeText={setCustomCalories}
              />
            </View>

            {/* Daily Macro Breakdown Cards */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>DAILY MACRONUTRIENT TARGETS</Text>

            <View style={styles.macroCardsList}>
              {/* Protein */}
              <View style={[styles.macroRow, { backgroundColor: theme.surfaceAlt, borderColor: '#FF475755' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#FF4757' }]} />
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroName, { color: theme.text }]}>Protein (Muscle Building)</Text>
                  <Text style={[styles.macroDetail, { color: theme.muted }]}>2.2g / kg • {proteinCalories} kcal</Text>
                </View>
                <Text style={[styles.macroGrams, { color: '#FF4757' }]}>{targetProteinGrams}g</Text>
              </View>

              {/* Carbohydrates */}
              <View style={[styles.macroRow, { backgroundColor: theme.surfaceAlt, borderColor: '#00E5FF55' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#00E5FF' }]} />
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroName, { color: theme.text }]}>Carbohydrates (Gym Fuel)</Text>
                  <Text style={[styles.macroDetail, { color: theme.muted }]}>{carbsCalories} kcal</Text>
                </View>
                <Text style={[styles.macroGrams, { color: '#00E5FF' }]}>{targetCarbsGrams}g</Text>
              </View>

              {/* Fats */}
              <View style={[styles.macroRow, { backgroundColor: theme.surfaceAlt, borderColor: '#FFA50255' }]}>
                <View style={[styles.macroDot, { backgroundColor: '#FFA502' }]} />
                <View style={styles.macroInfo}>
                  <Text style={[styles.macroName, { color: theme.text }]}>Healthy Fats (Hormones)</Text>
                  <Text style={[styles.macroDetail, { color: theme.muted }]}>25% ratio • {fatCalories} kcal</Text>
                </View>
                <Text style={[styles.macroGrams, { color: '#FFA502' }]}>{targetFatGrams}g</Text>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>APPLY NUTRITION TARGETS</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  statUnit: {
    fontSize: 9,
    marginTop: 2,
  },
  inputBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  textInput: {
    width: 90,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  macroCardsList: {
    gap: 8,
    marginBottom: 20,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroInfo: {
    flex: 1,
  },
  macroName: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  macroGrams: {
    fontSize: 18,
    fontWeight: '900',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
