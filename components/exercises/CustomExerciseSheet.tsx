'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, Loader as Loader2, Plus } from 'lucide-react';
import { supabase, Exercise, MuscleGroup } from '@/lib/supabase';
import { MUSCLE_GROUPS, getMuscleGroupColor } from '@/lib/exercises-data';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (exercise: Exercise) => void;
}

type Mechanic = 'compound' | 'isolation' | '';

export function CustomExerciseSheet({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('full body');
  const [mechanic, setMechanic] = useState<Mechanic>('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setMuscleGroup('full body');
    setMechanic('');
    setDescription('');
    setError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Gi øvelsen et navn');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError('Du må være innlogget for å lage egne øvelser');
        setSaving(false);
        return;
      }

      const { data, error: insertErr } = await supabase
        .from('exercises')
        .insert({
          name: trimmedName,
          muscle_group: muscleGroup,
          equipment: 'other',
          difficulty: 'intermediate',
          instructions: description.trim(),
          is_custom: true,
          created_by: userData.user.id,
          mechanic: mechanic || null,
          category: 'strength',
          secondary_muscles: [],
          gif_url: '',
          image_url: '',
          images: [],
        })
        .select()
        .single();

      if (insertErr || !data) {
        setError('Kunne ikke lagre øvelsen. Prøv igjen.');
        setSaving(false);
        return;
      }

      onCreated(data as Exercise);
      reset();
    } catch (err) {
      console.error('Failed to create custom exercise:', err);
      setError('Noe gikk galt. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const selectedColor = getMuscleGroupColor(muscleGroup);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end"
        onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl flex flex-col"
          style={{ maxHeight: '92vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-red-400" />
              <h3 className="text-base font-bold text-white">Lag egen øvelse</h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <X size={16} className="text-zinc-400" />
            </motion.button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
                Navn <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="f.eks. Kettlebell swing, Cable woodchopper..."
                autoFocus
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {/* Muscle group */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-2 block">
                Hovedmuskelgruppe <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(mg => (
                  <motion.button
                    key={mg.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMuscleGroup(mg.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={
                      muscleGroup === mg.value
                        ? { backgroundColor: mg.color, borderColor: mg.color, color: 'white' }
                        : { backgroundColor: 'transparent', borderColor: mg.color + '44', color: mg.color }
                    }
                  >
                    {mg.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Compound / Isolation */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-2 block">
                Type <span className="text-zinc-600">(valgfritt)</span>
              </label>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMechanic(m => m === 'compound' ? '' : 'compound')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    mechanic === 'compound'
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Compound
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMechanic(m => m === 'isolation' ? '' : 'isolation')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    mechanic === 'isolation'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Isolation
                </motion.button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
                Beskrivelse <span className="text-zinc-600">(valgfritt)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Kort beskrivelse av utførelse..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            {/* Preview */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedColor + '22' }}
                >
                  <Dumbbell size={20} style={{ color: selectedColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {name.trim() || 'Din nye øvelse'}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {MUSCLE_GROUPS.find(m => m.value === muscleGroup)?.label}
                    {mechanic && ` · ${mechanic === 'compound' ? 'Compound' : 'Isolation'}`}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-zinc-900 flex-shrink-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Lagrer...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Lagre og legg til
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
