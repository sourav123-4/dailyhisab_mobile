/**
 * Local data on this phone is kept per account, so signing in as someone else never shows
 * (or uploads) the previous person's records. Offline mode has its own separate space.
 */
export const LOCAL_DATA_OWNER = 'local';

export const scopedStorageKey = (key: string, owner: string) => `${key}:${owner}`;

/** TitanFit keys from builds that stored one shared copy for everyone on the phone. */
export const TITANFIT_STORAGE_KEYS = {
  PROFILE: '@titanfit_profile',
  SPLIT: '@titanfit_split',
  WORKOUTS: '@titanfit_workouts',
  WEIGHTS: '@titanfit_weights',
  MEASUREMENTS: '@titanfit_measurements',
  ACTIVE_WORKOUT: '@titanfit_active_workout',
  AI_CHAT: '@titanfit_ai_chat',
  THEME: '@titanfit_theme',
  AUTH: '@titanfit_auth',
  MEALS: '@titanfit_meals',
} as const;
