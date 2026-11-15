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
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useFitnessApp } from '../navigation/FitnessAppContext';
import { useHisabApp } from '../navigation/HisabAppContext';
import { FoodMealLog, MealType } from '../types/fitness';
import { AppTheme, useAppTheme } from '../theme/appTheme';
import { AppIcon } from './AppIcon';
import { KeyboardAvoidingView } from './KeyboardAvoidingView';
import { useSheetBottomPadding } from './useSheetBottomPadding';
import {
  analyzeFoodFromText,
  analyzeFoodFromImage,
  analyzePresetMeal,
  refineFoodAnalysis,
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
  /** A meal that is already logged: the sheet opens on its details so they can be changed. */
  editMeal?: FoodMealLog | null;
}

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fats';
type MacroValues = Record<MacroKey, number>;
type MealSource = NonNullable<FoodMealLog['source']>;

const MACRO_KEYS: MacroKey[] = ['calories', 'protein', 'carbs', 'fats'];
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_EMOJI: Record<MealType, string> = { breakfast: '🍳', lunch: '🥗', dinner: '🥩', snack: '🍎' };
const QUICK_TEXT_MEALS = [
  '2 roti, dal and sabzi',
  '200g chicken breast & rice',
  '4 boiled eggs & 2 toast',
  '1 scoop whey & 1 banana',
  '200g paneer & 2 roti',
  '1 bowl oats with milk',
  '1 cup curd with fruit',
  '1 plate chicken biryani',
];

const macrosOf = (r: Pick<FoodAnalysisResult, MacroKey>): MacroValues => ({
  calories: r.calories,
  protein: r.protein,
  carbs: r.carbs,
  fats: r.fats,
});

const toTexts = (values: MacroValues, multiplier: number): Record<MacroKey, string> => ({
  calories: String(Math.round(values.calories * multiplier)),
  protein: String(Math.round(values.protein * multiplier)),
  carbs: String(Math.round(values.carbs * multiplier)),
  fats: String(Math.round(values.fats * multiplier)),
});

const ZERO_MACROS: MacroValues = { calories: 0, protein: 0, carbs: 0, fats: 0 };

