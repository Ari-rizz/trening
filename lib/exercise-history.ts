import { supabase } from './supabase';

export interface PreviousSetData {
  weight: number;
  reps: number;
  rpe: number;
}

export async function fetchLastSessionWeights(
  exerciseId: string
): Promise<PreviousSetData[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id,
      workout_exercises(
        id,
        exercise_id,
        workout_sets(weight_kg, reps, rpe, is_completed, is_warmup)
      )
    `)
    .eq('user_id', session.user.id)
    .eq('is_completed', true)
    .order('date', { ascending: false })
    .limit(20);

  if (!workouts) return [];

  for (const workout of workouts) {
    const we = (workout as any).workout_exercises?.find((e: any) => e.exercise_id === exerciseId);
    if (we && we.workout_sets && we.workout_sets.length > 0) {
      const completed = we.workout_sets
        .filter((s: any) => s.is_completed && !s.is_warmup)
        .sort((a: any, b: any) => {
          const aIdx = we.workout_sets.indexOf(a);
          const bIdx = we.workout_sets.indexOf(b);
          return aIdx - bIdx;
        });
      if (completed.length > 0) {
        return completed.map((s: any) => ({
          weight: Number(s.weight_kg) ?? 0,
          reps: Number(s.reps) ?? 0,
          rpe: Number(s.rpe) ?? 0,
        }));
      }
    }
  }

  return [];
}

export async function fetchLastSessionNotes(
  exerciseId: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return '';

  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      id,
      workout_exercises(exercise_id, notes)
    `)
    .eq('user_id', session.user.id)
    .eq('is_completed', true)
    .order('date', { ascending: false })
    .limit(20);

  if (!workouts) return '';

  for (const workout of workouts) {
    const we = (workout as any).workout_exercises?.find((e: any) => e.exercise_id === exerciseId);
    if (we && we.notes) return we.notes;
  }

  return '';
}
