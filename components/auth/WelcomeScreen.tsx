'use client';

import { motion } from 'framer-motion';
import { LogIn, UserPlus } from 'lucide-react';
import { MuscleMap } from '@/components/dashboard/MuscleMap';

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onLogin: () => void;
}

export function WelcomeScreen({ onCreateAccount, onLogin }: WelcomeScreenProps) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#090b10] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(135deg,transparent_0%,rgba(239,68,68,0.05)_50%,transparent_100%)]" />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 flex items-center justify-center pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]"
      >
        <div className="flex items-center gap-3">
          <img
            src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG"
            alt="IronGrid"
            className="h-11 w-11 object-contain"
          />
          <span className="text-[2rem] font-bold tracking-[-0.04em]">IronGrid</span>
        </div>
      </motion.header>

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center pb-6 pt-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative flex w-full max-w-[360px] flex-1 items-center justify-center"
        >
          <div className="absolute h-[24rem] w-[20rem] rounded-full bg-red-500/15 blur-3xl" />
          <div
            className="relative max-h-[min(54vh,460px)] w-full overflow-hidden drop-shadow-[0_0_30px_rgba(239,68,68,0.25)]"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
            }}
          >
            <div className="scale-[1.18]">
              <MuscleMap
                mode="default"
                highlightGroups={['chest', 'shoulders', 'abs']}
                showBack={false}
                showLabels={false}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="w-full max-w-sm"
        >
          <h1 className="text-[2rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[2.25rem]">
            Train. Track. <span className="text-red-400">Transform.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[300px] text-sm leading-relaxed text-zinc-400">
            Smart tracking for serious results.
            <br />
            Built for progress. Designed for you.
          </p>
        </motion.div>
      </section>

      <motion.footer
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="relative z-10 w-full max-w-sm self-center pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-4"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCreateAccount}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 py-4 text-base font-bold text-white shadow-[0_12px_32px_rgba(239,68,68,0.18)] transition-colors hover:bg-red-600"
        >
          <UserPlus size={18} />
          Opprett bruker
        </motion.button>
        <button
          type="button"
          onClick={onLogin}
          className="mt-5 flex w-full items-center justify-center gap-2 py-2 text-base font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          <LogIn size={17} />
          Logg inn
        </button>
      </motion.footer>
    </main>
  );
}