export const FoodScannerModal: React.FC<FoodScannerModalProps> = ({
  visible,
  onClose,
  defaultMealType = 'lunch',
  editMeal = null,
}) => {
  const { logMeal, updateMeal } = useFitnessApp();
  const { showToast } = useHisabApp();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const sheetBottomPadding = useSheetBottomPadding(12);
  const scrollRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<'photo' | 'text'>('photo');
  const [inputText, setInputText] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [isScanning, setIsScanning] = useState(false);
  const [scanFromText, setScanFromText] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [source, setSource] = useState<MealSource>('ai_vision');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  // What the user sees and can change on the result: every field is editable.
  const [editableName, setEditableName] = useState('');
  const [editablePortion, setEditablePortion] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  // Values for one serving (1x); the fields show these times the serving multiplier.
  const [baseMacros, setBaseMacros] = useState<MacroValues>(ZERO_MACROS);
  const [macroText, setMacroText] = useState<Record<MacroKey, string>>(toTexts(ZERO_MACROS, 1));
  const [correctionText, setCorrectionText] = useState('');
  // Bumped when the user cancels a scan, so a late answer from the AI is ignored.
  const scanIdRef = useRef(0);

  const isEditing = Boolean(editMeal);

  /** Shows a result (from a scan, a preset, a typed correction or a saved meal) in the editable form. */
  const showResult = (res: FoodAnalysisResult) => {
    setAnalysisResult(res);
    setEditableName(res.name);
    setEditablePortion(res.portion);
    setPortionMultiplier(1);
    setBaseMacros(macrosOf(res));
    setMacroText(toTexts(macrosOf(res), 1));
    setCorrectionText('');
  };

  const clearResult = () => {
    setAnalysisResult(null);
    setCorrectionText('');
  };

  const resetState = () => {
    scanIdRef.current += 1;
    setActiveTab('photo');
    setInputText('');
    setIsScanning(false);
    setCapturedPhotoUri(null);
    setSource('ai_vision');
    clearResult();
  };

  useEffect(() => {
    if (!visible) return;
    resetState();
    if (editMeal) {
      setSelectedMealType(editMeal.mealType);
      setSource(editMeal.source || 'manual');
      setCapturedPhotoUri(editMeal.imageUri || null);
      showResult({
        name: editMeal.name,
        portion: editMeal.portion,
        calories: editMeal.calories,
        protein: editMeal.protein,
        carbs: editMeal.carbs,
        fats: editMeal.fats,
        confidenceScore: editMeal.confidenceScore ?? 100,
        detectedItems: editMeal.detectedItems || [],
        imageUri: editMeal.imageUri,
      });
    } else {
      setSelectedMealType(defaultMealType);
    }
    // Only when the sheet opens: later prop changes must not wipe what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    const previousPhoto = capturedPhotoUri;
    const hadResult = Boolean(analysisResult);
    setScanFromText(false);
    setIsScanning(true);
    setCapturedPhotoUri(uri);
    try {
      // A ~768 px JPEG is plenty to recognise food and uploads in a moment, unlike a full camera photo.
      const context = ImageManipulator.manipulate(uri);
      context.resize({ width: 768, height: null });
      const rendered = await context.renderAsync();
      const small = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      const res = await analyzeFoodFromImage(uri, small.base64 || '');
      if (scanId !== scanIdRef.current) return;
      setSource('ai_vision');
      showResult(res);
    } catch (e) {
      if (scanId !== scanIdRef.current) return;
      // A failed re-take keeps the result that was already on screen.
      setCapturedPhotoUri(hadResult ? previousPhoto : null);
      if (e instanceof NotFoodError) {
        Alert.alert(
          'Not food',
          `This looks like ${e.seen}, not food. Only photos of meals, snacks or drinks can be scanned.`
        );
      } else if (e instanceof FoodScanUnavailableError) {
        Alert.alert('Can\'t scan right now', `${e.message} You can also type what you ate instead.`, hadResult ? undefined : [
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

  // Use one of the built-in sample meals (no AI call needed)
  const handleSelectPreset = (preset: PresetFoodMeal) => {
    setCapturedPhotoUri(preset.imageUri);
    setSelectedMealType(preset.mealType);
    setSource('preset');
    showResult(analyzePresetMeal(preset));
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
    setScanFromText(true);
    setIsScanning(true);
    try {
      const res = await analyzeFoodFromText(query);
      if (scanId !== scanIdRef.current) return;
      setSource('ai_text');
      showResult(res);
    } catch (e) {
      if (scanId !== scanIdRef.current) return;
      if (e instanceof NotFoodError) {
        Alert.alert('Not food', `"${query.trim()}" doesn't look like food or drink. Type what you ate, like "2 roti and dal".`);
      } else {
        Alert.alert(
          'Not recognised',
          e instanceof FoodScanUnavailableError ? e.message : 'Could not work out nutrition for this. Try different wording.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Enter numbers myself', onPress: handleManualEntry },
          ]
        );
      }
    } finally {
      if (scanId === scanIdRef.current) setIsScanning(false);
    }
  };

  // Skip the AI: open an empty result the user fills in by hand
  const handleManualEntry = () => {
    setCapturedPhotoUri(null);
    setSource('manual');
    showResult({
      name: inputText.trim(),
      portion: '1 serving',
      ...ZERO_MACROS,
      confidenceScore: 100,
      detectedItems: [],
    });
  };

  // Re-work the result from a typed correction, keeping the photo
  const handleApplyCorrection = async () => {
    const note = correctionText.trim();
    if (!analysisResult || !note) return;
    Keyboard.dismiss();
    const scanId = ++scanIdRef.current;
    // Start from what is on screen now, including anything already changed by hand.
    const current: FoodAnalysisResult = {
      ...analysisResult,
      name: editableName.trim() || analysisResult.name,
      portion: editablePortion.trim() || analysisResult.portion,
      calories: Math.round(baseMacros.calories * portionMultiplier),
      protein: Math.round(baseMacros.protein * portionMultiplier),
      carbs: Math.round(baseMacros.carbs * portionMultiplier),
      fats: Math.round(baseMacros.fats * portionMultiplier),
    };
    setScanFromText(true);
    setIsScanning(true);
    try {
      const res = await refineFoodAnalysis(current, note);
      if (scanId !== scanIdRef.current) return;
      showResult(res);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e) {
      if (scanId !== scanIdRef.current) return;
      Alert.alert(
        'Could not update',
        e instanceof FoodScanUnavailableError ? e.message : 'Could not apply that change. You can change the numbers yourself.'
      );
    } finally {
      if (scanId === scanIdRef.current) setIsScanning(false);
    }
  };

  const handleMacroChange = (key: MacroKey, text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 5);
    setMacroText(prev => ({ ...prev, [key]: digits }));
    setBaseMacros(prev => ({ ...prev, [key]: (Number(digits) || 0) / portionMultiplier }));
  };

  const handleMultiplierChange = (multiplier: number) => {
    setPortionMultiplier(multiplier);
    setMacroText(toTexts(baseMacros, multiplier));
  };

  const shown: MacroValues = {
    calories: Number(macroText.calories) || 0,
    protein: Number(macroText.protein) || 0,
    carbs: Number(macroText.carbs) || 0,
    fats: Number(macroText.fats) || 0,
  };
  const caloriesFromMacros = Math.round(shown.protein * 4 + shown.carbs * 4 + shown.fats * 9);
  // Offer to fix calories only when they clearly disagree with the macros.
  const caloriesMismatch =
    caloriesFromMacros > 0 && Math.abs(caloriesFromMacros - shown.calories) > Math.max(40, caloriesFromMacros * 0.15);

  // Save to today's log, or update the meal being edited
  const handleSaveMeal = async () => {
    if (!analysisResult) return;
    Keyboard.dismiss();
    if (MACRO_KEYS.every(key => shown[key] === 0)) {
      Alert.alert('Add the numbers', 'Enter the calories or protein, carbs and fats for this meal before saving.');
      return;
    }
    const finalMealName = editableName.trim() || analysisResult.name || 'Meal';
    const portionLabel = editablePortion.trim() || analysisResult.portion || '1 serving';
    const details = {
      name: finalMealName,
      mealType: selectedMealType,
      calories: shown.calories || caloriesFromMacros,
      protein: shown.protein,
      carbs: shown.carbs,
      fats: shown.fats,
      imageUri: capturedPhotoUri || analysisResult.imageUri,
      portion: portionMultiplier === 1 ? portionLabel : `${portionMultiplier}x (${portionLabel})`,
      confidenceScore: analysisResult.confidenceScore,
      detectedItems: analysisResult.detectedItems,
      source,
    };

    if (editMeal) {
      await updateMeal(editMeal.id, details);
    } else {
      await logMeal({ ...details, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    }
    handleClose();
    showToast({
      type: 'success',
      title: editMeal ? 'Meal updated' : 'Meal logged',
      message: `${finalMealName} · ${details.calories} kcal · ${details.protein} g protein`,
    });
  };

  const photoUri = capturedPhotoUri || analysisResult?.imageUri;
  const macroTiles: { key: MacroKey; label: string; unit: string; color: string }[] = [
    { key: 'calories', label: 'Calories', unit: 'kcal', color: theme.warning },
    { key: 'protein', label: 'Protein', unit: 'g', color: theme.primary },
    { key: 'carbs', label: 'Carbs', unit: 'g', color: theme.success },
    { key: 'fats', label: 'Fats', unit: 'g', color: theme.danger },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent navigationBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={[styles.container, { paddingBottom: sheetBottomPadding }]}>
          <View style={styles.grabber} />
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerBadgeText}>{isEditing ? 'EDIT MEAL' : 'LOG FOOD'}</Text>
              <Text style={styles.title}>
                {isEditing ? 'Change this meal' : analysisResult ? 'Check and save' : 'What did you eat?'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} accessibilityLabel="Close">
              <AppIcon name="close" size={14} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          {!analysisResult ? (
            <View style={styles.tabBar}>
              {([
                { id: 'photo', label: 'Scan photo', icon: 'scan' },
                { id: 'text', label: 'Type food', icon: 'edit' },
              ] as const).map(tab => {
                const active = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabButton, active && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.85}
                  >
                    <AppIcon name={tab.icon} size={15} color={active ? theme.primary : theme.muted} />
                    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* PHOTO SCAN TAB */}
            {activeTab === 'photo' && !analysisResult && (
              <View>
                <View style={styles.scanActionsContainer}>
                  <TouchableOpacity
                    style={styles.cameraPrimaryBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.85}
                    disabled={isScanning}
                  >
                    <View style={styles.cameraBtnIconBox}>
                      <AppIcon name="scan" size={24} color={theme.primaryText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cameraBtnTitle}>Take a photo</Text>
                      <Text style={styles.cameraBtnSubtitle}>Point the camera at your plate to get calories and macros</Text>
                    </View>
                    <AppIcon name="chevron-right" size={14} color={theme.primaryText} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gallerySecondaryBtn}
                    onPress={handlePickFromGallery}
                    activeOpacity={0.85}
                    disabled={isScanning}
                  >
                    <View style={styles.galleryBtnIconBox}>
                      <AppIcon name="upload" size={18} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.galleryBtnTitle}>Choose from gallery</Text>
                      <Text style={styles.galleryBtnSubtitle}>Use a food photo you already have</Text>
                    </View>
                    <AppIcon name="chevron-right" size={13} color={theme.subtle} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Or pick a quick meal</Text>
                <View style={styles.presetsGrid}>
                  {PRESET_FITNESS_MEALS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetCard}
                      onPress={() => handleSelectPreset(preset)}
                      disabled={isScanning}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: preset.imageUri }} style={styles.presetImage} />
                      <View style={styles.caloriePill}>
                        <Text style={styles.caloriePillText}>{preset.calories} kcal</Text>
                      </View>
                      <View style={styles.presetOverlay}>
                        <Text style={styles.presetName} numberOfLines={2}>
                          {preset.name}
                        </Text>
                        <Text style={styles.presetMacros}>
                          P {preset.protein}g · C {preset.carbs}g · F {preset.fats}g
                        </Text>
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
                  <Text style={styles.fieldLabel}>What did you eat?</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 2 roti, dal and 100 g paneer"
                      placeholderTextColor={theme.subtle}
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleAnalyzeText()}
                      returnKeyType="done"
                    />
                    {inputText.length > 0 && (
                      <TouchableOpacity onPress={() => setInputText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Clear">
                        <AppIcon name="close" size={13} color={theme.subtle} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.analyzeBtn}
                    onPress={() => handleAnalyzeText()}
                    disabled={isScanning}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="spark" size={15} color={theme.primaryText} />
                    <Text style={styles.analyzeBtnText}>Calculate calories & macros</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.manualBtn} onPress={handleManualEntry} activeOpacity={0.7}>
                    <Text style={styles.manualBtnText}>I know the numbers — enter them myself</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Common meals</Text>
                <View style={styles.chipsRow}>
                  {QUICK_TEXT_MEALS.map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      style={styles.chip}
                      activeOpacity={0.8}
                      onPress={() => {
                        setInputText(chip);
                        handleAnalyzeText(chip);
                      }}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* RESULT: every detail can be changed before saving */}
            {analysisResult && (
              <View style={styles.resultContainer}>
                {photoUri ? (
                  <View style={styles.resultImageWrapper}>
                    <Image source={{ uri: photoUri }} style={styles.resultImage} resizeMode="cover" />
                    {source === 'ai_vision' || source === 'ai_text' ? (
                      <View style={styles.aiBadge}>
                        <AppIcon name="check" size={11} color="#ffffff" />
                        <Text style={styles.aiBadgeText}>{analysisResult.confidenceScore}% sure</Text>
                      </View>
                    ) : null}
                    {!isEditing ? (
                      <View style={styles.photoActions}>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto} disabled={isScanning} activeOpacity={0.85}>
                          <AppIcon name="scan" size={13} color="#ffffff" />
                          <Text style={styles.photoActionText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickFromGallery} disabled={isScanning} activeOpacity={0.85}>
                          <AppIcon name="upload" size={13} color="#ffffff" />
                          <Text style={styles.photoActionText}>Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Name & portion */}
                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Meal name</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editableName}
                    onChangeText={setEditableName}
                    placeholder="e.g. Roti, dal and sabzi"
                    placeholderTextColor={theme.subtle}
                    maxLength={80}
                  />
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Portion</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editablePortion}
                    onChangeText={setEditablePortion}
                    placeholder="e.g. 1 plate (~350 g)"
                    placeholderTextColor={theme.subtle}
                    maxLength={80}
                  />
                  {analysisResult.healthNote ? <Text style={styles.healthNoteText}>{analysisResult.healthNote}</Text> : null}
                </View>

                {/* Nutrition: tap a number to change it */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Nutrition</Text>
                    <Text style={styles.cardHint}>Tap a number to change it</Text>
                  </View>
                  <View style={styles.macroHud}>
                    {macroTiles.map(tile => (
                      <View key={tile.key} style={[styles.macroPill, { borderColor: tile.color }]}>
                        <TextInput
                          style={[styles.macroInput, { color: tile.color }]}
                          value={macroText[tile.key]}
                          onChangeText={text => handleMacroChange(tile.key, text)}
                          keyboardType="number-pad"
                          selectTextOnFocus
                          maxLength={5}
                          placeholder="0"
                          placeholderTextColor={theme.subtle}
                          accessibilityLabel={`${tile.label} in ${tile.unit}`}
                        />
                        <Text style={styles.macroPillLabel}>{tile.label}</Text>
                        <Text style={styles.macroPillSub}>{tile.unit}</Text>
                      </View>
                    ))}
                  </View>
                  {caloriesMismatch ? (
                    <TouchableOpacity
                      style={styles.mismatchRow}
                      activeOpacity={0.8}
                      onPress={() => handleMacroChange('calories', String(caloriesFromMacros))}
                    >
                      <Text style={styles.mismatchText}>
                        These macros add up to {caloriesFromMacros} kcal. <Text style={styles.mismatchLink}>Use that</Text>
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <View style={styles.portionRow}>
                    <Text style={styles.portionLabel}>How much did you eat?</Text>
                    <View style={styles.multiplierButtons}>
                      {[0.5, 1, 1.5, 2].map((mult) => (
                        <TouchableOpacity
                          key={mult}
                          style={[styles.multBtn, portionMultiplier === mult && styles.multBtnActive]}
                          onPress={() => handleMultiplierChange(mult)}
                        >
                          <Text style={[styles.multBtnText, portionMultiplier === mult && styles.multBtnTextActive]}>
                            {mult}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Typed correction */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Something not right?</Text>
                  <Text style={styles.cardSub}>Type what to change and the numbers are worked out again.</Text>
                  <TextInput
                    style={styles.correctionInput}
                    value={correctionText}
                    onChangeText={setCorrectionText}
                    placeholder="e.g. it was 3 rotis, no rice, add a bowl of dal"
                    placeholderTextColor={theme.subtle}
                    multiline
                    maxLength={300}
                  />
                  <TouchableOpacity
                    style={[styles.correctionBtn, !correctionText.trim() && { opacity: 0.45 }]}
                    onPress={handleApplyCorrection}
                    disabled={!correctionText.trim() || isScanning}
                    activeOpacity={0.85}
                  >
                    <AppIcon name="refresh" size={14} color={theme.primary} />
                    <Text style={styles.correctionBtnText}>Update numbers</Text>
                  </TouchableOpacity>
                </View>

                {/* Detected Ingredients */}
                {source !== 'preset' && analysisResult.detectedItems && analysisResult.detectedItems.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>What was found</Text>
                    <View style={styles.ingredientsChips}>
                      {analysisResult.detectedItems.map((item: string, idx: number) => (
                        <View key={idx} style={styles.ingredientBadge}>
                          <Text style={styles.ingredientBadgeText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Meal Type Category Selector */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Log as</Text>
                  <View style={styles.mealTypeRow}>
                    {MEAL_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.mealTypeBtn, selectedMealType === type && styles.mealTypeBtnSelected]}
                        onPress={() => setSelectedMealType(type)}
                      >
                        <Text style={styles.mealTypeEmoji}>{MEAL_EMOJI[type]}</Text>
                        <Text style={[styles.mealTypeBtnText, selectedMealType === type && styles.mealTypeBtnTextSelected]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Save bar stays in view while the details scroll */}
          {analysisResult ? (
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.rescanBtn} onPress={isEditing ? handleClose : clearResult} activeOpacity={0.8}>
                <Text style={styles.rescanBtnText}>{isEditing ? 'Cancel' : 'Start over'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logSaveBtn} onPress={handleSaveMeal} activeOpacity={0.85}>
                <AppIcon name="check" size={15} color="#ffffff" />
                <Text style={styles.logSaveBtnText}>{isEditing ? 'Save changes' : `Save · ${shown.calories || caloriesFromMacros} kcal`}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isScanning ? (
            <ScanningOverlay
              photoUri={scanFromText ? null : capturedPhotoUri}
              fromText={scanFromText}
              onCancel={() => {
                scanIdRef.current += 1;
                setIsScanning(false);
                if (!analysisResult) setCapturedPhotoUri(null);
              }}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
  const line = t.dark ? 'rgba(255, 255, 255, 0.10)' : t.border;
  const fieldBg = t.dark ? t.input : t.surfaceAlt;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(5, 8, 16, 0.6)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: t.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '90%',
      paddingTop: 8,
      overflow: 'hidden',
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: line,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    headerLeft: {
      flex: 1,
    },
    headerBadgeText: {
      color: t.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 2,
    },
    title: {
      color: t.text,
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 4,
      padding: 4,
      borderRadius: 14,
      backgroundColor: t.surfaceAlt,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 10,
      borderRadius: 11,
    },
    tabButtonActive: {
      backgroundColor: t.surface,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    tabButtonText: {
      color: t.muted,
      fontSize: 13.5,
      fontWeight: '700',
    },
    tabButtonTextActive: {
      color: t.primary,
      fontWeight: '800',
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    scrollInner: {
      paddingTop: 10,
      paddingBottom: 20,
    },
    scanActionsContainer: {
      gap: 10,
      marginBottom: 6,
    },
    cameraPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.primary,
      borderRadius: 20,
      padding: 16,
      shadowColor: t.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 5,
    },
    cameraBtnIconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cameraBtnTitle: {
      color: t.primaryText,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 2,
    },
    cameraBtnSubtitle: {
      color: t.primaryText,
      opacity: 0.85,
      fontSize: 12.5,
      lineHeight: 17,
      paddingRight: 8,
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
      borderRadius: 13,
      backgroundColor: t.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    galleryBtnTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 1,
    },
    galleryBtnSubtitle: {
      color: t.muted,
      fontSize: 12.5,
    },
    sectionHeading: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 16,
      marginBottom: 10,
    },
    presetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
    },
    presetCard: {
      width: '48%',
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: line,
    },
    presetImage: {
      width: '100%',
      height: 104,
      backgroundColor: t.surfaceAlt,
    },
    presetOverlay: {
      padding: 10,
    },
    caloriePill: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.62)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    caloriePillText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '800',
    },
    presetName: {
      color: t.text,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 17,
      minHeight: 34,
    },
    presetMacros: {
      color: t.muted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
    },
    inputCard: {
      backgroundColor: t.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: line,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: fieldBg,
      borderRadius: 14,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    textInput: {
      flex: 1,
      color: t.text,
      fontSize: 15,
      paddingVertical: 13,
    },
    analyzeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.primary,
      borderRadius: 14,
      paddingVertical: 14,
    },
    analyzeBtnText: {
      color: t.primaryText,
      fontSize: 15,
      fontWeight: '800',
    },
    manualBtn: {
      alignItems: 'center',
      paddingTop: 14,
      paddingBottom: 2,
    },
    manualBtnText: {
      color: t.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: t.surface,
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: line,
    },
    chipText: {
      color: t.text,
      fontSize: 13,
      fontWeight: '600',
    },
    scanOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(5,10,20,0.88)',
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
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
    },
    scanningImagePreviewBox: {
      width: 220,
      height: 200,
      borderRadius: 18,
      overflow: 'hidden',
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
      fontSize: 12.5,
      textAlign: 'center',
      marginTop: 8,
    },
    scanCancelBtn: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: t.surfaceAlt,
    },
    scanCancelText: {
      color: t.text,
      fontWeight: '700',
      fontSize: 13.5,
    },
    resultContainer: {
      gap: 12,
    },
    resultImageWrapper: {
      borderRadius: 20,
      overflow: 'hidden',
      height: 180,
      backgroundColor: t.surfaceAlt,
    },
    resultImage: {
      width: '100%',
      height: '100%',
    },
    aiBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.62)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    aiBadgeText: {
      color: '#ffffff',
      fontSize: 11.5,
      fontWeight: '800',
    },
    photoActions: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      flexDirection: 'row',
      gap: 8,
    },
    photoActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.62)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    photoActionText: {
      color: '#ffffff',
      fontSize: 12.5,
      fontWeight: '700',
    },
    card: {
      backgroundColor: t.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: line,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: {
      color: t.text,
      fontSize: 15,
      fontWeight: '800',
    },
    cardHint: {
      color: t.subtle,
      fontSize: 12,
      fontWeight: '600',
    },
    cardSub: {
      color: t.muted,
      fontSize: 12.5,
      lineHeight: 17,
      marginTop: 3,
      marginBottom: 10,
    },
    fieldLabel: {
      color: t.muted,
      fontSize: 12.5,
      fontWeight: '700',
      marginBottom: 6,
    },
    fieldInput: {
      color: t.text,
      fontSize: 15.5,
      fontWeight: '700',
      backgroundColor: fieldBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },
    healthNoteText: {
      color: t.muted,
      fontSize: 12.5,
      lineHeight: 17,
      marginTop: 10,
    },
    macroHud: {
      flexDirection: 'row',
      gap: 8,
    },
    macroPill: {
      flex: 1,
      backgroundColor: fieldBg,
      borderRadius: 14,
      paddingBottom: 9,
      alignItems: 'center',
      borderBottomWidth: 3,
    },
    macroInput: {
      alignSelf: 'stretch',
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '800',
      paddingTop: 10,
      paddingBottom: 2,
      paddingHorizontal: 2,
    },
    macroPillLabel: {
      color: t.text,
      fontSize: 12,
      fontWeight: '700',
    },
    macroPillSub: {
      color: t.subtle,
      fontSize: 11,
      marginTop: 1,
    },
    mismatchRow: {
      marginTop: 10,
      backgroundColor: t.warningSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    mismatchText: {
      color: t.text,
      fontSize: 12.5,
    },
    mismatchLink: {
      color: t.primary,
      fontWeight: '800',
    },
    portionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: line,
    },
    portionLabel: {
      color: t.text,
      fontSize: 13.5,
      fontWeight: '700',
    },
    multiplierButtons: {
      flexDirection: 'row',
      gap: 6,
    },
    multBtn: {
      minWidth: 42,
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: fieldBg,
    },
    multBtnActive: {
      backgroundColor: t.primary,
    },
    multBtnText: {
      color: t.muted,
      fontSize: 12.5,
      fontWeight: '700',
    },
    multBtnTextActive: {
      color: t.primaryText,
      fontWeight: '800',
    },
    correctionInput: {
      color: t.text,
      fontSize: 14.5,
      lineHeight: 20,
      backgroundColor: fieldBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 11,
      minHeight: 64,
      textAlignVertical: 'top',
    },
    correctionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 10,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: t.primarySoft,
    },
    correctionBtnText: {
      color: t.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    ingredientsChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 10,
    },
    ingredientBadge: {
      backgroundColor: fieldBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    ingredientBadgeText: {
      color: t.text,
      fontSize: 12.5,
      fontWeight: '600',
    },
    mealTypeRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 10,
    },
    mealTypeBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: fieldBg,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    mealTypeBtnSelected: {
      backgroundColor: t.primarySoft,
      borderColor: t.primary,
    },
    mealTypeEmoji: {
      fontSize: 17,
      marginBottom: 3,
    },
    mealTypeBtnText: {
      color: t.muted,
      fontSize: 11.5,
      fontWeight: '700',
    },
    mealTypeBtnTextSelected: {
      color: t.primary,
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: line,
      backgroundColor: t.bg,
    },
    rescanBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: t.surfaceAlt,
    },
    rescanBtnText: {
      color: t.text,
      fontSize: 14,
      fontWeight: '700',
    },
    logSaveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.success,
      borderRadius: 14,
      paddingVertical: 14,
    },
    logSaveBtnText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '800',
    },
  });
};
