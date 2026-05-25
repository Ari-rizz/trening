'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Exercise, Workout, WorkoutExercise, WorkoutSet, WorkoutTemplate } from './supabase';

interface ActiveSet {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number;
  duration: number;
  isWarmup: boolean;
  isCompleted: boolean;
}

interface ActiveExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: ActiveSet[];
  setType: string;
  trackingType: 'reps_weight' | 'time';
  notes: string;
  orderIndex: number;
  isUnilateral: boolean;
  templateExerciseId?: string;
}

interface ActiveWorkout {
  id?: string;
  name: string;
  startTime: number;
  exercises: ActiveExercise[];
  notes: string;
}

interface RestTimer {
  isRunning: boolean;
  seconds: number;
  totalSeconds: number;
}

interface AppState {
  // Active workout
  activeWorkout: ActiveWorkout | null;
  restTimer: RestTimer;

  // Settings
  defaultRestSeconds: number;

  // UI state
  currentTab: string;
  selectedMuscleGroup: string | null;

  // Local exercise cache (for offline)
  cachedExercises: Exercise[];

  // Actions
  startWorkout: (name?: string) => void;
  startWorkoutFromTemplate: (template: WorkoutTemplate, lastSessionData: Record<string, Array<{ weight: number; reps: number; rpe: number }>>, lastNotesData?: Record<string, string>) => void;
  endWorkout: () => void;
  addExerciseToWorkout: (exercise: Exercise, previousSets?: Array<{ weight: number; reps: number; rpe: number }>, previousNotes?: string) => void;
  removeExerciseFromWorkout: (exerciseId: string) => void;
  addSetToExercise: (exerciseId: string) => void;
  addWarmupSetToExercise: (exerciseId: string) => void;
  removeSetFromExercise: (exerciseId: string, setNumber: number) => void;
  updateSet: (exerciseId: string, setNumber: number, field: keyof ActiveSet, value: number | boolean) => void;
  toggleSetComplete: (exerciseId: string, setNumber: number) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  replaceExerciseInWorkout: (activeExerciseId: string, newExercise: Exercise, previousSets?: Array<{ weight: number; reps: number; rpe: number }>) => void;
  setWorkoutName: (name: string) => void;
  setExerciseNotes: (exerciseId: string, notes: string) => void;
  setExerciseTrackingType: (exerciseId: string, trackingType: 'reps_weight' | 'time') => void;
  toggleUnilateral: (exerciseId: string) => void;

  startRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;
  setDefaultRestSeconds: (seconds: number) => void;

  setCurrentTab: (tab: string) => void;
  setSelectedMuscleGroup: (group: string | null) => void;
  setCachedExercises: (exercises: Exercise[]) => void;

  // Tour mode
  isTourMode: boolean;
  tourSelectedExerciseId: string | null;
  startMockWorkout: () => void;
  clearMockWorkout: () => void;
  setIsTourMode: (value: boolean) => void;
  setTourSelectedExerciseId: (id: string | null) => void;
}

