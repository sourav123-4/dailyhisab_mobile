import { ImageSourcePropType } from 'react-native';

export interface ExerciseMediaAssets {
  animationGif: ImageSourcePropType;
  posterJpg: ImageSourcePropType;
}

export const EXERCISE_LOCAL_MEDIA: Record<string, ExerciseMediaAssets> = {
  // Arms
  arms_barbell_curl: {
    animationGif: require('../../assets/exercise_animations/13_biceps_curl.gif'),
    posterJpg: require('../../assets/poster_crops/13_biceps_curl.jpg'),
  },
  arms_dumbbell_hammer_curl: {
    animationGif: require('../../assets/exercise_animations/14_hammer_curl.gif'),
    posterJpg: require('../../assets/poster_crops/14_hammer_curl.jpg'),
  },
  arms_incline_dumbbell_curl: {
    animationGif: require('../../assets/exercise_animations/13_biceps_curl.gif'),
    posterJpg: require('../../assets/poster_crops/13_biceps_curl.jpg'),
  },
  arms_skullcrushers: {
    animationGif: require('../../assets/exercise_animations/15_overhead_triceps_extension.gif'),
    posterJpg: require('../../assets/poster_crops/15_overhead_triceps_extension.jpg'),
  },
  arms_cable_tricep_pushdown: {
    animationGif: require('../../assets/exercise_animations/16_triceps_kickback.gif'),
    posterJpg: require('../../assets/poster_crops/16_triceps_kickback.jpg'),
  },
  arms_overhead_tricep_extension: {
    animationGif: require('../../assets/exercise_animations/15_overhead_triceps_extension.gif'),
    posterJpg: require('../../assets/poster_crops/15_overhead_triceps_extension.jpg'),
  },

  // Shoulders
  shoulders_barbell_overhead_press: {
    animationGif: require('../../assets/exercise_animations/09_dumbbell_shoulder_press.gif'),
    posterJpg: require('../../assets/poster_crops/09_dumbbell_shoulder_press.jpg'),
  },
  shoulders_dumbbell_lateral_raise: {
    animationGif: require('../../assets/exercise_animations/10_lateral_raise.gif'),
    posterJpg: require('../../assets/poster_crops/10_lateral_raise.jpg'),
  },
  shoulders_face_pulls: {
    animationGif: require('../../assets/exercise_animations/12_rear_delt_fly.gif'),
    posterJpg: require('../../assets/poster_crops/12_rear_delt_fly.jpg'),
  },
  shoulders_arnold_press: {
    animationGif: require('../../assets/exercise_animations/09_dumbbell_shoulder_press.gif'),
    posterJpg: require('../../assets/poster_crops/09_dumbbell_shoulder_press.jpg'),
  },

  // Chest
  chest_barbell_bench_press: {
    animationGif: require('../../assets/exercise_animations/02_dumbbell_bench_press.gif'),
    posterJpg: require('../../assets/poster_crops/02_dumbbell_bench_press.jpg'),
  },
  chest_incline_dumbbell_press: {
    animationGif: require('../../assets/exercise_animations/03_incline_dumbbell_press.gif'),
    posterJpg: require('../../assets/poster_crops/03_incline_dumbbell_press.jpg'),
  },
  chest_cable_crossover_fly: {
    animationGif: require('../../assets/exercise_animations/04_dumbbell_fly.gif'),
    posterJpg: require('../../assets/poster_crops/04_dumbbell_fly.jpg'),
  },
  chest_push_up: {
    animationGif: require('../../assets/exercise_animations/01_push_up.gif'),
    posterJpg: require('../../assets/poster_crops/01_push_up.jpg'),
  },

  // Back
  back_barbell_deadlift: {
    animationGif: require('../../assets/exercise_animations/08_deadlift.gif'),
    posterJpg: require('../../assets/poster_crops/08_deadlift.jpg'),
  },
  back_lat_pulldown: {
    animationGif: require('../../assets/exercise_animations/07_lat_pulldown.gif'),
    posterJpg: require('../../assets/poster_crops/07_lat_pulldown.jpg'),
  },
  back_bent_over_row: {
    animationGif: require('../../assets/exercise_animations/06_dumbbell_row.gif'),
    posterJpg: require('../../assets/poster_crops/06_dumbbell_row.jpg'),
  },
  back_one_arm_row: {
    animationGif: require('../../assets/exercise_animations/06_dumbbell_row.gif'),
    posterJpg: require('../../assets/poster_crops/06_dumbbell_row.jpg'),
  },
  back_pull_up: {
    animationGif: require('../../assets/exercise_animations/05_pull_up.gif'),
    posterJpg: require('../../assets/poster_crops/05_pull_up.jpg'),
  },

  // Abs & Core
  abs_straight_arm_crunch: {
    animationGif: require('../../assets/exercise_animations/22_crunch.gif'),
    posterJpg: require('../../assets/poster_crops/22_crunch.jpg'),
  },
  abs_hanging_leg_raise: {
    animationGif: require('../../assets/exercise_animations/23_hanging_leg_raise.gif'),
    posterJpg: require('../../assets/poster_crops/23_hanging_leg_raise.jpg'),
  },
  abs_cable_woodchopper: {
    animationGif: require('../../assets/exercise_animations/24_russian_twist.gif'),
    posterJpg: require('../../assets/poster_crops/24_russian_twist.jpg'),
  },
  abs_plank_hold: {
    animationGif: require('../../assets/exercise_animations/25_plank.gif'),
    posterJpg: require('../../assets/poster_crops/25_plank.jpg'),
  },
  abs_reverse_crunch: {
    animationGif: require('../../assets/exercise_animations/26_reverse_crunch.gif'),
    posterJpg: require('../../assets/poster_crops/26_reverse_crunch.jpg'),
  },

  // Legs & Glutes
  legs_barbell_squat: {
    animationGif: require('../../assets/exercise_animations/17_squat.gif'),
    posterJpg: require('../../assets/poster_crops/17_squat.jpg'),
  },
  legs_romanian_deadlift: {
    animationGif: require('../../assets/exercise_animations/08_deadlift.gif'),
    posterJpg: require('../../assets/poster_crops/08_deadlift.jpg'),
  },
  legs_leg_extension: {
    animationGif: require('../../assets/exercise_animations/19_leg_extension.gif'),
    posterJpg: require('../../assets/poster_crops/19_leg_extension.jpg'),
  },
  legs_standing_calf_raise: {
    animationGif: require('../../assets/exercise_animations/21_calf_raise.gif'),
    posterJpg: require('../../assets/poster_crops/21_calf_raise.jpg'),
  },
  legs_lunge: {
    animationGif: require('../../assets/exercise_animations/18_lunge.gif'),
    posterJpg: require('../../assets/poster_crops/18_lunge.jpg'),
  },
  legs_leg_curl: {
    animationGif: require('../../assets/exercise_animations/20_leg_curl.gif'),
    posterJpg: require('../../assets/poster_crops/20_leg_curl.jpg'),
  },
};

