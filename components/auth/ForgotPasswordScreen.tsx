'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CircleCheck as CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.ai-assistant.no',
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Noe gikk galt');
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex flex-col min-h-screen bg-black px-6 pt-20 pb-8 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Lenke sendt</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Vi har sendt en tilbakestillingslenke til <span className="text-white font-medium">{email}</span>.
            Sjekk innboksen din og folg instruksjonene.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onBack}
            className="w-full bg-zinc-900 border border-zinc-800 text-white py-4 rounded-2xl font-semibold text-base transition-colors hover:bg-zinc-800"
          >
            Tilbake til innlogging
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 pt-20 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 w-fit"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Tilbake</span>
        </button>

        <h1 className="text-2xl font-bold text-white mb-2">Glemt passord?</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Skriv inn e-postadressen din, så sender vi deg en lenke for å tilbakestille passordet.
        </p>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">E-post</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="din@epost.no"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleReset}
            disabled={loading || !email}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Send tilbakestillingslenke'
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
