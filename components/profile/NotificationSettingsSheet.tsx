'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, RefreshCw, Check } from 'lucide-react';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/push';
import { registerPushNotifications } from '@/lib/push';

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
    });
    setLoading(false);
  };

  const handleToggle = async (key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(true);
    await updateNotificationPreferences({ [key]: value });
    setSaving(false);
  };

  const handleTimeChange = async (time: string) => {
    const updated = { ...prefs, reminder_time: time };
    setPrefs(updated);
    setSaving(true);
    await updateNotificationPreferences({ reminder_time: time });
    setSaving(false);
  };

  const handleRegister = async () => {
    setRegistering(true);
    const ok = await registerPushNotifications();
    setRegistered(ok);
    setRegistering(false);
  };

  const toggles = [
    { key: 'rest_timer', label: 'Hviletids-timer', desc: 'Varsler når hviletiden er ferdig' },
    { key: 'weight_reminder', label: 'Vektpåminnelse', desc: 'Påminnelse om å logge vekten' },
    { key: 'workout_reminder', label: 'Øktpåminnelse', desc: 'Påminnelse om å trene' },
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
                {/* Enable push button */}
                {!registered && (
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
                {registered && (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-4">
                    <Check size={14} className="text-green-400" />
                    <p className="text-green-400 text-sm">Push-varsler aktivert</p>
                  </div>
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

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 mb-4">
                  <p className="text-zinc-400 text-xs font-semibold mb-2">Tidspunkt for påminnelser</p>
                  <input
                    type="time"
                    value={prefs.reminder_time ?? '18:00'}
                    onChange={e => handleTimeChange(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                  />
                </div>

                {saving && (
                  <p className="text-zinc-500 text-xs text-center">Lagrer...</p>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
