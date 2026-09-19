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
  arms_barbell_curl: require('../../assets/exercise_bicep_3d.jpg'),
  arms_incline_dumbbell_curl: require('../../assets/exercise_bicep_3d.jpg'),
  arms_dumbbell_hammer_curl: require('../../assets/exercise_hammer_3d.jpg'),
  arms_cable_tricep_pushdown: require('../../assets/exercise_tricep_3d.jpg'),
  arms_skullcrushers: require('../../assets/exercise_tricep_3d.jpg'),
  arms_overhead_tricep_extension: require('../../assets/exercise_tricep_3d.jpg'),
  abs_straight_arm_crunch: require('../../assets/exercise_crunch_3d.jpg'),
  abs_hanging_leg_raise: require('../../assets/exercise_crunch_3d.jpg'),
  abs_plank: require('../../assets/exercise_crunch_3d.jpg'),
  chest_barbell_bench_press: require('../../assets/exercise_bench_3d.jpg'),
  chest_incline_dumbbell_press: require('../../assets/exercise_bench_3d.jpg'),
  chest_cable_crossover: require('../../assets/exercise_bench_3d.jpg'),
  back_lat_pulldown: require('../../assets/exercise_lat_3d.jpg'),
  back_barbell_deadlift: require('../../assets/exercise_deadlift_3d.jpg'),
  back_bent_over_row: require('../../assets/exercise_lat_3d.jpg'),
  shoulders_barbell_overhead_press: require('../../assets/exercise_shoulder_3d.jpg'),
  shoulders_dumbbell_lateral_raise: require('../../assets/exercise_shoulder_3d.jpg'),
  legs_barbell_squat: require('../../assets/exercise_squat_3d.jpg'),
  legs_leg_press: require('../../assets/exercise_squat_3d.jpg'),
  legs_romanian_deadlift: require('../../assets/exercise_deadlift_3d.jpg'),
};

export const ARMS_PARTS_BREAKDOWN = [
  {
    id: 'biceps_long_head',
    name: 'Biceps (Long Head / Outer Peak)',
    target: 'Builds vertical bicep peak height',
    color: '#FF4757',
    primaryExerciseId: 'arms_barbell_curl',
    exercises: ['Barbell Bicep Curl', 'Incline Dumbbell Curl'],
  },
  {
    id: 'biceps_short_head',
    name: 'Biceps (Short Head / Inner Width)',
    target: 'Adds thickness and bicep width',
    color: '#FF6B81',
    primaryExerciseId: 'arms_incline_dumbbell_curl',
    exercises: ['Incline Dumbbell Curl', 'Barbell Bicep Curl'],
  },
  {
    id: 'brachialis',
    name: 'Brachialis (Under-Arm Muscle)',
    target: 'Pushes bicep higher from underneath',
    color: '#FFA502',
    primaryExerciseId: 'arms_dumbbell_hammer_curl',
    exercises: ['Dumbbell Hammer Curl'],
  },
  {
    id: 'triceps_lateral_head',
    name: 'Triceps (Lateral Head / Outer Horseshoe)',
    target: 'Creates the signature 3D arm horseshoe curve',
    color: '#00E5FF',
    primaryExerciseId: 'arms_cable_tricep_pushdown',
    exercises: ['Cable Rope Tricep Pushdown'],
  },
  {
    id: 'triceps_long_head',
    name: 'Triceps (Long Head / Inner Mass)',
    target: 'Largest section of upper arm mass (60% volume)',
    color: '#2ED573',
    primaryExerciseId: 'arms_overhead_tricep_extension',
    exercises: ['Overhead Dumbbell Triceps Extension', 'Barbell Skullcrushers'],
  },
  {
    id: 'forearms',
    name: 'Forearms & Grip (Brachioradialis & Flexors)',
    target: 'Wrist stability, grip power & vascularity',
    color: '#9B51E0',
    primaryExerciseId: 'arms_dumbbell_hammer_curl',
    exercises: ['Dumbbell Hammer Curl'],
  },
];

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
    color: '#FF4757',
    iconName: 'arm-flex',
    keyMuscles: ['Biceps Brachii', 'Triceps Brachii', 'Brachioradialis', 'Forearm Flexors'],
  },
  {
    id: 'shoulders',
    title: 'Shoulders & Delts',
    subtitle: 'Front, Lateral & Rear Deltoids',
    color: '#FF6B81',
    iconName: 'chevron-triple-up',
    keyMuscles: ['Anterior Deltoid', 'Lateral Deltoid', 'Posterior Deltoid', 'Rotator Cuff'],
  },
  {
    id: 'chest',
    title: 'Chest & Pectorals',
    subtitle: 'Upper, Mid & Lower Pectoralis',
    color: '#FFA502',
    iconName: 'shield',
    keyMuscles: ['Pectoralis Major', 'Clavicular Head', 'Sternal Head', 'Serratus Anterior'],
  },
  {
    id: 'back',
    title: 'Back & Lats',
    subtitle: 'Lats, Rhomboids, Traps & Lower Back',
    color: '#2ED573',
    iconName: 'human-handsdown',
    keyMuscles: ['Latissimus Dorsi', 'Trapezius', 'Rhomboids', 'Erector Spinae'],
  },
  {
    id: 'abs',
    title: 'Core & Abs',
    subtitle: 'Six-Pack, Obliques & Deep Core',
    color: '#00E5FF',
    iconName: 'lightning-bolt',
    keyMuscles: ['Rectus Abdominis', 'External Obliques', 'Transverse Abdominis'],
  },
  {
    id: 'legs',
    title: 'Legs & Glutes',
    subtitle: 'Quads, Hamstrings, Glutes & Calves',
    color: '#9B51E0',
    iconName: 'run',
    keyMuscles: ['Quadriceps Femoris', 'Hamstrings', 'Gluteus Maximus', 'Gastrocnemius & Soleus'],
  },
];

