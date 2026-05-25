'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginScreenProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export function LoginScreen({ onSwitchToRegister, onSwitchToForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message ?? 'Noe gikk galt';
      if (msg.includes('Email not confirmed')) {
        setError('E-posten din er ikke bekreftet. Sjekk innboksen din for en bekreftelseslenke.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Feil e-post eller passord.');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 pt-20 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">IronGrid</span>
        </div>
        <p className="text-zinc-500 text-sm mb-10">Logg inn for å fortsette treningen din</p>

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

          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Passord</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Skriv inn passordet ditt"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
            >
              Glemt passord?
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogin}
            disabled={loading || !email || !password}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={18} />
                Logg inn
              </>
            )}
          </motion.button>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-sm text-zinc-500">
            Har du ikke konto?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-red-400 font-semibold hover:text-red-300 transition-colors"
            >
              Opprett konto
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
