import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const start = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//zaadjeplanten//NL",
    "BEGIN:VEVENT",
    `UID:${params.code}@zaadjeplanten.nl`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + 30 * 60 * 1000))}`,
    "SUMMARY:🌸 Je bloem bloeit — ga kijken",
    `DESCRIPTION:Open je bloem: ${site}/z/${params.code}`,
    `URL:${site}/z/${params.code}`,
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
