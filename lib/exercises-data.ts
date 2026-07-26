import { MuscleGroup, Equipment, Difficulty } from './supabase';

export const MUSCLE_GROUPS: { value: MuscleGroup; label: string; color: string }[] = [
  { value: 'chest', label: 'Bryst', color: '#ef4444' },
  { value: 'back', label: 'Rygg', color: '#3b82f6' },
  { value: 'shoulders', label: 'Skuldre', color: '#f59e0b' },
  { value: 'biceps', label: 'Biceps', color: '#10b981' },
  { value: 'triceps', label: 'Triceps', color: '#8b5cf6' },
  { value: 'legs', label: 'Bein', color: '#06b6d4' },
  { value: 'abs', label: 'Mage', color: '#f97316' },
  { value: 'glutes', label: 'Glutes', color: '#ec4899' },
  { value: 'forearms', label: 'Underarm', color: '#84cc16' },
  { value: 'full body', label: 'Full kropp', color: '#6366f1' },
  { value: 'cardio', label: 'Cardio', color: '#14b8a6' },
];

export const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'barbell', label: 'Stang' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Kabel' },
  { value: 'machine', label: 'Maskin' },
  { value: 'bodyweight', label: 'Kroppsvekt' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'resistance band', label: 'Strikk' },
  { value: 'other', label: 'Annet' },
];

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Nybegynner' },
  { value: 'intermediate', label: 'Middels' },
  { value: 'advanced', label: 'Avansert' },
];

export const getMuscleGroupLabel = (value: string): string => {
  return MUSCLE_GROUPS.find(m => m.value === value)?.label ?? value;
};

export const getMuscleGroupColor = (value: string): string => {
  return MUSCLE_GROUPS.find(m => m.value === value)?.color ?? '#6b7280';
};

export const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};
