'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, RefreshCw, Check, CircleAlert as AlertCircle, BellRing } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences, registerPushNotifications } from '@/lib/push';
import { Capacitor } from '@capacitor/core';
import {
  scheduleWeightReminder,
  cancelWeightReminder,
  scheduleWorkoutDailyReminder,
  cancelWorkoutDailyReminder,
  isNative,
} from '@/lib/native';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationSettingsSheet({ open, onClose }: Props) {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  const load = async () => {
    setLoading(true);
    const data = await getNotificationPreferences();
    setPrefs(data ?? {
      rest_timer: true,
      weight_reminder: false,
      workout_reminder: false,
      goal_reminder: false,
      reminder_time: '18:00',
      weight_reminder_time: '06:00',
      workout_reminder_time: '12:00',
    });

    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'granted') {
          setPermissionStatus('granted');
          setRegistered(true);
        } else if (perm.display === 'denied') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('unknown');
        }
      } catch {
        setPermissionStatus('unknown');
      }
    } else {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setPermissionStatus('granted');
        setRegistered(true);
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermissionStatus('denied');
      }
    }

    setLoading(false);
  };

  const handleToggle = async (key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    await updateNotificationPreferences({ [key]: value });
    if (isNative()) {
      if (key === 'weight_reminder') {
        if (value) {
          const [h, m] = (updated.weight_reminder_time ?? '06:00').split(':').map(Number);
          await scheduleWeightReminder(h, m);
        } else {
          await cancelWeightReminder();
        }
      } else if (key === 'workout_reminder') {
        if (value) {
          const [h, m] = (updated.workout_reminder_time ?? '12:00').split(':').map(Number);
          await scheduleWorkoutDailyReminder(h, m);
        } else {
          await cancelWorkoutDailyReminder();
        }
      }
    }
    setSaving(false);
  };

  const handleTimeChange = async (key: string, time: string) => {
    const updated = { ...prefs, [key]: time };
    setPrefs(updated);
    setSaving(true);
    await updateNotificationPreferences({ [key]: time });
    if (isNative()) {
      const [h, m] = time.split(':').map(Number);
      if (key === 'weight_reminder_time' && updated.weight_reminder) {
        await cancelWeightReminder();
        await scheduleWeightReminder(h, m);
      } else if (key === 'workout_reminder_time' && updated.workout_reminder) {
        await cancelWorkoutDailyReminder();
        await scheduleWorkoutDailyReminder(h, m);
      }
    }
    setSaving(false);
  };

  const handleRegister = async () => {
    setRegistering(true);
    const ok = await registerPushNotifications();
    setRegistered(ok);
    setPermissionStatus(ok ? 'granted' : 'denied');
    setRegistering(false);
  };

  const toggles = [
    { key: 'rest_timer', label: 'Hviletids-timer', desc: 'Varsler når hviletiden er ferdig' },
    { key: 'weight_reminder', label: 'Vektpåminnelse', desc: 'Påminnelse om å logge vekten' },
    { key: 'workout_reminder', label: 'Øktpåminnelse', desc: 'Motivasjonsmelding hvis du ikke har trent' },
    { key: 'goal_reminder', label: 'Målpåminnelse', desc: 'Påminnelse om målfrist' },
  ];

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
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Bell size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Varsler</p>
                  <p className="text-zinc-500 text-xs">Bestem hva du vil varsles om</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {loading ? (
              <div className="h-40 bg-zinc-900 rounded-2xl animate-pulse" />
            ) : (
              <>
                {/* Permission status banner */}
                {permissionStatus === 'granted' && (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-4">
                    <Check size={14} className="text-green-400" />
                    <p className="text-green-400 text-sm">Varsler er aktivert</p>
                  </div>
                )}
                {permissionStatus === 'denied' && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                      <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-400 text-sm">
                        Varsler er slått av i telefonens innstillinger. Slå dem på for å motta påminnelser.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleRegister}
                      disabled={registering}
                      className="w-full bg-blue-500 disabled:bg-zinc-800 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      {registering ? <RefreshCw size={16} className="animate-spin" /> : <BellRing size={16} />}
                      Slå på varsler
                    </motion.button>
                  </div>
                )}
                {permissionStatus === 'unknown' && !registered && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full bg-blue-500 disabled:bg-zinc-800 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-4"
                  >
                    {registering ? <RefreshCw size={16} className="animate-spin" /> : <Bell size={16} />}
                    Aktiver push-varsler
                  </motion.button>
                )}

                <div className="space-y-2 mb-4">
                  {toggles.map(t => (
                    <div key={t.key} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{t.label}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">{t.desc}</p>
                      </div>
                      <button
                        onClick={() => handleToggle(t.key, !prefs[t.key])}
                        className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
                          prefs[t.key] ? 'bg-blue-500' : 'bg-zinc-700'
                        }`}
                      >
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-5 h-5 bg-white rounded-full absolute top-1 ${
                            prefs[t.key] ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Separate time pickers */}
                {prefs.weight_reminder && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
                    <p className="text-zinc-400 text-xs font-semibold mb-2">Tid for vektpåminnelse</p>
                    <input
                      type="time"
                      value={prefs.weight_reminder_time ?? '06:00'}
                      onChange={e => handleTimeChange('weight_reminder_time', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                )}

                {prefs.workout_reminder && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
                    <p className="text-zinc-400 text-xs font-semibold mb-2">Tid for øktpåminnelse</p>
                    <input
                      type="time"
                      value={prefs.workout_reminder_time ?? '12:00'}
                      onChange={e => handleTimeChange('workout_reminder_time', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                )}

                {prefs.goal_reminder && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-3">
                    <p className="text-zinc-400 text-xs font-semibold mb-2">Tid for målpåminnelse</p>
                    <input
                      type="time"
                      value={prefs.reminder_time ?? '18:00'}
                      onChange={e => handleTimeChange('reminder_time', e.target.value)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                    />
                  </div>
                )}

                <p className="text-zinc-600 text-xs text-center mt-2">
                  Du kan alltid slå varselet av eller på her når som helst
                </p>

                {saving && (
                  <p className="text-zinc-500 text-xs text-center mt-2">Lagrer...</p>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
