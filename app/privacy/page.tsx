export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Personvernerklæring for IronGrid</h1>
      <p className="text-zinc-400 text-sm mb-8">Sist oppdatert: 20. juli 2026</p>

      <div className="space-y-6 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Hvilke data vi samler</h2>
          <p><strong className="text-zinc-200">Kontodata:</strong> Navn, e-postadresse, og passord (kryptert).</p>
          <p><strong className="text-zinc-200">Treningsdata:</strong> Økter, øvelser, vekter, reps, sett, hviletider, notater, personlige rekorder og treningsplaner.</p>
          <p><strong className="text-zinc-200">Helsedata:</strong> Kroppsvekt og treningsmål du velger å logge.</p>
          <p><strong className="text-zinc-200">Tilbakemeldinger:</strong> Innhold du sender via tilbakemeldingsfunksjonen.</p>
          <p><strong className="text-zinc-200">Teknisk data:</strong> Plattform (iOS/Android/web) og app-versjon. Vi samler ikke posisjonsdata eller nettleserhistorikk.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Hvordan vi bruker dataene</h2>
          <p>Vi bruker dataene utelukkende for å:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Levere treningstjenesten og vise fremgang</li>
            <li>Lagre og synkronisere treningsplaner på tvers av enheter</li>
            <li>Forbedre appen og tilby personlige anbefalinger</li>
            <li>Behandle abonnement og betaling</li>
            <li>Send push-varsler du har aktivert</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Deling av data</h2>
          <p>Vi selger aldri dataene dine til tredjeparter. Treningsplaner du velger å dele genererer en unik 6-tegns kode som andre kan bruke for å importere planen. Din profil viser kun brukernavnet ditt til de du deler med.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. Lagring og databehandling</h2>
          <p>Treningsdata og kontoinformasjon lagres hos Supabase i EU-region. Betalingsinformasjon håndteres av Stripe og lagres ikke på IronGrids servere. All kommunikasjon er kryptert via HTTPS/TLS.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Dine rettigheter</h2>
          <p>I henhold til GDPR har du rett til:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Innsyn i dataene vi har om deg</li>
            <li>Rettelse av feil i dataene</li>
            <li>Sletting av konto og alle data</li>
            <li>Dataportabilitet (eksport av treningsdata)</li>
            <li>Innsigelse mot visse typer behandling</li>
          </ul>
          <p className="mt-2">For å utøve disse rettighetene, bruk tilbakemeldingsfunksjonen i appen eller slett kontoen direkte fra profil-fanen.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">6. Varsler</h2>
          <p>Push-varsler sendes kun for funksjoner du har aktivert (hviletids-timer, vektpåminnelse, øktpåminnelse, målpåminnelse). Du kan når som helst slå av varsler i profil-fanen.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">7. Barns personvern</h2>
          <p>IronGrid er ikke rettet mot barn under 16 år. Vi samler ikke bevisst data fra barn. Hvis du mener vi har samlet data fra et barn, kontakt oss via tilbakemeldingsfunksjonen.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">8. Endringer i personvernerklæringen</h2>
          <p>Vi kan oppdatere denne erklæringen. Vesentlige endringer vil varsles i appen eller via e-post.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">9. Kontakt</h2>
          <p>Spørsmål om personvern kan sendes via tilbakemeldingsfunksjonen i appen.</p>
        </section>
      </div>

      <div className="mt-10 mb-6">
        <a href="/" className="text-red-400 text-sm underline">Tilbake til appen</a>
      </div>
    </main>
  );
}