export function getExerciseLocalMedia(exerciseId: string): ExerciseMediaAssets | undefined {
  if (EXERCISE_LOCAL_MEDIA[exerciseId]) {
    return EXERCISE_LOCAL_MEDIA[exerciseId];
  }
  // Try fallback by matching prefix keywords
  const lower = exerciseId.toLowerCase();
  if (lower.includes('squat')) return EXERCISE_LOCAL_MEDIA.legs_barbell_squat;
  if (lower.includes('bench') || lower.includes('chest')) return EXERCISE_LOCAL_MEDIA.chest_barbell_bench_press;
  if (lower.includes('curl') || lower.includes('bicep')) return EXERCISE_LOCAL_MEDIA.arms_barbell_curl;
  if (lower.includes('deadlift')) return EXERCISE_LOCAL_MEDIA.back_barbell_deadlift;
  if (lower.includes('shoulder') || lower.includes('press')) return EXERCISE_LOCAL_MEDIA.shoulders_barbell_overhead_press;
  if (lower.includes('lat') || lower.includes('pull')) return EXERCISE_LOCAL_MEDIA.back_lat_pulldown;
  if (lower.includes('leg_raise') || lower.includes('ab') || lower.includes('crunch')) return EXERCISE_LOCAL_MEDIA.abs_hanging_leg_raise;
  return undefined;
}
