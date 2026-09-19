import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { analyzeFoodWithGemini, FoodNutritionAnalysis } from '../services/geminiAiService';

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
  const [activeTab, setActiveTab] = useState<'calculator' | 'food_scanner'>('calculator');

  // Food Scanner state (Gemini powered)
  const [mealText, setMealText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodNutritionAnalysis | null>(null);

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

  const handleAnalyzeMeal = async () => {
    if (!mealText.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodWithGemini({ textDescription: mealText.trim() });
      setAnalysisResult(result);
    } catch (e) {
      console.warn('Analysis error:', e);
    } finally {
      setIsAnalyzing(false);
    }
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
              <Text style={[styles.title, { color: theme.text }]}>METABOLIC & NUTRITION ENGINE</Text>
              <Text style={[styles.subtitle, { color: theme.muted }]}>
                Google Gemini AI · Adapted from VitalPath Architecture
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabBtn,
                activeTab === 'calculator' && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={() => setActiveTab('calculator')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'calculator' ? '#FFF' : theme.muted }]}>
                🎯 Macro Calculator
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.tabBtn,
                activeTab === 'food_scanner' && { backgroundColor: '#FF334B', borderColor: '#FF334B' },
              ]}
              onPress={() => setActiveTab('food_scanner')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'food_scanner' ? '#FFF' : theme.muted }]}>
                ✨ AI Meal Scanner
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {activeTab === 'calculator' ? (
              // ================= TAB 1: MACRO TARGET CALCULATOR =================
              <View>
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
              </View>
            ) : (
              // ================= TAB 2: AI MEAL SCANNER =================
              <View style={styles.scannerContainer}>
                <Text style={[styles.scannerDesc, { color: theme.muted }]}>
                  Describe what you ate or planned to eat. Google Gemini analyzes the ingredients and returns macro estimates instantly.
                </Text>

                <TextInput
                  style={[
                    styles.mealInput,
                    { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft },
                  ]}
                  placeholder="e.g. 2 whole eggs, 2 rotis, 1 cup yellow dal, 1 scoop whey protein"
                  placeholderTextColor={theme.muted}
                  value={mealText}
                  onChangeText={setMealText}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.analyzeBtn, { backgroundColor: '#FF334B' }]}
                  onPress={handleAnalyzeMeal}
                  disabled={isAnalyzing || !mealText.trim()}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.analyzeBtnText}>✨ ANALYZE WITH GEMINI AI</Text>
                  )}
                </TouchableOpacity>

                {analysisResult && (
                  <View style={[styles.resultCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderSoft }]}>
                    <Text style={[styles.resultTitle, { color: theme.accent }]}>MEAL NUTRITION PROFILE</Text>

                    <View style={styles.foodsChipsRow}>
                      {analysisResult.foodNames.map((food, i) => (
                        <View key={i} style={[styles.foodChip, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                          <Text style={[styles.foodChipText, { color: theme.text }]}>🍽 {food}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.resultStatsGrid}>
                      <View style={styles.resultStatBox}>
                        <Text style={[styles.resultStatNum, { color: theme.text }]}>
                          {analysisResult.estimatedCalories}
                        </Text>
                        <Text style={[styles.resultStatLabel, { color: theme.muted }]}>Calories (kcal)</Text>
                      </View>
                      <View style={styles.resultStatBox}>
                        <Text style={[styles.resultStatNum, { color: '#FF4757' }]}>
                          {analysisResult.proteinGrams}g
                        </Text>
                        <Text style={[styles.resultStatLabel, { color: theme.muted }]}>Protein</Text>
                      </View>
                      <View style={styles.resultStatBox}>
                        <Text style={[styles.resultStatNum, { color: '#00E5FF' }]}>
                          {analysisResult.carbsGrams}g
                        </Text>
                        <Text style={[styles.resultStatLabel, { color: theme.muted }]}>Carbs</Text>
                      </View>
                      <View style={styles.resultStatBox}>
                        <Text style={[styles.resultStatNum, { color: '#FFA502' }]}>
                          {analysisResult.fatGrams}g
                        </Text>
                        <Text style={[styles.resultStatLabel, { color: theme.muted }]}>Fats</Text>
                      </View>
                    </View>

                    <Text style={[styles.confidenceText, { color: theme.subtle }]}>
                      ℹ️ {analysisResult.confidenceNotes}
                    </Text>
                  </View>
                )}
              </View>
            )}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
  },
  textInput: {
    width: 90,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    borderRadius: 14,
    borderWidth: 1,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
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
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  scannerContainer: {
    paddingVertical: 4,
  },
  scannerDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  mealInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 12,
  },
  analyzeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  analyzeBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  foodsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  foodChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  foodChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultStatsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  resultStatBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  resultStatNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultStatLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  confidenceText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