const DEFAULT_REST_SECONDS = 90;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      restTimer: { isRunning: false, seconds: 0, totalSeconds: DEFAULT_REST_SECONDS },
      defaultRestSeconds: DEFAULT_REST_SECONDS,
      currentTab: 'dashboard',
      selectedMuscleGroup: null,
      cachedExercises: [],
      isTourMode: false,
      tourSelectedExerciseId: null,

      startWorkout: (name = 'Ny økt') => {
        set({
          activeWorkout: {
            name,
            startTime: Date.now(),
            exercises: [],
            notes: '',
          },
        });
      },

      startWorkoutFromTemplate: (template, lastSessionData, lastNotesData = {}) => {
        const exercises: ActiveExercise[] = (template.template_exercises ?? [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((te, i) => {
            const exerciseId = `ex-${Date.now()}-${i}-${Math.random()}`;
            const exercise = te.exercises as unknown as Exercise;
            const lastSets = lastSessionData[te.exercise_id];
            const numWorkingSets = lastSets ? lastSets.length : te.target_sets;
            const numWarmupSets = (te as any).warmup_sets ?? 0;

            const bestWeight = lastSets && lastSets.length > 0
              ? Math.max(...lastSets.map((s: any) => s.weight))
              : te.target_weight_kg;

            const warmupSets: ActiveSet[] = Array.from({ length: numWarmupSets }, (_, si) => ({
              exerciseId,
              setNumber: si + 1,
              reps: 10,
              weight: bestWeight > 0 ? Math.round(bestWeight * 0.5 * 2) / 2 : 0,
              rpe: 0,
              duration: 0,
              isWarmup: true,
              isCompleted: false,
            }));

            const workingSets: ActiveSet[] = Array.from({ length: numWorkingSets }, (_, si) => ({
              exerciseId,
              setNumber: numWarmupSets + si + 1,
              reps: lastSets?.[si]?.reps ?? te.target_reps,
              weight: lastSets?.[si]?.weight ?? te.target_weight_kg,
              rpe: lastSets?.[si]?.rpe ?? 0,
              duration: 0,
              isWarmup: false,
              isCompleted: false,
            }));

            return {
              id: exerciseId,
              exerciseId: te.exercise_id,
              exercise,
              sets: [...warmupSets, ...workingSets],
              setType: 'standard',
              trackingType: 'reps_weight' as const,
              notes: lastNotesData[te.exercise_id] ?? te.notes ?? '',
              orderIndex: i,
              isUnilateral: (te as any).is_unilateral ?? false,
              templateExerciseId: te.id,
            };
          });

        set({
          activeWorkout: {
            name: template.name,
            startTime: Date.now(),
            exercises,
            notes: '',
          },
        });
      },

      endWorkout: () => {
        set({ activeWorkout: null });
      },

      addExerciseToWorkout: (exercise: Exercise, previousSets?: Array<{ weight: number; reps: number; rpe: number }>, previousNotes?: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        const exerciseId = `ex-${Date.now()}-${Math.random()}`;
        const numSets = previousSets && previousSets.length > 0 ? previousSets.length : 1;
        const sets: ActiveSet[] = Array.from({ length: numSets }, (_, i) => ({
          exerciseId,
          setNumber: i + 1,
          reps: previousSets?.[i]?.reps ?? 0,
          weight: previousSets?.[i]?.weight ?? 0,
          rpe: previousSets?.[i]?.rpe ?? 0,
          duration: 0,
          isWarmup: false,
          isCompleted: false,
        }));
        const newExercise: ActiveExercise = {
          id: exerciseId,
          exerciseId: exercise.id,
          exercise,
          sets,
          setType: 'standard',
          trackingType: 'reps_weight',
          notes: previousNotes ?? '',
          orderIndex: activeWorkout.exercises.length,
          isUnilateral: false,
        };
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: [...activeWorkout.exercises, newExercise],
          },
        });
      },

      removeExerciseFromWorkout: (id: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.filter(e => e.id !== id),
          },
        });
      },

      addSetToExercise: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              const lastSet = ex.sets[ex.sets.length - 1];
              const newSet: ActiveSet = {
                exerciseId,
                setNumber: ex.sets.length + 1,
                reps: lastSet?.reps ?? 0,
                weight: lastSet?.weight ?? 0,
                rpe: 0,
                duration: lastSet?.duration ?? 0,
                isWarmup: false,
                isCompleted: false,
              };
              return { ...ex, sets: [...ex.sets, newSet] };
            }),
          },
        });
      },

      addWarmupSetToExercise: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              // Insert warmup set before the first working set, or at end if all are warmup
              const lastWarmup = [...ex.sets].reverse().find(s => s.isWarmup);
              const firstWorking = ex.sets.find(s => !s.isWarmup);
              const refWeight = firstWorking?.weight ?? lastWarmup?.weight ?? 0;
              const newWarmup: ActiveSet = {
                exerciseId,
                setNumber: 0,
                reps: lastWarmup?.reps ?? 10,
                weight: refWeight > 0 ? Math.round(refWeight * 0.5 * 2) / 2 : 0,
                rpe: 0,
                duration: lastWarmup?.duration ?? 0,
                isWarmup: true,
                isCompleted: false,
              };
              const insertIdx = firstWorking
                ? ex.sets.indexOf(firstWorking)
                : ex.sets.length;
              const newSets = [
                ...ex.sets.slice(0, insertIdx),
                newWarmup,
                ...ex.sets.slice(insertIdx),
              ].map((s, i) => ({ ...s, setNumber: i + 1 }));
              return { ...ex, sets: newSets };
            }),
          },
        });
      },

      removeSetFromExercise: (exerciseId: string, setNumber: number) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              const filtered = ex.sets.filter(s => s.setNumber !== setNumber);
              const renumbered = filtered.map((s, i) => ({ ...s, setNumber: i + 1 }));
              return { ...ex, sets: renumbered };
            }),
          },
        });
      },

      updateSet: (exerciseId: string, setNumber: number, field: keyof ActiveSet, value: number | boolean) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.map(s => {
                  if (s.setNumber !== setNumber) return s;
                  return { ...s, [field]: value };
                }),
              };
            }),
          },
        });
      },

      toggleSetComplete: (exerciseId: string, setNumber: number) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              return {
                ...ex,
                sets: ex.sets.map(s => {
                  if (s.setNumber !== setNumber) return s;
                  return { ...s, isCompleted: !s.isCompleted };
                }),
              };
            }),
          },
        });
      },

      reorderExercises: (fromIndex: number, toIndex: number) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        const exercises = [...activeWorkout.exercises];
        const [moved] = exercises.splice(fromIndex, 1);
        exercises.splice(toIndex, 0, moved);
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: exercises.map((e, i) => ({ ...e, orderIndex: i })),
          },
        });
      },

      replaceExerciseInWorkout: (activeExerciseId: string, newExercise: Exercise, previousSets?: Array<{ weight: number; reps: number; rpe: number }>) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex => {
              if (ex.id !== activeExerciseId) return ex;
              const numSets = previousSets && previousSets.length > 0
                ? previousSets.length
                : ex.sets.filter(s => !s.isWarmup).length || 3;
              const warmupCount = ex.sets.filter(s => s.isWarmup).length;
              const bestWeight = previousSets && previousSets.length > 0
                ? Math.max(...previousSets.map(s => s.weight))
                : 0;
              const warmupSets: ActiveSet[] = Array.from({ length: warmupCount }, (_, i) => ({
                exerciseId: ex.id,
                setNumber: i + 1,
                reps: 10,
                weight: bestWeight > 0 ? Math.round(bestWeight * 0.5 * 2) / 2 : 0,
                rpe: 0,
                duration: 0,
                isWarmup: true,
                isCompleted: false,
              }));
              const workingSets: ActiveSet[] = Array.from({ length: numSets }, (_, i) => ({
                exerciseId: ex.id,
                setNumber: warmupCount + i + 1,
                reps: previousSets?.[i]?.reps ?? 0,
                weight: previousSets?.[i]?.weight ?? 0,
                rpe: previousSets?.[i]?.rpe ?? 0,
                duration: 0,
                isWarmup: false,
                isCompleted: false,
              }));
              return {
                ...ex,
                exerciseId: newExercise.id,
                exercise: newExercise,
                sets: [...warmupSets, ...workingSets],
                notes: '',
              };
            }),
          },
        });
      },

      setWorkoutName: (name: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({ activeWorkout: { ...activeWorkout, name } });
      },

      setExerciseNotes: (exerciseId: string, notes: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex =>
              ex.id === exerciseId ? { ...ex, notes } : ex
            ),
          },
        });
      },

      setExerciseTrackingType: (exerciseId: string, trackingType: 'reps_weight' | 'time') => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex =>
              ex.id === exerciseId ? { ...ex, trackingType } : ex
            ),
          },
        });
      },

      toggleUnilateral: (exerciseId: string) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            exercises: activeWorkout.exercises.map(ex =>
              ex.id === exerciseId ? { ...ex, isUnilateral: !ex.isUnilateral } : ex
            ),
          },
        });
      },

      startRestTimer: (seconds: number) => {
        set({ restTimer: { isRunning: true, seconds, totalSeconds: seconds } });
      },

      tickRestTimer: () => {
        const { restTimer } = get();
        if (!restTimer.isRunning) return;
        if (restTimer.seconds <= 0) {
          set({ restTimer: { ...restTimer, isRunning: false, seconds: 0 } });
          return;
        }
        set({ restTimer: { ...restTimer, seconds: restTimer.seconds - 1 } });
      },

      stopRestTimer: () => {
        const { restTimer } = get();
        set({ restTimer: { ...restTimer, isRunning: false } });
      },

      setDefaultRestSeconds: (seconds: number) => set({ defaultRestSeconds: seconds }),

      setCurrentTab: (tab: string) => set({ currentTab: tab }),
      setSelectedMuscleGroup: (group: string | null) => set({ selectedMuscleGroup: group }),
      setCachedExercises: (exercises: Exercise[]) => set({ cachedExercises: exercises }),

      setIsTourMode: (value: boolean) => set({ isTourMode: value }),
      setTourSelectedExerciseId: (id: string | null) => set({ tourSelectedExerciseId: id }),

      startMockWorkout: () => {
        const mockExId1 = 'mock-ex-1';
        const mockExId2 = 'mock-ex-2';
        const mockExercise1: Exercise = {
          id: 'mock-bench-press',
          name: 'Benkpress',
          muscle_group: 'chest',
          equipment: 'barbell',
          description: null,
          instructions: null,
          image_url: null,
          source_id: null,
          tracking_type: 'reps_weight',
        } as any;
        const mockExercise2: Exercise = {
          id: 'mock-ohp',
          name: 'Skulderpress',
          muscle_group: 'shoulders',
          equipment: 'barbell',
          description: null,
          instructions: null,
          image_url: null,
          source_id: null,
          tracking_type: 'reps_weight',
        } as any;
        set({
          activeWorkout: {
            name: 'Push A',
            startTime: Date.now() - 18 * 60 * 1000,
            notes: '',
            exercises: [
              {
                id: mockExId1,
                exerciseId: mockExercise1.id,
                exercise: mockExercise1,
                trackingType: 'reps_weight',
                setType: 'standard',
                notes: '',
                orderIndex: 0,
                isUnilateral: false,
                sets: [
                  { exerciseId: mockExId1, setNumber: 1, weight: 60, reps: 10, rpe: 0, duration: 0, isWarmup: true, isCompleted: true },
                  { exerciseId: mockExId1, setNumber: 2, weight: 80, reps: 8, rpe: 7, duration: 0, isWarmup: false, isCompleted: true },
                  { exerciseId: mockExId1, setNumber: 3, weight: 80, reps: 7, rpe: 8, duration: 0, isWarmup: false, isCompleted: true },
                  { exerciseId: mockExId1, setNumber: 4, weight: 80, reps: 0, rpe: 0, duration: 0, isWarmup: false, isCompleted: false },
                ],
              },
              {
                id: mockExId2,
                exerciseId: mockExercise2.id,
                exercise: mockExercise2,
                trackingType: 'reps_weight',
                setType: 'standard',
                notes: '',
                orderIndex: 1,
                isUnilateral: false,
                sets: [
                  { exerciseId: mockExId2, setNumber: 1, weight: 50, reps: 8, rpe: 0, duration: 0, isWarmup: false, isCompleted: false },
                  { exerciseId: mockExId2, setNumber: 2, weight: 50, reps: 8, rpe: 0, duration: 0, isWarmup: false, isCompleted: false },
                  { exerciseId: mockExId2, setNumber: 3, weight: 50, reps: 8, rpe: 0, duration: 0, isWarmup: false, isCompleted: false },
                ],
              },
            ],
          },
          restTimer: { isRunning: true, seconds: 47, totalSeconds: 90 },
        });
      },

      clearMockWorkout: () => {
        set({
          activeWorkout: null,
          restTimer: { isRunning: false, seconds: 0, totalSeconds: DEFAULT_REST_SECONDS },
          isTourMode: false,
          tourSelectedExerciseId: null,
        });
      },
    }),
    {
      name: 'irongrid-store',
      version: 2,
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        cachedExercises: state.cachedExercises,
        defaultRestSeconds: state.defaultRestSeconds,
      }),
    }
  )
);
