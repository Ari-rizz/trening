'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Dumbbell, Play, TrendingUp, ClipboardList } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { StartWorkoutSheet } from '@/components/workout/StartWorkoutSheet';

const tabs = [
  { id: 'dashboard', label: 'Hjem', icon: LayoutDashboard },
  { id: 'plans', label: 'Planer', icon: ClipboardList },
  { id: 'workout', label: 'Økt', icon: Play },
  { id: 'exercises', label: 'Øvelser', icon: Dumbbell },
  { id: 'progress', label: 'Fremgang', icon: TrendingUp },
];

export function BottomNav() {
  const { currentTab, setCurrentTab, activeWorkout } = useAppStore();
  const [showStartSheet, setShowStartSheet] = useState(false);

  const handleWorkoutPress = () => {
    if (activeWorkout) {
      setCurrentTab('workout');
    } else {
      setShowStartSheet(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-zinc-900">
        <div className="flex items-stretch max-w-lg mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            const isWorkout = tab.id === 'workout';
            const hasActive = isWorkout && activeWorkout;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => isWorkout ? handleWorkoutPress() : setCurrentTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 relative transition-colors ${
                  isWorkout
                    ? ''
                    : isActive
                    ? 'text-white'
                    : 'text-zinc-600'
                }`}
              >
                {isWorkout ? (
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-red-500 shadow-lg shadow-red-500/40'
                        : 'bg-zinc-900 border border-zinc-800'
                    }`}
                  >
                    <Icon
                      size={22}
                      className={`${isActive ? 'text-white fill-current' : 'text-zinc-400'}`}
                    />
                    {hasActive && !isActive && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute top-2 right-5 w-2 h-2 bg-red-500 rounded-full"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-red-500 rounded-full"
                      />
                    )}
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {showStartSheet && (
        <StartWorkoutSheet onClose={() => setShowStartSheet(false)} />
      )}
    </>
  );
}
