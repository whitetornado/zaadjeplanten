import { PODIUM, poortIngelogd } from "@/lib/poort-auth";
import { loginPodium } from "./actions";
import PodiumApp from "./PodiumApp";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Podium — zaadjeplanten",
  robots: { index: false, follow: false },
};

export default function PodiumPagina({
  searchParams,
}: {
  searchParams: { fout?: string };
}) {
  if (!PODIUM.wachtwoord()) {
    return (
      <main className="podium-start">
        <p className="tuin-fout">PODIUM_WACHTWOORD ontbreekt in de omgeving.</p>
      </main>
    );
  }

  if (!poortIngelogd(PODIUM)) {
    return (
      <main className="podium-start">
        <p className="lijn">Oleg Morozov · podium</p>
        <h1>Podium</h1>
        <p className="sub">Wachtwoord om een set te starten.</p>
        <form action={loginPodium}>
          <input
            type="password"
            name="wachtwoord"
            autoComplete="current-password"
            placeholder="wachtwoord"
            required
          />
          <button className="primair" type="submit">Open het podium</button>
        </form>
        {searchParams.fout && <p className="tuin-fout">Dat wachtwoord klopt niet.</p>}
      </main>
    );
  }

  return <PodiumApp />;
}
