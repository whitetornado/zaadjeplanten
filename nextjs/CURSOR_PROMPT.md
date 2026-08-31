# Zo gebruik je dit in Cursor

## 1. Openen en installeren

1. Zet deze map bovenop je bestaande GitHub-repo (overschrijf `index.html`
   gerust, dat wordt straks `public/prototype.html`).
2. Open de map in Cursor.
3. Terminal in Cursor: `npm install`
4. Kopieer `.env.example` naar `.env.local` en vul de drie Supabase-waarden
   in (Supabase → Settings → API) plus je site-URL.
5. `npm run dev` → open `http://localhost:3000`

## 2. Wat al werkt (door mij gebouwd, niet aankomen tenzij nodig)

- `lib/supabase.ts` — database-verbinding + de `berekenStadium()`-functie
  die het groeistadium uitrekent uit het plantmoment. **Dit is de bron van
  waarheid** — nooit een stadium client-side laten bepalen.
- `app/s/[code]/route.ts` — QR gescand → nieuw uniek zaadje → redirect
- `app/api/plant/route.ts` — legt het plantmoment vast
- `app/api/blaas/route.ts` — maakt het volgende (kind-)zaadje aan
- `app/api/podium/nieuw/route.ts` — start een podiumsessie voor Oleg

Deze routes verwachten het SQL-schema dat al eerder gedeeld is
(tabellen `lijnen`, `zaadjes`, `podiumsessies`, `gebeurtenissen`). Zorg dat
dat in Supabase staat voor je verder gaat.

## 3. Wat jij (Cursor) nog moet doen — kopieer dit als prompt

```
In /public/prototype.html staat een werkend, zelfstandig HTML-prototype
met een canvas-animatie van een paardenbloem (pluisjes-engine, groeifases,
microfoon-blaasdetectie, een QR-zaadje-weergave en een blaasgeluid als
base64-audio). Ik wil de VISUELE en INTERACTIEVE logica daaruit overzetten
naar twee React client components:

1. app/z/[code]/ZaadjeClient.tsx (bestaat al als kale placeholder)
   - Neem de canvas-tekenfuncties over (tekenGrond, tekenSteel, tekenBlad,
     tekenZaadje, tekenKnop, tekenOpenen, tekenBloem, tekenVerwelken,
     tekenZaadvorming, tekenBlaasbloem, tekenPluisje) en de pluisjes-engine
     (bouwPluisjes, blaas()) als functies binnen het component, met een
     canvas-ref via useRef + useEffect voor de animatielus.
   - BELANGRIJK VERSCHIL met het prototype: het stadium komt niet meer uit
     een lokale timer of URL-parameter, maar uit de prop `stadiumBijLaden`
     (server-berekend, zie lib/supabase.ts). Render de canvas op basis van
     dat stadium. Een lokale "demo: spoel tijd vooruit"-knop mag alleen
     zichtbaar zijn in ontwikkeling (bijv. process.env.NODE_ENV !== "production"),
     nooit in productie — anders kan iemand de groei clientside faken.
   - Roep de bestaande `plant()` functie aan bij het planten (al gekoppeld
     aan /api/plant), en roep `blaasKlaar()` aan zodra in de animatie alle
     pluisjes weg zijn (vast === 0 in de canvas-lus) — dat triggert
     /api/blaas en toont het deelpaneel met de teruggekregen `deelLink`.
   - Neem de microfoon-blaasdetectie (Web Audio API, RMS-drempel 0.12) en
     de tik-op-de-bloem-fallback 1-op-1 over.
   - Neem het blaasgeluid (de <audio>-tag met base64-bron) over.
   - Neem de terugkom-kiezer (push/mail/agenda, met de .ics-download) over
     als aparte sectie, met dezelfde teksten.

2. app/podium/page.tsx (bestaat al als kale placeholder)
   - Neem de podium-modus over: de volle blaasbloem-canvas die direct
     klaar is om te blazen, en na het wegblazen het QR-zaadje (gebruik de
     qrcodejs-library zoals in het prototype) met `qrUrl` uit
     `/api/podium/nieuw` als inhoud.
   - Na een sessie: knop om een "nieuwe bloem" te starten voor de
     volgende persoon (nieuwe aanroep naar /api/podium/nieuw).

Herbruik zoveel mogelijk letterlijke code uit prototype.html — het is al
getest en werkt op straat. Verander alleen wat nodig is om met de server
(props/API-routes) te praten in plaats van met URL-parameters en een
lokale timer.
```

## 4. Testversnelling

Zet in `.env.local`: `TEMPO=snel` — dan comprimeert `berekenStadium()`
1 uur tot 1 minuut, zodat je de hele cyclus (normaal ± 7 dagen) in
een paar minuten kunt doorlopen. **Nooit** op de live site aanzetten.

## 5. Als je vastloopt

Vraag Cursor gericht naar het specifieke stuk ("waarom triggert
blaasKlaar() niet", "de QR verschijnt niet") in plaats van in één keer
alles opnieuw te laten genereren — dat werkt beter met bestaande code.
