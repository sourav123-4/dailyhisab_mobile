export type MuscleGroup = 'arms' | 'shoulders' | 'chest' | 'back' | 'abs' | 'legs' | 'fullbody';

export type Equipment = 'dumbbell' | 'barbell' | 'cable' | 'machine' | 'bodyweight' | 'kettlebell';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type WeightGoal = 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'maintenance';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';

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
  animationFrames: string[];
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
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
