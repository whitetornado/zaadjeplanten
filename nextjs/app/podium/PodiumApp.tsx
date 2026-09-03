"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { BloemMotor, ontgrendelAudio, startMic } from "@/lib/bloem-canvas";
import { useSchudDetectie, vraagBewegingToestemming } from "@/lib/schud";

declare global {
  interface Window {
    QRCode?: {
      new (el: HTMLElement, opts: {
        text: string; width: number; height: number;
        colorDark: string; colorLight: string; correctLevel: number;
      }): unknown;
      CorrectLevel: { L: number; M: number; Q: number; H: number };
    };
  }
}

const IS_DEV = process.env.NODE_ENV !== "production";

function tekenQr(vak: HTMLElement, url: string) {
  vak.innerHTML = "";
  const QR = window.QRCode;
  if (!QR) return false;
  new QR(vak, {
    text: url,
    width: 114,
    height: 114,
    colorDark: "#2a2417",
    colorLight: "#f2efe6",
    correctLevel: QR.CorrectLevel?.M ?? 0,
  });
  return true;
}

function PluisjesKroon({ aantal = 44, straal = 140 }: { aantal?: number; straal?: number }) {
  const lagen = [
    { n: aantal, factor: 1, offset: 0 },
    { n: Math.round(aantal * 0.7), factor: 0.8, offset: 0.5 },
  ];
  const haartjes = lagen.flatMap((laag, li) =>
    Array.from({ length: laag.n }, (_, i) => {
      const hoek = ((i + laag.offset) / laag.n) * Math.PI * 2 - Math.PI / 2;
      const lengte = straal * laag.factor * (0.75 + Math.sin((i + li * 3) * 2.7) * 0.15);
      const x1 = Math.cos(hoek) * (straal * 0.42);
      const y1 = Math.sin(hoek) * (straal * 0.42);
      const x2 = Math.cos(hoek) * lengte;
      const y2 = Math.sin(hoek) * lengte;
      const cx = Math.cos(hoek) * (straal * 0.68 * laag.factor) - Math.sin(hoek) * 14;
      const cy = Math.sin(hoek) * (straal * 0.68 * laag.factor) + Math.cos(hoek) * 14;
      return (
        <path
          key={`${li}-${i}`}
          d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
          stroke="var(--pluis, #f2efe6)"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity={0.5 + Math.sin(i * 1.3 + li) * 0.25}
        />
      );
    })
  );
  return (
    <svg
      className="pluis-kroon"
      viewBox={`${-straal - 20} ${-straal - 20} ${(straal + 20) * 2} ${(straal + 20) * 2}`}
      aria-hidden="true"
    >
      {haartjes}
    </svg>
  );
}

