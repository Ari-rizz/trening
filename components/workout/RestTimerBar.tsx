'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Plus, Minus, Bell } from 'lucide-react';
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

function getNotifPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

async function scheduleSwNotification(fireAt: number) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'SCHEDULE_NOTIFICATION', fireAt });
  } catch (_) {}
}

async function cancelSwNotification() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'CANCEL_NOTIFICATION' });
  } catch (_) {}
}

export function RestTimerBar() {
  const { restTimer, stopRestTimer, startRestTimer, isTourMode } = useAppStore();
  const [, forceUpdate] = useState(0);
  const doneRef = useRef(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  // Track permission in a ref so effects always see the current value without stale closure issues
  const permissionRef = useRef<NotificationPermission>('default');
  const [, setPermissionVersion] = useState(0);

  useEffect(() => {
    permissionRef.current = getNotifPermission();
    setPermissionVersion(v => v + 1);
  }, []);

  // Re-render every 500ms for smooth countdown
  useEffect(() => {
    if (!restTimer.isRunning || isTourMode) return;
    const id = setInterval(() => forceUpdate(n => n + 1), 500);
    return () => clearInterval(id);
  }, [restTimer.isRunning, isTourMode]);

  const getRemainingSeconds = useCallback(() => {
    if (!restTimer.isRunning) return restTimer.seconds;
    const elapsed = Math.floor((Date.now() - restTimer.startedAt) / 1000);
    return Math.max(0, restTimer.totalSeconds - elapsed);
  }, [restTimer]);

  // Detect timer reaching 0 while app is open
  useEffect(() => {
    if (!restTimer.isRunning || isTourMode) {
      doneRef.current = false;
      return;
    }
    const remaining = getRemainingSeconds();
    if (remaining <= 0 && !doneRef.current) {
      doneRef.current = true;
      stopRestTimer();
      playDoneSound();
      vibrateDevice();
    }
  });

  // Re-sync when app comes back to foreground
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && restTimer.isRunning) {
        const remaining = getRemainingSeconds();
        if (remaining <= 0) {
          stopRestTimer();
          playDoneSound();
          vibrateDevice();
        } else {
          forceUpdate(n => n + 1);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [restTimer.isRunning, getRemainingSeconds, stopRestTimer]);

  // Schedule SW notification when timer starts/changes — reads permission directly
  useEffect(() => {
    if (restTimer.isRunning) {
      const perm = getNotifPermission();
      if (perm !== 'granted') return;
      const remaining = getRemainingSeconds();
      if (remaining <= 0) return;
      scheduleSwNotification(Date.now() + remaining * 1000);
    } else {
      cancelSwNotification();
    }
  }, [restTimer.isRunning, restTimer.startedAt, getRemainingSeconds]);

  // Show permission banner on first timer start if not yet decided
  useEffect(() => {
    if (
      restTimer.isRunning &&
      getNotifPermission() === 'default' &&
      typeof window !== 'undefined' &&
      'Notification' in window
    ) {
      setShowPermissionBanner(true);
    }
  }, [restTimer.isRunning]);

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    setPermissionVersion(v => v + 1);
    setShowPermissionBanner(false);

    if (result === 'granted' && restTimer.isRunning) {
      const remaining = getRemainingSeconds();
      if (remaining > 0) {
        scheduleSwNotification(Date.now() + remaining * 1000);
      }
    }
  };

  const handleStop = () => {
    cancelSwNotification();
    stopRestTimer();
  };

  const handleAdjust = (delta: number) => {
    const remaining = getRemainingSeconds();
    startRestTimer(Math.max(10, remaining + delta));
  };

  const remaining = getRemainingSeconds();
  const progress = restTimer.totalSeconds > 0
    ? (remaining / restTimer.totalSeconds) * 100
    : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <>
      <AnimatePresence>
        {showPermissionBanner && restTimer.isRunning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Bell size={14} className="text-blue-400 shrink-0" />
                <span className="text-xs text-zinc-400 leading-tight">Varsling nar hvilen er ferdig?</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowPermissionBanner(false)}
                  className="text-xs text-zinc-500 px-2 py-1"
                >
                  Nei
                </button>
                <button
                  onClick={handleAllowNotifications}
                  className="text-xs text-blue-400 font-medium bg-blue-400/10 px-3 py-1 rounded-lg"
                >
                  Tillat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    onClick={() => handleAdjust(-15)}
                    className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                  >
                    <Minus size={10} className="text-zinc-400" />
                  </motion.button>
                  <span className="text-lg font-bold font-mono text-white w-12 text-center">
                    {formatTime(remaining)}
                  </span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleAdjust(15)}
                    className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                  >
                    <Plus size={10} className="text-zinc-400" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleStop}
                    className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center"
                  >
                    <X size={10} className="text-zinc-400" />
                  </motion.button>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
