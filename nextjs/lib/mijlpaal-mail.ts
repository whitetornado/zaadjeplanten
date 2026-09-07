import { Resend } from "resend";
import { PRIJS_MIJLPAAL } from "@/lib/prijs-tekst";
import { haalKetenNaarWortel, supabaseServer } from "@/lib/supabase";

const PRIJS_GENERATIE = 3;
const VAN = "Oleg Morozov <bloem@zaadjeplanten.nl>";

function bruikbareEmails(waarden: (string | null)[]): string[] {
  const gezien = new Set<string>();
  const adressen: string[] = [];
  for (const raw of waarden) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v) continue;
    const sleutel = v.toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    adressen.push(v);
  }
  return adressen;
}

function olegAdres(): string | null {
  const v = (
    process.env.OLEG_NOTIFICATIE_EMAIL ||
    process.env.VAPID_CONTACT_EMAIL ||
    ""
  ).trim();
  return v || null;
}

function escapeHtml(tekst: string) {
  return tekst
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Stuurt de eenmalige mijlpaal-mails als deze keten nu voor het eerst
 * generatie 3 bereikt of overschrijdt. Faalt stil — de blaas zelf is al gelukt.
 */
export async function stuurMijlpaalAlsNodig(opties: {
  kindId: string;
  lijnNaam: string;
  site: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { schakels, mijlpaalKolom } = await haalKetenNaarWortel(opties.kindId);
  if (schakels.length === 0) return;

  const hoogste = schakels.reduce((m, s) => Math.max(m, s.generatie ?? 0), 0);
  if (hoogste < PRIJS_GENERATIE) return;
  if (mijlpaalKolom) {
    if (schakels.some((s) => s.mijlpaal_mail_verzonden_op)) return;
  } else if (schakels[0]?.generatie !== PRIJS_GENERATIE) {
    return;
  }

  const deelnemers = bruikbareEmails(schakels.map((s) => s.email));
  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const aan of deelnemers) {
    const { error } = await resend.emails.send({
      from: VAN,
      to: aan,
      subject: "🎉 Jullie zaadje maakt kans op een prijs!",
      html: `
      <p>${PRIJS_MIJLPAAL}</p>
      <p>Dit zaadje is al minstens 3 keer doorgegeven.</p>
      <p>Oleg neemt contact op bij een eventuele winst.</p>
    `,
    });
    if (error) console.warn("mijlpaal-mail deelnemer mislukt", aan, error.message);
  }

  const oleg = olegAdres();
  if (oleg) {
    const lijst = deelnemers.length
      ? deelnemers.map((e) => escapeHtml(e)).join("<br>")
      : "nog geen e-mailadressen in deze keten";
    const { error } = await resend.emails.send({
      from: VAN,
      to: oleg,
      subject: `Een zaadje bereikte generatie 3 — lijn ${opties.lijnNaam}`,
      html: `
      <p>Lijn <strong>${escapeHtml(opties.lijnNaam)}</strong> heeft generatie ${hoogste} bereikt.</p>
      <p>E-mailadressen in deze keten:</p>
      <p>${lijst}</p>
      <p><a href="${opties.site}/tuin">Open de tuin</a> voor het volledige overzicht.</p>
    `,
    });
    if (error) console.warn("mijlpaal-mail Oleg mislukt", error.message);
  } else {
    console.warn("mijlpaal-mail: geen OLEG_NOTIFICATIE_EMAIL of VAPID_CONTACT_EMAIL");
  }

  const { error: vlagFout } = await supabaseServer()
    .from("zaadjes")
    .update({ mijlpaal_mail_verzonden_op: new Date().toISOString() })
    .eq("id", opties.kindId);
  if (vlagFout) console.warn("mijlpaal-vlag zetten mislukt", vlagFout.message);
}
