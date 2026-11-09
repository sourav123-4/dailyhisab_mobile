import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { MealType } from '../types/fitness';
import { AppTheme, useAppTheme } from '../theme/appTheme';
import {
  analyzeFoodFromText,
  analyzeFoodFromImage,
  analyzePresetMeal,
  FoodScanUnavailableError,
  NotFoodError,
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
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [activeTab, setActiveTab] = useState<'photo' | 'text'>('photo');
  const [inputText, setInputText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [editableName, setEditableName] = useState('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  // Bumped when the user cancels a scan, so a late answer from the AI is ignored.
  const scanIdRef = useRef(0);

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
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processRealFoodPhoto(asset.uri);
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
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processRealFoodPhoto(asset.uri);
      }
    } catch (e: any) {
      console.warn('Gallery error:', e);
      Alert.alert('Gallery Error', 'Could not open photo gallery. Please try again.');
    }
  };

  // Analyze the real food image using AI Vision
  const processRealFoodPhoto = async (uri: string) => {
    const scanId = ++scanIdRef.current;
    setIsScanning(true);
    setAnalysisResult(null);
    setCapturedPhotoUri(uri);
    try {
      // A ~768 px JPEG is plenty to recognise food and uploads in a moment, unlike a full camera photo.
      const context = ImageManipulator.manipulate(uri);
      context.resize({ width: 768, height: null });
      const rendered = await context.renderAsync();
      const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const res = await analyzeFoodFromImage(uri, small.base64 || '');
      if (scanId !== scanIdRef.current) return;
      setAnalysisResult(res);
      setEditableName(res.name);
      setPortionMultiplier(1);
    } catch (e) {
      if (scanId !== scanIdRef.current) return;
      setCapturedPhotoUri(null);
      if (e instanceof NotFoodError) {
        Alert.alert(
          'Not food',
          `This looks like ${e.seen}, not food. Only photos of meals, snacks or drinks can be scanned.`
        );
      } else if (e instanceof FoodScanUnavailableError) {
        Alert.alert('Can\'t scan right now', `${e.message} You can also type what you ate instead.`, [
          { text: 'OK', style: 'cancel' },
          { text: 'Type food', onPress: () => setActiveTab('text') },
        ]);
      } else {
        Alert.alert('Scan failed', 'Could not read this photo. Try again, or type what you ate instead.');
      }
    } finally {
      if (scanId === scanIdRef.current) setIsScanning(false);
    }
  };

  // Analyze preset meal photo
  const handleSelectPreset = async (preset: PresetFoodMeal) => {
    setIsScanning(true);
    setAnalysisResult(null);
    setCapturedPhotoUri(preset.imageUri);
    try {
      const res = analyzePresetMeal(preset);
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
    const scanId = ++scanIdRef.current;
    setCapturedPhotoUri(null);
    setIsScanning(true);
    try {
      const res = await analyzeFoodFromText(query);
      if (scanId !== scanIdRef.current) return;
      setAnalysisResult(res);
      setEditableName(res.name);
      setPortionMultiplier(1);
    } catch (e) {
      if (scanId !== scanIdRef.current) return;
      if (e instanceof NotFoodError) {
        Alert.alert('Not food', `"${query.trim()}" doesn't look like food or drink. Type what you ate, like "2 roti and dal".`);
      } else {
        Alert.alert('Not recognised', e instanceof FoodScanUnavailableError ? e.message : 'Could not work out nutrition for this. Try different wording.');
      }
    } finally {
      if (scanId === scanIdRef.current) setIsScanning(false);
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
                  <Text style={styles.dividerText}>OR PICK A QUICK MEAL</Text>
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
                      placeholderTextColor={theme.subtle}
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleAnalyzeText()}
                      returnKeyType="done"
                    />
                    {inputText.length > 0 && (
                      <TouchableOpacity onPress={() => setInputText('')}>
                        <Text style={{ color: theme.subtle, fontSize: 16 }}>✕</Text>
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
                        style={[styles.quickPhotoSwitchBtn, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
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
                    placeholderTextColor={theme.subtle}
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
                  <View style={[styles.macroPill, { borderColor: theme.warning }]}>
                    <Text style={styles.macroPillIcon}>🔥</Text>
                    <Text style={styles.macroPillValue}>
                      {Math.round(analysisResult.calories * portionMultiplier)}
                    </Text>
                    <Text style={styles.macroPillLabel}>CALORIES</Text>
                    <Text style={styles.macroPillSub}>kcal</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: theme.primary }]}>
                    <Text style={styles.macroPillIcon}>🍗</Text>
                    <Text style={[styles.macroPillValue, { color: theme.primary }]}>
                      {Math.round(analysisResult.protein * portionMultiplier)}g
                    </Text>
                    <Text style={styles.macroPillLabel}>PROTEIN</Text>
                    <Text style={styles.macroPillSub}>Muscle Builder</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: theme.success }]}>
                    <Text style={styles.macroPillIcon}>🌾</Text>
                    <Text style={[styles.macroPillValue, { color: theme.success }]}>
                      {Math.round(analysisResult.carbs * portionMultiplier)}g
                    </Text>
                    <Text style={styles.macroPillLabel}>CARBS</Text>
                    <Text style={styles.macroPillSub}>Clean Energy</Text>
                  </View>

                  <View style={[styles.macroPill, { borderColor: theme.danger }]}>
                    <Text style={styles.macroPillIcon}>🥑</Text>
                    <Text style={[styles.macroPillValue, { color: theme.danger }]}>
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
          {isScanning ? (
            <ScanningOverlay
              photoUri={capturedPhotoUri}
              fromText={activeTab === 'text'}
              onCancel={() => {
                scanIdRef.current += 1;
                setIsScanning(false);
                setCapturedPhotoUri(null);
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const PHOTO_STEPS = ['Preparing photo…', 'Checking it is food…', 'Identifying each item…', 'Calculating calories & protein…'];
const TEXT_STEPS = ['Reading your meal…', 'Estimating portions…', 'Calculating calories & protein…'];

/** Full-sheet loader shown while the AI reads a meal, so it is always visible whatever the scroll position. */
function ScanningOverlay({ photoUri, fromText, onCancel }: { photoUri: string | null; fromText: boolean; onCancel: () => void }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState(0);
  const steps = fromText ? TEXT_STEPS : PHOTO_STEPS;
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    const timer = setInterval(() => setStep(prev => Math.min(prev + 1, steps.length - 1)), 1400);
    return () => {
      loop.stop();
      clearInterval(timer);
    };
  }, [sweep, steps.length]);

  return (
    <View style={styles.scanOverlay}>
      <View style={styles.scanningBox}>
        {photoUri ? (
          <View style={styles.scanningImagePreviewBox}>
            <Image source={{ uri: photoUri }} style={styles.scanningImagePreview} />
            <Animated.View
              style={[styles.scanningLaserBeam, { transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, 196] }) }] }]}
            />
          </View>
        ) : null}
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 16 }} />
        <Text style={styles.scanningTitle}>{steps[step]}</Text>
        <View style={styles.stepDots}>
          {steps.map((label, i) => (
            <View key={label} style={[styles.stepDot, i <= step && styles.stepDotOn]} />
          ))}
        </View>
        <Text style={styles.scanningSubtitle}>Usually takes 2–5 seconds</Text>
        <TouchableOpacity onPress={onCancel} style={styles.scanCancelBtn} activeOpacity={0.8}>
          <Text style={styles.scanCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) => {
  const line = t.dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)';
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: t.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingTop: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: t.borderSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: t.borderSoft,
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
    color: t.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: t.text,
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: t.muted,
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
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: line,
  },
  tabButtonActive: {
    backgroundColor: t.primary,
    borderColor: t.primary,
  },
  tabIcon: {
    fontSize: 15,
  },
  tabButtonText: {
    color: t.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: t.primaryText,
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
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: t.primary,
    shadowColor: t.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraBtnIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cameraBtnTitle: {
    color: t.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  cameraBtnSubtitle: {
    color: t.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  cameraBtnArrow: {
    color: t.primary,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  gallerySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: line,
  },
  galleryBtnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: line,
  },
  galleryBtnTitle: {
    color: t.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  galleryBtnSubtitle: {
    color: t.subtle,
    fontSize: 11,
  },
  galleryBtnArrow: {
    color: t.subtle,
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
    backgroundColor: t.surfaceAlt,
  },
  dividerText: {
    color: t.subtle,
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
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: line,
  },
  presetImage: {
    width: '100%',
    height: 120,
    backgroundColor: t.surfaceAlt,
  },
  presetOverlay: {
    padding: 10,
  },
  caloriePill: {
    alignSelf: 'flex-start',
    backgroundColor: t.warningSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  caloriePillText: {
    color: t.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  presetName: {
    color: t.text,
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
    color: t.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  presetCarbs: {
    color: t.success,
    fontSize: 10,
    fontWeight: '700',
  },
  presetFats: {
    color: t.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: line,
    marginVertical: 12,
  },
  inputLabel: {
    color: t.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: line,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    color: t.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  analyzeBtn: {
    backgroundColor: t.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeBtnText: {
    color: t.primaryText,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeading: {
    color: t.muted,
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
    backgroundColor: t.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
  },
  chipText: {
    color: t.text,
    fontSize: 12,
    fontWeight: '600',
  },
  scanOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5,10,20,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 50,
    elevation: 50,
  },
  scanningBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: t.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.primary,
  },
  scanningImagePreviewBox: {
    width: 220,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: t.primary,
  },
  scanningImagePreview: {
    width: '100%',
    height: '100%',
  },
  scanningLaserBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: t.success,
    shadowColor: t.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  scanningTitle: {
    color: t.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  stepDot: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.surfaceAlt,
  },
  stepDotOn: {
    backgroundColor: t.primary,
  },
  scanningSubtitle: {
    color: t.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  scanCancelBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: line,
  },
  scanCancelText: {
    color: t.text,
    fontWeight: '700',
    fontSize: 13,
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
    borderColor: '#5BC08F',
  },
  aiBadgeText: {
    color: '#5BC08F',
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
    backgroundColor: t.primarySoft,
    borderWidth: 1,
    borderColor: t.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPhotoSwitchBtnText: {
    color: t.text,
    fontSize: 12,
    fontWeight: '700',
  },
  foodHeaderCard: {
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: line,
  },
  editTitleLabel: {
    color: t.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  editableNameInput: {
    color: t.text,
    fontSize: 18,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderBottomColor: line,
    paddingVertical: 4,
    marginBottom: 6,
  },
  foodPortion: {
    color: t.muted,
    fontSize: 13,
    marginBottom: 6,
  },
  healthNoteText: {
    color: t.primary,
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
    borderTopColor: line,
  },
  portionLabel: {
    color: t.text,
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
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: line,
  },
  multBtnActive: {
    backgroundColor: t.primary,
    borderColor: t.primary,
  },
  multBtnText: {
    color: t.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  multBtnTextActive: {
    color: t.primaryText,
    fontWeight: '800',
  },
  macroHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: t.surface,
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
    color: t.warning,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  macroPillLabel: {
    color: t.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroPillSub: {
    color: t.subtle,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  ingredientsBox: {
    backgroundColor: t.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: line,
  },
  ingredientsLabel: {
    color: t.muted,
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
    backgroundColor: t.bg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  ingredientBadgeText: {
    color: t.text,
    fontSize: 11,
    fontWeight: '600',
  },
  mealTypeSection: {
    backgroundColor: t.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: line,
  },
  mealTypeLabel: {
    color: t.muted,
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
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: line,
  },
  mealTypeBtnSelected: {
    backgroundColor: t.primary,
    borderColor: t.primary,
  },
  mealTypeBtnText: {
    color: t.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  mealTypeBtnTextSelected: {
    color: t.primaryText,
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
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: line,
  },
  rescanBtnText: {
    color: t.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  logSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.success,
    borderRadius: 12,
    paddingVertical: 14,
  },
  logSaveBtnText: {
    color: t.primaryText,
    fontSize: 14,
    fontWeight: '800',
  },
});
};
