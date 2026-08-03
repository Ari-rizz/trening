'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dumbbell,
  CreditCard,
  Clock,
  CircleCheck as CheckCircle2,
  CircleAlert as AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createCheckoutSession } from '@/lib/stripe';
import { isNativePlatform, purchaseIAP, restoreIAPPurchases, getIAPProduct, IAP_PRODUCT_ID } from '@/lib/iap';

const STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? '';

type PaywallMode = 'fresh' | 'expired';

interface PaywallScreenProps {
  userId: string;
  mode: PaywallMode;
  onSubscribed: () => void;
  onTrialStarted: () => void;
}

const FEATURES = [
  'Ubegrenset treningslogging',
  'Tilpassede treningsplaner',
  'Fremgangsanalyse og grafer',
  'Personlige rekorder (PR)',
  'Del planer med andre',
];

export function PaywallScreen({ userId, mode, onSubscribed, onTrialStarted }: PaywallScreenProps) {
  const [loading, setLoading] = useState<'trial' | 'subscribe' | 'restore' | null>(null);
  const [error, setError] = useState('');
  const [nativePlatform, setNativePlatform] = useState(false);
  const [iapPriceString, setIapPriceString] = useState('39,9 kr');

  useEffect(() => {
    const native = isNativePlatform();
    setNativePlatform(native);
    if (native) {
      getIAPProduct()
        .then((product) => {
          if (product?.priceString) setIapPriceString(product.priceString);
        })
        .catch(() => {});
    }
  }, []);

  const handleStartTrial = async () => {
    setLoading('trial');
    setError('');
    try {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ trial_starts_at: now.toISOString(), trial_ends_at: trialEnd.toISOString() })
        .eq('id', userId);
      if (dbError) throw dbError;
      onTrialStarted();
    } catch (err: any) {
      setError(err.message ?? 'Noe gikk galt. Prøv igjen.');
    }
    setLoading(null);
  };

  const handleIAPSubscribe = async () => {
    setLoading('subscribe');
    setError('');
    const result = await purchaseIAP();
    if (result.success) {
      onSubscribed();
    } else if (result.error !== 'CANCELLED') {
      setError(result.error ?? 'Noe gikk galt. Prøv igjen.');
    }
    setLoading(null);
  };

  const handleRestore = async () => {
    setLoading('restore');
    setError('');
    const result = await restoreIAPPurchases();
    if (result.isActive) {
      onSubscribed();
    } else if (!result.success) {
      setError(result.error ?? 'Kunne ikke gjenopprette kjøp.');
    } else {
      setError('Ingen aktive abonnement funnet.');
    }
    setLoading(null);
  };

  const handleStripeSubscribe = async () => {
    setLoading('subscribe');
    setError('');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = await createCheckoutSession(
        STRIPE_PRICE_ID,
        `${origin}/?payment=success`,
        `${origin}/?payment=cancel`,
      );
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Noe gikk galt. Prøv igjen.');
      setLoading(null);
    }
  };

  const priceLabel = nativePlatform ? iapPriceString : '30 kr';
  const priceNote = nativePlatform ? '/ mnd · fornyes automatisk' : '/ mnd inkl. mva';

  return (
    <div className="flex flex-col min-h-screen bg-black px-6 pt-16 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col flex-1"
      >
        {/* Logo + headline */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center overflow-hidden">
            <img
              src="/561FDBE9-8BBB-49EC-8502-9C434E74EE5E.PNG"
              alt="IronGrid"
              className="w-8 h-8 object-contain"
            />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">IronGrid</span>
        </div>

        {mode === 'expired' ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold">Prøveperioden er utløpt</span>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              Fortsett treningen din
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Din 30-dagers gratis prøveperiode er over. Abonner for å få full tilgang til IronGrid.
            </p>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Dumbbell size={18} className="text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Velg hvordan du vil starte</span>
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              Full tilgang til IronGrid
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Logg treningsøkter, bygg planer og følg fremgangen din — alt samlet på ett sted.
            </p>
          </div>
        )}

        {/* Feature list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-3">
          {FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
              <span className="text-zinc-300 text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Price tag */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-4xl font-bold text-white">{priceLabel}</span>
          <span className="text-zinc-500 text-sm ml-1">{priceNote}</span>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4"
          >
            {error}
          </motion.p>
        )}

        {/* CTA buttons */}
        <div className="space-y-3 mt-auto">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={nativePlatform ? handleIAPSubscribe : handleStripeSubscribe}
            disabled={loading !== null}
            className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            {loading === 'subscribe' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                Abonner — {priceLabel}/mnd
              </>
            )}
          </motion.button>

          {mode === 'fresh' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleStartTrial}
              disabled={loading !== null}
              className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 disabled:opacity-50 text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-colors"
            >
              {loading === 'trial' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Clock size={18} className="text-zinc-400" />
                  Start 30-dagers gratis prøveperiode
                </>
              )}
            </motion.button>
          )}

          {nativePlatform && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRestore}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-2 text-zinc-500 text-sm py-2 disabled:opacity-50"
            >
              {loading === 'restore' ? (
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw size={14} />
                  Gjenopprett kjøp
                </>
              )}
            </motion.button>
          )}
        </div>

        <p className="text-zinc-600 text-xs text-center mt-4">
          {mode === 'fresh'
            ? 'Ingen betalingskort kreves for prøveperioden. Avbryt når som helst.'
            : nativePlatform
              ? 'Abonnementet fornyes automatisk. Avbryt via App Store-innstillinger.'
              : 'Betal med kort. Abonnementet fornyes automatisk. Avbryt når som helst.'}
        </p>
      </motion.div>
    </div>
  );
}
