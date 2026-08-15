'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronUp, Dumbbell, Plus, CirclePlus as PlusCircle, Calendar, Clock, Loader as Loader2 } from 'lucide-react';
import { Program, ProgramDay, ProgramLevel } from '@/lib/programs-data';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface ProgramDetailProps {
  program: Program;
  onBack: () => void;
  onAddDay: (day: ProgramDay, program: Program) => void;
  onAddAll: (program: Program) => void;
  addingAll: boolean;
}

const levelConfig: Record<ProgramLevel, { label: string; color: string; bg: string }> = {
  beginner: { label: 'Nybegynner', color: '#4ade80', bg: '#4ade8022' },
  intermediate: { label: 'Middels', color: '#fbbf24', bg: '#fbbf2422' },
  advanced: { label: 'Avansert', color: '#f87171', bg: '#f8717122' },
};

export function ProgramDetail({ program, onBack, onAddDay, onAddAll, addingAll }: ProgramDetailProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(program.days[0]?.id ?? null);
  const lvl = levelConfig[program.level];

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pb-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)',
          background: `linear-gradient(135deg, ${program.accentColor}22 0%, transparent 60%)`,
          borderBottom: `1px solid ${program.accentColor}33`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center"
          >
            <ArrowLeft size={16} className="text-white" />
          </motion.button>
          <span className="text-zinc-400 text-sm">IronGrid Programs</span>
        </div>

        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: program.accentColor + '22', border: `1px solid ${program.accentColor}44` }}
          >
            <Dumbbell size={22} style={{ color: program.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight">{program.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={{ backgroundColor: lvl.bg, color: lvl.color }}
              >
                {lvl.label}
              </span>
              <span className="flex items-center gap-1 text-zinc-500 text-xs">
                <Calendar size={10} />
                {program.daysPerWeek} dager/uke
              </span>
              <span className="flex items-center gap-1 text-zinc-500 text-xs">
                <Clock size={10} />
                {program.durationWeeks} uker
              </span>
            </div>
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed mb-3">{program.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {program.tags.map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{
                backgroundColor: getMuscleGroupColor(tag) + '22',
                color: getMuscleGroupColor(tag),
              }}
            >
              {getMuscleGroupLabel(tag)}
            </span>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onAddAll(program)}
          disabled={addingAll}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{ backgroundColor: program.accentColor }}
        >
          {addingAll ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <PlusCircle size={16} />
          )}
          {addingAll ? 'Legger til...' : 'Legg til hele programmet'}
        </motion.button>
      </div>

      {/* Days list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-2">
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">
          {program.days.length} treningsdager
        </p>

        {program.days.map((day, dayIdx) => {
          const isExpanded = expandedDay === day.id;
          return (
            <div
              key={day.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
            >
              {/* Day header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                onClick={() => setExpandedDay(isExpanded ? null : day.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: program.accentColor + '22', color: program.accentColor }}
                  >
                    {dayIdx + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{day.name}</p>
                    <p className="text-zinc-500 text-xs">{day.exercises.length} øvelser</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-zinc-500" />
                ) : (
                  <ChevronDown size={16} className="text-zinc-500" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-zinc-800/60 space-y-2">
                      {day.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Dumbbell size={11} className="text-zinc-600 flex-shrink-0" />
                            <span className="text-zinc-300 text-xs truncate">{ex.exerciseName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {ex.durationSeconds ? (
                              <span className="text-zinc-500 text-[10px] font-medium whitespace-nowrap">
                                {ex.sets}x{ex.durationSeconds}sek
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[10px] font-medium whitespace-nowrap">
                                {ex.sets}x{ex.reps}
                              </span>
                            )}
                            {ex.restSeconds > 0 && (
                              <span className="text-zinc-600 text-[10px] whitespace-nowrap">
                                {ex.restSeconds}s hvile
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onAddDay(day, program)}
                        className="w-full mt-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        style={{
                          borderColor: program.accentColor + '55',
                          color: program.accentColor,
                          backgroundColor: program.accentColor + '11',
                        }}
                      >
                        <Plus size={13} />
                        Legg til i mine planer
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
