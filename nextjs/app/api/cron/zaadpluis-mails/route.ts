import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { stuurPush } from "@/lib/push";
import { berekenStadium, supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bruikbareEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim();
  return v || null;
}

function dagenTotVerwelken(geplantOp: string): number {
  const uurGeleden = (Date.now() - new Date(geplantOp).getTime()) / 3_600_000;
  const factor = process.env.TEMPO === "snel" ? 1 / 60 : 1;
  const u = uurGeleden / factor;
  return Math.max(0, Math.round((168 - u) / 24));
}

function termijnTekst(dagen: number): string {
  if (dagen <= 0) return "minder dan een dag";
  if (dagen === 1) return "ongeveer 1 dag";
  return `ongeveer ${dagen} dagen`;
}

export async function GET(req: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization");
    if (!secret || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ fout: "niet toegestaan" }, { status: 401 });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ fout: "RESEND_API_KEY ontbreekt" }, { status: 500 });
  }

  const supabase = supabaseServer();
  const { data: kandidaten, error } = await supabase
    .from("zaadjes")
    .select("id, code, email, push_abonnement, geplant_op, geblazen_op")
    .or("email.not.is.null,push_abonnement.not.is.null")
    .is("zaadpluis_mail_verzonden_op", null)
    .not("geplant_op", "is", null)
    .is("geblazen_op", null);

  if (error) {
    return NextResponse.json({ fout: error.message }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const klaar = (kandidaten ?? []).filter(
    (z) =>
      berekenStadium(z) === "zaadpluis" &&
      (bruikbareEmail(z.email) || z.push_abonnement)
  );

  let verzonden = 0;
  const fouten: string[] = [];

  for (const zaadje of klaar) {
    const mailAdres = bruikbareEmail(zaadje.email);
    const url = `${site}/z/${zaadje.code}`;
    const dagen = zaadje.geplant_op ? dagenTotVerwelken(zaadje.geplant_op) : 0;
    const termijn = termijnTekst(dagen);
    const titel = "🌸 Ze is klaar om te blazen";
    const tekst = `Je zaadje is nu een blaasbloem. Zonder actie verwelkt ze over ${termijn}.`;

    if (mailAdres) {
      const { error: mailFout } = await resend.emails.send({
        from: "Oleg Morozov <bloem@zaadjeplanten.nl>",
        to: mailAdres,
        subject: "🌸 Ze is klaar om te blazen",
        html: `
      <p>Je zaadje is nu een blaasbloem — ze is klaar om te blazen.</p>
      <p>Zonder actie verwelkt ze over ${termijn}.</p>
      <p><a href="${url}">Blaas je bloem</a></p>
    `,
      });

      if (mailFout) {
        fouten.push(zaadje.code);
        continue;
      }
    }

    if (zaadje.push_abonnement) {
      const push = await stuurPush(zaadje.push_abonnement, titel, tekst, url);
      if (!mailAdres && !push.ok && !push.verlopen) {
        fouten.push(zaadje.code);
        continue;
      }
    }

    const { error: updateFout } = await supabase
      .from("zaadjes")
      .update({ zaadpluis_mail_verzonden_op: new Date().toISOString() })
      .eq("id", zaadje.id);

    if (updateFout) {
      fouten.push(zaadje.code);
      continue;
    }
    verzonden += 1;
  }

  return NextResponse.json(
    {
      ok: true,
      bekeken: kandidaten?.length ?? 0,
      klaar: klaar.length,
      verzonden,
      fouten,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
