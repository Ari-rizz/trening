import { Capacitor } from '@capacitor/core';

export default function TermsPage() {
  const isMobile = Capacitor.isNativePlatform();
  const priceLabel = isMobile ? '39,9 kr' : '30 kr';

  return (
    <main className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Brukervilkår for IronGrid</h1>
      <p className="text-zinc-400 text-sm mb-8">Sist oppdatert: 3. august 2026</p>

      <div className="space-y-6 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Om tjenesten</h2>
          <p>IronGrid er en treningapp som lar brukere logge treningsøkter, spore fremgang, opprette treningsplaner og dele disse med andre. Tjenesten tilbys av IronGrid og er tilgjengelig via nettleser og mobilapp.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Brukerkonto</h2>
          <p>For å bruke IronGrid må du opprette en konto med e-post og passord. Du er ansvarlig for å holde kontodetaljene dine sikre og for all aktivitet som skjer via kontoen din. Du må være minst 16 år for å opprette konto.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Prøveperiode og abonnement</h2>
          <p>Nye brukere får en gratis prøveperiode på 30 dager. Ingen betalingskort kreves for prøveperioden. Etter prøveperioden koster abonnementet {priceLabel} per måned. Abonnementet fornyes automatisk hver måned og kan avbrytes når som helst. På iOS koster abonnementet 39,9 kr per måned og håndteres via Apple In-App Purchases; på web koster det 30 kr per måned og håndteres via Stripe. Prisforskjellen skyldes ulike betalingsplattformer og gebyrer. På iOS avbrytes abonnementet via App Store-innstillinger; på web avbrytes fra profil-fanen. Ved avbrytelse beholder du tilgang frem til slutten av den betalte perioden.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. Brukerinnhold</h2>
          <p>Du beholder eierskapet til all treningsdata og innhold du laster opp. Ved å bruke tjenesten gir du IronGrid en begrenset lisens til å lagre, vise og behandle dataene dine for å levere tjenesten. Du deler treningsplaner med andre brukere kun ved å generere en delingskode.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Ansvar og helse</h2>
          <p>IronGrid er et verktøy for trening og gir ikke medisinsk råd. Du trener på eget ansvar. Ved helseproblemer eller skader skal du rådføre deg med lege før du starter eller fortsetter trening. IronGrid er ikke ansvarlig for skader som oppstår som følge av bruk av appen.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">6. Betaling</h2>
          <p>Betaling håndteres av Apple In-App Purchases (IAP) i iOS-appen og av Stripe på web-versjonen. Apple lagrer og behandler betalingsinformasjon i henhold til sine egne sikkerhetskrav — IronGrid har ikke tilgang til selve betalingsdetaljene dine. For web-betaling lagrer Stripe kortinformasjon i henhold til PCI DSS-krav — IronGrid har ikke tilgang til selve kortnummeret. Alle betalinger er sikre og krypterte. Prismodifikasjoner kan forekomme med minst 30 dagers varsel.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">7. Sletting av konto og personvern</h2>
          <p>Du kan slette kontoen din når som helst fra profil-fanen. Ved sletting slettes all din treningsdata, mål, personlige opplysninger og egendefinerte øvelser permanent. Eventuelt aktivt abonnement avsluttes umiddelbart. Denne handlingen kan ikke angres. For detaljer om hvilke data som slettes og lagringstid, se vår personvernerklæring.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">8. Endringer av vilkår</h2>
          <p>Vi kan oppdatere disse brukervilkårene fra tid til annen. Ved vesentlige endringer vil vi varsle deg i appen eller via e-post. Fortsatt bruk av IronGrid etter endringer betyr at du godtar de oppdaterte vilkårene.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">9. Personvern og databehandlere</h2>
          <p>IronGrid bruker Supabase (database og autentisering, EU-region), Apple In-App Purchases (betaling i iOS-appen) og Stripe (betaling på web) som databehandlere. Håndtering av personopplysninger er beskrevet i vår personvernerklæring, som utgjør en del av disse brukervilkårene. Helsedata fra Apple Health leses kun med ditt eksplisitte samtykke og kan trekkes tilbake når som helst.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">10. Kontakt</h2>
          <p>Spørsmål om brukervilkårene eller personvern kan sendes via tilbakemeldingsfunksjonen i appen eller til <a href="mailto:utvikling@ai-assistant.no" className="text-red-400 underline">utvikling@ai-assistant.no</a>.</p>
        </section>
      </div>

      <div className="mt-10 mb-6">
        <a href="/" className="text-red-400 text-sm underline">Tilbake til appen</a>
      </div>
    </main>
  );
}
