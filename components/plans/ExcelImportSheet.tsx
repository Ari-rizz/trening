'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileSpreadsheet,
  ClipboardPaste,
  Upload,
  CircleAlert as AlertCircle,
  Check,
  RefreshCw,
  Dumbbell,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Tag,
  Plus,
  Search,
  Pencil,
} from 'lucide-react';
import { parsePastedText, parseWorkbook } from '@/lib/excel-import';
import { analyzeImport, saveConfirmedPlans, type AnalyzedPlan, type AnalyzedExercise } from '@/lib/ai-import';
import { supabase } from '@/lib/supabase';
import { getMuscleGroupLabel, getMuscleGroupColor } from '@/lib/exercises-data';
import type { Exercise } from '@/lib/supabase';

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onImported: () => void;
}

type Mode = 'file' | 'paste';
type Phase = 'input' | 'analyzing' | 'confirming' | 'saving' | 'done';

export function ExcelImportSheet({ open, userId, onClose, onImported }: Props) {
  const [mode, setMode] = useState<Mode>('paste');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [plans, setPlans] = useState<AnalyzedPlan[]>([]);
  const [currentPlanIdx, setCurrentPlanIdx] = useState(0);
  const [editedPlanNames, setEditedPlanNames] = useState<Record<number, string>>({});
  const [removedExercises, setRemovedExercises] = useState<Record<number, Set<number>>>({});
  const [skippedPlans, setSkippedPlans] = useState<Set<number>>(new Set());
  const [exerciseOverrides, setExerciseOverrides] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Exercise[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!searchOpen || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .or(`name.ilike.%${searchQuery.trim()}%,nicknames.cs.{${searchQuery.trim()}}`)
        .limit(20);
      setSearchResults((data as Exercise[]) ?? []);
      setSearchLoading(false);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchOpen, searchQuery]);

  const applyOverride = (originalName: string, exercise: Exercise) => {
    setExerciseOverrides(prev => ({ ...prev, [originalName]: exercise.id }));
    setSearchOpen(null);
  };

  const resetState = () => {
    setPhase('input');
    setError(null);
    setPasteText('');
    setPlans([]);
    setCurrentPlanIdx(0);
    setEditedPlanNames({});
    setRemovedExercises({});
    setSkippedPlans(new Set());
    setExerciseOverrides({});
    setSearchOpen(null);
  };

  const handleFile = async (file: File) => {
    setPhase('analyzing');
    setError(null);
    try {
      const parsed = await parseWorkbook(file);
      if (parsed.rows.length === 0) {
        setError(parsed.errors[0] ?? 'Ingen gyldige øvelser funnet i filen.');
        setPhase('input');
        return;
      }
      await runAnalysis(parsed.rows);
    } catch (err) {
      console.error('Excel import error:', err);
      setError('Kunne ikke lese filen. Sjekk at det er en gyldig Excel- eller CSV-fil.');
      setPhase('input');
    }
  };

  const handleParsePaste = async () => {
    setPhase('analyzing');
    setError(null);
    try {
      const parsed = parsePastedText(pasteText);
      if (parsed.rows.length === 0) {
        setError(parsed.errors[0] ?? 'Ingen gyldige øvelser funnet.');
        setPhase('input');
        return;
      }
      await runAnalysis(parsed.rows);
    } catch (err) {
      console.error('Paste import error:', err);
      setError('Kunne ikke tolke teksten.');
      setPhase('input');
    }
  };

  const runAnalysis = async (rows: Record<string, string | number>[]) => {
    try {
      const result = await analyzeImport(rows, userId);
      if (result.plans.length === 0) {
        setError('AI fant ingen planer i dataene. Prøv å formatere dataene tydeligere.');
        setPhase('input');
        return;
      }
      setPlans(result.plans);
      setCurrentPlanIdx(0);
      setEditedPlanNames({});
      setRemovedExercises({});
      setSkippedPlans(new Set());
      setPhase('confirming');
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.message ?? 'AI-analyse feilet. Prøv igjen.');
      setPhase('input');
    }
  };

  const toggleSkipPlan = (idx: number) => {
    setSkippedPlans(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const removeExercise = (planIdx: number, exIdx: number) => {
    setRemovedExercises(prev => {
      const next = { ...prev };
      if (!next[planIdx]) next[planIdx] = new Set();
      next[planIdx].add(exIdx);
      return next;
    });
  };

  const getVisibleExercises = (planIdx: number) => {
    const removed = removedExercises[planIdx] ?? new Set<number>();
    return (plans[planIdx]?.exercises ?? []).filter((_, i) => !removed.has(i));
  };

  const getFinalPlans = (): AnalyzedPlan[] => {
    return plans
      .map((plan, idx) => {
        if (skippedPlans.has(idx)) return null;
        const visibleExs = getVisibleExercises(idx);
        if (visibleExs.length === 0) return null;
        const exercisesWithOverrides = visibleExs.map(ex => {
          const overrideId = exerciseOverrides[ex.originalName];
          if (overrideId) {
            return { ...ex, exerciseId: overrideId, isNew: false, matchType: 'exact' as const, matchedName: ex.matchedName };
          }
          return ex;
        });
        return {
          name: editedPlanNames[idx] ?? plan.name,
          dayLabel: plan.dayLabel,
          exercises: exercisesWithOverrides,
        };
      })
      .filter((p): p is AnalyzedPlan => p !== null);
  };

  const handleConfirmPlan = () => {
    if (currentPlanIdx < plans.length - 1) {
      setCurrentPlanIdx(currentPlanIdx + 1);
    } else {
      setPhase('saving');
      handleSave();
    }
  };

  const handleGoBack = () => {
    if (currentPlanIdx > 0) {
      setCurrentPlanIdx(currentPlanIdx - 1);
    }
  };

  const handleSave = async () => {
    const finalPlans = getFinalPlans();
    if (finalPlans.length === 0) {
      setError('Ingen planer å lagre — alle er hoppet over.');
      setPhase('confirming');
      return;
    }

    setPhase('saving');
    const result = await saveConfirmedPlans(finalPlans, userId);
    if (result.success) {
      setPhase('done');
      setTimeout(() => {
        resetState();
        onImported();
        onClose();
      }, 1800);
    } else {
      setError(result.error ?? 'Noe gikk galt under lagring.');
      setPhase('confirming');
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const matchBadge = (ex: AnalyzedExercise, hasOverride = false) => {
    if (hasOverride) {
      return (
        <div className="flex items-center gap-1 text-green-400 text-[10px] font-semibold">
          <Check size={10} />
          Endret
        </div>
      );
    }
    if (ex.matchType === 'exact' || ex.matchType === 'normalized') {
      return (
        <div className="flex items-center gap-1 text-green-400 text-[10px] font-semibold">
          <Check size={10} />
          Funnet
        </div>
      );
    }
    if (ex.matchType === 'nickname' || ex.matchType === 'ai_similarity') {
      return (
        <div className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold">
          <Tag size={10} />
          {ex.matchedName ?? 'Matchet'}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-blue-400 text-[10px] font-semibold">
        <Plus size={10} />
        Ny øvelse
      </div>
    );
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
            onClick={handleClose}
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
                <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Importer fra Excel/CSV</p>
                  <p className="text-zinc-500 text-xs">AI-analyse med smart øvelsesgjenkjenning</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-400 text-sm">{error}</p>
              </div>
            )}

            {/* ===== Phase: Input ===== */}
            {phase === 'input' && (
              <>
                <div className="flex gap-2 mb-4 bg-zinc-900 rounded-xl p-1">
                  <button
                    onClick={() => setMode('paste')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                      mode === 'paste' ? 'bg-blue-500 text-white' : 'text-zinc-500'
                    }`}
                  >
                    <ClipboardPaste size={14} />
                    Lim inn
                  </button>
                  <button
                    onClick={() => setMode('file')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                      mode === 'file' ? 'bg-blue-500 text-white' : 'text-zinc-500'
                    }`}
                  >
                    <Upload size={14} />
                    Last opp fil
                  </button>
                </div>

                {mode === 'paste' && (
                  <div className="space-y-3">
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder={`Lim inn øvelser her. Støtter:\nØvelse;Sett;Reps;Vekt;Hvile\nBenkpress;3;8;80;90\nKnebøy;5;5;100;180`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 min-h-[120px] resize-none"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleParsePaste}
                      disabled={!pasteText.trim()}
                      className="w-full bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} />
                      Analyser med AI
                    </motion.button>
                  </div>
                )}

                {mode === 'file' && (
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-zinc-800 rounded-2xl py-10 px-4 text-center cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <FileSpreadsheet size={32} className="text-zinc-600 mx-auto mb-3" />
                    <p className="text-white font-medium text-sm">Trykk for å velge fil</p>
                    <p className="text-zinc-600 text-xs mt-1">Støtter .xlsx, .xls og .csv</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===== Phase: Analyzing ===== */}
            {phase === 'analyzing' && (
              <div className="flex flex-col items-center justify-center py-16">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles size={40} className="text-blue-400" />
                </motion.div>
                <p className="text-white font-semibold text-sm mt-4">AI analyserer treningsprogrammet ditt...</p>
                <p className="text-zinc-500 text-xs mt-1">Gjenkjenner øvelser og struktur</p>
              </div>
            )}

            {/* ===== Phase: Confirming ===== */}
            {phase === 'confirming' && plans.length > 0 && (
              <div className="space-y-4">
                {/* Plan count banner */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-blue-400" />
                  </div>
                  <p className="text-blue-300 text-sm font-semibold">
                    {plans.length} {plans.length === 1 ? 'plan' : 'planer'} funnet — gå gjennom hver plan under
                  </p>
                </motion.div>

                {/* Plan stepper */}
                <div className="flex items-center gap-1.5 mb-2">
                  {plans.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full flex-1 transition-colors ${
                        idx === currentPlanIdx
                          ? 'bg-blue-500'
                          : skippedPlans.has(idx)
                          ? 'bg-zinc-700'
                          : idx < currentPlanIdx
                          ? 'bg-green-500/50'
                          : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-zinc-500 text-xs text-center">
                  Plan {currentPlanIdx + 1} av {plans.length}
                </p>

                {/* Current plan card */}
                {plans[currentPlanIdx] && (
                  <motion.div
                    key={currentPlanIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedPlanNames[currentPlanIdx] ?? plans[currentPlanIdx].name}
                        onChange={e =>
                          setEditedPlanNames(prev => ({ ...prev, [currentPlanIdx]: e.target.value }))
                        }
                        placeholder="Navn på plan"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                      />
                      <button
                        onClick={() => toggleSkipPlan(currentPlanIdx)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                          skippedPlans.has(currentPlanIdx)
                            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                        }`}
                      >
                        {skippedPlans.has(currentPlanIdx) ? (
                          <>
                            <Check size={12} /> Ta med
                          </>
                        ) : (
                          <>
                            <Trash2 size={12} /> Hopp over
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
                        <p className="text-zinc-400 text-xs font-semibold">
                          {getVisibleExercises(currentPlanIdx).length} øvelser
                        </p>
                        <span className="text-zinc-600 text-[10px]">{plans[currentPlanIdx].dayLabel}</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {plans[currentPlanIdx].exercises.map((ex, exIdx) => {
                          const isRemoved = (removedExercises[currentPlanIdx] ?? new Set()).has(exIdx);
                          if (isRemoved) return null;
                          const hasOverride = !!exerciseOverrides[ex.originalName];
                          return (
                            <div
                              key={exIdx}
                              className={`flex items-center gap-2 px-4 py-2.5 text-xs border-b border-zinc-800/50 transition-colors ${
                                ex.matchType === 'ai_similarity' && !hasOverride
                                  ? 'bg-amber-500/5'
                                  : 'hover:bg-zinc-800/30'
                              }`}
                            >
                              <Dumbbell size={12} className="text-zinc-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white truncate">{ex.originalName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {matchBadge(ex, hasOverride)}
                                  {ex.isNew && !hasOverride && ex.muscleGroup && (
                                    <span className="text-zinc-600 text-[10px] capitalize">
                                      {ex.muscleGroup} · {ex.equipment}
                                    </span>
                                  )}
                                </div>
                                {ex.matchedName && ex.matchedName.toLowerCase() !== ex.originalName.toLowerCase() && !hasOverride && (
                                  <p className="text-zinc-500 text-[10px] mt-0.5 truncate">
                                    Matchet: <span className="text-zinc-400">{ex.matchedName}</span>
                                  </p>
                                )}
                              </div>
                              <span className="text-zinc-500 flex-shrink-0">
                                {ex.sets}x{ex.reps}
                                {ex.weight > 0 && ` @ ${ex.weight}kg`}
                              </span>
                              <button
                                onClick={() => setSearchOpen(ex.originalName)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-colors flex-shrink-0"
                                title="Endre øvelse"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => removeExercise(currentPlanIdx, exIdx)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                        {getVisibleExercises(currentPlanIdx).length === 0 && (
                          <div className="px-4 py-6 text-center text-zinc-600 text-xs">
                            Alle øvelser er fjernet. Hopp over denne planen.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {currentPlanIdx > 0 && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleGoBack}
                          className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm bg-zinc-800 text-zinc-300 border border-zinc-700"
                        >
                          <ChevronLeft size={16} />
                          Tilbake
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleConfirmPlan}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-blue-500 text-white"
                      >
                        {currentPlanIdx < plans.length - 1 ? (
                          <>
                            Bekreft plan {currentPlanIdx + 1} av {plans.length}
                            <ChevronRight size={16} />
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            Lagre alle planer
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ===== Phase: Saving ===== */}
            {phase === 'saving' && (
              <div className="flex flex-col items-center justify-center py-16">
                <RefreshCw size={32} className="text-blue-400 animate-spin" />
                <p className="text-white font-semibold text-sm mt-4">Lagrer planer...</p>
              </div>
            )}

            {/* ===== Exercise Search Override Modal ===== */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/70 z-[61] flex items-end justify-center"
                  onClick={() => setSearchOpen(null)}
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] max-h-[70vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-4" />
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white font-bold text-sm">Velg riktig øvelse</p>
                      <button onClick={() => setSearchOpen(null)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <X size={14} className="text-zinc-400" />
                      </button>
                    </div>
                    <p className="text-zinc-500 text-xs mb-3">
                      Søk etter øvelsen som "<span className="text-zinc-300">{searchOpen}</span>" egentlig er
                    </p>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Søk etter øvelse..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                      />
                      {searchLoading && (
                        <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 animate-spin" />
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {searchResults.length === 0 && searchQuery.trim().length >= 2 && !searchLoading && (
                        <p className="text-zinc-600 text-xs text-center py-4">Ingen resultater funnet</p>
                      )}
                      {searchResults.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => applyOverride(searchOpen, ex)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/50 transition-colors text-left"
                        >
                          <Dumbbell size={14} className="text-zinc-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{ex.name}</p>
                            <p className="text-zinc-500 text-[10px] capitalize">{getMuscleGroupLabel(ex.muscle_group)} · {ex.equipment}</p>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0"
                            style={{
                              backgroundColor: getMuscleGroupColor(ex.muscle_group) + '22',
                              color: getMuscleGroupColor(ex.muscle_group),
                            }}
                          >
                            {getMuscleGroupLabel(ex.muscle_group)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ===== Phase: Done ===== */}
            {phase === 'done' && (
              <div className="flex flex-col items-center justify-center py-16">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
                >
                  <Check size={28} className="text-green-400" />
                </motion.div>
                <p className="text-white font-semibold text-sm mt-4">Planer importert!</p>
                <p className="text-zinc-500 text-xs mt-1">{getFinalPlans().length} planer lagret</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
