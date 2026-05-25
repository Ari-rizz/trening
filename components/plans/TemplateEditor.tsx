'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Dumbbell } from 'lucide-react';
import { supabase, WorkoutTemplate, TemplateExercise, Exercise } from '@/lib/supabase';
import { getMuscleGroupColor } from '@/lib/exercises-data';
import { ExercisesTab } from '@/components/exercises/ExercisesTab';

interface TemplateEditorProps {
  template: WorkoutTemplate | null;
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface LocalTemplateExercise {
  id?: string;
  exercise_id: string;
  exercise: Exercise;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight_kg: number;
  warmup_sets: number;
  notes: string;
}

export function TemplateEditor({ template, userId, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [exercises, setExercises] = useState<LocalTemplateExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template?.template_exercises) {
      setExercises(
        template.template_exercises
          .sort((a, b) => a.order_index - b.order_index)
          .map(te => ({
            id: te.id,
            exercise_id: te.exercise_id,
            exercise: te.exercises as unknown as Exercise,
            order_index: te.order_index,
            target_sets: te.target_sets,
            target_reps: te.target_reps,
            target_weight_kg: te.target_weight_kg,
            warmup_sets: (te as any).warmup_sets ?? 0,
            notes: te.notes,
          }))
      );
    }
  }, [template]);

  const addExercise = (exercise: Exercise) => {
    setExercises(prev => [
      ...prev,
      {
        exercise_id: exercise.id,
        exercise,
        order_index: prev.length,
        target_sets: 3,
        target_reps: 10,
        target_weight_kg: 0,
        warmup_sets: 0,
        notes: '',
      },
    ]);
    setShowPicker(false);
  };

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index).map((e, i) => ({ ...e, order_index: i })));
  };

  const updateExercise = (index: number, field: keyof LocalTemplateExercise, value: any) => {
    setExercises(prev => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);

    try {
      let templateId = template?.id;

      if (templateId) {
        await supabase
          .from('workout_templates')
          .update({ name: name.trim(), description: description.trim(), updated_at: new Date().toISOString() })
          .eq('id', templateId);

        await supabase.from('template_exercises').delete().eq('template_id', templateId);
      } else {
        const { data } = await supabase
          .from('workout_templates')
          .insert({ user_id: userId, name: name.trim(), description: description.trim() })
          .select()
          .single();
        templateId = data?.id;
      }

      if (templateId) {
        const rows = exercises.map((e, i) => ({
          template_id: templateId!,
          exercise_id: e.exercise_id,
          order_index: i,
          target_sets: e.target_sets,
          target_reps: e.target_reps,
          target_weight_kg: e.target_weight_kg,
          warmup_sets: e.warmup_sets,
          notes: e.notes,
        }));
        await supabase.from('template_exercises').insert(rows);
      }

      onSave();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
    setSaving(false);
  };

  if (showPicker) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-zinc-900">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowPicker(false)} className="text-zinc-400 text-sm">
            Avbryt
          </motion.button>
          <h2 className="text-base font-bold text-white flex-1 text-center">Velg ovelse</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ExercisesTab onAddToWorkout={addExercise} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-900">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCancel} className="text-zinc-400">
          <ArrowLeft size={20} />
        </motion.button>
        <h2 className="text-lg font-bold text-white flex-1">
          {template ? 'Rediger plan' : 'Ny plan'}
        </h2>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSave}
          disabled={saving || !name.trim() || exercises.length === 0}
          className="flex items-center gap-1.5 bg-red-500 disabled:bg-zinc-700 text-white px-3 py-1.5 rounded-xl text-sm font-bold"
        >
          <Save size={14} />
          {saving ? 'Lagrer...' : 'Lagre'}
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* Name & description */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Navn</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="f.eks. Push Day, Bein, Overkropp..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Beskrivelse (valgfritt)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kort beskrivelse..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Exercise list */}
        <div>
          <p className="text-xs text-zinc-500 font-medium mb-2">Ovelser ({exercises.length})</p>
          <div className="space-y-2">
            <AnimatePresence>
              {exercises.map((ex, index) => {
                const color = getMuscleGroupColor(ex.exercise.muscle_group);
                return (
                  <motion.div
                    key={`${ex.exercise_id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: color + '22' }}
                      >
                        <Dumbbell size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{ex.exercise.name}</p>
                        <p className="text-[10px] capitalize" style={{ color }}>{ex.exercise.muscle_group}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeExercise(index)}
                        className="p-1.5 text-zinc-600 active:text-red-400"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-600 block mb-0.5">Sett</label>
                        <input
                          type="number"
                          value={ex.target_sets || ''}
                          onChange={e => updateExercise(index, 'target_sets', parseInt(e.target.value) || 0)}
                          className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-600 block mb-0.5">Reps</label>
                        <input
                          type="number"
                          value={ex.target_reps || ''}
                          onChange={e => updateExercise(index, 'target_reps', parseInt(e.target.value) || 0)}
                          className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-600 block mb-0.5">Vekt (kg)</label>
                        <input
                          type="number"
                          value={ex.target_weight_kg || ''}
                          onChange={e => updateExercise(index, 'target_weight_kg', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                          inputMode="decimal"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-amber-500/80 block mb-0.5">Varmup-sett</label>
                        <input
                          type="number"
                          value={ex.warmup_sets || ''}
                          onChange={e => updateExercise(index, 'warmup_sets', parseInt(e.target.value) || 0)}
                          className="w-full bg-amber-500/10 text-amber-400 text-center rounded-lg py-1.5 text-sm font-semibold border border-amber-500/20 focus:border-amber-400 focus:outline-none"
                          inputMode="numeric"
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowPicker(true)}
            className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-zinc-900"
          >
            <Plus size={16} />
            Legg til ovelse
          </motion.button>
        </div>
      </div>
    </div>
  );
}
