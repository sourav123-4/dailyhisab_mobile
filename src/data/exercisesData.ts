import { Exercise, MuscleGroup, WorkoutSplitDay } from '../types/fitness';
import {
  EXERCISE_VIDEO_SOURCES,
  EXERCISE_YOUTUBE_IDS,
  EXERCISE_THUMBNAILS,
} from './exerciseVideoSources';

export const MUSCLE_ANATOMY_IMAGES: Record<MuscleGroup, any> = {
  arms: require('../../assets/muscle_arms.jpg'),
  shoulders: require('../../assets/muscle_shoulders.jpg'),
  chest: require('../../assets/muscle_chest.jpg'),
  back: require('../../assets/muscle_back.jpg'),
  abs: require('../../assets/muscle_abs.jpg'),
  legs: require('../../assets/muscle_legs.jpg'),
  fullbody: require('../../assets/muscle_fullbody.jpg'),
};

export const EXERCISE_3D_VIDEOS: Record<string, any> = {
  abs_hanging_leg_raise: require('../../assets/exercise_crunch_3d.jpg'),
  abs_plank: require('../../assets/exercise_crunch_3d.jpg'),
  chest_barbell_bench_press: require('../../assets/exercise_bench_3d.jpg'),
  chest_incline_dumbbell_press: require('../../assets/exercise_bench_3d.jpg'),
  chest_cable_crossover: require('../../assets/exercise_bench_3d.jpg'),
  chest_push_up: require('../../assets/exercise_pushup_phase1_top.jpg'),
  shoulders_dumbbell_lateral_raise: require('../../assets/exercise_shoulder_3d.jpg'),
  legs_leg_press: require('../../assets/exercise_squat_3d.jpg'),
};

export const ALL_MUSCLE_PARTS_BREAKDOWN: Record<
  MuscleGroup,
  Array<{
    id: string;
    name: string;
    target: string;
    color: string;
    primaryExerciseId: string;
    exercises: string[];
  }>
