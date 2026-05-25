'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, CircleCheck as CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface RegisterScreenProps {
  onSwitchToLogin: () => void;
}

export function RegisterScreen({ onSwitchToLogin }: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleRegister = async () => {
    if (!passwordValid) {
      setError('Passordet ma vare minst 6 tegn.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passordene samsvarer ikke.');
      return;
    }
    if (!fullName.trim()) {
      setError('Vennligst skriv inn navnet ditt.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      const msg = err.message ?? 'Noe gikk galt';
      if (msg.includes('already registered')) {
        setError('Denne e-postadressen er allerede registrert. Prøv å logge inn.');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  if (success) {
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
          <h2 className="text-xl font-bold text-white mb-3">Sjekk e-posten din</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Vi har sendt en bekreftelseslenke til <span className="text-white font-medium">{email}</span>.
            Klikk på lenken for å aktivere kontoen din.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onSwitchToLogin}
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
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-8 h-8 object-contain" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">IronGrid</span>
        </div>
        <p className="text-zinc-500 text-sm mb-8">Opprett en konto for å komme i gang</p>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Fullt navn</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Ola Nordmann"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                autoComplete="name"
              />
            </div>
          </div>

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
                placeholder="Minst 6 tegn"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <p className={`text-xs mt-1.5 ${passwordValid ? 'text-green-400' : 'text-zinc-500'}`}>
                {passwordValid ? 'Passordet er langt nok' : `${6 - password.length} tegn til`}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Bekreft passord</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Skriv passordet pa nytt"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`text-xs mt-1.5 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                {passwordsMatch ? 'Passordene samsvarer' : 'Passordene samsvarer ikke'}
              </p>
            )}
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
            onClick={handleRegister}
            disabled={loading || !email || !password || !confirmPassword || !fullName.trim()}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={18} />
                Opprett konto
              </>
            )}
          </motion.button>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-sm text-zinc-500">
            Har du allerede konto?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-red-400 font-semibold hover:text-red-300 transition-colors"
            >
              Logg inn
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
