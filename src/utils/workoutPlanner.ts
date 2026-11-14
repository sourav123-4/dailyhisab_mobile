import type { Difficulty, Exercise, GearId, MuscleGroup, TrainingLocation, WeightGoal, WorkoutSplitDay } from '../types/fitness';
import { EXERCISES_DATABASE } from '../data/exercisesData';

/**
 * Builds a full weekly workout plan from what the person actually has: bodyweight at home,
 * a few pieces of equipment, or a whole gym. Each training slot ("horizontal press", "hinge"…)
 * lists exercises best-first; the first one the person's equipment allows is used.
 */

export const GEAR_OPTIONS: { id: GearId; label: string; emoji: string; hint: string }[] = [
  { id: 'dumbbells', label: 'Dumbbells', emoji: '🏋️', hint: 'Any pair, fixed or adjustable' },
  { id: 'kettlebell', label: 'Kettlebell', emoji: '🔔', hint: 'Works for swings, squats, rows' },
  { id: 'bench', label: 'Bench', emoji: '🛋️', hint: 'Flat or incline workout bench' },
  { id: 'pullup_bar', label: 'Pull-up bar', emoji: '🚪', hint: 'Doorway or wall-mounted bar' },
  { id: 'dip_station', label: 'Dip bars', emoji: '🤸', hint: 'Parallel bars or dip station' },
  { id: 'barbell', label: 'Barbell & plates', emoji: '🏗️', hint: 'Olympic or standard bar' },
  { id: 'cable', label: 'Cable machine', emoji: '🎛️', hint: 'Pulley tower with attachments' },
  { id: 'machines', label: 'Gym machines', emoji: '⚙️', hint: 'Calf raise, back extension…' },
];

export const ALL_GEAR: GearId[] = GEAR_OPTIONS.map(g => g.id);

export const LOCATION_DEFAULT_GEAR: Record<TrainingLocation, GearId[]> = {
  gym: ALL_GEAR,
  home: [],
  other: [],
};

/** Alternatives: the exercise is possible if every item of any one list is available. [] = no equipment. */
const NEEDS: Record<string, GearId[][]> = {
  chest_barbell_bench_press: [['barbell', 'bench']],
  chest_incline_dumbbell_press: [['dumbbells', 'bench']],
  chest_cable_crossover_fly: [['dip_station']],
  shoulders_barbell_overhead_press: [['dumbbells']],
  shoulders_arnold_press: [['dumbbells']],
  shoulders_dumbbell_lateral_raise: [['dumbbells']],
  shoulders_face_pulls: [['dumbbells']],
  shoulders_front_raise: [['dumbbells'], ['kettlebell']],
  back_lat_pulldown: [['pullup_bar']],
  arms_barbell_curl: [['pullup_bar']],
  abs_hanging_leg_raise: [['pullup_bar']],
  back_bent_over_row: [['dumbbells'], ['kettlebell']],
  back_barbell_deadlift: [['dumbbells']],
  back_hyperextension: [['machines']],
  arms_dumbbell_hammer_curl: [['dumbbells'], ['kettlebell']],
  arms_skullcrushers: [['dumbbells']],
  arms_cable_tricep_pushdown: [['dip_station']],
  arms_cable_hammer_curl: [['cable']],
  abs_dumbbell_side_bend: [['dumbbells'], ['kettlebell']],
  legs_barbell_squat: [['dumbbells'], ['kettlebell']],
  legs_romanian_deadlift: [['dumbbells'], ['kettlebell']],
  legs_standing_calf_raise: [['dumbbells']],
  legs_barbell_calf_raise: [['barbell']],
  legs_lever_seated_calf_raise: [['machines']],
  fullbody_dumbbell_clean_press: [['dumbbells']],
};

export function canDoExercise(id: string, gear: GearId[]): boolean {
  const options = NEEDS[id];
  if (!options) {
    const ex = EXERCISES_DATABASE.find(e => e.id === id);
    return !!ex && ex.equipment === 'bodyweight';
  }
  return options.some(needs => needs.every(n => gear.includes(n)));
}

type Role =
  | 'chest_press' | 'chest_second' | 'shoulder_press' | 'shoulder_side' | 'rear_delt'
  | 'vertical_pull' | 'row' | 'biceps' | 'biceps2' | 'triceps' | 'triceps2'
  | 'quads' | 'hinge' | 'glutes' | 'single_leg' | 'calves' | 'core' | 'plank' | 'finisher';

