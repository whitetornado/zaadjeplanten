"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AANTAL_PLUIS, BloemMotor, ontgrendelAudio, startMic } from "@/lib/bloem-canvas";
import { useSchudDetectie, vraagBewegingToestemming } from "@/lib/schud";

type Stadium =
  | "ongeplant" | "zaadje" | "kiem" | "knop" | "openen"
  | "bloem" | "verwelkt" | "zaadvorming" | "zaadpluis" | "uitgeblazen";

const TEKST: Record<Stadium, { titel: string; sub: string; cta: string; primair: boolean }> = {
  ongeplant:   { titel: "Met liefde gegeven", sub: "Oleg Morozov geeft je dit zaadje. Plant het, en er groeit iets moois op je telefoon.", cta: "Plant je zaadje", primair: true },
  zaadje:      { titel: "Je zaadje ligt in de grond", sub: "Over een paar dagen bloeit hier een gele bloem.", cta: "Herinner me eraan", primair: false },
  kiem:        { titel: "Hij ontkiemt", sub: "Een dapper groen sprietje. Straks staat er een knop.", cta: "Herinner me eraan", primair: false },
  knop:        { titel: "Er komt een knop aan", sub: "Een stevige groene knop, nog helemaal gesloten.", cta: "Herinner me eraan", primair: false },
  openen:      { titel: "Ze opent zich", sub: "De eerste gele blaadjes piepen naar buiten.", cta: "Herinner me eraan", primair: false },
  bloem:       { titel: "Je bloem bloeit", sub: "Volop geel. Kijk er gerust even naar.", cta: "Herinner me eraan", primair: false },
  verwelkt:    { titel: "Ze verwelkt", sub: "De bloem sluit zich en kleurt bruin — vanbinnen vormt zich het zaad.", cta: "Herinner me eraan", primair: false },
  zaadvorming: { titel: "Het zaad vormt zich", sub: "Een ronde, nog gesloten knop. Bijna zover.", cta: "Herinner me eraan", primair: false },
  zaadpluis:   { titel: "Ze is klaar om te blazen",
                 sub: "Liefde, muziek en schoonheid zullen de wereld redden. Blaas zachtjes, tik op de bloem, of schud je telefoon.",
                 cta: "Blazen met je microfoon", primair: true },
  uitgeblazen: { titel: "Daar gaan je pluisjes", sub: "Elk pluisje is een zaadje voor iemand anders.", cta: "Geef je zaadje door", primair: true },
};

const VOLGORDE: Stadium[] = [
  "ongeplant", "zaadje", "kiem", "knop", "openen",
  "bloem", "verwelkt", "zaadvorming", "zaadpluis", "uitgeblazen",
];

const FASES: Stadium[] = [
  "zaadje", "kiem", "knop", "openen",
  "bloem", "verwelkt", "zaadvorming", "zaadpluis",
];

function restTekst(uren: number | null, stadium: Stadium): string | null {
  if (uren == null || stadium === "zaadpluis" || stadium === "ongeplant" || stadium === "uitgeblazen") {
    return null;
  }
  if (uren <= 0) return "nog minder dan een uur tot de volgende fase";
  if (uren === 1) return "nog ongeveer 1 uur tot de volgende fase";
  return `nog ongeveer ${uren} uur tot de volgende fase`;
}

function vapidNaarBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function iosToestel() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function inBeginscherm() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

const IS_DEV = process.env.NODE_ENV !== "production";

const GROEI_FASES: Stadium[] = [
  "zaadje", "kiem", "knop", "openen", "bloem", "verwelkt", "zaadvorming",
];

