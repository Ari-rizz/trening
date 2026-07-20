import { supabase, MuscleActivation } from './supabase';
import { getRegionsForExercise, getRegionLabel, MUSCLE_REGIONS } from './muscle-regions';

export interface RegionBalance {
  region: string;
  label: string;
  parent: string;
  totalVolume: number;
  totalSets: number;
  percentage: number;
  status: 'undertrained' | 'balanced' | 'overtrained';
}

export interface BalanceRecommendation {
  title: string;
  description: string;
  severity: 'info' | 'warning';
}

export async function fetchMuscleActivation(): Promise<MuscleActivation[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];
  const { data } = await supabase
    .from('muscle_activation')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as MuscleActivation[];
}

export async function recomputeMuscleActivation(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;
  const userId = session.user.id;

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id,
      workout_exercises(
        exercise_id,
        exercises(id, name, muscle_group, secondary_muscles),
        workout_sets(weight_kg, reps, is_completed)
      )
    `)
    .eq('user_id', userId)
    .eq('is_completed', true);

  if (!workouts || workouts.length === 0) return;

  await supabase.from('muscle_activation').delete().eq('user_id', userId);

  const rows: Omit<MuscleActivation, 'id' | 'created_at'>[] = [];

  for (const workout of workouts) {
    for (const we of (workout as any).workout_exercises ?? []) {
      const ex = we.exercises;
      if (!ex) continue;
      const completedSets = (we.workout_sets ?? []).filter((s: any) => s.is_completed);
      if (completedSets.length === 0) continue;

      const volume = completedSets.reduce((a: number, s: any) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
      const regions = getRegionsForExercise(ex.muscle_group, ex.secondary_muscles ?? []);

      for (const { region, intensity } of regions) {
        rows.push({
          user_id: userId,
          workout_id: workout.id,
          exercise_id: ex.id,
          region,
          sets: completedSets.length,
          volume_kg: Math.round(volume * intensity),
          intensity_score: Math.round(intensity * 100),
        });
      }
    }
  }

  if (rows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await supabase.from('muscle_activation').insert(rows.slice(i, i + chunkSize));
    }
  }
}

export function calculateBalance(activations: MuscleActivation[]): RegionBalance[] {
  const regionMap = new Map<string, { volume: number; sets: number }>();

  for (const a of activations) {
    const existing = regionMap.get(a.region) ?? { volume: 0, sets: 0 };
    regionMap.set(a.region, {
      volume: existing.volume + Number(a.volume_kg),
      sets: existing.sets + a.sets,
    });
  }

  const totalVolume = Array.from(regionMap.values()).reduce((a, v) => a + v.volume, 0) || 1;

  return MUSCLE_REGIONS.map(region => {
    const data = regionMap.get(region.key) ?? { volume: 0, sets: 0 };
    const percentage = (data.volume / totalVolume) * 100;
    let status: 'undertrained' | 'balanced' | 'overtrained' = 'balanced';
    if (percentage < 5 && data.sets > 0) status = 'undertrained';
    if (percentage > 25) status = 'overtrained';
    if (data.sets === 0) status = 'undertrained';

    return {
      region: region.key,
      label: region.label,
      parent: region.parent,
      totalVolume: Math.round(data.volume),
      totalSets: data.sets,
      percentage: Math.round(percentage),
      status,
    };
  });
}

export function generateRecommendations(balances: RegionBalance[]): BalanceRecommendation[] {
  const recs: BalanceRecommendation[] = [];

  const findByParent = (parent: string) => balances.filter(b => b.parent === parent);

  const shoulders = findByParent('shoulders');
  const front = shoulders.find(b => b.region === 'shoulders_front');
  const rear = shoulders.find(b => b.region === 'shoulders_rear');
  if (front && rear && front.totalVolume > 0 && rear.totalVolume > 0) {
    const ratio = front.totalVolume / rear.totalVolume;
    if (ratio > 3) {
      recs.push({
        title: 'Skulderubalanse: forside dominerer',
        description: 'Forsiden av skuldrene får betydelig mer volum enn baksiden. Legg til bakoverlendinger eller face pulls for å utjevne.',
        severity: 'warning',
      });
    }
  }

  const legs = findByParent('legs');
  const quads = legs.find(b => b.region === 'legs_quads');
  const hams = legs.find(b => b.region === 'legs_hams');
  if (quads && hams && quads.totalVolume > 0 && hams.totalVolume > 0) {
    const ratio = quads.totalVolume / hams.totalVolume;
    if (ratio > 2.5) {
      recs.push({
        title: 'Beinubalanse: quadriceps dominerer',
        description: 'Quadriceps får mye mer volum enn hamstrings. Legg til beincurls eller rumenske markløft for bedre balanse.',
        severity: 'warning',
      });
    }
  }

  const chest = findByParent('chest');
  const upperChest = chest.find(b => b.region === 'chest_upper');
  if (upperChest && upperChest.status === 'undertrained' && chest.some(b => b.totalVolume > 0)) {
    recs.push({
      title: 'Underutviklet øvre bryst',
      description: 'Inkliner benkpress eller pullovers kan bidra til å bygge opp øvre del av brystet.',
      severity: 'info',
    });
  }

  const abs = balances.find(b => b.region === 'abs');
  if (abs && abs.status === 'undertrained') {
    recs.push({
      title: 'Mage trenger oppmerksomhet',
      description: 'Du har lite volum på mageøvelser. Vurder å legge til 2-3 sett per uke.',
      severity: 'info',
    });
  }

  return recs;
}
