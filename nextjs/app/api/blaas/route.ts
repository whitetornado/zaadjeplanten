import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, genereerCode, berekenStadium } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) {
    return NextResponse.json({ fout: "code ontbreekt" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: ouder, error: zoekFout } = await supabase
    .from("zaadjes")
    .select("id, lijn_id, generatie, geplant_op, geblazen_op")
    .eq("code", code)
    .single();

  if (zoekFout || !ouder) {
    return NextResponse.json({ fout: "zaadje niet gevonden" }, { status: 404 });
  }

  const stadium = berekenStadium(ouder);
  if (stadium !== "zaadpluis") {
    // Kan niet blazen als de bloem nog niet zover is (of al verwelkt/geblazen is) —
    // voorkomt dat iemand de blaas-API rechtstreeks aanroept om te frauderen.
    return NextResponse.json(
      { fout: "deze bloem is nog niet klaar om te blazen", stadium },
      { status: 409 }
    );
  }

  if (ouder.geblazen_op) {
    return NextResponse.json({ fout: "al doorgeblazen" }, { status: 409 });
  }

  const nu = new Date().toISOString();
  await supabase.from("zaadjes").update({ geblazen_op: nu }).eq("id", ouder.id);

  const nieuweCode = genereerCode();
  const { data: kind, error: kindFout } = await supabase
    .from("zaadjes")
    .insert({
      code: nieuweCode,
      lijn_id: ouder.lijn_id,
      ouder_id: ouder.id,
      generatie: ouder.generatie + 1,
    })
    .select("code")
    .single();

  if (kindFout || !kind) {
    return NextResponse.json({ fout: "kind-zaadje aanmaken mislukt" }, { status: 500 });
  }

  await supabase.from("gebeurtenissen").insert([
    { zaadje_id: ouder.id, type: "geblazen" },
  ]);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  return NextResponse.json({
    ok: true,
    generatie: ouder.generatie + 1,
    deelLink: `${site}/z/${kind.code}`,
  });
}
