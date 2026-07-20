'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Dumbbell, Trophy, ChartBar as BarChart2, History, Timer, Download, X, ArrowUp, MoveHorizontal as MoreHorizontal, Plus, AtSign, Check, Pencil, CreditCard, Clock, TriangleAlert as AlertTriangle, RefreshCw, CircleCheck as CheckCircle2, MessageSquare, Bell, FileText, Shield } from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';
import { nb } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cancelSubscription, createCheckoutSession } from '@/lib/stripe';
import { useAppStore } from '@/lib/store';
import { FeedbackSheet } from '@/components/profile/FeedbackSheet';
import { NotificationSettingsSheet } from '@/components/profile/NotificationSettingsSheet';
import { getTrialDaysLeft } from '@/lib/trial';

const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? '';

interface Profile {
  full_name: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: string | null;
  fitness_level: string | null;
  training_goal: string | null;
  username: string | null;
  trial_ends_at: string | null;
}

interface SubscriptionInfo {
  subscription_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: number | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

export function ProfileTab() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [stats, setStats] = useState({ workouts: 0, volume: 0, prs: 0 });
  const { defaultRestSeconds, setDefaultRestSeconds } = useAppStore();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && isSafari;

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallModal(false);
    } else {
      setShowInstallModal(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        fetchProfile(data.session.user.id);
        fetchStats(data.session.user.id);
        fetchSubscription();
      }
    });
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
        fetchStats(session.user.id);
        fetchSubscription();
      }
    });
    return () => authSub.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, date_of_birth, height_cm, weight_kg, gender, fitness_level, training_goal, username, trial_ends_at')
      .eq('id', uid)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setUsernameInput(data.username ?? '');
    }
  };

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from('stripe_user_subscriptions')
      .select('subscription_status, cancel_at_period_end, current_period_end, payment_method_brand, payment_method_last4')
      .maybeSingle();
    setSubscription(data as SubscriptionInfo | null);
  };

  const handleSaveUsername = async () => {
    if (!session?.user?.id) return;
    const trimmed = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (trimmed.length < 3) {
      setUsernameError('Brukernavn må ha minst 3 tegn');
      return;
    }
    setUsernameSaving(true);
    setUsernameError(null);

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', session.user.id);

    if (error?.code === '23505') {
      setUsernameError('Dette brukernavnet er allerede i bruk');
    } else if (error) {
      setUsernameError('Noe gikk galt, prøv igjen');
    } else {
      setProfile(prev => prev ? { ...prev, username: trimmed } : prev);
      setUsernameInput(trimmed);
      setEditingUsername(false);
      setUsernameSaved(true);
      setTimeout(() => setUsernameSaved(false), 2000);
    }
    setUsernameSaving(false);
  };

  const fetchStats = async (uid: string) => {
    const [{ count: workouts }, { count: prs }, { data: volumeData }] = await Promise.all([
      supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_completed', true),
      supabase.from('personal_records').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('workouts').select('total_volume_kg').eq('user_id', uid).eq('is_completed', true),
    ]);
    const volume = (volumeData ?? []).reduce((a, w) => a + (w.total_volume_kg ?? 0), 0);
    setStats({ workouts: workouts ?? 0, volume: Math.round(volume), prs: prs ?? 0 });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      await cancelSubscription();
      setShowCancelConfirm(false);
      await fetchSubscription();
    } catch (err: any) {
      setCancelError(err.message ?? 'Noe gikk galt. Prøv igjen.');
    }
    setCancelLoading(false);
  };

  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = await createCheckoutSession(
        PRICE_ID,
        `${origin}/?payment=success`,
        `${origin}/?payment=cancel`,
      );
      window.location.href = url;
    } catch (err: any) {
      setCancelError(err.message ?? 'Noe gikk galt.');
      setSubscribeLoading(false);
    }
  };

  const displayName = profile?.full_name || session?.user?.email?.split('@')[0] || 'Bruker';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0].toUpperCase())
    .slice(0, 2)
    .join('');

  const subStatus = subscription?.subscription_status ?? null;
  const isSubscribed = subStatus === 'active' || subStatus === 'trialing';
  const isCanceling = isSubscribed && subscription?.cancel_at_period_end;
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialActive = trialEndsAt && trialEndsAt > new Date();
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;
  const periodEndDate = subscription?.current_period_end
    ? format(fromUnixTime(subscription.current_period_end), 'd. MMMM yyyy', { locale: nb })
    : null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Innstillinger og kontoinformasjon</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {/* User card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <span className="text-red-400 font-bold text-lg">{initials}</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">{displayName}</p>
              <p className="text-zinc-500 text-sm">{session?.user?.email}</p>
            </div>
          </div>

          {/* Username section */}
          <div className="border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AtSign size={14} className="text-zinc-500" />
                <span className="text-zinc-400 text-sm font-medium">Brukernavn for deling</span>
              </div>
              {!editingUsername && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setEditingUsername(true);
                    setUsernameError(null);
                  }}
                  className="flex items-center gap-1.5 text-zinc-500 text-xs"
                >
                  <Pencil size={12} />
                  Endre
                </motion.button>
              )}
            </div>

            {editingUsername ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={e => {
                      setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
                      setUsernameError(null);
                    }}
                    placeholder="brukernavn"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-zinc-500"
                    maxLength={20}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSaveUsername}
                    disabled={usernameSaving}
                    className="w-10 h-10 bg-blue-500 disabled:bg-zinc-700 rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    {usernameSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={16} className="text-white" />
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setEditingUsername(false);
                      setUsernameInput(profile?.username ?? '');
                      setUsernameError(null);
                    }}
                    className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    <X size={16} className="text-zinc-400" />
                  </motion.button>
                </div>
                {usernameError && (
                  <p className="text-red-400 text-xs">{usernameError}</p>
                )}
                <p className="text-zinc-600 text-xs">Kun bokstaver (a-z), tall og understrek. Vises når du deler planer.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {profile?.username ? (
                  <p className="text-white text-sm font-mono bg-zinc-800 px-3 py-1.5 rounded-lg">{profile.username}</p>
                ) : (
                  <p className="text-zinc-600 text-sm italic">Ikke satt</p>
                )}
                {usernameSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 text-xs flex items-center gap-1"
                  >
                    <Check size={12} />
                    Lagret
                  </motion.span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <Dumbbell size={18} className="text-red-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.workouts}</p>
            <p className="text-zinc-600 text-xs">Økter</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <BarChart2 size={18} className="text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.volume >= 1000 ? `${(stats.volume / 1000).toFixed(0)}t` : stats.volume}</p>
            <p className="text-zinc-600 text-xs">kg volum</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <Trophy size={18} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-white font-bold text-xl">{stats.prs}</p>
            <p className="text-zinc-600 text-xs">PR-er</p>
          </div>
        </div>

        {/* Subscription card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={16} className="text-zinc-400" />
            <span className="text-white font-semibold text-sm">Mitt abonnement</span>
          </div>

          {trialActive && !isSubscribed && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <Clock size={16} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-semibold">
                    {trialDaysLeft === 1 ? 'Siste dag' : `${trialDaysLeft} dager`} igjen av prøveperioden
                  </p>
                  <p className="text-amber-400/70 text-xs mt-0.5">
                    Utløper {format(trialEndsAt!, 'd. MMMM yyyy', { locale: nb })}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {subscribeLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Abonner nå — 30 kr/mnd'
                )}
              </motion.button>
            </div>
          )}

          {isSubscribed && !isCanceling && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-300 text-sm font-semibold">Aktivt abonnement</p>
                  {periodEndDate && (
                    <p className="text-green-400/70 text-xs mt-0.5">Fornyes {periodEndDate}</p>
                  )}
                </div>
              </div>
              {subscription?.payment_method_brand && (
                <p className="text-zinc-500 text-xs">
                  Betaler med {subscription.payment_method_brand.charAt(0).toUpperCase() + subscription.payment_method_brand.slice(1)}
                  {subscription.payment_method_last4 ? ` ···· ${subscription.payment_method_last4}` : ''}
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setShowCancelConfirm(true); setCancelError(''); }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-xl font-medium text-sm transition-colors"
              >
                Avbryt abonnement
              </motion.button>
            </div>
          )}

          {isCanceling && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-zinc-200 text-sm font-semibold">Kansellert</p>
                  {periodEndDate && (
                    <p className="text-zinc-400 text-xs mt-0.5">Tilgang til {periodEndDate}</p>
                  )}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {subscribeLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Gjenaktiver abonnement
                  </>
                )}
              </motion.button>
            </div>
          )}

          {!trialActive && !isSubscribed && (
            <div className="space-y-3">
              <p className="text-zinc-500 text-sm">Ingen aktivt abonnement.</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {subscribeLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Abonner — 30 kr/mnd'
                )}
              </motion.button>
            </div>
          )}
        </div>

        {/* Rest timer setting */}
        <div data-tour="profile-rest-timer" className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Timer size={18} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Hviletid mellom sett</p>
              <p className="text-zinc-500 text-xs mt-0.5">Timeren starter automatisk etter hvert sett</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-1">
            {[30, 60, 90, 120, 180, 240, 300].map(secs => {
              const label = secs < 60 ? `${secs}s` : `${secs / 60}min`;
              const isSelected = defaultRestSeconds === secs;
              return (
                <motion.button
                  key={secs}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setDefaultRestSeconds(secs)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow'
                      : 'text-zinc-500 active:text-zinc-300'
                  }`}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quick links */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => useAppStore.getState().setCurrentTab('history')}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <History size={18} className="text-zinc-400" />
          Treningshistorikk
        </motion.button>

        {/* Feedback */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowFeedback(true)}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <MessageSquare size={18} className="text-blue-400" />
          Send tilbakemelding
        </motion.button>

        {/* Notifications */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowNotifications(true)}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <Bell size={18} className="text-amber-400" />
          Varslingsinnstillinger
        </motion.button>

        {/* Terms */}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <FileText size={18} className="text-zinc-400" />
          Brukervilkår
        </a>

        {/* Privacy */}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <Shield size={18} className="text-zinc-400" />
          Personvern
        </a>

        {/* Sign out */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-red-400 font-semibold"
        >
          <LogOut size={18} />
          Logg ut
        </motion.button>

        {/* Install button */}
        {!isInstalled && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleInstallClick}
            className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
          >
            <Download size={18} className="text-green-400" />
            Legg til på hjemskjermen
          </motion.button>
        )}
      </div>

      {/* Cancel subscription confirmation sheet */}
      <AnimatePresence>
        {showCancelConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setShowCancelConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-6 pt-6 pb-10"
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <h2 className="text-white font-bold text-xl text-center mb-2">Avbryt abonnement?</h2>
              <p className="text-zinc-400 text-sm text-center leading-relaxed mb-6">
                Du beholder full tilgang til IronGrid frem til slutten av inneværende
                fakturaperiode{periodEndDate ? ` (${periodEndDate})` : ''}. Etter det vil kontoen din blokkeres.
              </p>
              {cancelError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-center">
                  {cancelError}
                </p>
              )}
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
                >
                  {cancelLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Ja, avbryt abonnementet'
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-base transition-colors"
                >
                  Behold abonnementet
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Install modal — fullscreen overlay above bottom nav */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-14 pb-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                  <img src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG" alt="IronGrid" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Installer IronGrid</p>
                  <p className="text-zinc-500 text-xs">Legg til på hjemskjermen</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 pb-10 space-y-3">
              <p className="text-zinc-400 text-sm mb-4">
                {isIOSSafari ? 'Følg disse stegene i Safari:' : 'Følg disse stegene i Chrome:'}
              </p>

              {isIOSSafari ? (
                <>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk på del-knappen</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Knappen med pil opp nederst i nettleseren</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <ArrowUp size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Velg &quot;Legg til på hjemskjerm&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Scroll ned i menyen til du finner alternativet</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Plus size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk &quot;Legg til&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">IronGrid legges til på hjemskjermen din</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Download size={18} className="text-zinc-300" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Trykk på meny-knappen</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Tre prikker øverst til høyre i Chrome</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <MoreHorizontal size={18} className="text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-400 font-bold text-sm">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">Velg &quot;Legg til på hjemskjerm&quot;</p>
                      <p className="text-zinc-500 text-xs mt-0.5">Eller &quot;Installer app&quot;</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <Plus size={18} className="text-zinc-300" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackSheet open={showFeedback} onClose={() => setShowFeedback(false)} />
      <NotificationSettingsSheet open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
}
