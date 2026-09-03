import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

function siteBasis(req: NextRequest) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  if (env.startsWith("https://")) return env;
  const origin = req.nextUrl.origin;
  if (origin.startsWith("https://")) return origin;
  return env || origin;
}

function codeUitVerzoek(req: NextRequest) {
  // Nooit zelf een code verzinnen (geen demo-/placeholder).
  // Alleen de code uit het pad, dezelfde als op /z/[code].
  const uitPad = req.nextUrl.pathname.split("/").filter(Boolean).pop() ?? "";
  return decodeURIComponent(uitPad).trim();
}

export async function GET(req: NextRequest) {
  const gevraagd = codeUitVerzoek(req);

  if (!gevraagd || /^demo-/i.test(gevraagd)) {
    return NextResponse.json({ fout: "ongeldige zaadje-code" }, { status: 404 });
  }

  const supabase = supabaseServer();
  const { data: zaadje } = await supabase
    .from("zaadjes")
    .select("code")
    .eq("code", gevraagd)
    .single();

  if (!zaadje?.code) {
    return NextResponse.json({ fout: "onbekend zaadje" }, { status: 404 });
  }

  const code = zaadje.code;
  const site = siteBasis(req);
  const bloem = `${site}/z/${code}`;
  const start = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//zaadjeplanten//NL",
    "BEGIN:VEVENT",
    `UID:${code}@zaadjeplanten.nl`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + 30 * 60 * 1000))}`,
    "SUMMARY:🌸 Je bloem bloeit — ga kijken",
    `DESCRIPTION:Open je bloem: ${bloem}`,
    `URL:${bloem}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="je-bloem-bloeit.ics"`,
    },
  });
}
