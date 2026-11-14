import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { EXERCISES_DATABASE } from '../data/exercisesData';
import { ACTIVE_ENV } from '../config/active-env';
import { AppThemeName } from '../theme/appTheme';
import { generateFitnessAdviceWithGemini } from '../services/geminiAiService';
import { localDateISO, nextStreakDays } from '../utils/date';
import { LOCAL_DATA_OWNER, scopedStorageKey, TITANFIT_STORAGE_KEYS } from '../services/dataOwner';
import { readFromCloud, saveToCloud } from '../services/sync';

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
  /** False while a signed-in account's cloud backup is still being checked (so onboarding waits for it). */
  cloudChecked: boolean;
  /** True when there is any logged history (workouts, weigh-ins, meals, measurements). */
  hasHistory: boolean;
  /** Set when onboarding finishes so Today opens the plan builder once. */
  planSetupRequested: boolean;
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
  /** Erases every TitanFit record for this account (phone and cloud backup) and returns to onboarding. */
  resetFitnessData: () => Promise<void>;
  setPlanSetupRequested: (requested: boolean) => void;
}

// A new account starts blank: the person enters their own details in onboarding.
const DEFAULT_PROFILE: UserProfile = {
  id: 'user_local_default',
  name: '',
  email: '',
  gender: 'male',
  age: 0,
  heightCm: 0,
  startWeightKg: 0,
  currentWeightKg: 0,
  targetWeightKg: 0,
  fitnessGoal: 'maintenance',
  activityLevel: 'moderately_active',
  experience: 'beginner',
  unit: 'kg',
  targetCalories: 0,
  targetProteinGrams: 0,
  targetCarbsGrams: 0,
  targetFatsGrams: 0,
  dailyWaterTargetMl: 0,
  todayWaterMl: 0,
  waterLogDate: localDateISO(),
  streakDays: 0,
  restTimerSeconds: 90,
  onboarded: false,
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// No preset workouts: the week stays empty until the person builds a plan.
export const EMPTY_WEEK: WorkoutSplitDay[] = DAY_NAMES.map((dayName, dayIndex) => ({
  dayIndex,
  dayName,
  splitTitle: 'No plan yet',
  targetMuscles: [],
  isRestDay: false,
  exerciseIds: [],
}));

/** Records backed up to the signed-in account, so signing in again (on any phone) restores them. */
const SYNCED_KEYS = ['PROFILE', 'SPLIT', 'WORKOUTS', 'WEIGHTS', 'MEASUREMENTS', 'MEALS'] as const;
type SyncedKey = (typeof SYNCED_KEYS)[number];
const cloudDocId = (name: SyncedKey) => `titanfit_${name.toLowerCase()}`;

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


const LIST_KEYS: SyncedKey[] = ['WORKOUTS', 'WEIGHTS', 'MEASUREMENTS', 'MEALS'];

/** Combines two copies of a history list by id (the newer copy wins a clash), in the app's usual order. */
function mergeById<T extends { id: string; date?: string }>(older: T[], newer: T[], ascending: boolean): T[] {
  const byId = new Map<string, T>();
  [...older, ...newer].forEach(item => item?.id && byId.set(item.id, item));
  const sortKey = (item: T) => `${item.date || ''}|${item.id}`;
  const sorted = [...byId.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  return ascending ? sorted : sorted.reverse();
}

// A Firestore document holds at most 1 MB. Years of history could pass that, so the backup keeps
// the most recent entries; the phone always keeps everything.
const CLOUD_JSON_LIMIT = 700_000;
function fitForCloud(name: SyncedKey, json: string): string {
  if (json.length <= CLOUD_JSON_LIMIT || !LIST_KEYS.includes(name)) return json;
  let list: unknown[] = JSON.parse(json);
  while (list.length > 1 && JSON.stringify(list).length > CLOUD_JSON_LIMIT) {
    const keep = Math.ceil(list.length * 0.8);
    // Weigh-ins are stored oldest first; every other list is newest first.
    list = name === 'WEIGHTS' ? list.slice(list.length - keep) : list.slice(0, keep);
  }
  return JSON.stringify(list);
}

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
  cloudReady = false,
  children,
}: {
  owner: string | null;
  ready: boolean;
  /** The signed-in account is confirmed and online, so its cloud backup can be read and written. */
  cloudReady?: boolean;
  children: React.ReactNode;
}) {
  const STORAGE_KEYS = useMemo(() => keysFor(owner), [owner]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [weeklySplit, setWeeklySplit] = useState<WorkoutSplitDay[]>(EMPTY_WEEK);
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
  const [cloudPulled, setCloudPulled] = useState(false);
  const [planSetupRequested, setPlanSetupRequested] = useState(false);

  // When each synced key was last saved here, and which keys still need uploading.
  const metaRef = useRef<Partial<Record<SyncedKey | 'EPOCH', number>>>({});
  const dirtyRef = useRef(new Map<SyncedKey, string>());
  const cloudReadyRef = useRef(false);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushDirty = useCallback(async () => {
    if (!cloudReadyRef.current) return;
    for (const [name, json] of [...dirtyRef.current]) {
      const saved = await saveToCloud('settings', cloudDocId(name), {
        id: cloudDocId(name),
        json: fitForCloud(name, json),
        savedAt: metaRef.current[name] || Date.now(),
        // Bumped by "Reset TitanFit data"; a higher epoch replaces everything from a lower one.
        epoch: metaRef.current.EPOCH || 0,
      }).catch(() => false);
      // Only clear it if nothing newer was queued while this upload ran.
      if (saved && dirtyRef.current.get(name) === json) dirtyRef.current.delete(name);
    }
    // Anything that could not be uploaded (offline, quota) is retried shortly.
    if (dirtyRef.current.size > 0) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        pushDirtyRef.current();
      }, 30000);
    }
  }, []);
  const pushDirtyRef = useRef(pushDirty);
  pushDirtyRef.current = pushDirty;

  const schedulePush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushDirty();
    }, 1500);
  }, [pushDirty]);

  /** Saves a record on the phone, stamps when, and queues it for the cloud backup. */
  const persist = (name: SyncedKey, value: unknown) => {
    const json = JSON.stringify(value);
    metaRef.current = { ...metaRef.current, [name]: Date.now() };
    dirtyRef.current.set(name, json);
    schedulePush();
    return Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS[name], json),
      AsyncStorage.setItem(STORAGE_KEYS.META, JSON.stringify(metaRef.current)),
    ]).catch(() => undefined);
  };

  // Load the owner's saved data, starting from a clean slate whenever the account changes.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setIsLoading(true);
    setCloudPulled(false);
    metaRef.current = {};
    dirtyRef.current.clear();
    setProfile(DEFAULT_PROFILE);
    setWeeklySplit(EMPTY_WEEK);
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
        savedMeta,
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
        AsyncStorage.getItem(STORAGE_KEYS.META),
      ]);
      if (isCancelled()) return;
      if (savedMeta) metaRef.current = JSON.parse(savedMeta);

      if (savedProf) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(savedProf) });
      if (savedSplit) setWeeklySplit(JSON.parse(savedSplit));
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

  /** Puts a saved record on screen (used for local load and for a newer cloud copy). */
  const applyRecord = (name: SyncedKey, value: any) => {
    if (name === 'PROFILE') setProfile({ ...DEFAULT_PROFILE, ...value });
    else if (name === 'SPLIT') setWeeklySplit(Array.isArray(value) && value.length ? value : EMPTY_WEEK);
    else if (name === 'WORKOUTS') setWorkoutHistory(withoutSamples(value || []));
    else if (name === 'WEIGHTS') setWeightHistory(withoutSamples(value || []));
    else if (name === 'MEASUREMENTS') setBodyMeasurements(withoutSamples(value || []));
    else setMeals(withoutSamples(value || []));
  };

  const defaultRecord = (name: SyncedKey) => (name === 'PROFILE' ? DEFAULT_PROFILE : name === 'SPLIT' ? EMPTY_WEEK : []);

  // Once the signed-in account is confirmed, reconcile this phone with its cloud backup:
  // a newer cloud copy is restored here, anything newer here is uploaded. History lists from two
  // phones are combined rather than one replacing the other.
  const [pullAttempt, setPullAttempt] = useState(0);
  useEffect(() => {
    cloudReadyRef.current = false;
    if (!ready || isLoading || !cloudReady || !owner || owner === LOCAL_DATA_OWNER) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      const docs = await Promise.all(SYNCED_KEYS.map(name => readFromCloud('settings', cloudDocId(name))));
      if (cancelled) return;
      // Unreachable cloud: change nothing (never treat "offline" as "empty") and try again shortly.
      if (docs.some(doc => doc === undefined)) {
        retry = setTimeout(() => setPullAttempt(n => n + 1), 20000);
        return;
      }
      const cloudEpoch = Math.max(0, ...docs.map(doc => Number(doc?.epoch || 0)));
      const localEpoch = metaRef.current.EPOCH || 0;
      // Timestamps are written straight to metaRef so a save made during this check is never rolled back.
      const stamp = (key: SyncedKey | 'EPOCH', at: number) => {
        metaRef.current = { ...metaRef.current, [key]: at };
      };
      const writes: [string, string][] = [];

      for (let i = 0; i < SYNCED_KEYS.length; i++) {
        const name = SYNCED_KEYS[i];
        const doc = docs[i];
        const cloudAt = Number(doc?.savedAt || 0);
        const cloudJson = doc && typeof doc.json === 'string' && Number(doc.epoch || 0) === cloudEpoch ? doc.json : null;
        const localJson = dirtyRef.current.get(name) ?? (await AsyncStorage.getItem(STORAGE_KEYS[name]));
        if (cancelled) return;
        const localAt = metaRef.current[name] || 0;
        const adopt = (json: string, at: number) => {
          applyRecord(name, JSON.parse(json));
          writes.push([STORAGE_KEYS[name], json]);
          stamp(name, at);
          dirtyRef.current.delete(name);
        };
        const upload = (json: string) => {
          if (!metaRef.current[name]) stamp(name, Date.now());
          dirtyRef.current.set(name, json);
        };
        try {
          if (cloudEpoch > localEpoch) {
            // The data was reset on another phone: take the cloud's copy, or blank where it has none.
            adopt(cloudJson ?? JSON.stringify(defaultRecord(name)), cloudAt || Date.now());
          } else if (localEpoch > cloudEpoch) {
            // Reset here: this phone's copy replaces the cloud's.
            upload(localJson ?? JSON.stringify(defaultRecord(name)));
          } else if (cloudJson && !localJson) {
            adopt(cloudJson, cloudAt);
          } else if (localJson && !cloudJson) {
            upload(localJson);
          } else if (cloudJson && localJson && cloudAt !== localAt) {
            if (LIST_KEYS.includes(name)) {
              const cloudList = JSON.parse(cloudJson);
              const localList = JSON.parse(localJson);
              const [older, newer] = cloudAt > localAt ? [localList, cloudList] : [cloudList, localList];
              const merged = JSON.stringify(mergeById(older, newer, name === 'WEIGHTS'));
              adopt(merged, Date.now());
              if (merged !== cloudJson) dirtyRef.current.set(name, merged);
            } else if (cloudAt > localAt) {
              adopt(cloudJson, cloudAt);
            } else {
              upload(localJson);
            }
          }
        } catch {
          // A copy that cannot be read is skipped; the other one stays as it is.
        }
      }
      if (cloudEpoch > localEpoch) stamp('EPOCH', cloudEpoch);
      writes.push([STORAGE_KEYS.META, JSON.stringify(metaRef.current)]);
      await AsyncStorage.multiSet(writes).catch(() => undefined);
      if (cancelled) return;
      cloudReadyRef.current = true;
      setCloudPulled(true);
      pushDirty();
    })();
    return () => {
      cancelled = true;
      cloudReadyRef.current = false;
      if (retry) clearTimeout(retry);
    };
    // STORAGE_KEYS follows owner; applyRecord only calls state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isLoading, cloudReady, owner, pullAttempt]);

  // Onboarding waits for the backup check, but never for long when the network is slow or off.
  const expectsCloud = !!owner && owner !== LOCAL_DATA_OWNER;
  const [cloudWaitExpired, setCloudWaitExpired] = useState(false);
  useEffect(() => {
    setCloudWaitExpired(false);
    if (!expectsCloud || cloudPulled) return;
    const timer = setTimeout(() => setCloudWaitExpired(true), 7000);
    return () => clearTimeout(timer);
  }, [owner, expectsCloud, cloudPulled]);
  const cloudChecked = !expectsCloud || cloudPulled || cloudWaitExpired;

  const hasHistory = workoutHistory.length > 0 || weightHistory.length > 0 || meals.length > 0 || bodyMeasurements.length > 0;

  const resetFitnessData = async () => {
    // A new epoch makes this blank slate replace older copies on the cloud and on other phones.
    metaRef.current = { ...metaRef.current, EPOCH: Date.now() };
    setProfile(DEFAULT_PROFILE);
    setWeeklySplit(EMPTY_WEEK);
    setWorkoutHistory([]);
    setWeightHistory([]);
    setBodyMeasurements([]);
    setMeals([]);
    setActiveWorkout(null);
    setAiChatHistory(DEFAULT_AI_MESSAGES);
    await Promise.all([
      ...SYNCED_KEYS.map(name => persist(name, defaultRecord(name))),
      AsyncStorage.multiRemove([STORAGE_KEYS.ACTIVE_WORKOUT, STORAGE_KEYS.AI_CHAT]),
    ]);
  };

  const setThemeName = async (newTheme: AppThemeName) => {
    setThemeNameState(newTheme);
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      persist('PROFILE', next);
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
      persist('WORKOUTS', nextHistory),
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_WORKOUT),
      persist('PROFILE', updatedProfile),
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
    await persist('PROFILE', updatedProfile);
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
      persist('WEIGHTS', next);
      return next;
    });
    setProfile((prev) => {
      const next = { ...prev, currentWeightKg: weightKg };
      persist('PROFILE', next);
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
    await persist('MEASUREMENTS', nextList);
  };

  const logWater = async (amountMl: number) => {
    setProfile((prev) => {
      const today = localDateISO();
      const nextWater = (prev.waterLogDate === today ? prev.todayWaterMl : 0) + amountMl;
      const next = { ...prev, todayWaterMl: nextWater, waterLogDate: today };
      persist('PROFILE', next);
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
    await persist('MEALS', nextList);
  };

  const deleteMeal = async (mealId: string) => {
    const nextList = meals.filter((m) => m.id !== mealId);
    setMeals(nextList);
    await persist('MEALS', nextList);
  };

  const replaceWeeklySplit = async (split: WorkoutSplitDay[]) => {
    setWeeklySplit(split);
    await persist('SPLIT', split);
  };

  const updateSplitDay = async (dayIndex: number, updatedDay: Partial<WorkoutSplitDay>) => {
    const nextSplit = weeklySplit.map((d) => (d.dayIndex === dayIndex ? { ...d, ...updatedDay } : d));
    setWeeklySplit(nextSplit);
    await persist('SPLIT', nextSplit);
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
        cloudChecked,
        hasHistory,
        planSetupRequested,
        setPlanSetupRequested,
        resetFitnessData,
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
