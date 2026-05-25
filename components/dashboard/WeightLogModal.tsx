'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, CircleCheck as CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface WeightLogModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSaved: (weightKg: number) => void;
}

export function WeightLogModal({ open, userId, onClose, onSaved }: WeightLogModalProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingWeight, setExistingWeight] = useState<number | null>(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), "EEEE d. MMMM", { locale: nb });

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setExistingWeight(null);

    supabase
      .from('body_weight_logs')
      .select('weight_kg')
      .eq('user_id', userId)
      .eq('logged_at', todayStr)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingWeight(data.weight_kg);
          setValue(String(data.weight_kg).replace('.', ','));
        } else {
          setValue('');
        }
      });
  }, [open, userId, todayStr]);

  const handleSave = async () => {
    const parsed = parseFloat(value.replace(',', '.'));
    if (!parsed || parsed <= 0 || parsed >= 999) return;
    setSaving(true);
    const { error } = await supabase
      .from('body_weight_logs')
      .upsert(
        { user_id: userId, weight_kg: parsed, logged_at: todayStr },
        { onConflict: 'user_id,logged_at' }
      );
    setSaving(false);
    if (!error) {
      setSaved(true);
      onSaved(parsed);
      setTimeout(() => {
        onClose();
      }, 900);
    }
  };

  const isValid = (() => {
    const v = parseFloat(value.replace(',', '.'));
    return v > 0 && v < 999;
  })();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Scale size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Legg inn vekt</p>
                  <p className="text-zinc-500 text-xs capitalize">{todayLabel}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <X size={15} className="text-zinc-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-6">
              {saved ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <CheckCircle2 size={48} className="text-green-400" />
                  <p className="text-white font-semibold">Vekt lagret!</p>
                  <p className="text-zinc-500 text-sm">{value.replace('.', ',')} kg registrert</p>
                </motion.div>
              ) : (
                <>
                  {existingWeight !== null && (
                    <p className="text-zinc-500 text-xs mb-3 text-center">
                      Allerede registrert i dag — du kan oppdatere verdien
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,0"
                      value={value}
                      onChange={e => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                      autoFocus
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white text-3xl font-bold text-center outline-none focus:border-blue-500/60 transition-colors"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 text-lg font-medium">
                      kg
                    </span>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className={`w-full mt-4 py-3.5 rounded-2xl font-bold text-base transition-all ${
                      isValid && !saving
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {saving ? 'Lagrer...' : existingWeight !== null ? 'Oppdater vekt' : 'Lagre vekt'}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
