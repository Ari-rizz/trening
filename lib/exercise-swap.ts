import { supabase, Exercise } from './supabase';

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
  isSimilar: boolean;
}

export interface SwapFilters {
  equipment?: string | null;
  muscleGroup?: string | null;
  difficulty?: string | null;
  search?: string | null;
}

export async function fetchSimilarExercises(
  current: Exercise,
  userId: string
): Promise<ScoredExercise[]> {
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .neq('id', current.id)
    .or(`muscle_group.eq.${current.muscle_group},secondary_muscles.cs.{${current.muscle_group}}`)
    .order('name');

  if (!data || data.length === 0) return [];

  const scored: ScoredExercise[] = (data as Exercise[]).map(ex => {
    let score = 0;

    if (current.force && ex.force && ex.force === current.force) score += 3;
    if (ex.equipment === current.equipment) score += 2;
    if (ex.difficulty === current.difficulty) score += 1;
    if (current.mechanic && ex.mechanic && ex.mechanic === current.mechanic) score += 1;

    const currentSecondary = current.secondary_muscles ?? [];
    const exSecondary = ex.secondary_muscles ?? [];
    const overlap = currentSecondary.filter(m => exSecondary.includes(m));
    score += overlap.length * 2;

    if (ex.muscle_group === current.muscle_group) score += 3;

    return { exercise: ex, score, isSimilar: score >= 5 };
  });

  scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));

  return scored.slice(0, 30);
}

export async function fetchExercisesWithFilters(
  filters: SwapFilters
): Promise<Exercise[]> {
  let query = supabase.from('exercises').select('*').neq('is_custom', false).order('name');

  if (filters.muscleGroup) {
    query = query.eq('muscle_group', filters.muscleGroup);
  }
  if (filters.equipment) {
    query = query.eq('equipment', filters.equipment);
  }
  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data } = await query;
  return (data ?? []) as Exercise[];
}
