'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Plus, Minus, Bell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

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

// ---------------------------------------------------------------------------
// Service-worker local notifications (fallback / Android fast path)
// ---------------------------------------------------------------------------

let restTimerSwReg: ServiceWorkerRegistration | null = null;

async function getRestTimerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!isStandalonePWA()) return null;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  if (restTimerSwReg) return restTimerSwReg;
  try {
    restTimerSwReg = await navigator.serviceWorker.register('/rest-timer-sw.js', { scope: '/' });
    return restTimerSwReg;
  } catch (_) {
    return null;
  }
}

async function scheduleSwNotification(fireAt: number) {
  if (!isStandalonePWA()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await getRestTimerSW();
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

// ---------------------------------------------------------------------------
// Web Push subscription helpers
// ---------------------------------------------------------------------------

function b64urlToUint8(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64.length + (4 - (b64.length % 4)) % 4, '='
  );
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64urlToUint8(VAPID_PUBLIC_KEY),
      });
    }
    return sub;
  } catch (_) {
    return null;
  }
}

async function savePushSubscription(sub: PushSubscription) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const keys = sub.toJSON().keys as { p256dh: string; auth: string };
  await fetch(`${SUPABASE_URL}/functions/v1/subscribe-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      Apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ endpoint: sub.endpoint, keys }),
  });
}

// ---------------------------------------------------------------------------
// Server-push scheduling
// ---------------------------------------------------------------------------

async function scheduleServerNotification(fireAt: number) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${SUPABASE_URL}/functions/v1/send-rest-timer-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ fireAt }),
    });
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RestTimerBar() {
  const { restTimer, stopRestTimer, startRestTimer, isTourMode } = useAppStore();
  const [, forceUpdate] = useState(0);
  const doneRef = useRef(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  // true once we've successfully saved a push subscription to the server
  const pushSubscribedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
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

  // Detect timer reaching 0
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

  // Schedule / cancel notifications when timer state changes
  useEffect(() => {
    if (!isStandalonePWA()) return;
    if (restTimer.isRunning && notifPermission === 'granted') {
      const remaining = getRemainingSeconds();
      if (remaining <= 0) return;
      const fireAt = Date.now() + remaining * 1000;
      // Always schedule SW as immediate fallback (works well on Android)
      scheduleSwNotification(fireAt);
      // Also schedule server-push if we have a push subscription (iOS reliable path)
      if (pushSubscribedRef.current) {
        scheduleServerNotification(fireAt);
      }
    } else if (!restTimer.isRunning) {
      cancelSwNotification();
    }
  }, [restTimer.isRunning, restTimer.startedAt, notifPermission, getRemainingSeconds]);

  // Show permission banner on first timer start (PWA only)
  useEffect(() => {
    if (restTimer.isRunning && isStandalonePWA() && notifPermission === 'default') {
      setShowPermissionBanner(true);
    }
  }, [restTimer.isRunning, notifPermission]);

  const handleAllowNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    setShowPermissionBanner(false);

    if (result === 'granted') {
      // Register push subscription and save to server
      const sub = await getOrCreatePushSubscription();
      if (sub) {
        await savePushSubscription(sub);
        pushSubscribedRef.current = true;
      }

      if (restTimer.isRunning) {
        const remaining = getRemainingSeconds();
        if (remaining > 0) {
          const fireAt = Date.now() + remaining * 1000;
          scheduleSwNotification(fireAt);
          if (pushSubscribedRef.current) scheduleServerNotification(fireAt);
        }
      }
    }
  };

  // On mount, sync any existing browser push subscription to the server.
  // Covers users who granted permission before the push_subscriptions table existed.
  useEffect(() => {
    if (!isStandalonePWA()) return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(async (sub) => {
        if (!sub) return;
        pushSubscribedRef.current = true;
        // Always upsert to ensure the row exists in the database
        await savePushSubscription(sub);
      });
    }).catch(() => {});
  }, []);

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
                <span className="text-xs text-zinc-400 leading-tight">Varsling når hvilen er ferdig?</span>
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
