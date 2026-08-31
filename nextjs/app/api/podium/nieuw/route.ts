import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, genereerCode } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { lijnSlug, lijnNaam } = await req.json();
  const supabase = supabaseServer();

  let { data: lijn } = await supabase
    .from("lijnen")
    .select("id")
    .eq("slug", lijnSlug)
    .maybeSingle();

  if (!lijn) {
    const { data: nieuweLijn, error } = await supabase
      .from("lijnen")
      .insert({ slug: lijnSlug, naam: lijnNaam ?? lijnSlug })
      .select("id")
      .single();
    if (error || !nieuweLijn) {
      return NextResponse.json({ fout: "lijn aanmaken mislukt" }, { status: 500 });
    }
    lijn = nieuweLijn;
  }

  const code = genereerCode(6);
  const { error: sessieFout } = await supabase
    .from("podiumsessies")
    .insert({ code, lijn_id: lijn.id });

  if (sessieFout) {
    return NextResponse.json({ fout: "sessie aanmaken mislukt" }, { status: 500 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  return NextResponse.json({ ok: true, qrUrl: `${site}/s/${code}` });
}
