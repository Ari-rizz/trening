'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkActiveIAPSubscription } from '@/lib/iap';
import { PaywallScreen } from './PaywallScreen';

type AccessState =
  | 'loading'
  | 'trial_active'
  | 'subscribed'
  | 'canceling'
  | 'blocked_no_trial'
  | 'blocked_trial_expired';

interface SubscriptionGateProps {
  userId: string;
  children: React.ReactNode;
}

const ACTIVE_STATUSES = ['active', 'trialing'];

export function SubscriptionGate({ userId, children }: SubscriptionGateProps) {
  const [access, setAccess] = useState<AccessState>('loading');
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const checkAccess = async () => {
    const [{ data: profile }, { data: sub }, iapActive] = await Promise.all([
      supabase
        .from('profiles')
        .select('trial_ends_at, is_lifetime')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, cancel_at_period_end, current_period_end')
        .maybeSingle(),
      checkActiveIAPSubscription(userId),
    ]);

    if (profile?.is_lifetime || iapActive) {
      setAccess('subscribed');
      return;
    }

    const status = (sub as any)?.subscription_status ?? null;
    if (status && ACTIVE_STATUSES.includes(status)) {
      setAccess((sub as any)?.cancel_at_period_end ? 'canceling' : 'subscribed');
      return;
    }

    const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    if (trialEndsAt && trialEndsAt > new Date()) {
      const msLeft = trialEndsAt.getTime() - Date.now();
      setTrialDaysLeft(Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      setAccess('trial_active');
      return;
    }

    setAccess(trialEndsAt ? 'blocked_trial_expired' : 'blocked_no_trial');
  };

  useEffect(() => {
    checkAccess();
  }, [userId]);

  if (access === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (access === 'blocked_no_trial') {
    return (
      <PaywallScreen
        userId={userId}
        mode="fresh"
        onSubscribed={() => checkAccess()}
        onTrialStarted={() => checkAccess()}
      />
    );
  }

  if (access === 'blocked_trial_expired') {
    return (
      <PaywallScreen
        userId={userId}
        mode="expired"
        onSubscribed={() => checkAccess()}
        onTrialStarted={() => {}}
      />
    );
  }

  return (
    <>
      {children}
      {access === 'trial_active' && trialDaysLeft <= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none"
        >
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm font-medium">
              {trialDaysLeft === 1
                ? 'Siste dag av prøveperioden'
                : `${trialDaysLeft} dager igjen av prøveperioden`}
            </p>
          </div>
        </motion.div>
      )}
    </>
  );
}