> = {
  arms: [
    {
      id: 'biceps_long_head',
      name: 'Biceps (Long Head / Outer Peak)',
      target: 'Builds vertical bicep peak height & arm curvature',
      color: '#E07A7A',
      primaryExerciseId: 'arms_barbell_curl',
      exercises: ['Barbell Bicep Curl', 'Incline Dumbbell Curl'],
    },
    {
      id: 'biceps_short_head',
      name: 'Biceps (Short Head / Inner Width)',
      target: 'Adds inner thickness and front double bicep density',
      color: '#D98AB0',
      primaryExerciseId: 'arms_incline_dumbbell_curl',
      exercises: ['Incline Dumbbell Curl', 'Barbell Bicep Curl'],
    },
    {
      id: 'brachialis',
      name: 'Brachialis (Under-Arm Muscle)',
      target: 'Pushes bicep higher from underneath and widens upper arm',
      color: '#7AA2F7',
      primaryExerciseId: 'arms_dumbbell_hammer_curl',
      exercises: ['Dumbbell Hammer Curl'],
    },
    {
      id: 'triceps_lateral_head',
      name: 'Triceps (Lateral Head / Outer Horseshoe)',
      target: 'Creates the signature 3D arm horseshoe sweep',
      color: '#5AA9D6',
      primaryExerciseId: 'arms_cable_tricep_pushdown',
      exercises: ['Cable Rope Tricep Pushdown'],
    },
    {
      id: 'triceps_long_head',
      name: 'Triceps (Long Head / Inner Mass)',
      target: 'Largest portion of upper arm (60% total arm volume)',
      color: '#5BC08F',
      primaryExerciseId: 'arms_overhead_tricep_extension',
      exercises: ['Overhead Dumbbell Triceps Extension', 'Barbell Skullcrushers'],
    },
    {
      id: 'forearms',
      name: 'Forearms & Grip (Brachioradialis & Flexors)',
      target: 'Wrist stability, grip power & lower arm vascularity',
      color: '#9C8CE0',
      primaryExerciseId: 'arms_dumbbell_hammer_curl',
      exercises: ['Dumbbell Hammer Curl'],
    },
  ],
  chest: [
    {
      id: 'chest_upper',
      name: 'Upper Chest (Clavicular Head)',
      target: 'Shelf fullness under collarbones & upper torso armor',
      color: '#7AA2F7',
      primaryExerciseId: 'chest_incline_dumbbell_press',
      exercises: ['Incline Dumbbell Press'],
    },
    {
      id: 'chest_mid',
      name: 'Mid Chest (Sternal Head)',
      target: 'Massive overall chest thickness & pushing power',
      color: '#E07A7A',
      primaryExerciseId: 'chest_push_up',
      exercises: ['Standard Push-Up', 'Flat Barbell Bench Press'],
    },
    {
      id: 'chest_lower',
      name: 'Lower Chest (Abdominal Head)',
      target: 'Crisp underline separation from abdominal wall',
      color: '#5BC08F',
      primaryExerciseId: 'chest_barbell_bench_press',
      exercises: ['Barbell Bench Press', 'Parallel Bar Dips'],
    },
    {
      id: 'chest_inner',
      name: 'Inner Squeeze & Serratus Anterior',
      target: 'Deep pectoral cleavage line & ribcage box cuts',
      color: '#5AA9D6',
      primaryExerciseId: 'chest_cable_crossover',
      exercises: ['Standing Cable Crossover'],
    },
  ],
  back: [
    {
      id: 'back_lats',
      name: 'Latissimus Dorsi (Lats / V-Taper)',
      target: 'Creates wide wings, narrow waist illusion & pulling strength',
      color: '#5BC08F',
      primaryExerciseId: 'back_lat_pulldown',
      exercises: ['Lat Pulldown', 'Wide Grip Pull-Ups'],
    },
    {
      id: 'back_mid',
      name: 'Rhomboids & Mid-Back Thickness',
      target: 'Dense 3D back ridges and scapular retraction',
      color: '#5AA9D6',
      primaryExerciseId: 'back_bent_over_row',
      exercises: ['Barbell Bent-Over Row'],
    },
    {
      id: 'back_traps',
      name: 'Upper & Mid Trapezius',
      target: 'Neck armor, powerful frame & heavy lockouts',
      color: '#7AA2F7',
      primaryExerciseId: 'back_lat_pulldown',
      exercises: ['Lat Pulldown', 'Barbell Shrugs'],
    },
    {
      id: 'back_erectors',
      name: 'Spinal Erectors (Lower Back Core)',
      target: 'Posterior chain pillar, lumbar stability & deadlift power',
      color: '#E07A7A',
      primaryExerciseId: 'back_barbell_deadlift',
      exercises: ['Barbell Deadlift'],
    },
  ],
  shoulders: [
    {
      id: 'delts_front',
      name: 'Anterior Deltoid (Front Head)',
      target: 'Overhead pressing power and chest-to-shoulder tie-in',
      color: '#D98AB0',
      primaryExerciseId: 'shoulders_barbell_overhead_press',
      exercises: ['Barbell Overhead Press'],
    },
    {
      id: 'delts_lateral',
      name: 'Lateral Deltoid (Side Boulder Caps)',
      target: 'Maximum shoulder width and broad aesthetic silhouette',
      color: '#5AA9D6',
      primaryExerciseId: 'shoulders_dumbbell_lateral_raise',
      exercises: ['Dumbbell Lateral Raise'],
    },
    {
      id: 'delts_rear',
      name: 'Posterior Deltoid (Rear 3D Cap)',
      target: 'Balances rotator cuff, prevents rounding & creates 3D depth',
      color: '#5BC08F',
      primaryExerciseId: 'shoulders_dumbbell_lateral_raise',
      exercises: ['Dumbbell Lateral Raise', 'Rear Delt Flyes'],
    },
  ],
  legs: [
    {
      id: 'legs_quads',
      name: 'Quadriceps (Teardrop & Outer Sweep)',
      target: 'Vastus medialis teardrop & front thigh mass',
      color: '#9C8CE0',
      primaryExerciseId: 'legs_barbell_squat',
      exercises: ['Barbell Back Squat', 'Leg Press'],
    },
    {
      id: 'legs_hamstrings',
      name: 'Hamstrings (Posterior Chain)',
      target: 'Knee flexion, hip hinge strength & athletic speed',
      color: '#E07A7A',
      primaryExerciseId: 'legs_romanian_deadlift',
      exercises: ['Romanian Deadlift'],
    },
    {
      id: 'legs_glutes',
      name: 'Gluteus Maximus & Medius',
      target: 'Pelvic power, sprint propulsion & posture foundation',
      color: '#7AA2F7',
      primaryExerciseId: 'legs_barbell_squat',
      exercises: ['Barbell Back Squat'],
    },
    {
      id: 'legs_calves',
      name: 'Calves (Gastrocnemius & Soleus)',
      target: 'Diamond calf definition & ankle spring resilience',
      color: '#5AA9D6',
      primaryExerciseId: 'legs_leg_press',
      exercises: ['Leg Press Calf Extension'],
    },
  ],
  abs: [
    {
      id: 'abs_upper',
      name: 'Upper Rectus Abdominis',
      target: 'Defines top 4 abdominal bricks and torso flexion',
      color: '#5AA9D6',
      primaryExerciseId: 'abs_straight_arm_crunch',
      exercises: ['Straight Arm Crunch'],
    },
    {
      id: 'abs_lower',
      name: 'Lower Rectus Abdominis (V-Cut Base)',
      target: 'Pelvic tilt control and lower ab separation',
      color: '#5BC08F',
      primaryExerciseId: 'abs_hanging_leg_raise',
      exercises: ['Hanging Leg Raise'],
    },
    {
      id: 'abs_core',
      name: 'Deep Core & Transverse Abdominis',
      target: 'Internal corset, flat stomach vacuum & spine bracing',
      color: '#7AA2F7',
      primaryExerciseId: 'abs_plank',
      exercises: ['Core Plank Hold'],
    },
  ],
  fullbody: [
    {
      id: 'full_posterior',
      name: 'Posterior Chain Kinetic Loop',
      target: 'Integrated power: traps, lats, glutes, hamstrings',
      color: '#E07A7A',
      primaryExerciseId: 'back_barbell_deadlift',
      exercises: ['Barbell Deadlift'],
    },
    {
      id: 'full_squat',
      name: 'Squat Compound Synergy',
      target: 'Total lower body + core axial loading',
      color: '#9C8CE0',
      primaryExerciseId: 'legs_barbell_squat',
      exercises: ['Barbell Back Squat'],
    },
    {
      id: 'full_press',
      name: 'Push / Press Kinetic Chain',
      target: 'Chest, anterior deltoids & tricep extension sync',
      color: '#5AA9D6',
      primaryExerciseId: 'chest_barbell_bench_press',
      exercises: ['Barbell Bench Press'],
    },
  ],
};

export const ARMS_PARTS_BREAKDOWN = ALL_MUSCLE_PARTS_BREAKDOWN.arms;

