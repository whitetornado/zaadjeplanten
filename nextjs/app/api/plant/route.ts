import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { code, email, pushAbonnement } = await req.json();
  if (!code) {
    return NextResponse.json({ fout: "code ontbreekt" }, { status: 400 });
  }

  const supabase = supabaseServer();
  const { data: zaadje, error: zoekFout } = await supabase
    .from("zaadjes")
    .select("id, geplant_op")
    .eq("code", code)
    .single();

  if (zoekFout || !zaadje) {
    return NextResponse.json({ fout: "zaadje niet gevonden" }, { status: 404 });
  }

  // Eenmalig: als er al een plantmoment is, niet overschrijven —
  // anders kan iemand de klok resetten door de pagina te verversen.
  const updates: Record<string, unknown> = {};
  if (!zaadje.geplant_op) updates.geplant_op = new Date().toISOString();
  if (email) updates.email = email;
  if (pushAbonnement) updates.push_abonnement = pushAbonnement;

  if (Object.keys(updates).length > 0) {
    await supabase.from("zaadjes").update(updates).eq("id", zaadje.id);
  }

  await supabase.from("gebeurtenissen").insert({
    zaadje_id: zaadje.id,
    type: zaadje.geplant_op ? "mail_gezet" : "geplant",
  });

  return NextResponse.json({ ok: true });
}
