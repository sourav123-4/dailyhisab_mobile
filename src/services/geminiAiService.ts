import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIChatMessage, UserProfile } from '../types/fitness';
import { ACTIVE_ENV } from '../config/active-env';
import { geminiGenerateContent, isAiProxyAvailable } from './aiProxy';

const GEMINI_KEY_STORAGE = '@titan_gemini_api_key';

export interface FoodNutritionAnalysis {
  foodNames: string[];
  estimatedCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  confidenceNotes: string;
}

/**
 * A Gemini key the user saved on this device. The app's own key never ships in the
 * client; without a personal key, requests go through the server-side AI proxy.
 */
export async function getActiveGeminiApiKey(): Promise<string> {
  try {
    const customKey = await AsyncStorage.getItem(GEMINI_KEY_STORAGE);
    if (customKey && customKey.trim().length > 5) {
      return customKey.trim();
    }
  } catch (e) {
    console.warn('Error reading stored Gemini key:', e);
  }

  return '';
}

/** True when Gemini can be reached with a personal key or through the signed-in proxy. */
export async function isGeminiConfigured(): Promise<boolean> {
  return Boolean(await getActiveGeminiApiKey()) || isAiProxyAvailable();
}

/**
 * Save user custom Gemini API key into local device storage
 */
export async function saveGeminiApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

/**
 * Remove stored Gemini API key
 */
export async function clearGeminiApiKey(): Promise<void> {
  await AsyncStorage.removeItem(GEMINI_KEY_STORAGE);
}

/**
 * Generate intelligent, science-backed fitness advice using Google Gemini API
 */
export async function generateFitnessAdviceWithGemini(
  prompt: string,
  profile: UserProfile,
  chatHistory: AIChatMessage[] = []
): Promise<string> {
  const apiKey = await getActiveGeminiApiKey();
  const model = (ACTIVE_ENV.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  // Without a personal key or a signed-in proxy session, answer from the built-in coaching engine
  if (!apiKey && !isAiProxyAvailable()) {
    return generateSmartOfflineCoaching(prompt, profile);
  }

  const systemInstructions = `You are TitanAI, an elite AI strength & conditioning coach, biomechanics specialist, and sports nutritionist for athlete ${profile.name || 'Athlete'}. Never mention Google, Gemini, or any underlying third-party models; always refer to yourself exclusively as TitanAI or TitanFit AI Coach.
Athlete Profile:
- Goal: ${profile.fitnessGoal} (${profile.fitnessGoal === 'weight_loss' ? 'Fat Loss / Cutting' : profile.fitnessGoal === 'muscle_gain' ? 'Hypertrophy / Lean Bulk' : 'Strength & Athletic Performance'})
- Current Bodyweight: ${profile.currentWeightKg} kg (Target: ${profile.targetWeightKg} kg, Height: ${profile.heightCm} cm, Age: ${profile.age})
- Daily Calorie Target: ${profile.targetCalories} kcal (Protein: ${profile.targetProteinGrams}g, Carbs: ${profile.targetCarbsGrams}g, Fats: ${profile.targetFatsGrams}g)
- Experience Level: ${profile.experience}
- Daily Water Target: ${profile.dailyWaterTargetMl} ml (Logged today: ${profile.todayWaterMl} ml)

Coaching Guidelines:
1. Provide comprehensive, expert-level sports science and hypertrophy coaching as TitanAI.
2. For workout splits/routines: specify exact exercises, sets, reps, rest intervals (e.g. 90-120s), and RPE targets.
3. For anatomy/biomechanics: explain muscle heads (e.g. clavicular vs sternal pectorals, long head vs short head biceps, lateral vs medial deltoids) and proper lifting form cues.
4. For nutrition: provide precise calorie & macro breakdowns, high-protein meal examples, and pre/post workout fueling advice.
5. Format clearly with markdown headings, bullet points, and motivational cues.`;

  // Build Gemini contents array with conversation history
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Add recent conversation turns
  const recentHistory = chatHistory.slice(-4);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  }

  // Add current query with system context
  const fullPrompt = contents.length === 0
    ? `${systemInstructions}\n\nAthlete Question:\n${prompt}`
    : `Context:\n${systemInstructions}\n\nQuestion:\n${prompt}`;

  contents.push({
    role: 'user',
    parts: [{ text: fullPrompt }],
  });

  const tryModelList = [model, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

  for (const curModel of tryModelList) {
    try {
      const response = await geminiGenerateContent(curModel, {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 900,
        },
      }, apiKey);

      if (!response.ok) {
        console.warn(`Gemini API error with ${curModel} (${response.status})`);

        if (response.status === 429) {
          return `⚡ AI engine rate limit reached temporarily. Progressive Overload Tip for ${profile.name}: Prioritize ${profile.targetProteinGrams}g daily protein and maintain 1-2 RIR (reps in reserve) across your main compound lifts!`;
        }

        if (response.status === 404) {
          // Try next model in list
          continue;
        }

        if (response.status === 0 || response.status === 400 || response.status === 401 || response.status === 403) {
          return generateSmartOfflineCoaching(prompt, profile);
        }

        continue;
      }

      const data = response.data;
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (candidateText && candidateText.trim().length > 0) {
        return candidateText.trim();
      }
    } catch (error: any) {
      console.warn(`AI engine fetch error with ${curModel}:`, error);
    }
  }

  return generateSmartOfflineCoaching(prompt, profile);
}

