'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Loader as Loader2 } from 'lucide-react';
import { Exercise, MuscleGroup, Equipment, Difficulty } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { MUSCLE_GROUPS, EQUIPMENT_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/exercises-data';
import { ExerciseCard } from './ExerciseCard';
import { ExerciseDetail } from './ExerciseDetail';
import { useAppStore } from '@/lib/store';

interface ExercisesTabProps {
  onAddToWorkout?: (exercise: Exercise) => void;
}

export function ExercisesTab({ onAddToWorkout }: ExercisesTabProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const cachedExercises = useAppStore(s => s.cachedExercises);
  const setCachedExercises = useAppStore(s => s.setCachedExercises);

  useEffect(() => {
    if (cachedExercises.length > 200) {
      setExercises(cachedExercises);
      return;
    }
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    try {
      // Fetch all exercises from Supabase (paginated in batches of 1000)
      const allExercises: Exercise[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .eq('is_custom', false)
          .order('name', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allExercises.push(...(data as Exercise[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setExercises(allExercises);
      setCachedExercises(allExercises);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return exercises.filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedMuscle && e.muscle_group !== selectedMuscle) return false;
      if (selectedEquipment && e.equipment !== selectedEquipment) return false;
      if (selectedDifficulty && e.difficulty !== selectedDifficulty) return false;
      return true;
    });
  }, [exercises, search, selectedMuscle, selectedEquipment, selectedDifficulty]);

  const grouped = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    filtered.forEach(e => {
      if (!groups[e.muscle_group]) groups[e.muscle_group] = [];
      groups[e.muscle_group].push(e);
    });
    return groups;
  }, [filtered]);

  const hasFilters = selectedMuscle || selectedEquipment || selectedDifficulty;

  const clearFilters = () => {
    setSelectedMuscle(null);
    setSelectedEquipment(null);
    setSelectedDifficulty(null);
  };

  return (
    <AnimatePresence mode="wait">
      {selectedExercise ? (
        <ExerciseDetail
          key="detail"
          exercise={selectedExercise}
          onBack={() => setSelectedExercise(null)}
          onAdd={onAddToWorkout ? () => { onAddToWorkout(selectedExercise); setSelectedExercise(null); } : undefined}
        />
      ) : (
    <motion.div
      key="list"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 35, stiffness: 500 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-1">
        <h1 className="text-2xl font-bold text-white">Øvelser</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Utforsk hundrevis av øvelser med instruksjoner</p>
      </div>
      {/* Search */}
      <div data-tour="exercises-search" className="px-4 pt-3 pb-2 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Søk etter øvelse..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X size={16} className="text-zinc-500" />
            </button>
          )}
        </div>

        {/* Muscle group pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              hasFilters
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <Filter size={12} />
            Filter
            {hasFilters && (
              <span className="bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {[selectedMuscle, selectedEquipment, selectedDifficulty].filter(Boolean).length}
              </span>
            )}
          </motion.button>

          {MUSCLE_GROUPS.map(mg => (
            <motion.button
              key={mg.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedMuscle(selectedMuscle === mg.value ? null : mg.value)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={
                selectedMuscle === mg.value
                  ? { backgroundColor: mg.color, borderColor: mg.color, color: 'white' }
                  : { backgroundColor: 'transparent', borderColor: mg.color + '44', color: mg.color }
              }
            >
              {mg.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-3">
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5 font-medium">Utstyr</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_OPTIONS.map(eq => (
                      <button
                        key={eq.value}
                        onClick={() => setSelectedEquipment(selectedEquipment === eq.value ? null : eq.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedEquipment === eq.value ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {eq.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1.5 font-medium">Vanskelighetsgrad</p>
                  <div className="flex gap-1.5">
                    {DIFFICULTY_OPTIONS.map(d => (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDifficulty(selectedDifficulty === d.value ? null : d.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedDifficulty === d.value ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-red-400 font-medium">
                    Fjern alle filtre
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500">{filtered.length} øvelser</p>
          {loading && <Loader2 size={12} className="text-zinc-600 animate-spin" />}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {loading && exercises.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-zinc-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {Object.entries(grouped).map(([group, exs]) => {
          const mg = MUSCLE_GROUPS.find(m => m.value === group);
          return (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mg?.color }} />
                <h3 className="text-sm font-bold text-white">{mg?.label ?? group}</h3>
                <span className="text-xs text-zinc-600">{exs.length}</span>
              </div>
              <div className="space-y-2">
                {exs.map(exercise => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onAdd={onAddToWorkout}
                    onSelect={setSelectedExercise}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
