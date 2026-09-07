import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { stuurPush } from "@/lib/push";
import { PRIJS_KORT } from "@/lib/prijs-tekst";
import { berekenStadium, supabaseServer, telAfstammelingen } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function bruikbareEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim();
  return v || null;
}

function reisZin(stappen: number): string | null {
  if (stappen <= 0) return null;
  if (stappen === 1) return "Jouw zaadje reisde trouwens al naar 1 telefoon verder.";
  return `Jouw zaadje reisde trouwens al naar ${stappen} telefoons verder.`;
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
    .is("bloei_mail_verzonden_op", null)
    .not("geplant_op", "is", null)
    .is("geblazen_op", null);

  if (error) {
    return NextResponse.json({ fout: error.message }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const bloeiend = (kandidaten ?? []).filter(
    (z) =>
      berekenStadium(z) === "bloem" &&
      (bruikbareEmail(z.email) || z.push_abonnement)
  );

  let verzonden = 0;
  const fouten: string[] = [];

  for (const zaadje of bloeiend) {
    const mailAdres = bruikbareEmail(zaadje.email);
    const url = `${site}/z/${zaadje.code}`;
    const titel = "🌸 Je bloem bloeit";
    const tekst = "Je zaadje van Oleg Morozov is opengebloeid.";

    if (mailAdres) {
      const afstamming = await telAfstammelingen(zaadje.id);
      const reis = reisZin(afstamming.stappenVerder);
      const { error: mailFout } = await resend.emails.send({
        from: "Oleg Morozov <bloem@zaadjeplanten.nl>",
        to: mailAdres,
        subject: "🌸 Je bloem bloeit",
        html: `
      <p>Liefde, muziek en schoonheid zullen de wereld redden.</p>
      <p>Je zaadje van Oleg Morozov is opengebloeid.</p>
      ${reis ? `<p>${reis}</p>` : ""}
      ${knopHtml(url, "Bekijk je bloem")}
      <p>${PRIJS_KORT}</p>
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
      .update({ bloei_mail_verzonden_op: new Date().toISOString() })
      .eq("id", zaadje.id);

    if (updateFout) {
      fouten.push(zaadje.code);
      continue;
    }
    verzonden += 1;
  }

  const details = (kandidaten ?? []).map((z) => ({
    code: z.code,
    geplant_op: z.geplant_op,
    berekend_stadium: berekenStadium(z),
  }));

  return NextResponse.json(
    {
      ok: true,
      bekeken: kandidaten?.length ?? 0,
      bloeiend: bloeiend.length,
      verzonden,
      fouten,
      details,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
