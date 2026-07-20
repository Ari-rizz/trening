'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Plus, Trash2, RefreshCw, TrendingUp, Calendar, Check } from 'lucide-react';
import { Goal, GoalType } from '@/lib/supabase';
import { GOAL_TYPE_LABELS, GOAL_TYPE_UNITS } from '@/lib/goals';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGoalSheet({ open, onClose, onCreated }: Props) {
  const [type, setType] = useState<GoalType>('bench');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTargetValue('');
    setTargetDate('');
    fetchCurrentValue(type);
  }, [open, type]);

  const fetchCurrentValue = async (t: GoalType) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    if (t === 'bodyweight') {
      const { data } = await supabase
        .from('body_weight_logs')
        .select('weight_kg')
        .eq('user_id', session.user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurrentValue(data ? Number(data.weight_kg) : 0);
    } else if (t === 'frequency') {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { count } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_completed', true)
        .gte('date', since.toISOString().split('T')[0]);
      setCurrentValue(count ?? 0);
    } else {
      const exerciseNameMap: Record<string, string> = {
        bench: 'Bench Press',
        squat: 'Squat',
        deadlift: 'Deadlift',
      };
      const { data: exercise } = await supabase
        .from('exercises')
        .select('id')
        .ilike('name', exerciseNameMap[t] ?? '')
        .limit(1)
        .maybeSingle();
      if (!exercise) {
        setCurrentValue(0);
        return;
      }
      const { data } = await supabase
        .from('personal_records')
        .select('one_rep_max')
        .eq('user_id', session.user.id)
        .eq('exercise_id', exercise.id)
        .order('achieved_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setCurrentValue(data ? Number(data.one_rep_max) : 0);
    }
  };

  const handleCreate = async () => {
    const target = parseFloat(targetValue.replace(',', '.'));
    if (!target || target <= 0) {
      setError('Sett et gyldig mål');
      return;
    }
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setError('Ikke logget inn');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('goals').insert({
      user_id: session.user.id,
      type,
      target_value: target,
      current_value: currentValue,
      unit: GOAL_TYPE_UNITS[type],
      start_date: new Date().toISOString().split('T')[0],
      target_date: targetDate || null,
    });

    setLoading(false);
    if (insertError) {
      setError('Kunne ikke opprette målet');
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[59]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                  <Target size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Nytt mål</p>
                  <p className="text-zinc-500 text-xs">Sett et treningsmål</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Type selector */}
            <p className="text-zinc-400 text-xs font-semibold mb-2">Type mål</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.keys(GOAL_TYPE_LABELS) as GoalType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    type === t
                      ? 'bg-red-500 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  }`}
                >
                  {GOAL_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Current value */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
              <p className="text-zinc-500 text-xs">Nåværende verdi</p>
              <p className="text-white font-bold text-lg">
                {currentValue} {GOAL_TYPE_UNITS[type]}
              </p>
            </div>

            {/* Target value */}
            <p className="text-zinc-400 text-xs font-semibold mb-2">Målverdi</p>
            <input
              type="text"
              inputMode="decimal"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder={`F.eks. ${type === 'frequency' ? '4' : '100'}`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 mb-3"
            />

            {/* Target date */}
            <p className="text-zinc-400 text-xs font-semibold mb-2">Frist (valgfritt)</p>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-zinc-600 mb-4"
            />

            {error && (
              <p className="text-red-400 text-sm mb-3">{error}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-red-500 disabled:bg-zinc-800 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              Opprett mål
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function GoalsSection({ goals, onAdd, onDelete }: { goals: Goal[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdateProgress = async (goal: Goal, delta: number) => {
    setUpdating(goal.id);
    const newVal = Math.max(0, goal.current_value + delta);
    await supabase.from('goals').update({ current_value: newVal, updated_at: new Date().toISOString() }).eq('id', goal.id);
    setUpdating(null);
    window.location.reload();
  };

  if (goals.length === 0) {
    return (
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-white">Mål</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onAdd}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
          >
            <Plus size={18} className="text-white" />
          </motion.button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <Target size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm font-medium">Ingen mål satt</p>
          <p className="text-zinc-600 text-xs mt-1">Sett et mål for å spore fremgangen din</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-white">Mål</h2>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onAdd}
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
        >
          <Plus size={18} className="text-white" />
        </motion.button>
      </div>
      <div className="space-y-2">
        {goals.map(goal => {
          const progress = goal.target_value > 0
            ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
            : 0;
          const unit = GOAL_TYPE_UNITS[goal.type];
          return (
            <div key={goal.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-red-400" />
                  <p className="text-white font-semibold text-sm">{GOAL_TYPE_LABELS[goal.type]}</p>
                </div>
                <button
                  onClick={() => onDelete(goal.id)}
                  className="text-zinc-600 active:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-white font-bold text-2xl">{goal.current_value}<span className="text-zinc-500 text-sm font-normal ml-1">{unit}</span></p>
                <p className="text-zinc-500 text-sm mb-1">/ {goal.target_value} {unit}</p>
                <span className="ml-auto text-zinc-400 text-sm font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateProgress(goal, -1)}
                  disabled={updating === goal.id}
                  className="px-3 py-1.5 bg-zinc-800 rounded-lg text-zinc-400 text-xs font-bold disabled:opacity-50"
                >
                  -1
                </button>
                <button
                  onClick={() => handleUpdateProgress(goal, 1)}
                  disabled={updating === goal.id}
                  className="px-3 py-1.5 bg-zinc-800 rounded-lg text-zinc-400 text-xs font-bold disabled:opacity-50"
                >
                  +1
                </button>
                {goal.target_date && (
                  <span className="ml-auto flex items-center gap-1 text-zinc-500 text-xs">
                    <Calendar size={11} />
                    {new Date(goal.target_date).toLocaleDateString('nb-NO')}
                  </span>
                )}
                {progress >= 100 && (
                  <span className="ml-auto flex items-center gap-1 text-green-400 text-xs font-bold">
                    <Check size={12} />
                    Oppnådd!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
