export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Personvernerklæring for IronGrid</h1>
      <p className="text-zinc-400 text-sm mb-8">Sist oppdatert: 2. august 2026</p>

      <div className="space-y-6 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-2">1. Hvilke data vi samler inn</h2>
          <p className="mb-3">
            IronGrid samler inn personopplysninger som er nødvendige for å levere
            tjenesten. Vi kategoriserer dataene slik:
          </p>
          <p><strong className="text-zinc-200">Kontodata:</strong> E-postadresse og passord (kryptert via Supabase Auth). Navn oppgis frivillig under onboarding.</p>
          <p><strong className="text-zinc-200">Treningsdata:</strong> Økter, øvelser, vekter, reps, sett, hviletider, notater, personlige rekorder, superset-grupper og treningsplaner.</p>
          <p><strong className="text-zinc-200">Kroppsdata:</strong> Kroppsvekt og eventuelle kalorilogger du registrerer manuelt i appen.</p>
          <p><strong className="text-zinc-200">Helsedata (Apple Health / HealthKit):</strong> Med din eksplisitte tillatelse kan IronGrid lese og skrive treningsdata og kroppsvekt fra Apple Health. Helsedata lagres også i din IronGrid-konto via Supabase slik at du kan se historikk på tvers av enheter.</p>
          <p><strong className="text-zinc-200">Mål og preferanser:</strong> Treningsmål, varigheter, og personlige øvelsesinnstillinger (f.eks. alternative navn på øvelser).</p>
          <p><strong className="text-zinc-200">Tilbakemeldinger:</strong> Innhold du sender via tilbakemeldingsfunksjonen i appen.</p>
          <p><strong className="text-zinc-200">Varselinnstillinger:</strong> Hvilke push-varsler du har slått på eller av (hviletid, vektpåminnelse, øktpåminnelse, målpåminnelse).</p>
          <p><strong className="text-zinc-200">Abonnementsdata:</strong> Abonnementsstatus og kjøpsbekreftelse (håndtert av Apple In-App Purchases i iOS og Stripe på web — se punkt 5).</p>
          <p><strong className="text-zinc-200">Teknisk data:</strong> Plattform (iOS/Android/web) og app-versjon. Vi samler ikke posisjonsdata, nettleserhistorikk eller enhets-ID-er for sporing.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">2. Hvordan vi bruker dataene</h2>
          <p>Vi bruker dataene utelukkende for å:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Levere treningstjenesten og vise fremgang over tid</li>
            <li>Lagre og synkronisere treningsplaner på tvers av enheter</li>
            <li>Synkronisere treningsøkter og kroppsvekt med Apple Health</li>
            <li>Beregne muskelbalanse og gi personlige anbefalinger basert på din trening</li>
            <li>Behandle abonnement og betaling via Apple In-App Purchases (iOS) og Stripe (web)</li>
            <li>Send push-varsler du har aktivert</li>
            <li>Forbedre appens funksjonalitet og brukeropplevelse</li>
          </ul>
          <p className="mt-3">
            Dataene dine brukes <strong className="text-zinc-200">ikke</strong> til å trene
            AI-modeller, profilere deg for markedsføring, eller selges til tredjeparter.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">3. Rettslig grunnlag for behandling</h2>
          <p>Behandlingen av personopplysningene dine bygger på følgende rettslige grunnlag i henhold til GDPR:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-zinc-200">Avtale (art. 6(1)(b)):</strong> Behandling som er nødvendig for å levere tjenesten du har bedt om — lagring av treningsdata, planer og kontoinformasjon.</li>
            <li><strong className="text-zinc-200">Samtykke (art. 6(1)(a) og art. 9(2)(a)):</strong> For helsedata fra Apple Health og for push-varsler. Du kan trekke tilbake samtykket når som helst.</li>
            <li><strong className="text-zinc-200">Berettiget interesse (art. 6(1)(f)):</strong> For teknisk data (app-versjon, plattform) som trengs for å drifte og feilsøke tjenesten.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">4. Deling av data</h2>
          <p>Vi selger aldri dataene dine til tredjeparter. Deling skjer kun i følgende tilfeller:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-zinc-200">Plan-deling:</strong> Når du deler en treningsplan, genereres en unik 6-tegns kode. Andre brukere kan kun se ditt brukernavn — ikke e-post, navn eller andre profildata.</li>
            <li><strong className="text-zinc-200">Apple Health:</strong> Helsedata deles kun mellom appen og Apple Health på din enhet, og kun med ditt samtykke.</li>
            <li><strong className="text-zinc-200">Apple In-App Purchases (betaling i iOS):</strong> Kjøp og abonnementer i iOS-appen behandles av Apple. Apple lagrer betalingsinformasjon — IronGrid lagrer kun bekreftelse på aktivt abonnement, ikke selve betalingsdetaljene. Se punkt 5 for detaljer.</li>
            <li><strong className="text-zinc-200">Stripe (betaling på web):</strong> For web-versjonen behandles betalinger av Stripe. Betalingsinformasjon lagres ikke på IronGrids servere. Se punkt 5 for detaljer.</li>
          </ul>
          <p className="mt-3">
            Vi deler ikke data med myndigheter med mindre vi er lovpålagt å gjøre det.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">5. Databehandlere (underleverandører)</h2>
          <p>
            IronGrid bruker følgende databehandlere for å lagre og behandle
            personopplysningene dine. Alle leverandører er GDPR-kompatible og
            har inngått databehandleravtaler (DPA):
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-zinc-200">Supabase (databehandler):</strong> Lagrer all treningsdata, kontodata, mål, tilbakemeldinger og varselinnstillinger i en PostgreSQL-database. Supabase leverer også autentisering (innlogging). Dataene lagres i EU-region (se punkt 6). Supabase er sertifisert i henhold til GDPR og SOC 2 Type II. Nettside: supabase.com.</li>
            <li><strong className="text-zinc-200">Apple (In-App Purchases):</strong> Behandler kjøp og abonnementer i iOS-appen. Apple lagrer betalingsinformasjon i henhold til sine egne sikkerhetskrav — IronGrid har ikke tilgang til selve betalingsdetaljene. Apple er GDPR-kompatibel. Nettside: apple.com.</li>
            <li><strong className="text-zinc-200">Stripe (databehandler for web-betaling):</strong> Behandler betalinger og abonnementer for web-versjonen. Stripe lagrer kortinformasjon og betalingshistorikk — IronGrid har ikke tilgang til selve kortnummeret. Stripe er PCI DSS-sertifisert og GDPR-kompatibel. Nettside: stripe.com.</li>
            <li><strong className="text-zinc-200">Apple (Apple Health):</strong> Helsedata på din enhet håndteres av Apple HealthKit. Apple er databehandler for helsedata som lagres lokalt på enheten din.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">6. Lagring og sikkerhet</h2>
          <p><strong className="text-zinc-200">Lagringssted:</strong> Alle data lagres i Supabase sin database i EU-region (Irland). Dette gir et sterkt utgangspunkt for GDPR-samsvar for en norsk app.</p>
          <p><strong className="text-zinc-200">Kryptering under overføring:</strong> All kommunikasjon mellom appen og databasen er kryptert via HTTPS/TLS.</p>
          <p><strong className="text-zinc-200">Kryptering ved lagring:</strong> Supabase krypterer data ved lagring (encryption at rest) i databasen.</p>
          <p><strong className="text-zinc-200">Row Level Security (RLS):</strong> Alle tabeller i databasen har RLS aktivert. Dette betyr at hver bruker kun kan lese og skrive sine egne data — ingen andre brukere kan se treningshistorikk, profil eller mål tilhørende deg.</p>
          <p><strong className="text-zinc-200">Passord:</strong> Passord lagres aldri i klartekst. Supabase Auth bruker bcrypt-hashing med salt.</p>
          <p><strong className="text-zinc-200">Betaling:</strong> Betalingsinformasjon håndteres utelukkende av Apple (iOS) eller Stripe (web) og lagres aldri på IronGrids servere.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">7. Lagringstid</h2>
          <p>Vi lagrer ikke data lenger enn nødvendig:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-zinc-200">Konto- og treningsdata:</strong> Lagres så lenge kontoen din er aktiv. Når du sletter kontoen, slettes alle data permanent (se punkt 9).</li>
            <li><strong className="text-zinc-200">Tilbakemeldinger:</strong> Lagres i opptil 12 måneder etter mottatt, deretter slettes de automatisk.</li>
            <li><strong className="text-zinc-200">Abonnementsdata:</strong> Kjøpsbekreftelse hos Apple lagres i henhold til Apples retningslinjer og bokføringskrav. IronGrid lagrer kun abonnementsstatus, ikke selve betalingsdetaljene. For web-betaling lagres betalingshistorikk hos Stripe i henhold til Stripes retningslinjer (normalt 5–7 år).</li>
            <li><strong className="text-zinc-200">Teknisk data:</strong> Slettes når kontoen slettes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">8. Dataoverføring utenfor EU/EØS</h2>
          <p>
            Hoveddataene dine lagres i EU-region (Supabase, Irland). Apple
            behandler In-App Purchases-data i henhold til Apples egne
            personvernprinsipper, som inkluderer Standard Contractual Clauses
            (SCC) for overføringer til land utenfor EU/EØS. Stripe kan behandle
            betalingsdata for web-versjonen i andre land, men overføringer skjer
            i henhold til Stripes egne GDPR-tilpasninger og Standard Contractual
            Clauses (SCC). Apple Health-data lagres lokalt på din enhet og
            overføres ikke til IronGrids servere uten ditt samtykke.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">9. Sletting av konto og data</h2>
          <p>
            Du kan slette kontoen din når som helst direkte fra profil-fanen i
            appen. Når du sletter kontoen:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Eventuelt aktivt abonnement kanselleres umiddelbart (iOS: via App Store-innstillinger, web: via profil-fanen)</li>
            <li>All treningshistorikk, mål, vektlogger, personlige rekorder og øvelsespreferanser slettes permanent</li>
            <li>Egendefinerte øvelser du har laget slettes</li>
            <li>Delte planer og delingskoder slettes</li>
            <li>Profilen og innloggingskontoen slettes</li>
          </ul>
          <p className="mt-3">
            Slettingen er permanent og kan ikke angres. Betalingshistorikk hos
            Apple eller Stripe kan være beholdt i henhold til bokføringskrav,
            men knyttes ikke lenger til en aktiv brukerkonto hos IronGrid.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">10. Dine rettigheter (GDPR)</h2>
          <p>I henhold til GDPR har du rett til:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-zinc-200">Innsyn (art. 15):</strong> Få vite hvilke data vi har om deg og få kopi av dem.</li>
            <li><strong className="text-zinc-200">Rettelse (art. 16):</strong> Korrigere feil i dataene vi har om deg.</li>
            <li><strong className="text-zinc-200">Sletting (art. 17):</strong> Be om at dataene dine slettes ("retten til å bli glemt").</li>
            <li><strong className="text-zinc-200">Begrensning av behandling (art. 18):</strong> Be oss midlertidig stoppe behandling av dataene dine.</li>
            <li><strong className="text-zinc-200">Dataportabilitet (art. 20):</strong> Få eksportert treningsdataene dine i et maskinlesbart format.</li>
            <li><strong className="text-zinc-200">Innsigelse (art. 21):</strong> Si nei til visse typer behandling, inkludert markedsføring.</li>
            <li><strong className="text-zinc-200">Tilbaketrekking av samtykke (art. 7(3)):</strong> Trekke tilbake samtykket for helsedata og push-varsler når som helst, uten at det påvirker lovligheten av behandling som allerede er utført.</li>
          </ul>
          <p className="mt-3">
            For å utøve disse rettighetene: slett kontoen direkte fra
            profil-fanen, eller send en forespørsel via tilbakemeldingsfunksjonen
            i appen. Vi besvarer forespørsler innen 30 dager.
          </p>
          <p className="mt-2">
            Du har også rett til å klage til Datatilsynet (datatilsynet.no) hvis
            du mener vi ikke behandler dataene dine i tråd med GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">11. Automatisert beslutning og profilering</h2>
          <p>
            IronGrid bruker ikke automatiserte beslutninger med rettsvirkning
            eller profilering i henhold til artikkel 22 i GDPR. Appen kan gi
            personlige anbefalinger (f.eks. muskelbalanse-tips) basert på
            treningsdataene dine, men dette er verken automatisert
            beslutningstaking eller profilering — det er verktøy som hjelper
            deg med å trene bedre.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">12. Varsler</h2>
          <p>
            Push-varsler sendes kun for funksjoner du har aktivert: hviletids-timer,
            vektpåminnelse, øktpåminnelse og målpåminnelse. Du kan når som helst
            slå av alle varsler i profil-fanen. Varsler sendes lokalt fra enheten
            din og lagres ikke på IronGrids servere.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">13. Barns personvern</h2>
          <p>
            IronGrid er ikke rettet mot barn under 16 år. Vi samler ikke bevisst
            data fra barn. Hvis du mener vi har samlet data fra et barn under
            16 år, kontakt oss via tilbakemeldingsfunksjonen, så sletter vi
            dataene umiddelbart.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">14. Endringer i personvernerklæringen</h2>
          <p>
            Vi kan oppdatere denne erklæringen fra tid til annen. Vesentlige
            endringer vil varsles i appen eller via e-post. Datoen øverst i
            erklæringen oppdateres ved hver endring. Fortsatt bruk av IronGrid
            etter en endring betyr at du godtar den oppdaterte erklæringen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-2">15. Kontakt</h2>
          <p>
            Spørsmål om personvern eller forespørsler om å utøve dine rettigheter
            kan sendes via tilbakemeldingsfunksjonen i appen eller til
            <a href="mailto:utvikling@ai-assistant.no" className="text-red-400 underline"> utvikling@ai-assistant.no</a>.
            Du kan også slette kontoen din og alle tilhørende data direkte fra profil-fanen.
          </p>
        </section>
      </div>

      <div className="mt-10 mb-6">
        <a href="/" className="text-red-400 text-sm underline">Tilbake til appen</a>
      </div>
    </main>
  );
}