export default function ZaadjeClient({
  code, generatie, lijnNaam, stadiumBijLaden, urenTotVolgendeFase, herinneringIngesteld,
}: {
  code: string;
  generatie: number;
  lijnNaam: string;
  stadiumBijLaden: Stadium;
  urenTotVolgendeFase: number | null;
  herinneringIngesteld: boolean;
}) {
  const [stadium, setStadium] = useState<Stadium>(stadiumBijLaden);
  const [urenRest, setUrenRest] = useState(urenTotVolgendeFase);
  const [deelLink, setDeelLink] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [kiezerOpen, setKiezerOpen] = useState(false);
  const [paneelOpen, setPaneelOpen] = useState(false);
  const [mailZichtbaar, setMailZichtbaar] = useState(false);
  const [mail, setMail] = useState("");
  const [gekozen, setGekozen] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [toast, setToast] = useState("");
  const [toastAan, setToastAan] = useState(false);
  const [pushStatus, setPushStatus] = useState<"ok" | "ios" | "nee">("ok");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const groeiAudioRef = useRef<HTMLAudioElement>(null);
  const groeiFadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const groeiPauzeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const magGroeiSpelenRef = useRef(false);
  const [gedempt, setGedempt] = useState(false);
  const motorRef = useRef<BloemMotor | null>(null);
  const stadiumRef = useRef(stadium);
  const groeiRef = useRef(0);
  const blaasKlaarBezig = useRef(false);
  const micStopRef = useRef<(() => void) | null>(null);
  const micActiefRef = useRef(false);
  const sensorenGestartRef = useRef(false);
  const [schudLuisteren, setSchudLuisteren] = useState(false);
  const geluidGespeeld = useRef(false);
  const hintRef = useRef("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const blaasKlaarRef = useRef<() => void>(() => {});

  stadiumRef.current = stadium;

  const params = useParams<{ code: string }>();
  // Zelfde code als in de adresbalk (/z/[code]) — nooit een losse placeholder.
  const zaadCode = typeof params.code === "string" && params.code ? params.code : code;

  useEffect(() => {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const apis =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      Boolean(vapid);
    if (iosToestel() && !inBeginscherm()) setPushStatus("ios");
    else if (!apis) setPushStatus("nee");
    else setPushStatus("ok");
  }, []);

  const GROEI_VOLUME = 0.32;
  const GROEI_PAUZE_MS = 3500;
  const kijktNaarBloem = stadium === "openen" || stadium === "bloem";
  magGroeiSpelenRef.current = kijktNaarBloem && !gedempt;

  function wisGroeiFade() {
    if (groeiFadeRef.current) {
      clearInterval(groeiFadeRef.current);
      groeiFadeRef.current = null;
    }
  }

  function wisGroeiPauze() {
    if (groeiPauzeRef.current) {
      clearTimeout(groeiPauzeRef.current);
      groeiPauzeRef.current = null;
    }
  }

  function stopGroeiGeluid() {
    wisGroeiFade();
    wisGroeiPauze();
    const audio = groeiAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  function fadeInGroei(audio: HTMLAudioElement) {
    wisGroeiFade();
    audio.volume = 0;
    const stappen = 20;
    let n = 0;
    groeiFadeRef.current = setInterval(() => {
      n += 1;
      audio.volume = Math.min(GROEI_VOLUME, (n / stappen) * GROEI_VOLUME);
      if (n >= stappen) wisGroeiFade();
    }, 50);
  }

  function speelGroeiGeluid(audio: HTMLAudioElement) {
    audio.currentTime = 0;
    audio.play().then(() => fadeInGroei(audio)).catch(() => {});
  }

  const toastMelding = useCallback((txt: string) => {
    setToast(txt);
    setToastAan(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastAan(false), 2000);
  }, []);

  useEffect(() => {
    groeiRef.current = 0;
    if (stadium === "zaadpluis") geluidGespeeld.current = false;
  }, [stadium]);

  async function plant() {
    setBezig(true);
    const res = await fetch("/api/plant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: zaadCode }),
    });
    setBezig(false);
    if (res.ok) {
      setStadium("zaadje");
      setUrenRest(8);
      setTimeout(() => setKiezerOpen(true), 700);
    }
  }

  async function blaasKlaar() {
    if (blaasKlaarBezig.current) return;
    blaasKlaarBezig.current = true;
    setBezig(true);
    const res = await fetch("/api/blaas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: zaadCode }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (res.ok) {
      setStadium("uitgeblazen");
      setDeelLink(data.deelLink);
      setHint("");
      setTimeout(() => setPaneelOpen(true), 900);
    } else {
      toastMelding(data.fout || "Deze bloem is nog niet klaar om te blazen");
    }
  }
  blaasKlaarRef.current = blaasKlaar;

  function speelBlaasGeluid() {
    if (geluidGespeeld.current) return;
    const a = audioRef.current;
    if (!a) return;
    geluidGespeeld.current = true;
    a.currentTime = 0;
    a.volume = 0.85;
    a.play().catch(() => {
      geluidGespeeld.current = false;
    });
  }

  const blaas = useCallback((kracht: number) => {
    if (stadiumRef.current !== "zaadpluis") return;
    speelBlaasGeluid();
    motorRef.current?.blaas(kracht);
  }, []);

  useSchudDetectie(schudLuisteren && stadium === "zaadpluis", blaas);

  async function zetSensorenAan() {
    if (sensorenGestartRef.current) return;
    sensorenGestartRef.current = true;
    ontgrendelAudio(audioRef.current);

    const beweging = vraagBewegingToestemming();

    try {
      if (!micActiefRef.current) {
        micActiefRef.current = true;
        const stop = await startMic(
          () => stadiumRef.current === "zaadpluis",
          (k) => blaas(k),
          setHint,
          false
        );
        micStopRef.current = stop;
      }
    } catch {
      micActiefRef.current = false;
      setHint("Geen microfoon? Tik op de bloem of schud je telefoon.");
    }

    const bewegingOk = await beweging;
    setSchudLuisteren(bewegingOk);
    if (micActiefRef.current || bewegingOk) {
      setHint("Blaas, tik, of schud je telefoon");
    }
  }

  useEffect(() => {
    return () => {
      micStopRef.current?.();
      wisGroeiFade();
      wisGroeiPauze();
    };
  }, []);

  useEffect(() => {
    const audio = groeiAudioRef.current;
    if (!audio || !kijktNaarBloem || gedempt) {
      stopGroeiGeluid();
      return;
    }

    function opEinde() {
      wisGroeiPauze();
      groeiPauzeRef.current = setTimeout(() => {
        groeiPauzeRef.current = null;
        if (!magGroeiSpelenRef.current) return;
        const a = groeiAudioRef.current;
        if (a) speelGroeiGeluid(a);
      }, GROEI_PAUZE_MS);
    }

    audio.addEventListener("ended", opEinde);
    if (audio.paused || audio.ended) speelGroeiGeluid(audio);

    return () => {
      audio.removeEventListener("ended", opEinde);
      stopGroeiGeluid();
    };
  }, [kijktNaarBloem, gedempt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motor = new BloemMotor(canvas);
    motorRef.current = motor;
    if (stadiumRef.current === "uitgeblazen") {
      motor.pluisjes.forEach((p) => { p.weg = true; });
    }
    motor.maat();
    const onResize = () => motor.maat();
    window.addEventListener("resize", onResize);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vorige = performance.now();
    let raf = 0;

    function lus(nu: number) {
      const dt = Math.min(50, nu - vorige);
      vorige = nu;
      motor.perf = nu;
      motor.ctx.clearRect(0, 0, motor.W, motor.H);
      motor.tekenGrond();
      if (groeiRef.current < 1) {
        groeiRef.current = Math.min(1, groeiRef.current + dt * (reducedMotion ? 1 : 0.0016));
      }
      const t = reducedMotion ? 1 : groeiRef.current * groeiRef.current * (3 - 2 * groeiRef.current);
      const s = stadiumRef.current;
      if (s === "zaadje") motor.tekenZaadje(t);
      else if (s === "kiem") motor.tekenKiem(t);
      else if (s === "knop") motor.tekenKnop(t);
      else if (s === "openen") motor.tekenOpenen(t);
      else if (s === "bloem") motor.tekenBloem(t);
      else if (s === "verwelkt") motor.tekenVerwelken(t);
      else if (s === "zaadvorming") motor.tekenZaadvorming(t);
      else if (s === "zaadpluis" || s === "uitgeblazen") {
        const vast = motor.tekenBlaasbloem(dt);
        if (s === "zaadpluis" && vast === 0) blaasKlaarRef.current();
        else if (s === "zaadpluis" && vast < AANTAL_PLUIS) {
          const tekst = "Nog " + vast + " pluisjes te gaan";
          if (hintRef.current !== tekst) {
            hintRef.current = tekst;
            setHint(tekst);
          }
        }
      }
      raf = requestAnimationFrame(lus);
    }
    raf = requestAnimationFrame(lus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      motorRef.current = null;
    };
  }, []);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (stadium === "ongeplant") {
      plant();
      return;
    }
    if (stadium !== "zaadpluis") return;
    if (motorRef.current?.tikOpBloem(ev.clientX, ev.clientY)) blaas(0.5);
  }

  function onCta() {
    if (stadium === "ongeplant") plant();
    else if (stadium === "zaadpluis") { if (!sensorenGestartRef.current) zetSensorenAan(); }
    else if (stadium === "uitgeblazen") setPaneelOpen(true);
    else setKiezerOpen(true);
  }

  function demoVooruit() {
    setKiezerOpen(false);
    if (stadium === "zaadpluis") {
      blaas(1); blaas(1); blaas(1); blaas(1);
      return;
    }
    const i = VOLGORDE.indexOf(stadium);
    if (i >= 0 && i < VOLGORDE.length - 1) setStadium(VOLGORDE[i + 1]);
  }

  async function kiesPush() {
    if (pushStatus === "ios") {
      toastMelding("Voeg deze pagina eerst toe aan je beginscherm");
      return;
    }
    if (pushStatus !== "ok") {
      toastMelding("Meldingen werken hier niet — kies mail of agenda");
      return;
    }

    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toastMelding("Meldingen werken hier niet — kies mail of agenda");
      return;
    }

    try {
      const toestemming = await Notification.requestPermission();
      if (toestemming !== "granted") {
        toastMelding("Melding niet gelukt — kies gerust mail of agenda");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      if (!reg.pushManager) {
        toastMelding("Voeg deze pagina eerst toe aan je beginscherm");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidNaarBytes(vapid),
      });

      const res = await fetch("/api/plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: zaadCode, pushAbonnement: sub.toJSON() }),
      });
      if (!res.ok) {
        toastMelding("Melding niet gelukt — kies gerust mail of agenda");
        return;
      }
      kies("push", "Seintje staat aan");
    } catch {
      toastMelding("Melding niet gelukt — kies gerust mail of agenda");
    }
  }

  async function kiesMail() {
    const v = mail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      toastMelding("Dat lijkt geen geldig e-mailadres");
      return;
    }
    await fetch("/api/plant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: zaadCode, email: v }),
    });
    kies("mail", "We mailen je als ze bloeit");
    setMailZichtbaar(false);
  }

  function kiesAgenda() {
    window.location.href = `/api/agenda/${encodeURIComponent(zaadCode)}`;
    kies("agenda", "Staat in je agenda");
  }

  function kies(id: string, melding: string) {
    setGekozen(id);
    toastMelding(melding);
    setTimeout(() => setKiezerOpen(false), 1100);
  }

  async function deel() {
    if (!deelLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Er waait een zaadje jouw kant op",
          text: "Iemand blies een blaasbloem naar je toe. Plant je zaadje:",
          url: deelLink,
        });
      } catch { /* gebruiker annuleerde */ }
    } else {
      kopieer();
    }
  }

  function kopieer() {
    if (!deelLink) return;
    navigator.clipboard.writeText(deelLink).then(() => toastMelding("Link gekopieerd"));
  }

  const t = TEKST[stadium];
  const faseIndex = FASES.indexOf(stadium);
  const toonFase = faseIndex >= 0;
  const faseRest = restTekst(urenRest, stadium);
  const toonHerinneringTekst = herinneringIngesteld && GROEI_FASES.includes(stadium);

  return (
    <main className="bloem-app">
      {kijktNaarBloem && (
        <button
          className="geluid-knop"
          type="button"
          aria-label={gedempt ? "Zet geluid aan" : "Zet geluid uit"}
          aria-pressed={gedempt}
          onClick={() => setGedempt((nu) => !nu)}
        >
          {gedempt ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 10v4h3l4 3V7L7 10H4zM16.2 9.2l4.6 5.6M20.8 9.2l-4.6 5.6"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 10v4h3l4 3V7L7 10H4zM15.2 8.8a4.2 4.2 0 0 1 0 6.4M17.6 6.6a7.2 7.2 0 0 1 0 10.8"
              />
            </svg>
          )}
        </button>
      )}
      <header>
        <div className="lijn">
          {generatie === 1
            ? `Lijn ${lijnNaam} · vers van het optreden`
            : `Dit zaadje reisde al langs ${generatie - 1} telefoon${generatie - 1 === 1 ? "" : "s"}`}
        </div>
        <h1>{t.titel}</h1>
        <p className="sub">{t.sub}</p>
        {toonFase && (
          <div className="fase-voortgang">
            <div
              className="fase-punten"
              role="img"
              aria-label={`Stadium ${faseIndex + 1} van 8: ${stadium}`}
            >
              {FASES.map((fase) => (
                <span
                  key={fase}
                  className={"fase-punt" + (fase === stadium ? " nu" : "")}
                />
              ))}
            </div>
            {faseRest && <p className="fase-rest">{faseRest}</p>}
          </div>
        )}
      </header>

      <div id="stage-wrap">
        <canvas id="c" ref={canvasRef} onPointerDown={onCanvasPointer} />
      </div>

      <footer>
        {toonHerinneringTekst ? (
          <p className="fase-rest herinnering-staat">
            Je krijgt een seintje zodra ze bloeit en zodra ze klaar is om te blazen.
          </p>
        ) : (
          <button
            className={t.primair ? "primair" : ""}
            onClick={onCta}
            disabled={bezig}
          >
            {t.cta}
          </button>
        )}
        <div className="hint">{hint}</div>
        {IS_DEV && (
          <button className="stille-knop" type="button" onClick={demoVooruit}>
            demo: spoel de tijd vooruit
          </button>
        )}
      </footer>

      <div id="kiezer" className={kiezerOpen ? "open" : ""}>
        <h2>Je zaadje ligt in de grond</h2>
        <p>Over een paar dagen bloeit hier een gele bloem. Hoe wil je het weten?</p>
        <div
          className={"optie" + (gekozen === "push" ? " gekozen" : "")}
          onClick={kiesPush}
        >
          <div className="ikoon">✳</div>
          <div>
            <div className="t">Stuur me een seintje</div>
            <div className="s">
              {pushStatus === "ios"
                ? "Op iPhone: voeg deze pagina eerst toe aan je beginscherm, en open hem vanaf daar."
                : pushStatus === "nee"
                  ? "Meldingen worden hier niet ondersteund — kies mail of agenda"
                  : "Een melding op je telefoon zodra ze bloeit"}
            </div>
          </div>
        </div>
        <div
          className={"optie" + (gekozen === "mail" ? " gekozen" : "")}
          onClick={() => setMailZichtbaar(true)}
        >
          <div className="ikoon">✉</div>
          <div>
            <div className="t">Mail me als ze bloeit</div>
            <div className="s">Ook handig om later je winkans te volgen</div>
            <div className="s">Je maakt dan ook kans op een boeket of een huiskamerconcert van Oleg — gratis, zonder aankoop. We nemen contact op als je wint.</div>
          </div>
        </div>
        <div id="mail-rij" className={mailZichtbaar ? "zichtbaar" : ""}>
          <input
            type="email"
            placeholder="je@email.nl"
            inputMode="email"
            autoComplete="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
          />
          <button className="primair" type="button" onClick={kiesMail}>Oké</button>
        </div>
        <div
          className={"optie" + (gekozen === "agenda" ? " gekozen" : "")}
          onClick={kiesAgenda}
        >
          <div className="ikoon">📅</div>
          <div>
            <div className="t">Zet het in mijn agenda</div>
            <div className="s">Eén tik, werkt op elke telefoon</div>
          </div>
        </div>
        <button className="zelf" type="button" onClick={() => setKiezerOpen(false)}>
          ik onthoud het zelf wel
        </button>
      </div>

      <div id="paneel" className={paneelOpen ? "open" : ""}>
        <h2>Je pluisjes zijn onderweg</h2>
        <p>
          Geef je zaadje door aan iemand in de buurt — bij hen groeit generatie {generatie + 1}.
          Hoe verder je pluisjes reizen, hoe groter jouw winkans.
        </p>
        <div className="rij">
          <button className="primair" type="button" onClick={deel} disabled={!deelLink}>
            Deel de link
          </button>
          <button type="button" onClick={kopieer} disabled={!deelLink}>Kopieer link</button>
        </div>
        <div className="artiest">
          <div className="foto">O</div>
          <span>
            Uit het hart van <strong>Oleg Morozov</strong> ·{" "}
            <a href="https://olegpianist.nl" target="_blank" rel="noopener">luister mee</a>
          </span>
        </div>
      </div>

      <div id="toast" className={toastAan ? "zichtbaar" : ""}>{toast || "Gelukt"}</div>
      <audio ref={audioRef} preload="auto" src="/blaas.mp3" playsInline />
      <audio ref={groeiAudioRef} preload="auto" src="/groei-geluid.mp3" playsInline />
    </main>
  );
}
