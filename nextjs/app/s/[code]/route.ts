import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, genereerCode } from "@/lib/supabase";

// Elke scan van dezelfde podium-QR komt hier binnen en krijgt zijn EIGEN
// unieke zaadje — dit lost het "4 mensen, 4 codes"-vraagstuk op zonder
// dat er 4 losse QR's op het scherm hoeven te staan.
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const supabase = supabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

  const { data: sessie, error: sessieFout } = await supabase
    .from("podiumsessies")
    .select("id, lijn_id, max_scans")
    .eq("code", params.code)
    .single();

  if (sessieFout || !sessie) {
    return NextResponse.redirect(new URL("/?fout=onbekende-sessie", site));
  }

  const { count } = await supabase
    .from("zaadjes")
    .select("id", { count: "exact", head: true })
    .eq("ouder_id", null)
    .eq("lijn_id", sessie.lijn_id);

  if ((count ?? 0) >= (sessie.max_scans ?? 20)) {
    return NextResponse.redirect(new URL("/?fout=sessie-vol", site));
  }

  const nieuweCode = genereerCode();
  const { data: zaadje, error } = await supabase
    .from("zaadjes")
    .insert({ code: nieuweCode, lijn_id: sessie.lijn_id, generatie: 1 })
    .select("code")
    .single();

  if (error || !zaadje) {
    return NextResponse.redirect(new URL("/?fout=aanmaken-mislukt", site));
  }

  await supabase.from("gebeurtenissen").insert({
    zaadje_id: (
      await supabase.from("zaadjes").select("id").eq("code", zaadje.code).single()
    ).data?.id,
    type: "gescand",
  });

  return NextResponse.redirect(new URL(`/z/${zaadje.code}`, site));
}
