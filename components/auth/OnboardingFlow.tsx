'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Ruler, Target, ArrowRight, AtSign, Calendar, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TermsAcceptanceCheckbox } from './TermsAcceptanceCheckbox';

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
  const [dateOfBirth, setDateOfBirth] = useState('');

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

  // Step 6: Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  const totalSteps = 6;

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        date_of_birth: dateOfBirth || null,
        username: username.trim() || undefined,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        gender: gender || null,
        fitness_level: fitnessLevel || null,
        training_goal: trainingGoal || null,
        workout_frequency: trainingDaysPerWeek ? parseInt(trainingDaysPerWeek, 10) : null,
        available_equipment: availableEquipment.length > 0 ? availableEquipment : null,
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
    if (step === 6) return termsAccepted;
    return true;
  };

  const equipmentOptions = [
    { value: 'barbell', label: 'Stang' },
    { value: 'dumbbell', label: 'Hantler' },
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
    <div className="flex flex-col min-h-screen bg-black px-6 pt-16 pb-8">
      {/* Progress bar */}
      <div className="flex gap-2 mb-10">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < step ? 'bg-red-500' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-5">
              <User size={24} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Hva heter du?</h1>
            <p className="text-zinc-500 text-sm mb-8">Fortell oss litt om deg selv</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Fullt navn</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ola Nordmann"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Fødselsdato (valgfritt)</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors [color-scheme:dark]"
                />
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
            className="flex-1 flex flex-col"
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
            className="flex-1 flex flex-col"
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
            className="flex-1 flex flex-col"
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
            className="flex-1 flex flex-col"
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
            className="flex-1 flex flex-col"
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
      </AnimatePresence>

      {/* Bottom actions */}
      <div className="mt-8 space-y-3">
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

        {step > 1 && step !== 2 && step !== 6 && (
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
