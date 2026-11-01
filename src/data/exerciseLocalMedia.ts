import { ImageSourcePropType } from 'react-native';

export interface ExerciseMediaAssets {
  /** Looping 3D anatomy demo (540×540, 30 fps H.264) rendered for this app; working muscles in red. */
  video: number;
  posterJpg: ImageSourcePropType;
}

export const EXERCISE_LOCAL_MEDIA: Record<string, ExerciseMediaAssets> = {
  arms_barbell_curl: {
    video: require('../../assets/demos/arms_barbell_curl.mp4'),
    posterJpg: require('../../assets/demos/arms_barbell_curl.jpg'),
  },
  arms_dumbbell_hammer_curl: {
    video: require('../../assets/demos/arms_dumbbell_hammer_curl.mp4'),
    posterJpg: require('../../assets/demos/arms_dumbbell_hammer_curl.jpg'),
  },
  arms_incline_dumbbell_curl: {
    video: require('../../assets/demos/arms_incline_dumbbell_curl.mp4'),
    posterJpg: require('../../assets/demos/arms_incline_dumbbell_curl.jpg'),
  },
  arms_skullcrushers: {
    video: require('../../assets/demos/arms_skullcrushers.mp4'),
    posterJpg: require('../../assets/demos/arms_skullcrushers.jpg'),
  },
  arms_cable_tricep_pushdown: {
    video: require('../../assets/demos/arms_cable_tricep_pushdown.mp4'),
    posterJpg: require('../../assets/demos/arms_cable_tricep_pushdown.jpg'),
  },
  arms_overhead_tricep_extension: {
    video: require('../../assets/demos/arms_overhead_tricep_extension.mp4'),
    posterJpg: require('../../assets/demos/arms_overhead_tricep_extension.jpg'),
  },
  shoulders_barbell_overhead_press: {
    video: require('../../assets/demos/shoulders_barbell_overhead_press.mp4'),
    posterJpg: require('../../assets/demos/shoulders_barbell_overhead_press.jpg'),
  },
  shoulders_dumbbell_lateral_raise: {
    video: require('../../assets/demos/shoulders_dumbbell_lateral_raise.mp4'),
    posterJpg: require('../../assets/demos/shoulders_dumbbell_lateral_raise.jpg'),
  },
  shoulders_face_pulls: {
    video: require('../../assets/demos/shoulders_face_pulls.mp4'),
    posterJpg: require('../../assets/demos/shoulders_face_pulls.jpg'),
  },
  shoulders_arnold_press: {
    video: require('../../assets/demos/shoulders_arnold_press.mp4'),
    posterJpg: require('../../assets/demos/shoulders_arnold_press.jpg'),
  },
  chest_barbell_bench_press: {
    video: require('../../assets/demos/chest_barbell_bench_press.mp4'),
    posterJpg: require('../../assets/demos/chest_barbell_bench_press.jpg'),
  },
  chest_incline_dumbbell_press: {
    video: require('../../assets/demos/chest_incline_dumbbell_press.mp4'),
    posterJpg: require('../../assets/demos/chest_incline_dumbbell_press.jpg'),
  },
  chest_cable_crossover_fly: {
    video: require('../../assets/demos/chest_cable_crossover_fly.mp4'),
    posterJpg: require('../../assets/demos/chest_cable_crossover_fly.jpg'),
  },
  chest_push_up: {
    video: require('../../assets/demos/chest_push_up.mp4'),
    posterJpg: require('../../assets/demos/chest_push_up.jpg'),
  },
  back_barbell_deadlift: {
    video: require('../../assets/demos/back_barbell_deadlift.mp4'),
    posterJpg: require('../../assets/demos/back_barbell_deadlift.jpg'),
  },
  back_lat_pulldown: {
    video: require('../../assets/demos/back_lat_pulldown.mp4'),
    posterJpg: require('../../assets/demos/back_lat_pulldown.jpg'),
  },
  back_bent_over_row: {
    video: require('../../assets/demos/back_bent_over_row.mp4'),
    posterJpg: require('../../assets/demos/back_bent_over_row.jpg'),
  },
  abs_straight_arm_crunch: {
    video: require('../../assets/demos/abs_straight_arm_crunch.mp4'),
    posterJpg: require('../../assets/demos/abs_straight_arm_crunch.jpg'),
  },
  abs_hanging_leg_raise: {
    video: require('../../assets/demos/abs_hanging_leg_raise.mp4'),
    posterJpg: require('../../assets/demos/abs_hanging_leg_raise.jpg'),
  },
  abs_cable_woodchopper: {
    video: require('../../assets/demos/abs_cable_woodchopper.mp4'),
    posterJpg: require('../../assets/demos/abs_cable_woodchopper.jpg'),
  },
  abs_plank_hold: {
    video: require('../../assets/demos/abs_plank_hold.mp4'),
    posterJpg: require('../../assets/demos/abs_plank_hold.jpg'),
  },
  legs_barbell_squat: {
    video: require('../../assets/demos/legs_barbell_squat.mp4'),
    posterJpg: require('../../assets/demos/legs_barbell_squat.jpg'),
  },
  legs_romanian_deadlift: {
    video: require('../../assets/demos/legs_romanian_deadlift.mp4'),
    posterJpg: require('../../assets/demos/legs_romanian_deadlift.jpg'),
  },
  legs_leg_extension: {
    video: require('../../assets/demos/legs_leg_extension.mp4'),
    posterJpg: require('../../assets/demos/legs_leg_extension.jpg'),
  },
  legs_standing_calf_raise: {
    video: require('../../assets/demos/legs_standing_calf_raise.mp4'),
    posterJpg: require('../../assets/demos/legs_standing_calf_raise.jpg'),
  },
};

/** Media for exactly this exercise; never another exercise's clip, which would teach the wrong movement. */
export function getExerciseLocalMedia(exerciseId: string): ExerciseMediaAssets | undefined {
  return EXERCISE_LOCAL_MEDIA[exerciseId];
}
