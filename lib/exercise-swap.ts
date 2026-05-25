import { supabase, Exercise } from './supabase';

export interface ScoredExercise {
  exercise: Exercise;
  score: number;
}

export async function fetchSimilarExercises(
  current: Exercise,
  userId: string
): Promise<ScoredExercise[]> {
  const { data } = await supabase
    .from('exercises')
    .select('*')
    .eq('muscle_group', current.muscle_group)
    .neq('id', current.id)
    .order('name');

  if (!data || data.length === 0) return [];

  const scored: ScoredExercise[] = (data as Exercise[]).map(ex => {
    let score = 0;

    if (current.force && ex.force && ex.force === current.force) score += 3;
    if (ex.equipment === current.equipment) score += 2;
    if (ex.difficulty === current.difficulty) score += 1;
    if (current.mechanic && ex.mechanic && ex.mechanic === current.mechanic) score += 1;

    return { exercise: ex, score };
  });

  scored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));

  return scored.slice(0, 20);
}
