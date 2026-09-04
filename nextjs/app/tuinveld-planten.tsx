import type { CSSProperties } from "react";
import { BloeiendePaardenbloem, Roos, Tulp, type TulpTint } from "./tuinveld-illustraties";

const MAX_TEKEN = 26;

type Soort = "zaadje" | "kiem" | "knop" | "openen" | "bloem" | "pluis" | "verspreid";

function verdeel(stukken: { id: Soort; n: number }[]): Soort[] {
  const totaal = stukken.reduce((s, x) => s + x.n, 0);
  if (totaal <= 0) return [];
  if (totaal <= MAX_TEKEN) {
    const uit: Soort[] = [];
    for (const s of stukken) for (let i = 0; i < s.n; i++) uit.push(s.id);
    return uit;
  }
  const floors = stukken.map((s) => {
    const exact = (s.n / totaal) * MAX_TEKEN;
    return { id: s.id, n: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let gegeven = floors.reduce((s, f) => s + f.n, 0);
  const volgorde = [...floors].sort((a, b) => b.rest - a.rest);
  for (let i = 0; gegeven < MAX_TEKEN && i < volgorde.length; i++) {
    volgorde[i].n += 1;
    gegeven += 1;
  }
  const uit: Soort[] = [];
  for (const f of floors) for (let k = 0; k < f.n; k++) uit.push(f.id);
  return uit;
}

function Steel({ x = 24, y1 = 68, y2 = 28, dikte = 1.6 }: { x?: number; y1?: number; y2?: number; dikte?: number }) {
  return (
    <path
      d={`M ${x} ${y1} Q ${x + 2.4} ${(y1 + y2) / 2} ${x} ${y2}`}
      fill="none"
      stroke="var(--stem)"
      strokeWidth={dikte}
      strokeLinecap="round"
    />
  );
}

function Blad({ x = 24, y = 52, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <ellipse
      cx={x - 8 * s}
      cy={y}
      rx={9 * s}
      ry={3.2 * s}
      transform={`rotate(-28 ${x - 8 * s} ${y})`}
      fill="var(--leaf)"
      opacity="0.9"
    />
  );
}

function ZaadjePlant() {
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <ellipse cx="24" cy="64" rx="6.5" ry="4.6" transform="rotate(12 24 64)" fill="#7a5a2e" />
    </svg>
  );
}

function KiemPlant() {
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <Steel y2={42} dikte={1.4} />
      <Blad y={54} s={0.7} />
    </svg>
  );
}

function KnopPlant() {
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <Steel y2={30} />
      <Blad y={50} />
      <path
        d="M24 18 Q31 28 29 38 Q24 44 19 38 Q17 28 24 18 Z"
        fill="var(--knop-groen)"
      />
      <path d="M24 20 L24 40" stroke="rgba(16,31,18,.35)" strokeWidth="0.6" fill="none" />
    </svg>
  );
}

function OpenenPlant() {
  const n = 11;
  const len = 7;
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <Steel y2={30} />
      <Blad y={50} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <ellipse
            key={i}
            cx={24 + Math.cos(a) * len * 0.55}
            cy={28 + Math.sin(a) * len * 0.55}
            rx={len * 0.48}
            ry={2.1}
            transform={`rotate(${(a * 180) / Math.PI} ${24 + Math.cos(a) * len * 0.55} ${28 + Math.sin(a) * len * 0.55})`}
            fill="var(--geel)"
          />
        );
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        return (
          <ellipse
            key={`k${i}`}
            cx={24 + Math.cos(a) * 6}
            cy={32 + Math.sin(a) * 5}
            rx={4}
            ry={1.8}
            transform={`rotate(${(a * 180) / Math.PI} ${24 + Math.cos(a) * 6} ${32 + Math.sin(a) * 5})`}
            fill="var(--knop-groen)"
          />
        );
      })}
      <circle cx="24" cy="28" r="3.2" fill="var(--hart-geel)" />
    </svg>
  );
}

