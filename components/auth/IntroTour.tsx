'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

// Step indices (0-based) that need a mock active workout
const MOCK_WORKOUT_STEP_INDICES = new Set([4, 5, 6]);

interface TourStep {
  tab: string;
  title: string;
  text: string;
  /** CSS selector for the element to highlight. null = no highlight */
  selector: string | null;
  /** Where to position the bubble relative to the highlighted element */
  bubblePosition: 'top' | 'bottom' | 'center';
}

const STEPS: TourStep[] = [
  {
    tab: 'dashboard',
    title: 'Velkommen til IronGrid!',
    text: 'IronGrid er din personlige treningslogg. Her kan du logge økter, følge fremgang, lage treningsplaner og se styrken din vokse over tid.',
    selector: null,
    bubblePosition: 'center',
  },
  {
    tab: 'dashboard',
    title: 'Dashboard',
    text: 'Her ser du en oversikt over treningen din. Ukentlige statistikker, streak-teller og nylige rekorder vises her. Dette er hjemmesiden din.',
    selector: '[data-tour="stats-grid"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'plans',
    title: 'Treningsplaner',
    text: 'Lag treningsplaner som du kan gjenbruke. En plan er en mal med øvelser, sett og målvekter. Trykk på "+" for å lage din første plan.',
    selector: '[data-tour="plans-new-button"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'workout',
    title: 'Start en økt',
    text: 'Her starter du en treningsøkt. Trykk "Start ny økt" eller velg en plan. Du kan legge til øvelser, endre navn på økten og se forrige sesjon som guide.',
    selector: '[data-tour="workout-start"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'workout',
    title: 'Logg sett',
    text: 'Fyll inn vekt og reps for hvert sett. Trykk på sirkelen til venstre for å markere settet som fullført. Hvile-timeren starter automatisk.',
    selector: '[data-tour="workout-set-row"]',
    bubblePosition: 'top',
  },
  {
    tab: 'workout',
    title: 'Hvile-timer',
    text: 'Etter hvert fullført sett starter hvile-timeren automatisk. Du kan se og stoppe den i toppen av skjermen. Hvile-tid kan endres i Profil.',
    selector: '[data-tour="rest-timer"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'exercises',
    title: 'Øvelsesbibliotek',
    text: 'Her finner du hundrevis av øvelser. Bruk søkefeltet eller filterknappene for å finne riktig øvelse. Trykk på en øvelse for å se bilder og instruksjoner.',
    selector: '[data-tour="exercises-search"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'progress',
    title: 'Fremgang',
    text: 'Her ser du hvordan styrken din utvikler seg. Øvelsene er delt inn i sammensatte, isolasjon og annet. Trykk på en øvelse for å se graf, 1RM og alle sesjonene dine.',
    selector: '[data-tour="progress-list"]',
    bubblePosition: 'top',
  },
  {
    tab: 'progress',
    title: 'Hva er 1RM?',
    text: '1RM (One Rep Max) er den maksimale vekten du teoretisk kan løfte én gang. IronGrid beregner dette automatisk fra dine løft og viser utviklingen din.',
    selector: '[data-tour="progress-1rm"]',
    bubblePosition: 'bottom',
  },
  {
    tab: 'profile',
    title: 'Profil og innstillinger',
    text: 'Her kan du endre hvile-tid mellom sett, oppdatere persondata og installere IronGrid som en app på hjemskjermen din for raskere tilgang.',
    selector: '[data-tour="profile-rest-timer"]',
    bubblePosition: 'top',
  },
];

interface IntroTourProps {
  userId: string;
  onComplete: () => void;
}

