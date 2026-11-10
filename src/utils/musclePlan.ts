import type { ActivityLevel, Difficulty, UserProfile, WeightGoal } from '../types/fitness';

/**
 * Lean-bulk plan from the user's profile, using standard sports-nutrition rules:
 * Mifflin-St Jeor BMR x activity factor, a modest surplus, protein ~2 g/kg, fat ~0.9 g/kg,
 * carbs for the rest. Aims for 0.25-0.5% of body weight gained per week.
 */

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

// Newer lifters can build muscle faster, so they get a slightly bigger surplus.
const SURPLUS_KCAL: Record<Difficulty, number> = { beginner: 400, intermediate: 300, advanced: 200 };

export type MuscleGainTargets = {
  maintenanceCalories: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  waterMl: number;
  weeklyGainKg: number;
  weeksToTarget: number | null;
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function muscleGainTargets(profile: UserProfile): MuscleGainTargets {
  const weight = profile.currentWeightKg || profile.startWeightKg || 70;
  const height = profile.heightCm || 170;
  const age = profile.age || 25;
  const sexOffset = profile.gender === 'female' ? -161 : profile.gender === 'male' ? 5 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const maintenance = bmr * (ACTIVITY_FACTOR[profile.activityLevel] ?? 1.55);
  const calories = roundTo(maintenance + (SURPLUS_KCAL[profile.experience] ?? 300), 10);

  const proteinG = Math.round(weight * 2);
  const fatsG = Math.round(weight * 0.9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatsG * 9) / 4));

  const weeklyGainKg = Math.round(weight * (profile.experience === 'beginner' ? 0.005 : 0.0035) * 100) / 100;
  const toGain = (profile.targetWeightKg || 0) - weight;
  return {
    maintenanceCalories: roundTo(maintenance, 10),
    calories,
    proteinG,
    carbsG,
    fatsG,
    waterMl: roundTo(weight * 40, 250),
    weeklyGainKg,
    weeksToTarget: toGain > 0 && weeklyGainKg > 0 ? Math.ceil(toGain / weeklyGainKg) : null,
  };
}

export type DailyTargets = { calories: number; proteinG: number; carbsG: number; fatsG: number; waterMl: number };

/** Daily calorie and macro targets for any goal: a surplus to bulk, maintenance to recomp or maintain, a ~450 kcal deficit to lose. */
export function dailyTargetsForGoal(profile: UserProfile, goal: WeightGoal = profile.fitnessGoal): DailyTargets {
  if (goal === 'weight_gain') {
    const t = muscleGainTargets(profile);
    return { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatsG: t.fatsG, waterMl: t.waterMl };
  }
  const weight = profile.currentWeightKg || profile.startWeightKg || 70;
  const { maintenanceCalories } = muscleGainTargets(profile);
  const losing = goal === 'weight_loss';
  // Recomp (muscle_gain) eats at maintenance with high protein: build muscle, hold body weight.
  const recomp = goal === 'muscle_gain';
  const calories = roundTo(Math.max(1200, maintenanceCalories - (losing ? 450 : 0)), 10);
  // More protein while dieting or recomping protects and builds muscle.
  const proteinG = Math.round(weight * (losing || recomp ? 2.2 : 1.8));
  const fatsG = Math.round(weight * 0.8);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatsG * 9) / 4));
  return { calories, proteinG, carbsG, fatsG, waterMl: roundTo(weight * 40, 250) };
}

export type PlanMeal = { time: string; title: string; items: string[]; calories: number; protein: number };

/**
 * A sample Indian day of eating scaled to the calorie target. Base portions add up to roughly
 * 2,700 kcal / 150 g protein; the scale factor adjusts the amounts.
 */
export function muscleGainMeals(calorieTarget: number, vegetarian: boolean): PlanMeal[] {
  const scale = calorieTarget / 2700;
  const q = (n: number) => Math.max(1, Math.round(n * scale));
  const g = (n: number) => Math.max(10, Math.round((n * scale) / 10) * 10);
  const meals: PlanMeal[] = vegetarian
    ? [
        { time: '8:00 AM', title: 'Breakfast', items: [`${g(80)} g oats cooked in ${g(300)} ml milk`, '1 banana', `${q(15)} almonds`], calories: 620, protein: 25 },
        { time: '11:00 AM', title: 'Mid-morning', items: [`${g(200)} g curd / Greek yogurt`, '1 fruit', `${q(1)} tbsp peanut butter on toast`], calories: 380, protein: 20 },
        { time: '1:30 PM', title: 'Lunch', items: [`${q(3)} roti or ${g(200)} g rice`, `${g(150)} g dal / rajma`, `${g(100)} g paneer sabzi`, 'Salad'], calories: 750, protein: 38 },
        { time: '5:00 PM', title: 'Pre-workout', items: [`${g(50)} g soya chunks or ${g(100)} g sprouts chaat`, '1 banana', 'Black coffee (optional)'], calories: 330, protein: 30 },
        { time: '9:00 PM', title: 'Dinner', items: [`${q(3)} roti`, `${g(150)} g tofu or paneer bhurji`, `${g(150)} g mixed veg`, `${g(200)} ml milk before bed`], calories: 640, protein: 34 },
      ]
    : [
        { time: '8:00 AM', title: 'Breakfast', items: [`${q(4)} eggs (2 whole + whites)`, `${q(2)} slices whole-wheat toast`, `${g(250)} ml milk`, '1 banana'], calories: 620, protein: 38 },
        { time: '11:00 AM', title: 'Mid-morning', items: [`${g(200)} g curd`, `${q(15)} almonds`, '1 fruit'], calories: 360, protein: 16 },
        { time: '1:30 PM', title: 'Lunch', items: [`${g(200)} g rice or ${q(3)} roti`, `${g(150)} g chicken curry`, `${g(150)} g dal`, 'Salad'], calories: 760, protein: 48 },
        { time: '5:00 PM', title: 'Pre-workout', items: [`${q(2)} slices bread with ${q(1)} tbsp peanut butter`, '1 banana', 'Black coffee (optional)'], calories: 350, protein: 12 },
        { time: '9:00 PM', title: 'Dinner', items: [`${g(150)} g fish or chicken`, `${q(3)} roti or ${g(150)} g rice`, `${g(150)} g mixed veg`, `${g(200)} ml milk before bed`], calories: 650, protein: 45 },
      ];
  return meals.map(m => ({ ...m, calories: Math.round(m.calories * scale), protein: Math.round(m.protein * scale) }));
}

export const MUSCLE_GAIN_RULES: string[] = [
  'Add a rep or a little weight each week (progressive overload); this is what makes muscle grow.',
  'Stop each set 1–2 reps before failure, and rest 2–3 min on heavy lifts, 60–90 s on the rest.',
  'Hit your protein every day, spread over 4–5 meals of 25–40 g.',
  'Sleep 7–9 hours; most muscle repair happens during sleep.',
  'Weigh yourself in the morning 3×/week. Gaining faster than the target? Cut about 150 kcal. Not gaining for 2 weeks? Add about 150 kcal.',
  'Every 6–8 weeks, take an easier week (half the sets) to recover.',
];
