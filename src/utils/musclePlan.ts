import type { ActivityLevel, Difficulty, MuscleGroup, UserProfile, WeightGoal, WorkoutSplitDay } from '../types/fitness';

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

/** Daily calorie and macro targets for any goal: a surplus to gain, a ~450 kcal deficit to lose. */
export function dailyTargetsForGoal(profile: UserProfile, goal: WeightGoal = profile.fitnessGoal): DailyTargets {
  if (goal === 'weight_gain' || goal === 'muscle_gain') {
    const t = muscleGainTargets(profile);
    return { calories: t.calories, proteinG: t.proteinG, carbsG: t.carbsG, fatsG: t.fatsG, waterMl: t.waterMl };
  }
  const weight = profile.currentWeightKg || profile.startWeightKg || 70;
  const { maintenanceCalories } = muscleGainTargets(profile);
  const losing = goal === 'weight_loss';
  const calories = roundTo(Math.max(1200, maintenanceCalories - (losing ? 450 : 0)), 10);
  // More protein while dieting protects muscle.
  const proteinG = Math.round(weight * (losing ? 2.2 : 1.8));
  const fatsG = Math.round(weight * 0.8);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatsG * 9) / 4));
  return { calories, proteinG, carbsG, fatsG, waterMl: roundTo(weight * 40, 250) };
}

export type PlannedExercise = { id: string; prescription: string };
export type PlanDay = { title: string; muscles: MuscleGroup[]; exercises: PlannedExercise[] };

const heavy = (id: string): PlannedExercise => ({ id, prescription: '4 × 6–8' });
const medium = (id: string): PlannedExercise => ({ id, prescription: '3 × 8–12' });
const light = (id: string): PlannedExercise => ({ id, prescription: '3 × 12–15' });
const plank: PlannedExercise = { id: 'abs_plank_hold', prescription: '3 × 45 s' };

const FULL_A: PlanDay = {
  title: 'Full Body A',
  muscles: ['legs', 'chest', 'back', 'arms'],
  exercises: [
    heavy('legs_barbell_squat'),
    heavy('chest_barbell_bench_press'),
    medium('back_lat_pulldown'),
    light('shoulders_dumbbell_lateral_raise'),
    medium('arms_barbell_curl'),
    plank,
  ],
};
const FULL_B: PlanDay = {
  title: 'Full Body B',
  muscles: ['legs', 'chest', 'back', 'shoulders'],
  exercises: [
    heavy('legs_romanian_deadlift'),
    medium('chest_incline_dumbbell_press'),
    heavy('back_bent_over_row'),
    medium('shoulders_arnold_press'),
    medium('arms_cable_tricep_pushdown'),
    light('abs_hanging_leg_raise'),
  ],
};
const UPPER_A: PlanDay = {
  title: 'Upper Body (Strength)',
  muscles: ['chest', 'back', 'shoulders', 'arms'],
  exercises: [
    heavy('chest_barbell_bench_press'),
    heavy('back_bent_over_row'),
    heavy('shoulders_barbell_overhead_press'),
    medium('back_lat_pulldown'),
    medium('arms_barbell_curl'),
    medium('arms_cable_tricep_pushdown'),
  ],
};
const LOWER_A: PlanDay = {
  title: 'Lower Body (Strength)',
  muscles: ['legs', 'abs'],
  exercises: [
    heavy('legs_barbell_squat'),
    medium('legs_romanian_deadlift'),
    light('legs_leg_extension'),
    light('legs_standing_calf_raise'),
    light('abs_hanging_leg_raise'),
  ],
};
const UPPER_B: PlanDay = {
  title: 'Upper Body (Size)',
  muscles: ['chest', 'back', 'shoulders', 'arms'],
  exercises: [
    medium('chest_incline_dumbbell_press'),
    medium('back_lat_pulldown'),
    medium('shoulders_arnold_press'),
    light('chest_cable_crossover_fly'),
    light('shoulders_dumbbell_lateral_raise'),
    medium('arms_dumbbell_hammer_curl'),
    medium('arms_overhead_tricep_extension'),
  ],
};
const LOWER_B: PlanDay = {
  title: 'Lower Body (Size)',
  muscles: ['legs', 'back', 'abs'],
  exercises: [
    heavy('back_barbell_deadlift'),
    medium('legs_barbell_squat'),
    light('legs_leg_extension'),
    light('legs_standing_calf_raise'),
    medium('abs_cable_woodchopper'),
  ],
};
const PUSH: PlanDay = {
  title: 'Push (Chest, Shoulders, Triceps)',
  muscles: ['chest', 'shoulders', 'arms'],
  exercises: [
    heavy('chest_barbell_bench_press'),
    heavy('shoulders_barbell_overhead_press'),
    medium('chest_incline_dumbbell_press'),
    light('shoulders_dumbbell_lateral_raise'),
    light('chest_cable_crossover_fly'),
    medium('arms_skullcrushers'),
    light('arms_cable_tricep_pushdown'),
  ],
};
const PULL: PlanDay = {
  title: 'Pull (Back, Biceps)',
  muscles: ['back', 'arms', 'shoulders'],
  exercises: [
    heavy('back_barbell_deadlift'),
    medium('back_lat_pulldown'),
    medium('back_bent_over_row'),
    light('shoulders_face_pulls'),
    medium('arms_barbell_curl'),
    medium('arms_incline_dumbbell_curl'),
    light('arms_dumbbell_hammer_curl'),
  ],
};
const LEGS: PlanDay = {
  title: 'Legs & Core',
  muscles: ['legs', 'abs'],
  exercises: [
    heavy('legs_barbell_squat'),
    medium('legs_romanian_deadlift'),
    light('legs_leg_extension'),
    light('legs_standing_calf_raise'),
    light('abs_hanging_leg_raise'),
    plank,
  ],
};

/** Index 0 = Sunday, matching WorkoutSplitDay.dayIndex. null = rest day. */
export function muscleGainWeek(experience: Difficulty): { name: string; perWeek: number; days: (PlanDay | null)[] } {
  if (experience === 'beginner') {
    return { name: 'Full Body · 3 days', perWeek: 3, days: [null, FULL_A, null, FULL_B, null, FULL_A, null] };
  }
  if (experience === 'advanced') {
    return { name: 'Push / Pull / Legs · 6 days', perWeek: 6, days: [null, PUSH, PULL, LEGS, PUSH, PULL, LEGS] };
  }
  return { name: 'Upper / Lower · 4 days', perWeek: 4, days: [null, UPPER_A, LOWER_A, null, UPPER_B, LOWER_B, null] };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function muscleGainSplit(experience: Difficulty): WorkoutSplitDay[] {
  return muscleGainWeek(experience).days.map((day, dayIndex) => ({
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    splitTitle: day ? day.title : 'Rest & Recovery',
    targetMuscles: day ? day.muscles : [],
    isRestDay: !day,
    exerciseIds: day ? day.exercises.map(e => e.id) : [],
  }));
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
