'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ChevronRight, Check, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
}

type TrackingType = 'reps_weight' | 'time';
type Step = 'exercise' | 'type' | 'values';

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ManualEntrySheet({ open, userId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('exercise');
  const [query, setQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [trackingType, setTrackingType] = useState<TrackingType>('reps_weight');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('exercise');
    setQuery('');
    setSelectedExercise(null);
    setTrackingType('reps_weight');
    setWeight('');
    setReps('');
    setMinutes('');
    setSeconds('');
    setDateStr('');
    setError('');
  }, [open]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!open) return;
    searchTimeout.current = setTimeout(() => {
      searchExercises(query);
    }, 250);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, open]);

  const searchExercises = async (q: string) => {
    setSearchLoading(true);
    try {
      let builder = supabase
        .from('exercises')
        .select('id, name, muscle_group')
        .order('name')
        .limit(40);
      if (q.trim()) {
        builder = builder.ilike('name', `%${q.trim()}%`);
      }
      const { data } = await builder;
      setExercises(data ?? []);
    } catch {
      setExercises([]);
    }
    setSearchLoading(false);
  };

  const handleSelectExercise = (ex: Exercise) => {
    setSelectedExercise(ex);
    setStep('type');
  };

  const handleSave = async () => {
    if (!selectedExercise) return;
    setError('');

    if (trackingType === 'reps_weight') {
      const w = parseFloat(weight);
      const r = parseInt(reps, 10);
      if (!weight || isNaN(w) || w <= 0) { setError('Skriv inn gyldig vekt'); return; }
      if (!reps || isNaN(r) || r <= 0) { setError('Skriv inn gyldig antall reps'); return; }
    } else {
      const m = parseInt(minutes || '0', 10);
      const s = parseInt(seconds || '0', 10);
      if (m === 0 && s === 0) { setError('Skriv inn gyldig tid'); return; }
    }

    setSaving(true);
    try {
      const workoutDate = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();

      const { data: workout, error: wErr } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          name: 'Manuell innlegging',
          date: workoutDate,
          is_completed: true,
          is_manual: true,
          duration_seconds: 0,
          total_volume_kg: trackingType === 'reps_weight' ? parseFloat(weight) * parseInt(reps, 10) : 0,
        })
        .select('id')
        .single();

      if (wErr || !workout) throw wErr ?? new Error('Kunne ikke opprette økt');

      const { data: we, error: weErr } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          exercise_id: selectedExercise.id,
          order_index: 0,
          is_time_based: trackingType === 'time',
        })
        .select('id')
        .single();

      if (weErr || !we) throw weErr ?? new Error('Kunne ikke legge til øvelse');

      const durationSeconds = trackingType === 'time'
        ? (parseInt(minutes || '0', 10) * 60) + parseInt(seconds || '0', 10)
        : 0;

      const { error: setErr } = await supabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: we.id,
          set_number: 1,
          reps: trackingType === 'reps_weight' ? parseInt(reps, 10) : 0,
          weight_kg: trackingType === 'reps_weight' ? parseFloat(weight) : 0,
          duration_seconds: durationSeconds,
          is_completed: true,
        });

      if (setErr) throw setErr;

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Noe gikk galt');
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
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
              <h3 className="text-base font-bold text-white">Manuell innlegging</h3>
              <p className="text-zinc-500 text-xs mt-0.5">
                {step === 'exercise' && 'Velg øvelse'}
                {step === 'type' && selectedExercise?.name}
                {step === 'values' && selectedExercise?.name}
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

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 px-5 pt-3 flex-shrink-0">
            {(['exercise', 'type', 'values'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step === s ? 'bg-blue-500' : i < (['exercise', 'type', 'values'] as Step[]).indexOf(step) ? 'bg-blue-500/40' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-8">
            {step === 'exercise' && (
              <div className="px-5 pt-4">
                {/* Search */}
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 mb-4">
                  <Search size={15} className="text-zinc-500 flex-shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Søk etter øvelse..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="bg-transparent text-white text-sm flex-1 outline-none placeholder-zinc-600"
                  />
                </div>

                {searchLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {exercises.map(ex => {
                      const color = getMuscleGroupColor(ex.muscle_group);
                      return (
                        <motion.button
                          key={ex.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectExercise(ex)}
                          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ backgroundColor: color + '22', color }}
                          >
                            {ex.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{ex.name}</p>
                            <p className="text-xs mt-0.5" style={{ color }}>{getMuscleGroupLabel(ex.muscle_group)}</p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-600 flex-shrink-0" />
                        </motion.button>
                      );
                    })}
                    {exercises.length === 0 && !searchLoading && (
                      <p className="text-zinc-600 text-sm text-center py-8">Ingen øvelser funnet</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 'type' && (
              <div className="px-5 pt-6 space-y-3">
                <p className="text-zinc-400 text-sm mb-4">Hvordan sporer du denne øvelsen?</p>
                {([
                  { value: 'reps_weight' as TrackingType, label: 'Vekt og reps', desc: 'F.eks. 100kg × 5 reps' },
                  { value: 'time' as TrackingType, label: 'Tid', desc: 'F.eks. 2 min 30 sek' },
                ] as { value: TrackingType; label: string; desc: string }[]).map(opt => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setTrackingType(opt.value); setStep('values'); }}
                    className="w-full flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-zinc-600 flex items-center justify-center flex-shrink-0">
                      {trackingType === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{opt.label}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{opt.desc}</p>
                    </div>
                  </motion.button>
                ))}

                <button
                  onClick={() => setStep('exercise')}
                  className="w-full text-center text-zinc-600 text-sm py-3"
                >
                  Tilbake
                </button>
              </div>
            )}

            {step === 'values' && (
              <div className="px-5 pt-6 space-y-4">
                {trackingType === 'reps_weight' ? (
                  <>
                    <div>
                      <label className="block text-zinc-400 text-xs font-medium mb-1.5">Beste vekt (kg)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={weight}
                        onChange={e => setWeight(e.target.value.replace(',', '.'))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500/60 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-xs font-medium mb-1.5">Antall reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        value={reps}
                        onChange={e => setReps(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500/60 transition-colors"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-zinc-400 text-xs font-medium mb-1.5">Beste tid</label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={minutes}
                          onChange={e => setMinutes(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500/60 transition-colors"
                        />
                        <p className="text-zinc-600 text-xs text-center mt-1">min</p>
                      </div>
                      <div className="flex-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          max={59}
                          value={seconds}
                          onChange={e => setSeconds(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-blue-500/60 transition-colors"
                        />
                        <p className="text-zinc-600 text-xs text-center mt-1">sek</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional date */}
                <div>
                  <label className="block text-zinc-400 text-xs font-medium mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      Dato (valgfri)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={e => setDateStr(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/60 transition-colors [color-scheme:dark]"
                  />
                  <p className="text-zinc-600 text-xs mt-1">Tom = dagens dato</p>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-50 mt-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      Lagre
                    </>
                  )}
                </motion.button>

                <button
                  onClick={() => setStep('type')}
                  className="w-full text-center text-zinc-600 text-sm py-2"
                >
                  Tilbake
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