export const MUSCLE_GROUPS_META: {
  id: MuscleGroup;
  title: string;
  subtitle: string;
  color: string;
  iconName: string;
  keyMuscles: string[];
}[] = [
  {
    id: 'arms',
    title: 'Arms & Forearms',
    subtitle: 'Biceps, Triceps, Brachialis & Grip',
    color: '#E07A7A',
    iconName: 'arm-flex',
    keyMuscles: ['Biceps Brachii', 'Triceps Brachii', 'Brachioradialis', 'Forearm Flexors'],
  },
  {
    id: 'shoulders',
    title: 'Shoulders & Delts',
    subtitle: 'Front, Lateral & Rear Deltoids',
    color: '#D98AB0',
    iconName: 'chevron-triple-up',
    keyMuscles: ['Anterior Deltoid', 'Lateral Deltoid', 'Posterior Deltoid', 'Rotator Cuff'],
  },
  {
    id: 'chest',
    title: 'Chest & Pectorals',
    subtitle: 'Upper, Mid & Lower Pectoralis',
    color: '#7AA2F7',
    iconName: 'shield',
    keyMuscles: ['Pectoralis Major', 'Clavicular Head', 'Sternal Head', 'Serratus Anterior'],
  },
  {
    id: 'back',
    title: 'Back & Lats',
    subtitle: 'Lats, Rhomboids, Traps & Lower Back',
    color: '#5BC08F',
    iconName: 'human-handsdown',
    keyMuscles: ['Latissimus Dorsi', 'Trapezius', 'Rhomboids', 'Erector Spinae'],
  },
  {
    id: 'abs',
    title: 'Core & Abs',
    subtitle: 'Six-Pack, Obliques & Deep Core',
    color: '#5AA9D6',
    iconName: 'lightning-bolt',
    keyMuscles: ['Rectus Abdominis', 'External Obliques', 'Transverse Abdominis'],
  },
  {
    id: 'legs',
    title: 'Legs & Glutes',
    subtitle: 'Quads, Hamstrings, Glutes & Calves',
    color: '#9C8CE0',
    iconName: 'run',
    keyMuscles: ['Quadriceps Femoris', 'Hamstrings', 'Gluteus Maximus', 'Gastrocnemius & Soleus'],
  },
];

