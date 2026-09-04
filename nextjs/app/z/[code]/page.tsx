import { notFound } from "next/navigation";
import { supabaseServer, berekenStadium, urenTotVolgendeFase, telAfstammelingen } from "@/lib/supabase";
import ZaadjeClient from "./ZaadjeClient";

export const dynamic = "force-dynamic"; // stadium hangt af van "nu", dus nooit cachen
export const revalidate = 0;

export default async function ZaadjePagina({
  params,
}: {
  params: { code: string };
}) {
  const supabase = supabaseServer();

  const { data: zaadje } = await supabase
    .from("zaadjes")
    .select("id, code, generatie, geplant_op, geblazen_op, lijn_id, email, push_abonnement")
    .eq("code", params.code)
    .single();

  if (!zaadje) notFound();

  const { data: lijn } = await supabase
    .from("lijnen")
    .select("naam")
    .eq("id", zaadje.lijn_id)
    .single();

  const stadium = berekenStadium(zaadje);
  const herinneringIngesteld =
    (typeof zaadje.email === "string" && zaadje.email.trim().length > 0) ||
    Boolean(zaadje.push_abonnement);

  const afstamming = stadium === "uitgeblazen"
    ? await telAfstammelingen(zaadje.id)
    : { stappenVerder: 0, hoogsteGeneratie: zaadje.generatie };

  return (
    <ZaadjeClient
      code={zaadje.code}
      generatie={zaadje.generatie}
      lijnNaam={lijn?.naam ?? "onbekend optreden"}
      stadiumBijLaden={stadium}
      urenTotVolgendeFase={urenTotVolgendeFase(zaadje)}
      herinneringIngesteld={herinneringIngesteld}
      stappenVerder={afstamming.stappenVerder}
      hoogsteGeneratie={afstamming.hoogsteGeneratie}
    />
  );
}
