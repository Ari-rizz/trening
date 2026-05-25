'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Dumbbell } from 'lucide-react';
import { Exercise } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface ExerciseCardProps {
  exercise: Exercise;
  onAdd?: (exercise: Exercise) => void;
  onSelect?: (exercise: Exercise) => void;
  compact?: boolean;
}

function ExerciseImage({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [error, setError] = useState(false);
  if (!src || error) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

export function ExerciseCard({ exercise, onAdd, onSelect, compact }: ExerciseCardProps) {
  const color = getMuscleGroupColor(exercise.muscle_group);
  const label = getMuscleGroupLabel(exercise.muscle_group);
  const imageUrl = exercise.image_url || exercise.images?.[0] || '';

  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => onSelect?.(exercise)}
        className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-800 active:bg-zinc-800 cursor-pointer"
      >
        {/* Thumbnail */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: color + '22', border: `1px solid ${color}33` }}
        >
          {imageUrl ? (
            <ExerciseImage src={imageUrl} alt={exercise.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Dumbbell size={18} style={{ color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{exercise.name}</p>
          <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
        </div>
        {onAdd && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onAdd(exercise); }}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + '22', border: `1px solid ${color}66` }}
          >
            <Plus size={16} style={{ color }} />
          </motion.button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect?.(exercise)}
      className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden cursor-pointer"
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base leading-tight">{exercise.name}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: color + '22', color }}
              >
                {label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400">
                {exercise.equipment}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400 capitalize">
                {exercise.difficulty}
              </span>
            </div>
            {exercise.secondary_muscles.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">
                Sekundær: {exercise.secondary_muscles.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
          {onAdd && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); onAdd(exercise); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color, color: 'white' }}
            >
              <Plus size={20} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
