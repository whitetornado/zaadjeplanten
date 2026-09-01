type IllustratieProps = { className?: string };

function SteelEnBlad({
  x,
  grondY,
  topY,
  dikte,
}: {
  x: number;
  grondY: number;
  topY: number;
  dikte: number;
}) {
  const bladY = (grondY + topY) * 0.58;
  return (
    <>
      <path
        d={`M ${x} ${grondY} Q ${x + 5} ${(grondY + topY) / 2} ${x} ${topY}`}
        fill="none"
        stroke="#b98a4a"
        strokeWidth={dikte}
        strokeLinecap="round"
      />
      <ellipse
        cx={x - 14}
        cy={bladY}
        rx="16"
        ry="5.4"
        transform={`rotate(-32 ${x - 14} ${bladY})`}
        fill="#5f8a4a"
      />
    </>
  );
}

/** Gele stralende paardenbloem, zelfde opbouw als tekenBloem() in de canvas. */
export function BloeiendePaardenbloem({ className }: IllustratieProps) {
  const cx = 40;
  const cy = 34;
  const n = 11;
  return (
    <svg viewBox="0 0 80 112" className={className} aria-hidden="true">
      <SteelEnBlad x={cx} grondY={108} topY={48} dikte={3.2} />
      {[0, 1].map((ring) =>
        Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + ring * 0.12;
          const len = 20 - ring * 7;
          const px = cx + Math.cos(a) * len * 0.58;
          const py = cy + Math.sin(a) * len * 0.58;
          return (
            <ellipse
              key={`${ring}-${i}`}
              cx={px}
              cy={py}
              rx={len * 0.46}
              ry={2.8}
              transform={`rotate(${(a * 180) / Math.PI} ${px} ${py})`}
              fill={ring ? "#e0972a" : "#f3c634"}
            />
          );
        })
      )}
      <circle cx={cx} cy={cy} r="7" fill="#a9721e" />
    </svg>
  );
}

/** Eenvoudige tulp: kelk van drie overlappende blaadjes. */
export type TulpTint = "rood" | "roze" | "geel";

const TULP_KLEUR: Record<TulpTint, { hoofd: string; schaduw: string }> = {
  rood: { hoofd: "#e0524a", schaduw: "#c23f38" },
  roze: { hoofd: "#e07a95", schaduw: "#c25a75" },
  geel: { hoofd: "#f3c634", schaduw: "#e0972a" },
};

export function Tulp({ className, tint = "rood" }: IllustratieProps & { tint?: TulpTint }) {
  const x = 28;
  const { hoofd, schaduw } = TULP_KLEUR[tint];
  return (
    <svg viewBox="0 0 56 108" className={className} aria-hidden="true">
      <SteelEnBlad x={x} grondY={106} topY={42} dikte={2.6} />
      <path d={`M${x} 42 Q8 34 12 12 Q${x - 2} 26 ${x} 42Z`} fill={hoofd} />
      <path d={`M${x} 42 Q48 34 44 12 Q${x + 2} 26 ${x} 42Z`} fill={hoofd} />
      <path d={`M${x} 42 Q18 24 20 14 Q${x - 2} 28 ${x} 42Z`} fill={schaduw} />
      <path d={`M${x} 42 Q38 24 36 14 Q${x + 2} 28 ${x} 42Z`} fill={schaduw} />
      <path d={`M${x} 42 Q20 16 ${x} 6 Q36 16 ${x} 42Z`} fill={hoofd} />
      <path d={`M${x} 42 Q24 18 ${x} 10 Q32 18 ${x} 42Z`} fill={schaduw} />
    </svg>
  );
}

/** Roos: rond hart met een paar gebogen blaadjes. */
export function Roos({ className }: IllustratieProps) {
  const x = 28;
  const y = 30;
  const blaadjes = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 56 108" className={className} aria-hidden="true">
      <SteelEnBlad x={x} grondY={106} topY={46} dikte={2.6} />
      {blaadjes.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <ellipse
            key={deg}
            cx={x + Math.cos(a) * 7}
            cy={y + Math.sin(a) * 7}
            rx="12"
            ry="8.5"
            transform={`rotate(${deg + 20} ${x} ${y})`}
            fill={i % 2 ? "#7a2438" : "#a5334a"}
          />
        );
      })}
      <circle cx={x} cy={y} r="8" fill="#a5334a" />
      <circle cx={x} cy={y + 1.2} r="3.8" fill="#5c1a2a" />
    </svg>
  );
}
