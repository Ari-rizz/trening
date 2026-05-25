'use client';

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Link2Off, Dumbbell } from 'lucide-react';
import { getMuscleGroupColor } from '@/lib/exercises-data';

interface ExerciseOption {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  templateExerciseId?: string;
}

interface Props {
  open: boolean;
  currentExercise: ExerciseOption;
  currentSupersetPartnerId: string | null;
  availableExercises: ExerciseOption[];
  hasTemplate: boolean;
  onLink: (partnerExId: string, saveToTemplate: boolean) => void;
  onUnlink: (saveToTemplate: boolean) => void;
  onClose: () => void;
}

export function SupersetPickerSheet({
  open,
  currentExercise,
  currentSupersetPartnerId,
  availableExercises,
  hasTemplate,
  onLink,
  onUnlink,
  onClose,
}: Props) {
  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl flex flex-col"
          style={{ maxHeight: '80vh' }}
        >
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-zinc-700 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-white">Supersett</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Velg øvelse å koble med {currentExercise.name}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"
            >
              <X size={16} className="text-zinc-400" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-3 space-y-2">
            {currentSupersetPartnerId && (
              <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-orange-400 text-xs font-medium mb-2">Allerede koblet som supersett</p>
                <SupersetUnlinkButtons hasTemplate={hasTemplate} onUnlink={onUnlink} />
              </div>
            )}

            {availableExercises.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">Legg til flere øvelser for å lage supersett</p>
            ) : (
              availableExercises.map(ex => {
                const isCurrentPartner = ex.id === currentSupersetPartnerId;
                const color = getMuscleGroupColor(ex.muscleGroup as any);
                return (
                  <ExercisePickButton
                    key={ex.id}
                    exercise={ex}
                    color={color}
                    isCurrentPartner={isCurrentPartner}
                    hasTemplate={hasTemplate && !!ex.templateExerciseId}
                    onSelect={(saveToTemplate) => onLink(ex.id, saveToTemplate)}
                  />
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function ExercisePickButton({
  exercise,
  color,
  isCurrentPartner,
  hasTemplate,
  onSelect,
}: {
  exercise: ExerciseOption;
  color: string;
  isCurrentPartner: boolean;
  hasTemplate: boolean;
  onSelect: (saveToTemplate: boolean) => void;
}) {
  if (isCurrentPartner) {
    return (
      <div className="bg-zinc-900 border border-orange-500/30 rounded-xl px-3.5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
            <Link2 size={16} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{exercise.name}</p>
            <p className="text-zinc-500 text-xs mt-0.5 capitalize">{exercise.equipment} · {exercise.muscleGroup}</p>
          </div>
          <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Koblet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
          <Dumbbell size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{exercise.name}</p>
          <p className="text-zinc-500 text-xs mt-0.5 capitalize">{exercise.equipment} · {exercise.muscleGroup}</p>
        </div>
      </div>
      <div className={`border-t border-zinc-800 grid ${hasTemplate ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-zinc-800`}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(false)}
          className="py-2.5 text-xs font-semibold text-zinc-300 active:bg-zinc-800 transition-colors"
        >
          Bare denne økten
        </motion.button>
        {hasTemplate && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(true)}
            className="py-2.5 text-xs font-semibold text-red-400 active:bg-zinc-800 transition-colors"
          >
            Oppdater planen
          </motion.button>
        )}
      </div>
    </div>
  );
}

function SupersetUnlinkButtons({ hasTemplate, onUnlink }: { hasTemplate: boolean; onUnlink: (saveToTemplate: boolean) => void }) {
  return (
    <div className={`grid ${hasTemplate ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onUnlink(false)}
        className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold"
      >
        <Link2Off size={12} />
        Bryt kobling
      </motion.button>
      {hasTemplate && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onUnlink(true)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zinc-800 border border-orange-500/20 text-orange-400 text-xs font-semibold"
        >
          <Link2Off size={12} />
          Bryt + oppdater plan
        </motion.button>
      )}
    </div>
  );
}
