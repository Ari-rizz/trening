'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ArrowRightLeft, Dumbbell, Zap } from 'lucide-react';
import { Exercise, supabase } from '@/lib/supabase';
import { fetchSimilarExercises, ScoredExercise } from '@/lib/exercise-swap';
import { getMuscleGroupLabel, getMuscleGroupColor, EQUIPMENT_OPTIONS } from '@/lib/exercises-data';

interface Props {
  open: boolean;
  currentExercise: Exercise;
  templateExerciseId?: string;
  userId: string;
  onSwap: (newExercise: Exercise, permanent: boolean) => void;
  onClose: () => void;
}

function getEquipmentLabel(value: string): string {
  return EQUIPMENT_OPTIONS.find(e => e.value === value)?.label ?? value;
}

export function ExerciseSwapSheet({ open, currentExercise, templateExerciseId, userId, onSwap, onClose }: Props) {
  const [results, setResults] = useState<ScoredExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (!open) {
      setResults([]);
      setSearch('');
      setSelectedExercise(null);
      return;
    }
    loadAlternatives();
  }, [open]);

  const loadAlternatives = async () => {
    setLoading(true);
    const scored = await fetchSimilarExercises(currentExercise, userId);
    setResults(scored);
    setLoading(false);
  };

  const filtered = search.trim()
    ? results.filter(r => r.exercise.name.toLowerCase().includes(search.toLowerCase()))
    : results;

  const handleConfirm = (permanent: boolean) => {
    if (!selectedExercise) return;
    onSwap(selectedExercise, permanent);
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-white">Bytt ovelse</h3>
              <p className="text-zinc-500 text-xs mt-0.5">
                Erstatter: {currentExercise.name}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <X size={16} className="text-zinc-400" />
            </motion.button>
          </div>

          {/* Confirmation view */}
          {selectedExercise ? (
            <div className="flex-1 px-5 py-5 flex flex-col">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getMuscleGroupColor(selectedExercise.muscle_group) + '22' }}
                  >
                    <ArrowRightLeft size={18} style={{ color: getMuscleGroupColor(selectedExercise.muscle_group) }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{selectedExercise.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5 capitalize">
                      {getEquipmentLabel(selectedExercise.equipment)} · {getMuscleGroupLabel(selectedExercise.muscle_group)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-zinc-400 text-sm text-center mb-4">
                Vil du bytte denne ovelsen permanent i planen, eller bare for denne okten?
              </p>

              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleConfirm(false)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-black font-bold py-3.5 rounded-2xl text-sm"
                >
                  Bare denne okten
                </motion.button>
                {templateExerciseId && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-white font-bold py-3.5 rounded-2xl text-sm"
                  >
                    Oppdater planen
                  </motion.button>
                )}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedExercise(null)}
                  className="w-full text-zinc-500 text-sm py-2"
                >
                  Avbryt
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="px-5 pt-3 pb-2 flex-shrink-0">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Sok etter ovelse..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-1.5">
                {loading ? (
                  <div className="space-y-2 pt-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-8">Ingen alternativer funnet</p>
                ) : (
                  filtered.map(({ exercise: ex, score }) => (
                    <motion.button
                      key={ex.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedExercise(ex)}
                      className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-left active:border-zinc-600 transition-colors"
                    >
                      {ex.gif_url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                          <img src={ex.gif_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: getMuscleGroupColor(ex.muscle_group) + '15' }}
                        >
                          <Dumbbell size={16} style={{ color: getMuscleGroupColor(ex.muscle_group) }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{ex.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5 capitalize">
                          {getEquipmentLabel(ex.equipment)} · {getMuscleGroupLabel(ex.muscle_group)}
                          {ex.difficulty && <span className="text-zinc-600"> · {ex.difficulty}</span>}
                        </p>
                      </div>
                      {score >= 5 && (
                        <div className="flex-shrink-0 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md">
                          <Zap size={12} className="text-amber-400" />
                        </div>
                      )}
                    </motion.button>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
