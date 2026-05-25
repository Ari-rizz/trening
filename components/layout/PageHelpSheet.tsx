'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, ChevronRight } from 'lucide-react';

interface HelpItem {
  heading: string;
  points: string[];
}

interface HelpContent {
  title: string;
  description: string;
  sections: HelpItem[];
}

const HELP_CONTENT: Record<string, HelpContent> = {
  dashboard: {
    title: 'Dashboard',
    description: 'Hjemmesiden din med en rask oversikt over treningen din.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'Ukentlige statistikker: antall økter, volum løftet, streak og totalt antall treninger.',
          'Ukeoversikt som viser hvilke dager du har trent.',
          'Dine siste personlige rekorder (1RM per øvelse).',
          'Oversikt over nylige øvelser med dato og varighet.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Starte en ny økt raskt med "Start ny økt"-knappen.',
          'Fortsette en aktiv økt hvis du har en pågående treningsøkt.',
          'Gå til historikk via "Se alle" ved nylige økter.',
        ],
      },
      {
        heading: 'Finn det her',
        points: [
          'Treningsplaner → Gå til "Planer" i navigasjonen nedenfor.',
          'Øvelsesbibliotek → Gå til "Øvelser" i navigasjonen nedenfor.',
          'Fremgang og rekorder → Gå til "Fremgang" i navigasjonen nedenfor.',
        ],
      },
    ],
  },
  plans: {
    title: 'Treningsplaner',
    description: 'Lag og administrer dine treningsplaner som du kan gjenbruke.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'En liste over alle treningsplanene dine (maler).',
          'Oversikt over øvelser, sett og målvekter i hver plan.',
          'Dato for siste gang du brukte planen.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Lage ny treningsplan med "+" øverst til høyre.',
          'Starte en økt basert på en plan — forrige sesjons vekter lastes automatisk.',
          'Redigere en plan: endre navn, legge til eller fjerne øvelser.',
          'Slette en plan du ikke lenger trenger.',
        ],
      },
      {
        heading: 'Tips',
        points: [
          'Lag separate planer for ulike treningsdager, f.eks. "Bryst og triceps" og "Rygg og biceps".',
          'Planene husker siste sesjons vekter slik at du alltid vet hvor du skal starte.',
        ],
      },
    ],
  },
  workout: {
    title: 'Aktiv økt',
    description: 'Her logger du treningsøkten din i sanntid.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'En liste over øvelsene i den aktive økten.',
          'Sett med vekt, reps og RPE (innsatsnivå 1–10) per øvelse.',
          'Forrige sesjons data som grå tekst — brukes som guide.',
          'Hvile-timer som starter automatisk etter hvert fullført sett.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Legge til øvelser med "+" eller fra øvelsesbiblioteket.',
          'Legge til og fjerne sett per øvelse.',
          'Fylle inn vekt og reps, og markere sett som fullført ved å trykke på sirkelen.',
          'Endre navn på økten ved å trykke på tittelen.',
          'Avslutte og lagre økten med "Fullfør økt".',
          'Bytte mellom reps/vekt-sporing og tidssporing per øvelse.',
        ],
      },
      {
        heading: 'Tips',
        points: [
          'Hvile-timeren starter automatisk — du trenger ikke gjøre noe.',
          'Standard hvile-tid kan endres i Profil-fanen.',
          'RPE (Rate of Perceived Exertion) er valgfritt, men nyttig for å spore innsats.',
        ],
      },
    ],
  },
  exercises: {
    title: 'Øvelsesbibliotek',
    description: 'Utforsk og finn informasjon om hundrevis av øvelser.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'Hundrevis av øvelser sortert alfabetisk.',
          'Bilder og instruksjoner for hver øvelse.',
          'Informasjon om muskelgruppe, utstyr og vanskelighetsgrad.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Søke etter øvelser med navn i søkefeltet øverst.',
          'Filtrere på muskelgruppe, utstyr og vanskelighetsgrad.',
          'Trykke på en øvelse for å se detaljert beskrivelse og bilder.',
          'Legge til en øvelse direkte i en pågående økt.',
        ],
      },
      {
        heading: 'Finn det her',
        points: [
          'Start en økt først for å kunne legge til øvelser direkte.',
          'Filtrene finner du ved å trykke på "Filter"-knappen ved siden av søkefeltet.',
        ],
      },
    ],
  },
  progress: {
    title: 'Fremgang',
    description: 'Følg utviklingen din og se dine personlige rekorder over tid.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'En liste over alle øvelser du har logget, sortert etter antall sesjoner.',
          'Beregnet 1RM (One Rep Max) for hver øvelse.',
          'Graf som viser 1RM-utvikling over tid.',
          'Alle sesjoner med komplette sett, vekter og reps.',
        ],
      },
      {
        heading: 'Hva er 1RM?',
        points: [
          '1RM (One Rep Max) er den maksimale vekten du teoretisk kan løfte én gang.',
          'IronGrid beregner dette automatisk fra dine løft ved hjelp av Epley-formelen.',
          'Trykk på et rekordkort for å se en full repetisjons-maks-tabell (1RM til 12RM).',
          'Et grønt tall betyr at 1RM har økt siden forrige sesjon — fremgang!',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Trykke på en øvelse for å se detaljert fremgangshistorikk.',
          'Se alle sesjoner med tilhørende sett.',
          'Slette enkeltsesjoner om du har logget feil.',
        ],
      },
    ],
  },
  history: {
    title: 'Historikk',
    description: 'Oversikt over alle fullførte treningsøkter.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'Alle fullførte treningsøkter sortert etter dato, nyeste først.',
          'Dato, varighet og totalt volum per økt.',
          'Øvelser og sett fra hver økt.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Trykke på en økt for å se alle øvelser og sett.',
          'Slette en økt du ikke vil ha med i historikken.',
        ],
      },
    ],
  },
  profile: {
    title: 'Profil',
    description: 'Administrer kontoen din og tilpass innstillingene.',
    sections: [
      {
        heading: 'Hva du finner her',
        points: [
          'Profilinformasjon: navn, alder, høyde, vekt og kjønn.',
          'Treningsnivå og treningsmål.',
          'Innstilling for standard hvile-tid mellom sett.',
          'Hurtigstatistikk: totalt antall økter, volum og personlige rekorder.',
        ],
      },
      {
        heading: 'Hva du kan gjøre her',
        points: [
          'Endre standard hvile-tid med skyvekontrollen (30 sek til 5 min).',
          'Installere IronGrid som en app på hjemskjermen for raskere tilgang.',
          'Logge ut av kontoen din.',
        ],
      },
      {
        heading: 'Tips',
        points: [
          'Anbefalt hvile-tid for styrketrening er 2–3 minutter, for muskelvekst 60–90 sekunder.',
          'Installer appen for å få en bedre opplevelse uten nettleserens adresselinje.',
        ],
      },
    ],
  },
};

interface PageHelpSheetProps {
  tab: string;
  open: boolean;
  onClose: () => void;
}

export function PageHelpSheet({ tab, open, onClose }: PageHelpSheetProps) {
  const content = HELP_CONTENT[tab] ?? HELP_CONTENT.dashboard;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[151] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '80vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-900">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={18} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-white">{content.title}</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{content.description}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0"
              >
                <X size={15} className="text-zinc-400" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-5 py-4 pb-10 space-y-5" style={{ maxHeight: 'calc(80vh - 96px)' }}>
              {content.sections.map((section, si) => (
                <div key={si}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
                    {section.heading}
                  </p>
                  <div className="space-y-2">
                    {section.points.map((point, pi) => (
                      <div key={pi} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                        <p className="text-zinc-300 text-sm leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
