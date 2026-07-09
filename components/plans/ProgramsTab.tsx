'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Dumbbell, Calendar, Clock } from 'lucide-react';
import { PROGRAMS, Program, ProgramLevel } from '@/lib/programs-data';
import { getMuscleGroupColor, getMuscleGroupLabel } from '@/lib/exercises-data';

interface ProgramsTabProps {
  onSelectProgram: (program: Program) => void;
}

const levelConfig: Record<ProgramLevel, { label: string; color: string; bg: string }> = {
  beginner: { label: 'Nybegynner', color: '#4ade80', bg: '#4ade8022' },
  intermediate: { label: 'Middels', color: '#fbbf24', bg: '#fbbf2422' },
  advanced: { label: 'Avansert', color: '#f87171', bg: '#f8717122' },
};

export function ProgramsTab({ onSelectProgram }: ProgramsTabProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-3">
      {PROGRAMS.map((program, i) => {
        const lvl = levelConfig[program.level];
        return (
          <motion.button
            key={program.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectProgram(program)}
            className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex"
          >
            {/* Accent bar */}
            <div className="w-1 flex-shrink-0" style={{ backgroundColor: program.accentColor }} />

            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-base leading-tight">{program.name}</h3>
                  <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">{program.shortDescription}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600 flex-shrink-0 mt-0.5" />
              </div>

              {/* Badges row */}
              <div className="flex items-center flex-wrap gap-1.5 mb-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: lvl.bg, color: lvl.color }}
                >
                  {lvl.label}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                  <Calendar size={9} />
                  {program.daysPerWeek} dager/uke
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                  <Clock size={9} />
                  {program.durationWeeks} uker
                </span>
              </div>

              {/* Muscle group tags */}
              <div className="flex flex-wrap gap-1">
                {program.tags.slice(0, 5).map(tag => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    style={{
                      backgroundColor: getMuscleGroupColor(tag) + '22',
                      color: getMuscleGroupColor(tag),
                    }}
                  >
                    {getMuscleGroupLabel(tag)}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
