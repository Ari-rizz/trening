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

export interface RegionSplit {
  region: string;
  intensity: number;
}

// ── Fallback logic (used only for custom exercises without activation_regions) ──

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
  cardio: [{ region: 'legs_quads', intensity: 1 }],
};

interface NameRule {
  match: (name: string) => boolean;
  splits: RegionSplit[];
}

const NAME_RULES: NameRule[] = [
  { match: n => /incline/i.test(n), splits: [{ region: 'chest_upper', intensity: 1 }] },
  { match: n => /decline/i.test(n), splits: [{ region: 'chest_lower', intensity: 1 }] },
  { match: n => /pullover/i.test(n), splits: [{ region: 'chest_upper', intensity: 0.7 }, { region: 'back_lats', intensity: 0.3 }] },
  { match: n => /lateral raise|side raise|lateral front raise/i.test(n), splits: [{ region: 'shoulders_side', intensity: 1 }] },
  { match: n => /front raise/i.test(n), splits: [{ region: 'shoulders_front', intensity: 1 }] },
  { match: n => /rear delt|face pull|bent.over.*raise|reverse fly|reverse pec|back fly/i.test(n), splits: [{ region: 'shoulders_rear', intensity: 1 }] },
  { match: n => /arnold press/i.test(n), splits: [{ region: 'shoulders_front', intensity: 0.5 }, { region: 'shoulders_side', intensity: 0.5 }] },
  { match: n => /shoulder press|military press|overhead press/i.test(n), splits: [{ region: 'shoulders_front', intensity: 0.7 }, { region: 'shoulders_side', intensity: 0.3 }] },
  { match: n => /upright row/i.test(n), splits: [{ region: 'shoulders_side', intensity: 0.6 }, { region: 'back_upper', intensity: 0.4 }] },
  { match: n => /pull.?up|chin.?up|lat pulldown|pulldown/i.test(n), splits: [{ region: 'back_lats', intensity: 0.8 }, { region: 'back_upper', intensity: 0.2 }] },
  { match: n => /barbell row|bent over row|dumbbell row|row\b/i.test(n) && !/upright/i.test(n), splits: [{ region: 'back_upper', intensity: 0.5 }, { region: 'back_lats', intensity: 0.5 }] },
  { match: n => /seated row|cable row|close grip row/i.test(n), splits: [{ region: 'back_lats', intensity: 0.5 }, { region: 'back_upper', intensity: 0.5 }] },
  { match: n => /deadlift|romanian|rdl|stiff.leg/i.test(n), splits: [{ region: 'back_lower', intensity: 0.4 }, { region: 'legs_hams', intensity: 0.4 }, { region: 'legs_glutes', intensity: 0.2 }] },
  { match: n => /good morning|hyperextension|back extension/i.test(n), splits: [{ region: 'back_lower', intensity: 0.6 }, { region: 'legs_hams', intensity: 0.4 }] },
  { match: n => /shrug/i.test(n), splits: [{ region: 'back_upper', intensity: 1 }] },
  { match: n => /squat|leg press|hack squat|leg extension|lunge|split squat|goblet/i.test(n), splits: [{ region: 'legs_quads', intensity: 0.7 }, { region: 'legs_glutes', intensity: 0.3 }] },
  { match: n => /leg curl|hamstring curl/i.test(n), splits: [{ region: 'legs_hams', intensity: 1 }] },
  { match: n => /hip thrust|glute bridge|hip raise|cable kick|glute kick/i.test(n), splits: [{ region: 'legs_glutes', intensity: 1 }] },
  { match: n => /calf raise|calf press|seated calf/i.test(n), splits: [{ region: 'legs_calves', intensity: 1 }] },
  { match: n => /adductor|groin|inner thigh/i.test(n), splits: [{ region: 'legs_quads', intensity: 0.5 }, { region: 'legs_glutes', intensity: 0.5 }] },
  { match: n => /leg raise|leg lift|captain|toe touch|crunch|sit.up|hanging/i.test(n), splits: [{ region: 'abs', intensity: 1 }] },
  { match: n => /plank|side plank|ab wheel|ab roller/i.test(n), splits: [{ region: 'abs', intensity: 1 }] },
  { match: n => /hammer curl|preacher curl|concentration curl|curl\b/i.test(n), splits: [{ region: 'biceps', intensity: 1 }] },
  { match: n => /tricep pushdown|skull crusher|overhead extension|tricep extension|kickback/i.test(n), splits: [{ region: 'triceps', intensity: 1 }] },
  { match: n => /^(dips?|dips?\b.*triceps?|triceps?.*dips?)/i.test(n) && !/jerk dip|chest version/i.test(n), splits: [{ region: 'triceps', intensity: 1 }] },
  { match: n => /wrist curl|reverse curl|farmer|grip trainer|grip strength|hand gripper/i.test(n), splits: [{ region: 'forearms', intensity: 1 }] },
];

function getFallbackSplits(muscleGroup: string, exerciseName: string): RegionSplit[] {
  const lowerName = (exerciseName ?? '').toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.match(lowerName)) {
      return rule.splits;
    }
  }
  return DEFAULT_SPLITS[muscleGroup] ?? [{ region: muscleGroup, intensity: 1 }];
}

// ── Primary API: read stored activation_regions, fall back to name-matching ──

export function getRegionsForExercise(
  muscleGroup: string,
  exerciseName: string = '',
  activationRegions?: RegionSplit[] | null,
): RegionSplit[] {
  if (activationRegions && Array.isArray(activationRegions) && activationRegions.length > 0) {
    return activationRegions;
  }
  return getFallbackSplits(muscleGroup, exerciseName);
}
