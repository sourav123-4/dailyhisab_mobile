import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { Exercise, MuscleGroup } from '../types/fitness';
import { useAppTheme } from '../theme/appTheme';

/** Strong red for the muscles an exercise mainly trains, soft red for the ones that assist. */
export const PRIMARY_MUSCLE_RED = '#E5484D';
export const SECONDARY_MUSCLE_RED = '#F4A0A2';

// Order matters: "Lateral Deltoid" must match deltoids before anything looks for "lat".
const NAME_TO_SLUGS: Array<[RegExp, Slug[]]> = [
  [/pector|chest/i, ['chest']],
  [/delt|shoulder|supraspinatus/i, ['deltoids']],
  [/tricep/i, ['triceps']],
  [/bicep|brachialis\b/i, ['biceps']],
  [/brachioradialis|forearm|grip/i, ['forearm']],
  [/latissimus|rhomboid|middle back/i, ['upper-back']],
  [/trapez|traps/i, ['trapezius']],
  [/lower back|spinal erector/i, ['lower-back']],
  [/oblique/i, ['obliques']],
  [/abdominis|abs\b|core/i, ['abs']],
  [/glute/i, ['gluteal']],
  [/hamstring/i, ['hamstring']],
  [/quadricep/i, ['quadriceps']],
  [/adductor/i, ['adductors']],
  [/gastrocnemius|soleus|calf|calves/i, ['calves']],
];

const GROUP_FALLBACK: Record<MuscleGroup, Slug[]> = {
  chest: ['chest'],
  back: ['upper-back', 'lower-back'],
  shoulders: ['deltoids'],
  arms: ['biceps', 'triceps'],
  abs: ['abs', 'obliques'],
  legs: ['quadriceps', 'hamstring', 'gluteal'],
  fullbody: ['chest', 'upper-back', 'quadriceps'],
};

const BACK_ONLY: Slug[] = ['upper-back', 'lower-back', 'trapezius', 'triceps', 'gluteal', 'hamstring', 'calves'];

export function slugsForMuscles(names: string[]): Slug[] {
  const out = new Set<Slug>();
  names.forEach(name => {
    const hit = NAME_TO_SLUGS.find(([re]) => re.test(name));
    hit?.[1].forEach(s => out.add(s));
  });
  return [...out];
}

/** Primary and secondary body parts for one exercise; a part counts once, as its strongest role. */
export function muscleTargetsFor(exercise: Pick<Exercise, 'primaryMuscles' | 'secondaryMuscles' | 'muscleGroup'>) {
  let primary = slugsForMuscles(exercise.primaryMuscles);
  if (!primary.length) primary = GROUP_FALLBACK[exercise.muscleGroup] || [];
  const secondary = slugsForMuscles(exercise.secondaryMuscles).filter(s => !primary.includes(s));
  return { primary, secondary };
}

const GROUP_TARGETS: Record<MuscleGroup, { primary: Slug[]; secondary: Slug[] }> = {
  chest: { primary: ['chest'], secondary: ['deltoids', 'triceps'] },
  back: { primary: ['upper-back', 'trapezius', 'lower-back'], secondary: ['biceps', 'forearm'] },
  shoulders: { primary: ['deltoids'], secondary: ['trapezius', 'triceps'] },
  arms: { primary: ['biceps', 'triceps', 'forearm'], secondary: [] },
  abs: { primary: ['abs', 'obliques'], secondary: [] },
  legs: { primary: ['quadriceps', 'hamstring', 'gluteal', 'calves'], secondary: ['adductors'] },
  fullbody: { primary: ['chest', 'upper-back', 'quadriceps', 'gluteal'], secondary: ['deltoids', 'hamstring', 'abs'] },
};

/** The muscles a whole group (Chest, Arms…) is about, for the explorer's map view. */
export function muscleTargetsForGroup(group: MuscleGroup) {
  return GROUP_TARGETS[group] || GROUP_TARGETS.fullbody;
}

/** Which side of the body shows more of the main muscles (back for rows and pull-ups, front otherwise). */
export function bestSideFor(primary: Slug[]): 'front' | 'back' {
  const back = primary.filter(s => BACK_ONLY.includes(s)).length;
  return back > primary.length - back ? 'back' : 'front';
}

