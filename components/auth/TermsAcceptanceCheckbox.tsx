'use client';

import { useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function TermsAcceptanceCheckbox({ checked, onChange }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="flex items-start gap-3 text-left w-full"
      >
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
          checked ? 'bg-red-500 border-red-500' : 'bg-zinc-800 border-zinc-600'
        }`}>
          {checked && <Check size={12} className="text-white" />}
        </div>
        <span className="text-zinc-400 text-sm leading-relaxed">
          Jeg godtar{' '}
          <span
            onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
            className="text-red-400 underline"
          >
            brukervilkårene
          </span>
          {' '}og{' '}
          <span
            onClick={(e) => { e.stopPropagation(); setShowPrivacy(true); }}
            className="text-red-400 underline"
          >
            personvernerklæringen
          </span>
        </span>
      </button>

      {showTerms && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowTerms(false)}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Brukervilkår</h3>
              <button onClick={() => setShowTerms(false)} className="text-zinc-500">Lukk</button>
            </div>
            <div className="text-zinc-400 text-sm space-y-3">
              <p>Ved å bruke IronGrid godtar du disse vilkårene:</p>
              <p><strong className="text-zinc-300">1. Tjenesten:</strong> IronGrid er en treningapp som lar deg logge økter, spore fremgang og opprette treningsplaner.</p>
              <p><strong className="text-zinc-300">2. Konto:</strong> Du er ansvarlig for din konto og alt innhold du laster opp.</p>
              <p><strong className="text-zinc-300">3. Abonnement:</strong> Prøveperioden varer 30 dager. Etter det koster abonnementet 30 kr/mnd. Betaling via Apple In-App Purchases (iOS) eller Stripe (web). Du kan avbryte når som helst.</p>
              <p><strong className="text-zinc-300">4. Ansvar:</strong> IronGrid er et verktøy for trening. Du trener på eget ansvar. Rådfør deg med lege ved helseproblemer.</p>
              <p><strong className="text-zinc-300">5. Endringer:</strong> Vi kan oppdatere vilkårene. Fortsatt bruk betyr godkjenning av nye vilkår.</p>
              <p><strong className="text-zinc-300">6. Sletting:</strong> Du kan slette kontoen din når som helst fra profil-fanen.</p>
            </div>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1 text-red-400 text-sm"
            >
              Åpne full versjon <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {showPrivacy && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPrivacy(false)}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Personvernerklæring</h3>
              <button onClick={() => setShowPrivacy(false)} className="text-zinc-500">Lukk</button>
            </div>
            <div className="text-zinc-400 text-sm space-y-3">
              <p><strong className="text-zinc-300">Hva vi samler:</strong> Navn, e-post, treningsdata (økter, vekter, mål), kroppsvekt og eventuelle tilbakemeldinger.</p>
              <p><strong className="text-zinc-300">Hvordan vi bruker det:</strong> For å levere treningstjenesten, vise fremgang og forbedre appen.</p>
              <p><strong className="text-zinc-300">Deling:</strong> Vi selger ikke dataene dine. Treningsplaner du deler med andre brukere viser kun brukernavnet ditt.</p>
              <p><strong className="text-zinc-300">Lagring:</strong> Data lagres hos Supabase (EU-region). Betaling håndteres av Apple In-App Purchases (iOS) og Stripe (web).</p>
              <p><strong className="text-zinc-300">Dine rettigheter:</strong> Du kan eksportere, endre og slette dataene dine når som helst.</p>
              <p><strong className="text-zinc-300">Kontakt:</strong> Spørsmål om personvern kan sendes via tilbakemelding i appen.</p>
            </div>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1 text-red-400 text-sm"
            >
              Åpne full versjon <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
