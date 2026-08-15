'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Plus, Trash2, ChevronLeft, ChevronRight,
  Clock, CircleCheck as CheckCircle2, Circle, Pencil, X,
  GripVertical, ListOrdered, History, Timer, Info, Repeat2, Dumbbell, Star,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '@/lib/store';
import { Exercise } from '@/lib/supabase';
import { hapticMedium, hapticLight } from '@/lib/native';
import { ExercisesTab } from '@/components/exercises/ExercisesTab';
import { ExerciseDetail } from '@/components/exercises/ExerciseDetail';
import { ExerciseSwapSheet } from './ExerciseSwapSheet';
import { SupersetPickerSheet } from './SupersetPickerSheet';
import { StartWorkoutSheet } from './StartWorkoutSheet';
import { RestTimerBar } from './RestTimerBar';
import { SetTimerControls } from './SetTimerControls';
import { AddExerciseSaveSheet } from './AddExerciseSaveSheet';
import { supabase } from '@/lib/supabase';
import { calculate1RM, getMuscleGroupColor } from '@/lib/exercises-data';
import { useToast } from '@/hooks/use-toast';
import { writeWorkoutToHealth } from '@/lib/health';
import { isOnline, addQueuedWorkout, syncQueuedWorkouts, getQueueCount } from '@/lib/offline-sync';
import { useWorkoutReminders } from '@/lib/use-workout-reminders';
import { isNative } from '@/lib/native';

const APP_STORE_URL = 'https://apps.apple.com/app/id6797285632';
const WEB_APP_URL = 'https://irongrid.netlify.app';
const RATING_THRESHOLD = 3;

interface PreviousSessionSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  rpe: number;
}

interface PreviousSession {
  date: string;
  sets: PreviousSessionSet[];
}