const CANDIDATES: Record<Role, string[]> = {
  chest_press: ['chest_barbell_bench_press', 'chest_incline_dumbbell_press', 'chest_push_up', 'chest_incline_push_up'],
  chest_second: ['chest_incline_dumbbell_press', 'chest_cable_crossover_fly', 'chest_decline_push_up', 'chest_push_up', 'chest_incline_push_up'],
  shoulder_press: ['shoulders_barbell_overhead_press', 'shoulders_arnold_press', 'shoulders_pike_push_up'],
  shoulder_side: ['shoulders_dumbbell_lateral_raise', 'shoulders_front_raise', 'shoulders_pike_push_up'],
  rear_delt: ['shoulders_face_pulls', 'back_superman_row'],
  vertical_pull: ['back_lat_pulldown', 'arms_barbell_curl', 'back_chair_inverted_row'],
  row: ['back_bent_over_row', 'back_chair_inverted_row', 'back_superman_row'],
  biceps: ['arms_dumbbell_hammer_curl', 'arms_cable_hammer_curl', 'arms_barbell_curl', 'arms_incline_dumbbell_curl'],
  biceps2: ['arms_cable_hammer_curl', 'arms_incline_dumbbell_curl', 'arms_dumbbell_hammer_curl'],
  triceps: ['arms_skullcrushers', 'arms_cable_tricep_pushdown', 'arms_chair_dip', 'arms_overhead_tricep_extension'],
  triceps2: ['arms_overhead_tricep_extension', 'arms_cable_tricep_pushdown', 'arms_chair_dip'],
  quads: ['legs_barbell_squat', 'legs_bodyweight_squat'],
  hinge: ['legs_romanian_deadlift', 'back_barbell_deadlift', 'legs_single_leg_deadlift', 'legs_hip_thrust'],
  glutes: ['legs_hip_thrust', 'back_hyperextension', 'legs_single_leg_deadlift'],
  single_leg: ['legs_leg_extension', 'legs_reverse_lunge', 'legs_step_up'],
  calves: ['legs_lever_seated_calf_raise', 'legs_barbell_calf_raise', 'legs_standing_calf_raise', 'legs_bodyweight_calf_raise'],
  core: ['abs_hanging_leg_raise', 'abs_cable_woodchopper', 'abs_straight_arm_crunch', 'abs_dumbbell_side_bend'],
  plank: ['abs_plank_hold'],
  finisher: ['fullbody_dumbbell_clean_press', 'fullbody_burpee'],
};

const EASY = new Set(['chest_incline_push_up']);
const isLoaded = (id: string) => EXERCISES_DATABASE.find(e => e.id === id)?.equipment !== 'bodyweight';
const difficultyOf = (id: string) => EXERCISES_DATABASE.find(e => e.id === id)?.difficulty;

const COMPOUND_ROLES: Role[] = ['chest_press', 'chest_second', 'shoulder_press', 'vertical_pull', 'row', 'quads', 'hinge', 'single_leg'];
const ONE_SIDE = new Set(['legs_leg_extension', 'legs_reverse_lunge', 'legs_step_up', 'legs_single_leg_deadlift', 'back_bent_over_row', 'abs_dumbbell_side_bend']);

type Template = { title: string; altTitle: string; muscles: MuscleGroup[]; roles: Role[] };

const T: Record<string, Template> = {
  fullA: { title: 'Full Body A', altTitle: 'Full Body C', muscles: ['legs', 'chest', 'back', 'shoulders'], roles: ['quads', 'chest_press', 'vertical_pull', 'hinge', 'shoulder_press', 'core'] },
  fullB: { title: 'Full Body B', altTitle: 'Full Body D', muscles: ['legs', 'back', 'chest', 'arms'], roles: ['single_leg', 'row', 'chest_second', 'glutes', 'shoulder_side', 'biceps', 'triceps', 'plank'] },
  upper: { title: 'Upper Body', altTitle: 'Upper Body B', muscles: ['chest', 'back', 'shoulders', 'arms'], roles: ['chest_press', 'row', 'shoulder_press', 'vertical_pull', 'chest_second', 'biceps', 'triceps'] },
  lower: { title: 'Lower Body & Core', altTitle: 'Lower Body & Core B', muscles: ['legs', 'abs'], roles: ['quads', 'hinge', 'single_leg', 'glutes', 'calves', 'core'] },
  push: { title: 'Push (Chest, Shoulders, Triceps)', altTitle: 'Push B (Chest, Shoulders, Triceps)', muscles: ['chest', 'shoulders', 'arms'], roles: ['chest_press', 'shoulder_press', 'chest_second', 'shoulder_side', 'triceps', 'triceps2'] },
  pull: { title: 'Pull (Back, Biceps)', altTitle: 'Pull B (Back, Biceps)', muscles: ['back', 'arms', 'shoulders'], roles: ['vertical_pull', 'row', 'rear_delt', 'biceps', 'biceps2', 'core'] },
  legs: { title: 'Legs & Core', altTitle: 'Legs & Core B', muscles: ['legs', 'abs'], roles: ['quads', 'hinge', 'single_leg', 'glutes', 'calves', 'plank'] },
};

