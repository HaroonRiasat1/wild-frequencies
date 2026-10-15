// Night sky, twinkling stars (they flash on hi-hats), the moon (who may join
// the band on tambourine), forest silhouettes and fireflies.

import { circ, ell, eye, limb, TAU, type G } from './draw';
import type { Frame } from './characters/base';

interface Star { x: number; y: number; r: number; tw: number; flash: number }
interface Firefly { x: number; y: number; vx: number; vy: number; p: number }

export const MOON = { x: 1350, y: 92, r: 54 };

export class Sky {
  private stars: Star[] = [];
  private flies: Firefly[] = [];
  private trees: { x: number; h: number; w: number; layer: number }[] = [];
  private tambHit = 0;
  private gradient: CanvasGradient | null = null;

  constructor(lowQuality: boolean) {
    const n = lowQuality ? 70 : 160;
    for (let i = 0; i < n; i++) {
      this.stars.push({ x: Math.random() * 1700 - 50, y: Math.random() * 380, r: 0.6 + Math.random() * 1.6, tw: Math.random() * TAU, flash: 0 });
    }
    const fl = lowQuality ? 14 : 36;
    for (let i = 0; i < fl; i++) {
      this.flies.push({ x: Math.random() * 1600, y: 300 + Math.random() * 420, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 14, p: Math.random() * TAU });
    }
    for (let i = 0; i < 26; i++) {
      const left = i < 13;
      const k = i % 13;
      this.trees.push({
        x: left ? -40 + k * 30 + Math.random() * 20 : 1300 + k * 26 + Math.random() * 20,
        h: 200 + Math.random() * 200,
        w: 50 + Math.random() * 40,
        layer: k % 2,
      });
    }
  }

  hat() {
    for (let i = 0; i < 6; i++) {
      const s = this.stars[Math.floor(Math.random() * this.stars.length)];
      s.flash = 1;
    }
  }

  tambourine() {
    this.tambHit = 1;
  }

  update(f: Frame) {
    for (const s of this.stars) s.flash = Math.max(0, s.flash - f.dt * 4);
    this.tambHit = Math.max(0, this.tambHit - f.dt * 6);
    for (const fl of this.flies) {
      fl.p += f.dt;
      fl.vx += (Math.random() - 0.5) * 30 * f.dt;
      fl.vy += (Math.random() - 0.5) * 30 * f.dt;
      fl.vx *= 0.98;
      fl.vy *= 0.98;
      fl.x += fl.vx * f.dt;
      fl.y += fl.vy * f.dt;
      if (fl.x < -20) fl.x = 1620;
      if (fl.x > 1620) fl.x = -20;
      if (fl.y < 250 || fl.y > 760) fl.vy *= -1;
    }
  }

  drawBack(g: G, f: Frame, moonFace: boolean, moonClicks: number) {
    if (!this.gradient) {
      this.gradient = g.createLinearGradient(0, -200, 0, 700);
      this.gradient.addColorStop(0, '#05021a');
      this.gradient.addColorStop(0.55, '#1a0c3d');
      this.gradient.addColorStop(1, '#3b1450');
    }
    g.fillStyle = this.gradient;
    g.fillRect(-400, -300, 2400, 1300);

    for (const s of this.stars) {
      const a = 0.4 + Math.sin(f.t * 2 + s.tw) * 0.25 + s.flash * 0.6;
      circ(g, s.x, s.y, s.r * (1 + s.flash), `rgba(255,255,240,${Math.min(1, a)})`);
    }

    // ---- the moon
    const m = MOON;
    const glow = g.createRadialGradient(m.x, m.y, m.r * 0.6, m.x, m.y, m.r * 2.6);
    glow.addColorStop(0, `rgba(255,244,200,${0.35 + f.energy.bass * 0.2})`);
    glow.addColorStop(1, 'rgba(255,244,200,0)');
    g.fillStyle = glow;
    g.fillRect(m.x - m.r * 3, m.y - m.r * 3, m.r * 6, m.r * 6);
    const wob = moonClicks > 0 && !moonFace ? Math.sin(f.t * 30) * moonClicks * 0.6 : 0;
    circ(g, m.x + wob, m.y, m.r, '#fff4c8');
    circ(g, m.x - 18 + wob, m.y - 14, 9, '#efe0a8');
    circ(g, m.x + 16 + wob, m.y + 18, 12, '#efe0a8');
    circ(g, m.x + 20 + wob, m.y - 20, 5, '#efe0a8');
    if (moonFace) {
      const bob = Math.pow(1 - f.phase, 2) * 4;
      eye(g, m.x - 16, m.y - 6 - bob, 7, f.playing ? 0.9 : 1, 0, 0.4, '#3a2a10');
      eye(g, m.x + 16, m.y - 6 - bob, 7, f.playing ? 0.9 : 1, 0, 0.4, '#3a2a10');
      g.strokeStyle = '#3a2a10';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(m.x, m.y + 12 - bob, 14, 0.2, Math.PI - 0.2);
      g.stroke();
      // tambourine
      const tx = m.x - m.r - 18;
      const ty = m.y + 10 - this.tambHit * 10;
      limb(g, m.x - m.r + 6, m.y + 4, tx + 6, ty, 6, '#fff4c8');
      g.save();
      g.translate(tx, ty);
      g.rotate(-0.3 + this.tambHit * 0.4);
      ell(g, 0, 0, 22, 22, 'rgba(0,0,0,0)');
      g.strokeStyle = '#c47a2c';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(0, 0, 18, 0, TAU);
      g.stroke();
      ell(g, 0, 0, 15, 15, 'rgba(255,250,235,0.85)');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        circ(g, Math.cos(a) * 18, Math.sin(a) * 18, 4, '#e8e0c8');
      }
      g.restore();
    }

    // ---- distant hills + forest silhouettes
    g.fillStyle = '#140a28';
    g.beginPath();
    g.moveTo(-400, 520);
    for (let x = -400; x <= 2000; x += 80) g.lineTo(x, 470 + Math.sin(x * 0.006) * 30);
    g.lineTo(2000, 900);
    g.lineTo(-400, 900);
    g.fill();
    for (const tr of this.trees) {
      g.fillStyle = tr.layer ? '#0d0620' : '#120830';
      const base = 640;
      g.beginPath();
      g.moveTo(tr.x - tr.w / 2, base);
      g.lineTo(tr.x, base - tr.h);
      g.lineTo(tr.x + tr.w / 2, base);
      g.fill();
    }
  }

  drawFireflies(g: G, f: Frame) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const fl of this.flies) {
      const a = Math.max(0, Math.sin(fl.p * 2.2)) * (0.6 + f.energy.high * 0.4);
      if (a < 0.05) continue;
      const gr = g.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 12);
      gr.addColorStop(0, `rgba(230,255,140,${a})`);
      gr.addColorStop(1, 'rgba(230,255,140,0)');
      g.fillStyle = gr;
      g.fillRect(fl.x - 12, fl.y - 12, 24, 24);
    }
    g.restore();
  }

  hitMoon(wx: number, wy: number): boolean {
    return Math.hypot(wx - MOON.x, wy - MOON.y) < MOON.r + 12;
  }
}
