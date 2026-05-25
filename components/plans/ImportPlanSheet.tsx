'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Search, Dumbbell, User, CircleAlert as AlertCircle, Check, RefreshCw } from 'lucide-react';
import { supabase, WorkoutTemplate } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface SharedTemplateRow {
  share_code: string;
  owner_user_id: string;
  template_id: string;
  workout_templates: {
    id: string;
    name: string;
    description: string;
    template_exercises: Array<{
      id: string;
      exercise_id: string;
      order_index: number;
      target_sets: number;
      target_reps: number;
      target_weight_kg: number;
      notes: string;
      is_unilateral: boolean;
      superset_group: number | null;
      exercises: {
        id: string;
        name: string;
        muscle_group: string;
      } | null;
    }>;
  };
  profiles: {
    username: string | null;
  } | null;
}

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}

export function ImportPlanSheet({ open, userId, onClose, onImported }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<SharedTemplateRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSearch = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Koden må være 6 tegn');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);

    const { data, error: fetchError } = await supabase
      .from('shared_templates')
      .select(`
        share_code,
        owner_user_id,
        template_id,
        workout_templates(
          id,
          name,
          description,
          template_exercises(
            id,
            exercise_id,
            order_index,
            target_sets,
            target_reps,
            target_weight_kg,
            notes,
            is_unilateral,
            superset_group,
            exercises(id, name, muscle_group)
          )
        ),
        profiles!shared_templates_owner_user_id_fkey(username)
      `)
      .eq('share_code', trimmed)
      .maybeSingle();

    if (fetchError || !data) {
      setError('Ingen plan funnet med denne koden. Sjekk at du har skrevet riktig.');
    } else {
      setPreview(data as unknown as SharedTemplateRow);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);

    const tmpl = preview.workout_templates;
    const ownerUsername = preview.profiles?.username ?? 'ukjent';

    // Insert the new template for the current user
    const { data: newTemplate, error: tmplError } = await supabase
      .from('workout_templates')
      .insert({
        user_id: userId,
        name: tmpl.name,
        description: tmpl.description,
        imported_from_username: ownerUsername,
      })
      .select('id')
      .single();

    if (tmplError || !newTemplate) {
      setImporting(false);
      setError('Noe gikk galt under importering. Prøv igjen.');
      return;
    }

    // Copy all template exercises
    const exercisesToInsert = (tmpl.template_exercises ?? []).map(te => ({
      template_id: newTemplate.id,
      exercise_id: te.exercise_id,
      order_index: te.order_index,
      target_sets: te.target_sets,
      target_reps: te.target_reps,
      target_weight_kg: te.target_weight_kg,
      notes: te.notes,
      is_unilateral: te.is_unilateral,
      superset_group: te.superset_group,
    }));

    if (exercisesToInsert.length > 0) {
      await supabase.from('template_exercises').insert(exercisesToInsert);
    }

    setImporting(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setCode('');
      setPreview(null);
      onImported();
      onClose();
    }, 1200);
  };

  const handleClose = () => {
    setCode('');
    setPreview(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const exercises = preview?.workout_templates?.template_exercises ?? [];
  const muscleGroups = Array.from(
    new Set(exercises.map(te => te.exercises?.muscle_group).filter(Boolean))
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[44]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[45] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-24 max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Download size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Importer plan</p>
                  <p className="text-zinc-500 text-xs">Skriv inn en 6-tegns delingskode</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Code input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="F.eks. ABC123"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-lg tracking-widest placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 text-center"
                maxLength={6}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSearch}
                disabled={loading || code.length !== 6}
                className="w-14 h-[50px] bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl flex items-center justify-center flex-shrink-0"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              </motion.button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Preview */}
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  {/* Shared-by banner */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20">
                    <User size={12} className="text-blue-400" />
                    <p className="text-blue-400 text-xs font-medium">
                      Delt av <span className="font-bold">{preview.profiles?.username ?? 'ukjent'}</span>
                    </p>
                  </div>

                  <div className="p-4">
                    <h3 className="text-white font-bold text-base mb-1">{preview.workout_templates.name || 'Uten navn'}</h3>
                    {preview.workout_templates.description && (
                      <p className="text-zinc-500 text-xs mb-3">{preview.workout_templates.description}</p>
                    )}

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

                    <div className="space-y-1.5">
                      {exercises.slice(0, 5).map(te => (
                        <div key={te.id} className="flex items-center gap-2 text-xs text-zinc-400">
                          <Dumbbell size={10} className="text-zinc-600" />
                          <span className="truncate">{te.exercises?.name}</span>
                          <span className="text-zinc-600 ml-auto flex-shrink-0">{te.target_sets}x{te.target_reps}</span>
                        </div>
                      ))}
                      {exercises.length > 5 && (
                        <p className="text-[10px] text-zinc-600 pl-4">+{exercises.length - 5} flere</p>
                      )}
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleImport}
                  disabled={importing || success}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
                    success
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {importing ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : success ? (
                    <Check size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  {success ? 'Lagt til dine planer!' : importing ? 'Importerer...' : 'Legg til mine planer'}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
