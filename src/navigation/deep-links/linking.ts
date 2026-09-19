import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../route-types';

export const linkingConfig: LinkingOptions<RootStackParamList> = {
  config: {
    screens: {
      MainTabs: {
        screens: {
          Today: 'today',
          MuscleExplore: 'anatomy',
          Weight: 'weight',
          AICoach: 'coach',
          Profile: 'profile',
        },
      },
      ActiveWorkout: 'active-workout',
      Onboarding: 'onboarding',
    },
  },
  prefixes: ['titanfit://', 'dailyhisab://'],
};
