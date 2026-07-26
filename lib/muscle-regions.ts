export interface MuscleRegion {
  key: string;
  label: string;
  parent: string;
}

export const MUSCLE_REGIONS: MuscleRegion[] = [
  { key: 'chest_upper', label: 'Bryst (øvre)', parent: 'chest' },
  { key: 'chest_middle', label: 'Bryst (midtre)', parent: 'chest' },
  { key: 'chest_lower', label: 'Bryst (nedre)', parent: 'chest' },
  { key: 'shoulders_front', label: 'Skulder (forside)', parent: 'shoulders' },
  { key: 'shoulders_side', label: 'Skulder (side)', parent: 'shoulders' },
  { key: 'shoulders_rear', label: 'Skulder (bakside)', parent: 'shoulders' },
  { key: 'back_upper', label: 'Rygg (øvre)', parent: 'back' },
  { key: 'back_lats', label: 'Latissimus', parent: 'back' },
  { key: 'back_lower', label: 'Korsrygg', parent: 'back' },
  { key: 'biceps', label: 'Biceps', parent: 'biceps' },
  { key: 'triceps', label: 'Triceps', parent: 'triceps' },
  { key: 'legs_quads', label: 'Quadriceps', parent: 'legs' },
  { key: 'legs_hams', label: 'Hamstrings', parent: 'legs' },
  { key: 'legs_glutes', label: 'Setemuskler', parent: 'legs' },
  { key: 'legs_calves', label: 'Legger', parent: 'legs' },
  { key: 'abs', label: 'Mage', parent: 'abs' },
  { key: 'forearms', label: 'Underarmer', parent: 'forearms' },
];

const PARENT_OF: Record<string, string> = {
  chest_upper: 'chest', chest_middle: 'chest', chest_lower: 'chest',
  shoulders_front: 'shoulders', shoulders_side: 'shoulders', shoulders_rear: 'shoulders',
  back_upper: 'back', back_lats: 'back', back_lower: 'back',
  biceps: 'biceps', triceps: 'triceps',
  legs_quads: 'legs', legs_hams: 'legs', legs_glutes: 'legs', legs_calves: 'legs',
  abs: 'abs', forearms: 'forearms',
};

export function getRegionParent(regionKey: string): string {
  return PARENT_OF[regionKey] ?? regionKey;
}

export function getRegionLabel(regionKey: string): string {
  return MUSCLE_REGIONS.find(r => r.key === regionKey)?.label ?? regionKey;
}

interface RegionSplit {
  region: string;
  intensity: number;
}

const DEFAULT_SPLITS: Record<string, RegionSplit[]> = {
  chest: [{ region: 'chest_middle', intensity: 1 }],
  shoulders: [{ region: 'shoulders_front', intensity: 0.5 }, { region: 'shoulders_side', intensity: 0.5 }],
  back: [{ region: 'back_lats', intensity: 0.5 }, { region: 'back_upper', intensity: 0.3 }, { region: 'back_lower', intensity: 0.2 }],
  biceps: [{ region: 'biceps', intensity: 1 }],
  triceps: [{ region: 'triceps', intensity: 1 }],
  legs: [{ region: 'legs_quads', intensity: 0.5 }, { region: 'legs_hams', intensity: 0.3 }, { region: 'legs_glutes', intensity: 0.2 }],
  abs: [{ region: 'abs', intensity: 1 }],
  glutes: [{ region: 'legs_glutes', intensity: 0.8 }, { region: 'legs_hams', intensity: 0.2 }],
  forearms: [{ region: 'forearms', intensity: 1 }],
  calves: [{ region: 'legs_calves', intensity: 1 }],
  hamstrings: [{ region: 'legs_hams', intensity: 1 }],
  quads: [{ region: 'legs_quads', intensity: 1 }],
};

const SECONDARY_SPLITS: Record<string, RegionSplit[]> = {
  chest: [{ region: 'shoulders_front', intensity: 0.4 }, { region: 'triceps', intensity: 0.4 }],
  shoulders: [{ region: 'shoulders_front', intensity: 0.3 }, { region: 'shoulders_side', intensity: 0.3 }, { region: 'shoulders_rear', intensity: 0.3 }],
  back: [{ region: 'biceps', intensity: 0.5 }, { region: 'back_lats', intensity: 0.3 }, { region: 'back_upper', intensity: 0.3 }],
  legs: [{ region: 'legs_glutes', intensity: 0.3 }, { region: 'legs_hams', intensity: 0.3 }, { region: 'legs_calves', intensity: 0.2 }],
  triceps: [{ region: 'shoulders_front', intensity: 0.3 }],
  biceps: [{ region: 'forearms', intensity: 0.5 }],
  abs: [{ region: 'back_lower', intensity: 0.2 }],
  glutes: [{ region: 'legs_hams', intensity: 0.3 }],
};

interface NameRule {
  match: (name: string) => boolean;
  splits: RegionSplit[];
}