/** Index 0 = Sunday. Each entry is [template, variant]; variant 1 picks different exercises where it can. */
const WEEKS: Record<number, ([string, number] | null)[]> = {
  2: [null, ['fullA', 0], null, null, ['fullB', 0], null, null],
  3: [null, ['fullA', 0], null, ['fullB', 0], null, ['fullA', 1], null],
  4: [null, ['upper', 0], ['lower', 0], null, ['upper', 1], ['lower', 1], null],
  5: [null, ['push', 0], ['pull', 0], ['legs', 0], ['upper', 1], ['lower', 1], null],
  6: [null, ['push', 0], ['pull', 0], ['legs', 0], ['push', 1], ['pull', 1], ['legs', 1]],
};

export const SPLIT_NAMES: Record<number, string> = {
  2: 'Full Body · 2 days',
  3: 'Full Body · 3 days',
  4: 'Upper / Lower · 4 days',
  5: 'Push / Pull / Legs + Upper / Lower · 5 days',
  6: 'Push / Pull / Legs · 6 days',
};

export function recommendedDays(experience: Difficulty): number {
  return experience === 'beginner' ? 3 : experience === 'advanced' ? 5 : 4;
}

function prescriptionFor(ex: Exercise, role: Role, goal: WeightGoal, experience: Difficulty): string {
  const side = ONE_SIDE.has(ex.id) ? ' each side' : '';
  if (role === 'plank' || ex.id === 'abs_plank_hold') return goal === 'weight_loss' ? '3 × 45–60 s' : '3 × 30–60 s';
  if (role === 'core') return `3 × 12–20${side}`;
  if (role === 'finisher') return goal === 'weight_loss' ? '4 rounds × 10 (30 s rest)' : '3 rounds × 8';
  const compound = COMPOUND_ROLES.includes(role);
  const loaded = ex.equipment !== 'bodyweight';
  const sets = experience === 'beginner' ? 3 : 4;
  if (goal === 'weight_loss') {
    if (compound) return loaded ? `3 × 10–12${side}` : `3 × 12–20${side}`;
    return `3 × 12–15${side}`;
  }
  if (goal === 'maintenance') {
    if (compound) return loaded ? `3 × 5–8${side}` : `3 × 10–15${side}`;
    return `3 × 10–12${side}`;
  }
  // Muscle gain (bulk or recomp).
  if (compound) return loaded ? `${sets} × 6–10${side}` : `${sets} × 8–15${side} (near failure)`;
  return `3 × 10–15${side}`;
}

export type PlannedExercise = { id: string; name: string; prescription: string; muscleGroup: MuscleGroup };
export type PlannedDay = { title: string; muscles: MuscleGroup[]; exercises: PlannedExercise[] };
export type WeeklyPlan = { name: string; days: (PlannedDay | null)[]; notes: string[] };

function buildDay(template: Template, variant: number, gear: GearId[], goal: WeightGoal, experience: Difficulty): PlannedDay {
  const used = new Set<string>();
  const exercises: PlannedExercise[] = [];
  const roles: Role[] = goal === 'weight_loss' ? [...template.roles, 'finisher'] : template.roles;
  roles.forEach(role => {
    let options = CANDIDATES[role].filter(id => !used.has(id) && canDoExercise(id, gear));
    // Beginner-only regressions are skipped for experienced lifters when there is anything else.
    if (experience !== 'beginner' && options.some(id => !EASY.has(id))) options = options.filter(id => !EASY.has(id));
    // Beginners get beginner-level bodyweight moves when there is one; harder ones only as a last resort.
    if (experience === 'beginner') {
      const gentle = options.filter(id => isLoaded(id) || difficultyOf(id) === 'beginner');
      if (gentle.length) options = gentle;
    }
    if (!options.length) return;
    // B days swap in a different exercise only of the same kind (loaded vs bodyweight), never a weaker one.
    const sameTier = options.filter(id => isLoaded(id) === isLoaded(options[0]));
    const id = variant > 0 && sameTier.length > 1 ? sameTier[Math.min(variant, sameTier.length - 1)] : options[0];
    const ex = EXERCISES_DATABASE.find(e => e.id === id);
    if (!ex) return;
    used.add(id);
    exercises.push({ id, name: ex.name, muscleGroup: ex.muscleGroup, prescription: prescriptionFor(ex, role, goal, experience) });
  });
  const title = variant > 0 ? template.altTitle : template.title;
  return { title, muscles: template.muscles, exercises };
}

