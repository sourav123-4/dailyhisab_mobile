import React, { useState, useEffect } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
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
  const [editableName, setEditableName] = useState('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const resetState = () => {
    setActiveTab('photo');
    setAnalysisResult(null);
    setInputText('');
    setIsScanning(false);
    setPortionMultiplier(1);
    setEditableName('');
    setCapturedPhotoUri(null);
  };

  useEffect(() => {
    if (visible) {
      resetState();
      setSelectedMealType(defaultMealType);
    }
  }, [visible, defaultMealType]);

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Launch device Camera to click a real food photo
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera permissions in your device settings to photograph your meals.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processRealFoodPhoto(asset.uri, asset.base64 || undefined);
      }
    } catch (e: any) {
      console.warn('Camera error:', e);
      Alert.alert('Camera Error', 'Could not open camera. Please try choosing from your gallery instead.');
    }
  };

  // Pick an existing food photo from gallery
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Gallery Permission Required',
          'Please allow photo library access in your device settings to select food photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processRealFoodPhoto(asset.uri, asset.base64 || undefined);
      }
    } catch (e: any) {
      console.warn('Gallery error:', e);
      Alert.alert('Gallery Error', 'Could not open photo gallery. Please try again.');
    }
  };

  // Analyze the real food image using AI Vision
  const processRealFoodPhoto = async (uri: string, base64?: string) => {
    setIsScanning(true);
    setAnalysisResult(null);
    setCapturedPhotoUri(uri);
    try {
      const res = await analyzeFoodFromImage(uri, base64);
      setAnalysisResult(res);
      setEditableName(res.name);
      setPortionMultiplier(1);
    } catch (e) {
      Alert.alert('Scan Failed', 'Could not process photo. You can enter the meal name directly to calculate macros.');
    } finally {
      setIsScanning(false);
    }
  };

  // Analyze preset meal photo
  const handleSelectPreset = async (preset: PresetFoodMeal) => {
    setIsScanning(true);
    setAnalysisResult(null);
    setCapturedPhotoUri(preset.imageUri);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const res = await analyzeFoodFromImage(preset.imageUri, undefined, preset.name);
      setAnalysisResult(res);
      setEditableName(res.name);
      setSelectedMealType(preset.mealType);
      setPortionMultiplier(1);
    } catch (e) {
      Alert.alert('Analysis Failed', 'Could not analyze food image. Please try again.');
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
      setEditableName(res.name);
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
    const finalMealName = editableName.trim() || analysisResult.name;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    await logMeal({
      name: finalMealName,
      mealType: selectedMealType,
      calories: calcCalories,
      protein: calcProtein,
      carbs: calcCarbs,
      fats: calcFats,
      imageUri: capturedPhotoUri || analysisResult.imageUri,
      portion: portionMultiplier === 1 ? analysisResult.portion : `${portionMultiplier}x (${analysisResult.portion})`,
      timestamp: timeStr,
      confidenceScore: analysisResult.confidenceScore,
      detectedItems: analysisResult.detectedItems,
      source: activeTab === 'photo' ? 'ai_vision' : 'ai_text',
    });

    Alert.alert(
      'Meal Logged! 🥗',
      `Added ${finalMealName} (${calcCalories} kcal, ${calcProtein}g P, ${calcCarbs}g C, ${calcFats}g F) to today's ${selectedMealType.toUpperCase()}.`,
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
                {/* REAL CAMERA / GALLERY ACTION BUTTONS */}
                <View style={styles.scanActionsContainer}>
                  <TouchableOpacity
                    style={styles.cameraPrimaryBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                    disabled={isScanning}
                  >
                    <View style={styles.cameraBtnIconBox}>
                      <Text style={{ fontSize: 26 }}>📷</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cameraBtnTitle}>Take Meal Photo (Camera)</Text>
                      <Text style={styles.cameraBtnSubtitle}>
                        Click a real photo of your food with camera to scan calories & macros
                      </Text>
                    </View>
                    <Text style={styles.cameraBtnArrow}>➔</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gallerySecondaryBtn}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.8}
                    disabled={isScanning}
                  >
                    <View style={styles.galleryBtnIconBox}>
                      <Text style={{ fontSize: 22 }}>🖼️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.galleryBtnTitle}>Upload Photo from Gallery</Text>
                      <Text style={styles.galleryBtnSubtitle}>
                        Select an existing food photo from your photo library
                      </Text>
                    </View>
                    <Text style={styles.galleryBtnArrow}>➔</Text>
                  </TouchableOpacity>
                </View>

                {/* Section Separator */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR TEST WITH ATHLETE PRESET MEALS</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Preset Meal Photos */}
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
                {capturedPhotoUri && (
                  <View style={styles.scanningImagePreviewBox}>
                    <Image source={{ uri: capturedPhotoUri }} style={styles.scanningImagePreview} />
                    <View style={styles.scanningLaserBeam} />
                  </View>
                )}
                <ActivityIndicator size="large" color="#00F0FF" style={{ marginTop: 12 }} />
                <Text style={styles.scanningTitle}>🔬 AI Vision Analyzing Real Photo...</Text>
                <Text style={styles.scanningSubtitle}>
                  Detecting food components, portion volume & calculating Calories, Protein, Carbs and Fats
                </Text>
              </View>
            )}

            {/* ANALYSIS RESULT VIEW */}
            {analysisResult && (
              <View style={styles.resultContainer}>
                {/* Image Preview if available */}
                {(capturedPhotoUri || analysisResult.imageUri) && (
                  <View>
                    <View style={styles.resultImageWrapper}>
                      <Image
                        source={{ uri: capturedPhotoUri || analysisResult.imageUri }}
                        style={styles.resultImage}
                        resizeMode="cover"
                      />
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>
                          ✓ {analysisResult.confidenceScore}% AI Confidence
                        </Text>
                      </View>
                    </View>

                    {/* Quick Retake or Gallery Switch */}
                    <View style={styles.quickPhotoSwitchRow}>
                      <TouchableOpacity
                        style={styles.quickPhotoSwitchBtn}
                        onPress={handleTakePhoto}
                        disabled={isScanning}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickPhotoSwitchBtnText}>📷 Click New Photo</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickPhotoSwitchBtn, { backgroundColor: '#1E293B', borderColor: '#475569' }]}
                        onPress={handlePickFromGallery}
                        disabled={isScanning}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickPhotoSwitchBtnText}>🖼️ Pick Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Editable Food Title & Portion */}
                <View style={styles.foodHeaderCard}>
                  <Text style={styles.editTitleLabel}>DETECTED MEAL (TAP TO EDIT NAME):</Text>
                  <TextInput
                    style={styles.editableNameInput}
                    value={editableName}
                    onChangeText={setEditableName}
                    placeholder="Meal Name"
                    placeholderTextColor="#64748B"
                  />
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

                {/* Meal Type Category Selector */}
                <View style={styles.mealTypeSection}>
                  <Text style={styles.mealTypeLabel}>LOG TO MEAL CATEGORY:</Text>
                  <View style={styles.mealTypeRow}>
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.mealTypeBtn,
                          selectedMealType === type && styles.mealTypeBtnSelected,
                        ]}
                        onPress={() => setSelectedMealType(type)}
                      >
                        <Text style={{ fontSize: 13, marginRight: 4 }}>
                          {type === 'breakfast' ? '🍳' : type === 'lunch' ? '🥗' : type === 'dinner' ? '🥩' : '🍎'}
                        </Text>
                        <Text
                          style={[
                            styles.mealTypeBtnText,
                            selectedMealType === type && styles.mealTypeBtnTextSelected,
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
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
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingBottom: 30,
  },
  scanActionsContainer: {
    gap: 12,
    marginVertical: 14,
  },
  cameraPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraBtnIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cameraBtnTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  cameraBtnSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  cameraBtnArrow: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  gallerySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  galleryBtnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  galleryBtnTitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  galleryBtnSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  galleryBtnArrow: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetImage: {
    width: '100%',
    height: 120,
  },
  presetOverlay: {
    padding: 10,
  },
  caloriePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
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
    lineHeight: 17,
    marginBottom: 6,
  },
  presetMacroRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetProtein: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  presetCarbs: {
    color: '#00FF87',
    fontSize: 10,
    fontWeight: '700',
  },
  presetFats: {
    color: '#FF0055',
    fontSize: 10,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 12,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 12,
  },
  analyzeBtn: {
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeBtnText: {
    color: '#0A0E17',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeading: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 10,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  scanningBox: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  scanningImagePreviewBox: {
    width: 180,
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#00F0FF',
  },
  scanningImagePreview: {
    width: '100%',
    height: '100%',
  },
  scanningLaserBeam: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00FF87',
    shadowColor: '#00FF87',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  scanningTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 14,
  },
  scanningSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  resultContainer: {
    gap: 14,
    marginTop: 8,
  },
  resultImageWrapper: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    height: 190,
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF87',
  },
  aiBadgeText: {
    color: '#00FF87',
    fontSize: 11,
    fontWeight: '800',
  },
  quickPhotoSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickPhotoSwitchBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPhotoSwitchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  foodHeaderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editTitleLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  editableNameInput: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 4,
    marginBottom: 6,
  },
  foodPortion: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
  },
  healthNoteText: {
    color: '#00F0FF',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  portionLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  multiplierButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  multBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
