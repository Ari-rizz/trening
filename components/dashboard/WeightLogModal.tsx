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
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-5 border-b border-zinc-800/60"
               style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 5rem)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 flex items-center justify-center">
                <Scale size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-tight">Legg inn vekt</p>
                <p className="text-zinc-500 text-sm capitalize">{todayLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
            >
              <X size={18} className="text-zinc-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
            {saved ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 size={40} className="text-green-400" />
                </div>
                <p className="text-white font-bold text-2xl">Vekt lagret!</p>
                <p className="text-zinc-500 text-base">{value.replace('.', ',')} kg registrert</p>
              </motion.div>
            ) : (
              <>
                {existingWeight !== null && (
                  <p className="text-zinc-500 text-sm text-center -mb-4">
                    Allerede registrert i dag — du kan oppdatere verdien
                  </p>
                )}

                <div className="w-full relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,0"
                    value={value}
                    onChange={e => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl px-6 py-6 text-white text-5xl font-bold text-center outline-none focus:border-blue-500/60 transition-colors"
                  />
                  <span className="absolute right-7 top-1/2 -translate-y-1/2 text-zinc-500 text-xl font-medium">
                    kg
                  </span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
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
      )}
    </AnimatePresence>
  );
}
