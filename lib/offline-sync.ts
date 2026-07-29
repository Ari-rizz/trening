'use client';

import { supabase } from './supabase';
import { calculate1RM } from './exercises-data';

export interface QueuedSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number;
  duration: number;
  isWarmup: boolean;
}

export interface QueuedExercise {
  exerciseId: string;
  orderIndex: number;
  setType: string;
  notes: string;
  isUnilateral: boolean;
  supersetGroup: number | null;
  sets: QueuedSet[];
}

export interface QueuedWorkout {
  id: string;
  name: string;
  date: string;
  durationSeconds: number;
  totalVolumeKg: number;
  exercises: QueuedExercise[];
  queuedAt: number;
}

const STORAGE_KEY = 'irongrid-offline-queue';

export function getQueuedWorkouts(): QueuedWorkout[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedWorkout[];
  } catch {
    return [];
  }
}

export function addQueuedWorkout(workout: QueuedWorkout): void {
  const queue = getQueuedWorkouts();
  queue.push(workout);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-queue-changed'));
}

export function removeQueuedWorkout(id: string): void {
  const queue = getQueuedWorkouts().filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline-queue-changed'));
}

export function getQueueCount(): number {
  return getQueuedWorkouts().length;
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

async function syncOneWorkout(workout: QueuedWorkout, userId: string): Promise<boolean> {
  const { data: dbWorkout, error: wErr } = await supabase.from('workouts').insert({
    user_id: userId,
    name: workout.name,
    date: workout.date,
    duration_seconds: workout.durationSeconds,
    is_completed: true,
    total_volume_kg: workout.totalVolumeKg,
  }).select().single();

  if (wErr || !dbWorkout) return false;

  for (const ex of workout.exercises) {
    const { data: we, error: weErr } = await supabase.from('workout_exercises').insert({
      workout_id: dbWorkout.id,
      exercise_id: ex.exerciseId,
      order_index: ex.orderIndex,
      set_type: ex.setType,
      notes: ex.notes,
      is_unilateral: ex.isUnilateral,
      superset_group: ex.supersetGroup,
    }).select().single();

    if (weErr || !we) continue;

    for (const set of ex.sets) {
      await supabase.from('workout_sets').insert({
        workout_exercise_id: we.id,
        set_number: set.setNumber,
        reps: set.reps,
        weight_kg: set.weight,
        rpe: set.rpe,
        duration_seconds: set.duration || 0,
        is_warmup: set.isWarmup,
        is_completed: true,
      });

      if (!set.isWarmup && set.weight > 0 && set.reps > 0) {
        const oneRM = calculate1RM(set.weight, set.reps);
        const { data: existingPR } = await supabase
          .from('personal_records')
          .select('one_rep_max')
          .eq('user_id', userId)
          .eq('exercise_id', ex.exerciseId)
          .maybeSingle();

        if (!existingPR || oneRM > (existingPR.one_rep_max ?? 0)) {
          await supabase.from('personal_records').upsert({
            user_id: userId,
            exercise_id: ex.exerciseId,
            weight_kg: set.weight,
            reps: set.reps,
            one_rep_max: oneRM,
            achieved_at: workout.date,
            workout_id: dbWorkout.id,
          }, { onConflict: 'user_id,exercise_id' });
        }
      }
    }
  }

  return true;
}

export async function syncQueuedWorkouts(userId: string): Promise<{ synced: number; failed: number }> {
  const queue = getQueuedWorkouts();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const workout of queue) {
    try {
      const success = await syncOneWorkout(workout, userId);
      if (success) {
        removeQueuedWorkout(workout.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}