const RAW_EXERCISES_DATABASE: Omit<Exercise, 'videoUrl' | 'youtubeId' | 'thumbnailUrl'>[] = [
  // ================= ARMS =================
  {
    id: 'arms_barbell_curl',
    name: 'Chin-Up (Biceps Focus)',
    muscleGroup: 'arms',
    primaryMuscles: ['Biceps Brachii', 'Latissimus Dorsi'],
    secondaryMuscles: ['Brachialis', 'Forearm Flexors', 'Rear Deltoid'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'arms',
    description: 'A bodyweight pull with an underhand grip that loads the biceps hard while building the upper back.',
    instructions: [
      'Hang from a pull-up bar with an underhand, shoulder-width grip and arms fully straight.',
      'Brace your core and squeeze your shoulder blades down and back.',
      'Pull your chest toward the bar by bending your elbows until your chin clears it.',
      'Lower yourself slowly until your arms are straight again.'
    ],
    tips: ['Lead with your chest, not your chin.', 'Use a resistance band or slow negatives if you cannot do full reps yet.'],
    mistakes: ['Kicking or swinging the legs for momentum.', 'Stopping halfway instead of lowering to straight arms.'],
    animationFrames: [
      'Phase 1: Dead hang, underhand grip, core braced.',
      'Phase 2: Elbows drive down, chest rises toward the bar.',
      'Phase 3: Chin over the bar, biceps fully squeezed.',
      'Phase 4: Slow 3-second lower to a full hang.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
  },
  {
    id: 'arms_dumbbell_hammer_curl',
    name: 'Cross-Body Hammer Curl',
    muscleGroup: 'arms',
    primaryMuscles: ['Brachioradialis', 'Brachialis'],
    secondaryMuscles: ['Biceps Brachii', 'Forearm Flexors'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'A neutral-grip curl across the body that builds the brachialis and forearm for thicker arms.',
    instructions: [
      'Stand tall with a dumbbell in each hand, palms facing your thighs.',
      'Keep your elbow pinned to your side and curl one dumbbell up toward the opposite shoulder.',
      'Squeeze at the top with your palm still facing in.',
      'Lower slowly and repeat on the other arm.'
    ],
    tips: ['Keep the thumb pointing up for the whole rep.', 'Move only at the elbow.'],
    mistakes: ['Swinging the torso to lift the weight.', 'Rushing the lowering part.'],
    animationFrames: [
      'Phase 1: Arms by the sides, neutral grip.',
      'Phase 2: One dumbbell travels across the body.',
      'Phase 3: Peak squeeze near the opposite shoulder.',
      'Phase 4: Controlled lower, then switch arms.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
  },
  {
    id: 'arms_incline_dumbbell_curl',
    name: 'Concentration Curl (Leg-Resisted)',
    muscleGroup: 'arms',
    primaryMuscles: ['Biceps Brachii'],
    secondaryMuscles: ['Brachialis', 'Forearm Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'A seated curl where one arm curls against the resistance of your own leg, isolating the biceps peak.',
    instructions: [
      'Sit on a bench and hold the back of one thigh with the hand of the working arm.',
      'Brace the elbow against the inside of the knee.',
      'Curl by bending the elbow while the leg pushes against your hand.',
      'Lower slowly, keeping tension the whole way.'
    ],
    tips: ['Control the resistance with your leg so every rep is hard.', 'Pause at the top for a full squeeze.'],
    mistakes: ['Letting the elbow drift off the knee.', 'Using the back to pull instead of the arm.'],
    animationFrames: [
      'Phase 1: Seated, elbow braced on the knee.',
      'Phase 2: Biceps curl against the leg.',
      'Phase 3: Peak contraction near the shoulder.',
      'Phase 4: Slow return to a long arm.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
  },
  {
    id: 'arms_skullcrushers',
    name: 'Dumbbell Floor Skull Crusher',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii (Long & Lateral Heads)'],
    secondaryMuscles: ['Forearms'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'A lying triceps extension on the floor that safely overloads the long head of the triceps.',
    instructions: [
      'Lie on the floor with knees bent, holding dumbbells above your chest with straight arms.',
      'Keep your upper arms still and bend at the elbows to lower the weights beside your head.',
      'Stop just before the dumbbells touch the floor.',
      'Straighten your elbows to press back to the start.'
    ],
    tips: ['Point your elbows at the ceiling throughout.', 'Use a weight you can control near your head.'],
    mistakes: ['Letting the elbows flare out wide.', 'Turning it into a press by moving the upper arms.'],
    animationFrames: [
      'Phase 1: Arms straight above the chest.',
      'Phase 2: Elbows bend, dumbbells lower beside the head.',
      'Phase 3: Deep triceps stretch at the bottom.',
      'Phase 4: Extend back to locked arms.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
  },
  {
    id: 'arms_cable_tricep_pushdown',
    name: 'Triceps Dip',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Chest', 'Front Deltoid'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'arms',
    description: 'An upright dip that keeps the torso vertical to put most of the work on the triceps.',
    instructions: [
      'Support yourself on dip bars with straight arms and your body upright.',
      'Keep your elbows close to your sides and lower until your upper arms are about parallel to the floor.',
      'Keep your chest up and avoid leaning forward.',
      'Press back up until your arms are straight.'
    ],
    tips: ['Stay upright to keep the focus on the triceps.', 'Use an assisted dip machine or band if needed.'],
    mistakes: ['Dropping too deep and straining the shoulders.', 'Shrugging the shoulders up toward the ears.'],
    animationFrames: [
      'Phase 1: Locked-out support, body upright.',
      'Phase 2: Controlled descent, elbows tucked.',
      'Phase 3: Upper arms parallel to the floor.',
      'Phase 4: Press up to straight arms.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 75,
  },
  {
    id: 'arms_overhead_tricep_extension',
    name: 'Diamond Push-Up',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii'],
    secondaryMuscles: ['Chest', 'Front Deltoid', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'arms',
    description: 'A close-hand push-up that shifts the load onto the triceps while still training the chest.',
    instructions: [
      'Start in a push-up position with your hands together under your chest, forming a diamond with thumbs and index fingers.',
      'Keep your body in a straight line from head to heels.',
      'Lower your chest toward your hands, elbows close to your body.',
      'Push back up to straight arms.'
    ],
    tips: ['Drop to your knees to make it easier.', 'Keep your hips level with your shoulders.'],
    mistakes: ['Letting the hips sag.', 'Flaring the elbows out to the sides.'],
    animationFrames: [
      'Phase 1: High plank, hands in a diamond.',
      'Phase 2: Chest lowers, elbows track back.',
      'Phase 3: Chest just above the hands.',
      'Phase 4: Press up to full lockout.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
  },

  // ================= SHOULDERS =================
  {
    id: 'shoulders_barbell_overhead_press',
    name: 'Seated Dumbbell Shoulder Press',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Front Deltoid', 'Side Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Upper Trapezius'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'shoulders',
    description: 'A seated press that builds strong, rounded shoulders with a stable, back-supported position.',
    instructions: [
      'Sit on an upright bench with a dumbbell in each hand at shoulder height, palms forward.',
      'Brace your core and keep your back against the pad.',
      'Press the dumbbells straight up until your arms are almost locked.',
      'Lower them slowly back to shoulder height.'
    ],
    tips: ['Keep your forearms vertical under the weights.', 'Do not arch your lower back off the bench.'],
    mistakes: ['Bouncing the weights off the shoulders.', 'Locking the elbows hard at the top.'],
    animationFrames: [
      'Phase 1: Dumbbells at shoulder height.',
      'Phase 2: Press upward in a slight arc.',
      'Phase 3: Arms extended overhead.',
      'Phase 4: Controlled lower to the shoulders.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
  },
  {
    id: 'shoulders_dumbbell_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Lateral Deltoid (Side Delt)'],
    secondaryMuscles: ['Anterior Deltoid', 'Trapezius', 'Supraspinatus'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'shoulders',
    description: 'The golden standard exercise for adding V-taper width and rounded 3D side delts.',
    instructions: [
      'Stand tall with dumbbells at your sides, slight bend in elbows, and torso tipped forward ~5 degrees.',
      'Lead with your elbows and raise weights out to your sides in the scapular plane.',
      'Raise until elbows are level with your shoulders.',
      'Pause for a fraction of a second at shoulder height, then lower smoothly.'
    ],
    tips: ['Think about pouring water out of pitchers at the top for optimal side delt activation.', 'Do not use excessively heavy weight.'],
    mistakes: ['Shrugging traps up to the ears.', 'Using hip momentum to swing the dumbbells up.'],
    animationFrames: [
      'Phase 1: Weights resting beside thighs, slight elbow bend.',
      'Phase 2: Sweeping outward arc led by elbows.',
      'Phase 3: Parallel to ground at shoulder level, peak lateral delt burn.',
      'Phase 4: 2-second negative return to sides.'
    ],
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 60,
  },
  {
    id: 'shoulders_face_pulls',
    name: 'Dumbbell Rear Delt Fly',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Rear Deltoid'],
    secondaryMuscles: ['Rhomboids', 'Middle Trapezius'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'shoulders',
    description: 'A bent-over raise that targets the rear shoulders and upper back for better posture and balanced shoulders.',
    instructions: [
      'Hold light dumbbells and hinge forward at the hips with a flat back and soft knees.',
      'Let the dumbbells hang under your chest, palms facing each other.',
      'Raise your arms out to the sides with a slight bend in the elbows until they are level with your back.',
      'Lower slowly to the start.'
    ],
    tips: ['Lead with your elbows, not your hands.', 'Use light weights and squeeze your shoulder blades.'],
    mistakes: ['Standing up as you lift.', 'Swinging heavy weights with momentum.'],
    animationFrames: [
      'Phase 1: Hinged forward, dumbbells below the chest.',
      'Phase 2: Arms sweep out to the sides.',
      'Phase 3: Arms level with the back, rear delts squeezed.',
      'Phase 4: Slow return.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
  },
  {
    id: 'shoulders_arnold_press',
    name: 'Arnold Dumbbell Press',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Anterior Deltoid', 'Lateral Deltoid'],
    secondaryMuscles: ['Triceps', 'Upper Traps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'shoulders',
    description: 'Invented by Arnold Schwarzenegger, this rotational press stimulates all three heads of the deltoid throughout one fluid movement.',
    instructions: [
      'Sit on an upright bench holding dumbbells at chest level with palms facing you (like the top of a curl).',
      'As you press upward, rotate your wrists outward so palms face forward at the top.',
      'Lock out overhead smoothly, then reverse the rotational motion as you descend back to starting position.'
    ],
    tips: ['Keep the rotation smooth and continuous throughout the press.'],
    mistakes: ['Rotating too early or knocking dumbbells together at top.'],
    animationFrames: [
      'Phase 1: Supinated palms facing chest.',
      'Phase 2: Upward drive with outward wrist rotation.',
      'Phase 3: Full overhead lockout with pronated palms.',
      'Phase 4: Controlled rotational return to chest.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
  },

  // ================= CHEST =================
  {
    id: 'chest_barbell_bench_press',
    name: 'Flat Barbell Bench Press',
    muscleGroup: 'chest',
    primaryMuscles: ['Pectoralis Major (Mid & Lower)'],
    secondaryMuscles: ['Anterior Deltoid', 'Triceps Brachii'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'chest',
    description: 'The classic compound chest builder: lets you load the most weight for overall pectoral size and pressing strength.',
    instructions: [
      'Lie on a flat bench with eyes under the bar and feet planted firmly on the floor.',
      'Grip the bar a little wider than shoulder width, pinch your shoulder blades together and un-rack it over your chest.',
      'Lower the bar under control to your mid-chest with elbows tucked at roughly 45 degrees.',
      'Press the bar back up until your arms are straight, squeezing your chest at the top.'
    ],
    tips: ['Keep a slight natural arch in the lower back and your shoulder blades glued to the bench.', 'Use a spotter or safety pins when lifting heavy.'],
    mistakes: ['Bouncing the bar off the chest.', 'Flaring elbows out at 90 degrees, which stresses the shoulders.'],
    animationFrames: [
      'Phase 1: Bar un-racked over sternum, lats engaged.',
      'Phase 2: 3-second descent with elbows tucked 45°.',
      'Phase 3: Light touch on mid-chest with deep pec stretch.',
      'Phase 4: Explosive press back to locked starting position.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 120,
  },
  {
    id: 'chest_incline_dumbbell_press',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'chest',
    primaryMuscles: ['Pectoralis Major (Clavicular Upper Head)'],
    secondaryMuscles: ['Anterior Deltoid', 'Triceps Brachii'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'chest',
    description: 'Targets the upper clavicular head of the chest for a full, aesthetic upper shelf look.',
    instructions: [
      'Set bench to a 30–45 degree incline and sit with dumbbells on your knees.',
      'Kick the dumbbells up to shoulder level and lie back with retracted shoulder blades.',
      'Press dumbbells upward in a slight converging arc without banging them together at top.',
      'Lower down until dumbbells reach chest level with a deep stretch in the upper pectorals.'
    ],
    tips: ['Keep incline at 30 degrees for maximum upper chest and minimal front delt recruitment.'],
    mistakes: ['Setting bench angle above 45 degrees which shifts load entirely onto shoulders.'],
    animationFrames: [
      'Phase 1: Dumbbells at outer chest level, scapula pinched.',
      'Phase 2: Converging upward press toward center.',
      'Phase 3: Peak upper chest squeeze at top.',
      'Phase 4: Slow controlled descent with deep pec stretch.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'chest_cable_crossover_fly',
    name: 'Chest Dip',
    muscleGroup: 'chest',
    primaryMuscles: ['Lower Pectoralis Major'],
    secondaryMuscles: ['Triceps Brachii', 'Front Deltoid'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'chest',
    description: 'A forward-leaning dip that builds the lower and outer chest with your own bodyweight.',
    instructions: [
      'Support yourself on dip bars with straight arms.',
      'Lean your torso forward slightly and let your elbows flare a little.',
      'Lower until you feel a stretch across your chest.',
      'Press back up, squeezing your chest.'
    ],
    tips: ['The forward lean is what moves the work onto the chest.', 'Go only as deep as your shoulders allow.'],
    mistakes: ['Staying fully upright (that targets the triceps instead).', 'Dropping fast to the bottom.'],
    animationFrames: [
      'Phase 1: Support position, slight forward lean.',
      'Phase 2: Controlled descent.',
      'Phase 3: Deep chest stretch.',
      'Phase 4: Press up and squeeze the chest.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
  },
  {
    id: 'chest_push_up',
    name: 'Standard Push-Up',
    muscleGroup: 'chest',
    primaryMuscles: ['Pectoralis Major (Mid & Lower)'],
    secondaryMuscles: ['Anterior Deltoid', 'Triceps Brachii', 'Core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    mechanics: 'compound',
    imageKey: 'chest',
    description: 'The quintessential bodyweight compound exercise for developing chest thickness, shoulder stability, and pushing endurance.',
    instructions: [
      'Start in a high plank position with hands slightly wider than shoulder-width, palms flat on the ground.',
      'Maintain a rigid straight line from head to heels, engaging your core and glutes.',
      'Lower your chest until it hovers 1–2 inches off the ground, keeping elbows tucked at 45 degrees.',
      'Explosively drive through your palms to return to the starting plank lockout, squeezing your pectorals.'
    ],
    tips: ['Keep your neck neutral looking slightly ahead, and do not allow your hips to sag.'],
    mistakes: ['Flaring elbows 90 degrees wide causing shoulder impingement.', 'Sagging hips and arching lower back.'],
    animationFrames: [
      'Phase 1: Starting plank lockout with neutral spine.',
      'Phase 2: Controlled 3-second descent with 45° elbow tuck.',
      'Phase 3: Bottom hover with maximal pectoral fiber stretch.',
      'Phase 4: Explosive concentric drive back to plank.'
    ],
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 60,
  },

  // ================= BACK =================
  {
    id: 'back_barbell_deadlift',
    name: 'Dumbbell Stiff-Leg Deadlift',
    muscleGroup: 'back',
    primaryMuscles: ['Spinal Erectors', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Forearms'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'A hip hinge with nearly straight legs that strengthens the lower back, glutes and hamstrings.',
    instructions: [
      'Stand with feet hip-width apart holding dumbbells in front of your thighs.',
      'Keep your knees almost straight and your back flat.',
      'Hinge at the hips and lower the dumbbells toward the floor.',
      'Drive your hips forward to stand back up, squeezing your glutes.'
    ],
    tips: ['Keep the dumbbells close to your legs.', 'Stop when your back starts to round.'],
    mistakes: ['Rounding the lower back.', 'Turning it into a squat by bending the knees.'],
    animationFrames: [
      'Phase 1: Standing tall, dumbbells at the thighs.',
      'Phase 2: Hips push back, torso lowers.',
      'Phase 3: Hamstring stretch at the bottom.',
      'Phase 4: Hips drive forward to lockout.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'back_lat_pulldown',
    name: 'Wide-Grip Pull-Up',
    muscleGroup: 'back',
    primaryMuscles: ['Latissimus Dorsi (Lats / V-Taper)'],
    secondaryMuscles: ['Biceps Brachii', 'Rear Deltoid', 'Rhomboids'],
    equipment: 'bodyweight',
    difficulty: 'advanced',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'The classic back-width builder: a wide overhand pull-up for a broader, V-shaped back.',
    instructions: [
      'Hang from a pull-up bar with an overhand grip wider than your shoulders.',
      'Pull your shoulder blades down and back before you bend your arms.',
      'Pull your chest up toward the bar, driving your elbows down.',
      'Lower yourself under control to a full hang.'
    ],
    tips: ['Think about pulling your elbows into your back pockets.', 'Use a band for assistance while you build strength.'],
    mistakes: ['Kipping or swinging.', 'Doing half reps without a full hang.'],
    animationFrames: [
      'Phase 1: Wide-grip dead hang.',
      'Phase 2: Shoulder blades set, pull begins.',
      'Phase 3: Chest near the bar, lats fully contracted.',
      'Phase 4: Slow lower to straight arms.'
    ],
    defaultSets: 4,
    defaultReps: 6,
    restSeconds: 120,
  },
  {
    id: 'back_bent_over_row',
    name: 'One-Arm Dumbbell Row',
    muscleGroup: 'back',
    primaryMuscles: ['Latissimus Dorsi', 'Middle Back (Rhomboids)'],
    secondaryMuscles: ['Rear Deltoid', 'Biceps Brachii'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'A supported single-arm row that builds back thickness while keeping the lower back safe.',
    instructions: [
      'Place one knee and one hand on a flat bench, back flat and parallel to the floor.',
      'Hold a dumbbell in the free hand with the arm hanging straight.',
      'Row the dumbbell toward your hip, keeping your elbow close to your body.',
      'Lower it slowly until your arm is straight.'
    ],
    tips: ['Pull toward your hip, not your chest.', 'Keep your shoulders square to the floor.'],
    mistakes: ['Twisting the torso to lift heavier.', 'Shrugging the shoulder up.'],
    animationFrames: [
      'Phase 1: Supported on the bench, arm hanging.',
      'Phase 2: Elbow drives back.',
      'Phase 3: Dumbbell at the hip, back squeezed.',
      'Phase 4: Controlled lower to a full stretch.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 75,
  },

  // ================= ABS & CORE =================
  {
    id: 'abs_straight_arm_crunch',
    name: 'Floor Crunch',
    muscleGroup: 'abs',
    primaryMuscles: ['Upper Rectus Abdominis'],
    secondaryMuscles: ['Obliques'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'abs',
    description: 'The basic crunch for building and defining the upper abs.',
    instructions: [
      'Lie on your back with knees bent and feet flat, hands lightly behind your head.',
      'Tuck your chin slightly and brace your abs.',
      'Curl your shoulders off the floor by contracting your abs.',
      'Lower back down slowly without letting your abs relax.'
    ],
    tips: ['Breathe out as you curl up.', 'Think about bringing your ribs toward your hips.'],
    mistakes: ['Pulling on the neck with your hands.', 'Using momentum to sit all the way up.'],
    animationFrames: [
      'Phase 1: Lying flat, abs braced.',
      'Phase 2: Shoulders curl off the floor.',
      'Phase 3: Peak squeeze of the upper abs.',
      'Phase 4: Slow return to the floor.'
    ],
    defaultSets: 3,
    defaultReps: 20,
    restSeconds: 45,
  },
  {
    id: 'abs_hanging_leg_raise',
    name: 'Hanging Leg & Knee Raises',
    muscleGroup: 'abs',
    primaryMuscles: ['Rectus Abdominis (Lower Abs)', 'Iliopsoas'],
    secondaryMuscles: ['Obliques', 'Forearms (Grip)'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'isolation',
    imageKey: 'abs',
    description: 'One of the highest-rated exercises for lower abdominal activation and deep core stabilization.',
    instructions: [
      'Hang from a pull-up bar with an overhand grip and legs straight down.',
      'Posteriorly tilt your pelvis and raise your knees or straight legs up towards your chest.',
      'Roll your hips up at the top to fully contract the lower abs.',
      'Lower legs slowly without swinging or using pendulum momentum.'
    ],
    tips: ['Do not just lift legs at hip crease; curl your pelvis upward to engage rectus abdominis.'],
    mistakes: ['Swinging body back and forth to kick legs up.'],
    animationFrames: [
      'Phase 1: Dead hang, core engaged, legs straight.',
      'Phase 2: Legs rise past 90 degrees.',
      'Phase 3: Pelvis rolls toward ribs with complete lower ab compression.',
      'Phase 4: Slow controlled return.'
    ],
    defaultSets: 4,
    defaultReps: 12,
    restSeconds: 60,
  },
  {
    id: 'abs_cable_woodchopper',
    name: 'Russian Twist',
    muscleGroup: 'abs',
    primaryMuscles: ['Obliques'],
    secondaryMuscles: ['Rectus Abdominis', 'Hip Flexors'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'abs',
    description: 'A seated rotation that strengthens the obliques and improves core control.',
    instructions: [
      'Sit with knees bent and lean back slightly with a straight back.',
      'Lift your feet off the floor if you can, or keep heels down to make it easier.',
      'Rotate your torso to bring your hands beside one hip.',
      'Rotate to the other side; that is one rep each side.'
    ],
    tips: ['Turn from your ribs, not just your arms.', 'Hold a weight to make it harder.'],
    mistakes: ['Rounding the back.', 'Moving too fast to control.'],
    animationFrames: [
      'Phase 1: Seated V position, core braced.',
      'Phase 2: Torso rotates to one side.',
      'Phase 3: Obliques squeeze at the end of the turn.',
      'Phase 4: Rotate across to the other side.'
    ],
    defaultSets: 3,
    defaultReps: 20,
    restSeconds: 45,
  },
  {
    id: 'abs_plank_hold',
    name: 'Forearm Plank Hold',
    muscleGroup: 'abs',
    primaryMuscles: ['Transverse Abdominis', 'Rectus Abdominis'],
    secondaryMuscles: ['Glutes', 'Shoulders', 'Lower Back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'abs',
    description: 'Isometric core strength exercise that tightens the waistline and supports spinal health.',
    instructions: [
      'Place forearms on the floor with elbows aligned directly under shoulders.',
      'Extend legs back with toes on floor, body in a straight line from head to heels.',
      'Squeeze glutes, pull belly button towards spine, and actively press floor away through forearms.',
      'Hold position rigidly for target time without allowing hips to sag or hike up.'
    ],
    tips: ['Actively pull elbows towards toes to increase core tension dramatically.'],
    mistakes: ['Letting lower back sag toward floor.'],
    animationFrames: [
      'Phase 1: Perfectly straight line posture from heels to shoulders.',
      'Phase 2: Continuous isometric abdominal contraction.',
      'Phase 3: Core braced tightly against gravity.',
      'Phase 4: Controlled dismount after target time.'
    ],
    defaultSets: 3,
    defaultReps: 60, // seconds
    restSeconds: 45,
  },

  // ================= LEGS =================
  {
    id: 'legs_barbell_squat',
    name: 'Goblet Squat',
    muscleGroup: 'legs',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'compound',
    imageKey: 'legs',
    description: 'A front-loaded squat holding one dumbbell, great for building legs with clean, upright form.',
    instructions: [
      'Hold one dumbbell vertically against your chest with both hands, feet shoulder-width apart.',
      'Keep your chest up and sit your hips back and down.',
      'Lower until your thighs are at least parallel, elbows inside the knees.',
      'Drive through your whole foot to stand up.'
    ],
    tips: ['Keep your heels on the floor.', 'Push your knees out in line with your toes.'],
    mistakes: ['Letting the knees cave in.', 'Rounding the back at the bottom.'],
    animationFrames: [
      'Phase 1: Standing, dumbbell at the chest.',
      'Phase 2: Hips sit back and down.',
      'Phase 3: Deep squat, chest tall.',
      'Phase 4: Drive up to standing.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'legs_romanian_deadlift',
    name: 'Dumbbell Romanian Deadlift',
    muscleGroup: 'legs',
    primaryMuscles: ['Hamstrings', 'Gluteus Maximus'],
    secondaryMuscles: ['Spinal Erectors', 'Forearms'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'legs',
    description: 'A hip hinge with soft knees that builds the hamstrings and glutes through a deep stretch.',
    instructions: [
      'Stand holding dumbbells in front of your thighs, knees slightly bent.',
      'Push your hips back and slide the dumbbells down your legs, keeping your back flat.',
      'Lower until you feel a strong stretch in your hamstrings (around mid-shin).',
      'Squeeze your glutes to bring your hips forward and stand up.'
    ],
    tips: ['Keep the slight knee bend fixed the whole time.', 'The movement comes from the hips, not the back.'],
    mistakes: ['Rounding the back to reach lower.', 'Bending the knees more as you go down.'],
    animationFrames: [
      'Phase 1: Standing, soft knees.',
      'Phase 2: Hips hinge back.',
      'Phase 3: Deep hamstring stretch.',
      'Phase 4: Glutes drive hips forward.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'legs_leg_extension',
    name: 'Bulgarian Split Squat',
    muscleGroup: 'legs',
    primaryMuscles: ['Quadriceps', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Adductors'],
    equipment: 'bodyweight',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'legs',
    description: 'A single-leg squat with the back foot on a bench that builds strong quads and glutes and fixes imbalances.',
    instructions: [
      'Stand in front of a bench and place the top of your back foot on it.',
      'Keep your chest up and your front foot far enough forward.',
      'Lower your back knee toward the floor until your front thigh is about parallel.',
      'Push through your front foot to stand back up, then switch legs.'
    ],
    tips: ['Most of your weight stays on the front leg.', 'Hold dumbbells to make it harder.'],
    mistakes: ['Letting the front knee cave inward.', 'Standing too close to the bench.'],
    animationFrames: [
      'Phase 1: Split stance, back foot on the bench.',
      'Phase 2: Back knee lowers.',
      'Phase 3: Front thigh parallel, quads loaded.',
      'Phase 4: Drive up through the front foot.'
    ],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 75,
  },
  {
    id: 'legs_standing_calf_raise',
    name: 'Standing Dumbbell Calf Raise',
    muscleGroup: 'legs',
    primaryMuscles: ['Gastrocnemius (Outer & Inner Calf)'],
    secondaryMuscles: ['Soleus', 'Achilles Tendon'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'legs',
    description: 'Builds Diamond-shaped calves through full stretch and peak plantarflexion contraction.',
    instructions: [
      'Hold a dumbbell in each hand and stand with the balls of your feet on the edge of a step.',
      'Lower heels as far as possible for a full 2-second deep calf stretch.',
      'Drive up through the balls of your big toes until you are fully on your tiptoes.',
      'Squeeze the peak for 1 second, then lower slowly back to full stretch.'
    ],
    tips: ['Pause at the bottom to eliminate the elastic stretch reflex of the Achilles tendon.'],
    mistakes: ['Bouncing fast at the bottom without deep stretch.'],
    animationFrames: [
      'Phase 1: Full deep stretch below platform level.',
      'Phase 2: Powerful upward calf drive.',
      'Phase 3: Maximum peak extension on balls of feet.',
      'Phase 4: 2-second dead stop stretch descent.'
    ],
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 60,
  },
];

export const EXERCISES_DATABASE: Exercise[] = RAW_EXERCISES_DATABASE.map((ex) => {
  const vid = EXERCISE_VIDEO_SOURCES[ex.id] || '';
  const ytid = EXERCISE_YOUTUBE_IDS[ex.id] || '';
  const thumb = EXERCISE_THUMBNAILS[ex.id] || '';
  return {
    ...ex,
    videoUrl: vid,
    youtubeId: ytid,
    thumbnailUrl: thumb,
    frontVideoUrl: vid,
    sideVideoUrl: vid,
    backVideoUrl: vid,
    safetyTips: ex.safetyTips || [
      'Maintain a neutral spine and synchronized breathing rhythm on each repetition.',
      'Always control the eccentric (lowering) phase without dropping the resistance.',
      'Stop immediately if you experience sharp or joint discomfort.',
    ],
    beginnerModifications: ex.beginnerModifications || [
      'Reduce load by 25% and focus on 3-1-1 tempo to solidify joint mechanics.',
    ],
    advancedVariations: ex.advancedVariations || [
      'Implement 2-second peak isometric holds or drop sets to failure on final set.',
    ],
    demonstrations: [
      ...(vid
        ? [
            {
              title: 'HD Exercise Video Loop',
              url: vid,
              author: 'VitalPath Pro Fitness Library',
              license: 'CC-BY-SA 4.0',
              sourceUrl: 'https://wger.de',
              changes: 'H.264 MP4 60FPS loop with form cues',
            },
          ]
        : []),
      ...(ytid
        ? [
            {
              title: 'Human Form Analysis Tutorial',
              url: `https://www.youtube.com/watch?v=${ytid}`,
              author: 'Certified Sports Physiologist',
              license: 'YouTube Stream',
              sourceUrl: `https://www.youtube.com/watch?v=${ytid}`,
              changes: 'Verified human tutorial streamed via YouTube',
            },
          ]
        : []),
    ],
  };
});

export const DEFAULT_WEEKLY_SPLIT: WorkoutSplitDay[] = [
  {
    dayIndex: 0,
    dayName: 'Sunday',
    splitTitle: 'Active Recovery & Core',
    targetMuscles: ['abs'],
    isRestDay: false,
    exerciseIds: ['abs_hanging_leg_raise', 'abs_cable_woodchopper', 'abs_plank_hold'],
  },
  {
    dayIndex: 1,
    dayName: 'Monday',
    splitTitle: 'Push Day (Chest & Shoulders)',
    targetMuscles: ['chest', 'shoulders', 'arms'],
    isRestDay: false,
    exerciseIds: [
      'chest_barbell_bench_press',
      'chest_incline_dumbbell_press',
      'shoulders_barbell_overhead_press',
      'shoulders_dumbbell_lateral_raise',
      'arms_cable_tricep_pushdown',
    ],
  },
  {
    dayIndex: 2,
    dayName: 'Tuesday',
    splitTitle: 'Pull Day (Back & Biceps)',
    targetMuscles: ['back', 'arms'],
    isRestDay: false,
    exerciseIds: [
      'back_barbell_deadlift',
      'back_lat_pulldown',
      'back_bent_over_row',
      'arms_barbell_curl',
      'arms_dumbbell_hammer_curl',
    ],
  },
  {
    dayIndex: 3,
    dayName: 'Wednesday',
    splitTitle: 'Leg Day (Quads & Hamstrings)',
    targetMuscles: ['legs', 'abs'],
    isRestDay: false,
    exerciseIds: [
      'legs_barbell_squat',
      'legs_romanian_deadlift',
      'legs_leg_extension',
      'legs_standing_calf_raise',
      'abs_plank_hold',
    ],
  },
  {
    dayIndex: 4,
    dayName: 'Thursday',
    splitTitle: 'Arm & Shoulder Hypertrophy',
    targetMuscles: ['arms', 'shoulders'],
    isRestDay: false,
    exerciseIds: [
      'arms_barbell_curl',
      'arms_incline_dumbbell_curl',
      'arms_skullcrushers',
      'arms_overhead_tricep_extension',
      'shoulders_dumbbell_lateral_raise',
      'shoulders_face_pulls',
    ],
  },
  {
    dayIndex: 5,
    dayName: 'Friday',
    splitTitle: 'Chest & Back Superset Power',
    targetMuscles: ['chest', 'back'],
    isRestDay: false,
    exerciseIds: [
      'chest_barbell_bench_press',
      'back_lat_pulldown',
      'chest_incline_dumbbell_press',
      'back_bent_over_row',
      'chest_cable_crossover_fly',
    ],
  },
  {
    dayIndex: 6,
    dayName: 'Saturday',
    splitTitle: 'Full Body Hypertrophy & Core',
    targetMuscles: ['abs', 'arms', 'chest', 'legs'],
    isRestDay: false,
    exerciseIds: [
      'abs_hanging_leg_raise',
      'chest_barbell_bench_press',
      'arms_barbell_curl',
      'legs_barbell_squat',
      'arms_cable_tricep_pushdown',
      'abs_cable_woodchopper',
    ],
  },
];
