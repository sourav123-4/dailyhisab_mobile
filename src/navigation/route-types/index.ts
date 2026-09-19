import { Exercise } from '../../types/fitness';

export type MainTabParamList = {
  Today: undefined;
  MuscleExplore: undefined;
  Weight: undefined;
  AICoach: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  ActiveWorkout: undefined;
  ExerciseDetail: { exercise: Exercise };
};