const NAME_RULES: NameRule[] = [
  { match: n => /incline/i.test(n), splits: [{ region: 'chest_upper', intensity: 1 }] },
  { match: n => /decline/i.test(n), splits: [{ region: 'chest_lower', intensity: 1 }] },
  { match: n => /pullover|dumbbell pullover/i.test(n), splits: [{ region: 'chest_upper', intensity: 0.7 }, { region: 'back_lats', intensity: 0.3 }] },
  { match: n => /lateral raise|side raise|lateral front raise/i.test(n), splits: [{ region: 'shoulders_side', intensity: 1 }] },
  { match: n => /front raise/i.test(n), splits: [{ region: 'shoulders_front', intensity: 1 }] },
  { match: n => /rear delt|face pull|bent.over.*raise|reverse fly|reverse pec|back fly/i.test(n), splits: [{ region: 'shoulders_rear', intensity: 1 }] },
  { match: n => /arnold press/i.test(n), splits: [{ region: 'shoulders_front', intensity: 0.5 }, { region: 'shoulders_side', intensity: 0.5 }] },
  { match: n => /shoulder press|military press|overhead press|dumbbell press.*shoulder|press.*shoulder/i.test(n), splits: [{ region: 'shoulders_front', intensity: 0.7 }, { region: 'shoulders_side', intensity: 0.3 }] },
  { match: n => /upright row/i.test(n), splits: [{ region: 'shoulders_side', intensity: 0.6 }, { region: 'back_upper', intensity: 0.4 }] },
  { match: n => /pull.?up|chin.?up|lat pulldown|pulldown/i.test(n), splits: [{ region: 'back_lats', intensity: 0.8 }, { region: 'back_upper', intensity: 0.2 }] },
  { match: n => /barbell row|bent over row|dumbbell row|row\b/i.test(n) && !/upright/i.test(n), splits: [{ region: 'back_upper', intensity: 0.5 }, { region: 'back_lats', intensity: 0.5 }] },
  { match: n => /seated row|cable row|close grip row/i.test(n), splits: [{ region: 'back_lats', intensity: 0.5 }, { region: 'back_upper', intensity: 0.5 }] },
  { match: n => /deadlift|romanian|rdl|stiff.leg/i.test(n), splits: [{ region: 'back_lower', intensity: 0.4 }, { region: 'legs_hams', intensity: 0.4 }, { region: 'legs_glutes', intensity: 0.2 }] },
  { match: n => /good morning|hyperextension|back extension/i.test(n), splits: [{ region: 'back_lower', intensity: 0.6 }, { region: 'legs_hams', intensity: 0.4 }] },
  { match: n => /shrug/i.test(n), splits: [{ region: 'back_upper', intensity: 1 }] },
  { match: n => /face pull|reverse fly|rear delt/i.test(n), splits: [{ region: 'shoulders_rear', intensity: 1 }] },
  { match: n => /squat|leg press|hack squat|leg extension|lunge|split squat|goblet/i.test(n), splits: [{ region: 'legs_quads', intensity: 0.7 }, { region: 'legs_glutes', intensity: 0.3 }] },
  { match: n => /leg curl|hamstring curl|stiff.leg|romanian dead/i.test(n), splits: [{ region: 'legs_hams', intensity: 1 }] },
  { match: n => /hip thrust|glute bridge|hip raise|cable kick|glute kick/i.test(n), splits: [{ region: 'legs_glutes', intensity: 1 }] },
  { match: n => /calf raise|calf press|seated calf/i.test(n), splits: [{ region: 'legs_calves', intensity: 1 }] },
  { match: n => /adductor|groin|inner thigh/i.test(n), splits: [{ region: 'legs_quads', intensity: 0.5 }, { region: 'legs_glutes', intensity: 0.5 }] },
  { match: n => /leg raise|leg lift|captain|toe touch|crunch|sit.up|hanging/i.test(n), splits: [{ region: 'abs', intensity: 1 }] },
  { match: n => /plank|side plank|ab wheel|ab roller/i.test(n), splits: [{ region: 'abs', intensity: 1 }] },
  { match: n => /hammer curl|preacher curl|concentration curl|curl\b/i.test(n), splits: [{ region: 'biceps', intensity: 1 }] },
  { match: n => /tricep pushdown|skull crusher|overhead extension|tricep extension|kickback|dip\b/i.test(n), splits: [{ region: 'triceps', intensity: 1 }] },
  { match: n => /wrist curl|reverse curl|farmer|grip/i.test(n), splits: [{ region: 'forearms', intensity: 1 }] },
];

function getPrimarySplits(muscleGroup: string, exerciseName: string): RegionSplit[] {
  for (const rule of NAME_RULES) {
    if (rule.match(exerciseName.toLowerCase())) {
      return rule.splits;
    }
  }
  return DEFAULT_SPLITS[muscleGroup] ?? [{ region: muscleGroup, intensity: 1 }];
}

export function getRegionsForExercise(
  muscleGroup: string,
  secondaryMuscles: string[] = [],
  exerciseName: string = ''
): { region: string; intensity: number }[] {
  const primary = getPrimarySplits(muscleGroup, exerciseName);
  const regions: { region: string; intensity: number }[] = primary.map(p => ({ region: p.region, intensity: p.intensity }));

  const seen = new Set(regions.map(r => r.region));
  const secondarySet = new Set<string>();
  (secondaryMuscles ?? []).forEach(sm => {
    (SECONDARY_SPLITS[sm] ?? DEFAULT_SPLITS[sm] ?? [{ region: sm, intensity: 1 }]).forEach(r => secondarySet.add(r.region));
  });

  secondarySet.forEach(r => {
    if (!seen.has(r)) {
      regions.push({ region: r, intensity: 0.3 });
      seen.add(r);
    }
  });

  return regions;
}
