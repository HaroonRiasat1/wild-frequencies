// The crowd: raccoons, deer, hedgehogs and bears, bobbing to the beat, arms up
// on choruses, phones/lighters in the ballad, and a tiny frog crowd-surfing on drops.
// Front and centre: YOU, a capybara.

import { circ, ell, eye, limb, poly, rgba, rr, sunglasses, type G } from './draw';
import type { Frame } from './characters/base';

type Kind = 'raccoon' | 'deer' | 'hedgehog' | 'bear';
interface Fan {
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
}

const COLORS: Record<Kind, string[]> = {
  raccoon: ['#55505e', '#6a6474'],
  deer: ['#8a5a3a', '#9c6a44'],
  hedgehog: ['#6b5040', '#7b5d48'],
  bear: ['#4a3324', '#5b3e2a'],
};
const KINDS: Kind[] = ['raccoon', 'deer', 'hedgehog', 'bear'];

export class Crowd {
  fans: Fan[] = [];
  private frog: { x: number; t: number } | null = null;
  youSinging = 0;
  youLighter = false;
  youNote: string | null = null;

  constructor(lowQuality: boolean) {
    const rows = lowQuality ? [{ y: 770, n: 9, s: 0.8 }, { y: 860, n: 7, s: 1.05 }] : [
      { y: 742, n: 14, s: 0.68 },
      { y: 800, n: 12, s: 0.85 },
      { y: 870, n: 10, s: 1.08 },
    ];
    rows.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        const x = (i + 0.5 + (ri % 2) * 0.4) * (1600 / r.n) + (Math.random() - 0.5) * 30;
        if (ri === rows.length - 1 && Math.abs(x - 800) < 110) continue; // space for YOU
        const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
        this.fans.push({
          kind, x, y: r.y + (Math.random() - 0.5) * 14, s: r.s * (0.9 + Math.random() * 0.2), ph: Math.random() * 0.25,
          amp: 0.6 + Math.random() * 0.6, arms: 0, hold: 'none', jump: 0, col: COLORS[kind][Math.floor(Math.random() * 2)],
        });
      }
    });
  }

  surfFrog() {
    if (!this.frog) this.frog = { x: -60, t: 0 };
  }

  cheer() {
    for (const f of this.fans) f.jump = 0.6 + Math.random() * 0.4;
  }

  /** Tap the crowd in lighter mode: the nearest fan raises a lighter. */
  raiseLighter(wx: number, wy: number): boolean {
    let best: Fan | null = null;
    let bd = 1e9;
    for (const f of this.fans) {
      const d = Math.hypot(f.x - wx, f.y - 50 * f.s - wy);
      if (d < bd) { bd = d; best = f; }
    }
    if (best && bd < 120) {
      best.hold = 'lighter';
      return true;
    }
    return false;
  }

  balladMode(on: boolean) {
    for (const f of this.fans) {
      if (on && f.hold === 'none' && Math.random() < 0.35) f.hold = Math.random() < 0.6 ? 'phone' : 'lighter';
      if (!on && Math.random() < 0.85) f.hold = 'none';
    }
  }

  update(f: Frame, armsTarget: number) {
    for (const fan of this.fans) {
      const want = armsTarget * (fan.amp > 0.9 ? 1 : 0.7);
      fan.arms += (want - fan.arms) * Math.min(1, f.dt * 3);
      fan.jump = Math.max(0, fan.jump - f.dt * 1.4);
    }
    if (this.frog) {
      this.frog.t += f.dt;
      this.frog.x += f.dt * 190;
      if (this.frog.x > 1700) this.frog = null;
    }
  }

  draw(g: G, f: Frame) {
    const rim = f.palette[Math.floor(f.beat / 4) % Math.max(1, f.palette.length)] ?? '#7b2cff';
    const energy = f.playing ? 0.4 + f.intensity * 0.6 + f.hype * 0.4 : 0.15;
    for (const fan of this.fans) {
      const ph = (f.phase + fan.ph) % 1;
      const bob = (f.reduceMotion ? 0.3 : 1) * Math.pow(1 - ph, 2) * 10 * fan.amp * energy + Math.sin(fan.jump * Math.PI) * 30 * fan.jump;
      this.fan(g, f, fan, bob, rim);
    }
    this.drawYou(g, f, rim);
    if (this.frog) this.drawFrog(g, f);
  }

  private fan(g: G, f: Frame, fan: Fan, bob: number, rim: string) {
    g.save();
    g.translate(fan.x, fan.y - bob);
    g.scale(fan.s, fan.s);
    const c = fan.col;
    // arms (raised + waving)
    const wave = Math.sin(f.t * 5 + fan.x) * 0.3;
    for (const sd of [-1, 1]) {
      const up = fan.arms;
      const hx = sd * (34 + up * (8 + wave * 22));
      const hy = -up * 128;
      limb(g, sd * 26, -40, hx, hy, 11, c);
      if (up > 0.3) circ(g, hx, hy, 7, c);
    }
    // body + head
    ell(g, 0, -20, 42, 38, c);
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
    if (fan.hold !== 'none') {
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

  private drawYou(g: G, f: Frame, rim: string) {
    const x = 800;
    const y = 900;
    const bob = (f.reduceMotion ? 0.3 : 1) * Math.pow(1 - f.phase, 2) * 9 * (f.playing ? 1 : 0.2);
    g.save();
    g.translate(x, y - bob);
    g.scale(1.15, 1.15);
    const C = '#9b6b43';
    ell(g, 0, -22, 50, 40, C);
    if (this.youLighter) {
      limb(g, 30, -40, 46, -110, 12, C);
      this.lighter(g, f, 46, -118);
    }
    // capybara: boxy head, tiny ears, unbothered expression
    rr(g, -34, -122, 68, 62, 24, C);
    circ(g, -24, -120, 7, '#7a5233');
    circ(g, 24, -120, 7, '#7a5233');
    rr(g, -24, -88, 48, 30, 14, '#8a5c38');
    eye(g, -15, -102, 4.5, 0.55, 0, 0, '#1a0f08');
    eye(g, 15, -102, 4.5, 0.55, 0, 0, '#1a0f08');
    if (f.sunglasses) sunglasses(g, 0, -102, 44);
    ell(g, -7, -82, 3, 2, '#3a2416');
    ell(g, 7, -82, 3, 2, '#3a2416');
    if (this.youSinging > 0.05) ell(g, 0, -68, 6, 3 + this.youSinging * 9, '#3a0f22');
    g.strokeStyle = rgba(rim, 0.6);
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, -100, 34, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
    g.restore();
    // label
    g.fillStyle = '#ffe066';
    g.font = '900 16px "Trebuchet MS", system-ui';
    g.textAlign = 'center';
    const ly = y - 172 - bob;
    g.fillText(this.youNote ? `YOU ♪ ${this.youNote}` : 'YOU', x, ly);
    poly(g, [x - 7, ly + 6, x + 7, ly + 6, x, ly + 14], '#ffe066');
  }

  private drawFrog(g: G, f: Frame) {
    const fr = this.frog!;
    const y = 690 + Math.sin(fr.t * 7) * 14;
    g.save();
    g.translate(fr.x, y);
    g.rotate(Math.sin(fr.t * 3) * 0.5 - 0.2);
    ell(g, 0, 0, 22, 12, '#5ccf4a');
    ell(g, -10, -10, 7, 7, '#5ccf4a');
    ell(g, 10, -10, 7, 7, '#5ccf4a');
    eye(g, -10, -11, 4, 1, 0.3, -0.2, '#111');
    eye(g, 10, -11, 4, 1, 0.3, -0.2, '#111');
    if (f.sunglasses) sunglasses(g, 0, -11, 26);
    limb(g, -18, 4, -34, -8 + Math.sin(fr.t * 10) * 6, 4, '#5ccf4a');
    limb(g, 18, 4, 34, -8 - Math.sin(fr.t * 10) * 6, 4, '#5ccf4a');
    g.strokeStyle = '#2a0f22';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, 8, 0.1, Math.PI - 0.1);
    g.stroke();
    g.restore();
    g.fillStyle = '#fff';
    g.font = 'bold 13px system-ui';
    g.textAlign = 'center';
    g.fillText('wheee', fr.x, y - 32);
  }
}
