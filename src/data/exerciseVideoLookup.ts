/**
 * ExerciseDB V2 demo video for each exercise, looked up live through the AI proxy (the plan's terms
 * forbid storing the media, and its URLs rotate weekly). Every exercise is pinned to a video from the
 * free plan's catalogue, checked by hand to show the same movement as the exercise in the app.
 */
export type ExerciseVideoLookup = { edbId?: string; name: string; equipment: string };

export const EXERCISE_VIDEO_LOOKUP: Record<string, ExerciseVideoLookup> = {
  arms_barbell_curl: { edbId: 'exr_41n2hXszY7TgwKy4', name: 'Chin-Up', equipment: 'BODY WEIGHT' },
  arms_dumbbell_hammer_curl: { edbId: 'exr_41n2hgCHNgtVLHna', name: 'Cross Body Hammer Curl', equipment: 'DUMBBELL' },
  arms_incline_dumbbell_curl: { edbId: 'exr_41n2hxqpSU5p6DZv', name: 'Biceps Leg Concentration Curl', equipment: 'BODY WEIGHT' },
  arms_skullcrushers: { edbId: 'exr_41n2hdHtZrMPkcqY', name: 'Dumbbell Lying Floor Skull Crusher', equipment: 'DUMBBELL' },
  arms_cable_tricep_pushdown: { edbId: 'exr_41n2hadQgEEX8wDN', name: 'Triceps Dip', equipment: 'BODY WEIGHT' },
  arms_overhead_tricep_extension: { edbId: 'exr_41n2hRZ6fgsLyd77', name: 'Diamond Push-up', equipment: 'BODY WEIGHT' },
  shoulders_barbell_overhead_press: { edbId: 'exr_41n2hs6camM22yBG', name: 'Seated Shoulder Press', equipment: 'DUMBBELL' },
  shoulders_dumbbell_lateral_raise: { edbId: 'exr_41n2hjuGpcex14w7', name: 'Lateral Raise', equipment: 'DUMBBELL' },
  shoulders_face_pulls: { edbId: 'exr_41n2hyNf5GebszTf', name: 'Dumbbell Rear Delt Fly', equipment: 'DUMBBELL' },
  shoulders_arnold_press: { edbId: 'exr_41n2hMRXm49mM62z', name: 'Arnold Press', equipment: 'DUMBBELL' },
  chest_barbell_bench_press: { edbId: 'exr_41n2hxnFMotsXTj3', name: 'Bench Press', equipment: 'BARBELL' },
  chest_incline_dumbbell_press: { edbId: 'exr_41n2hsVHu7B1MTdr', name: 'Incline Bench Press', equipment: 'DUMBBELL' },
  chest_cable_crossover_fly: { edbId: 'exr_41n2hkK8hGAcSnW7', name: 'Chest Dip', equipment: 'BODY WEIGHT' },
  chest_push_up: { edbId: 'exr_41n2hNXJadYcfjnd', name: 'Push up', equipment: 'BODY WEIGHT' },
  back_barbell_deadlift: { edbId: 'exr_41n2hcw2FN534HcA', name: 'Dumbbell Stiff Leg Deadlift', equipment: 'DUMBBELL' },
  back_lat_pulldown: { edbId: 'exr_41n2hftBVLiXgtRQ', name: 'Wide Grip Pull-Up', equipment: 'BODY WEIGHT' },
  back_bent_over_row: { edbId: 'exr_41n2hHdjQpnyNdie', name: 'One Arm Bent-over Row', equipment: 'DUMBBELL' },
  abs_straight_arm_crunch: { edbId: 'exr_41n2hskeb9dXgBoC', name: 'Crunch Floor', equipment: 'BODY WEIGHT' },
  abs_hanging_leg_raise: { edbId: 'exr_41n2hMZCmZBvQApL', name: 'Hanging Leg Raise', equipment: 'BODY WEIGHT' },
  abs_cable_woodchopper: { edbId: 'exr_41n2hWVVEwU54UtF', name: 'Russian Twist', equipment: 'BODY WEIGHT' },
  abs_plank_hold: { edbId: 'exr_41n2hXQw5yAbbXL8', name: 'Front Plank', equipment: 'BODY WEIGHT' },
  legs_barbell_squat: { edbId: 'exr_41n2hQDiSwTZXM4F', name: 'Goblet Squat', equipment: 'DUMBBELL' },
  legs_romanian_deadlift: { edbId: 'exr_41n2hn8rpbYihzEW', name: 'Romanian Deadlift', equipment: 'DUMBBELL' },
  legs_leg_extension: { edbId: 'exr_41n2hpLLs1uU5atr', name: 'Bulgarian Split Squat', equipment: 'BODY WEIGHT' },
  legs_standing_calf_raise: { edbId: 'exr_41n2hdWu3oaCGdWT', name: 'Standing Calf Raise', equipment: 'DUMBBELL' },
};
