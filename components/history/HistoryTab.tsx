'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Dumbbell, ChevronDown, ChevronUp, Trash2, TriangleAlert as AlertTriangle, Link2 } from 'lucide-react';
import { supabase, Workout } from '@/lib/supabase';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { nb } from 'date-fns/locale';

export function HistoryTab() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<Record<string, any>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) fetchWorkouts(uid);
      else setLoading(false);
    });
  }, []);

  const fetchWorkouts = async (uid: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', uid)
      .eq('is_completed', true)
      .order('date', { ascending: false });
    setWorkouts((data ?? []) as Workout[]);
    setLoading(false);
  };

  const fetchWorkoutDetails = async (workoutId: string) => {
    if (workoutDetails[workoutId]) return;
    const { data } = await supabase
      .from('workout_exercises')
      .select(`
        *,
        exercises(name, muscle_group),
        workout_sets(*)
      `)
      .eq('workout_id', workoutId)
      .order('order_index');
    setWorkoutDetails(prev => ({ ...prev, [workoutId]: data ?? [] }));
  };

  const handleDelete = async (workoutId: string) => {
    setDeleting(true);
    await supabase.from('workouts').delete().eq('id', workoutId);
    setWorkouts(prev => prev.filter(w => w.id !== workoutId));
    setConfirmDelete(null);
    setExpanded(null);
    setDeleting(false);
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      fetchWorkoutDetails(id);
    }
  };

  const formatDuration = (s: number) => {
    if (!s) return '--';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min`;
    return `${Math.floor(m / 60)}t ${m % 60}min`;
  };

  const grouped = workouts.reduce((acc, w) => {
    const d = new Date(w.date);
    let key = 'Eldre';
    if (isThisWeek(d, { weekStartsOn: 1 })) key = 'Denne uken';
    else if (isThisMonth(d)) key = 'Denne maneden';
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {} as Record<string, Workout[]>);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-white">Historikk</h1>
        <p className="text-zinc-500 text-sm mt-0.5">{workouts.length} fullførte økter</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !userId && (
          <div className="text-center py-16">
            <Calendar size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Logg inn for å se historikk</p>
          </div>
        )}

        {!loading && userId && workouts.length === 0 && (
          <div className="text-center py-16">
            <Dumbbell size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Ingen historikk ennå</p>
            <p className="text-zinc-600 text-sm mt-1">Fullfør din forste økt</p>
          </div>
        )}

        {Object.entries(grouped).map(([group, ws]) => (
          <div key={group}>
            <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{group}</p>
            <div className="space-y-2">
              {ws.map((workout, i) => (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleExpand(workout.id)}
                      className="flex-1 flex items-center gap-3 p-4 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{workout.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Calendar size={11} />
                            {format(new Date(workout.date), 'EEE d. MMM', { locale: nb })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock size={11} />
                            {formatDuration(workout.duration_seconds)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 mr-1">
                        <p className="text-white font-bold text-sm">{Math.round(workout.total_volume_kg ?? 0)}kg</p>
                        <p className="text-xs text-zinc-600">volum</p>
                      </div>
                      {expanded === workout.id ? (
                        <ChevronUp size={16} className="text-zinc-600 flex-shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-zinc-600 flex-shrink-0" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {expanded === workout.id && workoutDetails[workout.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-zinc-800"
                      >
                        <div className="p-4 space-y-3">
                          {(() => {
                            const exercises: any[] = workoutDetails[workout.id];
                            const rendered = new Set<string>();
                            return exercises.map((we: any) => {
                              if (rendered.has(we.id)) return null;
                              const completedSets = (we.workout_sets ?? []).filter((s: any) => s.is_completed);
                              if (completedSets.length === 0) return null;

                              const partner = we.superset_group != null
                                ? exercises.find((e: any) => e.id !== we.id && e.superset_group === we.superset_group)
                                : null;

                              if (partner) {
                                rendered.add(we.id);
                                rendered.add(partner.id);
                                const partnerSets = (partner.workout_sets ?? []).filter((s: any) => s.is_completed);
                                return (
                                  <div key={we.id} className="border-l-2 border-orange-500/40 pl-2.5 space-y-2">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <Link2 size={10} className="text-orange-400" />
                                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Supersett</span>
                                    </div>
                                    {[{ ex: we, sets: completedSets }, { ex: partner, sets: partnerSets }].map(({ ex, sets }) => (
                                      <div key={ex.id}>
                                        <p className="text-white text-xs font-bold mb-1">{ex.exercises?.name ?? 'Ukjent'}</p>
                                        <div className="space-y-1">
                                          {sets.map((s: any, si: number) => (
                                            <div key={si} className="flex items-center gap-3 text-xs text-zinc-400">
                                              <span className="text-zinc-600 w-5">{s.set_number}</span>
                                              {s.duration_seconds > 0 ? (
                                                <span>{s.duration_seconds}s</span>
                                              ) : (
                                                <>
                                                  <span>{s.weight_kg}kg</span>
                                                  <span>x</span>
                                                  <span>{s.reps} reps</span>
                                                </>
                                              )}
                                              {s.rpe > 0 && <span className="text-zinc-600">RPE {s.rpe}</span>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              rendered.add(we.id);
                              return (
                                <div key={we.id}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <p className="text-white text-xs font-bold">{we.exercises?.name ?? 'Ukjent'}</p>
                                    {we.is_unilateral && (
                                      <span className="flex items-center gap-1 bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                        <Dumbbell size={8} />
                                        Unilateral
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {completedSets.map((s: any, si: number) => (
                                      <div key={si} className="flex items-center gap-3 text-xs text-zinc-400">
                                        <span className="text-zinc-600 w-5">{s.set_number}</span>
                                        {s.duration_seconds > 0 ? (
                                          <span>{s.duration_seconds}s</span>
                                        ) : (
                                          <>
                                            <span>{s.weight_kg}kg</span>
                                            <span>x</span>
                                            <span>{s.reps} reps</span>
                                          </>
                                        )}
                                        {s.rpe > 0 && <span className="text-zinc-600">RPE {s.rpe}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                          })()}

                          {/* Delete button */}
                          {confirmDelete === workout.id ? (
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                              <p className="text-xs text-zinc-400 flex-1">Slett denne økten?</p>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-medium"
                              >
                                Avbryt
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleDelete(workout.id)}
                                disabled={deleting}
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold"
                              >
                                {deleting ? '...' : 'Slett'}
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setConfirmDelete(workout.id)}
                              className="flex items-center gap-1.5 pt-2 border-t border-zinc-800 text-zinc-600 text-xs active:text-red-400"
                            >
                              <Trash2 size={12} />
                              Slett økt
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
