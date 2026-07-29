'use client';

import { useEffect } from 'react';
import { supabase } from './supabase';
import { useAppStore } from './store';
import { isOnline, getQueueCount, syncQueuedWorkouts } from './offline-sync';

export function useOfflineSync() {
  const { setOnlineStatus, setPendingSyncCount } = useAppStore();

  useEffect(() => {
    const updateStatus = () => {
      const online = isOnline();
      setOnlineStatus(online);
      setPendingSyncCount(getQueueCount());
    };

    updateStatus();

    const handleOnline = async () => {
      setOnlineStatus(true);
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (uid) {
        const result = await syncQueuedWorkouts(uid);
        if (result.synced > 0) {
          window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: result }));
        }
      }
      setPendingSyncCount(getQueueCount());
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    const handleQueueChanged = () => {
      setPendingSyncCount(getQueueCount());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueueChanged);

    // Try syncing on mount if online
    if (isOnline()) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueueChanged);
    };
  }, [setOnlineStatus, setPendingSyncCount]);
}
