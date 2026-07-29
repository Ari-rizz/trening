'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, X, Dumbbell, Clock, Weight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO, getWeek } from 'date-fns';
import { nb } from 'date-fns/locale';
import { getMuscleGroupLabel, getMuscleGroupColor } from '@/lib/exercises-data';

interface CalendarWorkout {
  id: string;
  name: string;
  date: string;
  duration_seconds: number;
  total_volume_kg: number;
  workout_exercises?: Array<{
    exercise_id: string;
    superset_group: number | null;
    exercises: { id: string; name: string; muscle_group: string };
    workout_sets: Array<{
      set_number: number;
      reps: number;
      weight_kg: number;
      duration_seconds: number;
      is_warmup: boolean;
      is_completed: boolean;
    }>;
  }>;
}

interface WorkoutCalendarSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export function WorkoutCalendarSheet({ open, onClose, userId }: WorkoutCalendarSheetProps) {
  const [workouts, setWorkouts] = useState<CalendarWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const baseDate = useMemo(() => addWeeks(new Date(), weekOffset), [weekOffset]);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });
  const weekNumber = getWeek(baseDate, { weekStartsOn: 1 });

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    supabase
      .from('workouts')
      .select(`
        id, name, date, duration_seconds, total_volume_kg,
        workout_exercises(
          exercise_id, superset_group,
          exercises(id, name, muscle_group),
          workout_sets(set_number, reps, weight_kg, duration_seconds, is_warmup, is_completed)
        )
      `)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('date', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setWorkouts((data ?? []) as unknown as CalendarWorkout[]);
        setLoading(false);
      });
  }, [open, userId]);

  const workoutsByDate = useMemo(() => {
    const map: Record<string, CalendarWorkout[]> = {};
    for (const w of workouts) {
      const dateKey = format(parseISO(w.date), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(w);
    }
    return map;
  }, [workouts]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const selectedWorkouts = selectedDate ? workoutsByDate[selectedDate] ?? [] : [];

  const monthLabel = format(weekStart, 'd. MMM', { locale: nb }) + ' – ' + format(weekEnd, 'd. MMM yyyy', { locale: nb });

  return (
    <AnimatePresence>
      {open && (
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
            className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl overflow-hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
              <div>
                <h3 className="text-base font-bold text-white">Treningskalender</h3>
                <p className="text-zinc-500 text-xs mt-0.5">{monthLabel} · Uke {weekNumber}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <X size={16} className="text-zinc-400" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 pb-32">
              {/* Week navigation */}
              <div className="flex items-center justify-between mb-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="text-zinc-400" />
                </motion.button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="text-xs font-medium text-blue-400"
                >
                  Denne uken
                </button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset(w => w + 1)}
                  disabled={weekOffset >= 0}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight size={18} className="text-zinc-400" />
                </motion.button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-zinc-600 uppercase">
                    {d.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 mb-6">
                {weekDays.map((day, i) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayWorkouts = workoutsByDate[dateKey] ?? [];
                  const hasWorkout = dayWorkouts.length > 0;
                  const isToday = isSameDay(day, today);
                  const isPast = day < today && !isToday;
                  const isSelected = selectedDate === dateKey;

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => hasWorkout ? setSelectedDate(isSelected ? null : dateKey) : null}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-red-500/20 border border-red-500/50'
                          : hasWorkout
                            ? 'bg-red-500/10 border border-red-500/30'
                            : 'bg-zinc-900 border border-zinc-800/50'
                      }`}
                    >
                      <span className={`text-sm font-bold ${
                        isToday ? 'text-white' : hasWorkout ? 'text-red-400' : isPast ? 'text-zinc-600' : 'text-zinc-400'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {hasWorkout && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {dayWorkouts.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1 h-1 rounded-full bg-red-400" />
                          ))}
                        </div>
                      )}
                      {isToday && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Selected day workouts */}
              <AnimatePresence mode="wait">
                {selectedDate && (
                  <motion.div
                    key={selectedDate}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setSelectedDate(null)} className="flex items-center gap-1 text-xs text-zinc-500">
                        <ChevronLeft size={14} />
                        Tilbake
                      </button>
                      <p className="text-sm font-bold text-white">
                        {format(parseISO(selectedDate), 'EEEE d. MMM', { locale: nb })}
                      </p>
                    </div>

                    {selectedWorkouts.length === 0 ? (
                      <p className="text-zinc-600 text-sm text-center py-4">Ingen økter denne dagen</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedWorkouts.map(w => (
                          <WorkoutDetailCard key={w.id} workout={w} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Summary when no day selected */}
              {!selectedDate && (
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-2">Denne uken</p>
                  {weekDays.some(d => (workoutsByDate[format(d, 'yyyy-MM-dd')] ?? []).length > 0) ? (
                    <div className="space-y-2">
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayWorkouts = workoutsByDate[dateKey] ?? [];
                        if (dayWorkouts.length === 0) return null;
                        return (
                          <div key={dateKey} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white text-sm font-semibold">
                                {format(day, 'EEE d. MMM', { locale: nb })}
                              </p>
                              <span className="text-xs text-zinc-500">{dayWorkouts.length} økt{dayWorkouts.length > 1 ? 'er' : ''}</span>
                            </div>
                            {dayWorkouts.map(w => (
                              <div key={w.id} className="flex items-center gap-2 mt-1.5">
                                <Flame size={12} className="text-red-400 flex-shrink-0" />
                                <p className="text-zinc-300 text-xs">{w.name}</p>
                                <span className="text-zinc-600 text-xs ml-auto">{Math.round(w.total_volume_kg ?? 0)}kg</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Dumbbell size={28} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-600 text-sm">Ingen økter denne uken</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WorkoutDetailCard({ workout }: { workout: CalendarWorkout }) {
  const exercises = workout.workout_exercises ?? [];
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.workout_sets ?? []).filter(s => s.is_completed).length, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-bold text-sm">{workout.name}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={11} />
              {workout.duration_seconds > 0
                ? `${Math.floor(workout.duration_seconds / 60)}min`
                : '—'}
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Weight size={11} />
              {Math.round(workout.total_volume_kg ?? 0)}kg
            </span>
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Dumbbell size={11} />
              {totalSets} sett
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {exercises.map((ex, i) => {
          const exercise = ex.exercises as any;
          if (!exercise) return null;
          const color = getMuscleGroupColor(exercise.muscle_group);
          const completedSets = (ex.workout_sets ?? []).filter(s => s.is_completed).sort((a, b) => a.set_number - b.set_number);

          return (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: color + '22' }}
              >
                <Dumbbell size={12} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{exercise.name}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {completedSets.map((set, si) => {
                    const isTime = set.duration_seconds > 0 && set.weight_kg === 0;
                    return (
                      <span
                        key={si}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          set.is_warmup ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800/80 text-zinc-300'
                        }`}
                      >
                        {isTime
                          ? `${set.duration_seconds}s`
                          : `${set.weight_kg}×${set.reps}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
