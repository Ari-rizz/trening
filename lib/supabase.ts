import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'abs'
  | 'glutes'
  | 'forearms'
  | 'full body'
  | 'cardio';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'resistance band'
  | 'other';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type SetType =
  | 'standard'
  | 'dropset'
  | 'superset'
  | 'rest_pause'
  | 'tempo'
  | 'amrap'
  | 'failure';

export interface Exercise {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles: string[];
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string;
  gif_url: string;
  image_url: string;
  images: string[];
  is_custom: boolean;
  created_by?: string;
  created_at: string;
  // Fields from free-exercise-db
  source_id?: string;
  body_part?: string;
  force?: string;
  mechanic?: string;
  category?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  date: string;
  duration_seconds: number;
  notes: string;
  is_template: boolean;
  is_completed: boolean;
  total_volume_kg: number;
  created_at: string;
  updated_at: string;
  workout_exercises?: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  notes: string;
  set_type: SetType;
  created_at: string;
  exercise?: Exercise;
  workout_sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  rpe: number;
  is_warmup: boolean;
  is_completed: boolean;
  duration_seconds: number;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  weight_kg: number;
  reps: number;
  one_rep_max: number;
  achieved_at: string;
  workout_id?: string;
  exercise?: Exercise;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  template_exercises?: TemplateExercise[];
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
  notes: string;
  created_at: string;
  exercises?: Exercise;
}
