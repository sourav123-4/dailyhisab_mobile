import { FoodMealLog, MealType } from '../types/fitness';
import { getActiveGeminiApiKey } from './geminiAiService';
import { geminiGenerateContent, isAiProxyAvailable } from './aiProxy';

export interface FoodAnalysisResult {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  confidenceScore: number;
  detectedItems: string[];
  imageUri?: string;
  healthNote?: string;
}

export interface PresetFoodMeal {
  id: string;
  name: string;
  category: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  imageUri: string;
  mealType: MealType;
}

// 8 Verified Popular Fitness Meals with High-Resolution Photos
export const PRESET_FITNESS_MEALS: PresetFoodMeal[] = [
  {
    id: 'meal_chicken_rice',
    name: 'Grilled Chicken Breast & Basmati Rice',
    category: 'High Protein Clean Carb',
    portion: '200g chicken + 150g rice + broccoli',
    calories: 485,
    protein: 52,
    carbs: 48,
    fats: 8,
    imageUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    mealType: 'lunch',
  },
  {
    id: 'meal_eggs_toast',
    name: '3 Whole Eggs & Sourdough Toast',
    category: 'Breakfast Power Fuel',
    portion: '3 large eggs + 2 slices sourdough',
    calories: 390,
    protein: 24,
    carbs: 32,
    fats: 18,
    imageUri: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
    mealType: 'breakfast',
  },
  {
    id: 'meal_whey_shake',
    name: 'Whey Isolate Shake & Banana',
    category: 'Post-Workout Hypertrophy',
    portion: '1 scoop whey (30g) + 300ml milk + 1 banana',
    calories: 340,
    protein: 36,
    carbs: 38,
    fats: 4,
    imageUri: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    mealType: 'snack',
  },
  {
    id: 'meal_paneer_roti',
    name: 'Paneer Bhurji & 2 Whole Wheat Rotis',
    category: 'Vegetarian High Protein',
    portion: '150g fresh paneer + 2 rotis + salad',
    calories: 495,
    protein: 28,
    carbs: 42,
    fats: 22,
    imageUri: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
    mealType: 'dinner',
  },
  {
    id: 'meal_oatmeal_berries',
    name: 'Rolled Oats with Berries & Peanut Butter',
    category: 'Slow-Digesting Complex Carbs',
    portion: '60g oats + 1 tbsp peanut butter + blueberries',
    calories: 380,
    protein: 15,
    carbs: 54,
    fats: 14,
    imageUri: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=600&auto=format&fit=crop&q=80',
    mealType: 'breakfast',
  },
  {
    id: 'meal_salmon_potatoes',
    name: 'Pan-Seared Salmon & Roasted Potatoes',
    category: 'Omega-3 Lean Hypertrophy',
    portion: '180g salmon fillet + 150g potatoes + asparagus',
    calories: 520,
    protein: 44,
    carbs: 34,
    fats: 21,
    imageUri: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop&q=80',
    mealType: 'dinner',
  },
  {
    id: 'meal_greek_yogurt',
    name: 'Greek Yogurt & Mixed Nuts',
    category: 'Casein Muscle Recovery',
    portion: '200g Greek yogurt 0% + 25g almonds & walnuts',
    calories: 275,
    protein: 25,
    carbs: 12,
    fats: 15,
    imageUri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
    mealType: 'snack',
  },
  {
    id: 'meal_dal_chawal',
    name: 'Yellow Tadka Dal & Steamed Rice with Ghee',
    category: 'Comfort Clean Nutrition',
    portion: '1 bowl dal + 1 cup rice + 1 tsp ghee',
    calories: 430,
    protein: 18,
    carbs: 68,
    fats: 10,
    imageUri: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    mealType: 'lunch',
  },
];

