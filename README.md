# zaadjeplanten

Digitale blaasbloem-ervaring voor Oleg Morozov (olegpianist.nl) —
onderdeel van *Liefde. Muziek & Schoonheid redden de wereld*.

## Status: eerste werkende versie (v1)

Eén zelfstandig HTML-bestand (`index.html`), zonder backend. Werkt nu al
als statische site — ideaal om deze week op straat te testen.

- **Ontvanger:** `/` — zaadje planten, laten groeien, blazen, doorgeven
- **Podium (Oleg's telefoon):** `/?podium&lijn=naam-van-het-optreden`

## Wat nog ontbreekt (bewust, voor latere fase)

- Geen database — generaties lopen via URL-parameters (`?lijn=...&g=...`),
  niet server-side. Niet te vervalsen-proof, maar prima voor een eerste test.
- Geen e-mails die echt verstuurd worden (Resend nog niet gekoppeld)
- Geen tuin-overzicht / admin-dashboard
- Zie `stappenplan-zaadjeplanten.md` (los gedeeld) voor het volledige
  databaseschema en de vervolgstappen richting Supabase + Resend.

## Lokaal bekijken

Gewoon `index.html` openen in een browser, of op een telefoon via de
live Vercel-URL hieronder — de microfoon-blaasdetectie vraagt om
HTTPS, dus lokaal openen via `file://` werkt wel voor de groei-fases
maar niet voor de mic.

## Live

Gekoppeld aan Vercel → domein `zaadjeplanten.nl` volgt zodra de DNS
staat.
