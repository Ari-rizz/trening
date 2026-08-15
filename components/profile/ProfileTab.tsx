'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Dumbbell, Trophy, ChartBar as BarChart2, History, Timer, Download, X, ArrowUp, MoveHorizontal as MoreHorizontal, Plus, AtSign, Check, Pencil, CreditCard, Clock, TriangleAlert as AlertTriangle, RefreshCw, CircleCheck as CheckCircle2, MessageSquare, Bell, FileText, Shield, Trash2, Heart, ExternalLink } from 'lucide-react';
import { format, fromUnixTime } from 'date-fns';
import { nb } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { cancelSubscription, createCheckoutSession } from '@/lib/stripe';
import { useAppStore } from '@/lib/store';
import { FeedbackSheet } from '@/components/profile/FeedbackSheet';
import { NotificationSettingsSheet } from '@/components/profile/NotificationSettingsSheet';
import { getTrialDaysLeft } from '@/lib/trial';
import { connectHealthApp, getHealthConnection, isHealthAvailable, removeHealthConnection, syncCaloriesToDatabase } from '@/lib/health';
import { isNativePlatform, checkActiveIAPSubscription, openSubscriptionManagement, purchaseIAP, restoreIAPPurchases, IAP_PRODUCT_ID } from '@/lib/iap';

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
  is_lifetime: boolean | null;
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
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);
  const [nativePlatform] = useState(() => isNativePlatform());
  const [iapActive, setIapActive] = useState(false);
  const [iapSubscribeLoading, setIapSubscribeLoading] = useState(false);
  const [iapError, setIapError] = useState('');
  const [healthConnecting, setHealthConnecting] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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

  useEffect(() => {
    isHealthAvailable().then(a => setHealthAvailable(a.available));
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
        checkActiveIAPSubscription(data.session.user.id).then(setIapActive);
      }
    });
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
        fetchStats(session.user.id);
        fetchSubscription();
        checkActiveIAPSubscription(session.user.id).then(setIapActive);
      }
    });
    return () => authSub.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, date_of_birth, height_cm, weight_kg, gender, fitness_level, training_goal, username, trial_ends_at, is_lifetime, health_connected')
      .eq('id', uid)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setUsernameInput(data.username ?? '');
      setHealthConnected(data.health_connected ?? false);
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

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Ikke innlogget');
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Kunne ikke slette brukeren');
      }
      setShowDeleteConfirm(false);
      await supabase.auth.signOut();
    } catch (err: any) {
      setDeleteError(err.message ?? 'Noe gikk galt. Prøv igjen.');
    }
    setDeleteLoading(false);
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
    setSubscribeError('');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = await createCheckoutSession(
        PRICE_ID,
        `${origin}/?payment=success`,
        `${origin}/?payment=cancel`,
      );
      if (!url) throw new Error('Kunne ikke opprette betalingssesjon. Prøv igjen.');
      window.location.href = url;
    } catch (err: any) {
      console.error('Subscribe error:', err?.message);
      setSubscribeError(err.message ?? 'Noe gikk galt. Prøv igjen.');
      setSubscribeLoading(false);
    }
  };

  const handleIAPSubscribe = async () => {
    setIapSubscribeLoading(true);
    setIapError('');
    const result = await purchaseIAP();
    if (result.success) {
      setIapActive(true);
    } else if (result.error !== 'CANCELLED') {
      setIapError(result.error ?? 'Noe gikk galt.');
    }
    setIapSubscribeLoading(false);
  };

  const handleIAPRestore = async () => {
    setIapSubscribeLoading(true);
    setIapError('');
    const result = await restoreIAPPurchases();
    if (result.isActive) {
      setIapActive(true);
    } else {
      setIapError(result.error ?? 'Ingen aktive abonnement funnet.');
    }
    setIapSubscribeLoading(false);
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

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+8rem)] space-y-4">
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

          {/* Unified cross-platform subscription UI */}
          <div className="space-y-3">
            {profile?.is_lifetime ? (
              <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <Trophy size={16} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-semibold">Lifetime-tilgang</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">Du har permanent tilgang til IronGrid</p>
                </div>
              </div>
            ) : iapActive ? (
              <>
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 text-sm font-semibold">Aktivt abonnement (App Store)</p>
                    <p className="text-green-400/70 text-xs mt-0.5">Abonnementet fornyes automatisk via App Store</p>
                  </div>
                </div>
                {nativePlatform && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openSubscriptionManagement()}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Administrer i App Store
                  </motion.button>
                )}
                {!nativePlatform && (
                  <p className="text-zinc-600 text-xs">Administrer abonnementet i App Store på din iOS-enhet.</p>
                )}
              </>
            ) : isSubscribed && !isCanceling ? (
              <>
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 text-sm font-semibold">Aktivt abonnement</p>
                    {periodEndDate && <p className="text-green-400/70 text-xs mt-0.5">Fornyes {periodEndDate}</p>}
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
              </>
            ) : isCanceling ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-zinc-200 text-sm font-semibold">Kansellert</p>
                    {periodEndDate && <p className="text-zinc-400 text-xs mt-0.5">Tilgang til {periodEndDate}</p>}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubscribe}
                  disabled={subscribeLoading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {subscribeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><RefreshCw size={14} />Gjenaktiver abonnement</>}
                </motion.button>
              </div>
            ) : trialActive ? (
              <>
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
                {nativePlatform ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleIAPSubscribe}
                    disabled={iapSubscribeLoading}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {iapSubscribeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Abonner nå — 40 kr/mnd'}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {subscribeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Abonner nå — 30 kr/mnd'}
                  </motion.button>
                )}
              </>
            ) : (
              <>
                <p className="text-zinc-500 text-sm">Ingen aktivt abonnement.</p>
                {nativePlatform ? (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleIAPSubscribe}
                      disabled={iapSubscribeLoading}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      {iapSubscribeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Abonner — 40 kr/mnd'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleIAPRestore}
                      disabled={iapSubscribeLoading}
                      className="w-full flex items-center justify-center gap-2 text-zinc-500 text-xs py-2 disabled:opacity-50"
                    >
                      <RefreshCw size={12} /> Gjenopprett kjøp
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubscribe}
                    disabled={subscribeLoading}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {subscribeLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Abonner — 30 kr/mnd'}
                  </motion.button>
                )}
              </>
            )}
            {subscribeError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {subscribeError}
              </p>
            )}
            {iapError && <p className="text-red-400 text-xs">{iapError}</p>}
            <p className="text-zinc-600 text-xs">
              {nativePlatform
                ? '40 kr/mnd · fornyes automatisk · avbryt via App Store-innstillinger'
                : '30 kr/mnd inkl. mva · fornyes automatisk · avbryt når som helst'}
            </p>
          </div>
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

        {/* Health connection */}
        {healthAvailable && (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                if (!session?.user?.id) return;
                const uid = session.user.id;
                if (healthConnected) {
                  await removeHealthConnection(uid);
                  setHealthConnected(false);
                } else {
                  setHealthConnecting(true);
                  setHealthError(null);
                  const result = await connectHealthApp(uid);
                  setHealthConnecting(false);
                  if (result.success) {
                    setHealthConnected(true);
                    await syncCaloriesToDatabase(uid);
                  } else if (result.error === 'health_connect_not_installed') {
                    setHealthError('Health Connect er ikke installert. Installer det fra Google Play for å koble til.');
                  } else if (result.error === 'health_not_available') {
                    setHealthError('Helseappen er ikke tilgjengelig på denne enheten.');
                  } else if (result.error === 'permission_denied') {
                    setHealthError('Tillatelse nektet. Du kan prøve igjen senere.');
                  } else {
                    setHealthError('Kunne ikke koble til helseappen.');
                  }
                }
              }}
              className={`w-full flex items-center gap-3 rounded-2xl px-5 py-4 font-semibold transition-colors ${
                healthConnected
                  ? 'bg-orange-500/10 border border-orange-500/20 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-white'
              }`}
            >
              {healthConnecting ? (
                <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
              ) : (
                <Heart size={18} className={healthConnected ? 'text-orange-400 fill-orange-400' : 'text-zinc-400'} />
              )}
              {healthConnected ? 'Helseappen er koblet til' : 'Koble til helse'}
            </motion.button>
            {healthError && (
              <p className="text-red-400 text-xs px-1">{healthError}</p>
            )}
          </>
        )}

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
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowTerms(true)}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <FileText size={18} className="text-zinc-400" />
          Brukervilkår
        </motion.button>

        {/* Privacy */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowPrivacy(true)}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-semibold"
        >
          <Shield size={18} className="text-zinc-400" />
          Personvern
        </motion.button>

        {/* Sign out */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-red-400 font-semibold"
        >
          <LogOut size={18} />
          Logg ut
        </motion.button>

        {/* Delete account */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
          className="w-full flex items-center gap-3 bg-red-950/40 border border-red-900/50 rounded-2xl px-5 py-4 text-red-400 font-semibold"
        >
          <Trash2 size={18} />
          Slett min bruker
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
              className="fixed inset-0 z-[100] bg-black/60"
              onClick={() => setShowCancelConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-6 pt-6 pb-10"
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
            className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-6 flex-shrink-0"
                 style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
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

      {/* Delete account confirmation sheet */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60"
              onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[100] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl px-6 pt-6 pb-10"
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} className="text-red-400" />
              </div>
              <h2 className="text-white font-bold text-xl text-center mb-2">Slette brukeren din?</h2>
              <p className="text-zinc-400 text-sm text-center leading-relaxed mb-6">
                Dette sletter permanent all treningshistorikk, mål, abonnement og kontoinformasjon.
                Dette kan ikke angres. Eventuelt abonnement avsluttes umiddelbart.
              </p>
              {deleteError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-center">
                  {deleteError}
                </p>
              )}
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
                >
                  {deleteLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={18} />
                      Ja, slett brukeren min
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 py-4 rounded-2xl font-semibold text-base transition-colors"
                >
                  Avbryt
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FeedbackSheet open={showFeedback} onClose={() => setShowFeedback(false)} />
      <NotificationSettingsSheet open={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Terms modal */}
      <AnimatePresence>
        {showTerms && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60"
              onClick={() => setShowTerms(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 top-0 z-[101] bg-zinc-950 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0 border-b border-zinc-800"
                   style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
                <h2 className="text-white font-bold text-lg">Brukervilkår</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <h1 className="text-2xl font-bold text-white mb-2">Brukervilkår for IronGrid</h1>
                <p className="text-zinc-500 text-sm mb-6">Sist oppdatert: 2. august 2026</p>
                <div className="space-y-6 text-zinc-300 leading-relaxed">
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">1. Om tjenesten</h2>
                    <p>IronGrid er en treningapp som lar brukere logge treningsøkter, spore fremgang, opprette treningsplaner og dele disse med andre. Tjenesten tilbys av IronGrid og er tilgjengelig via nettleser og mobilapp.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">2. Brukerkonto</h2>
                    <p>For å bruke IronGrid må du opprette en konto med e-post og passord. Du er ansvarlig for å holde kontodetaljene dine sikre og for all aktivitet som skjer via kontoen din. Du må være minst 16 år for å opprette konto.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">3. Prøveperiode og abonnement</h2>
                    <p>Nye brukere får en gratis prøveperiode på 30 dager. Ingen betalingskort kreves for prøveperioden. Etter prøveperioden koster abonnementet 30 kr per måned. Abonnementet fornyes automatisk hver måned og kan avbrytes når som helst. På iOS avbrytes abonnementet via App Store-innstillinger; på web avbrytes fra profil-fanen. Ved avbrytelse beholder du tilgang frem til slutten av den betalte perioden.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">4. Brukerinnhold</h2>
                    <p>Du beholder eierskapet til all treningsdata og innhold du laster opp. Ved å bruke tjenesten gir du IronGrid en begrenset lisens til å lagre, vise og behandle dataene dine for å levere tjenesten. Du deler treningsplaner med andre brukere kun ved å generere en delingskode.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">5. Ansvar og helse</h2>
                    <p>IronGrid er et verktøy for trening og gir ikke medisinsk råd. Du trener på eget ansvar. Ved helseproblemer eller skader skal du rådføre deg med lege før du starter eller fortsetter trening. IronGrid er ikke ansvarlig for skader som oppstår som følge av bruk av appen.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">6. Betaling</h2>
                    <p>Betaling håndteres av Apple In-App Purchases (IAP) i iOS-appen og av Stripe på web-versjonen. Apple lagrer og behandler betalingsinformasjon i henhold til sine egne sikkerhetskrav — IronGrid har ikke tilgang til selve betalingsdetaljene dine. For web-betaling lagrer Stripe kortinformasjon i henhold til PCI DSS-krav — IronGrid har ikke tilgang til selve kortnummeret. Alle betalinger er sikre og krypterte. Prismodifikasjoner kan forekomme med minst 30 dagers varsel.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">7. Sletting av konto og personvern</h2>
                    <p>Du kan slette kontoen din når som helst fra profil-fanen. Ved sletting slettes all din treningsdata, mål, personlige opplysninger og egendefinerte øvelser permanent. Eventuelt aktivt abonnement avsluttes umiddelbart. Denne handlingen kan ikke angres. For detaljer om hvilke data som slettes og lagringstid, se vår personvernerklæring.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">8. Endringer av vilkår</h2>
                    <p>Vi kan oppdatere disse brukervilkårene fra tid til annen. Ved vesentlige endringer vil vi varsle deg i appen eller via e-post. Fortsatt bruk av IronGrid etter endringer betyr at du godtar de oppdaterte vilkårene.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">9. Personvern og databehandlere</h2>
                    <p>IronGrid bruker Supabase (database og autentisering, EU-region), Apple In-App Purchases (betaling i iOS-appen) og Stripe (betaling på web) som databehandlere. Håndtering av personopplysninger er beskrevet i vår personvernerklæring, som utgjør en del av disse brukervilkårene. Helsedata fra Apple Health leses kun med ditt eksplisitte samtykke og kan trekkes tilbake når som helst.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">10. Kontakt</h2>
                    <p>Spørsmål om brukervilkårene eller personvern kan sendes via tilbakemeldingsfunksjonen i appen eller til utvikling@ai-assistant.no.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Privacy modal */}
      <AnimatePresence>
        {showPrivacy && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60"
              onClick={() => setShowPrivacy(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 top-0 z-[101] bg-zinc-950 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pb-4 flex-shrink-0 border-b border-zinc-800"
                   style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}>
                <h2 className="text-white font-bold text-lg">Personvern</h2>
                <button
                  onClick={() => setShowPrivacy(false)}
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center"
                >
                  <X size={18} className="text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">
                <h1 className="text-2xl font-bold text-white mb-2">Personvernerklæring for IronGrid</h1>
                <p className="text-zinc-500 text-sm mb-6">Sist oppdatert: 2. august 2026</p>
                <div className="space-y-6 text-zinc-300 leading-relaxed">
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">1. Hvilke data vi samler inn</h2>
                    <p className="mb-3">IronGrid samler inn personopplysninger som er nødvendige for å levere tjenesten. Vi kategoriserer dataene slik:</p>
                    <p><strong className="text-zinc-200">Kontodata:</strong> E-postadresse og passord (kryptert via Supabase Auth). Navn oppgis frivillig under onboarding.</p>
                    <p><strong className="text-zinc-200">Treningsdata:</strong> Økter, øvelser, vekter, reps, sett, hviletider, notater, personlige rekorder, superset-grupper og treningsplaner.</p>
                    <p><strong className="text-zinc-200">Kroppsdata:</strong> Kroppsvekt og eventuelle kalorilogger du registrerer manuelt i appen.</p>
                    <p><strong className="text-zinc-200">Helsedata (Apple Health / HealthKit):</strong> Med din eksplisitte tillatelse kan IronGrid lese og skrive treningsdata og kroppsvekt fra Apple Health. Helsedata lagres også i din IronGrid-konto via Supabase slik at du kan se historikk på tvers av enheter.</p>
                    <p><strong className="text-zinc-200">Mål og preferanser:</strong> Treningsmål, varigheter, og personlige øvelsesinnstillinger.</p>
                    <p><strong className="text-zinc-200">Tilbakemeldinger:</strong> Innhold du sender via tilbakemeldingsfunksjonen i appen.</p>
                    <p><strong className="text-zinc-200">Varselinnstillinger:</strong> Hvilke push-varsler du har slått på eller av.</p>
                    <p><strong className="text-zinc-200">Abonnementsdata:</strong> Abonnementsstatus og kjøpsbekreftelse (håndtert av Apple IAP i iOS og Stripe på web).</p>
                    <p><strong className="text-zinc-200">Teknisk data:</strong> Plattform (iOS/Android/web) og app-versjon. Vi samler ikke posisjonsdata, nettleserhistorikk eller enhets-ID-er for sporing.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">2. Hvordan vi bruker dataene</h2>
                    <p>Vi bruker dataene utelukkende for å:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Levere treningstjenesten og vise fremgang over tid</li>
                      <li>Lagre og synkronisere treningsplaner på tvers av enheter</li>
                      <li>Synkronisere treningsøkter og kroppsvekt med Apple Health</li>
                      <li>Beregne muskelbalanse og gi personlige anbefalinger</li>
                      <li>Behandle abonnement og betaling via Apple IAP (iOS) og Stripe (web)</li>
                      <li>Send push-varsler du har aktivert</li>
                      <li>Forbedre appens funksjonalitet og brukeropplevelse</li>
                    </ul>
                    <p className="mt-3">Dataene dine brukes <strong className="text-zinc-200">ikke</strong> til å trene AI-modeller, profilere deg for markedsføring, eller selges til tredjeparter.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">3. Rettslig grunnlag for behandling</h2>
                    <p>Behandlingen av personopplysningene dine bygger på følgende rettslige grunnlag i henhold til GDPR:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong className="text-zinc-200">Avtale (art. 6(1)(b)):</strong> Behandling som er nødvendig for å levere tjenesten.</li>
                      <li><strong className="text-zinc-200">Samtykke (art. 6(1)(a) og art. 9(2)(a)):</strong> For helsedata fra Apple Health og for push-varsler. Du kan trekke tilbake samtykket når som helst.</li>
                      <li><strong className="text-zinc-200">Berettiget interesse (art. 6(1)(f)):</strong> For teknisk data som trengs for å drifte og feilsøke tjenesten.</li>
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">4. Deling av data</h2>
                    <p>Vi selger aldri dataene dine til tredjeparter. Deling skjer kun i følgende tilfeller:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong className="text-zinc-200">Plan-deling:</strong> Når du deler en treningsplan, genereres en unik 6-tegns kode. Andre brukere kan kun se ditt brukernavn.</li>
                      <li><strong className="text-zinc-200">Apple Health:</strong> Helsedata deles kun mellom appen og Apple Health på din enhet, og kun med ditt samtykke.</li>
                      <li><strong className="text-zinc-200">Apple In-App Purchases:</strong> Kjøp i iOS-appen behandles av Apple. IronGrid lagrer kun bekreftelse på aktivt abonnement.</li>
                      <li><strong className="text-zinc-200">Stripe (web-betaling):</strong> Betalinger for web-versjonen behandles av Stripe. Betalingsinformasjon lagres ikke på IronGrids servere.</li>
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">5. Databehandlere</h2>
                    <p>IronGrid bruker følgende databehandlere. Alle leverandører er GDPR-kompatible og har inngått databehandleravtaler (DPA):</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong className="text-zinc-200">Supabase:</strong> Lagrer all treningsdata, kontodata, mål og tilbakemeldinger i en PostgreSQL-database i EU-region (Irland). Leverer også autentisering.</li>
                      <li><strong className="text-zinc-200">Apple (In-App Purchases):</strong> Behandler kjøp og abonnementer i iOS-appen.</li>
                      <li><strong className="text-zinc-200">Stripe:</strong> Behandler betalinger for web-versjonen. PCI DSS-sertifisert og GDPR-kompatibel.</li>
                      <li><strong className="text-zinc-200">Apple (Apple Health):</strong> Helsedata på din enhet håndteres av Apple HealthKit.</li>
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">6. Lagring og sikkerhet</h2>
                    <p><strong className="text-zinc-200">Lagringssted:</strong> Alle data lagres i Supabase sin database i EU-region (Irland).</p>
                    <p><strong className="text-zinc-200">Kryptering:</strong> All kommunikasjon er kryptert via HTTPS/TLS. Supabase krypterer data ved lagring (encryption at rest).</p>
                    <p><strong className="text-zinc-200">Row Level Security (RLS):</strong> Alle tabeller har RLS aktivert — hver bruker kan kun lese og skrive sine egne data.</p>
                    <p><strong className="text-zinc-200">Passord:</strong> Passord lagres aldri i klartekst. Supabase Auth bruker bcrypt-hashing med salt.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">7. Lagringstid</h2>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong className="text-zinc-200">Konto- og treningsdata:</strong> Lagres så lenge kontoen er aktiv. Slettes permanent ved kontosletting.</li>
                      <li><strong className="text-zinc-200">Tilbakemeldinger:</strong> Slettes automatisk etter 12 måneder.</li>
                      <li><strong className="text-zinc-200">Teknisk data:</strong> Slettes når kontoen slettes.</li>
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">8. Dine rettigheter (GDPR)</h2>
                    <p>I henhold til GDPR har du rett til innsyn, rettelse, sletting, begrensning av behandling, dataportabilitet og innsigelse. Du kan også trekke tilbake samtykket for helsedata og push-varsler når som helst.</p>
                    <p className="mt-3">For å utøve disse rettighetene: slett kontoen fra profil-fanen, eller send en forespørsel via tilbakemeldingsfunksjonen. Vi besvarer forespørsler innen 30 dager. Du kan også klage til Datatilsynet (datatilsynet.no).</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">9. Varsler</h2>
                    <p>Push-varsler sendes kun for funksjoner du har aktivert. Du kan når som helst slå av alle varsler i profil-fanen. Varsler sendes lokalt fra enheten din og lagres ikke på IronGrids servere.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">10. Barns personvern</h2>
                    <p>IronGrid er ikke rettet mot barn under 16 år. Vi samler ikke bevisst data fra barn.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">11. Endringer i personvernerklæringen</h2>
                    <p>Vi kan oppdatere denne erklæringen fra tid til annen. Vesentlige endringer vil varsles i appen eller via e-post. Fortsatt bruk av IronGrid etter en endring betyr at du godtar den oppdaterte erklæringen.</p>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-white mb-2">12. Kontakt</h2>
                    <p>Spørsmål om personvern kan sendes via tilbakemeldingsfunksjonen i appen eller til utvikling@ai-assistant.no.</p>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