/** Monday-first order, so a week reads Mon → Sun (dayIndex 0 = Sunday). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** The usual training days for a number of days a week (Mon/Wed/Fri for 3, and so on). */
export function defaultTrainingDays(count: number): number[] {
  const days = Math.min(6, Math.max(2, Math.round(count)));
  return WEEKS[days].map((slot, dayIndex) => (slot ? dayIndex : -1)).filter(i => i >= 0);
}

/**
 * `trainingDays` (dayIndex values, 0 = Sunday) are the days the person chose to train; every
 * other day is a rest day. Without it, the usual days for `days` a week are used.
 */
export function buildWeeklyPlan(opts: {
  gear: GearId[];
  days: number;
  goal: WeightGoal;
  experience: Difficulty;
  location?: TrainingLocation;
  trainingDays?: number[];
}): WeeklyPlan {
  const chosen = opts.trainingDays && opts.trainingDays.length >= 2 ? [...new Set(opts.trainingDays)] : null;
  const days = Math.min(6, Math.max(2, chosen ? chosen.length : Math.round(opts.days)));
  // The split's workouts in order (e.g. Upper, Lower, Upper B, Lower B), placed onto the chosen days.
  const sessions = WEEKS[days].filter((slot): slot is [string, number] => slot !== null);
  const trainingDays = (chosen || defaultTrainingDays(days))
    .slice(0, days)
    .sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
  const layout: ([string, number] | null)[] = Array(7).fill(null);
  trainingDays.forEach((dayIndex, i) => {
    layout[dayIndex] = sessions[i];
  });
  const planDays = layout.map(slot => (slot ? buildDay(T[slot[0]], slot[1], opts.gear, opts.goal, opts.experience) : null));

  const notes: string[] = [];
  const loaded = opts.gear.some(g => g === 'dumbbells' || g === 'barbell' || g === 'kettlebell' || g === 'cable' || g === 'machines');
  notes.push(
    loaded
      ? 'Pick a weight you can lift for the bottom of the rep range with 1–2 reps left. When you hit the top of the range on every set, go heavier next time.'
      : 'No weights? Make it harder each week: add reps, slow the lowering to 3 seconds, or pause at the bottom. A backpack filled with books works as extra weight.'
  );
  if (!opts.gear.includes('pullup_bar')) {
    notes.push('A doorway pull-up bar is the single best cheap upgrade for home back training. Until then, the chair rows and towel rows cover your back.');
  }
  if (opts.goal === 'weight_loss') notes.push('On rest days, walk 30–45 minutes (8–10k steps). The finisher at the end of each workout burns extra calories.');
  if (opts.goal === 'weight_gain' || opts.goal === 'muscle_gain') notes.push('Muscle grows on rest days: eat your calorie and protein target every day, and sleep 7–9 hours.');
  notes.push('Warm up 5 minutes before every session: brisk walk or jumping jacks, then one light set of the first exercise.');

  return { name: SPLIT_NAMES[days], days: planDays, notes };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Turns a plan into the app's weekly split, keeping each exercise's target. */
export function planToSplit(plan: WeeklyPlan): WorkoutSplitDay[] {
  return plan.days.map((day, dayIndex) => ({
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    splitTitle: day ? day.title : 'Rest & Recovery',
    targetMuscles: day ? day.muscles : [],
    isRestDay: !day,
    exerciseIds: day ? day.exercises.map(e => e.id) : [],
    prescriptions: day ? Object.fromEntries(day.exercises.map(e => [e.id, e.prescription])) : undefined,
  }));
}

/** Gear to plan with when the person has not set it up yet: assume a gym, as before. */
export function gearForProfile(profile: { gear?: GearId[]; trainingLocation?: TrainingLocation }): GearId[] {
  if (profile.gear) return profile.gear;
  return profile.trainingLocation ? LOCATION_DEFAULT_GEAR[profile.trainingLocation] : ALL_GEAR;
}

export function describeSetup(profile: { gear?: GearId[]; trainingLocation?: TrainingLocation }): string {
  const place = profile.trainingLocation === 'home' ? 'Home' : profile.trainingLocation === 'gym' ? 'Gym' : 'My equipment';
  const gear = gearForProfile(profile);
  if (profile.trainingLocation === 'gym' && gear.length === ALL_GEAR.length) return 'Gym · full equipment';
  if (!gear.length) return `${place} · bodyweight only`;
  const names = gear.map(g => GEAR_OPTIONS.find(o => o.id === g)?.label || g);
  return `${place} · ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
}