/**
 * Intelligent scientific fallback responses when offline or waiting for API key
 */
function generateSmartOfflineCoaching(prompt: string, profile: UserProfile): string {
  const q = prompt.toLowerCase();

  if (q.includes('protein') || q.includes('macro') || q.includes('calorie') || q.includes('diet')) {
    return `🥗 **Nutrition Protocol for ${profile.name} (${profile.fitnessGoal.replace('_', ' ').toUpperCase()})**:
• **Target Calories**: ${profile.targetCalories} kcal/day
• **Daily Protein**: ${profile.targetProteinGrams}g (~2.2g per kg bodyweight)
• **Carbohydrates**: ${profile.targetCarbsGrams}g for glycogen replenishment
• **Healthy Fats**: ${profile.targetFatsGrams}g for hormonal optimization
• **Hydration**: ${profile.dailyWaterTargetMl} ml water daily (you logged ${profile.todayWaterMl} ml today).

💡 *Tip: Activate your AI Engine Key in Coach Settings to unlock unlimited real-time vision & conversational analysis!*`;
  }

  if (q.includes('split') || q.includes('routine') || q.includes('workout') || q.includes('exercise')) {
    return `🏋️‍♂️ **Hypertrophy Blueprint (${profile.experience.toUpperCase()} Level)**:
• **Push Day**: Barbell Bench Press (4x8), Incline Dumbbell Press (3x10), Overhead Dumbbell Extension (3x12), Lateral Raises (4x15)
• **Pull Day**: Deadlifts or Barbell Rows (4x6-8), Lat Pulldown (3x10), Dumbbell Hammer Curls (4x12)
• **Leg Day**: Barbell Squats (4x8), Romanian Deadlifts (3x10), Standing Calf Raises (4x15)
• **Key Principle**: Apply Progressive Overload — add 1 rep or 1 kg every week!`;
  }

  if (q.includes('bicep') || q.includes('arm') || q.includes('tricep')) {
    return `💪 **3D Arm Hypertrophy Formula**:
• **Long Head Biceps**: Incline Dumbbell Curls (elbows slightly behind torso for full pre-stretch).
• **Brachialis (Arm Width)**: Dumbbell Hammer Curls with neutral grip.
• **Triceps Horseshoe**: Overhead Extensions (long head) + Cable Pushdowns (lateral head lockout).
• Keep a controlled 3-second eccentric (lowering) phase for maximum micro-tears and growth!`;
  }

  return `🤖 **TitanAI Coach**:
• Focus on consistency: 3-5 structured training sessions per week.
• Train each muscle group 2x weekly with 10-20 hard working sets per week near failure (RPE 8-9).
• Track every workout in your Active Workout logger and watch the 3D exercise video demos for flawless form!

💡 *Tip: Add your AI engine key in Settings to activate real-time custom answers and photo meal recognition.*`;
}

