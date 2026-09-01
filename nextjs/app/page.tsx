import { haalPubliekeTuinCijfers } from "@/lib/supabase";
import { BloeiendePaardenbloem } from "./tuinveld-illustraties";
import {
  TuinveldAchtergrond,
  TuinveldCluster,
  geplantVisuals,
  groepVisuals,
} from "./tuinveld-planten";

export const revalidate = 60;

export const metadata = {
  title: "De tuin — zaadjeplanten",
  description:
    "Liefde, muziek en schoonheid zullen de wereld redden. Een stille tuin van digitale paardenbloemen, gegeven door Oleg Morozov.",
};

function n(getal: number) {
  return getal.toLocaleString("nl-NL");
}

export default async function Home() {
  const cijfers = await haalPubliekeTuinCijfers();
  const leeg = cijfers.totaalZaadjes === 0;
  const groei = geplantVisuals(cijfers);
  const pluis = groepVisuals("pluis", cijfers.klaar);
  const reis = groepVisuals("verspreid", cijfers.verspreid);

  return (
    <main className="tuinveld">
      <TuinveldAchtergrond />

      <header className="tuinveld-kop">
        <p className="lijn">Oleg Morozov · zaadjeplanten</p>
        <h1>De tuin van liefde, muziek en schoonheid</h1>
        <p className="tuinveld-citaat">
          Liefde, muziek en schoonheid zullen de wereld redden
        </p>
        <p className="tuinveld-lead">
          Dit is de stille tuin achter de bloemen van Oleg Morozov. Onderweg
          geeft hij spontaan een roos aan iemand die hij tegenkomt en
          soms ook een blaasbloem: blaas hem uit, en er waait een zaadje naar je
          telefoon. Daar groeit het rustig verder, tot jij hem op jouw beurt weer
          kunt doorblazen. Nog nooit een zaadje gekregen? Misschien kom je Oleg
          nog eens tegen.
        </p>
        <a
          className="tuinveld-cta"
          href="https://olegpianist.nl"
          target="_blank"
          rel="noopener"
        >
          Ontdek Oleg's muziek
        </a>
      </header>

      {leeg ? (
        <p className="tuinveld-leeg">
          Het eerste zaadje moet nog geplant worden — kom naar een optreden van
          Oleg Morozov om het eerste te ontvangen.
        </p>
      ) : (
        <div className="tuinveld-leven">
          <p className="tuinveld-totaal">
            {cijfers.diepsteGeneratie <= 1
              ? `Al ${n(cijfers.totaalZaadjes)} zaadjes vonden een plekje, nog vers van het optreden.`
              : `Al ${n(cijfers.totaalZaadjes)} zaadjes vonden een plekje. Het verst gereisde zaadje is van generatie ${n(cijfers.diepsteGeneratie)}.`}
          </p>

          {cijfers.geplant > 0 && (
            <section className="tuinveld-rij">
              <TuinveldCluster soorten={groei.soorten} extra={groei.extra} />
              <p>
                {cijfers.geplant === 1
                  ? "1 zaadje groeit nu ergens"
                  : `${n(cijfers.geplant)} zaadjes groeien nu ergens`}
              </p>
            </section>
          )}

          {cijfers.bloeiend > 0 && (
            <section className="tuinveld-rij">
              <div className="tuinveld-bloei-icoon">
                <BloeiendePaardenbloem />
              </div>
              <p>
                {cijfers.bloeiend === 1
                  ? "1 bloem staat volop in bloei"
                  : `${n(cijfers.bloeiend)} bloemen staan volop in bloei`}
              </p>
            </section>
          )}

          {cijfers.klaar > 0 && (
            <section className="tuinveld-rij">
              <TuinveldCluster soorten={pluis.soorten} extra={pluis.extra} />
              <p>
                {cijfers.klaar === 1
                  ? "1 pluisje wacht om verder te reizen"
                  : `${n(cijfers.klaar)} pluisjes wachten om verder te reizen`}
              </p>
            </section>
          )}

          {cijfers.verspreid > 0 && (
            <section className="tuinveld-rij">
              <TuinveldCluster soorten={reis.soorten} extra={reis.extra} />
              <p>
                {cijfers.verspreid === 1
                  ? "1 pluisje heeft al een nieuwe plek gevonden"
                  : `${n(cijfers.verspreid)} pluisjes hebben al een nieuwe plek gevonden`}
              </p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
