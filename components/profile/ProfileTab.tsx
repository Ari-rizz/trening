'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Dumbbell, Trophy, ChartBar as BarChart2, History, Timer, Download, Share, X, ArrowUp, MoveHorizontal as MoreHorizontal, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

interface Profile {
  full_name: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: string | null;
  fitness_level: string | null;
  training_goal: string | null;
}

export function ProfileTab() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ workouts: 0, volume: 0, prs: 0 });
  const { defaultRestSeconds, setDefaultRestSeconds } = useAppStore();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && isSafari;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallModal(false);
    } else {
      setShowInstallModal(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id);
        fetchStats(data.session.user.id);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
        fetchStats(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, date_of_birth, height_cm, weight_kg, gender, fitness_level, training_goal')
      .eq('id', uid)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const fetchStats = async (uid: string) => {
    const [{ count: workouts }, { count: prs }, { data: volumeData }] = await Promise.all([
      supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_completed', true),
      supabase.from('personal_records').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('workouts').select('total_volume_kg').eq('user_id', uid).eq('is_completed', true),
    ]);
    const volume = (volumeData ?? []).reduce((a, w) => a + (w.total_volume_kg ?? 0), 0);
    setStats({ workouts: workouts ?? 0, volume: Math.round(volume), prs: prs ?? 0 });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const displayName = profile?.full_name || session?.user?.email?.split('@')[0] || 'Bruker';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0].toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Innstillinger og kontoinformasjon</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {/* User card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <span className="text-red-400 font-bold text-lg">{initials}</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">{displayName}</p>
              <p className="text-zinc-500 text-sm">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <Dumbbell size={18} className="text-red-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.workouts}</p>
            <p className="text-zinc-600 text-xs">Økter</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <BarChart2 size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(0)}t` : stats.volume}</p>
            <p className="text-zinc-600 text-xs">kg volum</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <Trophy size={18} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.prs}</p>
            <p className="text-zinc-600 text-xs">PR-er</p>
          </div>
        </div>

        {/* Rest timer setting */}
        <div data-tour="profile-rest-timer" className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Timer size={18} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Hviletid mellom sett</p>
              <p className="text-zinc-500 text-xs mt-0.5">Timeren starter automatisk etter hvert sett</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-1">
            {[30, 60, 90, 120, 180, 240, 300].map(secs => {
              const label = secs < 60 ? `${secs}s` : `${secs / 60}min`;
              const isSelected = defaultRestSeconds === secs;
              return (
                <motion.button
                  key={secs}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDefaultRestSeconds(secs)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow'
                      : 'text-zinc-500 active:text-zinc-300'
                  }`}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => useAppStore.getState().setCurrentTab('history')}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <History size={18} className="text-zinc-400" />
          Treningshistorikk
        </motion.button>

        {/* Sign out */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-red-400 font-semibold"
        >
          <LogOut size={18} />
          Logg ut
        </motion.button>

        {/* Install button */}
        {!isInstalled && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
          >
            <Download size={18} className="text-green-400" />
            Legg til på hjemskjermen
          </motion.button>
        )}
      </div>

      {/* Install modal — fullscreen overlay above bottom nav */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-14 pb-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                  <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Installer IronGrid</p>
                  <p className="text-zinc-500 text-xs">Legg til på hjemskjermen</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 pb-10 space-y-3">
              <p className="text-zinc-400 text-sm mb-4">
                {isIOSSafari ? 'Følg disse stegene i Safari:' : 'Følg disse stegene i Chrome:'}
              </p>

              {isIOSSafari ? (
                <>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk på del-knappen</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Knappen med pil opp nederst i nettleseren</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <ArrowUp size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Velg &quot;Legg til på hjemskjerm&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Scroll ned i menyen til du finner alternativet</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Plus size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk &quot;Legg til&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">IronGrid legges til på hjemskjermen din</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Download size={18} className="text-zinc-300" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk på meny-knappen</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Tre prikker øverst til høyre i Chrome</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <MoreHorizontal size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Velg &quot;Legg til på hjemskjerm&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Eller &quot;Installer app&quot;</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Plus size={18} className="text-zinc-300" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
