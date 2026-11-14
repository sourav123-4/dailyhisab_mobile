export type MuscleGroup = 'arms' | 'shoulders' | 'chest' | 'back' | 'abs' | 'legs' | 'fullbody';

export type Equipment = 'dumbbell' | 'barbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type WeightGoal = 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance';

/** Equipment a person can train with, beyond their own body weight (always available). */
export type GearId = 'dumbbells' | 'barbell' | 'bench' | 'pullup_bar' | 'dip_station' | 'cable' | 'machines' | 'kettlebell';

export type TrainingLocation = 'home' | 'gym' | 'other';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';

export interface ExerciseDemonstration {
  title: string;
  url: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  sourceUrl?: string;
  changes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: Equipment;
  difficulty: Difficulty;
  mechanics: 'compound' | 'isolation';
  imageKey: string;
  description: string;
  instructions: string[];
  tips: string[];
  mistakes: string[];
  safetyTips?: string[];
  beginnerModifications?: string[];
  advancedVariations?: string[];
  animationFrames: string[];
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
  // Exact video and scene playback metadata from VitalPath
  videoUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  demonstrations?: ExerciseDemonstration[];
  frontVideoUrl?: string;
  sideVideoUrl?: string;
  backVideoUrl?: string;
}


export interface WorkoutSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  isCompleted: boolean;
  isWarmup?: boolean;
  previousWeight?: number;
  previousReps?: number;
}

export interface ActiveExerciseLog {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  exercises: ActiveExerciseLog[];
  totalVolumeKg: number;
  caloriesBurned: number;
  isCompleted: boolean;
  notes?: string;
}

export interface WorkoutSplitDay {
  dayIndex: number; // 0: Sun, 1: Mon, ... 6: Sat
  dayName: string;
  splitTitle: string;
  targetMuscles: MuscleGroup[];
  isRestDay: boolean;
  exerciseIds: string[];
  /** Target per exercise from the plan builder, e.g. "4 × 6–10". */
  prescriptions?: Record<string, string>;
}

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  bodyFatPercentage?: number;
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  bicepsLeftCm?: number;
  bicepsRightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  thighsCm?: number;
  shouldersCm?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
  gender: 'male' | 'female' | 'other';
  age: number;
  heightCm: number;
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
  fitnessGoal: WeightGoal;
  activityLevel: ActivityLevel;
  experience: Difficulty;
  unit: 'kg' | 'lbs';
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatsGrams: number;
  dailyWaterTargetMl: number;
  todayWaterMl: number;
  waterLogDate: string;
  streakDays: number;
  lastWorkoutDate?: string;
  restTimerSeconds: number;
  geminiApiKey?: string;
  /** True once the person has entered their own details; until then TitanFit shows onboarding. */
  onboarded?: boolean;
  /** Workout setup chosen in the plan builder. */
  trainingLocation?: TrainingLocation;
  gear?: GearId[];
  trainingDaysPerWeek?: number;
  /** Weekdays the person trains (0 = Sunday); the others are rest days. */
  trainingDayIndexes?: number[];
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: 'start_workout' | 'log_weight' | 'view_exercise' | 'apply_routine';
    payload?: any;
  };
}

export interface DailyWorkoutSummary {
  date: string;
  completed: boolean;
  sessionTitle: string;
  volumeKg: number;
  durationMinutes: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodMealLog {
  id: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  imageUri?: string;
  portion: string;
  timestamp: number | string;
  date: string; // YYYY-MM-DD
  confidenceScore?: number;
  detectedItems?: string[];
  source?: 'ai_vision' | 'ai_text' | 'preset' | 'manual';
}
