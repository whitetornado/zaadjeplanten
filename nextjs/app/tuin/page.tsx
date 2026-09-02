import { haalTuinOverzicht } from "@/lib/supabase";
import { tuinIngelogd } from "@/lib/tuin-auth";
import { loginTuin, markeerGewonnen, uitloggenTuin } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tuin — zaadjeplanten",
  robots: { index: false, follow: false },
};

function datum(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
}

export default async function TuinPagina({
  searchParams,
}: {
  searchParams: { fout?: string };
}) {
  if (!process.env.TUIN_WACHTWOORD) {
    return (
      <main className="tuin-pagina">
        <p className="tuin-fout">TUIN_WACHTWOORD ontbreekt in de omgeving.</p>
      </main>
    );
  }

  if (!tuinIngelogd()) {
    return (
      <main className="tuin-pagina tuin-login">
        <p className="lijn">Oleg Morozov · intern</p>
        <h1>Tuin</h1>
        <p className="tuin-lead">Wachtwoord om de zaadjes te bekijken.</p>
        <form action={loginTuin} className="tuin-form">
          <input
            type="password"
            name="wachtwoord"
            autoComplete="current-password"
            placeholder="wachtwoord"
            required
          />
          <button className="primair" type="submit">Open de tuin</button>
        </form>
        {searchParams.fout && <p className="tuin-fout">Dat wachtwoord klopt niet.</p>}
      </main>
    );
  }

  const data = await haalTuinOverzicht();

  return (
    <main className="tuin-pagina">
      <header className="tuin-kop">
        <div>
          <p className="lijn">Oleg Morozov · intern</p>
          <h1>Tuin</h1>
        </div>
        <form action={uitloggenTuin}>
          <button type="submit">Uitloggen</button>
        </form>
      </header>

      <section className="tuin-cijfers">
        <div><strong>{data.totaalZaadjes}</strong><span>zaadjes ooit</span></div>
        <div><strong>{data.totaalGeblazen}</strong><span>keer geblazen</span></div>
        <div><strong>{data.totaalEmails}</strong><span>e-mailadressen</span></div>
        <div><strong>{data.diepsteGeneratie}</strong><span>diepste generatie</span></div>
      </section>

      <section>
        <h2>Per lijn</h2>
        {data.lijnen.length === 0 ? (
          <p className="tuin-leeg">Nog geen lijnen.</p>
        ) : (
          <div className="tuin-tabel-wrap">
            <table className="tuin-tabel">
              <thead>
                <tr>
                  <th>Lijn</th>
                  <th>Zaadjes</th>
                  <th>Diepste</th>
                  <th>Levend</th>
                </tr>
              </thead>
              <tbody>
                {data.lijnen.map((lijn) => (
                  <tr key={lijn.id}>
                    <td>{lijn.naam}</td>
                    <td>{lijn.aantal}</td>
                    <td>{lijn.diepste}</td>
                    <td>{lijn.levend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Prijzen — generatie 3 of hoger, met e-mail</h2>
        {data.gewonnenKolomOntbreekt && (
          <>
            <p className="tuin-sql">
              Eenmalig in Supabase SQL:{" "}
              <code>alter table zaadjes add column if not exists gewonnen_op timestamptz;</code>
            </p>
            <p className="tuin-fout">
              De kolom gewonnen_op ontbreekt nog. Draai de regel hierboven in Supabase, daarna werkt de knop.
            </p>
          </>
        )}
        {data.prijzen.length === 0 ? (
          <p className="tuin-leeg">Nog niemand met generatie 3+ én een e-mailadres.</p>
        ) : (
          <div className="tuin-tabel-wrap">
            <table className="tuin-tabel">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Gen.</th>
                  <th>Lijn</th>
                  <th>Geplant</th>
                  <th>Geblazen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.prijzen.map((z) => (
                  <tr key={z.id}>
                    <td><a href={`mailto:${z.email}`}>{z.email}</a></td>
                    <td>{z.generatie}</td>
                    <td>{z.lijnNaam}</td>
                    <td>{datum(z.geplant_op)}</td>
                    <td>{datum(z.geblazen_op)}</td>
                    <td>
                      {z.gewonnen_op ? (
                        <span className="tuin-gewonnen">gewonnen {datum(z.gewonnen_op)}</span>
                      ) : (
                        <form action={markeerGewonnen}>
                          <input type="hidden" name="id" value={z.id} />
                          <button type="submit">Gemarkeerd als gewonnen</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
