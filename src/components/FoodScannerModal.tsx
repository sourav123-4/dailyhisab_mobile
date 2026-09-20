import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { MealType } from '../types/fitness';
import {
  analyzeFoodFromName,
  analyzeFoodFromImage,
  PRESET_FITNESS_MEALS,
  FoodAnalysisResult,
  PresetFoodMeal,
} from '../services/nutritionAiService';

interface FoodScannerModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMealType?: MealType;
}

export const FoodScannerModal: React.FC<FoodScannerModalProps> = ({
  visible,
  onClose,
  defaultMealType = 'lunch',
}) => {
  const { logMeal } = useFitnessApp();

  const [activeTab, setActiveTab] = useState<'photo' | 'text'>('photo');
  const [inputText, setInputText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const resetState = () => {
    setAnalysisResult(null);
    setInputText('');
    setIsScanning(false);
    setPortionMultiplier(1);
    setShowUrlInput(false);
    setCustomImageUrl('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Analyze preset meal photo
  const handleSelectPreset = async (preset: PresetFoodMeal) => {
    setIsScanning(true);
    setAnalysisResult(null);
    try {
      // Simulate real-time computer vision scan
      await new Promise((r) => setTimeout(r, 600));
      const res = await analyzeFoodFromImage(preset.imageUri, undefined, preset.name);
      setAnalysisResult(res);
      setSelectedMealType(preset.mealType);
      setPortionMultiplier(1);
    } catch (e) {
      Alert.alert('Analysis Failed', 'Could not analyze food image. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Analyze custom image url
  const handleAnalyzeCustomUrl = async () => {
    if (!customImageUrl.trim()) return;
    setIsScanning(true);
    try {
      const res = await analyzeFoodFromImage(customImageUrl.trim());
      setAnalysisResult(res);
      setPortionMultiplier(1);
      setShowUrlInput(false);
    } catch (e) {
      Alert.alert('Analysis Failed', 'Could not analyze food image URL.');
    } finally {
      setIsScanning(false);
    }
  };

  // Analyze from text query
  const handleAnalyzeText = async (textToAnalyze?: string) => {
    const query = textToAnalyze || inputText;
    if (!query.trim()) {
      Alert.alert('Enter Food Name', 'Please type the name of the meal (e.g. 200g chicken and rice)');
      return;
    }
    setIsScanning(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const res = analyzeFoodFromName(query);
      setAnalysisResult(res);
      setPortionMultiplier(1);
    } catch (e) {
      Alert.alert('Analysis Failed', 'Could not compute nutrition for this meal.');
    } finally {
      setIsScanning(false);
    }
  };

  // Save to today's log
  const handleSaveMeal = async () => {
    if (!analysisResult) return;

    const calcCalories = Math.round(analysisResult.calories * portionMultiplier);
    const calcProtein = Math.round(analysisResult.protein * portionMultiplier);
    const calcCarbs = Math.round(analysisResult.carbs * portionMultiplier);
    const calcFats = Math.round(analysisResult.fats * portionMultiplier);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await logMeal({
      name: analysisResult.name,
      mealType: selectedMealType,
      calories: calcCalories,
      protein: calcProtein,
      carbs: calcCarbs,
      fats: calcFats,
      imageUri: analysisResult.imageUri,
      portion: portionMultiplier === 1 ? analysisResult.portion : `${portionMultiplier}x (${analysisResult.portion})`,
      timestamp: timeStr,
      confidenceScore: analysisResult.confidenceScore,
      detectedItems: analysisResult.detectedItems,
      source: activeTab === 'photo' ? 'ai_vision' : 'ai_text',
    });

    Alert.alert(
      'Meal Logged! 🥗',
      `Added ${analysisResult.name} (${calcCalories} kcal, ${calcProtein}g P, ${calcCarbs}g C) to today's ${selectedMealType.toUpperCase()}.`,
      [{ text: 'Great!', onPress: handleClose }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeIcon}>✨</Text>
                <Text style={styles.headerBadgeText}>AI NUTRITION LAB</Text>
              </View>
              <Text style={styles.title}>What Did You Eat?</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'photo' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('photo');
                setAnalysisResult(null);
              }}
            >
              <Text style={styles.tabIcon}>📸</Text>
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'photo' && styles.tabButtonTextActive,
                ]}
              >
                Food Photo / Scan
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'text' && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab('text');
                setAnalysisResult(null);
              }}
            >
              <Text style={styles.tabIcon}>✍️</Text>
              <Text
                style={[styles.tabButtonText, activeTab === 'text' && styles.tabButtonTextActive]}
              >
                Food Name / Text
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
            {/* PHOTO SCAN TAB */}
            {activeTab === 'photo' && !analysisResult && (
              <View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>🔬</Text>
                  <Text style={styles.infoBoxText}>
                    Select a meal photo below or enter an image URL to automatically detect foods and calculate calories, protein, carbs & fats with sports nutrition AI.
                  </Text>
                </View>

                {/* Custom Image URL Option */}
                <View style={styles.customUrlSection}>
                  {showUrlInput ? (
                    <View style={styles.urlInputRow}>
                      <TextInput
                        style={styles.urlInput}
                        placeholder="Paste image URL (https://...)"
                        placeholderTextColor="#64748B"
                        value={customImageUrl}
                        onChangeText={setCustomImageUrl}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.scanUrlBtn}
                        onPress={handleAnalyzeCustomUrl}
                      >
                        <Text style={styles.scanUrlBtnText}>Scan</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.openUrlBtn}
                      onPress={() => setShowUrlInput(true)}
                    >
                      <Text style={styles.openUrlBtnText}>🔗 Enter custom image link or photo URL</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.sectionHeading}>📸 Tap Any Meal Photo to Scan & Calculate:</Text>

                <View style={styles.presetsGrid}>
                  {PRESET_FITNESS_MEALS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetCard}
                      onPress={() => handleSelectPreset(preset)}
                      disabled={isScanning}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: preset.imageUri }} style={styles.presetImage} />
                      <View style={styles.presetOverlay}>
                        <View style={styles.caloriePill}>
                          <Text style={styles.caloriePillText}>🔥 {preset.calories} kcal</Text>
                        </View>
                        <Text style={styles.presetName} numberOfLines={2}>
                          {preset.name}
                        </Text>
                        <View style={styles.presetMacroRow}>
                          <Text style={styles.presetProtein}>P: {preset.protein}g</Text>
                          <Text style={styles.presetCarbs}>C: {preset.carbs}g</Text>
                          <Text style={styles.presetFats}>F: {preset.fats}g</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* FOOD NAME TAB */}
            {activeTab === 'text' && !analysisResult && (
              <View>
                <View style={styles.inputCard}>
                  <Text style={styles.inputLabel}>ENTER MEAL OR INGREDIENTS</Text>
                  <View style={styles.inputRow}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>🍽️</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 200g chicken breast and 1 cup rice"
                      placeholderTextColor="#64748B"
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleAnalyzeText()}
                      returnKeyType="done"
                    />
                    {inputText.length > 0 && (
                      <TouchableOpacity onPress={() => setInputText('')}>
                        <Text style={{ color: '#64748B', fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.analyzeBtn}
                    onPress={() => handleAnalyzeText()}
                    disabled={isScanning}
                  >
                    <Text style={styles.analyzeBtnText}>⚡ Calculate Calories & Macros</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Suggestion Chips */}
                <Text style={styles.sectionHeading}>💡 Common Athlete Meals (Tap to analyze):</Text>
                <View style={styles.chipsRow}>
                  {[
                    '200g Chicken Breast & White Rice',
                    '4 Boiled Eggs & 2 Toasts',
                    '1 Scoop Whey Protein & 1 Banana',
                    '200g Paneer & 2 Rotis',
                    '250g Salmon with Sweet Potato',
                    '100g Oatmeal with Honey & Almonds',
                    '1 Cup Greek Yogurt with Berries',
                    '170g Tuna Can with Multigrain Bread',
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.chip}
                      onPress={() => {
                        setInputText(chip);
                        handleAnalyzeText(chip);
                      }}
                    >
                      <Text style={styles.chipText}>+ {chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* SCANNING RADAR LOADER */}
            {isScanning && (
              <View style={styles.scanningBox}>
                <ActivityIndicator size="large" color="#00F0FF" />
                <Text style={styles.scanningTitle}>Scanning Food & Calculating Macros...</Text>
                <Text style={styles.scanningSubtitle}>
                  Analyzing portion weight, caloric density & sports nutrition profile
                </Text>
              </View>
            )}

            {/* ANALYSIS RESULT VIEW */}
            {analysisResult && (
              <View style={styles.resultContainer}>
                {/* Image Preview if available */}
                {analysisResult.imageUri && (
                  <View style={styles.resultImageWrapper}>
                    <Image
                      source={{ uri: analysisResult.imageUri }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>
                        ✓ {analysisResult.confidenceScore}% AI Confidence
                      </Text>
                    </View>
                  </View>
                )}

                {/* Food Header */}
                <View style={styles.foodHeaderCard}>
                  <Text style={styles.foodTitle}>{analysisResult.name}</Text>
                  <Text style={styles.foodPortion}>
                    Portion: {analysisResult.portion}
                  </Text>
                  {analysisResult.healthNote ? (
                    <Text style={styles.healthNoteText}>💡 {analysisResult.healthNote}</Text>
                  ) : null}

                  {/* Portion Multiplier */}
                  <View style={styles.portionRow}>
                    <Text style={styles.portionLabel}>Serving Multiplier:</Text>
                    <View style={styles.multiplierButtons}>
                      {[0.5, 1.0, 1.5, 2.0].map((mult) => (
                        <TouchableOpacity
                          key={mult}
                          style={[
                            styles.multBtn,
                            portionMultiplier === mult && styles.multBtnActive,
                          ]}
                          onPress={() => setPortionMultiplier(mult)}
                        >
                          <Text
                            style={[
                              styles.multBtnText,
                              portionMultiplier === mult && styles.multBtnTextActive,
                            ]}
                          >
                            {mult}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* MACRO BREAKDOWN HUD */}
                <View style={styles.macroHud}>
                  <View style={[styles.macroPill, { borderColor: '#FF9500' }]}>
                    <Text style={styles.macroPillIcon}>🔥</Text>
                    <Text style={styles.macroPillValue}>
                      {Math.round(analysisResult.calories * portionMultiplier)}
                    </Text>
                    <Text style={styles.macroPillLabel}>CALORIES</Text>
                    <Text style={styles.macroPillSub}>kcal</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: '#00F0FF' }]}>
                    <Text style={styles.macroPillIcon}>🍗</Text>
                    <Text style={[styles.macroPillValue, { color: '#00F0FF' }]}>
                      {Math.round(analysisResult.protein * portionMultiplier)}g
                    </Text>
                    <Text style={styles.macroPillLabel}>PROTEIN</Text>
                    <Text style={styles.macroPillSub}>Muscle Builder</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: '#00FF87' }]}>
                    <Text style={styles.macroPillIcon}>🌾</Text>
                    <Text style={[styles.macroPillValue, { color: '#00FF87' }]}>
                      {Math.round(analysisResult.carbs * portionMultiplier)}g
                    </Text>
                    <Text style={styles.macroPillLabel}>CARBS</Text>
                    <Text style={styles.macroPillSub}>Clean Energy</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: '#FF0055' }]}>
                    <Text style={styles.macroPillIcon}>🥑</Text>
                    <Text style={[styles.macroPillValue, { color: '#FF0055' }]}>
                      {Math.round(analysisResult.fats * portionMultiplier)}g
                    </Text>
                    <Text style={styles.macroPillLabel}>FATS</Text>
                    <Text style={styles.macroPillSub}>Hormones</Text>
                  </View>
                </View>

                {/* Detected Ingredients */}
                {analysisResult.detectedItems && analysisResult.detectedItems.length > 0 && (
                  <View style={styles.ingredientsBox}>
                    <Text style={styles.ingredientsLabel}>DETECTED INGREDIENTS / ITEMS:</Text>
                    <View style={styles.ingredientsChips}>
                      {analysisResult.detectedItems.map((item: string, idx: number) => (
                        <View key={idx} style={styles.ingredientBadge}>
                          <Text style={styles.ingredientBadgeText}>• {item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Meal Type Picker */}
                <View style={styles.mealTypeSection}>
                  <Text style={styles.mealTypeLabel}>LOG TO MEAL CATEGORY:</Text>
                  <View style={styles.mealTypeRow}>
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => {
                      const icons: Record<MealType, string> = {
                        breakfast: '🍳',
                        lunch: '🥗',
                        dinner: '🥩',
                        snack: '🍎',
                      };
                      const isSelected = selectedMealType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.mealTypeBtn,
                            isSelected && styles.mealTypeBtnSelected,
                          ]}
                          onPress={() => setSelectedMealType(type)}
                        >
                          <Text style={{ fontSize: 13, marginRight: 2 }}>{icons[type]}</Text>
                          <Text
                            style={[
                              styles.mealTypeBtnText,
                              isSelected && styles.mealTypeBtnTextSelected,
                            ]}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => setAnalysisResult(null)}
                  >
                    <Text style={styles.rescanBtnText}>↺ Re-scan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.logSaveBtn} onPress={handleSaveMeal}>
                    <Text style={styles.logSaveBtnText}>✓ Save to Today's Meals</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingTop: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    gap: 4,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBadgeIcon: {
    fontSize: 12,
  },
  headerBadgeText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButtonActive: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  tabIcon: {
    fontSize: 15,
  },
  tabButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#0A0E17',
    fontWeight: '800',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoBoxText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  customUrlSection: {
    marginBottom: 16,
  },
  openUrlBtn: {
    paddingVertical: 6,
  },
  openUrlBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '600',
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  urlInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scanUrlBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scanUrlBtnText: {
    color: '#0A0E17',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#0F172A',
  },
  presetOverlay: {
    padding: 10,
  },
  caloriePill: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  caloriePillText: {
    color: '#FF9500',
    fontSize: 11,
    fontWeight: '800',
  },
  presetName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 18,
  },
  presetMacroRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetProtein: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  presetCarbs: {
    color: '#00FF87',
    fontSize: 11,
    fontWeight: '700',
  },
  presetFats: {
    color: '#FF0055',
    fontSize: 11,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  analyzeBtn: {
    backgroundColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  analyzeBtnText: {
    color: '#0A0E17',
    fontSize: 14,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  scanningBox: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    gap: 12,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  scanningTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scanningSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },
  resultContainer: {
    gap: 16,
  },
  resultImageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(10, 14, 23, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FF87',
  },
  aiBadgeText: {
    color: '#00FF87',
    fontSize: 11,
    fontWeight: '800',
  },
  foodHeaderCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  foodTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  foodPortion: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
  },
  healthNoteText: {
    color: '#38BDF8',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  portionLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  multiplierButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  multBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  multBtnActive: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  multBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  multBtnTextActive: {
    color: '#0A0E17',
    fontWeight: '800',
  },
  macroHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  macroPillIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  macroPillValue: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  macroPillLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroPillSub: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  ingredientsBox: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ingredientsLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  ingredientsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ingredientBadgeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  mealTypeSection: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  mealTypeLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mealTypeBtnSelected: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  mealTypeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  mealTypeBtnTextSelected: {
    color: '#0A0E17',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rescanBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rescanBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  logSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF87',
    borderRadius: 12,
    paddingVertical: 14,
  },
  logSaveBtnText: {
    color: '#0A0E17',
    fontSize: 14,
    fontWeight: '800',
  },
});