function ZaadPeul() {
  return (
    <svg className="zaadpeul" viewBox="0 0 16 40" aria-hidden="true">
      <path d="M8 0 L8 14" stroke="#c4ae7a" strokeWidth="1.15" strokeLinecap="round" />
      <path
        d="M8 14 C12.4 16.5 13.6 23 13.6 28 C13.6 33.5 11 38.2 8 40 C5 38.2 2.4 33.5 2.4 28 C2.4 23 3.6 16.5 8 14 Z"
        fill="#cbb892"
        stroke="#a89060"
        strokeWidth="0.55"
      />
      <path d="M8 16 Q6.4 27 8 38" stroke="#8a7344" strokeWidth="0.45" fill="none" opacity="0.5" />
      <path d="M8 16 L8 38" stroke="#8a7344" strokeWidth="0.55" fill="none" opacity="0.55" />
      <path d="M8 16 Q9.6 27 8 38" stroke="#8a7344" strokeWidth="0.45" fill="none" opacity="0.5" />
    </svg>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function automatischeSlug(nu = new Date()) {
  return `optreden-${nu.getFullYear()}-${pad2(nu.getMonth() + 1)}-${pad2(nu.getDate())}-${pad2(nu.getHours())}${pad2(nu.getMinutes())}`;
}

function naarSlug(naam: string) {
  return naam
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function PodiumApp() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [lijnSlug, setLijnSlug] = useState("");
  const [eigenNaam, setEigenNaam] = useState("");
  const [eigenNaamOpen, setEigenNaamOpen] = useState(false);
  const [gestart, setGestart] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [hint, setHint] = useState("");
  const [bezig, setBezig] = useState(false);
  const [qrScriptKlaar, setQrScriptKlaar] = useState(false);
  const [schudLuisteren, setSchudLuisteren] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const qrVakRef = useRef<HTMLDivElement>(null);
  const motorRef = useRef<BloemMotor | null>(null);
  const klaarRef = useRef(false);
  const gestartRef = useRef(false);
  const micActiefRef = useRef(false);
  const micStopRef = useRef<(() => void) | null>(null);
  const sensorenGestartRef = useRef(false);
  const geluidGespeeld = useRef(false);

  klaarRef.current = klaar;
  gestartRef.current = gestart;

  const speelBlaasGeluid = useCallback(() => {
    if (geluidGespeeld.current) return;
    const a = audioRef.current;
    if (!a) return;
    geluidGespeeld.current = true;
    a.currentTime = 0;
    a.volume = 0.85;
    a.play().catch(() => {
      geluidGespeeld.current = false;
    });
  }, []);

  const blaas = useCallback((kracht: number) => {
    if (!gestartRef.current || klaarRef.current) return;
    speelBlaasGeluid();
    motorRef.current?.blaas(kracht);
  }, [speelBlaasGeluid]);

  useSchudDetectie(schudLuisteren && gestart && !klaar, blaas);

  async function zetSensorenAan() {
    if (sensorenGestartRef.current) return;
    sensorenGestartRef.current = true;
    ontgrendelAudio(audioRef.current);

    const beweging = vraagBewegingToestemming();

    try {
      if (!micActiefRef.current) {
        micActiefRef.current = true;
        const stop = await startMic(
          () => gestartRef.current && !klaarRef.current,
          (k) => blaas(k),
          setHint,
          true
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

  async function nieuweSessie(slug = lijnSlug, naam = slug) {
    if (!slug) return;
    setBezig(true);
    const res = await fetch("/api/podium/nieuw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lijnSlug: slug, lijnNaam: naam }),
    });
    const data = await res.json();
    setBezig(false);
    if (!res.ok) return;
    setQrUrl(data.qrUrl);
    setGestart(true);
    gestartRef.current = true;
    setKlaar(false);
    klaarRef.current = false;
    setHint(sensorenGestartRef.current ? "Blaas, tik, of schud je telefoon" : "");
    geluidGespeeld.current = false;
    motorRef.current?.bouwPluisjes();
  }

  function startDezeSet() {
    const eigen = eigenNaam.trim();
    const slug = naarSlug(eigen) || automatischeSlug();
    const naam = eigen || slug;
    setLijnSlug(slug);
    nieuweSessie(slug, naam);
  }

  function resetVoorVolgende() {
    nieuweSessie();
  }

  useEffect(() => {
    if (!gestart || !qrUrl || !qrScriptKlaar) return;
    const vak = qrVakRef.current;
    if (!vak) return;
    tekenQr(vak, qrUrl);
  }, [gestart, qrUrl, qrScriptKlaar]);

  useEffect(() => {
    if (!gestart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motor = new BloemMotor(canvas);
    motorRef.current = motor;
    motor.maat();
    const onResize = () => motor.maat();
    window.addEventListener("resize", onResize);
    let vorige = performance.now();
    let raf = 0;

    function lus(nu: number) {
      const dt = Math.min(50, nu - vorige);
      vorige = nu;
      motor.perf = nu;
      motor.ctx.clearRect(0, 0, motor.W, motor.H);
      motor.tekenGrond();
      const vast = motor.tekenBlaasbloem(dt, !klaarRef.current);
      if (!klaarRef.current && vast === 0) {
        klaarRef.current = true;
        setKlaar(true);
        setHint("");
      }
      raf = requestAnimationFrame(lus);
    }
    raf = requestAnimationFrame(lus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      motorRef.current = null;
    };
  }, [gestart]);

  useEffect(() => {
    if (window.QRCode) setQrScriptKlaar(true);
    return () => { micStopRef.current?.(); };
  }, []);

  function onCanvasPointer(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!gestart || klaar) return;
    if (motorRef.current?.tikOpBloem(ev.clientX, ev.clientY)) blaas(0.5);
  }

  const lijnMooi = lijnSlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "optreden";

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
        strategy="afterInteractive"
        onLoad={() => setQrScriptKlaar(true)}
      />
      <audio ref={audioRef} preload="auto" src="/blaas.mp3" playsInline />
      {!gestart ? (
        <main className="podium-start">
          <p className="lijn">Oleg Morozov · podium</p>
          <h1>Start deze set</h1>
          <p className="sub">Tik op de knop — er groeit een QR-zaadje onder de pluisjes.</p>
          <button className="primair" onClick={startDezeSet} disabled={bezig}>
            Start deze set
          </button>
          <button
            className="stille-knop"
            type="button"
            aria-expanded={eigenNaamOpen}
            onClick={() => setEigenNaamOpen((open) => !open)}
          >
            eigen naam voor deze set?
          </button>
          {eigenNaamOpen && (
            <input
              className="podium-eigen"
              placeholder="bv. Vismarkt"
              value={eigenNaam}
              onChange={(e) => setEigenNaam(e.target.value)}
              autoComplete="off"
            />
          )}
        </main>
      ) : (
        <main className="bloem-app">
          <header>
            <div className="lijn">Oleg Morozov · lijn {lijnMooi}</div>
            <h1>{klaar ? "Daar ligt je zaadje" : "Met liefde gegeven"}</h1>
            <p className="sub">
              {klaar
                ? "Liefde, muziek en schoonheid zullen de wereld redden. Scan met je camera — sta je met meer mensen, dan krijgt ieder een eigen zaadje."
                : "Blaas, tik of schud — daaronder ligt jouw zaadje verstopt."}
            </p>
          </header>

          <div id="stage-wrap">
            <canvas id="c" ref={canvasRef} onPointerDown={onCanvasPointer} />
            <div id="qr-zaadje" className={klaar ? "zichtbaar" : ""} role="group" aria-label="QR-code om je zaadje te ontvangen">
              <div className="zaadvorm">
                <PluisjesKroon />
                <ZaadPeul />
                <div className="qr-schijf">
                  <div id="qr-vak" ref={qrVakRef} />
                </div>
              </div>
              <div className="zaad-caption">
                <div className="zaad-tekst">Vang je zaadje — scan</div>
                <div className="zaad-sub">elke scan krijgt z'n eigen zaadje</div>
              </div>
            </div>
          </div>

          <footer>
            <button
              className={klaar ? "" : "primair"}
              onClick={() => {
                if (klaar) resetVoorVolgende();
                else if (!sensorenGestartRef.current) zetSensorenAan();
              }}
              disabled={bezig}
            >
              {klaar ? "Nieuwe bloem (volgende ronde)" : "Zet de microfoon aan"}
            </button>
            <div className="hint">{hint}</div>
            {IS_DEV && !klaar && (
              <button
                className="stille-knop"
                type="button"
                onClick={() => { blaas(1); blaas(1); blaas(1); blaas(1); }}
              >
                demo: blaas alles in één keer weg
              </button>
            )}
          </footer>
        </main>
      )}
    </>
  );
}
