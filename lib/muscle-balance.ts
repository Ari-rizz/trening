import { supabase, MuscleActivation } from './supabase';
import { getRegionsForExercise, getRegionLabel, MUSCLE_REGIONS } from './muscle-regions';

export interface RegionBalance {
  region: string;
  label: string;
  parent: string;
  totalVolume: number;
  totalSets: number;
  weeklySets: number;
  percentage: number;
  status: 'undertrained' | 'balanced' | 'overtrained';
}

export interface BalanceRecommendation {
  title: string;
  description: string;
  severity: 'info' | 'warning';
}

const WEEKS_WINDOW = 4;

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
      const regions = getRegionsForExercise(ex.muscle_group, ex.name);

      for (const { region, intensity } of regions) {
        rows.push({
          user_id: userId,
          workout_id: workout.id,
          exercise_id: ex.id,
          region,
          sets: Math.round(completedSets.length * intensity * 10) / 10,
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
      sets: existing.sets + Number(a.sets),
    });
  }

  const totalSets = Array.from(regionMap.values()).reduce((a, v) => a + v.sets, 0) || 1;

  return MUSCLE_REGIONS.map(region => {
    const data = regionMap.get(region.key) ?? { volume: 0, sets: 0 };
    const percentage = (data.sets / totalSets) * 100;
    const weeklySets = data.sets / WEEKS_WINDOW;
    let status: 'undertrained' | 'balanced' | 'overtrained' = 'balanced';
    if (weeklySets < 3) status = 'undertrained';
    if (weeklySets > 25) status = 'overtrained';

    return {
      region: region.key,
      label: region.label,
      parent: region.parent,
      totalVolume: Math.round(data.volume),
      totalSets: data.sets,
      weeklySets: Math.round(weeklySets * 10) / 10,
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
  if (front && rear && front.weeklySets > 0 && rear.weeklySets > 0) {
    const ratio = front.weeklySets / Math.max(rear.weeklySets, 0.1);
    if (ratio > 3) {
      recs.push({
        title: 'Skulderubalanse: forside dominerer',
        description: `Du gjør ${front.weeklySets} sett/uken på forside vs ${rear.weeklySets} på bakside. Legg til face pulls eller bakoverlendinger for å utjevne.`,
        severity: 'warning',
      });
    }
  }

  const legs = findByParent('legs');
  const quads = legs.find(b => b.region === 'legs_quads');
  const hams = legs.find(b => b.region === 'legs_hams');
  if (quads && hams && quads.weeklySets > 0 && hams.weeklySets > 0) {
    const ratio = quads.weeklySets / Math.max(hams.weeklySets, 0.1);
    if (ratio > 2.5) {
      recs.push({
        title: 'Beinubalanse: quadriceps dominerer',
        description: `Quadriceps får ${quads.weeklySets} sett/uken mot ${hams.weeklySets} for hamstrings. Legg til beincurls eller rumenske markløft.`,
        severity: 'warning',
      });
    }
  }

  const chest = findByParent('chest');
  const upperChest = chest.find(b => b.region === 'chest_upper');
  if (upperChest && upperChest.status === 'undertrained' && chest.some(b => b.weeklySets > 0)) {
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
      description: `Du har ${abs.weeklySets} sett/uken på mage. Vurder 8-12 sett per uke for god kjernestabilitet.`,
      severity: 'info',
    });
  }

  const pushVolume = (balances.filter(b => ['chest', 'shoulders_front', 'shoulders_side', 'triceps'].some(r => b.region === r)).reduce((a, b) => a + b.weeklySets, 0));
  const pullVolume = (balances.filter(b => ['back_lats', 'back_upper', 'back_lower', 'shoulders_rear', 'biceps'].some(r => b.region === r)).reduce((a, b) => a + b.weeklySets, 0));
  if (pushVolume > 0 && pullVolume > 0) {
    const ratio = pushVolume / Math.max(pullVolume, 0.1);
    if (ratio > 1.6) {
      recs.push({
        title: 'Push/pull-ubalanse',
        description: `Du gjør ${pushVolume.toFixed(1)} push-sett/uken mot ${pullVolume.toFixed(1)} pull-sett. Mer trekk for sunne skuldre.`,
        severity: 'warning',
      });
    }
  }

  return recs;
}
