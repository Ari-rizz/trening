'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Flame, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
}

interface DayData {
  date: string;
  calories: number;
  steps: number;
}

export function CalorieHistorySheet({ open, onClose, userId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<DayData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    supabase
      .from('daily_calorie_logs')
      .select('date, calories, steps')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(365)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped = data.map(d => ({ date: d.date, calories: Number(d.calories) || 0, steps: Number(d.steps) || 0 }));
          setDays(mapped);
          setCurrentIndex(0);
        } else {
          setDays([]);
        }
        setLoading(false);
      });
  }, [open, userId]);

  if (!mounted) return null;

  const currentDay = days[currentIndex];
  const hasPrev = currentIndex < days.length - 1;
  const hasNext = currentIndex > 0;

  const handleDragEnd = (_e: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && hasPrev) {
      setDirection(-1);
      setCurrentIndex(i => i + 1);
    } else if (info.offset.x < -threshold && hasNext) {
      setDirection(1);
      setCurrentIndex(i => i - 1);
    }
  };

  const goPrev = () => { if (hasPrev) { setDirection(-1); setCurrentIndex(i => i + 1); } };
  const goNext = () => { if (hasNext) { setDirection(1); setCurrentIndex(i => i - 1); } };

  const weeklyAvg = (() => {
    const start = Math.min(currentIndex + 6, days.length - 1);
    const slice = days.slice(currentIndex, start + 1);
    if (slice.length === 0) return 0;
    return Math.round(slice.reduce((a, d) => a + d.calories, 0) / slice.length);
  })();

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Flame size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Kalorier brent</p>
                  <p className="text-zinc-500 text-xs">Sveip for å se andre dager</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-orange-400 rounded-full animate-spin" />
              </div>
            ) : days.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Activity size={32} className="text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">Ingen kaloridata ennå</p>
                <p className="text-zinc-600 text-xs mt-1">Koble til helseappen for å se kalorier</p>
              </div>
            ) : (
              <>
                {/* Swipeable day card */}
                <div className="relative overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentDay?.date || 'empty'}
                      custom={direction}
                      initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.6}
                      onDragEnd={handleDragEnd}
                      className="bg-gradient-to-br from-orange-500/10 to-zinc-900 border border-orange-500/20 rounded-2xl p-6"
                    >
                      {/* Date navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={goPrev}
                          disabled={!hasPrev}
                          className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronLeft size={16} className="text-zinc-400" />
                        </button>
                        <p className="text-white font-semibold text-sm">
                          {currentDay ? format(parseISO(currentDay.date), 'EEEE d. MMM', { locale: nb }) : '—'}
                        </p>
                        <button
                          onClick={goNext}
                          disabled={!hasNext}
                          className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center disabled:opacity-30"
                        >
                          <ChevronRight size={16} className="text-zinc-400" />
                        </button>
                      </div>

                      {/* Big calorie number */}
                      <div className="text-center py-4">
                        <p className="text-5xl font-bold text-orange-400">
                          {currentDay ? Math.round(currentDay.calories) : 0}
                        </p>
                        <p className="text-zinc-500 text-sm mt-1">kalorier brent</p>
                        {currentDay && currentDay.steps > 0 && (
                          <p className="text-zinc-600 text-xs mt-2 flex items-center justify-center gap-1">
                            <Activity size={12} />
                            {currentDay.steps.toLocaleString('no')} skritt
                          </p>
                        )}
                      </div>

                      {/* Weekly average comparison */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800">
                        <div>
                          <p className="text-zinc-600 text-xs">7-dagers snitt</p>
                          <p className="text-zinc-300 font-semibold text-sm">{weeklyAvg} kcal</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-600 text-xs">Forskjell fra snitt</p>
                          <p className={`font-semibold text-sm ${currentDay && currentDay.calories > weeklyAvg ? 'text-green-400' : 'text-zinc-400'}`}>
                            {currentDay ? (currentDay.calories > weeklyAvg ? '+' : '') + Math.round(currentDay.calories - weeklyAvg) : 0} kcal
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Swipe hint */}
                <p className="text-center text-zinc-600 text-xs mt-3">
                  {hasPrev && 'Sveip høyre for eldre dager  ·  '}
                  {hasNext && 'Sveip venstre for nyere dager'}
                  {!hasPrev && !hasNext && 'Dette er den eneste dagen med data'}
                </p>

                {/* Mini bar chart - last 7 days */}
                {days.length > 1 && (
                  <div className="mt-6">
                    <p className="text-zinc-500 text-xs font-semibold mb-3">Siste 7 dager</p>
                    <div className="flex items-end justify-between gap-2 h-24">
                      {days.slice(0, Math.min(7, days.length)).reverse().map((d, i) => {
                        const maxCal = Math.max(...days.slice(0, Math.min(7, days.length)).map(x => x.calories), 1);
                        const heightPct = (d.calories / maxCal) * 100;
                        const isCurrent = i === Math.min(6, days.length - 1) - currentIndex;
                        return (
                          <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-full flex items-end justify-center" style={{ height: '70px' }}>
                              <div
                                className={`w-full max-w-[24px] rounded-t-md transition-all ${isCurrent ? 'bg-orange-500' : 'bg-zinc-700'}`}
                                style={{ height: `${Math.max(heightPct, 3)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-zinc-600">
                              {format(parseISO(d.date), 'EE', { locale: nb }).charAt(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
