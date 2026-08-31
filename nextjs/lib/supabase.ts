import { createClient } from "@supabase/supabase-js";

// Server-side client met de service-role key. NOOIT importeren in een
// client component — alleen gebruiken binnen API-routes en server components.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export type Stadium =
  | "ongeplant"
  | "zaadje"
  | "kiem"
  | "knop"
  | "openen"
  | "bloem"
  | "verwelkt"
  | "zaadvorming"
  | "zaadpluis"
  | "uitgeblazen";

export interface Zaadje {
  id: string;
  code: string;
  lijn_id: string;
  ouder_id: string | null;
  generatie: number;
  aangemaakt_op: string;
  geplant_op: string | null;
  geblazen_op: string | null;
  email: string | null;
}

/**
 * Rekent het groeistadium uit uit het plantmoment. Dit is de
 * single source of truth — bewust hier in JS gedupliceerd (naast de
 * gelijknamige SQL-functie) zodat API-routes niet steeds een extra
 * databasecall nodig hebben om een stadium te bepalen.
 *
 * Volgt de fases uit de echte paardenbloem-levenscyclus:
 * zaadje → kiem → knop → openen → bloem → verwelkt → zaadvorming → zaadpluis
 */
export function berekenStadium(z: Pick<Zaadje, "geplant_op" | "geblazen_op">): Stadium {
  if (z.geblazen_op) return "uitgeblazen";
  if (!z.geplant_op) return "ongeplant";

  const uurGeleden = (Date.now() - new Date(z.geplant_op).getTime()) / 3_600_000;

  // Testversnelling: zet TEMPO=snel in .env.local om 1 uur te comprimeren
  // tot een paar seconden tijdens het testen. Nooit aanzetten in productie.
  const factor = process.env.TEMPO === "snel" ? 1 / 60 : 1;
  const u = uurGeleden / factor;

  if (u < 8) return "zaadje";
  if (u < 24) return "kiem";
  if (u < 40) return "knop";
  if (u < 56) return "openen";
  if (u < 80) return "bloem";
  if (u < 96) return "verwelkt";
  if (u < 120) return "zaadvorming";
  if (u < 168) return "zaadpluis"; // klaar om te blazen, t/m dag 7
  return "verwelkt"; // na 7 dagen: niet doorgeblazen, urgentie-mechaniek
}

export function genereerCode(lengte = 8) {
  const alfabet = "abcdefghijkmnpqrstuvwxyz23456789"; // zonder verwarrende tekens (0/o, 1/l)
  let code = "";
  for (let i = 0; i < lengte; i++) {
    code += alfabet[Math.floor(Math.random() * alfabet.length)];
  }
  return code;
}
