'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pencil, Trash2, ClipboardList, ChevronRight, Dumbbell, X, FileDown } from 'lucide-react';
import { supabase, WorkoutTemplate, TemplateExercise, Exercise } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';
import { useAppStore } from '@/lib/store';
import { TemplateEditor } from './TemplateEditor';
import { PlanExportSheet } from './PlanExportSheet';

export function PlansTab() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const { startWorkoutFromTemplate, setCurrentTab } = useAppStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setUserEmail(data.session?.user?.email);
      if (uid) fetchTemplates(uid);
      else setLoading(false);
    });
  }, []);

  const fetchTemplates = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('workout_templates')
      .select(`
        *,
        template_exercises(
          *,
          exercises(id, name, muscle_group, equipment)
        )
      `)
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });

    setTemplates((data ?? []) as WorkoutTemplate[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('workout_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleStartTemplate = async (template: WorkoutTemplate) => {
    if (!userId || !template.template_exercises) return;

    const exerciseIds = template.template_exercises.map(te => te.exercise_id);
    const [lastSessionData, lastNotesData] = await Promise.all([
      fetchLastSessionData(userId, exerciseIds),
      fetchLastExerciseNotes(userId, exerciseIds),
    ]);

    startWorkoutFromTemplate(template, lastSessionData, lastNotesData);
    setCurrentTab('workout');
  };

  const fetchLastSessionData = async (uid: string, exerciseIds: string[]) => {
    const result: Record<string, Array<{ weight: number; reps: number; rpe: number }>> = {};

    for (const exId of exerciseIds) {
      const { data } = await supabase
        .from('workout_exercises')
        .select(`
          workout_sets(set_number, weight_kg, reps, rpe, is_completed),
          workouts!inner(user_id, is_completed, date)
        `)
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

  const fetchLastExerciseNotes = async (uid: string, exerciseIds: string[]) => {
    const result: Record<string, string> = {};

    for (const exId of exerciseIds) {
      const { data } = await supabase
        .from('workout_exercises')
        .select(`notes, workouts!inner(user_id, is_completed)`)
        .eq('exercise_id', exId)
        .eq('workouts.user_id', uid)
        .eq('workouts.is_completed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && (data[0] as any).notes) {
        result[exId] = (data[0] as any).notes;
      }
    }

    return result;
  };

  if (creating || editingTemplate) {
    return (
      <TemplateEditor
        template={editingTemplate}
        userId={userId!}
        onSave={() => {
          setCreating(false);
          setEditingTemplate(null);
          if (userId) fetchTemplates(userId);
        }}
        onCancel={() => {
          setCreating(false);
          setEditingTemplate(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planer</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Planlegg dine treningsøkter</p>
        </div>
        {userId && (
          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowExport(true)}
                className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center"
              >
                <FileDown size={16} className="text-zinc-400" />
              </motion.button>
            )}
          <motion.button
            data-tour="plans-new-button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setCreating(true)}
            className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center"
          >
            <Plus size={20} className="text-white" />
          </motion.button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !userId && (
          <div className="text-center py-16">
            <ClipboardList size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Logg inn for å lage treningsplaner</p>
            <p className="text-zinc-600 text-sm mt-1">Planlegg økter på forhånd og spor fremgangen din</p>
          </div>
        )}

        {!loading && userId && templates.length === 0 && (
          <div className="text-center py-16">
            <ClipboardList size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Ingen planer ennå</p>
            <p className="text-zinc-600 text-sm mt-1">Lag din første treningsplan for å komme i gang</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCreating(true)}
              className="mt-5 bg-red-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
            >
              Lag ny plan
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {templates.map((template, i) => {
            const exercises = template.template_exercises ?? [];
            const muscleGroups = Array.from(new Set(exercises.map(te => te.exercises?.muscle_group).filter(Boolean)));

            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base truncate">{template.name || 'Uten navn'}</h3>
                      {template.description && (
                        <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{template.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setEditingTemplate(template)}
                        className="p-2 text-zinc-500 active:text-white"
                      >
                        <Pencil size={14} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-zinc-500 active:text-red-400"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {muscleGroups.slice(0, 4).map(mg => (
                      <span
                        key={mg}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ backgroundColor: getMuscleGroupColor(mg!) + '22', color: getMuscleGroupColor(mg!) }}
                      >
                        {getMuscleGroupLabel(mg!)}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                      {exercises.length} øvelser
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    {exercises.slice(0, 3).map(te => (
                      <div key={te.id} className="flex items-center gap-2 text-xs text-zinc-400">
                        <Dumbbell size={10} className="text-zinc-600" />
                        <span className="truncate">{te.exercises?.name}</span>
                        <span className="text-zinc-600 ml-auto flex-shrink-0">{te.target_sets}x{te.target_reps}</span>
                      </div>
                    ))}
                    {exercises.length > 3 && (
                      <p className="text-[10px] text-zinc-600 pl-4">+{exercises.length - 3} flere</p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStartTemplate(template)}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 py-2.5 rounded-xl text-sm font-bold"
                  >
                    <Play size={14} className="fill-current" />
                    Start økt
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <PlanExportSheet
        open={showExport}
        templates={templates}
        userName={userEmail}
        userId={userId}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
