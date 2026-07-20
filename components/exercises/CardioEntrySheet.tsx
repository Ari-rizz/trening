'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Timer, Flame, MapPin, RefreshCw, Check } from 'lucide-react';
import { supabase, CardioType } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const CARDIO_TYPES: { value: CardioType; label: string }[] = [
  { value: 'running', label: 'Løping' },
  { value: 'walking', label: 'Gåtur' },
  { value: 'cycling', label: 'Sykling' },
  { value: 'rowing', label: 'Roing' },
  { value: 'swimming', label: 'Svømming' },
  { value: 'stairmaster', label: 'Trappemaskin' },
  { value: 'elliptical', label: 'Elliptisk' },
  { value: 'ski_erg', label: 'SkiErg' },
  { value: 'other', label: 'Annet' },
];

export function CardioEntrySheet({ open, onClose, onSaved }: Props) {
  const [category, setCategory] = useState<CardioType>('running');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [avgHr, setAvgHr] = useState('');
  const [maxHr, setMaxHr] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const dist = parseFloat(distance.replace(',', '.')) || 0;
    const dur = parseInt(duration) || 0;
    const cal = parseFloat(calories.replace(',', '.')) || 0;
    const aHr = parseInt(avgHr) || null;
    const mHr = parseInt(maxHr) || null;

    if (dist === 0 && dur === 0) {
      setError('Fyll inn avstand eller varighet');
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setError('Ikke logget inn');
      setLoading(false);
      return;
    }

    const distanceM = dist * 1000;
    const pace = dur > 0 && dist > 0 ? (dur / dist) : null;
    const speed = dur > 0 && dist > 0 ? (dist / (dur / 3600)) : null;

    const { error: insertError } = await supabase.from('cardio_logs').insert({
      user_id: session.user.id,
      category,
      distance_m: distanceM,
      duration_s: dur,
      calories: cal || null,
      pace_s_per_km: pace,
      speed_kmh: speed,
      avg_hr: aHr,
      max_hr: mHr,
    });

    setLoading(false);
    if (insertError) {
      setError('Kunne ikke lagre. Prøv igjen.');
      return;
    }
    setSuccess(true);
    setDistance('');
    setDuration('');
    setCalories('');
    setAvgHr('');
    setMaxHr('');
    setTimeout(() => {
      setSuccess(false);
      onSaved?.();
      onClose();
    }, 1200);
  };

  const handleClose = () => {
    setDistance('');
    setDuration('');
    setCalories('');
    setAvgHr('');
    setMaxHr('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[59]"
            onClick={handleClose}
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
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Heart size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Logg kardio</p>
                  <p className="text-zinc-500 text-xs">Registrer en kardioøkt</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {/* Category */}
            <p className="text-zinc-400 text-xs font-semibold mb-2">Type</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {CARDIO_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setCategory(t.value)}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    category === t.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-zinc-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
                  <MapPin size={11} /> Avstand (km)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={distance}
                  onChange={e => setDistance(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="F.eks. 5,2"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
                  <Timer size={11} /> Varighet (sekunder)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={duration}
                  onChange={e => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="F.eks. 1800 (30 min)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
                  <Flame size={11} /> Kalorier (valgfritt)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={calories}
                  onChange={e => setCalories(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="F.eks. 350"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
                    <Heart size={11} /> Snitt puls
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={avgHr}
                    onChange={e => setAvgHr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="F.eks. 150"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-semibold flex items-center gap-1 mb-1.5">
                    <Heart size={11} /> Maks puls
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxHr}
                    onChange={e => setMaxHr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="F.eks. 175"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={loading || success}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm mt-4 transition-colors ${
                success
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'bg-orange-500 text-white'
              }`}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Heart size={16} />}
              {success ? 'Lagret!' : loading ? 'Lagrer...' : 'Lagre kardio'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
