'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Plus, Minus, Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

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

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensurePushSubscription(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (getNotifPermission() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const json = sub.toJSON();
    await fetch(`${SUPABASE_URL}/functions/v1/subscribe-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return true;
  } catch (_) {
    return false;
  }
}

// Write a scheduled timer row to Supabase. Returns the row id for later deletion.
async function scheduleDbTimer(fireAt: number): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase
      .from('rest_timer_scheduled')
      .insert({ user_id: session.user.id, fire_at: new Date(fireAt).toISOString() })
      .select('id')
      .single();
    if (error || !data) return null;
    return data.id as string;
  } catch (_) {
    return null;
  }
}

async function cancelDbTimer(id: string) {
  try {
    await supabase.from('rest_timer_scheduled').delete().eq('id', id);
  } catch (_) {}
}

// Fallback: post to SW for foreground/short-delay cases
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
  const [showDoneBanner, setShowDoneBanner] = useState(false);
  // Track the DB row id so we can delete it on cancel
  const dbTimerIdRef = useRef<string | null>(null);
  // Track the fireAt we last scheduled to avoid redundant reschedules
  const scheduledFireAtRef = useRef<number | null>(null);

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

  // Schedule notifications exactly once per timer start (when startedAt changes)
  useEffect(() => {
    if (!restTimer.isRunning) {
      // Timer stopped — cancel everything
      cancelSwNotification();
      if (dbTimerIdRef.current) {
        cancelDbTimer(dbTimerIdRef.current);
        dbTimerIdRef.current = null;
      }
      scheduledFireAtRef.current = null;
      return;
    }

    const remaining = getRemainingSeconds();
    if (remaining <= 0) return;
    const fireAt = restTimer.startedAt + restTimer.totalSeconds * 1000;

    // Don't reschedule if fireAt hasn't changed
    if (scheduledFireAtRef.current === fireAt) return;
    scheduledFireAtRef.current = fireAt;

    // Cancel previous DB timer if any
    if (dbTimerIdRef.current) {
      cancelDbTimer(dbTimerIdRef.current);
      dbTimerIdRef.current = null;
    }

    // SW fallback (works when app is open on Android/desktop)
    scheduleSwNotification(fireAt);

    // DB-backed server push (works when app is closed/backgrounded, cron fires every minute)
    if (getNotifPermission() === 'granted') {
      scheduleDbTimer(fireAt).then(id => {
        dbTimerIdRef.current = id;
      });
    }
  }, [restTimer.isRunning, restTimer.startedAt, restTimer.totalSeconds, getRemainingSeconds]);

  // Show permission banner on first timer start
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

  // Detect timer reaching zero while app is in foreground
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
      setShowDoneBanner(true);
      setTimeout(() => setShowDoneBanner(false), 4000);
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
          setShowDoneBanner(true);
          setTimeout(() => setShowDoneBanner(false), 4000);
        } else {
          forceUpdate(n => n + 1);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [restTimer.isRunning, getRemainingSeconds, stopRestTimer]);

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setShowPermissionBanner(false);
    if (result === 'granted') {
      await ensurePushSubscription();
      // Schedule DB timer now that we have permission
      if (restTimer.isRunning) {
        const remaining = getRemainingSeconds();
        if (remaining > 0) {
          const fireAt = restTimer.startedAt + restTimer.totalSeconds * 1000;
          if (dbTimerIdRef.current) {
            cancelDbTimer(dbTimerIdRef.current);
          }
          dbTimerIdRef.current = await scheduleDbTimer(fireAt);
        }
      }
    }
  };

  const handleStop = () => {
    cancelSwNotification();
    if (dbTimerIdRef.current) {
      cancelDbTimer(dbTimerIdRef.current);
      dbTimerIdRef.current = null;
    }
    scheduledFireAtRef.current = null;
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
      {/* Foreground done banner */}
      <AnimatePresence>
        {showDoneBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-2 bg-green-500/15 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
              <Timer size={14} className="text-green-400 shrink-0" />
              <span className="text-sm text-green-400 font-medium">Hvile ferdig! Tid for neste sett.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission banner */}
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

      {/* Timer bar */}
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
