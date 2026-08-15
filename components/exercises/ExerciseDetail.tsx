'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Dumbbell, Target, Zap, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Exercise } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface ExerciseDetailProps {
  exercise: Exercise;
  onBack: () => void;
  onAdd?: () => void;
  isAdded?: boolean;
}

function ExerciseImageGallery({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  const validImages = images.filter((_, i) => !imgErrors[i]);

  if (validImages.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`${name} - ${idx === 0 ? 'start' : 'bevegelse'}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full h-52 object-cover"
            onError={() => setImgErrors(prev => ({ ...prev, [idx]: true }))}
            loading="lazy"
          />
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i === 0 ? images.length - 1 : i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            onClick={() => setIdx(i => (i === images.length - 1 ? 0 : i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
            {idx === 0 ? 'Start' : 'Bevegelse'}
          </div>
        </>
      )}
    </div>
  );
}

export function ExerciseDetail({ exercise, onBack, onAdd, isAdded }: ExerciseDetailProps) {
  const color = getMuscleGroupColor(exercise.muscle_group);
  const label = getMuscleGroupLabel(exercise.muscle_group);
  const images = exercise.images?.length ? exercise.images : [exercise.image_url, exercise.gif_url].filter(Boolean);
  const hasImages = images.some(Boolean);

  const difficultyLabel: Record<string, string> = {
    beginner: 'Nybegynner',
    intermediate: 'Middels',
    advanced: 'Avansert',
  };

  const forceLabel: Record<string, string> = {
    push: 'Push', pull: 'Pull', static: 'Statisk',
  };

  const mechanicLabel: Record<string, string> = {
    compound: 'Compound', isolation: 'Isolasjon',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full bg-black"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-white" />
        </motion.button>
        <h2 className="text-base font-bold text-white flex-1 truncate">{exercise.name}</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        {/* Image gallery */}
        {hasImages ? (
          <div className="mx-4 rounded-2xl overflow-hidden mb-4 border border-zinc-800">
            <ExerciseImageGallery images={images} name={exercise.name} />
          </div>
        ) : (
          <div
            className="mx-4 rounded-2xl overflow-hidden h-48 flex items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, border: `1px solid ${color}33` }}
          >
            <Dumbbell size={64} style={{ color, opacity: 0.4 }} />
          </div>
        )}

        <div className="px-4 space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: color + '22', color }}>
              {label}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 capitalize">
              {exercise.equipment}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 capitalize">
              {difficultyLabel[exercise.difficulty] ?? exercise.difficulty}
            </span>
            {exercise.force && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                {forceLabel[exercise.force] ?? exercise.force}
              </span>
            )}
            {exercise.mechanic && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-900 text-zinc-300 border border-zinc-800">
                {mechanicLabel[exercise.mechanic] ?? exercise.mechanic}
              </span>
            )}
            {exercise.category && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-zinc-900 text-zinc-300 border border-zinc-800 capitalize">
                {exercise.category}
              </span>
            )}
          </div>

          {/* Secondary muscles */}
          {(exercise.secondary_muscles ?? []).length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-zinc-400" />
                <p className="text-sm font-semibold text-white">Sekundære muskler</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(exercise.secondary_muscles ?? []).map((m, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400">
                    {getMuscleGroupLabel(m)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {exercise.instructions && (
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-zinc-400" />
                <p className="text-sm font-semibold text-white">Instruksjoner</p>
              </div>
              <ol className="space-y-2">
                {exercise.instructions.split(/(?<=\.)\s+(?=[A-Z])|(?<=\.\s)(?=[A-Z])/).filter(s => s.trim()).map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-300 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center mt-0.5 font-bold">
                      {i + 1}
                    </span>
                    <span>{step.trim()}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      {onAdd && (
        <div className="fixed bottom-28 left-0 right-0 px-4 pb-safe">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onAdd}
            disabled={isAdded}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-base shadow-lg transition-colors ${
              isAdded
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400'
                : 'text-white'
            }`}
            style={!isAdded ? { backgroundColor: color } : undefined}
          >
            {isAdded ? (
              <>
                <Check size={20} />
                Allerede i planen
              </>
            ) : (
              <>
                <Plus size={20} />
                Legg til i økt
              </>
            )}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
