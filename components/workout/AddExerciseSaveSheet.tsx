'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, BookmarkPlus } from 'lucide-react';
import { getMuscleGroupColor } from '@/lib/exercises-data';
import { Exercise } from '@/lib/supabase';

interface Props {
  open: boolean;
  exercise: Exercise | null;
  onSelect: (saveToTemplate: boolean) => void;
  onClose: () => void;
}

export function AddExerciseSaveSheet({ open, exercise, onSelect, onClose }: Props) {
  if (!open || !exercise) return null;

  const color = getMuscleGroupColor(exercise.muscle_group as any);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
            <h3 className="text-base font-bold text-white">Legg til øvelse</h3>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <X size={16} className="text-zinc-400" />
            </motion.button>
          </div>

          {/* Exercise preview */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-900">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color + '22' }}
            >
              <Dumbbell size={20} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{exercise.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5 capitalize">{exercise.equipment} · {exercise.muscle_group}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-5 space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(false)}
              className="w-full py-3.5 rounded-xl bg-zinc-800 text-white text-sm font-semibold"
            >
              Bare denne økten
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(true)}
              className="w-full py-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <BookmarkPlus size={16} />
              Legg til i planen også
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
