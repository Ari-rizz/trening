'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Trophy, ChartBar as BarChart2, ChevronRight, Dumbbell, Trash2, TriangleAlert as AlertTriangle, X, ChevronDown, Plus, Scale, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMuscleGroupLabel, getMuscleGroupColor, calculate1RM } from '@/lib/exercises-data';
import { format, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ManualEntrySheet } from './ManualEntrySheet';
import { useAppStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SessionData {
  workoutId: string;
  date: string;
  workoutName: string;
  isManual: boolean;
  maxWeight: number;
  totalVolume: number;
  sets: Array<{ weight_kg: number; reps: number; rpe: number; set_number: number; duration_seconds: number }>;
  oneRM: number;
  isTimeBased: boolean;
  maxDuration: number;
}

interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sessions: SessionData[];
  pr: { weight: number; reps: number; oneRM: number } | null;
  isTimeBased: boolean;
}

const MOCK_HISTORIES: ExerciseHistory[] = [
  {
    exerciseId: 'mock-bench',
    exerciseName: 'Benkpress',
    muscleGroup: 'chest',
    isTimeBased: false,
    pr: { weight: 90, reps: 5, oneRM: 101 },
    sessions: [
      { workoutId: 'm1', date: '2026-05-05', workoutName: 'Push A', isManual: false, maxWeight: 80, totalVolume: 1920, sets: [{ weight_kg: 80, reps: 8, rpe: 7, set_number: 1, duration_seconds: 0 }], oneRM: 96, isTimeBased: false, maxDuration: 0 },
      { workoutId: 'm2', date: '2026-05-12', workoutName: 'Push A', isManual: false, maxWeight: 85, totalVolume: 2040, sets: [{ weight_kg: 85, reps: 8, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 102, isTimeBased: false, maxDuration: 0 },
      { workoutId: 'm3', date: '2026-05-19', workoutName: 'Push A', isManual: false, maxWeight: 90, totalVolume: 2160, sets: [{ weight_kg: 90, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 101, isTimeBased: false, maxDuration: 0 },
    ],
  },
  {
    exerciseId: 'mock-squat',
    exerciseName: 'Knebøy',
    muscleGroup: 'legs',
    isTimeBased: false,
    pr: { weight: 120, reps: 5, oneRM: 135 },
    sessions: [
      { workoutId: 'm4', date: '2026-05-06', workoutName: 'Bein', isManual: false, maxWeight: 110, totalVolume: 3300, sets: [{ weight_kg: 110, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 124, isTimeBased: false, maxDuration: 0 },
      { workoutId: 'm5', date: '2026-05-13', workoutName: 'Bein', isManual: false, maxWeight: 120, totalVolume: 3600, sets: [{ weight_kg: 120, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 135, isTimeBased: false, maxDuration: 0 },
    ],
  },
  {
    exerciseId: 'mock-deadlift',
    exerciseName: 'Markløft',
    muscleGroup: 'back',
    isTimeBased: false,
    pr: { weight: 140, reps: 3, oneRM: 151 },
    sessions: [
      { workoutId: 'm6', date: '2026-05-07', workoutName: 'Pull', isManual: false, maxWeight: 130, totalVolume: 2340, sets: [{ weight_kg: 130, reps: 3, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 140, isTimeBased: false, maxDuration: 0 },
      { workoutId: 'm7', date: '2026-05-14', workoutName: 'Pull', isManual: false, maxWeight: 140, totalVolume: 2520, sets: [{ weight_kg: 140, reps: 3, rpe: 9, set_number: 1, duration_seconds: 0 }], oneRM: 151, isTimeBased: false, maxDuration: 0 },
    ],
  },
  {
    exerciseId: 'mock-ohp',
    exerciseName: 'Skulderpress',
    muscleGroup: 'shoulders',
    isTimeBased: false,
    pr: { weight: 60, reps: 6, oneRM: 70 },
    sessions: [
      { workoutId: 'm8', date: '2026-05-08', workoutName: 'Push B', isManual: false, maxWeight: 55, totalVolume: 990, sets: [{ weight_kg: 55, reps: 6, rpe: 7, set_number: 1, duration_seconds: 0 }], oneRM: 64, isTimeBased: false, maxDuration: 0 },
      { workoutId: 'm9', date: '2026-05-15', workoutName: 'Push B', isManual: false, maxWeight: 60, totalVolume: 1080, sets: [{ weight_kg: 60, reps: 6, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 70, isTimeBased: false, maxDuration: 0 },
    ],
  },
];

interface WeightLog {
  logged_at: string;
  weight_kg: number;
}

export function ProgressTab() {
  const [histories, setHistories] = useState<ExerciseHistory[]>([]);
  const [selected, setSelected] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { isTourMode, tourSelectedExerciseId } = useAppStore();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightPeriod, setWeightPeriod] = useState<30 | 90 | 180>(30);
  const [weightExpanded, setWeightExpanded] = useState(true);

  useEffect(() => {
    if (isTourMode) {
      setHistories(MOCK_HISTORIES);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchHistory(uid);
        fetchWeightLogs(uid);
      } else {
        setLoading(false);
      }
    });
  }, [isTourMode]);

  const fetchWeightLogs = async (uid: string) => {
    const from = format(subDays(new Date(), 180), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('body_weight_logs')
      .select('logged_at, weight_kg')
      .eq('user_id', uid)
      .gte('logged_at', from)
      .order('logged_at', { ascending: true });
    setWeightLogs(data ?? []);
  };

  useEffect(() => {
    if (isTourMode && tourSelectedExerciseId) {
      const match = MOCK_HISTORIES.find(h => h.exerciseId === tourSelectedExerciseId);
      if (match) setSelected(match);
    } else if (isTourMode && !tourSelectedExerciseId) {
      setSelected(null);
    }
  }, [isTourMode, tourSelectedExerciseId]);

  const fetchHistory = async (uid: string) => {
    setLoading(true);
    try {
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id, date, name, is_manual,
          workout_exercises(
            exercise_id,
            exercises(id, name, muscle_group),
            workout_sets(set_number, reps, weight_kg, rpe, duration_seconds, is_completed)
          )
        `)
        .eq('user_id', uid)
        .or('is_completed.eq.true,is_manual.eq.true')
        .order('date', { ascending: true });

      const exerciseMap: Record<string, ExerciseHistory> = {};

      for (const workout of (workouts ?? [])) {
        for (const we of (workout.workout_exercises ?? [])) {
          const ex = we.exercises as any;
          if (!ex) continue;
          if (!exerciseMap[ex.id]) {
            exerciseMap[ex.id] = {
              exerciseId: ex.id,
              exerciseName: ex.name,
              muscleGroup: ex.muscle_group,
              sessions: [],
              pr: null,
              isTimeBased: false,
            };
          }
          const completedSets = (we.workout_sets ?? [])
            .filter((s: any) => s.is_completed)
            .sort((a: any, b: any) => a.set_number - b.set_number);
          if (completedSets.length === 0) continue;

          const isTimeBased = completedSets.some((s: any) => (s.duration_seconds ?? 0) > 0) &&
            !completedSets.some((s: any) => (s.weight_kg ?? 0) > 0);
          const maxWeight = Math.max(...completedSets.map((s: any) => s.weight_kg ?? 0));
          const maxDuration = Math.max(...completedSets.map((s: any) => s.duration_seconds ?? 0));
          const totalVolume = completedSets.reduce((a: number, s: any) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
          const topSet = completedSets.reduce((best: any, s: any) => {
            const orm = calculate1RM(s.weight_kg ?? 0, s.reps ?? 0);
            const bestOrm = calculate1RM(best?.weight_kg ?? 0, best?.reps ?? 0);
            return orm > bestOrm ? s : best;
          }, completedSets[0]);
          const oneRM = calculate1RM(topSet?.weight_kg ?? 0, topSet?.reps ?? 0);

          if (isTimeBased) exerciseMap[ex.id].isTimeBased = true;

          exerciseMap[ex.id].sessions.push({
            workoutId: workout.id,
            date: workout.date,
            workoutName: workout.name,
            isManual: (workout as any).is_manual ?? false,
            maxWeight,
            totalVolume,
            sets: completedSets.map((s: any) => ({
              weight_kg: s.weight_kg ?? 0,
              reps: s.reps ?? 0,
              rpe: s.rpe ?? 0,
              set_number: s.set_number,
              duration_seconds: s.duration_seconds ?? 0,
            })),
            oneRM,
            isTimeBased,
            maxDuration,
          });

          if (!exerciseMap[ex.id].pr || oneRM > exerciseMap[ex.id].pr!.oneRM) {
            exerciseMap[ex.id].pr = {
              weight: topSet?.weight_kg ?? 0,
              reps: topSet?.reps ?? 0,
              oneRM,
            };
          }
        }
      }

      const sorted = Object.values(exerciseMap)
        .filter(h => h.sessions.length > 0)
        .sort((a, b) => b.sessions.length - a.sessions.length);

      setHistories(sorted);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDeleteSession = async (workoutId: string, exerciseId: string) => {
    // Check if the workout is a manual entry before deleting
    const { data: workoutRow } = await supabase
      .from('workouts')
      .select('is_manual')
      .eq('id', workoutId)
      .maybeSingle();

    await supabase
      .from('workout_exercises')
      .delete()
      .eq('workout_id', workoutId)
      .eq('exercise_id', exerciseId);

    // If manual entry, also delete the parent workout row
    if (workoutRow?.is_manual) {
      await supabase.from('workouts').delete().eq('id', workoutId);
    }

    setHistories(prev =>
      prev.map(h => {
        if (h.exerciseId !== exerciseId) return h;
        return { ...h, sessions: h.sessions.filter(s => s.workoutId !== workoutId) };
      }).filter(h => h.sessions.length > 0)
    );
    if (selected && selected.exerciseId === exerciseId) {
      const updatedSessions = selected.sessions.filter(s => s.workoutId !== workoutId);
      if (updatedSessions.length === 0) {
        setSelected(null);
      } else {
        setSelected({ ...selected, sessions: updatedSessions });
      }
    }
  };

  if (selected) {
    return (
      <ExerciseProgressDetail
        history={selected}
        onBack={() => setSelected(null)}
        onDeleteSession={handleDeleteSession}
      />
    );
  }

  const filteredWeightLogs = weightLogs.filter(l => {
    const cutoff = format(subDays(new Date(), weightPeriod), 'yyyy-MM-dd');
    return l.logged_at >= cutoff;
  });
  const currentWeight = filteredWeightLogs.length > 0
    ? filteredWeightLogs[filteredWeightLogs.length - 1].weight_kg
    : null;
  const startWeight = filteredWeightLogs.length > 0
    ? filteredWeightLogs[0].weight_kg
    : null;
  const weightDiff = currentWeight !== null && startWeight !== null
    ? currentWeight - startWeight
    : null;

  const weightChartData = filteredWeightLogs.map(l => ({
    date: format(new Date(l.logged_at), 'd. MMM', { locale: nb }),
    vekt: Number(l.weight_kg),
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Body weight section */}
      {userId && !isTourMode && (
        <div className="px-4 pt-5 mb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Kroppsvekt</h2>
              <p className="text-zinc-500 text-sm mt-0.5">
                {currentWeight !== null ? `${String(currentWeight).replace('.', ',')} kg nå` : 'Ingen data ennå'}
              </p>
            </div>
            <button
              onClick={() => setWeightExpanded(v => !v)}
              className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
            >
              <ChevronDown
                size={16}
                className={`text-zinc-400 transition-transform ${weightExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

            <AnimatePresence initial={false}>
              {weightExpanded && (
                <motion.div
                  key="weight-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl pb-4 pt-3 px-4 mb-4">
                    {/* Period selector */}
                    <div className="flex gap-2 mb-4">
                      {([30, 90, 180] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setWeightPeriod(p)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            weightPeriod === p
                              ? 'bg-blue-500 text-white'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {p} dager
                        </button>
                      ))}
                    </div>

                    {weightChartData.length === 0 ? (
                      <div className="py-8 text-center">
                        <Scale size={32} className="text-zinc-700 mx-auto mb-2" />
                        <p className="text-zinc-500 text-sm font-medium">Ingen vektdata</p>
                        <p className="text-zinc-600 text-xs mt-1">Logg vekten din fra hjem-fanen</p>
                      </div>
                    ) : (
                      <>
                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                            <p className="text-white font-bold text-sm">
                              {currentWeight !== null ? String(currentWeight).replace('.', ',') : '—'}
                            </p>
                            <p className="text-zinc-600 text-[10px] mt-0.5">Nå</p>
                          </div>
                          <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                            <p className="text-white font-bold text-sm">
                              {startWeight !== null ? String(startWeight).replace('.', ',') : '—'}
                            </p>
                            <p className="text-zinc-600 text-[10px] mt-0.5">Start</p>
                          </div>
                          <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                            {weightDiff !== null ? (
                              <>
                                <p className={`font-bold text-sm flex items-center justify-center gap-0.5 ${
                                  weightDiff < 0 ? 'text-green-400' : weightDiff > 0 ? 'text-red-400' : 'text-zinc-400'
                                }`}>
                                  {weightDiff > 0
                                    ? <TrendingUp size={12} />
                                    : weightDiff < 0
                                    ? <TrendingDown size={12} />
                                    : null}
                                  {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1).replace('.', ',')}
                                </p>
                                <p className="text-zinc-600 text-[10px] mt-0.5">Endring</p>
                              </>
                            ) : (
                              <p className="text-zinc-600 text-sm">—</p>
                            )}
                          </div>
                        </div>

                        {/* Chart */}
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weightChartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                              <XAxis
                                dataKey="date"
                                tick={{ fill: '#52525b', fontSize: 9 }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                tick={{ fill: '#52525b', fontSize: 9 }}
                                tickLine={false}
                                axisLine={false}
                                domain={['auto', 'auto']}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: '#18181b',
                                  border: '1px solid #3f3f46',
                                  borderRadius: 10,
                                  color: '#fff',
                                  fontSize: 12,
                                }}
                                formatter={(v: number) => [`${String(v).replace('.', ',')} kg`, 'Vekt']}
                                labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="vekt"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={weightChartData.length <= 14}
                                activeDot={{ r: 4, fill: '#3b82f6' }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      )}

      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fremgang</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Alle øvelser du har trent</p>
        </div>
        {userId && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowManualEntry(true)}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
          >
            <Plus size={18} className="text-white" />
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-2">
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !isTourMode && !userId && (
          <div className="text-center py-16">
            <TrendingUp size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Logg inn for å se din fremgang</p>
          </div>
        )}

        {!loading && !isTourMode && userId && histories.length === 0 && (
          <div className="text-center py-16">
            <BarChart2 size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">Ingen historikk ennå</p>
            <p className="text-zinc-600 text-sm mt-1">Fullfør en økt for å se fremgang</p>
          </div>
        )}

        {histories.map((h, i) => {
          const color = getMuscleGroupColor(h.muscleGroup);
          const lastSession = h.sessions[h.sessions.length - 1];
          const prevSession = h.sessions.length >= 2 ? h.sessions[h.sessions.length - 2] : null;
          const trend = h.isTimeBased
            ? (prevSession ? lastSession.maxDuration - prevSession.maxDuration : 0)
            : (prevSession ? lastSession.oneRM - prevSession.oneRM : 0);

          return (
            <motion.button
              key={h.exerciseId}
              data-tour={i === 0 ? 'progress-list' : undefined}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(h)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 text-left active:bg-zinc-800"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '22' }}
              >
                <Dumbbell size={18} style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{h.exerciseName}</p>
                <p className="text-xs mt-0.5" style={{ color }}>
                  {getMuscleGroupLabel(h.muscleGroup)} - {h.sessions.length} {h.sessions.length === 1 ? 'sesjon' : 'sesjoner'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                {h.isTimeBased ? (
                  <p className="text-white font-bold text-sm">{lastSession.maxDuration}s</p>
                ) : h.pr ? (
                  <p className="text-white font-bold text-sm">{Math.round(h.pr.oneRM)}kg</p>
                ) : null}
                {trend !== 0 && (
                  <p className={`text-xs font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{Math.round(trend)}{h.isTimeBased ? 's' : ''}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-zinc-700 flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {userId && (
        <ManualEntrySheet
          open={showManualEntry}
          userId={userId}
          onClose={() => setShowManualEntry(false)}
          onSaved={() => fetchHistory(userId)}
        />
      )}
    </div>
  );
}

function ExerciseProgressDetail({
  history,
  onBack,
  onDeleteSession,
}: {
  history: ExerciseHistory;
  onBack: () => void;
  onDeleteSession: (workoutId: string, exerciseId: string) => void;
}) {
  const color = getMuscleGroupColor(history.muscleGroup);
  const isTime = history.isTimeBased;
  const maxORM = Math.max(...history.sessions.map(s => s.oneRM));
  const maxDur = Math.max(...history.sessions.map(s => s.maxDuration));
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showRMTable, setShowRMTable] = useState(false);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center"
        >
          <ChevronRight size={18} className="text-white rotate-180" />
        </motion.button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{history.exerciseName}</h2>
          <p className="text-xs mt-0.5" style={{ color }}>{getMuscleGroupLabel(history.muscleGroup)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {/* PR Card */}
        {isTime ? (
          maxDur > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-blue-400" />
                <p className="text-blue-400 text-xs font-bold">BESTE TID</p>
              </div>
              <p className="text-2xl font-bold text-white">{maxDur}s</p>
            </div>
          )
        ) : history.pr && (
          <>
            <motion.button
              data-tour="progress-1rm"
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowRMTable(true)}
              className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  <p className="text-yellow-400 text-xs font-bold">PERSONLIG REKORD</p>
                </div>
                <div className="flex items-center gap-1 text-yellow-500/60 text-xs">
                  <span>Se alle RM</span>
                  <ChevronDown size={12} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {Math.round(history.pr.oneRM)} kg
                <span className="text-sm font-normal text-zinc-400 ml-2">1RM</span>
              </p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {history.pr.weight}kg x {history.pr.reps} reps
              </p>
            </motion.button>

            {/* RM Table Modal */}
            <AnimatePresence>
              {showRMTable && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
                  onClick={e => { if (e.target === e.currentTarget) setShowRMTable(false); }}
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl overflow-hidden"
                  >
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
                      <div>
                        <h3 className="text-base font-bold text-white">Repetisjons-maks</h3>
                        <p className="text-zinc-500 text-xs mt-0.5">{history.exerciseName}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowRMTable(false)}
                        className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
                      >
                        <X size={16} className="text-zinc-400" />
                      </motion.button>
                    </div>
                    <div className="px-5 py-4 pb-32 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                      <p className="text-zinc-500 text-xs mb-4">
                        Basert på {history.pr.weight}kg × {history.pr.reps} reps
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(reps => {
                          const oneRM = Math.round(history.pr!.oneRM);
                          const rm = reps === 1
                            ? oneRM
                            : Math.round(oneRM / (1 + reps / 30));
                          const pct = Math.round((rm / oneRM) * 100);
                          const isPR = reps === 1;
                          return (
                            <div
                              key={reps}
                              className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl ${
                                isPR
                                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                                  : 'bg-zinc-900 border border-zinc-800/40'
                              }`}
                            >
                              <span className={`text-[11px] font-bold mb-1 ${isPR ? 'text-yellow-400' : 'text-zinc-500'}`}>
                                {reps}RM
                              </span>
                              <span className={`text-base font-bold leading-none ${isPR ? 'text-yellow-300' : 'text-white'}`}>
                                {rm}kg
                              </span>
                              {!isPR && (
                                <span className="text-[9px] text-zinc-600 mt-1">{pct}%</span>
                              )}
                              {isPR && <Trophy size={10} className="text-yellow-400 mt-1" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Chart */}
        {history.sessions.length > 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-sm font-bold text-white mb-3">{isTime ? 'Tid-utvikling' : '1RM utvikling'}</p>
            <div className="flex items-end gap-1 h-28">
              {history.sessions.map((s, i) => {
                const height = isTime
                  ? (maxDur > 0 ? (s.maxDuration / maxDur) * 100 : 0)
                  : (maxORM > 0 ? (s.oneRM / maxORM) * 100 : 0);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                      className="w-full rounded-t-sm min-h-[3px]"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full session history with all sets */}
        <div>
          <p className="text-sm font-bold text-white mb-2">Alle sesjoner ({history.sessions.length})</p>
          <div className="space-y-2">
            {[...history.sessions].reverse().map((s, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {format(new Date(s.date), 'EEE d. MMM yyyy', { locale: nb })}
                    </p>
                    {s.isManual ? (
                      <span className="inline-block text-[10px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 mt-0.5 font-medium">
                        Manuell
                      </span>
                    ) : (
                      <p className="text-[10px] text-zinc-600 mt-0.5">{s.workoutName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {isTime ? (
                        <>
                          <p className="text-white font-bold text-sm">{s.maxDuration}s</p>
                          <p className="text-[10px] text-zinc-600">maks</p>
                        </>
                      ) : (
                        <>
                          <p className="text-white font-bold text-sm">{Math.round(s.oneRM)}kg</p>
                          <p className="text-[10px] text-zinc-600">1RM</p>
                        </>
                      )}
                    </div>
                    {confirmDelete === s.workoutId ? (
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-400"
                        >
                          Nei
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => { onDeleteSession(s.workoutId, history.exerciseId); setConfirmDelete(null); }}
                          className="px-2 py-1 text-[10px] rounded bg-red-500/20 text-red-400 font-bold"
                        >
                          Slett
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setConfirmDelete(s.workoutId)}
                        className="p-1.5 text-zinc-700 active:text-red-400"
                      >
                        <Trash2 size={12} />
                      </motion.button>
                    )}
                  </div>
                </div>
                {/* All sets from this session */}
                <div className="space-y-1 border-t border-zinc-800/50 pt-2">
                  {s.sets.map((set, si) => (
                    <div key={si} className="flex items-center gap-3 text-xs">
                      <span className="text-zinc-600 w-4 text-right">{set.set_number}</span>
                      {isTime ? (
                        <span className="text-zinc-300 font-mono">{set.duration_seconds}s</span>
                      ) : (
                        <>
                          <span className="text-zinc-300 font-mono">{set.weight_kg}kg</span>
                          <span className="text-zinc-500">x</span>
                          <span className="text-zinc-300 font-mono">{set.reps}</span>
                        </>
                      )}
                      {set.rpe > 0 && <span className="text-zinc-600 text-[10px]">RPE {set.rpe}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
