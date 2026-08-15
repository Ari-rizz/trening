'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { OnboardingFlow } from './OnboardingFlow';
import { IntroTour } from './IntroTour';
import { SubscriptionGate } from './SubscriptionGate';
import { UpdatePasswordScreen } from './UpdatePasswordScreen';
import { WelcomeScreen } from './WelcomeScreen';

type AuthScreen = 'welcome' | 'login' | 'register' | 'forgot-password';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [introTourDone, setIntroTourDone] = useState<boolean | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        checkOnboarding(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setLoading(false);
        return;
      }
      setSession(session);
      if (session?.user?.id) {
        checkOnboarding(session.user.id);
      } else {
        setOnboardingDone(null);
        setIntroTourDone(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed, intro_tour_completed')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setOnboardingDone(data.onboarding_completed);
      setIntroTourDone(data.intro_tour_completed ?? false);
    } else {
      // Profile row missing (user created before trigger existed) -- create it
      await supabase.from('profiles').insert({ id: userId });
      setOnboardingDone(false);
      setIntroTourDone(false);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
            <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-10 h-10 object-contain" />
          </div>
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  if (passwordRecovery) {
    return (
      <UpdatePasswordScreen
        onComplete={() => {
          setPasswordRecovery(false);
          setAuthScreen('login');
        }}
      />
    );
  }

  if (!session) {
    if (authScreen === 'welcome') {
      return (
        <WelcomeScreen
          onCreateAccount={() => setAuthScreen('register')}
          onLogin={() => setAuthScreen('login')}
        />
      );
    }
    if (authScreen === 'register') {
      return <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} onBackToWelcome={() => setAuthScreen('welcome')} />;
    }
    if (authScreen === 'forgot-password') {
      return <ForgotPasswordScreen onBack={() => setAuthScreen('login')} />;
    }
    return (
      <LoginScreen
        onSwitchToRegister={() => setAuthScreen('register')}
        onSwitchToForgotPassword={() => setAuthScreen('forgot-password')}
        onBackToWelcome={() => setAuthScreen('welcome')}
      />
    );
  }

  if (onboardingDone === false) {
    return (
      <OnboardingFlow
        userId={session.user.id}
        userEmail={session.user.email}
        onComplete={() => setOnboardingDone(true)}
      />
    );
  }

  // Show intro tour overlay on top of the app the first time
  return (
    <SubscriptionGate userId={session.user.id}>
      {children}
      {onboardingDone === true && introTourDone === false && (
        <IntroTour
          userId={session.user.id}
          onComplete={() => setIntroTourDone(true)}
        />
      )}
    </SubscriptionGate>
  );
}
