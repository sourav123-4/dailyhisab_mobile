import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActiveExerciseLog,
  AIChatMessage,
  BodyMeasurement,
  Exercise,
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

  // Actions
  setThemeName: (theme: AppThemeName) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  startWorkout: (title?: string, exerciseIds?: string[], targetMuscles?: MuscleGroup[]) => void;
  addExerciseToActiveWorkout: (exerciseId: string) => void;
  logSetToActiveWorkout: (exerciseId: string, setData: Partial<WorkoutSet>) => void;
  deleteSetFromActiveWorkout: (exerciseId: string, setId: string) => void;
  finishActiveWorkout: () => Promise<WorkoutSession | null>;
  cancelActiveWorkout: () => void;
  logWeight: (weightKg: number, notes?: string) => Promise<void>;
  logMeasurement: (data: Omit<BodyMeasurement, 'id' | 'date'>) => Promise<void>;
  logWater: (amountMl: number) => Promise<void>;
  updateSplitDay: (dayIndex: number, updatedDay: Partial<WorkoutSplitDay>) => Promise<void>;
  sendAICoachQuery: (prompt: string) => Promise<string>;
  triggerRestTimer: (seconds?: number) => void;
  clearRestTimer: () => void;
  claimDailyStreak: () => Promise<number>;
  loginGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_local_default',
  name: 'Sourav Mahanty',
  email: 'souravrasiknagar@gmail.com',
  gender: 'male',
  age: 26,
  heightCm: 178,
  startWeightKg: 78.0,
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
  todayWaterMl: 1500,
  waterLogDate: new Date().toISOString().split('T')[0],
  streakDays: 4,
  restTimerSeconds: 90,
};

const DEFAULT_WEIGHT_HISTORY: WeightEntry[] = [
  { id: 'w1', date: '2026-08-15', weightKg: 78.0, notes: 'Starting physique' },
  { id: 'w2', date: '2026-08-22', weightKg: 77.2, notes: 'End of week 1' },
  { id: 'w3', date: '2026-08-29', weightKg: 76.5, notes: 'Strength holding' },
  { id: 'w4', date: '2026-09-05', weightKg: 75.2, notes: 'Dialed in clean diet' },
  { id: 'w5', date: '2026-09-12', weightKg: 74.5, notes: 'Current transformation check' },
];

const DEFAULT_MEASUREMENTS: BodyMeasurement[] = [
  {
    id: 'm1',
    date: '2026-09-01',
    bicepsLeftCm: 38.5,
    bicepsRightCm: 39.0,
    chestCm: 104,
    waistCm: 81,
    thighsCm: 60,
    shouldersCm: 122,
  },
];

const DEFAULT_WORKOUT_HISTORY: WorkoutSession[] = [
  {
    id: 'sess_1',
    title: 'Push Day (Chest & Shoulders)',
    date: '2026-09-10',
    startTime: '17:30',
    endTime: '18:35',
    durationMinutes: 65,
    totalVolumeKg: 4850,
    caloriesBurned: 420,
    isCompleted: true,
    exercises: [
      {
        exerciseId: 'chest_barbell_bench_press',
        exerciseName: 'Barbell Flat Bench Press',
        muscleGroup: 'chest',
        sets: [
          { id: 's1', setNumber: 1, weightKg: 80, reps: 10, isCompleted: true },
          { id: 's2', setNumber: 2, weightKg: 85, reps: 8, isCompleted: true },
          { id: 's3', setNumber: 3, weightKg: 90, reps: 6, isCompleted: true },
        ],
      },
      {
        exerciseId: 'shoulders_barbell_overhead_press',
        exerciseName: 'Overhead Barbell Military Press',
        muscleGroup: 'shoulders',
        sets: [
          { id: 's4', setNumber: 1, weightKg: 50, reps: 10, isCompleted: true },
          { id: 's5', setNumber: 2, weightKg: 55, reps: 8, isCompleted: true },
        ],
      },
    ],
  },
];

const DEFAULT_AI_MESSAGES: AIChatMessage[] = [
  {
    id: 'msg_welcome',
    sender: 'assistant',
    text: "Welcome to TitanFit AI! I am your 24/7 sports science coach. Ask me anything about workout splits, exercise form, calorie surplus for weight gain, or fat loss cutting strategies.",
    timestamp: new Date().toISOString(),
  },
];

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: '@titanfit_profile',
  SPLIT: '@titanfit_split',
  WORKOUTS: '@titanfit_workouts',
  WEIGHTS: '@titanfit_weights',
  MEASUREMENTS: '@titanfit_measurements',
  ACTIVE_WORKOUT: '@titanfit_active_workout',
  AI_CHAT: '@titanfit_ai_chat',
  THEME: '@titanfit_theme',
  AUTH: '@titanfit_auth',
};

