import { createClient } from "@supabase/supabase-js";

// Server-side client met de service-role key. NOOIT importeren in een
// client component — alleen gebruiken binnen API-routes en server components.
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}

/** Alleen aggregaatcijfers voor de publieke homepage. Geen e-mail, code of lijnnaam. */
export type PubliekeTuinCijfers = {
  totaalZaadjes: number;
  diepsteGeneratie: number;
  geplant: number;
  geplantZaadje: number;
  geplantKiem: number;
  geplantKnop: number;
  geplantOpenen: number;
  bloeiend: number;
  klaar: number;
  verspreid: number;
};

export async function haalPubliekeTuinCijfers(): Promise<PubliekeTuinCijfers> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, next: { revalidate: 60 } } as RequestInit),
      },
    }
  );

  const pagina = 1000;
  const rijen: Pick<Zaadje, "geplant_op" | "geblazen_op" | "generatie">[] = [];
  for (let van = 0; ; van += pagina) {
    const { data, error } = await supabase
      .from("zaadjes")
      .select("geplant_op, geblazen_op, generatie")
      .range(van, van + pagina - 1);
    if (error || !data?.length) break;
    rijen.push(...data);
    if (data.length < pagina) break;
  }

  const leeg: PubliekeTuinCijfers = {
    totaalZaadjes: 0,
    diepsteGeneratie: 0,
    geplant: 0,
    geplantZaadje: 0,
    geplantKiem: 0,
    geplantKnop: 0,
    geplantOpenen: 0,
    bloeiend: 0,
    klaar: 0,
    verspreid: 0,
  };

  return rijen.reduce((acc, z) => {
    acc.totaalZaadjes += 1;
    acc.diepsteGeneratie = Math.max(acc.diepsteGeneratie, z.generatie ?? 0);
    const stadium = berekenStadium(z);
    if (stadium === "zaadje") { acc.geplantZaadje += 1; acc.geplant += 1; }
    else if (stadium === "kiem") { acc.geplantKiem += 1; acc.geplant += 1; }
    else if (stadium === "knop") { acc.geplantKnop += 1; acc.geplant += 1; }
    else if (stadium === "openen") { acc.geplantOpenen += 1; acc.geplant += 1; }
    else if (stadium === "bloem") acc.bloeiend += 1;
    else if (stadium === "zaadpluis") acc.klaar += 1;
    else if (stadium === "uitgeblazen") acc.verspreid += 1;
    return acc;
  }, leeg);
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
  gewonnen_op?: string | null;
  bloei_mail_verzonden_op?: string | null;
}

export type TuinLijn = {
  id: string;
  naam: string;
  aantal: number;
  diepste: number;
  levend: number;
};

export type TuinPrijs = {
  id: string;
  email: string;
  generatie: number;
  lijnNaam: string;
  geplant_op: string | null;
  geblazen_op: string | null;
  gewonnen_op: string | null;
};

type PrijsRij = {
  id: string;
  email: string | null;
  generatie: number;
  geplant_op: string | null;
  geblazen_op: string | null;
  gewonnen_op?: string | null;
  lijnen: { naam: string } | { naam: string }[] | null;
};

export type TuinOverzicht = {
  totaalZaadjes: number;
  totaalGeblazen: number;
  totaalEmails: number;
  diepsteGeneratie: number;
  lijnen: TuinLijn[];
  prijzen: TuinPrijs[];
  gewonnenKolomOntbreekt: boolean;
};

function lijnNaamVanJoin(waarde: unknown) {
  if (!waarde) return "onbekend";
  if (Array.isArray(waarde)) return waarde[0]?.naam ?? "onbekend";
  if (typeof waarde === "object" && "naam" in waarde) {
    return String((waarde as { naam?: string }).naam ?? "onbekend");
  }
  return "onbekend";
}

