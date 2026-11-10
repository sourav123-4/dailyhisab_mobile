import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActiveExerciseLog,
  AIChatMessage,
  BodyMeasurement,
  Exercise,
  FoodMealLog,
  MuscleGroup,
  UserProfile,
  WeightEntry,
  WorkoutSession,
  WorkoutSet,
  WorkoutSplitDay,
} from '../types/fitness';
import { DEFAULT_WEEKLY_SPLIT, EXERCISES_DATABASE } from '../data/exercisesData';
import { ACTIVE_ENV } from '../config/active-env';
import { AppThemeName } from '../theme/appTheme';
import { generateFitnessAdviceWithGemini } from '../services/geminiAiService';
import { localDateISO, nextStreakDays } from '../utils/date';
import { scopedStorageKey, TITANFIT_STORAGE_KEYS } from '../services/dataOwner';

interface FitnessContextType {
  profile: UserProfile;
  exercises: Exercise[];
  weeklySplit: WorkoutSplitDay[];
  workoutHistory: WorkoutSession[];
  weightHistory: WeightEntry[];
  bodyMeasurements: BodyMeasurement[];
  activeWorkout: WorkoutSession | null;
  aiChatHistory: AIChatMessage[];
  themeName: AppThemeName;
  isOnline: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeRestTimer: number | null;
  meals: FoodMealLog[];
  mealsToday: FoodMealLog[];
  totalConsumedCalories: number;
  totalConsumedProtein: number;
  totalConsumedCarbs: number;
  totalConsumedFats: number;

  // Actions
  setThemeName: (theme: AppThemeName) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  startWorkout: (title?: string, exerciseIds?: string[], targetMuscles?: MuscleGroup[], prescriptions?: Record<string, string>) => void;
  addExerciseToActiveWorkout: (exerciseId: string) => void;
  logSetToActiveWorkout: (exerciseId: string, setData: Partial<WorkoutSet>) => void;
  deleteSetFromActiveWorkout: (exerciseId: string, setId: string) => void;
  finishActiveWorkout: () => Promise<WorkoutSession | null>;
  cancelActiveWorkout: () => void;
  logWeight: (weightKg: number, notes?: string) => Promise<void>;
  logMeasurement: (data: Omit<BodyMeasurement, 'id' | 'date'>) => Promise<void>;
  logWater: (amountMl: number) => Promise<void>;
  logMeal: (meal: Omit<FoodMealLog, 'id' | 'date'> & { date?: string }) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  updateSplitDay: (dayIndex: number, updatedDay: Partial<WorkoutSplitDay>) => Promise<void>;
  replaceWeeklySplit: (split: WorkoutSplitDay[]) => Promise<void>;
  sendAICoachQuery: (prompt: string) => Promise<string>;
  triggerRestTimer: (seconds?: number) => void;
  clearRestTimer: () => void;
  claimDailyStreak: () => Promise<number>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_local_default',
  name: 'Athlete',
  email: '',
  gender: 'male',
  age: 26,
  heightCm: 178,
  startWeightKg: 74.5,
  currentWeightKg: 74.5,
  targetWeightKg: 80.0,
  fitnessGoal: 'weight_gain',
  activityLevel: 'moderately_active',
  experience: 'intermediate',
  unit: 'kg',
  targetCalories: 2850,
  targetProteinGrams: 165,
  targetCarbsGrams: 330,
  targetFatsGrams: 75,
  dailyWaterTargetMl: 3500,
  todayWaterMl: 0,
  waterLogDate: localDateISO(),
  streakDays: 0,
  restTimerSeconds: 90,
};

// New users start with no history: earlier builds seeded sample records with these ids,
// which are stripped from saved data on load. Real entries use timestamped ids.
const SAMPLE_RECORD_IDS = new Set(['w1', 'w2', 'w3', 'w4', 'w5', 'm1', 'sess_1', 'meal_def_1', 'meal_def_2']);
const withoutSamples = <T extends { id: string }>(items: T[]) => items.filter(item => !SAMPLE_RECORD_IDS.has(item.id));

const DEFAULT_WEIGHT_HISTORY: WeightEntry[] = [];

const DEFAULT_MEASUREMENTS: BodyMeasurement[] = [];

const DEFAULT_WORKOUT_HISTORY: WorkoutSession[] = [];

