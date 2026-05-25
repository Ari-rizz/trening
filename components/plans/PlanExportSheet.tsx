'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Check, ChevronRight, Printer } from 'lucide-react';
import { supabase, WorkoutTemplate } from '@/lib/supabase';
import { getMuscleGroupLabel } from '@/lib/exercises-data';

type LastSessionData = Record<string, Array<{ weight: number; reps: number; rpe: number }>>;

interface Props {
  open: boolean;
  templates: WorkoutTemplate[];
  userName?: string;
  userId?: string | null;
  onClose: () => void;
}

function PlanPrintView({ templates, userName, lastSessionData }: { templates: WorkoutTemplate[]; userName: string; lastSessionData: LastSessionData }) {
  const today = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      id="plan-print-root"
      style={{
        display: 'none',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        background: '#fff',
        color: '#111',
        padding: '0',
      }}
    >
      {/* Cover */}
      <div style={{ borderBottom: '3px solid #111', paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
          Treningsprogrammer
        </div>
        {userName && (
          <div style={{ fontSize: 14, color: '#555', marginBottom: 2 }}>{userName}</div>
        )}
        <div style={{ fontSize: 12, color: '#888' }}>{today}</div>
      </div>

      {/* Plans */}
      {templates.map((t, ti) => {
        const exs = (t.template_exercises ?? []).sort((a, b) => a.order_index - b.order_index);
        return (
          <div key={t.id} style={{ pageBreakInside: 'avoid', marginBottom: 40 }}>
            {/* Plan header */}
            <div
              style={{
                background: '#f4f4f4',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: '#111',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {ti + 1}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</div>
                {t.description && (
                  <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{t.description}</div>
                )}
              </div>
            </div>

            {/* Exercises table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Øvelse</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Muskel</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Sett</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Reps</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Vekt (kg)</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#c97a00', fontWeight: 600 }}>Varmup</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Siste økt</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555', fontWeight: 600 }}>Notat</th>
                </tr>
              </thead>
              <tbody>
                {exs.map((ex, ei) => {
                  const exercise = (ex as any).exercises;
                  const lastSets = lastSessionData[ex.exercise_id];
                  const lastSummary = lastSets
                    ? lastSets.map(s => `${s.weight}kg x${s.reps}`).join(', ')
                    : '—';
                  return (
                    <tr
                      key={ex.id ?? ei}
                      style={{ borderBottom: '1px solid #f0f0f0', background: ei % 2 === 0 ? '#fff' : '#fafafa' }}
                    >
                      <td style={{ padding: '7px 8px', fontWeight: 600 }}>{exercise?.name ?? '—'}</td>
                      <td style={{ padding: '7px 8px', color: '#555' }}>
                        {exercise?.muscle_group ? getMuscleGroupLabel(exercise.muscle_group) : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>{ex.target_sets}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>{ex.target_reps}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                        {ex.target_weight_kg > 0 ? ex.target_weight_kg : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'center', color: '#c97a00', fontWeight: 600 }}>
                        {(ex as any).warmup_sets > 0 ? (ex as any).warmup_sets : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', color: '#0066cc', fontSize: 11 }}>{lastSummary}</td>
                      <td style={{ padding: '7px 8px', color: '#777', fontSize: 11 }}>{ex.notes || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 12, marginTop: 8, fontSize: 10, color: '#aaa', textAlign: 'center' }}>
        Generert fra IronGrid &bull; {today}
      </div>
    </div>
  );
}

export function PlanExportSheet({ open, templates, userName, userId, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'all' | 'pick'>('all');
  const [lastSessionData, setLastSessionData] = useState<LastSessionData>({});
  const [loadingData, setLoadingData] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setMode('all');
      return;
    }
    if (userId) fetchLastSessions(userId);
  }, [open, userId]);

  const fetchLastSessions = async (uid: string) => {
    setLoadingData(true);
    const allExerciseIds = templates
      .flatMap(t => t.template_exercises ?? [])
      .map(te => te.exercise_id);
    const uniqueIds = Array.from(new Set(allExerciseIds));

    const result: LastSessionData = {};
    for (const exId of uniqueIds) {
      const { data } = await supabase
        .from('workout_exercises')
        .select(`
          workout_sets(set_number, weight_kg, reps, rpe, is_completed),
          workouts!inner(user_id, is_completed)
        `)
        .eq('exercise_id', exId)
        .eq('workouts.user_id', uid)
        .eq('workouts.is_completed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const sets = (data[0].workout_sets ?? [])
          .filter((s: any) => s.is_completed)
          .sort((a: any, b: any) => a.set_number - b.set_number)
          .map((s: any) => ({ weight: s.weight_kg ?? 0, reps: s.reps ?? 0, rpe: s.rpe ?? 0 }));
        if (sets.length > 0) result[exId] = sets;
      }
    }
    setLastSessionData(result);
    setLoadingData(false);
  };

  const activeTemplates = mode === 'all' ? templates : templates.filter(t => selected.has(t.id));

  const handlePrint = () => {
    if (activeTemplates.length === 0) return;
    const el = document.getElementById('plan-print-root');
    if (el) {
      el.style.display = 'block';
      window.print();
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }
  };

  const toggleTemplate = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!open) return null;

  return createPortal(
    <>
      <PlanPrintView templates={activeTemplates} userName={userName ?? ''} lastSessionData={lastSessionData} />

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
            style={{ maxHeight: '85vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Eksporter til PDF</h3>
                <p className="text-zinc-500 text-xs mt-0.5">Velg planer og generer PDF</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <X size={16} className="text-zinc-400" />
              </motion.button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 px-5 pt-4 flex-shrink-0">
              {(['all', 'pick'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    mode === m
                      ? 'bg-zinc-100 text-black'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  }`}
                >
                  {m === 'all' ? 'Alle planer' : 'Velg planer'}
                </button>
              ))}
            </div>

            {/* Plan list (only in pick mode) */}
            {mode === 'pick' && (
              <div className="flex-1 overflow-y-auto px-5 pt-3 pb-2 space-y-2">
                {templates.length === 0 && (
                  <p className="text-zinc-600 text-sm text-center py-6">Ingen planer funnet</p>
                )}
                {templates.map(t => {
                  const isChecked = selected.has(t.id);
                  return (
                    <motion.button
                      key={t.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleTemplate(t.id)}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left border transition-colors ${
                        isChecked
                          ? 'bg-zinc-800 border-zinc-600'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked ? 'bg-white border-white' : 'border-zinc-600'
                      }`}>
                        {isChecked && <Check size={12} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{t.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {(t.template_exercises ?? []).length} øvelser
                          {t.description ? ` · ${t.description}` : ''}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {mode === 'all' && (
              <div className="flex-1 px-5 pt-4 pb-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{templates.length} {templates.length === 1 ? 'plan' : 'planer'}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">Alle planene dine inkluderes i PDF-en</p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate button */}
            <div className="px-5 pb-8 pt-3 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePrint}
                disabled={(mode === 'pick' && selected.size === 0) || loadingData}
                className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-black font-bold py-4 rounded-2xl text-sm disabled:opacity-40"
              >
                <Printer size={16} />
                {loadingData
                  ? 'Henter data...'
                  : mode === 'all'
                  ? `Generer PDF (${templates.length} ${templates.length === 1 ? 'plan' : 'planer'})`
                  : `Generer PDF (${selected.size} ${selected.size === 1 ? 'plan' : 'planer'} valgt)`
                }
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