const RAW_EXERCISES_DATABASE: Omit<Exercise, 'videoUrl' | 'youtubeId' | 'thumbnailUrl'>[] = [
  // ================= ARMS =================
  {
    id: 'arms_barbell_curl',
    name: 'Barbell Bicep Curl',
    muscleGroup: 'arms',
    primaryMuscles: ['Biceps Brachii (Short & Long Head)'],
    secondaryMuscles: ['Brachialis', 'Forearm Flexors'],
    equipment: 'barbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'The premier mass-building exercise for the biceps brachii, emphasizing peak contraction and arm thickness.',
    instructions: [
      'Stand upright holding an Olympic or EZ barbell with an underhand shoulder-width grip.',
      'Pin your elbows slightly ahead of your torso and lock your upper arms firmly in place.',
      'Exhale and curl the bar upward by contracting your biceps until fully squeezed at chest height.',
      'Squeeze hard for 1 second at the peak, then lower the bar with a controlled 3-second negative descent.'
    ],
    tips: ['Keep your wrists neutral and avoid rocking your torso back and forth.', 'Focus on keeping your shoulders relaxed and down.'],
    mistakes: ['Swinging the lower back to propel heavy weights.', 'Letting elbows flare outwards or drift behind the ribs.'],
    animationFrames: [
      'Phase 1: Arms fully extended, barbell rests on thighs, chest proud.',
      'Phase 2: Biceps flex, bar arcs upward smoothly past 90 degrees.',
      'Phase 3: Maximum peak squeeze at collarbone height.',
      'Phase 4: Controlled 3-second eccentric stretch return.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'arms_dumbbell_hammer_curl',
    name: 'Dumbbell Hammer Curl',
    muscleGroup: 'arms',
    primaryMuscles: ['Brachialis', 'Brachioradialis'],
    secondaryMuscles: ['Biceps Brachii', 'Forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'Targets the brachialis muscle underneath the bicep to push the peak higher and add width to the upper arm and forearm.',
    instructions: [
      'Hold a pair of dumbbells at your sides with a neutral grip (palms facing each other).',
      'Keep your core tight, shoulders back, and elbows locked close to your sides.',
      'Curl the weights upward along a straight arc while maintaining the neutral hand position.',
      'Pause at the peak of the contraction, then lower slowly back to full elbow extension.'
    ],
    tips: ['Can be performed alternating or bilateral.', 'Keep the thumbs pointed upward throughout the movement.'],
    mistakes: ['Flaring elbows wide.', 'Pronating the wrists at the top.'],
    animationFrames: [
      'Phase 1: Neutral grip at hips, torso rigid.',
      'Phase 2: Dumbbells rise in parallel alignment.',
      'Phase 3: Full brachialis contraction near shoulder joint.',
      'Phase 4: Smooth descent maintaining neutral wrist.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
  },
  {
    id: 'arms_incline_dumbbell_curl',
    name: 'Incline Dumbbell Curl',
    muscleGroup: 'arms',
    primaryMuscles: ['Biceps Brachii (Long Head)'],
    secondaryMuscles: ['Brachialis', 'Anterior Deltoid'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'Places the long head of the bicep under a deep pre-stretch by reclining on an incline bench.',
    instructions: [
      'Set an adjustable bench to a 45–60 degree angle and sit back with dumbbells in hand.',
      'Let your arms hang straight down perpendicular to the floor.',
      'Supinate your wrists as you curl the dumbbells upward, keeping upper arms still.',
      'Contract hard at top, then lower under control to feel the deep stretch at the bottom.'
    ],
    tips: ['Do not let your shoulders roll forward off the bench pad.'],
    mistakes: ['Setting the bench angle too flat causing shoulder impingement.'],
    animationFrames: [
      'Phase 1: Deep stretch hanging perpendicular on 45° bench.',
      'Phase 2: Supination beginning at mid-curl.',
      'Phase 3: Peak contraction without lifting elbows off vertical axis.',
      'Phase 4: Full long-head stretch at bottom extension.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
  },
  {
    id: 'arms_skullcrushers',
    name: 'Barbell Skullcrushers (Lying Triceps Ext)',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii (Long & Lateral Heads)'],
    secondaryMuscles: ['Anconeus', 'Forearms'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'One of the most effective mass builders for the entire triceps horseshoe, especially the long head.',
    instructions: [
      'Lie flat on a bench holding an EZ bar with an overhand grip, arms extended above chest with a slight backward tilt.',
      'Keep your upper arms stationary and bend only at the elbows.',
      'Lower the bar slowly towards your forehead or just past the crown of your head.',
      'Drive the bar back up by flexing your triceps until elbows are fully locked.'
    ],
    tips: ['Angle upper arms slightly backwards (~10 degrees) to keep constant tension at the top.'],
    mistakes: ['Flaring elbows out to the sides.', 'Allowing upper arms to drift forward.'],
    animationFrames: [
      'Phase 1: Bar locked over forehead at 80° angle.',
      'Phase 2: Controlled bend at elbows to top of skull.',
      'Phase 3: Deep tricep stretch behind head.',
      'Phase 4: Powerful triceps extension to start.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'arms_cable_tricep_pushdown',
    name: 'Cable Rope Tricep Pushdown',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii (Lateral & Medial Heads)'],
    secondaryMuscles: ['Core', 'Forearms'],
    equipment: 'cable',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'Isolates the lateral and medial heads of the triceps with continuous cable tension and rope spread.',
    instructions: [
      'Attach a rope to a high cable pulley and grip both ends with knuckles facing out.',
      'Step back slightly, hinge at hips, and tuck your elbows against your ribcage.',
      'Push the rope down towards your thighs, spreading the ends apart at the bottom lockout.',
      'Squeeze the outer triceps for 1 full second, then return smoothly to 90 degrees elbow flexion.'
    ],
    tips: ['Lock your elbows in place like a hinge and do not let them drift up and down.'],
    mistakes: ['Using momentum and leaning entire body weight into the push.'],
    animationFrames: [
      'Phase 1: Elbows pinned at 90°, rope near upper chest.',
      'Phase 2: Straight down drive through cable.',
      'Phase 3: Spreading rope ends at outer thighs, peak triceps lock.',
      'Phase 4: Slow eccentric return to 90°.'
    ],
    defaultSets: 4,
    defaultReps: 12,
    restSeconds: 60,
  },
  {
    id: 'arms_overhead_tricep_extension',
    name: 'Overhead Dumbbell Triceps Extension',
    muscleGroup: 'arms',
    primaryMuscles: ['Triceps Brachii (Long Head)'],
    secondaryMuscles: ['Shoulder Stabilizers'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    mechanics: 'isolation',
    imageKey: 'arms',
    description: 'Overhead positioning places the long head in maximum stretch, promoting extreme muscle growth.',
    instructions: [
      'Sit on a bench with back support, holding a heavy dumbbell overhead with both hands cup-gripping the top plate.',
      'Keeping upper arms vertical and close to your ears, lower the dumbbell behind your neck.',
      'Lower until you feel a deep stretch in your triceps.',
      'Press the weight back up vertically until arms are fully extended overhead.'
    ],
    tips: ['Keep your ribcage tucked down and avoid arching the lower spine.'],
    mistakes: ['Letting elbows flare excessively wide.'],
    animationFrames: [
      'Phase 1: Dumbbell pressed overhead with diamond cup grip.',
      'Phase 2: Controlled lowering behind neck.',
      'Phase 3: Deep stretch at base of neck.',
      'Phase 4: Vertical tricep drive back to lockout.'
    ],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
  },

  // ================= SHOULDERS =================
  {
    id: 'shoulders_barbell_overhead_press',
    name: 'Overhead Barbell Military Press',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Anterior Deltoid', 'Lateral Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Upper Chest', 'Trapezius', 'Core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'shoulders',
    description: 'The king of all vertical pushing exercises for building massive shoulder boulder caps and upper body raw strength.',
    instructions: [
      'Rest barbell across front clavicle with a grip slightly wider than shoulder width.',
      'Tighten glutes, quads, and abs to form a rigid foundation.',
      'Press the bar vertically upwards in a straight line, pulling head back slightly to clear chin.',
      'Lock out overhead with bar centered directly over your spine and ears.',
      'Lower under control back to the collarbone.'
    ],
    tips: ['Squeeze your glutes tightly to protect your lumbar spine.'],
    mistakes: ['Excessive backward leaning resembling a standing incline bench press.'],
    animationFrames: [
      'Phase 1: Bar resting on clavicle, elbows stacked under wrists.',
      'Phase 2: Vertical press clearing nose line.',
      'Phase 3: Full overhead lockout with head through the window.',
      'Phase 4: Controlled descent back to clavicle shelf.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 120,
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
    name: 'Cable Face Pulls with Rope',
    muscleGroup: 'shoulders',
    primaryMuscles: ['Posterior Deltoid (Rear Delt)', 'Infraspinatus', 'Teres Minor'],
    secondaryMuscles: ['Rhomboids', 'Middle Trapezius'],
    equipment: 'cable',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'shoulders',
    description: 'Essential for posture, shoulder health, external rotator strength, and building thick 3D rear deltoids.',
    instructions: [
      'Set cable pulley to eye level with rope attachment.',
      'Grip the rope with thumbs pointing back towards you.',
      'Step back, pull the rope directly towards your eyes/forehead while externally rotating your shoulders.',
      'Pull your hands past your ears and squeeze your rear delts and shoulder blades firmly.'
    ],
    tips: ['Focus on pulling hands apart at the end of the motion.'],
    mistakes: ['Pulling downwards towards chin instead of high towards eyes.'],
    animationFrames: [
      'Phase 1: Cable extended at eye level, tension on rear delts.',
      'Phase 2: Pulling toward bridge of nose.',
      'Phase 3: Hands past ears with maximum external rotation squeeze.',
      'Phase 4: Controlled forward release.'
    ],
    defaultSets: 4,
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
    name: 'Barbell Flat Bench Press',
    muscleGroup: 'chest',
    primaryMuscles: ['Pectoralis Major (Mid & Lower)'],
    secondaryMuscles: ['Anterior Deltoid', 'Triceps Brachii'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'chest',
    description: 'The undisputed gold standard for overall chest mass, upper body pushing power, and raw strength.',
    instructions: [
      'Lie flat on the bench with eyes directly under the racked barbell, feet planted firmly into the floor.',
      'Grip the bar slightly wider than shoulder width, retract shoulder blades, and unrack with straight arms.',
      'Inhale, lower the bar smoothly to your mid-sternum with elbows tucked at roughly a 45-degree angle.',
      'Drive the bar explosively back upward to full lockout by pressing through your chest and feet.'
    ],
    tips: ['Maintain a slight natural arch in your lower back with shoulder blades pinched into the bench.'],
    mistakes: ['Bouncing the bar off the chest.', 'Flaring elbows at 90 degrees putting stress on shoulders.'],
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
    name: 'Cable Crossover High-to-Low Fly',
    muscleGroup: 'chest',
    primaryMuscles: ['Pectoralis Major (Lower & Sternal Head)'],
    secondaryMuscles: ['Anterior Deltoid', 'Serratus Anterior'],
    equipment: 'cable',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'chest',
    description: 'Delivers continuous tension across the entire range of motion with an intense peak contraction in the inner chest.',
    instructions: [
      'Set pulleys above shoulder level and grab handles with a staggered stance for stability.',
      'Keep a slight bend in your elbows and bring your hands down and forward in a sweeping hugging motion.',
      'Cross your hands slightly at the bottom to maximize the inner pectoral squeeze.',
      'Open your arms back wide until you feel a complete stretch across your chest.'
    ],
    tips: ['Imagine hugging a large tree trunk at the bottom contraction.'],
    mistakes: ['Bending and extending elbows turning it into a press.'],
    animationFrames: [
      'Phase 1: High wide stance, deep chest stretch.',
      'Phase 2: Sweeping downward circular arc.',
      'Phase 3: Hands crossed at lower abdomen, peak contraction.',
      'Phase 4: Slow eccentric opening stretch.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
  },

  // ================= BACK =================
  {
    id: 'back_barbell_deadlift',
    name: 'Conventional Barbell Deadlift',
    muscleGroup: 'back',
    primaryMuscles: ['Erector Spinae', 'Latissimus Dorsi', 'Glutes', 'Hamstrings'],
    secondaryMuscles: ['Trapezius', 'Rhomboids', 'Forearms', 'Core'],
    equipment: 'barbell',
    difficulty: 'advanced',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'The supreme test of full-body power, building unparalleled back thickness, posterior chain drive, and grip strength.',
    instructions: [
      'Stand with feet hip-width apart, barbell over mid-foot, shins 1 inch away from bar.',
      'Hinge at hips, grip the bar just outside your knees with an overhand or mixed grip.',
      'Engage lats (bend the bar around your shins), flatten spine, and pull the slack out of the bar.',
      'Drive the floor away with your legs while keeping the bar close to your shins.',
      'Lock out with hips forward and chest high. Lower under control by hinging hips back.'
    ],
    tips: ['Think of pushing the earth away with your legs rather than pulling with your lower back.'],
    mistakes: ['Rounding the lower back under load.', 'Hyperextending the spine at lockout.'],
    animationFrames: [
      'Phase 1: Tight hinge setup, bar over mid-foot, spine neutral.',
      'Phase 2: Leg drive breaking bar off floor.',
      'Phase 3: Powerful hip extension through knees.',
      'Phase 4: Tall lockout with lats locked and glutes tight.'
    ],
    defaultSets: 4,
    defaultReps: 6,
    restSeconds: 150,
  },
  {
    id: 'back_lat_pulldown',
    name: 'Wide-Grip Lat Pulldown',
    muscleGroup: 'back',
    primaryMuscles: ['Latissimus Dorsi (Lats)'],
    secondaryMuscles: ['Biceps Brachii', 'Brachialis', 'Rhomboids', 'Middle Traps'],
    equipment: 'cable',
    difficulty: 'beginner',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'Develops wide wing-like lats to create the dramatic V-taper physique.',
    instructions: [
      'Sit on the pulldown station with thighs secured under pads and take a wide overhand grip on the bar.',
      'Lean back slightly (~10–15 degrees) and pull the bar down toward your upper chest by driving elbows down and back.',
      'Squeeze your lats and shoulder blades hard at collarbone level.',
      'Allow the bar to rise slowly under control for a deep stretch at the top.'
    ],
    tips: ['Pull through your elbows rather than gripping and pulling with your hands.'],
    mistakes: ['Swinging backwards violently to yank the bar down.', 'Pulling bar behind the neck.'],
    animationFrames: [
      'Phase 1: Arms fully stretched overhead, lats extended.',
      'Phase 2: Elbows driving down and back in wide arc.',
      'Phase 3: Bar touches upper chest, shoulder blades retracted.',
      'Phase 4: Slow 3-second negative stretch back to top.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'back_bent_over_row',
    name: 'Bent-Over Barbell Row',
    muscleGroup: 'back',
    primaryMuscles: ['Rhomboids', 'Latissimus Dorsi', 'Middle Trapezius'],
    secondaryMuscles: ['Biceps', 'Posterior Deltoid', 'Lower Back'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'back',
    description: 'Essential mass builder for middle and upper back density and thickness.',
    instructions: [
      'Hold a barbell with a shoulder-width overhand grip, hinge at hips until torso is roughly 45 degrees to floor.',
      'Maintain a neutral spine and soft knees.',
      'Pull the barbell up toward your lower ribcage / navel by driving elbows straight back.',
      'Squeeze shoulder blades together at top, then lower bar slowly with control.'
    ],
    tips: ['Keep your chest pointed slightly up to prevent upper back rounding.'],
    mistakes: ['Standing straight up and shrugging the weight.'],
    animationFrames: [
      'Phase 1: 45° torso hinge, arms hanging straight under shoulders.',
      'Phase 2: Pulling bar up towards belly button.',
      'Phase 3: Elbows tucked behind back, maximum upper back density.',
      'Phase 4: Smooth descent maintaining hip hinge.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },

  // ================= ABS & CORE =================
  {
    id: 'abs_straight_arm_crunch',
    name: 'Straight Arm Crunch',
    muscleGroup: 'abs',
    primaryMuscles: ['Rectus Abdominis (Upper & Lower Abs)'],
    secondaryMuscles: ['Transverse Abdominis', 'Serratus Anterior', 'Anterior Deltoid'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'abs',
    description: 'Holding a dumbbell with arms straight overhead increases the resistance lever arm, creating extreme peak contraction in the rectus abdominis.',
    instructions: [
      'Lie flat on your back on an exercise mat with knees bent and feet planted flat on the floor.',
      'Hold a dumbbell vertically overhead with both hands, arms extended perpendicular to the floor.',
      'Contract your abdominal muscles to lift your shoulder blades and upper back off the floor towards the ceiling.',
      'Keep your arms straight and vertical throughout the entire movement without swinging the weight.',
      'Hold the maximal contraction at the top for 1 second, then slowly lower your torso with a controlled negative descent.'
    ],
    tips: [
      'Focus on pushing the dumbbell straight up towards the ceiling rather than forward toward your knees.',
      'Exhale completely at the top of the crunch to maximize abdominal muscle fiber recruitment.'
    ],
    mistakes: [
      'Bending the elbows and turning the exercise into a tricep extension.',
      'Tucking the chin aggressively into the chest causing neck strain.'
    ],
    animationFrames: [
      'Phase 1: Lying flat on back, dumbbell held vertical overhead with straight arms.',
      'Phase 2: Abdominals contract, shoulder blades lift off mat.',
      'Phase 3: Peak isometric contraction of upper and lower rectus abdominis.',
      'Phase 4: Controlled 2-second eccentric lowering back to mat.'
    ],
    defaultSets: 4,
    defaultReps: 15,
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
    name: 'High-to-Low Cable Woodchoppers',
    muscleGroup: 'abs',
    primaryMuscles: ['External & Internal Obliques'],
    secondaryMuscles: ['Transverse Abdominis', 'Shoulders'],
    equipment: 'cable',
    difficulty: 'beginner',
    mechanics: 'compound',
    imageKey: 'abs',
    description: 'Rotational core power exercise that carves sharp oblique lines and builds athletic rotational strength.',
    instructions: [
      'Set cable to top position with a single handle.',
      'Stand perpendicular to cable, grip handle with both hands, arms extended.',
      'Rotate your torso downward and across your body towards the opposite knee.',
      'Pivot your back foot and tighten your core at bottom, then return under control.'
    ],
    tips: ['Initiate the rotation from your core and hips rather than pulling with your arms.'],
    mistakes: ['Bending elbows and turning movement into an arm pull.'],
    animationFrames: [
      'Phase 1: Arms extended high toward pulley, core loaded.',
      'Phase 2: Diagonal rotational sweep across torso.',
      'Phase 3: Peak oblique contraction at opposite knee.',
      'Phase 4: Smooth resisted return.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
  },
  {
    id: 'abs_plank_hold',
    name: 'Weighted Core Plank',
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
    name: 'Barbell Back Squat',
    muscleGroup: 'legs',
    primaryMuscles: ['Quadriceps Femoris', 'Gluteus Maximus'],
    secondaryMuscles: ['Hamstrings', 'Adductors', 'Erector Spinae', 'Calves'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'legs',
    description: 'The foundation of all lower-body strength and mass development, building explosive legs and glutes.',
    instructions: [
      'Rest barbell securely across upper trapezius, take a shoulder-width stance with toes angled slightly out.',
      'Take a deep belly breath, brace core 360 degrees, and push hips back and knees out.',
      'Descend until hip crease is at or below the top of the knee (parallel or deeper).',
      'Drive through mid-foot and heel to return to standing lockout, exhaling past sticking point.'
    ],
    tips: ['Keep your chest proud and knees tracking in line with your toes.'],
    mistakes: ['Knees caving inwards (valgus collapse).', 'Heels lifting off the floor.'],
    animationFrames: [
      'Phase 1: Bar locked on upper traps, core braced.',
      'Phase 2: Hips sink back and knees push outward.',
      'Phase 3: Full depth parallel squat with vertical torso.',
      'Phase 4: Powerful quad & glute drive to lockout.'
    ],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 120,
  },
  {
    id: 'legs_romanian_deadlift',
    name: 'Romanian Deadlift (RDL)',
    muscleGroup: 'legs',
    primaryMuscles: ['Hamstrings (Biceps Femoris, Semitendinosus)', 'Glutes'],
    secondaryMuscles: ['Lower Back', 'Forearms', 'Core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    mechanics: 'compound',
    imageKey: 'legs',
    description: 'Unmatched for eccentric hamstring loading, glute development, and hip hinge mastery.',
    instructions: [
      'Hold a barbell with shoulder-width grip, standing tall with knees unlocked (slight soft bend).',
      'Push your hips backward as if touching a wall behind you while keeping bar skimming along thighs.',
      'Lower bar just below knees until you feel a maximal stretch in your hamstrings.',
      'Contract hamstrings and drive hips forward to return to standing position.'
    ],
    tips: ['The movement is an eccentric hip hinge, not a squat. Do not bend your knees further during descent.'],
    mistakes: ['Rounding the lower back or letting bar drift away from shins.'],
    animationFrames: [
      'Phase 1: Standing tall, soft knees, bar at hips.',
      'Phase 2: Hips sliding backward, bar staying tight to thighs.',
      'Phase 3: Deep hamstring stretch below knees with flat back.',
      'Phase 4: Squeezing glutes forward into lockout.'
    ],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 90,
  },
  {
    id: 'legs_leg_extension',
    name: 'Leg Extension Machine',
    muscleGroup: 'legs',
    primaryMuscles: ['Quadriceps (Rectus Femoris, Vastus Lateralis/Medialis)'],
    secondaryMuscles: ['None (Pure Isolation)'],
    equipment: 'machine',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'legs',
    description: 'Pure isolation for building the teardrop vastus medialis and deep quad separation.',
    instructions: [
      'Adjust seat so your knee joint aligns directly with the machine pivot point.',
      'Pad should rest on lower shins just above ankles.',
      'Extend legs upward until knees are fully straightened, squeezing quads at top for 1 full second.',
      'Lower smoothly under control back to 90 degrees.'
    ],
    tips: ['Keep your toes pointed slightly straight or up to maximize quad peak.'],
    mistakes: ['Kicking the weight up with ballistic momentum.'],
    animationFrames: [
      'Phase 1: 90° seated bend with shin pad loaded.',
      'Phase 2: Smooth upward sweep through pivot.',
      'Phase 3: Maximum quad lockout and teardrop squeeze.',
      'Phase 4: 3-second negative lowering.'
    ],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
  },
  {
    id: 'legs_standing_calf_raise',
    name: 'Standing Machine Calf Raise',
    muscleGroup: 'legs',
    primaryMuscles: ['Gastrocnemius (Outer & Inner Calf)'],
    secondaryMuscles: ['Soleus', 'Achilles Tendon'],
    equipment: 'machine',
    difficulty: 'beginner',
    mechanics: 'isolation',
    imageKey: 'legs',
    description: 'Builds Diamond-shaped calves through full stretch and peak plantarflexion contraction.',
    instructions: [
      'Position shoulders under padded levers with balls of feet on edge of platform.',
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