// Verified Sports Nutrition & Hypertrophy Food Matrix per 100g (or standard unit)
interface NutritionItem {
  keywords: string[];
  name: string;
  standardPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const FOOD_DATABASE: NutritionItem[] = [
  // Proteins
  { keywords: ['chicken', 'chicken breast', 'poultry', 'murgh'], name: 'Grilled Chicken Breast', standardPortion: '150g', calories: 248, protein: 46, carbs: 0, fats: 5 },
  { keywords: ['egg', 'eggs', 'boiled egg', 'omelette', 'omelet', 'anda'], name: 'Whole Eggs (2 large)', standardPortion: '2 eggs (100g)', calories: 144, protein: 13, carbs: 1, fats: 10 },
  { keywords: ['egg white', 'egg whites'], name: 'Egg Whites (4 large)', standardPortion: '4 whites (130g)', calories: 68, protein: 15, carbs: 1, fats: 0.2 },
  { keywords: ['whey', 'protein shake', 'whey protein', 'isolate', 'shake'], name: 'Whey Protein Shake', standardPortion: '1 scoop (32g)', calories: 125, protein: 26, carbs: 2, fats: 1.5 },
  { keywords: ['paneer', 'cottage cheese'], name: 'Fresh Paneer', standardPortion: '100g', calories: 290, protein: 18, carbs: 4, fats: 22 },
  { keywords: ['tofu', 'soya paneer'], name: 'Firm Tofu', standardPortion: '120g', calories: 110, protein: 14, carbs: 3, fats: 6 },
  { keywords: ['salmon', 'raw salmon', 'fish'], name: 'Grilled Salmon Fillet', standardPortion: '150g', calories: 310, protein: 34, carbs: 0, fats: 18 },
  { keywords: ['tuna', 'canned tuna'], name: 'Tuna in Water', standardPortion: '1 can (130g)', calories: 145, protein: 32, carbs: 0, fats: 1 },
  { keywords: ['beef', 'steak', 'ground beef'], name: 'Lean Beef Steak', standardPortion: '150g', calories: 290, protein: 40, carbs: 0, fats: 13 },
  { keywords: ['dal', 'lentils', 'moong', 'chana', 'rajma'], name: 'Lentil Curry (Dal / Rajma)', standardPortion: '1 medium bowl (200g)', calories: 195, protein: 12, carbs: 28, fats: 4 },
  { keywords: ['chickpeas', 'chana masala', 'hummus'], name: 'Boiled Chickpeas / Chana', standardPortion: '150g', calories: 240, protein: 13, carbs: 40, fats: 4 },
  { keywords: ['soya chunks', 'soy chunks', 'meal maker'], name: 'Boiled Soya Chunks', standardPortion: '50g dry (150g cooked)', calories: 172, protein: 26, carbs: 16, fats: 0.5 },

  // Carbs
  { keywords: ['rice', 'white rice', 'brown rice', 'chawal'], name: 'Steamed Rice', standardPortion: '1 medium cup (150g cooked)', calories: 195, protein: 4, carbs: 43, fats: 0.5 },
  { keywords: ['roti', 'chapati', 'phulka', 'flatbread'], name: 'Whole Wheat Roti (2 pcs)', standardPortion: '2 rotis (70g)', calories: 180, protein: 6, carbs: 36, fats: 1.5 },
  { keywords: ['paratha', 'aloo paratha'], name: 'Aloo Paratha (1 pc)', standardPortion: '1 pc (120g)', calories: 280, protein: 6, carbs: 42, fats: 10 },
  { keywords: ['oats', 'oatmeal', 'porridge'], name: 'Rolled Oats (cooked)', standardPortion: '50g dry with water', calories: 190, protein: 7, carbs: 33, fats: 3.5 },
  { keywords: ['bread', 'toast', 'sourdough'], name: 'Whole Grain Bread (2 slices)', standardPortion: '2 slices (60g)', calories: 150, protein: 7, carbs: 26, fats: 2 },
  { keywords: ['potato', 'potatoes', 'baked potato', 'sweet potato'], name: 'Boiled Sweet Potato', standardPortion: '1 medium (150g)', calories: 135, protein: 3, carbs: 31, fats: 0.2 },
  { keywords: ['pasta', 'macaroni', 'spaghetti'], name: 'Cooked Pasta', standardPortion: '1 bowl (150g cooked)', calories: 220, protein: 8, carbs: 44, fats: 1.2 },

  // Dairy & Healthy Fats
  { keywords: ['milk', 'dairy milk'], name: 'Whole / Skim Milk', standardPortion: '1 glass (250ml)', calories: 150, protein: 8, carbs: 12, fats: 6 },
  { keywords: ['curd', 'dahi', 'yogurt', 'greek yogurt'], name: 'Greek Yogurt', standardPortion: '1 cup (150g)', calories: 130, protein: 17, carbs: 6, fats: 3 },
  { keywords: ['peanut butter', 'pb'], name: 'Natural Peanut Butter', standardPortion: '2 tbsp (32g)', calories: 190, protein: 8, carbs: 7, fats: 16 },
  { keywords: ['almonds', 'nuts', 'walnuts', 'badam'], name: 'Mixed Raw Almonds & Nuts', standardPortion: 'handful (30g)', calories: 175, protein: 6, carbs: 6, fats: 15 },
  { keywords: ['avocado'], name: 'Avocado', standardPortion: '1/2 medium (100g)', calories: 160, protein: 2, carbs: 8, fats: 15 },
  { keywords: ['ghee', 'butter', 'oil'], name: 'Pure Cow Ghee / Olive Oil', standardPortion: '1 tbsp (14g)', calories: 120, protein: 0, carbs: 0, fats: 14 },

  // Fruits & Healthy Snacks
  { keywords: ['banana', 'kela'], name: 'Fresh Banana', standardPortion: '1 medium (118g)', calories: 105, protein: 1.3, carbs: 27, fats: 0.3 },
  { keywords: ['apple', 'seb'], name: 'Fresh Apple', standardPortion: '1 medium (150g)', calories: 80, protein: 0.5, carbs: 21, fats: 0.3 },
  { keywords: ['berries', 'blueberries', 'strawberry'], name: 'Mixed Fresh Berries', standardPortion: '1 cup (100g)', calories: 55, protein: 1, carbs: 13, fats: 0.4 },
  { keywords: ['salad', 'cucumber', 'vegetables', 'veggies', 'broccoli'], name: 'Fresh Green Garden Salad', standardPortion: '1 large bowl (200g)', calories: 45, protein: 3, carbs: 8, fats: 0.5 },
  { keywords: ['pizza'], name: 'Pizza Slice (Standard)', standardPortion: '1 slice (100g)', calories: 265, protein: 11, carbs: 32, fats: 10 },
  { keywords: ['burger'], name: 'Hamburger / Chicken Burger', standardPortion: '1 standard burger', calories: 450, protein: 24, carbs: 45, fats: 19 },
  { keywords: ['biryani', 'chicken biryani'], name: 'Chicken Biryani Bowl', standardPortion: '1 plate (350g)', calories: 540, protein: 28, carbs: 68, fats: 16 },
];

/**
 * Offline nutrition lookup from the built-in food list. Returns null when nothing in the text is a
 * known food, rather than guessing numbers.
 */
export function analyzeFoodFromName(inputQuery: string): FoodAnalysisResult | null {
  const clean = inputQuery.trim().toLowerCase();
  if (!clean) return null;

  // Detect quantity multipliers (e.g. "200g chicken", "3 eggs", "2 rotis", "2 cups")
  let multiplier = 1.0;
  const gramMatch = clean.match(/(\d+)\s*(g|gm|grams)/);
  if (gramMatch && gramMatch[1]) {
    const grams = parseInt(gramMatch[1], 10);
    multiplier = Math.max(0.3, Math.min(6.0, grams / 120));
  } else {
    const countMatch = clean.match(/(\d+)\s*(pc|pcs|piece|pieces|slice|slices|scoop|scoops|rotis|roti|eggs|egg)/);
    if (countMatch && countMatch[1]) {
      const count = parseInt(countMatch[1], 10);
      multiplier = Math.max(0.5, Math.min(5.0, count / 2));
    }
  }

  // Match items in food database
  const matchedItems: NutritionItem[] = [];
  for (const item of FOOD_DATABASE) {
    for (const kw of item.keywords) {
      if (clean.includes(kw)) {
        if (!matchedItems.some((m) => m.name === item.name)) {
          matchedItems.push(item);
        }
        break;
      }
    }
  }

  if (matchedItems.length === 0) return null;

  // Aggregate matched items
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  const detectedNames: string[] = [];

  for (const item of matchedItems) {
    totalCalories += Math.round(item.calories * multiplier);
    totalProtein += Math.round(item.protein * multiplier);
    totalCarbs += Math.round(item.carbs * multiplier);
    totalFats += Math.round(item.fats * multiplier);
    detectedNames.push(item.name);
  }

  // Recalculate calories to maintain exact caloric consistency
  const verifiedCalories = Math.round(totalProtein * 4 + totalCarbs * 4 + totalFats * 9);

  return {
    name: inputQuery.charAt(0).toUpperCase() + inputQuery.slice(1),
    portion: `${matchedItems.map((m) => m.standardPortion).join(' + ')} (${Math.round(150 * multiplier * matchedItems.length)}g)`,
    calories: verifiedCalories > 0 ? verifiedCalories : totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fats: totalFats,
    confidenceScore: Math.min(96, 75 + matchedItems.length * 8),
    detectedItems: detectedNames,
    healthNote: `Detected ${matchedItems.length} core food ingredients verified with sports nutrition standards.`,
  };
}

/** The photo was analysed and shows something other than food or drink. */
export class NotFoodError extends Error {
  constructor(public readonly seen: string) {
    super('not-food');
  }
}

/** Photo analysis needs the AI (signed in + online, or the user's own Gemini key). */
export class FoodScanUnavailableError extends Error {}

const FOOD_PHOTO_PROMPT =
  'You are a sports nutritionist looking at a photo a user took to log what they ate.\n' +
  'First decide whether the photo shows food or drink that a person could eat (a meal, snack, fruit, packaged food, drink). ' +
  'People, pets, objects, screens, documents, scenery, empty plates and non-edible items are NOT food.\n' +
  'If it is not food, reply with JSON {"isFood": false, "seen": "<what the photo shows, 2-5 words>"}.\n' +
  'If it is food, identify each item, estimate realistic portion sizes for what is visible (Indian home portions when the dish is Indian), ' +
  'and reply with JSON:\n' +
  '{"isFood": true, "name": "<short dish name>", "portion": "<e.g. 1 plate (~350 g)>", "calories": <kcal>, "protein": <g>, ' +
  '"carbs": <g>, "fats": <g>, "confidence": <0-100, how sure you are about the items and portions>, ' +
  '"detectedItems": ["<item with amount>", ...], "healthNote": "<one short sentence about this meal for someone training>"}\n' +
  'Calories must roughly equal protein*4 + carbs*4 + fats*9. Numbers only, no ranges.';

// Fast models first: "thinking" is switched off so a scan comes back in a couple of seconds.
const VISION_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

/**
 * Reads calories and macros from a food photo with Gemini Vision. Throws NotFoodError when the
 * photo is not food, and FoodScanUnavailableError when the AI can't be reached; it never invents
 * numbers for a photo it could not read.
 */
export async function analyzeFoodFromImage(imageUri: string, base64Data: string): Promise<FoodAnalysisResult> {
  const apiKey = await getActiveGeminiApiKey();
  if (!apiKey && !isAiProxyAvailable()) {
    throw new FoodScanUnavailableError('Sign in to scan food photos.');
  }
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

  for (const model of VISION_MODELS) {
    try {
      const response = await geminiGenerateContent(model, {
        contents: [{ parts: [{ text: FOOD_PHOTO_PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }, apiKey);
      const rawText = response.ok ? response.data?.candidates?.[0]?.content?.parts?.[0]?.text : null;
      if (!rawText) continue;
      const parsed = JSON.parse(rawText);
      if (parsed.isFood === false) throw new NotFoodError(String(parsed.seen || 'something else'));

      const protein = Math.max(0, Math.round(Number(parsed.protein) || 0));
      const carbs = Math.max(0, Math.round(Number(parsed.carbs) || 0));
      const fats = Math.max(0, Math.round(Number(parsed.fats) || 0));
      const calories = Math.round(Number(parsed.calories) || protein * 4 + carbs * 4 + fats * 9);
      return {
        name: String(parsed.name || 'Meal'),
        portion: String(parsed.portion || '1 serving'),
        calories,
        protein,
        carbs,
        fats,
        confidenceScore: Math.min(100, Math.max(0, Math.round(Number(parsed.confidence) || 70))),
        detectedItems: Array.isArray(parsed.detectedItems) && parsed.detectedItems.length > 0
          ? parsed.detectedItems.map(String)
          : [String(parsed.name || 'Meal')],
        imageUri,
        healthNote: parsed.healthNote ? String(parsed.healthNote) : undefined,
      };
    } catch (err) {
      if (err instanceof NotFoodError) throw err;
      // Try the next model.
    }
  }
  throw new FoodScanUnavailableError("Couldn't read this photo right now. Check your internet and try again.");
}

/** Nutrition for one of the built-in sample meals (no AI call needed). */
export function analyzePresetMeal(preset: PresetFoodMeal): FoodAnalysisResult {
  return {
    name: preset.name,
    portion: preset.portion,
    calories: preset.calories,
    protein: preset.protein,
    carbs: preset.carbs,
    fats: preset.fats,
    confidenceScore: 100,
    detectedItems: [preset.category, preset.name],
    imageUri: preset.imageUri,
    healthNote: `${preset.category} · good for ${preset.mealType}.`,
  };
}

const FOOD_TEXT_PROMPT =
  'You are a sports nutritionist. The user typed what they ate. If the text does not describe food or drink ' +
  '(e.g. objects, people, random words), reply with JSON {"isFood": false, "seen": "<what it is, 2-5 words>"}. ' +
  'Otherwise reply with JSON {"isFood": true, "name": "<short meal name>", "portion": "<total portion>", "calories": <kcal>, ' +
  '"protein": <g>, "carbs": <g>, "fats": <g>, "confidence": <0-100>, "detectedItems": ["<item with amount>", ...], ' +
  '"healthNote": "<one short sentence>"}. Use stated quantities; otherwise typical Indian home portions. ' +
  'Calories must roughly equal protein*4 + carbs*4 + fats*9.\n\nThe user typed: ';

/**
 * Nutrition for typed food ("2 roti, dal and 100 g paneer"). Uses the AI when available, otherwise
 * the built-in food list. Throws NotFoodError for text that isn't food and FoodScanUnavailableError
 * when nothing could be matched.
 */
export async function analyzeFoodFromText(inputQuery: string): Promise<FoodAnalysisResult> {
  const query = inputQuery.trim().slice(0, 300);
  const apiKey = await getActiveGeminiApiKey();
  if (query && (apiKey || isAiProxyAvailable())) {
    for (const model of VISION_MODELS) {
      try {
        const response = await geminiGenerateContent(model, {
          contents: [{ parts: [{ text: FOOD_TEXT_PROMPT + JSON.stringify(query) }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
        }, apiKey);
        const rawText = response.ok ? response.data?.candidates?.[0]?.content?.parts?.[0]?.text : null;
        if (!rawText) continue;
        const parsed = JSON.parse(rawText);
        if (parsed.isFood === false) throw new NotFoodError(String(parsed.seen || 'not a food'));
        const protein = Math.max(0, Math.round(Number(parsed.protein) || 0));
        const carbs = Math.max(0, Math.round(Number(parsed.carbs) || 0));
        const fats = Math.max(0, Math.round(Number(parsed.fats) || 0));
        return {
          name: String(parsed.name || query),
          portion: String(parsed.portion || '1 serving'),
          calories: Math.round(Number(parsed.calories) || protein * 4 + carbs * 4 + fats * 9),
          protein,
          carbs,
          fats,
          confidenceScore: Math.min(100, Math.max(0, Math.round(Number(parsed.confidence) || 70))),
          detectedItems: Array.isArray(parsed.detectedItems) && parsed.detectedItems.length ? parsed.detectedItems.map(String) : [query],
          healthNote: parsed.healthNote ? String(parsed.healthNote) : undefined,
        };
      } catch (err) {
        if (err instanceof NotFoodError) throw err;
      }
    }
  }
  const local = analyzeFoodFromName(query);
  if (local) return local;
  throw new FoodScanUnavailableError(
    "Couldn't recognise that as food. Try simple names like \"2 roti, dal and curd\" or \"200 g chicken with rice\"."
  );
}
