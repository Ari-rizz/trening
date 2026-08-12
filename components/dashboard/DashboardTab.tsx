'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Dumbbell, TrendingUp, Calendar, Trophy, ChartBar as BarChart2, ChevronRight, Play, Zap, Scale, Heart, ChevronDown, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { Workout } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { StartWorkoutSheet } from '@/components/workout/StartWorkoutSheet';
import { WeightLogModal } from './WeightLogModal';
import { MuscleMap } from './MuscleMap';
import { CalorieHistorySheet } from './CalorieHistorySheet';
import { WorkoutCalendarSheet } from './WorkoutCalendarSheet';
import { getHealthConnection, getTodayCaloriesFromDB, syncCaloriesToDatabase } from '@/lib/health';
import { getRegionsForExercise } from '@/lib/muscle-regions';
import { format, startOfWeek, endOfWeek, isThisWeek, subDays, differenceInDays } from 'date-fns';
import { nb } from 'date-fns/locale';

interface DashboardStats {
  weekSessions: number;
  weekVolume: number;
  totalSessions: number;
  streak: number;
  topMuscleGroup: string | null;
  weekMuscles: string[];
  weekRegions: string[];
  recentWorkouts: Workout[];
  prs: Array<{ exercise_name: string; weight_kg: number; reps: number; one_rep_max: number; achieved_at: string }>;
}

