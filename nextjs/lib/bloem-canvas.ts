export const AANTAL_PLUIS = 110;

export type Pluisje = {
  dx: number;
  dy: number;
  diep: number;
  los: boolean;
  weg: boolean;
  px: number;
  py: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  flutter: number;
  leven: number;
};

function kleur(naam: string) {
  return getComputedStyle(document.body).getPropertyValue(naam);
}

export class BloemMotor {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 0;
  H = 0;
  DPR = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  pluisjes: Pluisje[] = [];
  perf = 0;
  windOffset = Math.random() * Math.PI * 2;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d niet beschikbaar");
    this.ctx = ctx;
    this.bouwPluisjes();
  }

  maat() {
    const r = this.canvas.parentElement!.getBoundingClientRect();
    this.W = r.width;
    this.H = r.height;
    this.canvas.width = this.W * this.DPR;
    this.canvas.height = this.H * this.DPR;
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
  }

  bouwPluisjes() {
    this.pluisjes = [];
    for (let i = 0; i < AANTAL_PLUIS; i++) {
      const t = i / AANTAL_PLUIS;
      const inc = Math.acos(1 - 2 * t);
      const az = i * 2.399963;
      this.pluisjes.push({
        dx: Math.sin(inc) * Math.cos(az),
        dy: -Math.cos(inc),
        diep: (Math.sin(inc) * Math.sin(az) + 1) / 2,
        los: false,
        weg: false,
        px: 0,
        py: 0,
        vx: 0,
        vy: 0,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.06,
        flutter: Math.random() * Math.PI * 2,
        leven: 1,
      });
    }
  }

  bloemBasis() {
    return { x: this.W / 2, y: this.H * 0.42, r: Math.min(this.W, this.H) * 0.24 };
  }

  tekenGrond() {
    const { ctx, W, H } = this;
    const gy = H * 0.86;
    ctx.strokeStyle = "rgba(95,138,74,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, gy);
    ctx.quadraticCurveTo(W * 0.5, gy - 8, W * 0.92, gy);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 14; i++) {
      const gx = W * 0.1 + W * 0.8 * (i / 13),
        hgt = 8 + ((i * 37) % 11);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + 3, gy - hgt * 0.6, gx + (i % 2 ? 5 : -4), gy - hgt);
      ctx.stroke();
    }
  }

  /** Lichte, trage zwaai van steel + bloemkop om het voetpunt van de steel. */
  metWind(teken: () => void) {
    const { ctx, W, H, perf } = this;
    const gy = H * 0.86;
    const graden =
      Math.sin(perf * 0.0004 + this.windOffset) * 2 +
      Math.sin(perf * 0.00017 + this.windOffset * 1.3) * 0.5;
    ctx.save();
    ctx.translate(W / 2, gy);
    ctx.rotate((graden * Math.PI) / 180);
    ctx.translate(-W / 2, -gy);
    teken();
    ctx.restore();
  }

  tekenSteel(topX: number, topY: number, dikte: number) {
    const { ctx, W, H } = this;
    const gy = H * 0.86;
    ctx.strokeStyle = kleur("--stem");
    ctx.lineWidth = dikte;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(W / 2, gy);
    ctx.quadraticCurveTo(W / 2 + 6, (gy + topY) / 2, topX, topY);
    ctx.stroke();
  }

  tekenBlad(f: number) {
    const { ctx, W, H } = this;
    const gy = H * 0.86,
      by = gy - (gy - this.bloemBasis().y) * f * 0.45;
    ctx.fillStyle = "rgba(95,138,74,.9)";
    ctx.beginPath();
    ctx.ellipse(W / 2 - 16, by, 16, 6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  tekenZaadje(t: number) {
    const { ctx, W, H } = this;
    const gy = H * 0.86;
    ctx.fillStyle = "#7a5a2e";
    ctx.beginPath();
    ctx.ellipse(W / 2, gy - 6 - t * 4, 7, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  tekenKnop(t: number) {
    this.metWind(() => {
      const { ctx, W } = this;
      const b = this.bloemBasis(),
        topY = this.H * 0.86 - (this.H * 0.86 - b.y) * t;
      this.tekenSteel(W / 2, topY, 3);
      this.tekenBlad(t);
      const h = 10 + t * 9,
        w = 5 + t * 3;
      ctx.fillStyle = kleur("--knop-groen");
      ctx.beginPath();
      ctx.moveTo(W / 2, topY - h);
      ctx.quadraticCurveTo(W / 2 + w, topY - h * 0.3, W / 2 + w * 0.75, topY + h * 0.3);
      ctx.quadraticCurveTo(W / 2, topY + h * 0.55, W / 2 - w * 0.75, topY + h * 0.3);
      ctx.quadraticCurveTo(W / 2 - w, topY - h * 0.3, W / 2, topY - h);
      ctx.fill();
      ctx.strokeStyle = "rgba(16,31,18,.35)";
      ctx.lineWidth = 0.7;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * w * 0.32, topY - h * 0.75);
        ctx.lineTo(W / 2 + i * w * 0.42, topY + h * 0.35);
        ctx.stroke();
      }
    });
  }

  tekenOpenen(t: number) {
    this.metWind(() => {
      const { ctx } = this;
      const b = this.bloemBasis();
      this.tekenSteel(b.x, b.y, 3);
      this.tekenBlad(1);
      const n = 13,
        len = b.r * 0.3 * t;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.fillStyle = kleur("--geel");
        ctx.beginPath();
        ctx.ellipse(
          b.x + Math.cos(a) * len * 0.6,
          b.y + Math.sin(a) * len * 0.6,
          len * 0.5 + 2,
          2.4,
          a,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ctx.fillStyle = kleur("--knop-groen");
        ctx.beginPath();
        ctx.ellipse(b.x + Math.cos(a) * 10, b.y + Math.sin(a) * 10 + 6, 6, 2.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = kleur("--hart-geel");
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5 * t, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  tekenBloem(t: number) {
    this.metWind(() => {
      const { ctx } = this;
      const b = this.bloemBasis();
      this.tekenSteel(b.x, b.y, 3.5);
      this.tekenBlad(1);
      const n = 26;
      for (let ring = 0; ring < 2; ring++) {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.12;
          const len = (b.r * 0.62 - ring * 8) * t;
          ctx.fillStyle = ring ? kleur("--geel-diep") : kleur("--geel");
          ctx.beginPath();
          ctx.ellipse(
            b.x + Math.cos(a) * len * 0.58,
            b.y + Math.sin(a) * len * 0.58,
            len * 0.46,
            2.6,
            a,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.fillStyle = kleur("--hart-geel");
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8 * t, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  tekenVerwelken(t: number) {
    this.metWind(() => {
      const { ctx } = this;
      const b = this.bloemBasis();
      this.tekenSteel(b.x, b.y, 3);
      this.tekenBlad(1);
      const n = 10,
        hang = 4 + t * 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.strokeStyle = kleur("--verwelk-diep");
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * 5, b.y + Math.sin(a) * 5);
        ctx.quadraticCurveTo(
          b.x + Math.cos(a) * 9,
          b.y + Math.sin(a) * 4 + hang * 0.5,
          b.x + Math.cos(a) * 6,
          b.y + hang
        );
        ctx.stroke();
      }
      ctx.fillStyle = kleur("--verwelk");
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 2, 9 - t * 1.5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  tekenZaadvorming(t: number) {
    this.metWind(() => {
      const { ctx } = this;
      const b = this.bloemBasis();
      this.tekenSteel(b.x, b.y, 3);
      this.tekenBlad(1);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.strokeStyle = kleur("--verwelk-diep");
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(b.x + Math.cos(a) * 4, b.y + 4);
        ctx.lineTo(b.x + Math.cos(a) * 7, b.y + 10);
        ctx.stroke();
      }
      ctx.fillStyle = kleur("--pluis");
      ctx.globalAlpha = 0.7 + t * 0.3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6 + t * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(139,110,63,.35)";
      for (let i = 0; i < 18; i++) {
        const a = i * 2.399963,
          r = (5 + t * 7) * Math.sqrt(i / 18);
        ctx.beginPath();
        ctx.arc(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  tekenKiem(t: number) {
    this.tekenSteel(this.W / 2, this.H * 0.86 - 60 * t, 2.5);
    this.tekenBlad(t * 0.6);
  }

  tekenPluisje(p: Pluisje, x: number, y: number, s: number, alpha: number) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = kleur("--pluis");
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 5 * s);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = "#8a6a3a";
    ctx.beginPath();
    ctx.ellipse(0, 6 * s, 1.4 * s, 2.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let h = 0; h < 9; h++) {
      const ha = -Math.PI / 2 + (h - 4) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ha) * 8 * s, Math.sin(ha) * 8 * s);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  tekenBlaasbloem(dt: number, toonPlant = true) {
    const { ctx, W, pluisjes } = this;
    const b = this.bloemBasis();
    if (toonPlant) {
      this.tekenSteel(b.x, b.y, 3);
      this.tekenBlad(1);
      ctx.fillStyle = "#6b4f2a";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(242,239,230,.35)";
      for (let d = 0; d < 12; d++) {
        const a = d * 0.52;
        ctx.beginPath();
        ctx.arc(b.x + Math.cos(a) * 4, b.y + Math.sin(a) * 4, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const volgorde = [...pluisjes].sort((a, q) => a.diep - q.diep);
    let vast = 0;
    for (const p of volgorde) {
      if (p.weg) continue;
      if (!p.los) {
        vast++;
        const wind = Math.sin(this.perf * 0.0012 + p.flutter) * 2.5;
        p.px = b.x + p.dx * b.r + wind * p.diep;
        p.py = b.y + p.dy * b.r + Math.cos(this.perf * 0.001 + p.flutter) * 1.5;
        this.tekenPluisje(p, p.px, p.py, 0.75 + p.diep * 0.45, 0.35 + p.diep * 0.65);
      } else {
        p.flutter += 0.08;
        p.vx += 0.012 + Math.sin(p.flutter) * 0.02;
        p.vy += -0.006 + Math.cos(p.flutter * 0.7) * 0.02;
        p.vx *= 0.995;
        p.vy *= 0.995;
        p.px += p.vx * dt * 0.06;
        p.py += p.vy * dt * 0.06;
        p.rot += p.vrot;
        p.leven -= dt * 0.00028;
        if (p.leven <= 0 || p.px > W + 40 || p.py < -40) {
          p.weg = true;
          continue;
        }
        this.tekenPluisje(
          p,
          p.px,
          p.py,
          0.75 + p.diep * 0.45,
          Math.max(0, Math.min(1, p.leven)) * (0.35 + p.diep * 0.65)
        );
      }
    }
    return vast;
  }

  blaas(kracht: number) {
    const b = this.bloemBasis();
    const losTeMaken = Math.ceil(kracht * 26);
    let n = 0;
    for (const p of this.pluisjes) {
      if (p.los || p.weg) continue;
      if (Math.random() < 0.25 + kracht * 0.6) {
        p.los = true;
        const richting = Math.atan2(p.py - b.y, p.px - b.x);
        const spd = 2.2 + Math.random() * 3.5 + kracht * 4;
        p.vx = Math.cos(richting) * spd * 0.4 + 2.4 + kracht * 3;
        p.vy = Math.sin(richting) * spd * 0.4 - 1.6 - kracht * 2;
        if (++n >= losTeMaken) break;
      }
    }
  }

  tikOpBloem(clientX: number, clientY: number) {
    const b = this.bloemBasis();
    const r = this.canvas.getBoundingClientRect();
    return Math.hypot(clientX - r.left - b.x, clientY - r.top - b.y) < b.r * 1.4;
  }
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

export async function startMic(
  blaasbaar: () => boolean,
  blaas: (kracht: number) => void,
  onHint: (tekst: string) => void,
  podium: boolean
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const AC = window.AudioContext || (window as AudioWindow).webkitAudioContext!;
  const ac = new AC();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  ac.createMediaStreamSource(stream).connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  onHint(
    podium ? "Microfoon aan — laat je publiek blazen" : "Microfoon aan — blaas zachtjes op je telefoon"
  );
  let boven = 0;
  let actief = true;
  function luister() {
    if (!actief) return;
    if (!blaasbaar()) {
      stream.getTracks().forEach((t) => t.stop());
      actief = false;
      return;
    }
    analyser.getFloatTimeDomainData(data);
    let som = 0;
    for (let i = 0; i < data.length; i++) som += data[i] * data[i];
    const rms = Math.sqrt(som / data.length);
    if (rms > 0.12) {
      boven++;
      if (boven > 4) blaas(Math.min(1, (rms - 0.12) * 4));
    } else boven = Math.max(0, boven - 1);
    requestAnimationFrame(luister);
  }
  luister();
  return () => {
    actief = false;
    stream.getTracks().forEach((t) => t.stop());
    ac.close().catch(() => {});
  };
}
