// The crowd: raccoons, deer, hedgehogs and bears, bobbing to the beat, arms up
// on choruses, phones/lighters in the ballad, glow sticks on the big bits,
// cardboard signs, phone-camera flashes, Mexican waves, clap-alongs and a
// rotating cast of crowd surfers. Front and centre: YOU, a capybara.

import { circ, ell, eye, limb, poly, rgba, rr, sunglasses, type G } from './draw';
import { unlock } from '../show/score';
import type { Frame } from './characters/base';

type Kind = 'raccoon' | 'deer' | 'hedgehog' | 'bear';
export interface Fan {
  kind: Kind;
  x: number;
  y: number;
  s: number;
  ph: number;
  amp: number;
  arms: number;
  hold: 'none' | 'phone' | 'lighter';
  jump: number;
  col: string;
  sign: string | null;
  signCol: string;
  glow: string | null;
  flash: number;
  wave: number;
  clap: number;
  shirt: string | null;
}

const COLORS: Record<Kind, string[]> = {
  raccoon: ['#55505e', '#6a6474'],
  deer: ['#8a5a3a', '#9c6a44'],
  hedgehog: ['#6b5040', '#7b5d48'],
  bear: ['#4a3324', '#5b3e2a'],
};
const KINDS: Kind[] = ['raccoon', 'deer', 'hedgehog', 'bear'];
const SIGNS = [
  'MARRY ME GARY', 'PLAY THE MEOW ONE', 'OCTAVIA HIT ME', 'I ❤ GREG', 'MEEEH!!', 'FOX SOLO PLS',
  'MY FIRST GIG', 'OWL WHERE ARE YOUR EYES', 'KEVIN STAND UP', 'I DROVE 3 FORESTS', 'THROW ME A FISH',
  'PURR-FECT', 'HONK IF U LOVE ME', 'ENCORE >:3',
];
const SIGN_COLORS = ['#fff6d8', '#ffd1ec', '#d6f5ff', '#fff1a8'];
export const NEON = ['#39ff14', '#ff2bd6', '#2bf1ff', '#ffe600', '#ff7a1a'];

type SurferKind = 'frog' | 'hedgehog' | 'bear';
const SURFER_LINES: Record<SurferKind, string> = { frog: 'wheee', hedgehog: 'ouch ouch ouch', bear: 'a whole bear?!' };

export class Crowd {
  fans: Fan[] = [];
  private surfer: { x: number; t: number; kind: SurferKind } | null = null;
  youSinging = 0;
  youLighter = false;
  youNote: string | null = null;
  youShirt: string | null = null;
  youWave = 0;
  youHat: 'none' | 'ears' | 'crown' | 'bucket' = 'none';
  youExtra: 'none' | 'paw' | 'necklace' = 'none';
  raining = false;
  /** Only a few VIPs stay for the afterparty. */
  vipOnly = false;
  onDiveDone: (() => void) | null = null;
  private dive: { state: 'none' | 'climbing' | 'stage' | 'surfing'; t: number; x: number } = { state: 'none', t: 0, x: 800 };
  private waveX: number | null = null;

