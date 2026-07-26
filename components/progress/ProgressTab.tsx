'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Trophy, ChartBar as BarChart2, ChevronRight, Dumbbell, Trash2, TriangleAlert as AlertTriangle, X, ChevronDown, Plus, Scale, TrendingDown, Link2, Search, Pin, Check, Info, ChevronUp } from 'lucide-react';
import { supabase, Exercise } from '@/lib/supabase';
import { getMuscleGroupLabel, getMuscleGroupColor, calculate1RM, MUSCLE_GROUPS } from '@/lib/exercises-data';
import { format, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { ManualEntrySheet } from './ManualEntrySheet';
import { CreateGoalSheet, GoalsSection } from '@/components/goals/CreateGoalSheet';
import { fetchGoals, deleteGoal } from '@/lib/goals';
import { Goal } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MuscleMap } from '@/components/dashboard/MuscleMap';
import { fetchMuscleActivation, recomputeMuscleActivation, calculateBalance, generateRecommendations, RegionBalance, BalanceRecommendation } from '@/lib/muscle-balance';
import { MUSCLE_REGIONS, getRegionParent } from '@/lib/muscle-regions';
import { searchExercises } from '@/lib/exercise-search';

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
  supersetGroup: number | null;
}

interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  mechanic: string;
  sessions: SessionData[];
  pr: { weight: number; reps: number; oneRM: number } | null;
  isTimeBased: boolean;
}

