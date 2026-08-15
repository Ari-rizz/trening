'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, WifiOff, CloudUpload } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { StartWorkoutSheet } from '@/components/workout/StartWorkoutSheet';
import { PageHelpSheet } from '@/components/layout/PageHelpSheet';
import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { ExercisesTab } from '@/components/exercises/ExercisesTab';
import { WorkoutTab } from '@/components/workout/WorkoutTab';
import { ProgressTab } from '@/components/progress/ProgressTab';
import { HistoryTab } from '@/components/history/HistoryTab';
import { ProfileTab } from '@/components/profile/ProfileTab';
import { PlansTab } from '@/components/plans/PlansTab';
import { AuthGate } from '@/components/auth/AuthGate';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { initStatusBar, hideSplash, requestNotificationPermission } from '@/lib/native';
import { useOfflineSync } from '@/lib/use-offline-sync';

export default function Home() {
  const currentTab = useAppStore(s => s.currentTab);
  const setCurrentTab = useAppStore(s => s.setCurrentTab);
  const showStartSheet = useAppStore(s => s.showStartSheet);
  const setShowStartSheet = useAppStore(s => s.setShowStartSheet);
  const isOnline = useAppStore(s => s.isOnline);
  const pendingSyncCount = useAppStore(s => s.pendingSyncCount);
  const [initials, setInitials] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useOfflineSync();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.synced > 0) {
        setSyncNotice(`${detail.synced} økt(er) lagret`);
        setTimeout(() => setSyncNotice(null), 4000);
      }
    };
    window.addEventListener('offline-sync-complete', handler);
    return () => window.removeEventListener('offline-sync-complete', handler);
  }, []);

  useEffect(() => {
    initStatusBar();
    hideSplash();
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const loadInitials = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle();
      const name = data?.full_name || session.user.email?.split('@')[0] || '';
      setInitials(
        name.split(' ').filter(Boolean).map((w: string) => w[0].toUpperCase()).slice(0, 2).join('')
      );
    };
    loadInitials();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadInitials();
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close help sheet when tab changes
  useEffect(() => {
    setHelpOpen(false);
  }, [currentTab]);

  const tabComponents: Record<string, React.ReactNode> = {
    dashboard: <DashboardTab />,
    plans: <PlansTab />,
    exercises: <ExercisesTab />,
    workout: <WorkoutTab />,
    progress: <ProgressTab />,
    history: <HistoryTab />,
    profile: <ProfileTab />,
  };

  return (
    <AuthGate>
    <main className="flex flex-col h-screen bg-black overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pt-3 bg-black/95 backdrop-blur-xl border-b border-zinc-900/50 h-20"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center overflow-hidden">
            <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">IronGrid</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Lightbulb help button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setHelpOpen(true)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
              helpOpen
                ? 'bg-amber-500/20 border-amber-500/40'
                : 'bg-zinc-900 border-zinc-800'
            }`}
            aria-label="Hjelp om denne siden"
          >
            <Lightbulb size={17} className={helpOpen ? 'text-amber-400' : 'text-zinc-400'} />
          </motion.button>

          {/* Profile button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentTab('profile')}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
          >
            <span className="text-zinc-400 text-sm font-bold">{initials || 'P'}</span>
          </motion.button>
        </div>
      </div>

      {/* Offline / sync indicator */}
      <AnimatePresence>
        {(!isOnline || pendingSyncCount > 0 || syncNotice) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium ${
              syncNotice ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {syncNotice ? (
                <><CloudUpload size={13} /> {syncNotice}</>
              ) : !isOnline ? (
                <><WifiOff size={13} /> Offline — økter lagres lokalt</>
              ) : (
                <><CloudUpload size={13} /> {pendingSyncCount} økt(er) venter på synk…</>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 overflow-hidden flex flex-col"
          >
            {tabComponents[currentTab] ?? tabComponents.dashboard}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav />

      {showStartSheet && (
        <StartWorkoutSheet onClose={() => setShowStartSheet(false)} />
      )}

      {/* Contextual help sheet */}
      <PageHelpSheet
        tab={currentTab}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </main>
    </AuthGate>
  );
}
