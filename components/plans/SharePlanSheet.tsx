'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Check, Trash2, RefreshCw } from 'lucide-react';
import { supabase, WorkoutTemplate } from '@/lib/supabase';

interface Props {
  open: boolean;
  template: WorkoutTemplate | null;
  userId: string;
  onClose: () => void;
}

export function SharePlanSheet({ open, template, userId, onClose }: Props) {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalShares, setTotalShares] = useState(0);

  const MAX_SHARES = 20;

  useEffect(() => {
    if (open && template) {
      loadExistingCode();
      loadTotalShares();
    }
  }, [open, template]);

  const loadExistingCode = async () => {
    if (!template) return;
    const { data } = await supabase
      .from('shared_templates')
      .select('share_code')
      .eq('template_id', template.id)
      .maybeSingle();
    setShareCode(data?.share_code ?? null);
  };

  const loadTotalShares = async () => {
    const { count } = await supabase
      .from('shared_templates')
      .select('*', { count: 'exact', head: true })
      .eq('owner_user_id', userId);
    setTotalShares(count ?? 0);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreate = async () => {
    if (!template) return;
    if (!shareCode && totalShares >= MAX_SHARES) return;

    setLoading(true);
    const code = generateCode();

    const { error } = await supabase
      .from('shared_templates')
      .upsert(
        { owner_user_id: userId, template_id: template.id, share_code: code },
        { onConflict: 'template_id' }
      );

    if (!error) {
      setShareCode(code);
      await loadTotalShares();
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    if (!template) return;
    setLoading(true);
    await supabase.from('shared_templates').delete().eq('template_id', template.id);
    setShareCode(null);
    await loadTotalShares();
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shareCode) return;
    await navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const atLimit = !shareCode && totalShares >= MAX_SHARES;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-5 pt-5 pb-10"
          >
            <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Share2 size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Del plan</p>
                  <p className="text-zinc-500 text-xs truncate max-w-[200px]">{template?.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <X size={16} className="text-zinc-400" />
              </button>
            </div>

            {shareCode ? (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-zinc-500 text-xs mb-2 text-center">Del denne koden med andre</p>
                  <p className="text-white text-4xl font-bold tracking-[0.3em] text-center font-mono">{shareCode}</p>
                  <p className="text-zinc-600 text-xs text-center mt-2">Mottakeren skriver inn koden under &quot;Importer plan&quot;</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCopy}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
                    copied ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-blue-500 text-white'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Kopiert!' : 'Kopier kode'}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRevoke}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 text-zinc-500 text-sm"
                >
                  <Trash2 size={14} />
                  Deaktiver kode
                </motion.button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-zinc-400 text-sm">
                    Generer en 6-tegns kode som andre kan bruke til å importere planen din. Planen kopieres fullstendig — mottakeren kan endre den fritt uten at det påvirker originalen.
                  </p>
                </div>

                {atLimit && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                    <p className="text-amber-400 text-sm font-medium">Maksimumsgrense nådd</p>
                    <p className="text-amber-400/70 text-xs mt-0.5">Du har {MAX_SHARES} aktive delte planer. Slett en eksisterende for å dele denne.</p>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreate}
                  disabled={loading || atLimit}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white py-3.5 rounded-xl font-bold text-sm"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />}
                  Generer delingskode
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