export const FitnessAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [weeklySplit, setWeeklySplit] = useState<WorkoutSplitDay[]>(DEFAULT_WEEKLY_SPLIT);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>(DEFAULT_WORKOUT_HISTORY);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(DEFAULT_WEIGHT_HISTORY);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>(DEFAULT_MEASUREMENTS);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [aiChatHistory, setAiChatHistory] = useState<AIChatMessage[]>(DEFAULT_AI_MESSAGES);
  const [themeName, setThemeNameState] = useState<AppThemeName>('cyber');
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeRestTimer, setActiveRestTimer] = useState<number | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
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
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SPLIT),
        AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS),
        AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS),
        AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_WORKOUT),
        AsyncStorage.getItem(STORAGE_KEYS.AI_CHAT),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
      ]);

      if (savedProf) {
        const parsedProf = JSON.parse(savedProf);
        if (!parsedProf.name || parsedProf.name === 'Titan Athlete') {
          parsedProf.name = 'Sourav Mahanty';
        }
        if (!parsedProf.email || parsedProf.email === 'athlete@titanfit.ai') {
          parsedProf.email = 'souravrasiknagar@gmail.com';
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
      if (savedWorkouts) setWorkoutHistory(JSON.parse(savedWorkouts));
      if (savedWeights) setWeightHistory(JSON.parse(savedWeights));
      if (savedMeas) setBodyMeasurements(JSON.parse(savedMeas));
      if (savedActive) setActiveWorkout(JSON.parse(savedActive));
      if (savedChat) setAiChatHistory(JSON.parse(savedChat));
      if (savedTheme) setThemeNameState(savedTheme as AppThemeName);
    } catch (err) {
      console.warn('Error loading TitanFit local data:', err);
    } finally {
      setIsLoading(false);
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

  const startWorkout = (
    title?: string,
    exerciseIds?: string[],
    targetMuscles?: MuscleGroup[]
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const initialExercises: ActiveExerciseLog[] = (exerciseIds || []).map((id) => {
      const ex = EXERCISES_DATABASE.find((e) => e.id === id);
      return {
        exerciseId: id,
        exerciseName: ex?.name || 'Custom Exercise',
        muscleGroup: ex?.muscleGroup || 'arms',
        sets: [
          {
            id: `set_${Date.now()}_1`,
            setNumber: 1,
            weightKg: 20,
            reps: ex?.defaultReps || 10,
            isCompleted: false,
          },
        ],
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
      sets: [
        {
          id: `set_${Date.now()}_1`,
          setNumber: 1,
          weightKg: 20,
          reps: ex.defaultReps || 10,
          isCompleted: false,
        },
      ],
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
          const newSet: WorkoutSet = {
            id: `set_${Date.now()}_${ex.sets.length + 1}`,
            setNumber: ex.sets.length + 1,
            weightKg: setData.weightKg || ex.sets[ex.sets.length - 1]?.weightKg || 20,
            reps: setData.reps || ex.sets[ex.sets.length - 1]?.reps || 10,
            isCompleted: setData.isCompleted ?? true,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
      });

      // Calculate new total volume
      let totalVol = 0;
      updatedExercises.forEach((e) => {
        e.sets.forEach((s) => {
          if (s.isCompleted) {
            totalVol += (s.weightKg || 0) * (s.reps || 0);
          }
        });
      });

      const next = { ...prev, exercises: updatedExercises, totalVolumeKg: totalVol };
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

      const next = { ...prev, exercises: updatedExercises };
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_WORKOUT, JSON.stringify(next));
      return next;
    });
  };

  const finishActiveWorkout = async (): Promise<WorkoutSession | null> => {
    if (!activeWorkout) return null;

    let totalVol = 0;
    activeWorkout.exercises.forEach((e) => {
      e.sets.forEach((s) => {
        if (s.isCompleted) {
          totalVol += (s.weightKg || 0) * (s.reps || 0);
        }
      });
    });

    const finishedSession: WorkoutSession = {
      ...activeWorkout,
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: Math.max(30, Math.round((Date.now() - parseInt(activeWorkout.id.split('_')[1] || '0', 10)) / 60000)),
      totalVolumeKg: totalVol,
      caloriesBurned: Math.round(totalVol * 0.08) + 250,
      isCompleted: true,
    };

    const nextHistory = [finishedSession, ...workoutHistory];
    setWorkoutHistory(nextHistory);
    setActiveWorkout(null);

    // Update streak accurately
    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyCompletedToday = profile.lastWorkoutDate === todayStr;
    const nextStreak = isAlreadyCompletedToday ? profile.streakDays : profile.streakDays + 1;

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
    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyCompletedToday = profile.lastWorkoutDate === todayStr;
    const nextStreak = isAlreadyCompletedToday ? profile.streakDays : profile.streakDays + 1;

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
      date: new Date().toISOString().split('T')[0],
      weightKg,
      notes: notes || 'Daily weigh-in',
    };

    const nextList = [...weightHistory, newEntry];
    setWeightHistory(nextList);
    setProfile((prev) => ({ ...prev, currentWeightKg: weightKg }));

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(nextList)),
      AsyncStorage.setItem(
        STORAGE_KEYS.PROFILE,
        JSON.stringify({ ...profile, currentWeightKg: weightKg })
      ),
    ]);
  };

  const logMeasurement = async (data: Omit<BodyMeasurement, 'id' | 'date'>) => {
    const newM: BodyMeasurement = {
      id: `m_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...data,
    };

    const nextList = [newM, ...bodyMeasurements];
    setBodyMeasurements(nextList);
    await AsyncStorage.setItem(STORAGE_KEYS.MEASUREMENTS, JSON.stringify(nextList));
  };

  const logWater = async (amountMl: number) => {
    setProfile((prev) => {
      const today = new Date().toISOString().split('T')[0];
      const nextWater = (prev.waterLogDate === today ? prev.todayWaterMl : 0) + amountMl;
      const next = { ...prev, todayWaterMl: nextWater, waterLogDate: today };
      AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(next));
      return next;
    });
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
        updateSplitDay,
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
};

export const useFitnessApp = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitnessApp must be used within a FitnessAppProvider');
  }
  return context;
};