export function WorkoutTab() {
  const {
    activeWorkout,
    startWorkout,
    endWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    replaceExerciseInWorkout,
    addSetToExercise,
    addWarmupSetToExercise,
    removeSetFromExercise,
    updateSet,
    toggleSetComplete,
    reorderExercises,
    setWorkoutName,
    setExerciseNotes,
    setExerciseTrackingType,
    toggleUnilateral,
    linkSuperset,
    unlinkSuperset,
    getSupersetPartner,
    startRestTimer,
    defaultRestSeconds,
  } = useAppStore();

  const { toast } = useToast();
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [previousSessions, setPreviousSessions] = useState<Record<string, PreviousSession[]>>({});
  const [trackingPrefs, setTrackingPrefs] = useState<Record<string, 'reps_weight' | 'time'>>({});
  const [showHistoryToast, setShowHistoryToast] = useState(false);
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<{ exerciseId: string; setNumber: number } | null>(null);
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const [showSupersetPicker, setShowSupersetPicker] = useState(false);
  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [pendingAddExercise, setPendingAddExercise] = useState<{
    exercise: Exercise;
    prevSets?: Array<{ weight: number; reps: number; rpe: number }>;
    prevNotes?: string;
    targetIndex: number;
  } | null>(null);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [rpeInputs, setRpeInputs] = useState<Record<string, string>>({});
  const historyToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const lastActivityRef = useRef(Date.now());
  useWorkoutReminders(lastActivityRef);

  const weightInputKey = (exerciseId: string, setNumber: number) => `${exerciseId}-${setNumber}`;
  const getWeightDisplay = (exerciseId: string, setNumber: number, storedWeight: number) => {
    const key = weightInputKey(exerciseId, setNumber);
    return key in weightInputs ? weightInputs[key] : (storedWeight || '');
  };
  const handleWeightChange = (exerciseId: string, setNumber: number, raw: string) => {
    const filtered = raw.replace(/[^0-9.,]/g, '');
    setWeightInputs(prev => ({ ...prev, [weightInputKey(exerciseId, setNumber)]: filtered }));
  };
  const handleWeightBlur = (exerciseId: string, setNumber: number) => {
    const key = weightInputKey(exerciseId, setNumber);
    const raw = weightInputs[key];
    if (raw !== undefined) {
      const parsed = parseFloat(raw.replace(',', '.')) || 0;
      updateSet(exerciseId, setNumber, 'weight', parsed);
      setWeightInputs(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  const getRpeDisplay = (exerciseId: string, setNumber: number, storedRpe: number) => {
    const key = weightInputKey(exerciseId, setNumber);
    return key in rpeInputs ? rpeInputs[key] : (storedRpe || '');
  };
  const handleRpeChange = (exerciseId: string, setNumber: number, raw: string) => {
    const filtered = raw.replace(/[^0-9.,]/g, '');
    setRpeInputs(prev => ({ ...prev, [weightInputKey(exerciseId, setNumber)]: filtered }));
  };
  const handleRpeBlur = (exerciseId: string, setNumber: number) => {
    const key = weightInputKey(exerciseId, setNumber);
    const raw = rpeInputs[key];
    if (raw !== undefined) {
      const parsed = parseFloat(raw.replace(',', '.')) || 0;
      updateSet(exerciseId, setNumber, 'rpe', parsed);
      setRpeInputs(prev => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchTrackingPrefs(uid);
    });
  }, []);

  const fetchTrackingPrefs = async (uid: string) => {
    const { data } = await supabase
      .from('user_exercise_preferences')
      .select('exercise_id, tracking_type')
      .eq('user_id', uid);
    if (data) {
      const prefs: Record<string, 'reps_weight' | 'time'> = {};
      for (const row of data) {
        prefs[row.exercise_id] = row.tracking_type as 'reps_weight' | 'time';
      }
      setTrackingPrefs(prefs);
    }
  };

  const handleToggleTrackingType = async (exerciseId: string, exerciseDbId: string) => {
    const current = trackingPrefs[exerciseDbId] ?? 'reps_weight';
    const next = current === 'reps_weight' ? 'time' : 'reps_weight';
    setTrackingPrefs(prev => ({ ...prev, [exerciseDbId]: next }));
    setExerciseTrackingType(exerciseId, next);
    if (userId) {
      await supabase.from('user_exercise_preferences').upsert({
        user_id: userId,
        exercise_id: exerciseDbId,
        tracking_type: next,
      }, { onConflict: 'user_id,exercise_id' });
    }
  };

  const handleSwapExercise = async (newExercise: Exercise, permanent: boolean) => {
    if (!activeWorkout || !userId) return;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    if (!currentEx) return;

    let previousSetsData: Array<{ weight: number; reps: number; rpe: number }> | undefined;
    const { data } = await supabase
      .from('workout_exercises')
      .select(`
        workout_sets(set_number, weight_kg, reps, rpe, is_completed),
        workouts!inner(user_id, is_completed)
      `)
      .eq('exercise_id', newExercise.id)
      .eq('workouts.user_id', userId)
      .eq('workouts.is_completed', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const sets = (data[0].workout_sets ?? [])
        .filter((s: any) => s.is_completed)
        .sort((a: any, b: any) => a.set_number - b.set_number)
        .map((s: any) => ({ weight: s.weight_kg ?? 0, reps: s.reps ?? 0, rpe: s.rpe ?? 0 }));
      if (sets.length > 0) previousSetsData = sets;
    }

    replaceExerciseInWorkout(currentEx.id, newExercise, previousSetsData);

    if (permanent && currentEx.templateExerciseId) {
      await supabase
        .from('template_exercises')
        .update({ exercise_id: newExercise.id })
        .eq('id', currentEx.templateExerciseId);
    }
  };

  const handleLinkSuperset = async (partnerExId: string, saveToTemplate: boolean) => {
    if (!activeWorkout) return;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    if (!currentEx) return;
    linkSuperset(currentEx.id, partnerExId);
    if (saveToTemplate && currentEx.templateExerciseId) {
      const partner = activeWorkout.exercises.find(e => e.id === partnerExId);
      const groupId = Date.now();
      await supabase.from('template_exercises').update({ superset_group: groupId }).eq('id', currentEx.templateExerciseId);
      if (partner?.templateExerciseId) {
        await supabase.from('template_exercises').update({ superset_group: groupId }).eq('id', partner.templateExerciseId);
      }
    }
    setShowSupersetPicker(false);
  };

  const handleUnlinkSuperset = async (saveToTemplate: boolean) => {
    if (!activeWorkout) return;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    if (!currentEx) return;
    const partner = getSupersetPartner(currentEx.id);
    unlinkSuperset(currentEx.id);
    if (saveToTemplate) {
      if (currentEx.templateExerciseId) {
        await supabase.from('template_exercises').update({ superset_group: null }).eq('id', currentEx.templateExerciseId);
      }
      if (partner?.templateExerciseId) {
        await supabase.from('template_exercises').update({ superset_group: null }).eq('id', partner.templateExerciseId);
      }
    }
    setShowSupersetPicker(false);
  };

  useEffect(() => {
    if (!activeWorkout) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeWorkout.startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  useEffect(() => {
    if (!activeWorkout || !userId) return;
    const currentEx = activeWorkout.exercises[currentExerciseIndex];
    if (!currentEx) return;

    const showToastForExercise = (exId: string) => {
      if (historyToastTimer.current) clearTimeout(historyToastTimer.current);
      setShowHistoryToast(true);
      historyToastTimer.current = setTimeout(() => setShowHistoryToast(false), 4000);
    };

    if (previousSessions[currentEx.exerciseId]) {
      if (previousSessions[currentEx.exerciseId].length > 0) {
        showToastForExercise(currentEx.exerciseId);
      }
      return;
    }

    fetchPreviousSessions(currentEx.exerciseId).then((hasSessions) => {
      if (hasSessions) showToastForExercise(currentEx.exerciseId);
    });
  }, [currentExerciseIndex, userId, activeWorkout?.exercises[currentExerciseIndex]?.exerciseId]);

  useEffect(() => {
    if (!activeWorkout) return;
    for (const ex of activeWorkout.exercises) {
      const pref = trackingPrefs[ex.exerciseId];
      if (pref && ex.trackingType !== pref) {
        setExerciseTrackingType(ex.id, pref);
      }
    }
  }, [activeWorkout?.exercises.length, trackingPrefs]);

  const fetchPreviousSessions = async (exerciseId: string) => {
    if (!userId) return;
    const { data } = await supabase
      .from('workout_exercises')
      .select(`
        workout_sets(set_number, weight_kg, reps, rpe, is_completed),
        workouts!inner(user_id, is_completed, date)
      `)
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', userId)
      .eq('workouts.is_completed', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      const sessions: PreviousSession[] = data.map((row: any) => ({
        date: row.workouts.date,
        sets: (row.workout_sets ?? [])
          .filter((s: any) => s.is_completed)
          .sort((a: any, b: any) => a.set_number - b.set_number),
      })).filter((s: PreviousSession) => s.sets.length > 0);

      setPreviousSessions(prev => ({ ...prev, [exerciseId]: sessions }));
      return sessions.length > 0;
    } else {
      setPreviousSessions(prev => ({ ...prev, [exerciseId]: [] }));
      return false;
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleFinishWorkout = async () => {
    if (!activeWorkout) {
      endWorkout();
      return;
    }

    // Refresh auth session before saving
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData.session?.user?.id;

    if (!currentUserId) {
      toast({
        title: 'Ikke innlogget',
        description: 'Sesjonen din har utløpt. Logg inn igjen for å lagre økten.',
        variant: 'destructive',
      });
      return;
    }

    setSavingWorkout(true);
    setSaveError(false);

    try {
      const totalVolume = activeWorkout.exercises.reduce((acc, ex) => {
        return acc + ex.sets.reduce((s, set) => {
          if (set.isWarmup) return s;
          const hasData = set.isCompleted || set.weight > 0 || set.reps > 0 || set.duration > 0;
          return s + (hasData ? set.weight * set.reps : 0);
        }, 0);
      }, 0);

      // Offline mode: queue the workout for later sync
      if (!isOnline()) {
        addQueuedWorkout({
          id: crypto.randomUUID(),
          name: activeWorkout.name,
          date: new Date(activeWorkout.startTime).toISOString(),
          durationSeconds: elapsed,
          totalVolumeKg: totalVolume,
          exercises: activeWorkout.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex,
            setType: ex.setType,
            notes: ex.notes,
            isUnilateral: ex.isUnilateral ?? false,
            supersetGroup: ex.supersetGroup ?? null,
            sets: ex.sets
              .filter(s => s.isCompleted || s.weight > 0 || s.reps > 0 || s.duration > 0)
              .map(s => ({
                setNumber: s.setNumber,
                reps: s.reps,
                weight: s.weight,
                rpe: s.rpe,
                duration: s.duration || 0,
                isWarmup: s.isWarmup,
              })),
          })),
          queuedAt: Date.now(),
        });

        toast({
          title: 'Økt lagret offline',
          description: `${activeWorkout.name} sendes automatisk når du er online igjen.`,
        });

        endWorkout();
        return;
      }

      const { data: workout, error: wErr } = await supabase.from('workouts').insert({
        user_id: currentUserId,
        name: activeWorkout.name,
        date: new Date(activeWorkout.startTime).toISOString(),
        duration_seconds: elapsed,
        is_completed: true,
        total_volume_kg: totalVolume,
      }).select().single();

      if (wErr || !workout) throw wErr || new Error('Kunne ikke opprette økt');

      for (const ex of activeWorkout.exercises) {
        const { data: we, error: weErr } = await supabase.from('workout_exercises').insert({
          workout_id: workout.id,
          exercise_id: ex.exerciseId,
          order_index: ex.orderIndex,
          set_type: ex.setType,
          notes: ex.notes,
          is_unilateral: ex.isUnilateral ?? false,
          superset_group: ex.supersetGroup ?? null,
        }).select().single();

        if (weErr || !we) continue;

        const setsToSave = ex.sets.filter(s => s.isCompleted || s.weight > 0 || s.reps > 0 || s.duration > 0);
        for (const set of setsToSave) {
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
              .eq('user_id', currentUserId)
              .eq('exercise_id', ex.exerciseId)
              .maybeSingle();

            if (!existingPR || oneRM > (existingPR.one_rep_max ?? 0)) {
              await supabase.from('personal_records').upsert({
                user_id: currentUserId,
                exercise_id: ex.exerciseId,
                weight_kg: set.weight,
                reps: set.reps,
                one_rep_max: oneRM,
                achieved_at: new Date().toISOString(),
                workout_id: workout.id,
              }, { onConflict: 'user_id,exercise_id' });
            }
          }
        }
      }

      // Sync any previously queued workouts
      const queueCount = getQueueCount();
      if (queueCount > 0) {
        await syncQueuedWorkouts(currentUserId);
      }

      toast({
        title: 'Økt lagret!',
        description: `${activeWorkout.name} - ${formatTime(elapsed)}`,
      });

      // Notify other tabs to refresh
      window.dispatchEvent(new Event('workout-saved'));

      // Write workout to health app if connected
      const startDate = new Date(activeWorkout.startTime);
      const endDate = new Date();
      await writeWorkoutToHealth('traditionalStrengthTraining', startDate, endDate, 0).catch(() => {});

      // Check if we should prompt for App Store rating
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('has_been_asked_to_rate')
          .eq('id', currentUserId)
          .maybeSingle();

        if (profile && !profile.has_been_asked_to_rate) {
          const { count } = await supabase
            .from('workouts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUserId)
            .eq('is_completed', true);

          if (count && count >= RATING_THRESHOLD) {
            await supabase
              .from('profiles')
              .update({ has_been_asked_to_rate: true })
              .eq('id', currentUserId);
            setShowRatingPrompt(true);
          }
        }
      } catch {}

      endWorkout();
    } catch (err) {
      console.error('Failed to save workout', err);
      setSaveError(true);
      toast({
        title: 'Lagring mislyktes',
        description: 'Økten ble ikke lagret. Tren igjen-knappen for å prøve på nytt.',
        variant: 'destructive',
      });
    } finally {
      setSavingWorkout(false);
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    let prevSets: Array<{ weight: number; reps: number; rpe: number }> | undefined;
    let prevNotes: string | undefined;

    if (userId) {
      const { data } = await supabase
        .from('workout_exercises')
        .select(`
          notes,
          workout_sets(set_number, weight_kg, reps, rpe, is_completed),
          workouts!inner(user_id, is_completed)
        `)
        .eq('exercise_id', exercise.id)
        .eq('workouts.user_id', userId)
        .eq('workouts.is_completed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        prevSets = (data[0].workout_sets ?? [])
          .filter((s: any) => s.is_completed)
          .sort((a: any, b: any) => a.set_number - b.set_number)
          .map((s: any) => ({ weight: s.weight_kg ?? 0, reps: s.reps ?? 0, rpe: s.rpe ?? 0 }));
        prevNotes = (data[0] as any).notes ?? undefined;
      }
    }

    const targetIndex = activeWorkout ? activeWorkout.exercises.length : 0;

    // If this workout is based on a template, ask whether to save to the plan too
    if (activeWorkout?.templateId) {
      setShowExercisePicker(false);
      setPendingAddExercise({ exercise, prevSets, prevNotes, targetIndex });
      return;
    }

    addExerciseToWorkout(exercise, prevSets, prevNotes);
    setShowExercisePicker(false);
    setCurrentExerciseIndex(targetIndex);
  };

  const handleConfirmAddExercise = async (saveToTemplate: boolean) => {
    if (!pendingAddExercise) return;
    const { exercise, prevSets, prevNotes, targetIndex } = pendingAddExercise;
    setPendingAddExercise(null);

    let templateExerciseId: string | undefined;

    if (saveToTemplate && activeWorkout?.templateId && userId) {
      const orderIndex = activeWorkout.exercises.length;
      const { data, error } = await supabase
        .from('template_exercises')
        .insert({
          template_id: activeWorkout.templateId,
          exercise_id: exercise.id,
          order_index: orderIndex,
          target_sets: prevSets?.length ?? 1,
          target_reps: prevSets?.[0]?.reps ?? 0,
          target_weight_kg: prevSets?.[0]?.weight ?? 0,
          notes: prevNotes ?? '',
          is_unilateral: false,
          warmup_sets: 0,
        })
        .select('id')
        .single();

      if (!error && data) {
        templateExerciseId = data.id;
      }
    }

    addExerciseToWorkout(exercise, prevSets, prevNotes, templateExerciseId);
    setCurrentExerciseIndex(targetIndex);
  };

  if (showExercisePicker) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-zinc-900">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowExercisePicker(false)} className="text-zinc-400 flex items-center gap-1.5 text-sm">
            <X size={16} /> Avbryt
          </motion.button>
          <h2 className="text-base font-bold text-white flex-1 text-center">Legg til øvelse</h2>
          <div className="w-16" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ExercisesTab onAddToWorkout={handleAddExercise} />
        </div>
      </div>
    );
  }

  if (!activeWorkout) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full px-6 pb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <Play size={36} className="text-red-500 ml-1" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Klar til å trene?</h2>
            <p className="text-zinc-500 text-sm mb-8">Start en ny økt og logg din progresjon</p>
            <motion.button
              data-tour="workout-start"
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowStartSheet(true)}
              className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
            >
              <Play size={18} className="fill-current" />
              Start ny økt
            </motion.button>
          </motion.div>
        </div>
        <StartWorkoutSheet key="start-sheet" onClose={() => setShowStartSheet(false)} open={showStartSheet} />
      </>
    );
  }

  if (showReorder) {
    return <ReorderScreen
      exercises={activeWorkout.exercises}
      onReorder={reorderExercises}
      onClose={() => setShowReorder(false)}
    />;
  }

  // If we land on a superset partner index, jump to the primary (first of pair)
  const rawCurrentEx = activeWorkout.exercises[currentExerciseIndex];
  const primaryIndexForSuperset = rawCurrentEx?.supersetGroup != null
    ? activeWorkout.exercises.findIndex(e => e.supersetGroup === rawCurrentEx.supersetGroup)
    : currentExerciseIndex;
  const effectiveIndex = primaryIndexForSuperset !== -1 ? primaryIndexForSuperset : currentExerciseIndex;
  if (effectiveIndex !== currentExerciseIndex) {
    // Redirect to primary — set state asynchronously to avoid render loop
    setTimeout(() => setCurrentExerciseIndex(effectiveIndex), 0);
  }
  const currentEx = activeWorkout.exercises[effectiveIndex];
  const totalExercises = activeWorkout.exercises.length;
  const prevHistory = currentEx ? previousSessions[currentEx.exerciseId] : undefined;

  return (
    <div className="relative flex flex-col h-full" onPointerDown={() => { lastActivityRef.current = Date.now(); }}>
      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-900">
        <div className="flex items-center justify-between mb-1.5">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={activeWorkout.name}
              onChange={e => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
              className="bg-transparent text-white text-base font-bold border-b border-red-500 outline-none flex-1 mr-3"
              autoFocus
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 group">
              <h2 className="text-base font-bold text-white">{activeWorkout.name}</h2>
              <Pencil size={12} className="text-zinc-600 group-active:text-zinc-400" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-zinc-400 text-xs">
              <Clock size={12} />
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400"
            >
              <X size={10} />
              Avbryt
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFinishWorkout}
              disabled={savingWorkout}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white ${
                saveError ? 'bg-red-600' : 'bg-green-600'
              }`}
            >
              <Square size={10} className="fill-current" />
              {savingWorkout ? '...' : saveError ? 'Prøv igjen' : 'Fullfør'}
            </motion.button>
          </div>
        </div>
        {/* Exercise navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
            {(() => {
              const seenGroups = new Set<number>();
              let navIndex = 0;
              return activeWorkout.exercises.map((ex, i) => {
                // Skip superset partners (only show the first of a pair)
                if (ex.supersetGroup != null) {
                  if (seenGroups.has(ex.supersetGroup)) return null;
                  seenGroups.add(ex.supersetGroup);
                }
                const myNavIndex = navIndex++;
                const partner = ex.supersetGroup != null
                  ? activeWorkout.exercises.find((e, j) => j !== i && e.supersetGroup === ex.supersetGroup)
                  : null;
                const allDoneA = ex.sets.length > 0 && ex.sets.every(s => s.isCompleted);
                const allDoneB = !partner || (partner.sets.length > 0 && partner.sets.every(s => s.isCompleted));
                const allDone = allDoneA && allDoneB;
                const isActive = i === currentExerciseIndex || (partner && activeWorkout.exercises.indexOf(partner) === currentExerciseIndex);
                return (
                  <div key={ex.id} className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => setCurrentExerciseIndex(i)}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-red-500 text-white scale-110'
                          : allDone
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : ex.supersetGroup != null
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {myNavIndex + 1}
                    </button>
                  </div>
                );
              });
            })()}
            <button
              onClick={() => setShowExercisePicker(true)}
              className="flex-shrink-0 w-7 h-7 rounded-lg bg-zinc-800 border border-dashed border-zinc-700 text-zinc-500 flex items-center justify-center"
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            onClick={() => setShowReorder(true)}
            className="p-1.5 text-zinc-500 active:text-white"
          >
            <ListOrdered size={16} />
          </button>
        </div>
      </div>

      <RestTimerBar />

      {/* Previous session history toast */}
      <AnimatePresence>
        {showHistoryToast && prevHistory && prevHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[6.5rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/50 rounded-full px-3 py-1.5 shadow-lg whitespace-nowrap"
          >
            <History size={11} className="text-zinc-500" />
            <span className="text-xs text-zinc-400">Fylt inn fra forrige gang</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current exercise view */}
      <div className="flex-1 overflow-y-auto pb-24">
        {totalExercises === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <p className="text-zinc-500 text-sm mb-4">Legg til øvelser for å starte</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowExercisePicker(true)}
              className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
            >
              Legg til øvelse
            </motion.button>
          </div>
        ) : currentEx ? (
          <div className="px-4 pt-4">
            {/* Exercise header */}
            <div
              className="flex items-center justify-between mb-4"
              onTouchStart={() => {
                longPressTimer.current = setTimeout(() => { setShowReorder(true); }, 500);
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              }}
              onTouchMove={() => {
                if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
              }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getMuscleGroupColor(currentEx.exercise.muscle_group) + '22' }}
                >
                  <span className="text-lg font-bold" style={{ color: getMuscleGroupColor(currentEx.exercise.muscle_group) }}>
                    {currentExerciseIndex + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  {(() => {
                    const partner = getSupersetPartner(currentEx.id);
                    if (partner) {
                      return (
                        <>
                          <h3
                            onClick={() => setShowExerciseInfo(true)}
                            className="text-white font-bold text-base leading-tight truncate active:text-zinc-300 transition-colors"
                          >
                            {currentEx.exercise.name}
                            <span className="text-zinc-500 font-normal"> + </span>
                            {partner.exercise.name}
                          </h3>
                          <p className="text-xs text-zinc-500 capitalize mt-0.5">{currentEx.exercise.muscle_group} · {partner.exercise.muscle_group}</p>
                        </>
                      );
                    }
                    return (
                      <>
                        <h3
                          onClick={() => setShowExerciseInfo(true)}
                          className="text-white font-bold text-base truncate active:text-zinc-300 transition-colors"
                        >{currentEx.exercise.name}</h3>
                        <p className="text-xs text-zinc-500 capitalize mt-0.5">{currentEx.exercise.equipment} · {currentEx.exercise.muscle_group}</p>
                      </>
                    );
                  })()}
                  <div className="flex items-center mt-1.5 gap-1.5">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-0.5">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => currentEx.isUnilateral && toggleUnilateral(currentEx.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          !currentEx.isUnilateral
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-500'
                        }`}
                      >
                        Bilateral
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => !currentEx.isUnilateral && toggleUnilateral(currentEx.id)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                          currentEx.isUnilateral
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        Unilateral
                      </motion.button>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSupersetPicker(true)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        currentEx.supersetGroup != null
                          ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      SS
                    </motion.button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowExerciseInfo(true)}
                  className="p-2 text-zinc-600 active:text-zinc-300"
                >
                  <Info size={16} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleToggleTrackingType(currentEx.id, currentEx.exerciseId)}
                  className={`p-2 rounded-lg transition-colors ${
                    (trackingPrefs[currentEx.exerciseId] ?? currentEx.trackingType ?? 'reps_weight') === 'time'
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-zinc-600 active:text-zinc-400'
                  }`}
                >
                  <Timer size={16} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowSwapSheet(true)}
                  className="p-2 text-zinc-600 active:text-orange-400"
                >
                  <Repeat2 size={16} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    removeExerciseFromWorkout(currentEx.id);
                    if (currentExerciseIndex >= activeWorkout.exercises.length - 1 && currentExerciseIndex > 0) {
                      setCurrentExerciseIndex(currentExerciseIndex - 1);
                    }
                  }}
                  className="p-2 text-zinc-600 active:text-red-400"
                >
                  <Trash2 size={16} />
                </motion.button>
              </div>
            </div>


            {/* Current sets */}
            {(() => {
              const supersetPartner = getSupersetPartner(currentEx.id);
              const trackingType = trackingPrefs[currentEx.exerciseId] ?? currentEx.trackingType ?? 'reps_weight';

              return (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                {supersetPartner ? (
                  /* Superset view — same grid as normal, two sub-rows per set */
                  <>
                  <div className="grid grid-cols-12 gap-1 px-4 py-2.5 text-xs text-zinc-600 font-medium border-b border-zinc-800/50">
                    <div className="col-span-1">Sett</div>
                    <div className="col-span-3 text-center">Vekt (kg)</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2 text-center">RPE</div>
                    <div className="col-span-1"></div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {currentEx.sets.map((set, setIdx) => {
                      const partnerSet = supersetPartner.sets[setIdx];
                      const partnerTrackingType = trackingPrefs[supersetPartner.exerciseId] ?? supersetPartner.trackingType ?? 'reps_weight';
                      const bothDone = set.isCompleted && (partnerSet?.isCompleted ?? false);
                      return (
                        <motion.div
                          key={set.setNumber}
                          data-tour={setIdx === 0 ? 'workout-set-row' : undefined}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl px-2 pt-1.5 pb-1 transition-colors ${
                            bothDone
                              ? set.isWarmup ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-green-500/10 border border-green-500/20'
                              : set.isWarmup ? 'bg-amber-500/5 border border-amber-500/10' : ''
                          }`}
                        >
                          {/* Row A */}
                          <div className="grid grid-cols-12 gap-1 items-center py-1">
                            <div className="col-span-1 flex flex-col items-center justify-center">
                              {set.isWarmup ? (
                                <span className="text-[10px] font-bold text-amber-500 leading-none">W{set.setNumber}</span>
                              ) : (
                                <span className="text-xs font-bold text-zinc-500">{set.setNumber}</span>
                              )}
                            </div>
                            {trackingType === 'time' ? (
                              <div className="col-span-7">
                                <SetTimerControls
                                  exerciseId={currentEx.id}
                                  exerciseDbId={currentEx.exerciseId}
                                  setNumber={set.setNumber}
                                  savedDuration={set.duration}
                                  isCompleted={set.isCompleted}
                                />
                              </div>
                            ) : (
                              <>
                                <div className="col-span-3">
                                  <input
                                    type="text"
                                    value={getWeightDisplay(currentEx.id, set.setNumber, set.weight)}
                                    onChange={e => handleWeightChange(currentEx.id, set.setNumber, e.target.value)}
                                    onBlur={() => handleWeightBlur(currentEx.id, set.setNumber)}
                                    className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                    inputMode="decimal" placeholder="0"
                                  />
                                </div>
                                <div className="col-span-4">
                                  <input
                                    type="number"
                                    value={set.reps || ''}
                                    onChange={e => updateSet(currentEx.id, set.setNumber, 'reps', parseInt(e.target.value) || 0)}
                                    className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                    inputMode="numeric" placeholder="0"
                                  />
                                </div>
                              </>
                            )}
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={getRpeDisplay(currentEx.id, set.setNumber, set.rpe)}
                                onChange={e => handleRpeChange(currentEx.id, set.setNumber, e.target.value)}
                                onBlur={() => handleRpeBlur(currentEx.id, set.setNumber)}
                                className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-xs font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                inputMode="decimal" placeholder="-"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => {
                                  toggleSetComplete(currentEx.id, set.setNumber);
                                  if (!set.isCompleted && !set.isWarmup) { startRestTimer(defaultRestSeconds); hapticMedium(); } else { hapticLight(); }
                                }}
                                className="p-0.5"
                              >
                                {set.isCompleted
                                  ? <CheckCircle2 size={22} className={set.isWarmup ? 'text-amber-400' : 'text-green-500'} />
                                  : <Circle size={22} className="text-zinc-700" />
                                }
                              </motion.button>
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => setConfirmDeleteSet({ exerciseId: currentEx.id, setNumber: set.setNumber })}
                                className="p-0.5"
                              >
                                <X size={14} className="text-zinc-600" />
                              </motion.button>
                            </div>
                          </div>
                          {/* Exercise A label */}
                          <p className="text-[10px] text-zinc-600 pl-6 pb-0.5 truncate">{currentEx.exercise.name}</p>
                          {/* Divider */}
                          <div className="h-px bg-zinc-800/60 mx-1 my-1" />
                          {/* Row B */}
                          {partnerSet && (
                            <>
                            <div className="grid grid-cols-12 gap-1 items-center py-1">
                              <div className="col-span-1" />
                              {partnerTrackingType === 'time' ? (
                                <div className="col-span-7">
                                  <SetTimerControls
                                    exerciseId={supersetPartner.id}
                                    exerciseDbId={supersetPartner.exerciseId}
                                    setNumber={partnerSet.setNumber}
                                    savedDuration={partnerSet.duration}
                                    isCompleted={partnerSet.isCompleted}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="col-span-3">
                                    <input
                                      type="text"
                                      value={getWeightDisplay(supersetPartner.id, partnerSet.setNumber, partnerSet.weight)}
                                      onChange={e => handleWeightChange(supersetPartner.id, partnerSet.setNumber, e.target.value)}
                                      onBlur={() => handleWeightBlur(supersetPartner.id, partnerSet.setNumber)}
                                      className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                      inputMode="decimal" placeholder="0"
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <input
                                      type="number"
                                      value={partnerSet.reps || ''}
                                      onChange={e => updateSet(supersetPartner.id, partnerSet.setNumber, 'reps', parseInt(e.target.value) || 0)}
                                      className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                      inputMode="numeric" placeholder="0"
                                    />
                                  </div>
                                </>
                              )}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  value={getRpeDisplay(supersetPartner.id, partnerSet.setNumber, partnerSet.rpe)}
                                  onChange={e => handleRpeChange(supersetPartner.id, partnerSet.setNumber, e.target.value)}
                                  onBlur={() => handleRpeBlur(supersetPartner.id, partnerSet.setNumber)}
                                  className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-xs font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                  inputMode="decimal" placeholder="-"
                                />
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => {
                                    toggleSetComplete(supersetPartner.id, partnerSet.setNumber);
                                    if (!partnerSet.isCompleted && !partnerSet.isWarmup) { startRestTimer(defaultRestSeconds); hapticMedium(); } else { hapticLight(); }
                                  }}
                                  className="p-0.5"
                                >
                                  {partnerSet.isCompleted
                                    ? <CheckCircle2 size={22} className={partnerSet.isWarmup ? 'text-amber-400' : 'text-green-500'} />
                                    : <Circle size={22} className="text-zinc-700" />
                                  }
                                </motion.button>
                              </div>
                              <div className="col-span-1" />
                            </div>
                            {/* Exercise B label */}
                            <p className="text-[10px] text-zinc-600 pl-6 pb-1 truncate">{supersetPartner.exercise.name}</p>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  <>
                  {/* Normal sets header */}
                  {trackingType === 'time' ? (
                    <div className="grid grid-cols-12 gap-1 px-4 py-2.5 text-xs text-zinc-600 font-medium border-b border-zinc-800/50">
                      <div className="col-span-1">Sett</div>
                      <div className="col-span-7 text-center">Tid</div>
                      <div className="col-span-2 text-center">RPE</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-1 px-4 py-2.5 text-xs text-zinc-600 font-medium border-b border-zinc-800/50">
                      <div className="col-span-1">Sett</div>
                      <div className="col-span-3 text-center">Vekt (kg)</div>
                      <div className="col-span-4 text-center">Reps</div>
                      <div className="col-span-2 text-center">RPE</div>
                      <div className="col-span-1"></div>
                      <div className="col-span-1"></div>
                    </div>
                  )}

                  {/* Normal set rows */}
                  <div className="px-3 py-2 space-y-1.5">
                    {currentEx.sets.map((set, setIdx) => (
                      <motion.div
                        key={set.setNumber}
                        data-tour={setIdx === 0 ? 'workout-set-row' : undefined}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`grid grid-cols-12 gap-1 items-center py-2 rounded-xl px-2 transition-colors ${
                          set.isCompleted
                            ? set.isWarmup ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-green-500/10 border border-green-500/20'
                            : set.isWarmup ? 'bg-amber-500/5 border border-amber-500/10' : ''
                        }`}
                      >
                        <div className="col-span-1 flex flex-col items-center justify-center">
                          {set.isWarmup ? (
                            <span className="text-[10px] font-bold text-amber-500 leading-none">W{set.setNumber}</span>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500">{set.setNumber}</span>
                          )}
                        </div>
                        {trackingType === 'time' ? (
                          <div className="col-span-7">
                            <SetTimerControls
                              exerciseId={currentEx.id}
                              exerciseDbId={currentEx.exerciseId}
                              setNumber={set.setNumber}
                              savedDuration={set.duration}
                              isCompleted={set.isCompleted}
                            />
                          </div>
                        ) : (
                          <>
                            <div className="col-span-3">
                              <input
                                type="text"
                                value={getWeightDisplay(currentEx.id, set.setNumber, set.weight)}
                                onChange={e => handleWeightChange(currentEx.id, set.setNumber, e.target.value)}
                                onBlur={() => handleWeightBlur(currentEx.id, set.setNumber)}
                                className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                inputMode="decimal"
                                placeholder="0"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="number"
                                value={set.reps || ''}
                                onChange={e => updateSet(currentEx.id, set.setNumber, 'reps', parseInt(e.target.value) || 0)}
                                className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                                inputMode="numeric"
                                placeholder="0"
                              />
                            </div>
                          </>
                        )}
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={getRpeDisplay(currentEx.id, set.setNumber, set.rpe)}
                            onChange={e => handleRpeChange(currentEx.id, set.setNumber, e.target.value)}
                            onBlur={() => handleRpeBlur(currentEx.id, set.setNumber)}
                            className="w-full bg-zinc-800 text-white text-center rounded-lg py-2.5 text-xs font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                            inputMode="decimal"
                            placeholder="-"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => {
                              toggleSetComplete(currentEx.id, set.setNumber);
                              if (!set.isCompleted && !set.isWarmup) { startRestTimer(defaultRestSeconds); hapticMedium(); } else { hapticLight(); }
                            }}
                            className="p-0.5"
                          >
                            {set.isCompleted
                              ? <CheckCircle2 size={22} className={set.isWarmup ? 'text-amber-400' : 'text-green-500'} />
                              : <Circle size={22} className="text-zinc-700" />
                            }
                          </motion.button>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => setConfirmDeleteSet({ exerciseId: currentEx.id, setNumber: set.setNumber })}
                            className="p-0.5"
                          >
                            <X size={14} className="text-zinc-600 hover:text-zinc-400 transition-colors" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  </>
                )}

                {/* Add/remove set */}
                <div className="px-4 pb-3 pt-1 space-y-1.5">
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addSetToExercise(currentEx.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-medium"
                    >
                      <Plus size={14} />
                      {supersetPartner ? 'Legg til sett (begge)' : 'Legg til sett'}
                    </motion.button>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addWarmupSetToExercise(currentEx.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
                  >
                    <Plus size={12} />
                    Legg til warmup-sett
                  </motion.button>
                </div>

                {/* Exercise notes */}
                <div className="px-4 pb-4">
                  <textarea
                    value={currentEx.notes}
                    onChange={e => setExerciseNotes(currentEx.id, e.target.value)}
                    placeholder="Notat til deg selv… (lagres til neste gang)"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                </div>
              </div>
              );
            })()}

            {/* Navigation between exercises — skip superset partners */}
            {(() => {
              // Build list of primary indices (first of each superset pair, or solo)
              const primaryIndices: number[] = [];
              const seen = new Set<number>();
              activeWorkout.exercises.forEach((ex, i) => {
                if (ex.supersetGroup != null) {
                  if (seen.has(ex.supersetGroup)) return;
                  seen.add(ex.supersetGroup);
                }
                primaryIndices.push(i);
              });
              const posInNav = primaryIndices.indexOf(effectiveIndex);
              const prevPrimary = posInNav > 0 ? primaryIndices[posInNav - 1] : null;
              const nextPrimary = posInNav < primaryIndices.length - 1 ? primaryIndices[posInNav + 1] : null;
              const isLast = nextPrimary === null;
              return (
            <div className="flex items-center justify-between mt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => prevPrimary !== null && setCurrentExerciseIndex(prevPrimary)}
                disabled={prevPrimary === null}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium disabled:opacity-30"
              >
                <ChevronLeft size={16} />
                Forrige
              </motion.button>
              <span className="text-xs text-zinc-600 font-mono">{posInNav + 1} / {primaryIndices.length}</span>
              {isLast ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFinishWorkout}
                  disabled={savingWorkout}
                  className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold ${
                    saveError ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  <Square size={12} className="fill-current" />
                  {savingWorkout ? '...' : saveError ? 'Prøv igjen' : 'Fullfør økt'}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => nextPrimary !== null && setCurrentExerciseIndex(nextPrimary)}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium"
                >
                  Neste
                  <ChevronRight size={16} />
                </motion.button>
              )}
            </div>
              );
            })()}

            {/* Add exercise button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowExercisePicker(true)}
              className="w-full mt-4 py-3.5 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-zinc-900"
            >
              <Plus size={16} />
              Legg til øvelse
            </motion.button>

            {/* Previous sessions history */}
            {(() => {
              const sessions = previousSessions[currentEx.exerciseId];
              const isLoading = sessions === undefined;
              const isEmpty = sessions !== undefined && sessions.length === 0;
              return (
                <div className="mt-6 mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-semibold">
                      <History size={12} />
                      Historikk
                    </div>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {isLoading && (
                    <div className="space-y-2">
                      {[1, 2].map(i => (
                        <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  )}

                  {isEmpty && (
                    <p className="text-zinc-600 text-xs text-center py-4">Ingen historikk ennå</p>
                  )}

                  {!isLoading && !isEmpty && sessions.map((session, si) => {
                    const d = new Date(session.date);
                    const dateLabel = d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });
                    const workingSets = session.sets.filter(s => s.weight_kg > 0 || s.reps > 0);
                    if (workingSets.length === 0) return null;
                    return (
                      <div key={si} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3 mb-2">
                        <p className="text-[11px] font-semibold text-zinc-500 mb-2 capitalize">{dateLabel}</p>
                        <div className="space-y-1">
                          {workingSets.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-5 text-zinc-600 font-mono text-center">{i + 1}</span>
                              <span className="font-semibold text-white tabular-nums">
                                {s.weight_kg > 0 ? `${s.weight_kg} kg` : '—'}
                              </span>
                              <span className="text-zinc-500">×</span>
                              <span className="font-semibold text-white tabular-nums">
                                {s.reps > 0 ? `${s.reps} reps` : '—'}
                              </span>
                              {s.rpe > 0 && (
                                <span className="ml-auto text-zinc-600 text-[10px]">RPE {s.rpe}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : null}
      </div>

      {/* Delete set confirmation */}
      <AnimatePresence>
        {confirmDeleteSet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={22} className="text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Slett sett?</h3>
                <p className="text-zinc-500 text-sm mt-2">Er du sikker på at du vil slette dette settet?</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmDeleteSet(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-sm font-bold"
                >
                  Avbryt
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    removeSetFromExercise(confirmDeleteSet.exerciseId, confirmDeleteSet.setNumber);
                    setConfirmDeleteSet(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold"
                >
                  Slett
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel workout confirmation */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <X size={24} className="text-red-400" />
                </div>
                <h3 className="text-white font-bold text-lg">Avbryt økt?</h3>
                <p className="text-zinc-500 text-sm mt-2">Økten blir ikke lagret og all data fra denne treningen vil forsvinne.</p>
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-sm font-bold"
                >
                  Nei, fortsett
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowCancelConfirm(false); endWorkout(); }}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold"
                >
                  Forkast økt
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exercise info full-screen modal */}
      <AnimatePresence>
        {showExerciseInfo && currentEx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <ExerciseDetail
              exercise={currentEx.exercise}
              onBack={() => setShowExerciseInfo(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {currentEx && userId && (
        <ExerciseSwapSheet
          open={showSwapSheet}
          currentExercise={currentEx.exercise}
          templateExerciseId={currentEx.templateExerciseId}
          userId={userId}
          onSwap={handleSwapExercise}
          onClose={() => setShowSwapSheet(false)}
        />
      )}

      {currentEx && activeWorkout && (
        <SupersetPickerSheet
          open={showSupersetPicker}
          currentExercise={{
            id: currentEx.id,
            name: currentEx.exercise.name,
            muscleGroup: currentEx.exercise.muscle_group,
            equipment: currentEx.exercise.equipment,
            templateExerciseId: currentEx.templateExerciseId,
          }}
          currentSupersetPartnerId={getSupersetPartner(currentEx.id)?.id ?? null}
          availableExercises={activeWorkout.exercises
            .filter(e => e.id !== currentEx.id)
            .map(e => ({
              id: e.id,
              name: e.exercise.name,
              muscleGroup: e.exercise.muscle_group,
              equipment: e.exercise.equipment,
              templateExerciseId: e.templateExerciseId,
            }))}
          hasTemplate={!!currentEx.templateExerciseId}
          onLink={handleLinkSuperset}
          onUnlink={handleUnlinkSuperset}
          onClose={() => setShowSupersetPicker(false)}
        />
      )}

      <AddExerciseSaveSheet
        open={!!pendingAddExercise}
        exercise={pendingAddExercise?.exercise ?? null}
        onSelect={handleConfirmAddExercise}
        onClose={() => setPendingAddExercise(null)}
      />

      {/* App Store rating prompt */}
      <AnimatePresence>
        {showRatingPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
                <Star size={32} className="text-amber-400 fill-amber-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Liker du IronGrid?</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Vi jobber hardt for å gi deg den beste treningsappen. Hvis du liker IronGrid, vil vi sette pris på en vurdering i App Store!
              </p>
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setShowRatingPrompt(false);
                    window.open(isNative() ? APP_STORE_URL : WEB_APP_URL, '_blank');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-amber-500 text-black font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Star size={16} className="fill-current" />
                  Vurder i App Store
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowRatingPrompt(false)}
                  className="w-full py-3.5 rounded-2xl bg-zinc-800 text-zinc-400 text-sm font-medium"
                >
                  Kanskje senere
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableExerciseCard({ id, name, muscleGroup, index }: { id: string; name: string; muscleGroup: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 bg-zinc-900 border rounded-xl p-3 ${isDragging ? 'border-red-500/50 shadow-lg shadow-red-500/20 opacity-80 z-50' : 'border-zinc-800'}`}
    >
      <button {...attributes} {...listeners} className="touch-none text-zinc-600 active:text-zinc-300 transition-colors p-1 -ml-1 cursor-grab active:cursor-grabbing">
        <GripVertical size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{name}</p>
        <p className="text-xs text-zinc-500 capitalize">{muscleGroup}</p>
      </div>
      <span className="text-zinc-600 text-xs font-mono">{index + 1}</span>
    </div>
  );
}

function ReorderScreen({
  exercises,
  onReorder,
  onClose,
}: {
  exercises: Array<{ id: string; exercise: { name: string; muscle_group: string } }>;
  onReorder: (from: number, to: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState(() => exercises.map(e => e.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setItems(prev => arrayMove(prev, oldIndex, newIndex));
    onReorder(oldIndex, newIndex);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-900">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="text-zinc-400">
          <X size={20} />
        </motion.button>
        <h2 className="text-lg font-bold text-white flex-1">Endre rekkefølge</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 pb-24">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((id, index) => {
              const ex = exercises.find(e => e.id === id);
              if (!ex) return null;
              return (
                <SortableExerciseCard
                  key={id}
                  id={id}
                  name={ex.exercise.name}
                  muscleGroup={ex.exercise.muscle_group}
                  index={index}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        <p className="text-center text-zinc-600 text-xs mt-4">Hold og dra håndtaket for å endre rekkefølge</p>
      </div>
    </div>
  );
}
