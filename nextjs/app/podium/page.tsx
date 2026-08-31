"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { BloemMotor, startMic } from "@/lib/bloem-canvas";

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
    width: 150,
    height: 150,
    colorDark: "#2a2417",
    colorLight: "#f2efe6",
    correctLevel: QR.CorrectLevel?.M ?? 0,
  });
  return true;
}

export default function PodiumPagina() {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [lijnSlug, setLijnSlug] = useState("");
  const [gestart, setGestart] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [hint, setHint] = useState("");
  const [bezig, setBezig] = useState(false);
  const [qrScriptKlaar, setQrScriptKlaar] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const qrVakRef = useRef<HTMLDivElement>(null);
  const motorRef = useRef<BloemMotor | null>(null);
  const klaarRef = useRef(false);
  const gestartRef = useRef(false);
  const micActiefRef = useRef(false);
  const micStopRef = useRef<(() => void) | null>(null);
  const geluidGespeeld = useRef(false);

  klaarRef.current = klaar;
  gestartRef.current = gestart;

  const speelBlaasGeluid = useCallback(() => {
    if (geluidGespeeld.current) return;
    geluidGespeeld.current = true;
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.volume = 0.85;
    a.play().catch(() => {});
  }, []);

  const blaas = useCallback((kracht: number) => {
    if (!gestartRef.current || klaarRef.current) return;
    speelBlaasGeluid();
    motorRef.current?.blaas(kracht);
  }, [speelBlaasGeluid]);

  async function zetMicAan() {
    if (micActiefRef.current) return;
    try {
      micActiefRef.current = true;
      const stop = await startMic(
        () => gestartRef.current && !klaarRef.current,
        (k) => blaas(k),
        setHint,
        true
      );
      micStopRef.current = stop;
    } catch {
      micActiefRef.current = false;
      setHint("Geen microfoon? Tik dan snel op de bloem.");
    }
  }

  async function nieuweSessie(slug = lijnSlug) {
    if (!slug) return;
    setBezig(true);
    const res = await fetch("/api/podium/nieuw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lijnSlug: slug, lijnNaam: slug }),
    });
    const data = await res.json();
    setBezig(false);
    if (!res.ok) return;
    setQrUrl(data.qrUrl);
    setGestart(true);
    gestartRef.current = true;
    setKlaar(false);
    klaarRef.current = false;
    setHint("");
    geluidGespeeld.current = false;
    motorRef.current?.bouwPluisjes();
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
      const vast = motor.tekenBlaasbloem(dt);
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
      <audio ref={audioRef} preload="auto" src="/blaas.mp3" />
      {!gestart ? (
        <main className="podium-start">
          <p className="lijn">Oleg Morozov · podium</p>
          <h1>Start deze set</h1>
          <p className="sub">Naam van het optreden, dan groeit er een QR-zaadje onder de pluisjes.</p>
          <input
            placeholder="bv. grote-markt-za"
            value={lijnSlug}
            onChange={(e) => setLijnSlug(e.target.value)}
          />
          <button className="primair" onClick={() => nieuweSessie()} disabled={!lijnSlug || bezig}>
            Start deze set
          </button>
        </main>
      ) : (
        <main className="bloem-app">
          <header>
            <div className="lijn">Oleg Morozov · lijn {lijnMooi}</div>
            <h1>{klaar ? "Daar ligt je zaadje" : "Met liefde gegeven"}</h1>
            <p className="sub">
              {klaar
                ? "Liefde, muziek en schoonheid zullen de wereld redden. Scan met je camera — sta je met meer mensen, dan krijgt ieder een eigen zaadje."
                : "Blaas de pluisjes weg — daaronder ligt jouw zaadje verstopt."}
            </p>
          </header>

          <div id="stage-wrap">
            <canvas id="c" ref={canvasRef} onPointerDown={onCanvasPointer} />
            <div id="qr-zaadje" className={klaar ? "zichtbaar" : ""} role="group" aria-label="QR-code om je zaadje te ontvangen">
              <div className="zaadvorm">
                <div id="qr-vak" ref={qrVakRef} />
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
                else if (!micActiefRef.current) zetMicAan();
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
