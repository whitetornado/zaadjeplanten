import { notFound } from "next/navigation";
import { supabaseServer, berekenStadium, urenTotVolgendeFase } from "@/lib/supabase";
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
    .select("code, generatie, geplant_op, geblazen_op, lijn_id")
    .eq("code", params.code)
    .single();

  if (!zaadje) notFound();

  const { data: lijn } = await supabase
    .from("lijnen")
    .select("naam")
    .eq("id", zaadje.lijn_id)
    .single();

  const stadium = berekenStadium(zaadje);

  return (
    <ZaadjeClient
      code={zaadje.code}
      generatie={zaadje.generatie}
      lijnNaam={lijn?.naam ?? "onbekend optreden"}
      stadiumBijLaden={stadium}
      urenTotVolgendeFase={urenTotVolgendeFase(zaadje)}
    />
  );
}
