'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Ruler, Target, ArrowRight, AtSign, Calendar, ShieldCheck, Search, Check, X, Dumbbell, Heart, Activity, Flame } from 'lucide-react';
import { supabase, Exercise } from '@/lib/supabase';
import { getMuscleGroupColor, getMuscleGroupLabel, MUSCLE_GROUPS } from '@/lib/exercises-data';
import { searchExercises } from '@/lib/exercise-search';
import { TermsAcceptanceCheckbox } from './TermsAcceptanceCheckbox';
import { connectHealthApp, isHealthAvailable } from '@/lib/health';

interface OnboardingFlowProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

export function OnboardingFlow({ userId, userEmail, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  // Step 1: Name & DOB
  const [fullName, setFullName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Step 2: Username
  const [username, setUsername] = useState('');

  // Step 3: Physical (optional)
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState('');

  // Step 4: Training level & goal
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [trainingGoal, setTrainingGoal] = useState('');

  // Step 5: Training frequency & equipment
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState('');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);

  // Step 6: Pin exercises
  const [trackedExercises, setTrackedExercises] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [muscleFilter, setMuscleFilter] = useState<string>('all');

  // Step 7: Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 8: Health connection
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [healthConnecting, setHealthConnecting] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);

  const totalSteps = 8;

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        date_of_birth: (dobYear.length === 4 && dobMonth && dobDay)
          ? `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`
          : null,
        username: username.trim() || undefined,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        gender: gender || null,
        fitness_level: fitnessLevel || null,
        training_goal: trainingGoal || null,
        workout_frequency: trainingDaysPerWeek ? parseInt(trainingDaysPerWeek, 10) : null,
        available_equipment: availableEquipment.length > 0 ? availableEquipment : null,
        tracked_exercises: trackedExercises.length > 0 ? trackedExercises : [],
        terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
        terms_version: termsAccepted ? 'v1' : null,
        onboarding_completed: true,
      })
      .eq('id', userId);

    setLoading(false);
    if (!error) {
      onComplete();
    }
  };

  const handleConnectHealth = async () => {
    setHealthConnecting(true);
    const result = await connectHealthApp(userId);
    setHealthConnecting(false);
    if (result.success) {
      setHealthConnected(true);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      saveProfile();
    }
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      saveProfile();
    }
  };

  const checkUsername = async (value: string) => {
    setUsername(value);
    if (!value.trim()) {
      setUsernameError('');
      return;
    }
    const clean = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (clean.length < 3) {
      setUsernameError('Brukernavn må være minst 3 tegn');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .neq('id', userId)
      .maybeSingle();
    if (error) return;
    if (data) setUsernameError('Brukernavnet er tatt');
    else setUsernameError('');
  };

  const canProceed = () => {
    if (step === 1) return fullName.trim().length > 0;
    if (step === 2) return username.trim().length >= 3 && !usernameError;
    if (step === 7) return termsAccepted;
    return true;
  };

  useEffect(() => {
    if (step === 6 && allExercises.length === 0) {
      supabase
        .from('exercises')
        .select('id, name, muscle_group, secondary_muscles, equipment, nicknames')
        .order('name')
        .then(({ data }) => {
          if (data) setAllExercises(data as Exercise[]);
        });
    }
    if (step === 8 && !healthAvailable) {
      isHealthAvailable().then(a => setHealthAvailable(a.available));
    }
  }, [step, allExercises.length, healthAvailable]);

  const equipmentOptions = [
    { value: 'barbell', label: 'Stang' },
    { value: 'dumbbell', label: 'Dumbbell' },
    { value: 'cable', label: 'Kabel' },
    { value: 'machine', label: 'Maskiner' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'bodyweight', label: 'Kroppsvekt' },
    { value: 'bands', label: 'Elastikk' },
  ];

  const toggleEquipment = (value: string) => {
    setAvailableEquipment(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div className="flex flex-col h-screen bg-black px-6 pt-16 pb-8 overflow-hidden">
      {/* Progress bar */}
      <div className="flex gap-2 mb-10 flex-shrink-0">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? 'bg-red-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 pb-2 scrollbar-hide">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-5">
              <User size={24} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hva heter du?</h1>
            <p className="text-zinc-500 text-sm mb-8">Fortell oss litt om deg selv</p>

            <div className="space-y-4 min-w-0">
              <div className="min-w-0">
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Fullt navn</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ola Nordmann"
                  className="w-full max-w-full min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                  autoComplete="name"
                />
              </div>
              <div className="min-w-0">
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Fødselsdato (valgfritt)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={dobDay}
                    onChange={e => setDobDay(e.target.value.slice(0, 2))}
                    placeholder="DD"
                    min={1}
                    max={31}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors text-center"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={dobMonth}
                    onChange={e => setDobMonth(e.target.value.slice(0, 2))}
                    placeholder="MM"
                    min={1}
                    max={12}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors text-center"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={dobYear}
                    onChange={e => setDobYear(e.target.value.slice(0, 4))}
                    placeholder="ÅÅÅÅ"
                    min={1900}
                    max={new Date().getFullYear()}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors text-center"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
              <AtSign size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Velg brukernavn</h1>
            <p className="text-zinc-500 text-sm mb-8">Synes når du deler treningsplaner</p>

            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Brukernavn</label>
              <input
                type="text"
                value={username}
                onChange={e => checkUsername(e.target.value)}
                placeholder="ola_nordmann"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors lowercase"
                autoCapitalize="none"
                autoCorrect="off"
              />
              {usernameError && (
                <p className="text-red-400 text-xs mt-2">{usernameError}</p>
              )}
              {!usernameError && username.trim().length >= 3 && (
                <p className="text-green-400 text-xs mt-2">Ledig!</p>
              )}
              <p className="text-zinc-600 text-xs mt-2">Bare bokstaver, tall og understrek. Minst 3 tegn.</p>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
              <Ruler size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Fysiske data</h1>
            <p className="text-zinc-500 text-sm mb-8">Valgfritt — du kan fylle dette inn senere</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Høyde (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
                  placeholder="178"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Vekt (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                  placeholder="80"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Kjønn</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Mann' },
                    { value: 'female', label: 'Kvinne' },
                    { value: 'other', label: 'Annet' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGender(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                        gender === opt.value
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-5">
              <Target size={24} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Treningsmål</h1>
            <p className="text-zinc-500 text-sm mb-8">Valgfritt — hjelper oss med å tilpasse opplevelsen</p>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-2 block">Treningsnivå</label>
                <div className="space-y-2">
                  {[
                    { value: 'beginner', label: 'Nybegynner', desc: 'Mindre enn 6 måneder med trening' },
                    { value: 'intermediate', label: 'Intermediær', desc: '6 måneder til 2 år med trening' },
                    { value: 'advanced', label: 'Avansert', desc: 'Mer enn 2 år med trening' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFitnessLevel(opt.value)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                        fitnessLevel === opt.value
                          ? 'bg-red-500/20 border-red-500/50'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <p className={`text-sm font-medium ${fitnessLevel === opt.value ? 'text-red-400' : 'text-white'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium mb-2 block">Hovedmål</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'strength', label: 'Styrke' },
                    { value: 'hypertrophy', label: 'Muskelvekst' },
                    { value: 'endurance', label: 'Utholdenhet' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTrainingGoal(opt.value)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                        trainingGoal === opt.value
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-5">
              <Calendar size={24} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Treningsvaner</h1>
            <p className="text-zinc-500 text-sm mb-8">Valgfritt — hjelper oss med å anbefale planer</p>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-2 block">Dager per uke</label>
                <div className="grid grid-cols-4 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTrainingDaysPerWeek(opt)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                        trainingDaysPerWeek === opt
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 font-medium mb-2 block">Tilgjengelig utstyr</label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleEquipment(opt.value)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        availableEquipment.includes(opt.value)
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
              <Dumbbell size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Velg øvelser å følge</h1>
            <p className="text-zinc-500 text-sm mb-6">Valgfritt — velg 3–5 øvelser du vil følge tett på. Du kan endre dette senere.</p>

            {/* Selected counter */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${trackedExercises.length > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {trackedExercises.length} valgt
              </span>
            </div>

            {/* Selected chips */}
            {trackedExercises.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {trackedExercises.map(id => {
                  const ex = allExercises.find(e => e.id === id);
                  if (!ex) return null;
                  const color = getMuscleGroupColor(ex.muscle_group);
                  return (
                    <div key={id} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full pl-2.5 pr-1 py-1">
                      <span className="text-xs font-medium text-white">{ex.name}</span>
                      <button
                        onClick={() => setTrackedExercises(prev => prev.filter(x => x !== id))}
                        className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center"
                      >
                        <X size={11} className="text-zinc-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={exerciseSearch}
                onChange={e => setExerciseSearch(e.target.value)}
                placeholder="Søk etter øvelser…"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Muscle group category filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide -mx-1 px-1">
              <button
                onClick={() => setMuscleFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                  muscleFilter === 'all'
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Alle
              </button>
              {MUSCLE_GROUPS.map(mg => (
                <button
                  key={mg.value}
                  onClick={() => setMuscleFilter(muscleFilter === mg.value ? 'all' : mg.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
                    muscleFilter === mg.value
                      ? 'text-white border-transparent'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                  style={muscleFilter === mg.value ? { backgroundColor: mg.color, borderColor: mg.color } : undefined}
                >
                  {mg.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pb-2">
              {(() => {
                let results = searchExercises(allExercises, exerciseSearch);
                if (muscleFilter !== 'all') {
                  results = results.filter(ex => ex.muscle_group === muscleFilter);
                }
                const sliced = results.slice(0, 50);
                if (sliced.length === 0) {
                  return (
                    <div className="py-8 text-center">
                      <p className="text-zinc-600 text-sm">Ingen øvelser funnet</p>
                    </div>
                  );
                }
                return sliced.map(ex => {
                  const isSelected = trackedExercises.includes(ex.id);
                  const color = getMuscleGroupColor(ex.muscle_group);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setTrackedExercises(prev =>
                          isSelected ? prev.filter(x => x !== ex.id) : [...prev, ex.id]
                        );
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40'
                          : 'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: color + '22' }}
                      >
                        <Dumbbell size={16} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ex.name}</p>
                        <p className="text-xs" style={{ color }}>{getMuscleGroupLabel(ex.muscle_group)}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-zinc-800'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}

        {step === 7 && (
          <motion.div
            key="step7"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-5">
              <ShieldCheck size={24} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Betingelser</h1>
            <p className="text-zinc-500 text-sm mb-8">Siste steget før du kan starte</p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <TermsAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
            </div>
          </motion.div>
        )}

        {step === 8 && (
          <motion.div
            key="step8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col min-w-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mb-5">
              <Heart size={24} className="text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Koble til helse</h1>
            <p className="text-zinc-500 text-sm mb-8">Se kalorier brent direkte på hjem-skjermen</p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Activity size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Kalorier fra treningsklokke</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Les kalorier fra Apple Health eller Health Connect</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Flame size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Daglig oversikt</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Se total kalorier brent hver dag, og sveip gjennom historikk</p>
                </div>
              </div>
            </div>

            {healthConnected ? (
              <div className="mt-4 flex items-center gap-2 text-green-400 text-sm">
                <Check size={18} />
                <span>Helseappen er koblet til!</span>
              </div>
            ) : healthAvailable ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConnectHealth}
                disabled={healthConnecting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {healthConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Heart size={16} />
                    Koble til helse
                  </>
                )}
              </motion.button>
            ) : (
              <p className="text-zinc-600 text-xs mt-4 text-center">Helseappen er ikke tilgjengelig på denne enheten</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="mt-6 space-y-3 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canProceed() || loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step === totalSteps ? (
            'Fullfør og start'
          ) : (
            <>
              Neste
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>

        {step > 1 && step !== 2 && step !== 7 && (
          <button
            onClick={handleSkip}
            className="w-full text-zinc-500 hover:text-zinc-300 text-sm font-medium py-2 transition-colors"
          >
            Hopp over
          </button>
        )}
      </div>
    </div>
  );
}