const DEFAULT_AI_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'assistant',
    text: "Welcome to TitanFit AI! I am your 24/7 sports science coach. Ask me anything about workout splits, exercise form, calorie surplus for weight gain, or fat loss cutting strategies.",
    timestamp: new Date().toISOString(),
  },
];

const DEFAULT_TODAY_MEALS: FoodMealLog[] = [];

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);


type StorageKeys = { [K in keyof typeof TITANFIT_STORAGE_KEYS]: string };

const keysFor = (owner: string | null) =>
  Object.fromEntries(
    Object.entries(TITANFIT_STORAGE_KEYS).map(([name, key]) => [name, scopedStorageKey(key, owner ?? 'signed-out')])
  ) as StorageKeys;

/**
 * `owner` is the account whose fitness data is shown (see dataOwner.ts); `ready` turns true once
 * Daily Hisab has finished moving older shared data to its owner.
 */
export const FitnessAppProvider = React.memo(function FitnessAppProvider({
  owner,
  ready,
  children,
}: {
  owner: string | null;
  ready: boolean;
  children: React.ReactNode;
}) {
  const STORAGE_KEYS = useMemo(() => keysFor(owner), [owner]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [weeklySplit, setWeeklySplit] = useState<WorkoutSplitDay[]>(DEFAULT_WEEKLY_SPLIT);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>(DEFAULT_WORKOUT_HISTORY);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(DEFAULT_WEIGHT_HISTORY);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>(DEFAULT_MEASUREMENTS);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<AIChatMessage[]>(DEFAULT_AI_MESSAGES);
  const [meals, setMeals] = useState<FoodMealLog[]>(DEFAULT_TODAY_MEALS);
  const [themeName, setThemeNameState] = useState<AppThemeName>('cyber');
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeRestTimer, setActiveRestTimer] = useState<number | null>(null);

  // Load the owner's saved data, starting from a clean slate whenever the account changes.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoading(true);
    setProfile(DEFAULT_PROFILE);
    setWeeklySplit(DEFAULT_WEEKLY_SPLIT);
    setWorkoutHistory(DEFAULT_WORKOUT_HISTORY);
    setWeightHistory(DEFAULT_WEIGHT_HISTORY);
    setBodyMeasurements(DEFAULT_MEASUREMENTS);
    setActiveWorkout(null);
    setAiChatHistory(DEFAULT_AI_MESSAGES);
    setMeals(DEFAULT_TODAY_MEALS);
    loadLocalData(() => cancelled);
    return () => {
      cancelled = true;
    };
    // loadLocalData reads STORAGE_KEYS, which only changes with owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, owner]);

  const loadLocalData = async (isCancelled: () => boolean) => {
    try {
      const [
        savedProf,
        savedSplit,
        savedWorkouts,
        savedWeights,
        savedMeas,
        savedActive,
        savedChat,
        savedTheme,
        savedMeals,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SPLIT),
        AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS),
        AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS),
        AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT),
        AsyncStorage.getItem(STORAGE_KEYS.AI_CHAT),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.MEALS),
      ]);
      if (isCancelled()) return;

      if (savedProf) {
        const parsedProf = JSON.parse(savedProf);
        if (!parsedProf.name) {
          parsedProf.name = 'Athlete';
        }
        setProfile(parsedProf);
      }
      if (savedSplit) {
        const parsed = JSON.parse(savedSplit);
        const merged = parsed.map((d: any) => {
          if (d.dayIndex === 6 && (!d.exerciseIds || d.exerciseIds.length === 0)) {
            const defSat = DEFAULT_WEEKLY_SPLIT.find((s) => s.dayIndex === 6);
            return defSat || d;
          }
          return d;
        });
        setWeeklySplit(merged);
      }
      if (savedWorkouts) setWorkoutHistory(withoutSamples(JSON.parse(savedWorkouts)));
      if (savedWeights) setWeightHistory(withoutSamples(JSON.parse(savedWeights)));
      if (savedMeas) setBodyMeasurements(withoutSamples(JSON.parse(savedMeas)));
      if (savedActive) setActiveWorkout(JSON.parse(savedActive));
      if (savedChat) setAiChatHistory(JSON.parse(savedChat));
      if (savedTheme) setThemeNameState(savedTheme as AppThemeName);
      if (savedMeals) setMeals(withoutSamples(JSON.parse(savedMeals)));
    } catch (err) {
      console.warn('Error loading TitanFit local data:', err);
    } finally {
      if (!isCancelled()) setIsLoading(false);
    }
  };

  const setThemeName = async (newTheme: AppThemeName) => {
    setThemeNameState(newTheme);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
      return next;
    });
  };

  /** Last completed set of an exercise in saved history, for "Previous" and pre-filling. */
  const lastSetFor = (exerciseId: string): WorkoutSet | undefined => {
    for (const session of workoutHistory) {
      const log = session.exercises.find(e => e.exerciseId === exerciseId);
      const done = log?.sets.filter(s => s.isCompleted);
      if (done && done.length) return done[done.length - 1];
    }
    return undefined;
  };

  const firstSetFor = (exerciseId: string): WorkoutSet => {
    const ex = EXERCISES_DATABASE.find(e => e.id === exerciseId);
    const last = lastSetFor(exerciseId);
    // Bodyweight moves start at 0 kg (no extra load) instead of a made-up 20 kg.
    const startWeight = last?.weightKg ?? (ex?.equipment === 'bodyweight' ? 0 : 20);
    return {
      id: `set_${Date.now()}_${exerciseId}_1`,
      setNumber: 1,
      weightKg: startWeight,
      reps: last?.reps || ex?.defaultReps || 10,
      isCompleted: false,
      previousWeight: last?.weightKg,
      previousReps: last?.reps,
    };
  };

  const volumeOf = (exercises: ActiveExerciseLog[]) =>
    exercises.reduce((sum, e) => sum + e.sets.reduce((s, set) => s + (set.isCompleted ? (set.weightKg || 0) * (set.reps || 0) : 0), 0), 0);

  const startWorkout = (
    title?: string,
    exerciseIds?: string[],
    targetMuscles?: MuscleGroup[],
    prescriptions?: Record<string, string>
  ) => {
    const todayStr = localDateISO();
    const initialExercises: ActiveExerciseLog[] = (exerciseIds || []).map((id) => {
      const ex = EXERCISES_DATABASE.find((e) => e.id === id);
      const first = firstSetFor(id);
      // A plan target like "4 × 6–10" starts with 4 sets ready to tick; reps default to the low end.
      const match = prescriptions?.[id]?.match(/^(\d+)\s*(?:×|rounds ×)\s*(\d+)/);
      const setCount = match ? Math.min(6, Math.max(1, Number(match[1]))) : 1;
      const reps = first.previousReps || (match ? Number(match[2]) : first.reps);
      return {
        exerciseId: id,
        exerciseName: ex?.name || 'Custom Exercise',
        muscleGroup: ex?.muscleGroup || 'arms',
        sets: Array.from({ length: setCount }, (_, i) => ({ ...first, id: `${first.id}_${i + 1}`, setNumber: i + 1, reps })),
      };
    });

    const newSession: WorkoutSession = {
      id: `session_${Date.now()}`,
      title: title || "Today's Workout Session",
      date: todayStr,
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: 0,
      exercises: initialExercises,
      totalVolumeKg: 0,
      caloriesBurned: 0,
      isCompleted: false,
    };

    setActiveWorkout(newSession);
    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(newSession));
  };

  const addExerciseToActiveWorkout = (exerciseId: string) => {
    if (!activeWorkout) return;
    const ex = EXERCISES_DATABASE.find((e) => e.id === exerciseId);
    if (!ex) return;

    const newExLog: ActiveExerciseLog = {
      exerciseId: ex.id,
      exerciseName: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: [firstSetFor(ex.id)],
    };

    setActiveWorkout((prev) => {
      if (!prev) return null;
      const next = { ...prev, exercises: [...prev.exercises, newExLog] };
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(next));
      return next;
    });
  };

  const logSetToActiveWorkout = (exerciseId: string, setData: Partial<WorkoutSet>) => {
    if (!activeWorkout) return;

    setActiveWorkout((prev) => {
      if (!prev) return null;
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;

        // If setId provided, update existing set
        if (setData.id) {
          const updatedSets = ex.sets.map((s) => (s.id === setData.id ? { ...s, ...setData } : s));
          return { ...ex, sets: updatedSets };
        } else {
          // Add new set
          // A new set copies the previous one and starts un-ticked: it only counts once done.
          const prevSet = ex.sets[ex.sets.length - 1];
          const newSet: WorkoutSet = {
            id: `set_${Date.now()}_${ex.sets.length + 1}`,
            setNumber: ex.sets.length + 1,
            weightKg: setData.weightKg ?? prevSet?.weightKg ?? 0,
            reps: setData.reps ?? prevSet?.reps ?? 10,
            isCompleted: setData.isCompleted ?? false,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
      });

      const next = { ...prev, exercises: updatedExercises, totalVolumeKg: volumeOf(updatedExercises) };
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(next));
      return next;
    });
  };

  const deleteSetFromActiveWorkout = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;

    setActiveWorkout((prev) => {
      if (!prev) return null;
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const filtered = ex.sets.filter((s) => s.id !== setId);
        // Renumber sets
        const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        return { ...ex, sets: renumbered };
      });

      const next = { ...prev, exercises: updatedExercises, totalVolumeKg: volumeOf(updatedExercises) };
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(next));
      return next;
    });
  };

  const finishActiveWorkout = async (): Promise<WorkoutSession | null> => {
    if (!activeWorkout) return null;

    // Only sets ticked as done are saved; exercises with none are left out.
    const doneExercises = activeWorkout.exercises
      .map(e => ({ ...e, sets: e.sets.filter(set => set.isCompleted) }))
      .filter(e => e.sets.length > 0);
    if (doneExercises.length === 0) return null;

    const totalVol = volumeOf(doneExercises);
    const startedAt = parseInt(activeWorkout.id.split('_')[1] || '0', 10) || Date.now();
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    // Strength training is about 5 METs: kcal = 5 x body weight (kg) x hours.
    const bodyKg = profile.currentWeightKg || 70;
    const caloriesBurned = Math.round(5 * bodyKg * (durationMinutes / 60));

    const finishedSession: WorkoutSession = {
      ...activeWorkout,
      exercises: doneExercises,
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes,
      totalVolumeKg: totalVol,
      caloriesBurned,
      isCompleted: true,
    };

    const nextHistory = [finishedSession, ...workoutHistory];
    setWorkoutHistory(nextHistory);
    setActiveWorkout(null);

    // Update streak accurately
    const todayStr = localDateISO();
    const nextStreak = nextStreakDays(profile.lastWorkoutDate, profile.streakDays, todayStr);

    const updatedProfile: UserProfile = {
      ...profile,
      streakDays: nextStreak,
      lastWorkoutDate: todayStr,
    };
    setProfile(updatedProfile);

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(nextHistory)),
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT),
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile)),
    ]);

    return finishedSession;
  };

  const claimDailyStreak = async (): Promise<number> => {
    const todayStr = localDateISO();
    const nextStreak = nextStreakDays(profile.lastWorkoutDate, profile.streakDays, todayStr);

    const updatedProfile: UserProfile = {
      ...profile,
      streakDays: nextStreak,
      lastWorkoutDate: todayStr,
    };
    setProfile(updatedProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
    return nextStreak;
  };

  const cancelActiveWorkout = () => {
    setActiveWorkout(null);
    AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT);
  };

  const logWeight = async (weightKg: number, notes?: string) => {
    const newEntry: WeightEntry = {
      id: `w_${Date.now()}`,
      date: localDateISO(),
      weightKg,
      notes: notes || 'Daily weigh-in',
    };
    // Functional updates so a profile edit saved in the same tick is not overwritten.
    setWeightHistory((prev) => {
      const next = [...prev, newEntry];
      AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(next));
      return next;
    });
    setProfile((prev) => {
      const next = { ...prev, currentWeightKg: weightKg };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
      return next;
    });
  };

  const logMeasurement = async (data: Omit<BodyMeasurement, 'id' | 'date'>) => {
    const newM: BodyMeasurement = {
      id: `m_${Date.now()}`,
      date: localDateISO(),
      ...data,
    };

    const nextList = [newM, ...bodyMeasurements];
    setBodyMeasurements(nextList);
    await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(nextList));
  };

  const logWater = async (amountMl: number) => {
    setProfile((prev) => {
      const today = localDateISO();
      const nextWater = (prev.waterLogDate === today ? prev.todayWaterMl : 0) + amountMl;
      const next = { ...prev, todayWaterMl: nextWater, waterLogDate: today };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
      return next;
    });
  };

  const todayStr = localDateISO();
  const mealsToday = meals.filter((m) => m.date === todayStr);

  const totalConsumedCalories = mealsToday.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalConsumedProtein = mealsToday.reduce((sum, m) => sum + (m.protein || 0), 0);
  const totalConsumedCarbs = mealsToday.reduce((sum, m) => sum + (m.carbs || 0), 0);
  const totalConsumedFats = mealsToday.reduce((sum, m) => sum + (m.fats || 0), 0);

  const logMeal = async (mealData: Omit<FoodMealLog, 'id' | 'date'> & { date?: string }) => {
    const today = localDateISO();
    const newMeal: FoodMealLog = {
      id: `meal_${Date.now()}`,
      date: mealData.date || today,
      ...mealData,
    };
    const nextList = [newMeal, ...meals];
    setMeals(nextList);
    await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(nextList));
  };

  const deleteMeal = async (mealId: string) => {
    const nextList = meals.filter((m) => m.id !== mealId);
    setMeals(nextList);
    await AsyncStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(nextList));
  };

  const replaceWeeklySplit = async (split: WorkoutSplitDay[]) => {
    setWeeklySplit(split);
    await AsyncStorage.setItem(STORAGE_KEYS.SPLIT, JSON.stringify(split));
  };

  const updateSplitDay = async (dayIndex: number, updatedDay: Partial<WorkoutSplitDay>) => {
    const nextSplit = weeklySplit.map((d) => (d.dayIndex === dayIndex ? { ...d, ...updatedDay } : d));
    setWeeklySplit(nextSplit);
    await AsyncStorage.setItem(STORAGE_KEYS.SPLIT, JSON.stringify(nextSplit));
  };

  const triggerRestTimer = (seconds = 90) => {
    setActiveRestTimer(seconds);
  };

  const clearRestTimer = () => {
    setActiveRestTimer(null);
  };

  const sendAICoachQuery = async (prompt: string): Promise<string> => {
    const userMsg: AIChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toISOString(),
    };

    setAiChatHistory((prev) => [...prev, userMsg]);

    try {
      const aiReply = await generateFitnessAdviceWithGemini(prompt, profile, aiChatHistory);

      const aiMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: aiReply,
        timestamp: new Date().toISOString(),
      };

      setAiChatHistory((prev) => {
        const next = [...prev, aiMsg];
        AsyncStorage.setItem(STORAGE_KEYS.AI_CHAT, JSON.stringify(next));
        return next;
      });

      return aiReply;
    } catch (err: any) {
      console.warn('Gemini AI error:', err);
      const errReply =
        'Coach advice: Progressive overload and a 300-500 kcal surplus or deficit is the most reliable scientific way to reach your physique goal!';
      const aiMsg: AIChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: errReply,
        timestamp: new Date().toISOString(),
      };
      setAiChatHistory((prev) => [...prev, aiMsg]);
      return errReply;
    }
  };

  const loginGuest = async () => {
    setIsAuthenticated(true);
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH, 'authenticated');
  };

  const logout = async () => {
    setIsAuthenticated(false);
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH);
  };

  return (
    <FitnessContext.Provider
      value={{
        profile,
        exercises: EXERCISES_DATABASE,
        weeklySplit,
        workoutHistory,
        weightHistory,
        bodyMeasurements,
        activeWorkout,
        aiChatHistory,
        themeName,
        isOnline,
        isLoading,
        isAuthenticated,
        activeRestTimer,
        meals,
        mealsToday,
        totalConsumedCalories,
        totalConsumedProtein,
        totalConsumedCarbs,
        totalConsumedFats,
        setThemeName,
        updateProfile,
        startWorkout,
        addExerciseToActiveWorkout,
        logSetToActiveWorkout,
        deleteSetFromActiveWorkout,
        finishActiveWorkout,
        cancelActiveWorkout,
        logWeight,
        logMeasurement,
        logWater,
        logMeal,
        deleteMeal,
        updateSplitDay,
        replaceWeeklySplit,
        sendAICoachQuery,
        triggerRestTimer,
        clearRestTimer,
        claimDailyStreak,
        loginGuest,
        logout,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
});

export const useFitnessApp = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitnessApp must be used within a FitnessAppProvider');
  }
  return context;
};
