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

const MUSCLE_GROUP_TO_REGIONS: Record<string, string[]> = {
  chest: ['chest_middle', 'chest_upper', 'chest_lower'],
  shoulders: ['shoulders_front', 'shoulders_side', 'shoulders_rear'],
  back: ['back_lats', 'back_upper', 'back_lower'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  legs: ['legs_quads', 'legs_hams', 'legs_glutes', 'legs_calves'],
  abs: ['abs'],
  forearms: ['forearms'],
  calves: ['legs_calves'],
  glutes: ['legs_glutes'],
  hamstrings: ['legs_hams'],
  quads: ['legs_quads'],
};

const SECONDARY_MUSCLE_REGIONS: Record<string, string[]> = {
  chest: ['shoulders_front', 'triceps'],
  shoulders: ['shoulders_front', 'shoulders_side', 'shoulders_rear'],
  back: ['biceps', 'back_lats', 'back_upper'],
  legs: ['legs_glutes', 'legs_hams', 'legs_calves'],
  triceps: ['shoulders_front'],
  biceps: ['forearms'],
};

export function getRegionsForExercise(
  muscleGroup: string,
  secondaryMuscles: string[] = []
): { region: string; intensity: number }[] {
  const regions: { region: string; intensity: number }[] = [];
  const primaryRegions = MUSCLE_GROUP_TO_REGIONS[muscleGroup] ?? [muscleGroup];
  primaryRegions.forEach(r => regions.push({ region: r, intensity: 1.0 }));

  const secondarySet = new Set<string>();
  (secondaryMuscles ?? []).forEach(sm => {
    (SECONDARY_MUSCLE_REGIONS[sm] ?? MUSCLE_GROUP_TO_REGIONS[sm] ?? [sm]).forEach(r => secondarySet.add(r));
  });

  secondarySet.forEach(r => {
    if (!regions.find(e => e.region === r)) {
      regions.push({ region: r, intensity: 0.4 });
    }
  });

  return regions;
}

export function getRegionLabel(regionKey: string): string {
  return MUSCLE_REGIONS.find(r => r.key === regionKey)?.label ?? regionKey;
}

export function getRegionParent(regionKey: string): string {
  return MUSCLE_REGIONS.find(r => r.key === regionKey)?.parent ?? regionKey;
}