function PluisBol({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const haren = 16;
  return (
    <g>
      {Array.from({ length: haren }, (_, i) => {
        const a = (i / haren) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * 2.2}
            y1={cy + Math.sin(a) * 2.2}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke="var(--pluis)"
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity={0.55 + (i % 3) * 0.12}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="2.6" fill="#6b4f2a" />
    </g>
  );
}

function PluisPlant() {
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <Steel y2={32} />
      <Blad y={50} />
      <PluisBol cx={24} cy={26} r={14} />
    </svg>
  );
}

function VerspreidPlant() {
  return (
    <svg viewBox="0 0 48 72" className="tuinveld-plant" aria-hidden="true">
      <Steel y2={34} />
      <Blad y={52} />
      <circle cx="24" cy="32" r="3" fill="#6b4f2a" />
      <g opacity="0.7">
        <PluisBol cx={34} cy={14} r={7} />
        <PluisBol cx={40} cy={24} r={5.5} />
      </g>
    </svg>
  );
}

function plantVoor(soort: Soort, key: string) {
  switch (soort) {
    case "zaadje": return <ZaadjePlant key={key} />;
    case "kiem": return <KiemPlant key={key} />;
    case "knop": return <KnopPlant key={key} />;
    case "openen": return <OpenenPlant key={key} />;
    case "bloem": return <BloeiendePaardenbloem key={key} className="tuinveld-plant" />;
    case "pluis": return <PluisPlant key={key} />;
    case "verspreid": return <VerspreidPlant key={key} />;
  }
}

type WeiItem = { soort: Soort; id: string };

function idGetal(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function weiHoogte(n: number) {
  const basis = 96;
  const extra = Math.max(0, n - 5) * 4.2;
  return Math.round(Math.min(208, basis + extra));
}

export function TuinveldCluster({ items, extra }: { items: WeiItem[]; extra: number }) {
  if (items.length === 0) return null;
  const hoogte = weiHoogte(items.length);
  return (
    <div className="tuinveld-wei-wrap">
      <div
        className="tuinveld-wei"
        style={{ "--wei-hoogte": `${hoogte}px` } as CSSProperties}
        aria-hidden="true"
      >
        {items.map((item, index) => {
          const h = idGetal(item.id) % 10007;
          const n = items.length;
          const vak = (index + 0.5) / n;
          const trilling = (tussen(h, 1, -1, 1) * 0.45) / n;
          const x = 5 + Math.min(0.98, Math.max(0.02, vak + trilling)) * 90;
          const y = tussen(h, 2, 4, 36);
          const schaal = tussen(h, 3, 0.7, 1.15);
          const rot = tussen(h, 4, -6, 6);
          const t = (schaal - 0.7) / (1.15 - 0.7);
          const diepte = 0.7 + t * 0.3;
          return (
            <span
              key={item.id}
              className="tuinveld-wei-plant"
              style={{
                "--wei-x": `${x}%`,
                "--wei-y": `${y}%`,
                "--wei-rot": `${rot}deg`,
                "--wei-schaal": String(schaal),
                "--wei-diepte": String(diepte),
                "--wei-z": String(Math.round(schaal * 100)),
              } as CSSProperties}
            >
              {plantVoor(item.soort, item.id)}
            </span>
          );
        })}
      </div>
      {extra > 0 && <p className="tuinveld-meer">+{extra} meer</p>}
    </div>
  );
}

export function geplantVisuals(cijfers: {
  geplantZaadje: number;
  geplantKiem: number;
  geplantKnop: number;
  geplantOpenen: number;
  geplant: number;
  ids: {
    zaadje: string[];
    kiem: string[];
    knop: string[];
    openen: string[];
  };
}) {
  const soorten = verdeel([
    { id: "zaadje", n: cijfers.geplantZaadje },
    { id: "kiem", n: cijfers.geplantKiem },
    { id: "knop", n: cijfers.geplantKnop },
    { id: "openen", n: cijfers.geplantOpenen },
  ]);
  const bak: Record<"zaadje" | "kiem" | "knop" | "openen", string[]> = {
    zaadje: [...cijfers.ids.zaadje].sort(),
    kiem: [...cijfers.ids.kiem].sort(),
    knop: [...cijfers.ids.knop].sort(),
    openen: [...cijfers.ids.openen].sort(),
  };
  const items: WeiItem[] = [];
  for (const soort of soorten) {
    const id = bak[soort].shift();
    if (id) items.push({ soort, id });
  }
  return { items, extra: Math.max(0, cijfers.geplant - items.length) };
}

export function groepVisuals(soort: Soort, ids: string[]) {
  const gekozen = [...ids].sort().slice(0, MAX_TEKEN);
  return {
    items: gekozen.map((id) => ({ soort, id })),
    extra: Math.max(0, ids.length - MAX_TEKEN),
  };
}

type AchtergrondPlek = (
  | { soort: "tulp"; tint: TulpTint }
  | { soort: "roos" }
) & {
  kant: "links" | "rechts";
  inset: string;
  y: string;
  mobiel?: { inset: string; bottom: string };
};

const ACHTERGROND: AchtergrondPlek[] = [
  { soort: "tulp", tint: "rood", kant: "links", inset: "2%", y: "38%", mobiel: { inset: "-14px", bottom: "22px" } },
  { soort: "roos", kant: "links", inset: "12%", y: "56%" },
  { soort: "tulp", tint: "geel", kant: "links", inset: "4%", y: "72%", mobiel: { inset: "28px", bottom: "2px" } },
  { soort: "tulp", tint: "roze", kant: "links", inset: "20%", y: "78%" },
  { soort: "roos", kant: "rechts", inset: "6%", y: "50%", mobiel: { inset: "-12px", bottom: "26px" } },
  { soort: "tulp", tint: "rood", kant: "rechts", inset: "8%", y: "34%" },
  { soort: "tulp", tint: "geel", kant: "rechts", inset: "2%", y: "58%" },
  { soort: "roos", kant: "rechts", inset: "4%", y: "74%" },
  { soort: "tulp", tint: "roze", kant: "rechts", inset: "18%", y: "80%", mobiel: { inset: "26px", bottom: "4px" } },
];

function vast(i: number, salt: number) {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function tussen(i: number, salt: number, min: number, max: number) {
  return min + vast(i, salt) * (max - min);
}

export function TuinveldAchtergrond() {
  return (
    <div className="tuinveld-achtergrond" aria-hidden="true">
      {ACHTERGROND.map((b, i) => {
        const breedte = tussen(i, 1, 0.75, 1.4) * 108;
        const rot = tussen(i, 2, -8, 8);
        const opacity = tussen(i, 3, 0.72, 0.84);
        const langs = `max(0px, min(${b.inset}, calc(100% - ${breedte}px)))`;
        const klasse = [
          "tuinveld-sfeerplant",
          b.kant === "rechts" ? "tuinveld-sfeerplant--rechts" : "tuinveld-sfeerplant--links",
          b.mobiel ? "tuinveld-sfeerplant--mobiel" : "",
        ].filter(Boolean).join(" ");
        const stijl = {
          "--sfeer-top": b.y,
          "--sfeer-inset": langs,
          "--sfeer-opacity": String(opacity),
          "--sfeer-rot": `${rot}deg`,
          "--sfeer-breedte": `${breedte}px`,
          ...(b.mobiel
            ? {
                "--sfeer-mobiel-inset": b.mobiel.inset,
                "--sfeer-mobiel-bottom": b.mobiel.bottom,
              }
            : {}),
        } as CSSProperties;
        return (
          <div key={i} className={klasse} style={stijl}>
            {b.soort === "tulp" ? <Tulp tint={b.tint} /> : <Roos />}
          </div>
        );
      })}
      <svg className="tuinveld-gras" viewBox="0 0 400 48" preserveAspectRatio="none">
        <path
          d="M16 36 Q200 24 384 36"
          fill="none"
          stroke="rgba(95,138,74,.5)"
          strokeWidth="2"
        />
        {Array.from({ length: 18 }, (_, i) => {
          const gx = 24 + (i / 17) * 352;
          const hgt = 10 + ((i * 37) % 12);
          const dx = i % 2 ? 6 : -5;
          return (
            <path
              key={i}
              d={`M ${gx} 36 Q ${gx + 3} ${36 - hgt * 0.6} ${gx + dx} ${36 - hgt}`}
              fill="none"
              stroke="rgba(95,138,74,.5)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
}
