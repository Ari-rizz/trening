import { supabase, Goal, GoalType } from './supabase';

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  bench: 'Benkpress',
  squat: 'Knebøy',
  deadlift: 'Markløft',
  bodyweight: 'Kroppsvekt',
  frequency: 'Økter per uke',
  custom: 'Tilpasset',
};

export const GOAL_TYPE_UNITS: Record<GoalType, string> = {
  bench: 'kg',
  squat: 'kg',
  deadlift: 'kg',
  bodyweight: 'kg',
  frequency: 'økter',
  custom: '',
};

export async function fetchGoals(): Promise<Goal[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return [];
  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });
  return (data ?? []) as Goal[];
}

export async function createGoal(
  goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'current_value'>
): Promise<Goal | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  const { data } = await supabase
    .from('goals')
    .insert({ ...goal, user_id: session.user.id })
    .select('*')
    .single();
  return data as Goal | null;
}

export async function updateGoalProgress(id: string, currentValue: number): Promise<void> {
  await supabase
    .from('goals')
    .update({ current_value: currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteGoal(id: string): Promise<void> {
  await supabase.from('goals').delete().eq('id', id);
}

export interface GoalProgress {
  progressPercent: number;
  weeksRemaining: number;
  weeklyIncreaseNeeded: number;
  estimatedCompletion: string | null;
  isOnTrack: boolean;
}

export function calculateGoalProgress(goal: Goal): GoalProgress {
  const start = new Date(goal.start_date);
  const now = new Date();
  const target = goal.target_date ? new Date(goal.target_date) : null;

  const totalChange = goal.target_value - goal.current_value;
  const achievedChange = goal.current_value - 0;
  const progressPercent = goal.target_value !== 0
    ? Math.min(100, Math.max(0, (achievedChange / goal.target_value) * 100))
    : 0;

  const weeksRemaining = target
    ? Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)))
    : 0;

  const weeklyIncreaseNeeded = target && weeksRemaining > 0
    ? totalChange / weeksRemaining
    : 0;

  const estimatedCompletion = target
    ? target.toISOString().split('T')[0]
    : null;

  const elapsedWeeks = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)));
  const expectedProgress = goal.target_value / elapsedWeeks;
  const isOnTrack = goal.current_value >= expectedProgress * 0.8;

  return {
    progressPercent: Math.round(progressPercent),
    weeksRemaining,
    weeklyIncreaseNeeded: Math.round(weeklyIncreaseNeeded * 10) / 10,
    estimatedCompletion,
    isOnTrack,
  };
}

export async function getCurrentValue(type: GoalType): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return 0;

  if (type === 'bodyweight') {
    const { data } = await supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .eq('user_id', session.user.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? Number(data.weight_kg) : 0;
  }

  if (type === 'frequency') {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { count } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_completed', true)
      .gte('date', since.toISOString().split('T')[0]);
    return count ?? 0;
  }

  const exerciseNameMap: Record<string, string> = {
    bench: 'Bench Press',
    squat: 'Squat',
    deadlift: 'Deadlift',
  };

  const { data: exercise } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', exerciseNameMap[type] ?? '')
    .limit(1)
    .maybeSingle();

  if (!exercise) return 0;

  const { data } = await supabase
    .from('personal_records')
    .select('one_rep_max')
    .eq('user_id', session.user.id)
    .eq('exercise_id', exercise.id)
    .order('achieved_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? Number(data.one_rep_max) : 0;
}