export async function haalTuinOverzicht(): Promise<TuinOverzicht> {
  const supabase = supabaseServer();

  const { data: zaadjes } = await supabase
    .from("zaadjes")
    .select("id, lijn_id, generatie, geplant_op, geblazen_op, email");

  const { data: lijnenRijen } = await supabase
    .from("lijnen")
    .select("id, naam")
    .order("naam");

  const alle = zaadjes ?? [];
  const totaalZaadjes = alle.length;
  const totaalGeblazen = alle.filter((z) => z.geblazen_op).length;
  const totaalEmails = alle.filter((z) => typeof z.email === "string" && z.email.trim()).length;
  const diepsteGeneratie = alle.reduce((m, z) => Math.max(m, z.generatie ?? 0), 0);

  const perLijn = new Map<string, TuinLijn>();
  for (const lijn of lijnenRijen ?? []) {
    perLijn.set(lijn.id, { id: lijn.id, naam: lijn.naam, aantal: 0, diepste: 0, levend: 0 });
  }
  for (const z of alle) {
    let lijn = perLijn.get(z.lijn_id);
    if (!lijn) {
      lijn = { id: z.lijn_id, naam: "onbekend", aantal: 0, diepste: 0, levend: 0 };
      perLijn.set(z.lijn_id, lijn);
    }
    lijn.aantal += 1;
    lijn.diepste = Math.max(lijn.diepste, z.generatie ?? 0);
    const stadium = berekenStadium(z);
    if (stadium !== "verwelkt" && stadium !== "ongeplant") lijn.levend += 1;
  }

  let gewonnenKolomOntbreekt = false;
  try {
    const { error: kolomFout } = await supabase
      .from("zaadjes")
      .select("gewonnen_op")
      .limit(1);
    gewonnenKolomOntbreekt = kolomFout != null;
  } catch {
    gewonnenKolomOntbreekt = true;
  }

  const prijsVelden = gewonnenKolomOntbreekt
    ? "id, email, generatie, geplant_op, geblazen_op, lijnen(naam)"
    : "id, email, generatie, geplant_op, geblazen_op, gewonnen_op, lijnen(naam)";
  const { data: prijsRijen } = await supabase
    .from("zaadjes")
    .select(prijsVelden)
    .gte("generatie", 10)
    .not("email", "is", null)
    .order("generatie", { ascending: false });

  const prijsRijenGetypeerd = (prijsRijen ?? []) as unknown as PrijsRij[];

  const prijzen: TuinPrijs[] = prijsRijenGetypeerd
    .filter((z) => typeof z.email === "string" && z.email.trim())
    .map((z) => ({
      id: z.id,
      email: z.email as string,
      generatie: z.generatie,
      lijnNaam: lijnNaamVanJoin(z.lijnen),
      geplant_op: z.geplant_op,
      geblazen_op: z.geblazen_op,
      gewonnen_op: z.gewonnen_op ?? null,
    }));

  return {
    totaalZaadjes,
    totaalGeblazen,
    totaalEmails,
    diepsteGeneratie,
    lijnen: [...perLijn.values()].sort((a, b) => b.aantal - a.aantal),
    prijzen,
    gewonnenKolomOntbreekt,
  };
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

/** Einde van elke groeifase in uren na planten. Zaadpluis begint bij 120. */
const FASE_UREN = [8, 24, 40, 56, 80, 96, 120, 168] as const;

/** Hele uren tot de volgende fase, of null in zaadpluis / ongeplant / uitgeblazen. */
export function urenTotVolgendeFase(z: Pick<Zaadje, "geplant_op" | "geblazen_op">): number | null {
  if (z.geblazen_op || !z.geplant_op) return null;

  const uurGeleden = (Date.now() - new Date(z.geplant_op).getTime()) / 3_600_000;
  const factor = process.env.TEMPO === "snel" ? 1 / 60 : 1;
  const u = uurGeleden / factor;

  // Laatste fase (zaadpluis, of daarna) telt af op de gebruiker, niet op de klok.
  if (u >= 120) return null;

  const volgende = FASE_UREN.find((drempel) => u < drempel);
  if (volgende == null) return null;
  return Math.max(0, Math.round(volgende - u));
}

export function genereerCode(lengte = 8) {
  const alfabet = "abcdefghijkmnpqrstuvwxyz23456789"; // zonder verwarrende tekens (0/o, 1/l)
  let code = "";
  for (let i = 0; i < lengte; i++) {
    code += alfabet[Math.floor(Math.random() * alfabet.length)];
  }
  return code;
}