const MOCK_HISTORIES: ExerciseHistory[] = [
  {
    exerciseId: 'mock-bench',
    exerciseName: 'Benkpress',
    muscleGroup: 'chest',
    mechanic: 'compound',
    isTimeBased: false,
    pr: { weight: 90, reps: 5, oneRM: 101 },
    sessions: [
      { workoutId: 'm1', date: '2026-05-05', workoutName: 'Push A', isManual: false, maxWeight: 80, totalVolume: 1920, sets: [{ weight_kg: 80, reps: 8, rpe: 7, set_number: 1, duration_seconds: 0 }], oneRM: 96, isTimeBased: false, maxDuration: 0, supersetGroup: null },
      { workoutId: 'm2', date: '2026-05-12', workoutName: 'Push A', isManual: false, maxWeight: 85, totalVolume: 2040, sets: [{ weight_kg: 85, reps: 8, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 102, isTimeBased: false, maxDuration: 0, supersetGroup: null },
      { workoutId: 'm3', date: '2026-05-19', workoutName: 'Push A', isManual: false, maxWeight: 90, totalVolume: 2160, sets: [{ weight_kg: 90, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 101, isTimeBased: false, maxDuration: 0, supersetGroup: null },
    ],
  },
  {
    exerciseId: 'mock-squat',
    exerciseName: 'Knebøy',
    muscleGroup: 'legs',
    mechanic: 'compound',
    isTimeBased: false,
    pr: { weight: 120, reps: 5, oneRM: 135 },
    sessions: [
      { workoutId: 'm4', date: '2026-05-06', workoutName: 'Bein', isManual: false, maxWeight: 110, totalVolume: 3300, sets: [{ weight_kg: 110, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 124, isTimeBased: false, maxDuration: 0, supersetGroup: null },
      { workoutId: 'm5', date: '2026-05-13', workoutName: 'Bein', isManual: false, maxWeight: 120, totalVolume: 3600, sets: [{ weight_kg: 120, reps: 5, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 135, isTimeBased: false, maxDuration: 0, supersetGroup: null },
    ],
  },
  {
    exerciseId: 'mock-deadlift',
    exerciseName: 'Markløft',
    muscleGroup: 'back',
    mechanic: 'compound',
    isTimeBased: false,
    pr: { weight: 140, reps: 3, oneRM: 151 },
    sessions: [
      { workoutId: 'm6', date: '2026-05-07', workoutName: 'Pull', isManual: false, maxWeight: 130, totalVolume: 2340, sets: [{ weight_kg: 130, reps: 3, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 140, isTimeBased: false, maxDuration: 0, supersetGroup: null },
      { workoutId: 'm7', date: '2026-05-14', workoutName: 'Pull', isManual: false, maxWeight: 140, totalVolume: 2520, sets: [{ weight_kg: 140, reps: 3, rpe: 9, set_number: 1, duration_seconds: 0 }], oneRM: 151, isTimeBased: false, maxDuration: 0, supersetGroup: null },
    ],
  },
  {
    exerciseId: 'mock-ohp',
    exerciseName: 'Skulderpress',
    muscleGroup: 'shoulders',
    mechanic: 'compound',
    isTimeBased: false,
    pr: { weight: 60, reps: 6, oneRM: 70 },
    sessions: [
      { workoutId: 'm8', date: '2026-05-08', workoutName: 'Push B', isManual: false, maxWeight: 55, totalVolume: 990, sets: [{ weight_kg: 55, reps: 6, rpe: 7, set_number: 1, duration_seconds: 0 }], oneRM: 64, isTimeBased: false, maxDuration: 0, supersetGroup: null },
      { workoutId: 'm9', date: '2026-05-15', workoutName: 'Push B', isManual: false, maxWeight: 60, totalVolume: 1080, sets: [{ weight_kg: 60, reps: 6, rpe: 8, set_number: 1, duration_seconds: 0 }], oneRM: 70, isTimeBased: false, maxDuration: 0, supersetGroup: null },
    ],
  },
];

interface WeightLog {
  logged_at: string;
  weight_kg: number;
}

type ChartTab = 'weight' | 'strength';
type Period = 30 | 90 | 180;

export function ProgressTab() {
  const [histories, setHistories] = useState<ExerciseHistory[]>([]);
  const [selected, setSelected] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const { isTourMode, tourSelectedExerciseId } = useAppStore();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightPeriod, setWeightPeriod] = useState<Period>(30);
  const [strengthPeriod, setStrengthPeriod] = useState<Period>(30);
  const [chartTab, setChartTab] = useState<ChartTab>('weight');
  const [trackedExercises, setTrackedExercises] = useState<string[]>([]);
  const [balanceScores, setBalanceScores] = useState<Record<string, number>>({});
  const [regionBalances, setRegionBalances] = useState<RegionBalance[]>([]);
  const [recommendations, setRecommendations] = useState<BalanceRecommendation[]>([]);
  const [expandedBalanceGroups, setExpandedBalanceGroups] = useState<Set<string>>(new Set());
  const [highlightedGroup, setHighlightedGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [pinSearch, setPinSearch] = useState('');
  const [pinDraft, setPinDraft] = useState<string[]>([]);
  const [pinSaving, setPinSaving] = useState(false);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isTourMode) {
      setHistories(MOCK_HISTORIES);
      setTrackedExercises(['mock-bench', 'mock-squat', 'mock-deadlift']);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchHistory(uid);
        fetchWeightLogs(uid);
        fetchGoals().then(setGoals);
        fetchTrackedExercises(uid);
        fetchBalanceScores();
      } else {
        setLoading(false);
      }
    });
  }, [isTourMode]);

  useEffect(() => {
    if (isTourMode && tourSelectedExerciseId) {
      const match = MOCK_HISTORIES.find(h => h.exerciseId === tourSelectedExerciseId);
      if (match) setSelected(match);
    } else if (isTourMode && !tourSelectedExerciseId) {
      setSelected(null);
    }
  }, [isTourMode, tourSelectedExerciseId]);

  const fetchTrackedExercises = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('tracked_exercises')
      .eq('id', uid)
      .maybeSingle();
    if (data?.tracked_exercises) {
      setTrackedExercises(data.tracked_exercises as string[]);
    }
  };

  const fetchBalanceScores = async () => {
    let activations = await fetchMuscleActivation();
    if (activations.length === 0) {
      await recomputeMuscleActivation();
      activations = await fetchMuscleActivation();
    }
    const balances = calculateBalance(activations);
    setRegionBalances(balances);
    setRecommendations(generateRecommendations(balances));
    const groupSets = new Map<string, number>();
    for (const a of activations) {
      const parent = getRegionParent(a.region);
      groupSets.set(parent, (groupSets.get(parent) ?? 0) + Number(a.sets));
    }
    const totalSets = Array.from(groupSets.values()).reduce((a, v) => a + v, 0) || 1;
    const scores: Record<string, number> = {};
    groupSets.forEach((sets, group) => {
      scores[group] = Math.round((sets / totalSets) * 100);
    });
    setBalanceScores(scores);
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

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

  const fetchHistory = async (uid: string) => {
    setLoading(true);
    try {
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id, date, name, is_manual,
          workout_exercises(
            exercise_id, superset_group,
            exercises(id, name, muscle_group, mechanic),
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
              mechanic: (ex.mechanic ?? '').toLowerCase(),
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
            supersetGroup: (we as any).superset_group ?? null,
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

  const openPinSheet = async () => {
    setPinDraft(trackedExercises);
    setPinSearch('');
    if (allExercises.length === 0) {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, muscle_group, secondary_muscles, equipment, nicknames')
        .order('name');
      if (data) setAllExercises(data as Exercise[]);
    }
    setShowPinSheet(true);
  };

  const savePinnedExercises = async () => {
    if (!userId) return;
    setPinSaving(true);
    await supabase
      .from('profiles')
      .update({ tracked_exercises: pinDraft })
      .eq('id', userId);
    setTrackedExercises(pinDraft);
    setPinSaving(false);
    setShowPinSheet(false);
  };

  const scrollToGroup = (group: string) => {
    setExpandedGroups(prev => new Set(prev).add(group));
    setExpandedBalanceGroups(prev => new Set(prev).add(group));
    setHighlightedGroup(group);
    setTimeout(() => {
      const el = groupRefs.current[group];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    setTimeout(() => setHighlightedGroup(null), 1500);
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

  // Strength chart: sum of 1RM across pinned exercises per session date
  const pinnedHistories = histories.filter(h => trackedExercises.includes(h.exerciseId) && !h.isTimeBased);
  const strengthChartData = useMemo(() => {
    const dateMap = new Map<string, { date: string; styrke: number }>();
    for (const h of pinnedHistories) {
      for (const s of h.sessions) {
        const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
        const existing = dateMap.get(dateKey) ?? { date: format(new Date(s.date), 'd. MMM', { locale: nb }), styrke: 0 };
        existing.styrke += Math.round(s.oneRM);
        dateMap.set(dateKey, existing);
      }
    }
    return Array.from(dateMap.values()).sort((a, b) => {
      const aDate = a.date;
      const bDate = b.date;
      return aDate.localeCompare(bDate);
    });
  }, [pinnedHistories]);

  // Group exercises by mechanic then muscle group
  const grouped = useMemo(() => {
    const compound: Record<string, ExerciseHistory[]> = {};
    const isolation: Record<string, ExerciseHistory[]> = {};
    const other: Record<string, ExerciseHistory[]> = {};
    for (const h of histories) {
      const bucket = h.mechanic === 'compound' ? compound : h.mechanic === 'isolation' ? isolation : other;
      const key = h.muscleGroup;
      if (!bucket[key]) bucket[key] = [];
      bucket[key].push(h);
    }
    return { compound, isolation, other };
  }, [histories]);

  const renderGroupedSection = (title: string, groups: Record<string, ExerciseHistory[]>) => {
    const groupKeys = Object.keys(groups).sort((a, b) => {
      const order = MUSCLE_GROUPS.map(m => m.value);
      return order.indexOf(a as any) - order.indexOf(b as any);
    });
    if (groupKeys.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-2 px-1">{title}</h3>
        <div className="space-y-2">
          {groupKeys.map(mg => {
            const exercises = groups[mg];
            const color = getMuscleGroupColor(mg);
            const label = getMuscleGroupLabel(mg);
            const groupKey = `${title}-${mg}`;
            const isExpanded = expandedGroups.has(groupKey);
            return (
              <div
                key={groupKey}
                ref={el => { groupRefs.current[mg] = el; }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(groupKey)) next.delete(groupKey);
                    else next.add(groupKey);
                    return next;
                  })}
                  className="w-full flex items-center gap-3 p-3.5 text-left"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '22' }}
                  >
                    <Dumbbell size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-xs text-zinc-500">{exercises.length} {exercises.length === 1 ? 'øvelse' : 'øvelser'}</p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-2 pb-2 space-y-1.5">
                        {exercises.map((h, i) => {
                          const lastSession = h.sessions[h.sessions.length - 1];
                          const prevSession = h.sessions.length >= 2 ? h.sessions[h.sessions.length - 2] : null;
                          const trend = h.isTimeBased
                            ? (prevSession ? lastSession.maxDuration - prevSession.maxDuration : 0)
                            : (prevSession ? lastSession.oneRM - prevSession.oneRM : 0);
                          return (
                            <motion.button
                              key={h.exerciseId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              onClick={() => setSelected(h)}
                              className="w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl p-3 flex items-center gap-3 text-left active:bg-zinc-800"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm truncate">{h.exerciseName}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">{h.sessions.length} {h.sessions.length === 1 ? 'sesjon' : 'sesjoner'}</p>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const pinnedCards = trackedExercises
    .map(id => histories.find(h => h.exerciseId === id))
    .filter((h): h is ExerciseHistory => h !== undefined);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fremgang</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Din utvikling over tid</p>
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

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
        {/* Section 1: Body Map + Balance breakdown */}
        {!isTourMode && userId && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">Muskelbalanse</h2>
            <p className="text-zinc-500 text-xs mb-3">Sett-fordeling siste 4 ukene — trykk på en muskel for å se øvelsene</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              {Object.keys(balanceScores).length === 0 ? (
                <div className="py-8 text-center">
                  <Scale size={28} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-sm">Ingen balansedata ennå</p>
                  <p className="text-zinc-600 text-xs mt-1">Fullfør økter for å se fordeling</p>
                </div>
              ) : (
                <>
                  <MuscleMap
                    mode="balance"
                    balanceScores={balanceScores}
                    onGroupSelect={scrollToGroup}
                  />
                  <BalanceBreakdown
                    balances={regionBalances}
                    expandedGroups={expandedBalanceGroups}
                    setExpandedGroups={setExpandedBalanceGroups}
                    groupRefs={groupRefs}
                    highlightedGroup={highlightedGroup}
                    onGroupClick={(g) => scrollToGroup(g)}
                  />
                  {recommendations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                      {recommendations.map((rec, i) => (
                        <div
                          key={i}
                          className={`flex gap-2.5 p-3 rounded-xl border ${
                            rec.severity === 'warning'
                              ? 'bg-orange-500/10 border-orange-500/30'
                              : 'bg-blue-500/10 border-blue-500/30'
                          }`}
                        >
                          {rec.severity === 'warning' ? (
                            <AlertTriangle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${rec.severity === 'warning' ? 'text-orange-300' : 'text-blue-300'}`}>
                              {rec.title}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{rec.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Swipeable Charts */}
        {!isTourMode && userId && (
          <div className="mb-6">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setChartTab('weight')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                  chartTab === 'weight' ? 'bg-blue-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
              >
                Kroppsvekt
              </button>
              <button
                onClick={() => setChartTab('strength')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                  chartTab === 'strength' ? 'bg-blue-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
              >
                Total styrke
              </button>
            </div>

            <AnimatePresence mode="wait">
              {chartTab === 'weight' ? (
                <motion.div
                  key="weight-chart"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex gap-2 mb-3">
                    {([30, 90, 180] as Period[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setWeightPeriod(p)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          weightPeriod === p ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {p} dager
                      </button>
                    ))}
                  </div>

                  {weightChartData.length === 0 ? (
                    <div className="py-8 text-center">
                      <Scale size={28} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Ingen vektdata</p>
                      <p className="text-zinc-600 text-xs mt-1">Logg vekten din fra hjem-fanen</p>
                    </div>
                  ) : (
                    <>
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
                                {weightDiff > 0 ? <TrendingUp size={12} /> : weightDiff < 0 ? <TrendingDown size={12} /> : null}
                                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1).replace('.', ',')}
                              </p>
                              <p className="text-zinc-600 text-[10px] mt-0.5">Endring</p>
                            </>
                          ) : (
                            <p className="text-zinc-600 text-sm">—</p>
                          )}
                        </div>
                      </div>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weightChartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: '#52525b', fontSize: 9 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, color: '#fff', fontSize: 12 }}
                              formatter={(v: number) => [`${String(v).replace('.', ',')} kg`, 'Vekt']}
                              labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
                            />
                            <Line type="monotone" dataKey="vekt" stroke="#3b82f6" strokeWidth={2} dot={weightChartData.length <= 14} activeDot={{ r: 4, fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="strength-chart"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex gap-2 mb-3">
                    {([30, 90, 180] as Period[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setStrengthPeriod(p)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          strengthPeriod === p ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {p} dager
                      </button>
                    ))}
                  </div>

                  {pinnedHistories.length === 0 ? (
                    <div className="py-8 text-center">
                      <Pin size={28} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Ingen pinned øvelser</p>
                      <p className="text-zinc-600 text-xs mt-1">Velg øvelser å følge med pin-ikonet</p>
                    </div>
                  ) : strengthChartData.length === 0 ? (
                    <div className="py-8 text-center">
                      <TrendingUp size={28} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">Ingen styrkedata</p>
                      <p className="text-zinc-600 text-xs mt-1">Logg økter med pinned øvelser</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-500 mb-3">Sum 1RM for {pinnedHistories.length} pinned øvelser</p>
                      <div className="h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={strengthChartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fill: '#52525b', fontSize: 9 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, color: '#fff', fontSize: 12 }}
                              formatter={(v: number) => [`${Math.round(v)} kg`, 'Styrke']}
                              labelStyle={{ color: '#a1a1aa', marginBottom: 2 }}
                            />
                            <Line type="monotone" dataKey="styrke" stroke="#10b981" strokeWidth={2} dot={strengthChartData.length <= 14} activeDot={{ r: 4, fill: '#10b981' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Section 3: Pinned Exercises */}
        {!isTourMode && userId && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white">Pinned øvelser</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={openPinSheet}
                className="flex items-center gap-1 text-blue-400 text-xs font-medium"
              >
                <Pin size={12} />
                Endre
              </motion.button>
            </div>
            {pinnedCards.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <Pin size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">Ingen pinned øvelser</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={openPinSheet}
                  className="mt-3 bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Velg øvelser
                </motion.button>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
                {pinnedCards.map(h => {
                  const color = getMuscleGroupColor(h.muscleGroup);
                  const lastSession = h.sessions[h.sessions.length - 1];
                  const prevSession = h.sessions.length >= 2 ? h.sessions[h.sessions.length - 2] : null;
                  const trend = h.isTimeBased
                    ? (prevSession ? lastSession.maxDuration - prevSession.maxDuration : 0)
                    : (prevSession ? lastSession.oneRM - prevSession.oneRM : 0);
                  return (
                    <motion.button
                      key={h.exerciseId}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelected(h)}
                      className="flex-shrink-0 w-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-left active:bg-zinc-800"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                        style={{ backgroundColor: color + '22' }}
                      >
                        <Dumbbell size={14} style={{ color }} />
                      </div>
                      <p className="text-white font-semibold text-xs truncate mb-1">{h.exerciseName}</p>
                      {h.isTimeBased ? (
                        <p className="text-white font-bold text-sm">{lastSession.maxDuration}s</p>
                      ) : h.pr ? (
                        <p className="text-white font-bold text-sm">{Math.round(h.pr.oneRM)}kg</p>
                      ) : null}
                      {trend !== 0 && (
                        <p className={`text-xs font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trend > 0 ? '+' : ''}{Math.round(trend)}{h.isTimeBased ? 's' : ''} 30d
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section 4: Exercise Groups */}
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

        {!loading && histories.length > 0 && (
          <>
            {renderGroupedSection('Sammensatte', grouped.compound)}
            {renderGroupedSection('Isolasjon', grouped.isolation)}
            {Object.keys(grouped.other).length > 0 && renderGroupedSection('Annet', grouped.other)}
          </>
        )}

        {!loading && !isTourMode && userId && histories.length > 0 && (
          <>
            <GoalsSection
              goals={goals}
              onAdd={() => setShowCreateGoal(true)}
              onDelete={handleDeleteGoal}
            />
          </>
        )}
      </div>

      {userId && (
        <ManualEntrySheet
          open={showManualEntry}
          userId={userId}
          onClose={() => setShowManualEntry(false)}
          onSaved={() => fetchHistory(userId)}
        />
      )}

      <CreateGoalSheet
        open={showCreateGoal}
        onClose={() => setShowCreateGoal(false)}
        onCreated={() => { fetchGoals().then(setGoals); }}
      />

      {/* Pin exercises sheet */}
      <AnimatePresence>
        {showPinSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={e => { if (e.target === e.currentTarget) setShowPinSheet(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl overflow-hidden flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-zinc-700 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900">
                <div>
                  <h3 className="text-base font-bold text-white">Velg øvelser å følge</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">{pinDraft.length} valgt</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPinSheet(false)}
                  className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <X size={16} className="text-zinc-400" />
                </motion.button>
              </div>

              {pinDraft.length > 0 && (
                <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-zinc-900">
                  {pinDraft.map(id => {
                    const ex = allExercises.find(e => e.id === id);
                    if (!ex) return null;
                    return (
                      <div key={id} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full pl-2.5 pr-1 py-1">
                        <span className="text-xs font-medium text-white">{ex.name}</span>
                        <button
                          onClick={() => setPinDraft(prev => prev.filter(x => x !== id))}
                          className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center"
                        >
                          <X size={11} className="text-zinc-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative px-5 py-3 border-b border-zinc-900">
                <Search size={16} className="absolute left-8 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={pinSearch}
                  onChange={e => setPinSearch(e.target.value)}
                  placeholder="Søk etter øvelser…"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3 pb-32 space-y-1.5">
                {(() => {
                  const results = searchExercises(allExercises, pinSearch).slice(0, 50);
                  if (results.length === 0) {
                    return <div className="py-8 text-center"><p className="text-zinc-600 text-sm">Ingen øvelser funnet</p></div>;
                  }
                  return results.map(ex => {
                    const isSelected = pinDraft.includes(ex.id);
                    const color = getMuscleGroupColor(ex.muscle_group);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setPinDraft(prev => isSelected ? prev.filter(x => x !== ex.id) : [...prev, ex.id])}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                          isSelected ? 'bg-blue-500/10 border-blue-500/40' : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
                          <Dumbbell size={16} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                          <p className="text-xs" style={{ color }}>{getMuscleGroupLabel(ex.muscle_group)}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-zinc-800'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-zinc-950 border-t border-zinc-900">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={savePinnedExercises}
                  disabled={pinSaving}
                  className="w-full bg-blue-500 disabled:bg-zinc-800 text-white py-3 rounded-xl font-bold text-sm"
                >
                  {pinSaving ? 'Lagrer…' : 'Lagre'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BalanceBreakdown({
  balances,
  expandedGroups,
  setExpandedGroups,
  groupRefs,
  highlightedGroup,
  onGroupClick,
}: {
  balances: RegionBalance[];
  expandedGroups: Set<string>;
  setExpandedGroups: (updater: (prev: Set<string>) => Set<string>) => void;
  groupRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  highlightedGroup: string | null;
  onGroupClick: (group: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, RegionBalance[]>();
    for (const b of balances) {
      const key = b.parent;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    const order = MUSCLE_GROUPS.map(m => m.value);
    return Array.from(map.entries())
      .filter(([key]) => order.includes(key as any))
      .sort((a, b) => order.indexOf(a[0] as any) - order.indexOf(b[0] as any));
  }, [balances]);

  const maxGroupSets = Math.max(...grouped.map(([, items]) => items.reduce((a, b) => a + b.totalSets, 0)), 1);

  const statusColor = (status: string) => {
    if (status === 'overtrained') return '#ef4444';
    if (status === 'undertrained') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <Scale size={14} className="text-zinc-400" />
        <p className="text-sm font-bold text-white">Sett per uke</p>
      </div>
      <div className="space-y-2">
        {grouped.map(([parent, items]) => {
          const totalSets = items.reduce((a, b) => a + b.totalSets, 0);
          const weeklySets = items.reduce((a, b) => a + b.weeklySets, 0);
          const totalPct = items.reduce((a, b) => a + b.percentage, 0);
          const color = getMuscleGroupColor(parent);
          const label = getMuscleGroupLabel(parent);
          const widthPct = (totalSets / maxGroupSets) * 100;
          const isExpanded = expandedGroups.has(parent);
          const isHighlighted = highlightedGroup === parent;
          const hasSubRegions = items.length > 1;

          return (
            <div
              key={parent}
              ref={el => { groupRefs.current[parent] = el; }}
              className={`rounded-xl border transition-colors ${
                isHighlighted ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-800/30 border-zinc-800'
              }`}
            >
              <button
                onClick={() => {
                  if (hasSubRegions) {
                    setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(parent)) next.delete(parent);
                      else next.add(parent);
                      return next;
                    });
                  } else {
                    onGroupClick(parent);
                  }
                }}
                className="w-full flex items-center gap-3 p-2.5 text-left"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color + '22' }}
                >
                  <Dumbbell size={13} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[10px] font-mono">
                        {weeklySets.toFixed(1)}/u
                      </span>
                      <span className="text-zinc-400 text-[10px] font-bold w-8 text-right">{totalPct}%</span>
                      {hasSubRegions && (
                        isExpanded
                          ? <ChevronUp size={12} className="text-zinc-600" />
                          : <ChevronDown size={12} className="text-zinc-600" />
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && hasSubRegions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2.5 pb-2.5 pt-1 space-y-1.5">
                      {items.map(r => {
                        const rColor = statusColor(r.status);
                        const rWidth = r.totalSets > 0
                          ? (r.totalSets / Math.max(...items.map(i => i.totalSets), 1)) * 100
                          : 0;
                        return (
                          <div key={r.region} className="flex items-center gap-2 pl-9">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="text-zinc-400 text-[10px] truncate">{r.label}</p>
                                <div className="flex items-center gap-1.5">
                                  {r.totalSets > 0 ? (
                                    <span className="text-zinc-600 text-[9px] font-mono">{r.weeklySets.toFixed(1)}/u</span>
                                  ) : (
                                    <span className="text-zinc-700 text-[9px]">—</span>
                                  )}
                                  <span className="text-zinc-500 text-[9px] font-bold w-6 text-right">{r.percentage}%</span>
                                </div>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${rWidth}%` }}
                                  transition={{ duration: 0.4 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: rColor }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
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

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] space-y-4">
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

        <div>
          <p className="text-sm font-bold text-white mb-2">Alle sesjoner ({history.sessions.length})</p>
          <div className="space-y-2">
            {[...history.sessions].reverse().map((s, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-sm font-medium">
                        {format(new Date(s.date), 'EEE d. MMM yyyy', { locale: nb })}
                      </p>
                      {s.supersetGroup != null && (
                        <span className="flex items-center gap-0.5 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          <Link2 size={8} />
                          SS
                        </span>
                      )}
                    </div>
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
