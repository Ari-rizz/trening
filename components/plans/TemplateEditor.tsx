'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Dumbbell, Repeat2, Link2, Link2Off, ChevronDown } from 'lucide-react';
import { supabase, WorkoutTemplate, Exercise } from '@/lib/supabase';
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
  is_unilateral: boolean;
  notes: string;
  superset_group: number | null;
}

export function TemplateEditor({ template, userId, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [exercises, setExercises] = useState<LocalTemplateExercise[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supersetPickerFor, setSupersetPickerFor] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
            is_unilateral: te.is_unilateral ?? false,
            notes: te.notes,
            superset_group: te.superset_group ?? null,
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
        is_unilateral: false,
        notes: '',
        superset_group: null,
      },
    ]);
    setShowExercisePicker(false);
  };

  const linkSuperset = (indexA: number, indexB: number) => {
    const groupId = Math.floor(Math.random() * 2_000_000_000);
    setExercises(prev => prev.map((e, i) => {
      if (i === indexA || i === indexB) return { ...e, superset_group: groupId };
      return e;
    }));
    setSupersetPickerFor(null);
  };

  const unlinkSuperset = (index: number) => {
    const groupId = exercises[index]?.superset_group;
    if (groupId == null) return;
    setExercises(prev => prev.map(e => e.superset_group === groupId ? { ...e, superset_group: null } : e));
  };

  const removeExercise = (index: number) => {
    // Also unlink from superset first
    const groupId = exercises[index]?.superset_group;
    setExercises(prev => {
      let updated = prev.filter((_, i) => i !== index);
      if (groupId != null) {
        // If the remaining partner is alone, clear its superset_group
        const remaining = updated.filter(e => e.superset_group === groupId);
        if (remaining.length < 2) {
          updated = updated.map(e => e.superset_group === groupId ? { ...e, superset_group: null } : e);
        }
      }
      return updated.map((e, i) => ({ ...e, order_index: i }));
    });
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateExercise = (index: number, field: keyof LocalTemplateExercise, value: any) => {
    setExercises(prev => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  };

  // When a superset pair shares set count, update both
  const updateSupersetSets = (groupId: number, value: number) => {
    setExercises(prev => prev.map(e => e.superset_group === groupId ? { ...e, target_sets: value } : e));
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);

    try {
      let templateId = template?.id;

      if (templateId) {
        const { error: updateErr } = await supabase
          .from('workout_templates')
          .update({ name: name.trim(), description: description.trim(), updated_at: new Date().toISOString() })
          .eq('id', templateId);
        if (updateErr) throw updateErr;

        const { error: deleteErr } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', templateId);
        if (deleteErr) throw deleteErr;
      } else {
        const { data, error: insertErr } = await supabase
          .from('workout_templates')
          .insert({ user_id: userId, name: name.trim(), description: description.trim() })
          .select()
          .single();
        if (insertErr) throw insertErr;
        templateId = data?.id;
      }

      if (!templateId) throw new Error('No template ID');

      const rows = exercises.map((e, i) => ({
        template_id: templateId!,
        exercise_id: e.exercise_id,
        order_index: i,
        target_sets: e.target_sets,
        target_reps: e.target_reps,
        target_weight_kg: e.target_weight_kg,
        warmup_sets: e.warmup_sets,
        is_unilateral: e.is_unilateral,
        notes: e.notes,
        superset_group: e.superset_group ?? null,
      }));

      const { error: rowsErr } = await supabase.from('template_exercises').insert(rows);
      if (rowsErr) throw rowsErr;

      onSave();
    } catch (err) {
      console.error('Failed to save template:', err);
    }
    setSaving(false);
  };

  if (showExercisePicker) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-zinc-900">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowExercisePicker(false)} className="text-zinc-400 text-sm">
            Avbryt
          </motion.button>
          <h2 className="text-base font-bold text-white flex-1 text-center">Velg øvelse</h2>
          <div className="w-12" />
        </div>
        <div className="flex-1 overflow-hidden">
          <ExercisesTab onAddToWorkout={addExercise} />
        </div>
      </div>
    );
  }

  // Build a rendered set — group superset pairs together
  const rendered = new Set<number>();
  const rows: Array<{ type: 'single'; index: number } | { type: 'superset'; indexA: number; indexB: number; groupId: number }> = [];

  exercises.forEach((ex, index) => {
    if (rendered.has(index)) return;
    if (ex.superset_group != null) {
      const partnerIndex = exercises.findIndex((e, i) => i !== index && e.superset_group === ex.superset_group);
      if (partnerIndex > index) {
        rendered.add(index);
        rendered.add(partnerIndex);
        rows.push({ type: 'superset', indexA: index, indexB: partnerIndex, groupId: ex.superset_group });
        return;
      }
    }
    rendered.add(index);
    rows.push({ type: 'single', index });
  });

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
          <p className="text-xs text-zinc-500 font-medium mb-2">Øvelser ({exercises.length})</p>
          <div className="space-y-2">
            <AnimatePresence>
              {rows.map((row, rowIdx) => {
                if (row.type === 'superset') {
                  const exA = exercises[row.indexA];
                  const exB = exercises[row.indexB];
                  const colorA = getMuscleGroupColor(exA.exercise.muscle_group);
                  const colorB = getMuscleGroupColor(exB.exercise.muscle_group);
                  const isExpanded = expandedIndex === row.indexA || expandedIndex === row.indexB;

                  return (
                    <motion.div
                      key={`ss-${row.groupId}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="border border-orange-500/30 rounded-xl overflow-hidden"
                    >
                      {/* Superset header */}
                      <div className="bg-orange-500/10 px-3 py-2 flex items-center gap-2">
                        <Link2 size={12} className="text-orange-400" />
                        <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex-1">Supersett</span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { unlinkSuperset(row.indexA); }}
                          className="text-[10px] text-zinc-500 flex items-center gap-1"
                        >
                          <Link2Off size={10} />
                          Bryt kobling
                        </motion.button>
                      </div>

                      {/* Shared set count */}
                      <div className="bg-zinc-900 px-3 py-2.5 flex items-center gap-3 border-b border-zinc-800/60">
                        <span className="text-xs text-zinc-400 flex-1">Antall sett (per øvelse)</span>
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateSupersetSets(row.groupId, Math.max(1, exA.target_sets - 1))}
                            className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white text-sm font-bold"
                          >
                            −
                          </motion.button>
                          <span className="text-white font-bold text-sm w-5 text-center">{exA.target_sets}</span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => updateSupersetSets(row.groupId, exA.target_sets + 1)}
                            className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-white text-sm font-bold"
                          >
                            +
                          </motion.button>
                        </div>
                      </div>

                      {/* Exercise A */}
                      <SupersetExerciseRow
                        ex={exA}
                        index={row.indexA}
                        color={colorA}
                        label="A"
                        isExpanded={expandedIndex === row.indexA}
                        onToggleExpand={() => setExpandedIndex(expandedIndex === row.indexA ? null : row.indexA)}
                        onUpdate={updateExercise}
                        onRemove={removeExercise}
                      />

                      {/* Divider */}
                      <div className="h-px bg-zinc-800/60 mx-3" />

                      {/* Exercise B */}
                      <SupersetExerciseRow
                        ex={exB}
                        index={row.indexB}
                        color={colorB}
                        label="B"
                        isExpanded={expandedIndex === row.indexB}
                        onToggleExpand={() => setExpandedIndex(expandedIndex === row.indexB ? null : row.indexB)}
                        onUpdate={updateExercise}
                        onRemove={removeExercise}
                      />
                    </motion.div>
                  );
                }

                // Single exercise
                const ex = exercises[row.index];
                const color = getMuscleGroupColor(ex.exercise.muscle_group);
                const isPickingSuperset = supersetPickerFor === row.index;

                return (
                  <div key={`${ex.exercise_id}-${row.index}`}>
                    <motion.div
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
                          onClick={() => setSupersetPickerFor(isPickingSuperset ? null : row.index)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            isPickingSuperset
                              ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          <Link2 size={12} />
                          SS
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => removeExercise(row.index)}
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
                            onChange={e => updateExercise(row.index, 'target_sets', parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-600 block mb-0.5">Reps</label>
                          <input
                            type="number"
                            value={ex.target_reps || ''}
                            onChange={e => updateExercise(row.index, 'target_reps', parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-600 block mb-0.5">Vekt (kg)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={ex.target_weight_kg || ''}
                            onChange={e => updateExercise(row.index, 'target_weight_kg', parseFloat(e.target.value.replace(',', '.')) || 0)}
                            className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-amber-500/80 block mb-0.5">Warmup sett</label>
                          <input
                            type="number"
                            value={ex.warmup_sets || ''}
                            onChange={e => updateExercise(row.index, 'warmup_sets', parseInt(e.target.value) || 0)}
                            className="w-full bg-amber-500/10 text-amber-400 text-center rounded-lg py-1.5 text-sm font-semibold border border-amber-500/20 focus:border-amber-400 focus:outline-none"
                            inputMode="numeric"
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => updateExercise(row.index, 'is_unilateral', !ex.is_unilateral)}
                        className={`mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          ex.is_unilateral
                            ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                            : 'bg-zinc-800 border-transparent text-zinc-500'
                        }`}
                      >
                        <Repeat2 size={13} />
                        Unilateral (en arm/ett bein om gangen)
                        <div className={`ml-auto w-7 h-4 rounded-full transition-colors flex items-center px-0.5 ${ex.is_unilateral ? 'bg-sky-500' : 'bg-zinc-700'}`}>
                          <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${ex.is_unilateral ? 'translate-x-3' : 'translate-x-0'}`} />
                        </div>
                      </motion.button>
                    </motion.div>

                    {/* Superset picker inline */}
                    <AnimatePresence>
                      {isPickingSuperset && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-zinc-800 border border-orange-500/30 border-t-0 rounded-b-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-orange-400">Koble som supersett med:</p>
                              <button onClick={() => setSupersetPickerFor(null)} className="text-zinc-500 text-xs">Avbryt</button>
                            </div>
                            {exercises
                              .map((e, i) => ({ e, i }))
                              .filter(({ i, e }) => i !== row.index && e.superset_group == null)
                              .map(({ e, i }) => {
                                const c = getMuscleGroupColor(e.exercise.muscle_group);
                                return (
                                  <motion.button
                                    key={i}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => linkSuperset(row.index, i)}
                                    className="w-full flex items-center gap-2.5 bg-zinc-900 rounded-lg px-3 py-2.5 text-left active:bg-zinc-700 transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c + '22' }}>
                                      <Dumbbell size={12} style={{ color: c }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white text-sm font-medium truncate">{e.exercise.name}</p>
                                      <p className="text-[10px] capitalize" style={{ color: c }}>{e.exercise.muscle_group}</p>
                                    </div>
                                  </motion.button>
                                );
                              })}
                            {exercises.filter((e, i) => i !== row.index && e.superset_group == null).length === 0 && (
                              <p className="text-zinc-600 text-xs text-center py-2">Ingen tilgjengelige øvelser å koble med</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowExercisePicker(true)}
            className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-zinc-800 text-zinc-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-zinc-900"
          >
            <Plus size={16} />
            Legg til øvelse
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function SupersetExerciseRow({
  ex,
  index,
  color,
  label,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRemove,
}: {
  ex: LocalTemplateExercise;
  index: number;
  color: string;
  label: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (index: number, field: keyof LocalTemplateExercise, value: any) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="bg-zinc-900">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="text-[10px] font-black text-orange-400 w-4 flex-shrink-0">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '22' }}
        >
          <Dumbbell size={12} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{ex.exercise.name}</p>
          <p className="text-[10px] capitalize" style={{ color }}>{ex.exercise.muscle_group}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onToggleExpand}
          className="p-1.5 text-zinc-600"
        >
          <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onRemove(index)}
          className="p-1.5 text-zinc-600 active:text-red-400"
        >
          <Trash2 size={13} />
        </motion.button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-600 block mb-0.5">Reps</label>
                  <input
                    type="number"
                    value={ex.target_reps || ''}
                    onChange={e => onUpdate(index, 'target_reps', parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 block mb-0.5">Vekt (kg)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={ex.target_weight_kg || ''}
                    onChange={e => onUpdate(index, 'target_weight_kg', parseFloat(e.target.value.replace(',', '.')) || 0)}
                    className="w-full bg-zinc-800 text-white text-center rounded-lg py-1.5 text-sm font-semibold border border-transparent focus:border-red-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-500/80 block mb-0.5">Warmup</label>
                  <input
                    type="number"
                    value={ex.warmup_sets || ''}
                    onChange={e => onUpdate(index, 'warmup_sets', parseInt(e.target.value) || 0)}
                    className="w-full bg-amber-500/10 text-amber-400 text-center rounded-lg py-1.5 text-sm font-semibold border border-amber-500/20 focus:border-amber-400 focus:outline-none"
                    inputMode="numeric"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onUpdate(index, 'is_unilateral', !ex.is_unilateral)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  ex.is_unilateral
                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                    : 'bg-zinc-800 border-transparent text-zinc-500'
                }`}
              >
                <Repeat2 size={13} />
                Unilateral
                <div className={`ml-auto w-7 h-4 rounded-full transition-colors flex items-center px-0.5 ${ex.is_unilateral ? 'bg-sky-500' : 'bg-zinc-700'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${ex.is_unilateral ? 'translate-x-3' : 'translate-x-0'}`} />
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
