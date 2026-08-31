import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { berekenStadium, supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
    .select("id, code, email, geplant_op, geblazen_op")
    .not("email", "is", null)
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
      typeof z.email === "string" &&
      z.email.trim() &&
      berekenStadium(z) === "bloem"
  );

  let verzonden = 0;
  const fouten: string[] = [];

  for (const zaadje of bloeiend) {
    const { error: mailFout } = await resend.emails.send({
      from: "Oleg Morozov <bloem@zaadjeplanten.nl>",
      to: zaadje.email,
      subject: "🌸 Je bloem bloeit",
      html: `
      <p>Liefde, muziek en schoonheid zullen de wereld redden.</p>
      <p>Je zaadje van Oleg Morozov is opengebloeid.</p>
      <p><a href="${site}/z/${zaadje.code}">Bekijk je bloem</a></p>
    `,
    });

    if (mailFout) {
      fouten.push(zaadje.code);
      continue;
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

  return NextResponse.json({
    ok: true,
    bekeken: kandidaten?.length ?? 0,
    bloeiend: bloeiend.length,
    verzonden,
    fouten,
  });
}