export function IntroTour({ userId, onComplete }: IntroTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const { setCurrentTab, startMockWorkout, clearMockWorkout, setIsTourMode, setTourSelectedExerciseId } = useAppStore();
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProgrammaticScroll = useRef(false);

  const step = STEPS[stepIndex];

  const findAndSetHighlight = useCallback((selector: string | null) => {
    if (!selector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      setHighlightRect(el.getBoundingClientRect());
    } else {
      setHighlightRect(null);
    }
  }, []);

  const scrollToAndHighlight = useCallback((selector: string | null) => {
    if (!selector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (!el) {
      setHighlightRect(null);
      return;
    }
    // Check if element is already visible in viewport
    const rect = el.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (isVisible) {
      setHighlightRect(rect);
      return;
    }
    // Suppress scroll listener during programmatic scroll
    isProgrammaticScroll.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    // Measure after scroll settles
    setTimeout(() => {
      setHighlightRect(el.getBoundingClientRect());
      isProgrammaticScroll.current = false;
    }, 350);
  }, []);

  // Re-scan the DOM periodically so we catch elements that mount after tab switch
  useEffect(() => {
    if (scanTimerRef.current) clearInterval(scanTimerRef.current);

    // Switch tab immediately
    setCurrentTab(step.tab as any);

    // Activate mock workout for workout-tab steps, deactivate for others
    if (MOCK_WORKOUT_STEP_INDICES.has(stepIndex)) {
      startMockWorkout();
    } else {
      clearMockWorkout();
    }

    // Enable tour mode so dashboard/progress show mock data
    setIsTourMode(true);

    // Navigate into exercise detail for 1RM step
    if (stepIndex === 8) {
      setTourSelectedExerciseId('mock-bench');
    } else {
      setTourSelectedExerciseId(null);
    }

    // Give the tab a moment to render, then scroll to and highlight the element
    const initialDelay = setTimeout(() => {
      scrollToAndHighlight(step.selector);
    }, 400);

    // Keep rescanning to handle slow renders
    scanTimerRef.current = setInterval(() => {
      findAndSetHighlight(step.selector);
    }, 500);

    return () => {
      clearTimeout(initialDelay);
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [stepIndex, step.tab, step.selector, setCurrentTab, findAndSetHighlight, scrollToAndHighlight, startMockWorkout, clearMockWorkout, setIsTourMode, setTourSelectedExerciseId]);

  // Update highlight rect on scroll/resize
  useEffect(() => {
    const update = () => {
      if (isProgrammaticScroll.current) return;
      findAndSetHighlight(step.selector);
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [step.selector, findAndSetHighlight]);

  useEffect(() => {
    // Small delay so the intro appears smoothly after onboarding
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setVisible(false);
    clearMockWorkout(); // also sets isTourMode = false
    await supabase
      .from('profiles')
      .update({ intro_tour_completed: true })
      .eq('id', userId);
    setTimeout(onComplete, 300);
  };

  const handleSkip = () => {
    handleFinish();
  };

  // Compute bubble vertical position based on highlight rect and step config
  const getBubbleStyle = (): React.CSSProperties => {
    if (!highlightRect || step.bubblePosition === 'center') {
      return {
        position: 'fixed',
        bottom: 112,
        left: 16,
        right: 16,
      };
    }

    const BUBBLE_HEIGHT = 180;
    const MARGIN = 16;
    const PAD = 12;

    if (step.bubblePosition === 'bottom') {
      // Bubble below the element
      const top = highlightRect.bottom + PAD;
      // If it would overflow screen, flip to above
      if (top + BUBBLE_HEIGHT > window.innerHeight - 80) {
        return {
          position: 'fixed',
          bottom: window.innerHeight - highlightRect.top + PAD,
          left: MARGIN,
          right: MARGIN,
        };
      }
      return {
        position: 'fixed',
        top,
        left: MARGIN,
        right: MARGIN,
      };
    } else {
      // Bubble above the element
      const bottom = window.innerHeight - highlightRect.top + PAD;
      if (bottom + BUBBLE_HEIGHT > window.innerHeight - 80) {
        return {
          position: 'fixed',
          top: highlightRect.bottom + PAD,
          left: MARGIN,
          right: MARGIN,
        };
      }
      return {
        position: 'fixed',
        bottom,
        left: MARGIN,
        right: MARGIN,
      };
    }
  };

  // Padding around highlight cutout
  const PAD = 8;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] pointer-events-none"
        >
          {/* Dark overlay with cutout */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={{ mixBlendMode: 'normal' }}
            onClick={handleNext}
          >
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={highlightRect ? highlightRect.left - PAD : 0}
                  y={highlightRect ? highlightRect.top - PAD : 0}
                  width={highlightRect ? highlightRect.width + PAD * 2 : 0}
                  height={highlightRect ? highlightRect.height + PAD * 2 : 0}
                  rx={12}
                  fill="black"
                  style={{ transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.78)"
              mask="url(#tour-mask)"
            />
          </svg>

          {/* Highlight glow border */}
          {highlightRect && (
            <motion.div
              className="absolute rounded-xl pointer-events-none"
              animate={{
                left: highlightRect.left - PAD,
                top: highlightRect.top - PAD,
                width: highlightRect.width + PAD * 2,
                height: highlightRect.height + PAD * 2,
                opacity: 1,
              }}
              initial={{ opacity: 0 }}
              transition={{ type: 'tween', duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              style={{
                boxShadow: '0 0 0 2px #ef4444, 0 0 20px 4px rgba(239,68,68,0.35)',
              }}
            >
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-red-500/50"
                animate={{ scale: [1, 1.04, 1], opacity: [0.8, 0.3, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          )}

          {/* Speech bubble */}
          <motion.div
            key={`bubble-${stepIndex}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
            style={getBubbleStyle()}
            className="pointer-events-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-800/60">
                {/* Logo avatar */}
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img
                    src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG"
                    alt="IronGrid"
                    className="w-7 h-7 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">{step.title}</p>
                  <p className="text-zinc-500 text-[10px]">IronGrid Guide</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleSkip(); }}
                  className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0"
                >
                  <X size={13} className="text-zinc-400" />
                </button>
              </div>

              {/* Body */}
              <div className="px-4 py-3">
                <p className="text-zinc-300 text-sm leading-relaxed">{step.text}</p>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 flex items-center justify-between">
                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-200 ${
                        i === stepIndex
                          ? 'w-4 h-1.5 bg-red-500'
                          : i < stepIndex
                          ? 'w-1.5 h-1.5 bg-zinc-600'
                          : 'w-1.5 h-1.5 bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); handleSkip(); }}
                    className="text-zinc-600 text-xs font-medium"
                  >
                    Hopp over
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); handleNext(); }}
                    className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    {stepIndex === STEPS.length - 1 ? 'Ferdig' : 'Neste'}
                    {stepIndex < STEPS.length - 1 && <ChevronRight size={15} />}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
