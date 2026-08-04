'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { useToast } from '@/hooks/use-toast';
import { scheduleWorkoutReminder, cancelWorkoutReminder, isNative } from './native';

const INACTIVITY_MINUTES = 30;
const CHECK_INTERVAL_MS = 30_000;

export function useWorkoutReminders(lastActivityRef: { current: number }) {
  const activeWorkout = useAppStore(s => s.activeWorkout);
  const { toast } = useToast();

  const workoutRef = useRef(activeWorkout);
  workoutRef.current = activeWorkout;

  const completionToastShownRef = useRef(false);
  const inactivityToastShownRef = useRef(false);

  useEffect(() => {
    completionToastShownRef.current = false;
    inactivityToastShownRef.current = false;
    if (!activeWorkout) {
      cancelWorkoutReminder();
    }
  }, [activeWorkout?.startTime]);

  useEffect(() => {
    if (!activeWorkout) return;

    const interval = setInterval(() => {
      const workout = workoutRef.current;
      if (!workout) return;
      const now = Date.now();

      const workingSets = workout.exercises.flatMap(e => e.sets.filter(s => !s.isWarmup));
      const allCompleted = workingSets.length > 0 && workingSets.every(s => s.isCompleted);

      if (allCompleted && !completionToastShownRef.current) {
        completionToastShownRef.current = true;
        toast({
          title: 'Økt fullført!',
          description: 'Alle sett er gjort. Husk å lagre økten din.',
        });
        scheduleWorkoutReminder(5, 'IronGrid', 'Alle sett er fullført! Husk å lagre økten.');
      }

      const inactiveMs = now - lastActivityRef.current;
      if (inactiveMs >= INACTIVITY_MINUTES * 60 * 1000) {
        if (!inactivityToastShownRef.current) {
          inactivityToastShownRef.current = true;
          toast({
            title: 'Er du fortsatt igang?',
            description: `Det har gått ${INACTIVITY_MINUTES} minutter siden siste aktivitet.`,
          });
        }
      } else {
        inactivityToastShownRef.current = false;
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeWorkout?.startTime]);

  useEffect(() => {
    if (!activeWorkout) return;

    let appListener: { remove: () => void } | null = null;

    const setup = async () => {
      if (!isNative()) return;
      const { App } = await import('@capacitor/app');

      appListener = await App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
        if (!isActive) {
          const elapsed = Date.now() - lastActivityRef.current;
          const remainingMin = (INACTIVITY_MINUTES * 60 * 1000 - elapsed) / (60 * 1000);
          if (remainingMin > 0) {
            scheduleWorkoutReminder(
              remainingMin,
              'IronGrid',
              'Glemte du å lagre økten? Åpne appen for å fullføre.'
            );
          }
        } else {
          cancelWorkoutReminder();
          const inactiveMs = Date.now() - lastActivityRef.current;
          if (inactiveMs >= INACTIVITY_MINUTES * 60 * 1000 && !inactivityToastShownRef.current) {
            inactivityToastShownRef.current = true;
            toast({
              title: 'Velkommen tilbake!',
              description: `Det har gått over ${INACTIVITY_MINUTES} minutter siden siste aktivitet.`,
            });
          }
        }
      });
    };

    setup();

    return () => {
      if (appListener) appListener.remove();
      cancelWorkoutReminder();
    };
  }, [activeWorkout?.startTime]);
}