function useBodyColors() {
  const theme = useAppTheme();
  return {
    fill: theme.dark ? '#3A4560' : '#D5DCE6',
    stroke: theme.dark ? '#56627E' : '#B4BFCD',
    hair: theme.dark ? '#56627E' : '#9AA6B6',
  };
}

const ALL_PARTS: Slug[] = [
  'abs', 'adductors', 'ankles', 'biceps', 'calves', 'chest', 'deltoids', 'feet', 'forearm', 'gluteal',
  'hamstring', 'hands', 'hair', 'head', 'knees', 'lower-back', 'neck', 'obliques', 'quadriceps',
  'tibialis', 'trapezius', 'triceps', 'upper-back',
];

// The library bakes a dark grey into every part, so untrained parts are painted explicitly.
function toData(primary: Slug[], secondary: Slug[], fill: string, hair: string): ExtendedBodyPart[] {
  return ALL_PARTS.map(slug => {
    if (primary.includes(slug)) return { slug, intensity: 1 };
    if (secondary.includes(slug)) return { slug, intensity: 2 };
    return { slug, styles: { fill: slug === 'hair' ? hair : fill } };
  });
}

/** Small single-view body for list thumbnails. */
export const MuscleBodyThumb = React.memo(function MuscleBodyThumb({
  primary,
  secondary,
  scale = 0.3,
}: {
  primary: Slug[];
  secondary: Slug[];
  scale?: number;
}) {
  const { fill, stroke, hair } = useBodyColors();
  const data = useMemo(() => toData(primary, secondary, fill, hair), [primary, secondary, fill, hair]);
  return (
    <Body
      data={data}
      side={bestSideFor(primary)}
      scale={scale}
      colors={[PRIMARY_MUSCLE_RED, SECONDARY_MUSCLE_RED]}
      defaultFill={fill}
      border={stroke}
    />
  );
});

/** Front and back body with the trained muscles in red, plus a legend naming them. */
export const MuscleBodyMap = React.memo(function MuscleBodyMap({
  primary,
  secondary,
  primaryNames,
  secondaryNames,
  title = 'Muscles worked',
  scale = 0.62,
  bare = false,
}: {
  primary: Slug[];
  secondary: Slug[];
  primaryNames?: string[];
  secondaryNames?: string[];
  title?: string;
  scale?: number;
  bare?: boolean;
}) {
  const theme = useAppTheme();
  const { fill, stroke, hair } = useBodyColors();
  const data = useMemo(() => toData(primary, secondary, fill, hair), [primary, secondary, fill, hair]);
  const common = {
    data,
    scale,
    colors: [PRIMARY_MUSCLE_RED, SECONDARY_MUSCLE_RED] as const,
    defaultFill: fill,
    border: stroke,
  };

  return (
    <View
      style={[
        styles.card,
        bare ? styles.bare : { backgroundColor: theme.surface, borderColor: theme.borderSoft },
      ]}
    >
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      <View style={styles.bodies}>
        <View style={styles.bodyCol}>
          <Body {...common} side="front" />
          <Text style={[styles.sideLabel, { color: theme.subtle }]}>FRONT</Text>
        </View>
        <View style={styles.bodyCol}>
          <Body {...common} side="back" />
          <Text style={[styles.sideLabel, { color: theme.subtle }]}>BACK</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.swatch, { backgroundColor: PRIMARY_MUSCLE_RED }]} />
          <Text style={[styles.legendLabel, { color: theme.text }]}>Main</Text>
          {primaryNames?.length ? (
            <Text style={[styles.legendNames, { color: theme.muted }]} numberOfLines={2}>
              {primaryNames.join(', ')}
            </Text>
          ) : null}
        </View>
        {secondary.length ? (
          <View style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: SECONDARY_MUSCLE_RED }]} />
            <Text style={[styles.legendLabel, { color: theme.text }]}>Helping</Text>
            {secondaryNames?.length ? (
              <Text style={[styles.legendNames, { color: theme.muted }]} numberOfLines={2}>
                {secondaryNames.join(', ')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginTop: 14 },
  bare: { borderWidth: 0, padding: 0, marginTop: 0 },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  bodies: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' },
  bodyCol: { alignItems: 'center' },
  sideLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  legend: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 3, marginTop: 2 },
  legendLabel: { fontSize: 12, fontWeight: '800', width: 52 },
  legendNames: { fontSize: 12, flex: 1, lineHeight: 17 },
});
