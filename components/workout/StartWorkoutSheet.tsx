'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Plus, Dumbbell, ClipboardList } from 'lucide-react';
import { supabase, WorkoutTemplate } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface Props {
  onClose: () => void;
  open?: boolean;
}

export function StartWorkoutSheet({ onClose, open = true }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const { startWorkout, startWorkoutFromTemplate, setCurrentTab } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchTemplates(uid);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchTemplates = async (uid: string) => {
    const { data } = await supabase
      .from('workout_templates')
      .select(`
        *,
        template_exercises(
          *,
          exercises(id, name, muscle_group, equipment, difficulty, instructions, gif_url, image_url, images, secondary_muscles, force, mechanic, category, is_custom)
        )
      `)
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    setTemplates((data ?? []) as WorkoutTemplate[]);
    setLoading(false);
  };

  const fetchLastSessionData = async (uid: string, exerciseIds: string[]) => {
    const result: Record<string, Array<{ weight: number; reps: number; rpe: number }>> = {};
    for (const exId of exerciseIds) {
      const { data } = await supabase
        .from('workout_exercises')
        .select(`workout_sets(set_number, weight_kg, reps, rpe, is_completed), workouts!inner(user_id, is_completed, date)`)
        .eq('exercise_id', exId)
        .eq('workouts.user_id', uid)
        .eq('workouts.is_completed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const sets = (data[0].workout_sets ?? [])
          .filter((s: any) => s.is_completed)
          .sort((a: any, b: any) => a.set_number - b.set_number)
          .map((s: any) => ({ weight: s.weight_kg ?? 0, reps: s.reps ?? 0, rpe: s.rpe ?? 0 }));
        if (sets.length > 0) result[exId] = sets;
      }
    }
    return result;
  };

  const handleStartBlank = () => {
    startWorkout();
    setCurrentTab('workout');
    onClose();
  };

  const handleStartTemplate = async (template: WorkoutTemplate) => {
    if (!userId || !template.template_exercises) return;
    setStartingId(template.id);
    const exerciseIds = template.template_exercises.map(te => te.exercise_id);
    const lastSessionData = await fetchLastSessionData(userId, exerciseIds);
    startWorkoutFromTemplate(template, lastSessionData);
    setCurrentTab('workout');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '85vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
            <h2 className="text-lg font-bold text-white">Start økt</h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <X size={16} className="text-zinc-400" />
            </motion.button>
          </div>

          <div className="overflow-y-auto pb-10" style={{ maxHeight: 'calc(85vh - 80px)' }}>
            {/* Blank workout */}
            <div className="px-5 pt-4 pb-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleStartBlank}
                className="w-full flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4 active:border-zinc-600 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <Plus size={20} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-sm">Tom økt</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Start uten plan og legg til øvelser selv</p>
                </div>
              </motion.button>
            </div>

            {/* Plans section */}
            <div className="px-5 pb-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Dine planer</p>
                {userId && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setCurrentTab('plans'); onClose(); }}
                    className="text-zinc-500 text-xs active:text-white"
                  >
                    Administrer
                  </motion.button>
                )}
              </div>

              {loading && (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-zinc-900 rounded-2xl animate-pulse" />
                  ))}
                </div>
              )}

              {!loading && !userId && (
                <div className="text-center py-8">
                  <ClipboardList size={32} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Logg inn for å bruke planene dine</p>
                </div>
              )}

              {!loading && userId && templates.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardList size={32} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Ingen planer ennå</p>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setCurrentTab('plans'); onClose(); }}
                    className="mt-3 text-red-400 text-sm font-semibold"
                  >
                    Lag en plan
                  </motion.button>
                </div>
              )}

              <div className="space-y-2">
                {templates.map(template => {
                  const exercises = template.template_exercises ?? [];
                  const muscleGroups = Array.from(
                    new Set(exercises.map(te => te.exercises?.muscle_group).filter(Boolean))
                  );
                  const isStarting = startingId === template.id;

                  return (
                    <motion.button
                      key={template.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartTemplate(template)}
                      disabled={!!startingId}
                      className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-left active:border-zinc-600 transition-colors disabled:opacity-60"
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Dumbbell size={16} className="text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{template.name || 'Uten navn'}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {muscleGroups.slice(0, 3).map(mg => (
                            <span
                              key={mg}
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                              style={{ backgroundColor: getMuscleGroupColor(mg!) + '22', color: getMuscleGroupColor(mg!) }}
                            >
                              {getMuscleGroupLabel(mg!)}
                            </span>
                          ))}
                          <span className="text-zinc-600 text-[10px]">{exercises.length} øvelser</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isStarting ? (
                          <div className="w-8 h-8 rounded-full border-2 border-red-500/40 border-t-red-500 animate-spin" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                            <Play size={12} className="text-red-400 fill-current ml-0.5" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  );
}
