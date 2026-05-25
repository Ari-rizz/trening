'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Plus, Minus } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function RestTimerBar() {
  const { restTimer, tickRestTimer, stopRestTimer, startRestTimer, isTourMode } = useAppStore();

  useEffect(() => {
    if (!restTimer.isRunning || isTourMode) return;
    const interval = setInterval(tickRestTimer, 1000);
    return () => clearInterval(interval);
  }, [restTimer.isRunning, tickRestTimer, isTourMode]);

  const progress = restTimer.totalSeconds > 0
    ? (restTimer.seconds / restTimer.totalSeconds) * 100
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {restTimer.isRunning && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div data-tour="rest-timer" className="mx-4 my-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer size={14} className="text-blue-400" />
                <span className="text-sm text-zinc-400">Hvile</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => startRestTimer(Math.max(10, restTimer.seconds - 15))}
                  className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <Minus size={10} className="text-zinc-400" />
                </motion.button>
                <span className="text-lg font-bold font-mono text-white w-12 text-center">
                  {formatTime(restTimer.seconds)}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => startRestTimer(restTimer.seconds + 15)}
                  className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <Plus size={10} className="text-zinc-400" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={stopRestTimer}
                  className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <X size={10} className="text-zinc-400" />
                </motion.button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