/**
 * Identify foods and estimate nutrition from photo or text description using Gemini
 * (Inspired by VitalPath foodDiscovery architecture)
 */
export async function analyzeFoodWithGemini(
  input: { textDescription?: string; base64Jpeg?: string }
): Promise<FoodNutritionAnalysis> {
  const apiKey = await getActiveGeminiApiKey();
  const model = (ACTIVE_ENV.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  // Send to Gemini (personal key or signed-in proxy); otherwise use heuristics below
  if (apiKey || isAiProxyAvailable()) {
    try {
      const parts: any[] = [
        {
          text: `You are an expert sports nutritionist. Analyze the following meal input and output ONLY a valid JSON object matching this schema:
{
  "foodNames": ["Item 1", "Item 2"],
  "estimatedCalories": number,
  "proteinGrams": number,
  "carbsGrams": number,
  "fatGrams": number,
  "confidenceNotes": "short 1-sentence note"
}
Ensure reasonable real-world macronutrient estimates. Do not include markdown ticks or additional commentary, only valid JSON.`,
        },
      ];

      if (input.textDescription) {
        parts.push({ text: `Meal Description: ${input.textDescription}` });
      }

      if (input.base64Jpeg) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: input.base64Jpeg,
          },
        });
      }

      const res = await geminiGenerateContent(model, {
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }, apiKey);

      if (res.ok) {
        const json = res.data;
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            foodNames: parsed.foodNames || ['Analyzed Meal'],
            estimatedCalories: Number(parsed.estimatedCalories) || 450,
            proteinGrams: Number(parsed.proteinGrams) || 30,
            carbsGrams: Number(parsed.carbsGrams) || 50,
            fatGrams: Number(parsed.fatGrams) || 15,
            confidenceNotes: parsed.confidenceNotes || 'Analyzed via TitanAI Vision',
          };
        }
      }
    } catch (e) {
      console.warn('Gemini food analysis error, falling back to heuristics:', e);
    }
  }

  // Heuristic analysis fallback
  const text = (input.textDescription || '').toLowerCase();
  let cals = 480;
  let p = 28;
  let c = 55;
  let f = 16;
  const items: string[] = [];

  if (text.includes('egg')) {
    items.push('Whole Eggs');
    cals += 150;
    p += 14;
    f += 10;
  }
  if (text.includes('chicken') || text.includes('breast')) {
    items.push('Grilled Chicken Breast');
    cals += 220;
    p += 32;
    f += 5;
  }
  if (text.includes('rice')) {
    items.push('Steamed Rice');
    cals += 200;
    c += 45;
  }
  if (text.includes('roti') || text.includes('chapati')) {
    items.push('Whole Wheat Roti');
    cals += 160;
    c += 32;
    p += 6;
  }
  if (text.includes('dal') || text.includes('lentil')) {
    items.push('Yellow Dal / Lentils');
    cals += 180;
    p += 12;
    c += 28;
  }
  if (text.includes('paneer')) {
    items.push('Cottage Cheese / Paneer');
    cals += 260;
    p += 18;
    f += 20;
  }

  if (items.length === 0) {
    items.push(input.textDescription || 'Balanced Athlete Meal');
  }

  return {
    foodNames: items,
    estimatedCalories: cals,
    proteinGrams: p,
    carbsGrams: c,
    fatGrams: f,
    confidenceNotes: 'Standard sports nutrition reference estimate (USDA guidelines)',
  };
}
