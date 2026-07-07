'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch (_) {}
}

function vibrateDevice() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseMMSS(input: string): number {
  const trimmed = input.trim();
  if (trimmed.includes(':')) {
    const [mPart, sPart] = trimmed.split(':');
    const m = parseInt(mPart) || 0;
    const s = parseInt(sPart) || 0;
    return Math.max(1, m * 60 + s);
  }
  return Math.max(1, parseInt(trimmed) || 60);
}

interface Props {
  exerciseId: string;
  exerciseDbId: string;
  setNumber: number;
  savedDuration: number;
  isCompleted: boolean;
}

export function SetTimerControls({ exerciseId, exerciseDbId, setNumber, savedDuration, isCompleted }: Props) {
  const {
    setTimer,
    exerciseTimerPrefs,
    startSetTimer,
    pauseSetTimer,
    resumeSetTimer,
    completeSetTimer,
    setExerciseTimerPref,
    defaultRestSeconds,
    startRestTimer,
  } = useAppStore();

  const isMyTimer = setTimer.exerciseId === exerciseId && setTimer.setNumber === setNumber;

  const pref = exerciseTimerPrefs[exerciseDbId] ?? { mode: 'stopwatch' as const, countdownFrom: 60 };

  const [localMode, setLocalMode] = useState<'stopwatch' | 'countdown'>(pref.mode);
  const [countdownInput, setCountdownInput] = useState(formatMMSS(pref.countdownFrom));
  const [, forceUpdate] = useState(0);
  const doneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync local UI with prefs when idle
  useEffect(() => {
    if (!isMyTimer) {
      setLocalMode(pref.mode);
      setCountdownInput(formatMMSS(pref.countdownFrom));
    }
  }, [pref.mode, pref.countdownFrom, isMyTimer]);

  const getElapsedSeconds = useCallback((): number => {
    if (!isMyTimer) return 0;
    if (setTimer.isPaused || !setTimer.isRunning) return setTimer.accumulatedSeconds;
    return setTimer.accumulatedSeconds + Math.floor((Date.now() - setTimer.startedAt) / 1000);
  }, [isMyTimer, setTimer]);

  const getDisplaySeconds = useCallback((): number => {
    if (!isMyTimer) return 0;
    const elapsed = getElapsedSeconds();
    if (setTimer.mode === 'countdown') {
      return Math.max(0, setTimer.countdownFrom - elapsed);
    }
    return elapsed;
  }, [isMyTimer, setTimer, getElapsedSeconds]);

  // Re-render interval while running
  useEffect(() => {
    const shouldRun = isMyTimer && setTimer.isRunning && !setTimer.isPaused;
    if (shouldRun) {
      intervalRef.current = setInterval(() => forceUpdate(n => n + 1), 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMyTimer, setTimer.isRunning, setTimer.isPaused]);

  // Auto-complete countdown when reaching 0
  useEffect(() => {
    if (!isMyTimer || setTimer.mode !== 'countdown' || !setTimer.isRunning || setTimer.isPaused) {
      if (!isMyTimer) doneRef.current = false;
      return;
    }
    if (getDisplaySeconds() <= 0 && !doneRef.current) {
      doneRef.current = true;
      completeSetTimer(setTimer.countdownFrom);
      playDoneSound();
      vibrateDevice();
      startRestTimer(defaultRestSeconds);
    }
  });

  // Re-check on foreground return
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isMyTimer || !setTimer.isRunning || setTimer.isPaused) return;
      forceUpdate(n => n + 1);
      if (setTimer.mode === 'countdown' && getDisplaySeconds() <= 0 && !doneRef.current) {
        doneRef.current = true;
        completeSetTimer(setTimer.countdownFrom);
        playDoneSound();
        vibrateDevice();
        startRestTimer(defaultRestSeconds);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isMyTimer, setTimer, getDisplaySeconds, completeSetTimer, startRestTimer, defaultRestSeconds]);

  const handleModeChange = (mode: 'stopwatch' | 'countdown') => {
    setLocalMode(mode);
    const countdownSecs = parseMMSS(countdownInput);
    setExerciseTimerPref(exerciseDbId, { mode, countdownFrom: countdownSecs });
  };

  const handleCountdownBlur = () => {
    const secs = parseMMSS(countdownInput);
    setCountdownInput(formatMMSS(secs));
    setExerciseTimerPref(exerciseDbId, { mode: localMode, countdownFrom: secs });
  };

  const handleStart = () => {
    const countdownSecs = parseMMSS(countdownInput);
    setExerciseTimerPref(exerciseDbId, { mode: localMode, countdownFrom: countdownSecs });
    doneRef.current = false;
    startSetTimer(exerciseId, setNumber, localMode, countdownSecs);
  };

  const handleSave = () => {
    const elapsed = getElapsedSeconds();
    const duration = setTimer.mode === 'countdown'
      ? Math.min(elapsed, setTimer.countdownFrom)
      : elapsed;
    completeSetTimer(Math.max(1, duration));
    startRestTimer(defaultRestSeconds);
  };

  const isRunning = isMyTimer && setTimer.isRunning && !setTimer.isPaused;
  const isPaused = isMyTimer && setTimer.isRunning && setTimer.isPaused;
  const isActive = isMyTimer && setTimer.isRunning;
  const displaySeconds = getDisplaySeconds();

  const countdownProgress = isActive && setTimer.mode === 'countdown' && setTimer.countdownFrom > 0
    ? (displaySeconds / setTimer.countdownFrom) * 100
    : null;

  const isUrgent = isActive && setTimer.mode === 'countdown' && displaySeconds <= 5 && displaySeconds > 0;

  return (
    <div className="flex flex-col gap-1 py-0.5">
      {/* Mode selector — only when idle */}
      {!isActive && !isCompleted && (
        <div className="flex items-center gap-0.5 bg-zinc-800/80 rounded-lg p-0.5 w-fit">
          <button
            onClick={() => handleModeChange('stopwatch')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              localMode === 'stopwatch' ? 'bg-zinc-600 text-white' : 'text-zinc-500'
            }`}
          >
            Stopp
          </button>
          <button
            onClick={() => handleModeChange('countdown')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              localMode === 'countdown' ? 'bg-blue-500/30 text-blue-300' : 'text-zinc-500'
            }`}
          >
            Nedtell
          </button>
        </div>
      )}

      {/* Countdown target input — idle countdown mode only */}
      {!isActive && !isCompleted && localMode === 'countdown' && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={countdownInput}
            onChange={e => setCountdownInput(e.target.value)}
            onBlur={handleCountdownBlur}
            className="w-14 bg-zinc-800 text-white text-center rounded-lg py-1 text-xs font-mono font-semibold border border-zinc-700 focus:border-blue-500 focus:outline-none"
            placeholder="1:00"
          />
          <span className="text-[10px] text-zinc-600">MM:SS</span>
        </div>
      )}

      {/* Timer display when active */}
      {isActive && (
        <>
          {countdownProgress !== null && (
            <div className="h-1 bg-zinc-700 rounded-full overflow-hidden w-full">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  countdownProgress < 20 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${countdownProgress}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
          )}
          <motion.span
            key={isUrgent ? 'urgent' : 'normal'}
            animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: isUrgent ? Infinity : 0, duration: 0.5 }}
            className={`text-2xl font-bold font-mono tabular-nums leading-none ${
              isPaused
                ? 'text-zinc-500'
                : isUrgent
                ? 'text-red-400'
                : setTimer.mode === 'countdown'
                ? 'text-blue-300'
                : 'text-white'
            }`}
          >
            {formatMMSS(displaySeconds)}
          </motion.span>
        </>
      )}

      {/* Saved duration when idle */}
      {!isActive && savedDuration > 0 && (
        <span className="text-xs font-mono text-zinc-500">
          {isCompleted ? '' : 'Sist: '}{formatMMSS(savedDuration)}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {!isActive && !isCompleted && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleStart}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold"
          >
            <Play size={9} className="fill-current" />
            Start
          </motion.button>
        )}

        {isCompleted && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleStart}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 text-xs font-medium"
          >
            <RotateCcw size={9} />
            Ta om igjen
          </motion.button>
        )}

        {isRunning && (
          <>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={pauseSetTimer}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold"
            >
              <Pause size={9} className="fill-current" />
              Pause
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold"
            >
              <Square size={9} className="fill-current" />
              Lagre
            </motion.button>
          </>
        )}

        {isPaused && (
          <>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={resumeSetTimer}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold"
            >
              <Play size={9} className="fill-current" />
              Fortsett
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSave}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold"
            >
              <Square size={9} className="fill-current" />
              Lagre
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}
