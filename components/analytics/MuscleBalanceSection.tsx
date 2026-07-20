'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, CircleAlert as AlertCircle, Info } from 'lucide-react';
import { MuscleActivation } from '@/lib/supabase';
import { fetchMuscleActivation, recomputeMuscleActivation, calculateBalance, generateRecommendations } from '@/lib/muscle-balance';
import { MUSCLE_REGIONS } from '@/lib/muscle-regions';

export function MuscleBalanceSection() {
  const [activations, setActivations] = useState<MuscleActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchMuscleActivation();
    setActivations(data);
    setLoading(false);
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    await recomputeMuscleActivation();
    await load();
    setRecomputing(false);
  };

  const balances = calculateBalance(activations);
  const recommendations = generateRecommendations(balances);
  const hasData = activations.length > 0;

  if (loading) {
    return (
      <div className="px-4 mb-4">
        <h2 className="text-2xl font-bold text-white mb-3">Muskelbalanse</h2>
        <div className="h-32 bg-zinc-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-white">Muskelbalanse</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRecompute}
            disabled={recomputing}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
          >
            <RefreshCw size={16} className={`text-white ${recomputing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <Activity size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm font-medium">Ingen balansedata ennå</p>
          <p className="text-zinc-600 text-xs mt-1 mb-4">Beregn basert på dine fullførte økter</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRecompute}
            disabled={recomputing}
            className="bg-blue-500 disabled:bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
          >
            <RefreshCw size={14} className={recomputing ? 'animate-spin' : ''} />
            Beregn nå
          </motion.button>
        </div>
      </div>
    );
  }

  const maxVolume = Math.max(...balances.map(b => b.totalVolume), 1);

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-white">Muskelbalanse</h2>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRecompute}
          disabled={recomputing}
          className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"
        >
          <RefreshCw size={16} className={`text-white ${recomputing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Region bars */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-3">
        <div className="space-y-2.5">
          {balances.map(b => {
            const width = maxVolume > 0 ? (b.totalVolume / maxVolume) * 100 : 0;
            const color = b.status === 'undertrained' ? '#ef4444' : b.status === 'overtrained' ? '#f59e0b' : '#3b82f6';
            return (
              <div key={b.region}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-300 text-xs">{b.label}</span>
                  <span className="text-zinc-500 text-xs font-mono">{b.percentage}%</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-xl px-4 py-3 border ${
                rec.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              {rec.severity === 'warning' ? (
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-semibold ${rec.severity === 'warning' ? 'text-amber-300' : 'text-blue-300'}`}>
                  {rec.title}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
