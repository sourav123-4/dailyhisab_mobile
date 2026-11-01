/**
 * How each exercise finds its ExerciseDB V2 demo video (looked up live through the AI proxy; the
 * plan's terms forbid storing the media, and its URLs rotate weekly).
 *
 * `edbId` pins an exercise checked by hand against the free plan's 200-exercise catalogue. The
 * rest are found by name + equipment, which starts working by itself on a paid plan; until then
 * those exercises show the bundled 3D demo.
 */
export type ExerciseVideoLookup = { edbId?: string; name: string; equipment: string };

export const EXERCISE_VIDEO_LOOKUP: Record<string, ExerciseVideoLookup> = {
  arms_barbell_curl: { name: 'Barbell Curl', equipment: 'BARBELL' },
  arms_dumbbell_hammer_curl: { name: 'Dumbbell Hammer Curl', equipment: 'DUMBBELL' },
  arms_incline_dumbbell_curl: { name: 'Incline Curl', equipment: 'DUMBBELL' },
  arms_skullcrushers: { name: 'Skull Crusher', equipment: 'BARBELL' },
  arms_cable_tricep_pushdown: { name: 'Pushdown Rope', equipment: 'CABLE' },
  arms_overhead_tricep_extension: { name: 'Standing Triceps Extension', equipment: 'DUMBBELL' },
  shoulders_barbell_overhead_press: { name: 'Military Press', equipment: 'BARBELL' },
  shoulders_dumbbell_lateral_raise: { edbId: 'exr_41n2hjuGpcex14w7', name: 'Lateral Raise', equipment: 'DUMBBELL' },
  shoulders_face_pulls: { name: 'Face Pull', equipment: 'CABLE' },
  shoulders_arnold_press: { edbId: 'exr_41n2hMRXm49mM62z', name: 'Arnold Press', equipment: 'DUMBBELL' },
  chest_barbell_bench_press: { edbId: 'exr_41n2hxnFMotsXTj3', name: 'Bench Press', equipment: 'BARBELL' },
  chest_incline_dumbbell_press: { edbId: 'exr_41n2hsVHu7B1MTdr', name: 'Incline Bench Press', equipment: 'DUMBBELL' },
  chest_cable_crossover_fly: { name: 'Crossover', equipment: 'CABLE' },
  chest_push_up: { edbId: 'exr_41n2hNXJadYcfjnd', name: 'Push up', equipment: 'BODY WEIGHT' },
  back_barbell_deadlift: { name: 'Deadlift', equipment: 'BARBELL' },
  back_lat_pulldown: { name: 'Lat Pulldown', equipment: 'CABLE' },
  back_bent_over_row: { name: 'Bent Over Row', equipment: 'BARBELL' },
  abs_straight_arm_crunch: { name: 'Straight Arm Crunch', equipment: 'DUMBBELL' },
  abs_hanging_leg_raise: { edbId: 'exr_41n2hMZCmZBvQApL', name: 'Hanging Leg Raise', equipment: 'BODY WEIGHT' },
  abs_cable_woodchopper: { name: 'Wood Chop', equipment: 'CABLE' },
  abs_plank_hold: { edbId: 'exr_41n2hXQw5yAbbXL8', name: 'Front Plank', equipment: 'BODY WEIGHT' },
  legs_barbell_squat: { name: 'Squat', equipment: 'BARBELL' },
  legs_romanian_deadlift: { name: 'Romanian Deadlift', equipment: 'BARBELL' },
  legs_leg_extension: { name: 'Leg Extension', equipment: 'LEVERAGE MACHINE' },
  legs_standing_calf_raise: { edbId: 'exr_41n2hdWu3oaCGdWT', name: 'Standing Calf Raise', equipment: 'DUMBBELL' },
};