  constructor(lowQuality: boolean) {
    const rows = lowQuality ? [{ y: 770, n: 9, s: 0.8 }, { y: 860, n: 7, s: 1.05 }] : [
      { y: 742, n: 14, s: 0.68 },
      { y: 800, n: 12, s: 0.85 },
      { y: 870, n: 10, s: 1.08 },
    ];
    let signs = [...SIGNS].sort(() => Math.random() - 0.5);
    rows.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        const x = (i + 0.5 + (ri % 2) * 0.4) * (1600 / r.n) + (Math.random() - 0.5) * 30;
        if (ri === rows.length - 1 && Math.abs(x - 800) < 110) continue; // space for YOU
        const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
        // signs live in the back rows so they don't block the stage
        const sign = ri < rows.length - 1 && Math.random() < 0.22 && signs.length ? signs.pop()! : null;
        if (!signs.length) signs = [...SIGNS];
        this.fans.push({
          kind, x, y: r.y + (Math.random() - 0.5) * 14, s: r.s * (0.9 + Math.random() * 0.2), ph: Math.random() * 0.25,
          amp: 0.6 + Math.random() * 0.6, arms: 0, hold: 'none', jump: 0, col: COLORS[kind][Math.floor(Math.random() * 2)],
          sign, signCol: SIGN_COLORS[Math.floor(Math.random() * SIGN_COLORS.length)], glow: null, flash: 0, wave: 0, clap: 0, shirt: null,
        });
      }
    });
  }

  /** Crowd surfer of the day: usually the frog, sometimes something much heavier. */
  surf() {
    if (this.surfer) return;
    const r = Math.random();
    this.surfer = { x: -80, t: 0, kind: r < 0.55 ? 'frog' : r < 0.8 ? 'hedgehog' : 'bear' };
  }

  cheer() {
    for (const f of this.fans) f.jump = 0.6 + Math.random() * 0.4;
  }

  /** A Mexican wave rolling left to right. */
  wave() {
    if (this.waveX === null) this.waveX = -150;
  }

  get waving() {
    return this.waveX !== null;
  }

  /** Everybody claps once (visual). */
  clap() {
    for (const f of this.fans) f.clap = 1;
  }

  /** A few phone cameras go off. */
  flashes(n: number) {
    for (let i = 0; i < n; i++) this.fans[Math.floor(Math.random() * this.fans.length)].flash = 1;
  }

  nearestFan(wx: number, wy: number, maxD = 120): Fan | null {
    let best: Fan | null = null;
    let bd = 1e9;
    for (const f of this.fans) {
      const d = Math.hypot(f.x - wx, f.y - 50 * f.s - wy);
      if (d < bd) { bd = d; best = f; }
    }
    return best && bd < maxD ? best : null;
  }

  /** Tap the crowd in lighter mode: the nearest fan raises a lighter. */
  raiseLighter(wx: number, wy: number): boolean {
    const best = this.nearestFan(wx, wy);
    if (best) best.hold = 'lighter';
    return !!best;
  }

  balladMode(on: boolean) {
    for (const f of this.fans) {
      if (on && f.hold === 'none' && Math.random() < 0.35) f.hold = Math.random() < 0.6 ? 'phone' : 'lighter';
      if (!on && Math.random() < 0.85) f.hold = 'none';
    }
  }

  /** Glow sticks out for the big sections. */
  glowMode(on: boolean) {
    for (const f of this.fans) {
      if (on && !f.glow && f.hold === 'none' && Math.random() < 0.45) f.glow = NEON[Math.floor(Math.random() * NEON.length)];
      if (!on) f.glow = null;
    }
  }

  update(f: Frame, armsTarget: number) {
    if (this.waveX !== null) {
      this.waveX += f.dt * 950;
      if (this.waveX > 1800) this.waveX = null;
    }
    for (const fan of this.fans) {
      const want = armsTarget * (fan.amp > 0.9 ? 1 : 0.7);
      fan.arms += (want - fan.arms) * Math.min(1, f.dt * 3);
      fan.jump = Math.max(0, fan.jump - f.dt * 1.4);
      fan.flash = Math.max(0, fan.flash - f.dt * 5);
      fan.clap = Math.max(0, fan.clap - f.dt * 6);
      const near = this.waveX !== null ? Math.max(0, 1 - Math.abs(this.waveX - fan.x) / 140) : 0;
      fan.wave = Math.max(near, fan.wave - f.dt * 2.5);
    }
    this.updateDive(f.dt);
    this.youWave = this.waveX !== null ? Math.max(0, 1 - Math.abs(this.waveX - 800) / 140) : Math.max(0, this.youWave - f.dt * 2.5);
    if (this.surfer) {
      this.surfer.t += f.dt;
      this.surfer.x += f.dt * (this.surfer.kind === 'bear' ? 120 : 190);
      if (this.surfer.x > 1720) {
        if (this.surfer.kind === 'bear') unlock('bear');
        this.surfer = null;
      }
    }
  }

  private bobFor(f: Frame, fan: Fan): number {
    const energy = f.playing ? 0.4 + f.intensity * 0.6 + f.hype * 0.4 : 0.15;
    const ph = (f.phase + fan.ph) % 1;
    return (f.reduceMotion ? 0.3 : 1) * Math.pow(1 - ph, 2) * 10 * fan.amp * energy
      + Math.sin(fan.jump * Math.PI) * 30 * fan.jump
      + fan.wave * 34;
  }

  draw(g: G, f: Frame) {
    const rim = f.palette[Math.floor(f.beat / 4) % Math.max(1, f.palette.length)] ?? '#7b2cff';
    const fans = this.vipOnly ? this.fans.filter((_, i) => i % 6 === 0) : this.fans;
    for (const fan of fans) this.fan(g, f, fan, this.bobFor(f, fan), rim);
    this.drawYou(g, f, rim);
    if (this.surfer) this.drawSurfer(g, f);
  }

  /** Hand height of the fan nearest x (for beach balls to bounce off). */
  handsY(x: number): number {
    let best = this.fans[0];
    for (const f of this.fans) if (Math.abs(f.x - x) < Math.abs(best.x - x)) best = f;
    return best.y - (60 + best.arms * 70) * best.s;
  }

  /** Draw a single fan somewhere else (the crowd cam on the LED wall). */
  portrait(g: G, f: Frame, fan: Fan | 'you', x: number, y: number, scale: number) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    if (fan === 'you') {
      g.translate(-800, -900);
      this.drawYou(g, f, '#ffe066', true);
    } else {
      const copy: Fan = { ...fan, x: 0, y: 0, s: 1, arms: Math.max(fan.arms, 0.6 + Math.sin(f.t * 6) * 0.3) };
      this.fan(g, f, copy, Math.abs(Math.sin(f.t * 4)) * 8, '#ffe066');
    }
    g.restore();
  }

  private fan(g: G, f: Frame, fan: Fan, bob: number, rim: string) {
    g.save();
    g.translate(fan.x, fan.y - bob);
    g.scale(fan.s, fan.s);
    const c = fan.col;
    // arms: raised + waving, clapping, or holding a sign / glow stick
    const wave = Math.sin(f.t * 5 + fan.x) * 0.3;
    const up = Math.max(fan.arms, fan.wave, fan.clap * 0.8);
    if (fan.sign && f.show !== 'landing') {
      limb(g, -26, -40, -40, -150, 10, c);
      limb(g, 26, -40, 40, -150, 10, c);
      g.save();
      g.translate(0, -170 + Math.sin(f.t * 3 + fan.x) * 3);
      g.rotate(Math.sin(f.t * 1.5 + fan.x) * 0.06);
      rr(g, -62, -26, 124, 46, 3, fan.signCol);
      g.fillStyle = '#1a1030';
      g.font = `900 ${fan.sign.length > 13 ? 12 : 15}px "Marker Felt", "Comic Sans MS", system-ui`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(fan.sign, 0, -3);
      g.restore();
    } else if (fan.clap > 0.05) {
      const gap = 14 + (1 - fan.clap) * 20;
      limb(g, -26, -40, -gap / 2, -120, 11, c);
      limb(g, 26, -40, gap / 2, -120, 11, c);
    } else {
      for (const sd of [-1, 1]) {
        const hx = sd * (34 + up * (8 + wave * 22));
        const hy = -up * 128;
        limb(g, sd * 26, -40, hx, hy, 11, c);
        if (up > 0.3) circ(g, hx, hy, 7, c);
        if (sd === 1 && fan.glow && up > 0.3) this.glowStick(g, f, hx, hy, fan.glow, fan.x);
      }
    }
    // body (+ souvenir shirt) + head
    ell(g, 0, -20, 42, 38, fan.shirt ?? c);
    if (this.raining && !fan.shirt) {
      // free ponchos (see-through, crinkly, very glamorous)
      ell(g, 0, -24, 46, 42, 'rgba(255,236,90,0.55)');
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-20, -50); g.lineTo(-14, -2); g.moveTo(16, -48); g.lineTo(20, -4);
      g.stroke();
    }
    if (fan.shirt) {
      g.fillStyle = '#fff';
      g.font = '900 11px system-ui';
      g.textAlign = 'center';
      g.fillText('WF', 0, -16);
    }
    const hy = -78;
    switch (fan.kind) {
      case 'raccoon':
        poly(g, [-26, hy - 10, -20, hy - 38, -6, hy - 22], c);
        poly(g, [26, hy - 10, 20, hy - 38, 6, hy - 22], c);
        ell(g, 0, hy, 30, 26, c);
        ell(g, 0, hy - 2, 24, 8, '#1d1b22');
        circ(g, -10, hy - 2, 4, '#fff');
        circ(g, 10, hy - 2, 4, '#fff');
        ell(g, 0, hy + 12, 10, 8, '#cfc8d6');
        break;
      case 'deer':
        g.strokeStyle = '#d8c39a';
        g.lineWidth = 4;
        g.lineCap = 'round';
        for (const sd of [-1, 1]) {
          g.beginPath();
          g.moveTo(sd * 10, hy - 22);
          g.lineTo(sd * 22, hy - 54);
          g.moveTo(sd * 17, hy - 40);
          g.lineTo(sd * 30, hy - 46);
          g.stroke();
        }
        ell(g, 0, hy, 22, 28, c);
        ell(g, -24, hy - 14, 12, 6, c, -0.4);
        ell(g, 24, hy - 14, 12, 6, c, 0.4);
        ell(g, 0, hy + 14, 10, 9, '#efe0c8');
        circ(g, -9, hy - 4, 3.5, '#111');
        circ(g, 9, hy - 4, 3.5, '#111');
        break;
      case 'hedgehog':
        for (let i = 0; i < 9; i++) {
          const a = Math.PI + (i / 8) * Math.PI;
          poly(g, [Math.cos(a) * 22, hy + Math.sin(a) * 20, Math.cos(a) * 40, hy + Math.sin(a) * 36, Math.cos(a + 0.2) * 22, hy + Math.sin(a + 0.2) * 20], '#3e2c22');
        }
        ell(g, 0, hy, 28, 24, c);
        ell(g, 0, hy + 6, 18, 14, '#e8cfae');
        circ(g, -8, hy, 3.5, '#111');
        circ(g, 8, hy, 3.5, '#111');
        circ(g, 0, hy + 12, 4, '#111');
        break;
      case 'bear':
        circ(g, -22, hy - 20, 10, c);
        circ(g, 22, hy - 20, 10, c);
        ell(g, 0, hy, 30, 28, c);
        ell(g, 0, hy + 10, 13, 10, '#a07a58');
        circ(g, 0, hy + 6, 4, '#111');
        circ(g, -11, hy - 6, 3.5, '#111');
        circ(g, 11, hy - 6, 3.5, '#111');
        break;
    }
    if (f.sunglasses) sunglasses(g, 0, hy - 3, 40);
    // rim light from the stage
    g.strokeStyle = rgba(rim, 0.55 + f.energy.bass * 0.3);
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, hy, 28, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    // phone or lighter
    if (fan.hold !== 'none' && !fan.sign) {
      const hx = 30 + fan.arms * 6;
      const hy2 = -80 - 40;
      limb(g, 26, -40, hx, hy2 + 10, 11, fan.col);
      if (fan.hold === 'phone') {
        rr(g, hx - 7, hy2 - 16, 14, 24, 3, '#222');
        rr(g, hx - 5, hy2 - 14, 10, 18, 2, rgba('#cfe8ff', 0.9));
        const glow = g.createRadialGradient(hx, hy2 - 4, 0, hx, hy2 - 4, 40);
        glow.addColorStop(0, 'rgba(200,230,255,0.35)');
        glow.addColorStop(1, 'rgba(200,230,255,0)');
        g.fillStyle = glow;
        g.fillRect(hx - 40, hy2 - 44, 80, 80);
      } else {
        this.lighter(g, f, hx, hy2);
      }
    }
    // phone-camera flash (soft — real strobes are opt-in)
    if (fan.flash > 0.05) {
      const a = fan.flash * (f.reduceMotion ? 0.25 : 0.7);
      const fl = g.createRadialGradient(18, -150, 0, 18, -150, 34);
      fl.addColorStop(0, `rgba(255,255,255,${a})`);
      fl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = fl;
      g.fillRect(-16, -184, 68, 68);
    }
    g.restore();
  }

  private glowStick(g: G, f: Frame, x: number, y: number, col: string, seed: number) {
    const a = Math.sin(f.t * 6 + seed) * 0.6;
    const ex = x + Math.sin(a) * 34;
    const ey = y - Math.cos(a) * 34;
    g.save();
    g.globalCompositeOperation = 'lighter';
    limb(g, x, y, ex, ey, 14, rgba(col, 0.25));
    limb(g, x, y, ex, ey, 6, rgba(col, 0.95));
    g.restore();
  }

  private lighter(g: G, f: Frame, x: number, y: number) {
    rr(g, x - 5, y - 4, 10, 16, 2, '#c33');
    const flick = Math.sin(f.t * 22 + x) * 1.5;
    const glow = g.createRadialGradient(x, y - 14, 0, x, y - 14, 46);
    glow.addColorStop(0, 'rgba(255,200,90,0.5)');
    glow.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = glow;
    g.fillRect(x - 46, y - 60, 92, 92);
    ell(g, x + flick * 0.3, y - 13, 4, 9 + flick, '#ffcf5a');
    ell(g, x, y - 10, 2, 4, '#fff6d0');
  }

  /** The capybara itself (feet at 0,0), in whatever outfit you bought. */
  private capy(g: G, f: Frame, rim: string, opts: { arms?: number; mouth?: number; eyes?: number; lighter?: boolean }) {
    const C = '#9b6b43';
    const arms = opts.arms ?? 0;
    if (arms > 0.2) {
      limb(g, -30, -40, -46, -40 - 80 * arms, 12, C);
      limb(g, 30, -40, 46 + Math.sin(f.t * 10) * 8, -40 - 80 * arms, 12, C);
    }
    ell(g, 0, -22, 50, 40, this.youShirt ?? C);
    if (this.youShirt) {
      g.fillStyle = '#fff';
      g.font = '900 13px system-ui';
      g.textAlign = 'center';
      g.fillText('WILD FREQ', 0, -14);
    }
    if (this.youExtra === 'necklace') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = NEON[Math.floor(f.t * 2) % NEON.length];
      g.lineWidth = 4;
      g.beginPath();
      g.arc(0, -56, 26, 0.2, Math.PI - 0.2);
      g.stroke();
      g.restore();
    }
    if (opts.lighter) {
      limb(g, 30, -40, 46, -110, 12, C);
      this.lighter(g, f, 46, -118);
    }
    if (this.youExtra === 'paw') {
      limb(g, -30, -40, -52, -128, 12, C);
      ell(g, -56, -150, 18, 24, '#ff2e63');
      g.fillStyle = '#fff';
      g.font = '900 11px system-ui';
      g.textAlign = 'center';
      g.fillText('#1', -56, -146);
    }
    // capybara: boxy head, tiny ears, unbothered expression
    rr(g, -34, -122, 68, 62, 24, C);
    circ(g, -24, -120, 7, '#7a5233');
    circ(g, 24, -120, 7, '#7a5233');
    rr(g, -24, -88, 48, 30, 14, '#8a5c38');
    eye(g, -15, -102, 4.5, opts.eyes ?? 0.55, 0, 0, '#1a0f08');
    eye(g, 15, -102, 4.5, opts.eyes ?? 0.55, 0, 0, '#1a0f08');
    if (f.sunglasses) sunglasses(g, 0, -102, 44);
    ell(g, -7, -82, 3, 2, '#3a2416');
    ell(g, 7, -82, 3, 2, '#3a2416');
    const m = opts.mouth ?? 0;
    if (m > 0.05) ell(g, 0, -68, 6, 3 + m * 9, '#3a0f22');
    // hats
    if (this.youHat === 'ears') {
      for (const sd of [-1, 1]) poly(g, [sd * 8, -120, sd * 30, -150, sd * 32, -116], '#5b1a7a');
      rr(g, -32, -126, 64, 8, 4, '#5b1a7a');
    } else if (this.youHat === 'crown') {
      poly(g, [-22, -118, -22, -140, -11, -128, 0, -146, 11, -128, 22, -140, 22, -118], '#ffd23f');
      circ(g, 0, -138, 3, '#ff2e63');
    } else if (this.youHat === 'bucket') {
      ell(g, 0, -118, 44, 9, '#2ec4b6');
      rr(g, -28, -144, 56, 28, 10, '#2ec4b6');
    }
    g.strokeStyle = rgba(rim, 0.6);
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, -100, 34, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }

  /** Click on your capybara to stage-dive (only while a song is playing). */
  hitYou(cx: number, cy: number): boolean {
    return this.dive.state === 'none' && Math.abs(cx - 800) < 60 && cy > 740 && cy < 905;
  }

  startDive() {
    if (this.dive.state === 'none') this.dive = { state: 'climbing', t: 0, x: 800 };
  }

  get diveState() {
    return this.dive.state;
  }

  private updateDive(dt: number) {
    const d = this.dive;
    if (d.state === 'none') return;
    d.t += dt;
    if (d.state === 'climbing' && d.t > 1.2) this.dive = { state: 'stage', t: 0, x: 640 };
    else if (d.state === 'stage' && d.t > 9) this.dive = { state: 'surfing', t: 0, x: 640 };
    else if (d.state === 'surfing') {
      d.x += dt * 170;
      if (d.x > 1680) {
        this.dive = { state: 'none', t: 0, x: 800 };
        this.onDiveDone?.();
      }
    }
  }

  /** Stage layer: you, dancing next to the band. */
  drawYouOnStage(g: G, f: Frame) {
    if (this.dive.state !== 'stage') return;
    const bob = Math.pow(1 - f.phase, 2) * 14;
    g.save();
    g.translate(640, 652 - bob);
    g.rotate(Math.sin(f.beat * Math.PI) * 0.15);
    g.scale(0.85, 0.85);
    this.capy(g, f, '#ffe066', { arms: 1, mouth: 0.7, eyes: 1 });
    g.restore();
    g.fillStyle = '#ffe066';
    g.font = '900 16px "Trebuchet MS", system-ui';
    g.textAlign = 'center';
    g.fillText('YOU (on stage!!)', 640, 530 - bob);
  }

  private drawYou(g: G, f: Frame, rim: string, portrait = false) {
    const d = this.dive;
    if (!portrait && d.state === 'stage') return;
    if (!portrait && d.state === 'climbing') {
      const u = Math.min(1, d.t / 1.2);
      g.save();
      g.translate(800 - 140 * u, 900 - 210 * u - Math.sin(u * Math.PI) * 60);
      g.scale(1.15 - 0.4 * u, 1.15 - 0.4 * u);
      this.capy(g, f, rim, { arms: 1, eyes: 1 });
      g.restore();
      return;
    }
    if (!portrait && d.state === 'surfing') {
      g.save();
      g.translate(d.x, 700 + Math.sin(d.t * 6) * 10);
      g.rotate(-Math.PI / 2 + Math.sin(d.t * 3) * 0.2);
      g.scale(0.8, 0.8);
      this.capy(g, f, rim, { arms: 1, eyes: 1, mouth: 0.8 });
      g.restore();
      g.fillStyle = '#ffe066';
      g.font = '900 15px system-ui';
      g.textAlign = 'center';
      g.fillText('YOU (surfing)', d.x, 640);
      return;
    }
    const x = 800;
    const y = 900;
    const bob = (f.reduceMotion ? 0.3 : 1) * Math.pow(1 - f.phase, 2) * 9 * (f.playing ? 1 : 0.2) + this.youWave * 30;
    g.save();
    g.translate(x, y - bob);
    g.scale(1.15, 1.15);
    this.capy(g, f, rim, {
      arms: portrait ? 1 : this.youWave > 0.2 ? 1 : 0,
      eyes: portrait ? 1 : 0.55,
      mouth: Math.max(this.youSinging, portrait ? 0.6 : 0),
      lighter: this.youLighter && !portrait,
    });
    g.restore();
    if (portrait) return;
    // label
    g.fillStyle = '#ffe066';
    g.font = '900 16px "Trebuchet MS", system-ui';
    g.textAlign = 'center';
    const ly = y - 172 - bob;
    g.fillText(this.youNote ? `YOU ♪ ${this.youNote}` : 'YOU', x, ly);
    poly(g, [x - 7, ly + 6, x + 7, ly + 6, x, ly + 14], '#ffe066');
  }

  private drawSurfer(g: G, f: Frame) {
    const sf = this.surfer!;
    const heavy = sf.kind === 'bear';
    const y = (heavy ? 705 : 690) + Math.sin(sf.t * (heavy ? 4 : 7)) * (heavy ? 8 : 14);
    g.save();
    g.translate(sf.x, y);
    g.rotate(Math.sin(sf.t * 3) * 0.4 - 0.2);
    if (sf.kind === 'frog') {
      ell(g, 0, 0, 22, 12, '#5ccf4a');
      ell(g, -10, -10, 7, 7, '#5ccf4a');
      ell(g, 10, -10, 7, 7, '#5ccf4a');
      eye(g, -10, -11, 4, 1, 0.3, -0.2, '#111');
      eye(g, 10, -11, 4, 1, 0.3, -0.2, '#111');
      if (f.sunglasses) sunglasses(g, 0, -11, 26);
      limb(g, -18, 4, -34, -8 + Math.sin(sf.t * 10) * 6, 4, '#5ccf4a');
      limb(g, 18, 4, 34, -8 - Math.sin(sf.t * 10) * 6, 4, '#5ccf4a');
    } else if (sf.kind === 'hedgehog') {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        poly(g, [Math.cos(a) * 18, Math.sin(a) * 12, Math.cos(a) * 32, Math.sin(a) * 26, Math.cos(a + 0.25) * 18, Math.sin(a + 0.25) * 12], '#3e2c22');
      }
      ell(g, 0, 0, 24, 14, '#7b5d48');
      ell(g, 18, 2, 9, 8, '#e8cfae');
      eye(g, 18, 0, 3, 1.2, 0, 0, '#111');
    } else {
      // an entire bear, lying flat, arms out, perfectly at peace
      ell(g, 0, 0, 60, 26, '#5b3e2a');
      ell(g, 0, 4, 34, 16, '#a07a58');
      limb(g, -40, -6, -78, -28 + Math.sin(sf.t * 5) * 6, 14, '#5b3e2a');
      limb(g, 40, -6, 78, -28 - Math.sin(sf.t * 5) * 6, 14, '#5b3e2a');
      circ(g, 62, -18, 22, '#5b3e2a');
      circ(g, 52, -36, 8, '#5b3e2a');
      circ(g, 74, -36, 8, '#5b3e2a');
      eye(g, 56, -20, 3.5, 0.1, 0, 0, '#111');
      eye(g, 68, -20, 3.5, 0.1, 0, 0, '#111');
      if (f.sunglasses) sunglasses(g, 62, -20, 30);
    }
    g.restore();
    g.fillStyle = '#fff';
    g.font = 'bold 13px system-ui';
    g.textAlign = 'center';
    g.fillText(SURFER_LINES[sf.kind], sf.x, y - (heavy ? 64 : 32));
  }
}