export function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats>({
    weekSessions: 0,
    weekVolume: 0,
    totalSessions: 0,
    streak: 0,
    topMuscleGroup: null,
    weekMuscles: [],
    weekRegions: [],
    recentWorkouts: [],
    prs: [],
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeWorkout, setCurrentTab, isTourMode } = useAppStore();

  const [showStartSheet, setShowStartSheet] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [todayCalories, setTodayCalories] = useState<number | null>(null);
  const [healthConnected, setHealthConnected] = useState(false);
  const [caloriesRefreshing, setCaloriesRefreshing] = useState(false);
  const [showCalorieSheet, setShowCalorieSheet] = useState(false);
  const [showCalendarSheet, setShowCalendarSheet] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MOCK_STATS: DashboardStats = {
    weekSessions: 3,
    weekVolume: 4820,
    totalSessions: 24,
    streak: 5,
    topMuscleGroup: 'chest',
    weekMuscles: ['chest', 'shoulders', 'triceps', 'back', 'glutes'],
    weekRegions: ['chest_middle', 'shoulders_front', 'shoulders_side', 'triceps', 'back_lats', 'back_upper', 'legs_glutes', 'legs_quads'],
    recentWorkouts: [],
    prs: [
      { exercise_name: 'Benkpress', weight_kg: 90, reps: 5, one_rep_max: 101, achieved_at: new Date().toISOString() },
      { exercise_name: 'Markløft', weight_kg: 140, reps: 3, one_rep_max: 151, achieved_at: new Date().toISOString() },
    ],
  };

  useEffect(() => {
    if (isTourMode) {
      setStats(MOCK_STATS);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        fetchStats(uid);
        fetchTodayWeight(uid);
        fetchHealthData(uid);
      } else {
        setLoading(false);
      }
    });
  }, [isTourMode]);

  // Auto-refresh when a workout is saved (online or synced from offline)
  useEffect(() => {
    const handler = () => {
      if (userId) {
        fetchStats(userId);
        fetchTodayWeight(userId);
      }
    };
    window.addEventListener('workout-saved', handler);
    window.addEventListener('offline-sync-complete', handler);
    return () => {
      window.removeEventListener('workout-saved', handler);
      window.removeEventListener('offline-sync-complete', handler);
    };
  }, [userId]);

  const fetchHealthData = async (uid: string) => {
    const conn = await getHealthConnection(uid);
    setHealthConnected(conn.connected);
    if (conn.connected) {
      await syncCaloriesToDatabase(uid);
      const cal = await getTodayCaloriesFromDB(uid);
      setTodayCalories(cal);
    }
  };

  const refreshCalories = useCallback(async (uid: string) => {
    setCaloriesRefreshing(true);
    try {
      await syncCaloriesToDatabase(uid);
      const cal = await getTodayCaloriesFromDB(uid);
      setTodayCalories(cal);
    } catch {
      // best-effort
    } finally {
      setCaloriesRefreshing(false);
    }
  }, []);

  // Re-sync calories every 5 minutes while the dashboard is open
  useEffect(() => {
    if (!userId || !healthConnected || !Capacitor.isNativePlatform()) return;
    syncIntervalRef.current = setInterval(() => {
      refreshCalories(userId);
    }, 5 * 60 * 1000);
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    };
  }, [userId, healthConnected, refreshCalories]);

  // Re-sync when the app returns to the foreground
  useEffect(() => {
    if (!userId || !healthConnected || !Capacitor.isNativePlatform()) return;
    let listener: (() => void) | null = null;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) refreshCalories(userId!);
        });
        listener = () => handle.remove();
      } catch {
        // not available
      }
    })();
    return () => { if (listener) listener(); };
  }, [userId, healthConnected, refreshCalories]);

  const fetchTodayWeight = async (uid: string) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .eq('user_id', uid)
      .eq('logged_at', today)
      .maybeSingle();
    setTodayWeight(data?.weight_kg ?? null);
  };

  const fetchStats = async (uid: string) => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: workouts } = await supabase
        .from('workouts')
        .select('*, workout_exercises(exercise_id)')
        .eq('user_id', uid)
        .eq('is_completed', true)
        .order('date', { ascending: false })
        .limit(50);

      const ws = workouts ?? [];
      const weekWorkouts = ws.filter(w => {
        const d = new Date(w.date);
        return d >= weekStart && d <= weekEnd;
      });

      const weekVolume = weekWorkouts.reduce((a, w) => a + (w.total_volume_kg ?? 0), 0);

      // Calculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const day = subDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const hasWorkout = ws.some(w => format(new Date(w.date), 'yyyy-MM-dd') === dayStr);
        if (hasWorkout) streak++;
        else if (i > 0) break;
      }

      const weekMusclesSet = new Set<string>();
      const weekRegionsSet = new Set<string>();
      if (weekWorkouts.length > 0) {
        const weekWorkoutIds = weekWorkouts.map(w => w.id);
        const { data: muscleData } = await supabase
          .from('workout_exercises')
          .select('exercises(muscle_group, name, activation_regions)')
          .in('workout_id', weekWorkoutIds);
        for (const row of muscleData ?? []) {
          const ex = row.exercises as any;
          if (!ex) continue;
          if (ex.muscle_group) weekMusclesSet.add(ex.muscle_group);
          const regions = getRegionsForExercise(ex.muscle_group, ex.name, ex.activation_regions);
          for (const { region } of regions) {
            weekRegionsSet.add(region);
          }
        }
      }

      const { data: prsData } = await supabase
        .from('personal_records')
        .select('*, exercises(name)')
        .eq('user_id', uid)
        .order('achieved_at', { ascending: false })
        .limit(5);

      const prs = (prsData ?? []).map(pr => ({
        exercise_name: (pr.exercises as any)?.name ?? 'Ukjent',
        weight_kg: pr.weight_kg,
        reps: pr.reps,
        one_rep_max: pr.one_rep_max,
        achieved_at: pr.achieved_at,
      }));

      setStats({
        weekSessions: weekWorkouts.length,
        weekVolume: Math.round(weekVolume),
        totalSessions: ws.length,
        streak,
        topMuscleGroup: null,
        weekMuscles: Array.from(weekMusclesSet),
        weekRegions: Array.from(weekRegionsSet),
        recentWorkouts: ws.slice(0, 5),
        prs,
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const weekDays = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1;

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+8rem)]">
      {/* Greeting */}
      <div className="px-4 pt-5 pb-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-zinc-500 text-sm">God {getTimeGreeting()}</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Dashboard</h1>
          <p className="text-zinc-600 text-xs mt-0.5">Oversikt over treningen din</p>
        </motion.div>
      </div>

      {/* Muscle map */}
      <div className="px-4 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 font-medium mb-1">Muskelaktivitet denne uken</p>
          <MuscleMap
            trainedMuscles={isTourMode ? MOCK_STATS.weekMuscles : stats.weekMuscles}
            trainedRegions={isTourMode ? MOCK_STATS.weekRegions : stats.weekRegions}
          />
        </div>
      </div>

      {/* Active workout banner */}
      {activeWorkout && !isTourMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mb-4 bg-red-500/10 border border-red-500/40 rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-red-400 text-xs font-medium mb-0.5">AKTIV ØKT</p>
            <p className="text-white font-bold">{activeWorkout.name}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentTab('workout')}
            className="bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            Fortsett
          </motion.button>
        </motion.div>
      )}

      {/* Week calendar */}
      <div className="px-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => userId && setShowCalendarSheet(true)}
          className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 p-4 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 font-medium">Denne uken</p>
            {userId && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                Se alle
                <ChevronDown size={11} className="-rotate-90" />
              </span>
            )}
          </div>
          <div className="flex justify-between">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-zinc-600">{day}</span>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i === adjustedToday
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-800 text-zinc-600'
                  }`}
                >
                  {i < adjustedToday ? (
                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  ) : i === adjustedToday ? (
                    <Flame size={14} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.button>
      </div>

      {/* Weight log button */}
      {userId && !isTourMode && (
        <div className="px-4 mb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowWeightModal(true)}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors ${
              todayWeight !== null
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            <Scale size={20} />
            {todayWeight !== null
              ? `${String(todayWeight).replace('.', ',')} kg registrert`
              : 'Legg inn vekt'}
          </motion.button>
        </div>
      )}

      {/* Stats grid */}
      <div data-tour="stats-grid" className="px-4 grid grid-cols-2 gap-3 mb-4">
        <StatCard
          icon={<Dumbbell size={18} className="text-red-400" />}
          label="Økter denne uken"
          value={stats.weekSessions.toString()}
          sub="treninger"
          color="red"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-blue-400" />}
          label="Ukesvolum"
          value={stats.weekVolume >= 1000 ? `${(stats.weekVolume / 1000).toFixed(1)}t` : stats.weekVolume.toString()}
          sub="kg løftet"
          color="blue"
        />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            if (healthConnected) {
              if (userId) refreshCalories(userId);
              setShowCalorieSheet(true);
            } else {
              setCurrentTab('profile');
            }
          }}
          className={`rounded-2xl border p-4 text-left ${healthConnected ? 'bg-orange-500/10 border-orange-500/20' : 'bg-zinc-900 border-zinc-800'}`}
        >
          <div className="mb-2 flex items-center justify-between">
            {healthConnected
              ? <Flame size={18} className="text-orange-400" />
              : <Heart size={18} className="text-zinc-500" />}
            {healthConnected && caloriesRefreshing && (
              <RefreshCw size={14} className="text-orange-400 animate-spin" />
            )}
          </div>
          <p className="text-2xl font-bold text-white">
            {healthConnected ? (todayCalories ?? 0) : '—'}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{healthConnected ? 'kcal i dag' : 'koble til helse'}</p>
          <p className="text-xs text-zinc-600 mt-1">{healthConnected ? 'Kalorier brent' : 'for å se kalorier'}</p>
        </motion.button>
        <StatCard
          icon={<BarChart2 size={18} className="text-green-400" />}
          label="Totalt"
          value={stats.totalSessions.toString()}
          sub="treninger"
          color="green"
        />
      </div>

      {/* Quick start */}
      {!activeWorkout && (
        <div className="px-4 mb-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStartSheet(true)}
            className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
          >
            <Play size={20} className="fill-current" />
            Start ny økt
          </motion.button>
        </div>
      )}

      {/* PRs */}
      {stats.prs.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Trophy size={14} className="text-yellow-400" /> Personlige rekorder
            </h3>
          </div>
          <div className="space-y-2">
            {stats.prs.map((pr, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white text-sm font-semibold">{pr.exercise_name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {pr.weight_kg}kg × {pr.reps} reps
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-sm">{Math.round(pr.one_rep_max)}kg</p>
                  <p className="text-xs text-zinc-600">1RM</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent workouts */}
      {stats.recentWorkouts.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Calendar size={14} className="text-zinc-400" /> Nylige økter
            </h3>
            <button onClick={() => setCurrentTab('history')} className="text-xs text-red-400 font-medium">
              Se alle
            </button>
          </div>
          <div className="space-y-2">
            {stats.recentWorkouts.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white text-sm font-semibold">{w.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {format(new Date(w.date), 'EEE d. MMM', { locale: nb })} · {formatDuration(w.duration_seconds)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-300 font-bold text-sm">{Math.round(w.total_volume_kg ?? 0)}kg</p>
                  <p className="text-xs text-zinc-600">volum</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!loading && !isTourMode && stats.totalSessions === 0 && !userId && (
        <div className="px-4 text-center py-8">
          <Zap size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Logg inn for å se din statistikk</p>
        </div>
      )}

      {!loading && !isTourMode && stats.totalSessions === 0 && userId && (
        <div className="px-4 text-center py-8">
          <Dumbbell size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Fullfør din første økt for å se statistikk</p>
        </div>
      )}

      <StartWorkoutSheet open={showStartSheet} onClose={() => setShowStartSheet(false)} />

      {userId && (
        <WorkoutCalendarSheet
          open={showCalendarSheet}
          onClose={() => setShowCalendarSheet(false)}
          userId={userId}
        />
      )}

      {userId && healthConnected && (
        <CalorieHistorySheet
          open={showCalorieSheet}
          onClose={() => setShowCalorieSheet(false)}
          userId={userId}
        />
      )}

      {userId && (
        <WeightLogModal
          open={showWeightModal}
          userId={userId}
          onClose={() => setShowWeightModal(false)}
          onSaved={(w) => setTodayWeight(w)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500/10 border-red-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
    green: 'bg-green-500/10 border-green-500/20',
  };

  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color] ?? 'bg-zinc-900 border-zinc-800'}`}>
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
      <p className="text-xs text-zinc-600 mt-1">{label}</p>
    </div>
  );
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'morgen';
  if (hour < 12) return 'formiddag';
  if (hour < 17) return 'ettermiddag';
  return 'kveld';
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}t ${rem}min`;
}
