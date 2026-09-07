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

function verwelkZin(dagen: number): string {
  if (dagen <= 0) {
    return "Nog minder dan een dag voor ze verwelkt zonder dat iemand haar heeft doorgegeven.";
  }
  if (dagen === 1) {
    return "Nog 1 dag voor ze verwelkt zonder dat iemand haar heeft doorgegeven.";
  }
  return `Nog ${dagen} dagen voor ze verwelkt zonder dat iemand haar heeft doorgegeven.`;
}

function knopHtml(url: string, tekst: string) {
  return `<p style="margin:24px 0 16px"><a href="${url}" style="display:inline-block;background:#5d4fb0;color:#f4f2ea;text-decoration:none;padding:12px 24px;border-radius:999px;font-family:sans-serif;font-size:15px;font-weight:500">${tekst}</a></p>`;
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
    const titel = "🌬️ Ze wacht op jou om verder te reizen";
    const tekst = `Je bloem is nu een blaasbloem — helemaal klaar om door te geven. ${verwelkZin(dagen)}`;

    if (mailAdres) {
      const { error: mailFout } = await resend.emails.send({
        from: "Oleg Morozov <bloem@zaadjeplanten.nl>",
        to: mailAdres,
        subject: "🌬️ Ze wacht op jou om verder te reizen",
        html: `
      <p>Liefde, muziek en schoonheid zullen de wereld redden.</p>
      <p>Je bloem is nu een blaasbloem — helemaal klaar om door te geven. Blaas haar uit, en er waait een nieuw zaadje naar iemand in jouw buurt.</p>
      <p>${verwelkZin(dagen)}</p>
      ${knopHtml(url, "Blaas haar door")}
      <p>Elk zaadje dat verder reist, maakt kans op een boeket of een huiskamerconcert van Oleg — gratis, zonder aankoop.</p>
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
