// Fog machine + particle systems: confetti, pyro, ink splats, flying drumsticks.

import { circ, limb, rgba, type G } from './draw';
import type { Frame } from './characters/base';

// ------------------------------------------------------------------ fog

interface Puff { x: number; y: number; r: number; vx: number; a: number; p: number }

export class Fog {
  private puffs: Puff[] = [];
  private sprite: HTMLCanvasElement;
  density = 0.6;
  private shown = 0.6;

  constructor(lowQuality: boolean) {
    const n = lowQuality ? 9 : 24;
    for (let i = 0; i < n; i++) this.puffs.push(this.spawn(Math.random() * 1800 - 100));
    this.sprite = document.createElement('canvas');
    this.sprite.width = this.sprite.height = 128;
    const sg = this.sprite.getContext('2d')!;
    const gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(225,215,255,0.55)');
    gr.addColorStop(0.5, 'rgba(210,200,250,0.22)');
    gr.addColorStop(1, 'rgba(200,190,250,0)');
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 128, 128);
  }

  private spawn(x: number): Puff {
    return { x, y: 600 + Math.random() * 90, r: 90 + Math.random() * 130, vx: 8 + Math.random() * 22, a: 0.3 + Math.random() * 0.5, p: Math.random() * 6 };
  }

  update(f: Frame) {
    this.shown += (this.density - this.shown) * Math.min(1, f.dt * 0.5);
    for (const p of this.puffs) {
      p.x += p.vx * f.dt * (f.reduceMotion ? 0.4 : 1);
      p.p += f.dt * 0.4;
      if (p.x - p.r > 1750) Object.assign(p, this.spawn(-250));
    }
  }

  draw(g: G, f: Frame) {
    const tint = f.palette[0] ?? '#b9a7ff';
    g.save();
    g.globalAlpha = 1;
    for (const p of this.puffs) {
      g.globalAlpha = p.a * this.shown * (0.75 + Math.sin(p.p) * 0.25);
      const r = p.r * (1 + Math.sin(p.p * 0.7) * 0.1);
      g.drawImage(this.sprite, p.x - r, p.y - r * 0.55, r * 2, r * 1.1);
    }
    // a faint coloured haze catching the lights
    g.globalAlpha = 0.12 * this.shown;
    g.fillStyle = rgba(tint, 1);
    g.fillRect(0, 590, 1600, 120);
    g.restore();
  }
}

// ------------------------------------------------------------------ particles

type Kind = 'confetti' | 'spark' | 'ink' | 'stick' | 'flame';
interface P { k: Kind; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; rot: number; vr: number; col: string }

const CONFETTI = ['#ff4fd8', '#00e0c6', '#ffe066', '#7b2cff', '#ff7a1a', '#7cff4f', '#ffffff'];

export class Particles {
  private ps: P[] = [];
  private pyroT = 0;
  constructor(private lowQuality: boolean) {}

  private add(p: Omit<P, 'max'>) {
    if (this.ps.length > (this.lowQuality ? 260 : 900)) return;
    this.ps.push({ ...p, max: p.life });
  }

  confetti(amount: number) {
    const n = Math.floor((this.lowQuality ? 90 : 260) * amount);
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      this.add({
        k: 'confetti', x: fromLeft ? 100 : 1500, y: 640,
        vx: (fromLeft ? 1 : -1) * (150 + Math.random() * 500), vy: -500 - Math.random() * 600,
        life: 4 + Math.random() * 3, size: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
        col: CONFETTI[i % CONFETTI.length],
      });
    }
  }

  pyro() {
    this.pyroT = 1.6;
  }

  ink(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.add({
        k: 'ink', x, y, vx: (Math.random() - 0.5) * 300, vy: -100 - Math.random() * 200,
        life: 1.6 + Math.random(), size: 8 + Math.random() * 14, rot: 0, vr: 0, col: '#24093f',
      });
    }
  }

  stick(x: number, y: number) {
    this.add({ k: 'stick', x, y, vx: (Math.random() - 0.5) * 200, vy: -500 - Math.random() * 200, life: 1.6, size: 26, rot: 0, vr: 18, col: '#f3d9a4' });
  }

  update(f: Frame) {
    const dt = f.dt;
    if (this.pyroT > 0) {
      this.pyroT -= dt;
      const n = this.lowQuality ? 2 : 6;
      for (const x of [90, 1510, 330, 1270]) {
        for (let i = 0; i < n; i++) {
          this.add({ k: 'flame', x: x + (Math.random() - 0.5) * 24, y: 668, vx: (Math.random() - 0.5) * 40, vy: -500 - Math.random() * 400, life: 0.6 + Math.random() * 0.4, size: 14 + Math.random() * 14, rot: 0, vr: 0, col: '#ff8a1a' });
        }
        if (Math.random() < 0.5) this.add({ k: 'spark', x, y: 660, vx: (Math.random() - 0.5) * 300, vy: -700 - Math.random() * 300, life: 1, size: 2.5, rot: 0, vr: 0, col: '#ffe066' });
      }
    }
    for (const p of this.ps) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.k === 'confetti') {
        p.vy += 380 * dt;
        p.vx *= 0.985;
        p.vy = Math.min(p.vy, 120);
        p.vx += Math.sin(p.rot) * 20 * dt;
      } else if (p.k === 'ink' || p.k === 'stick' || p.k === 'spark') {
        p.vy += 700 * dt;
      } else if (p.k === 'flame') {
        p.vy *= 0.96;
      }
    }
    this.ps = this.ps.filter((p) => p.life > 0 && p.y < 1000);
  }

  draw(g: G) {
    for (const p of this.ps) {
      const a = Math.min(1, p.life / Math.min(0.6, p.max));
      if (p.k === 'confetti') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = a;
        g.fillStyle = p.col;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.rot * 1.3)) + 1);
        g.restore();
      } else if (p.k === 'ink') {
        circ(g, p.x, p.y, p.size * (1.2 - a * 0.4), rgba(p.col, a * 0.85));
      } else if (p.k === 'stick') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        limb(g, -p.size / 2, 0, p.size / 2, 0, 4, p.col);
        g.restore();
      }
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of this.ps) {
      if (p.k !== 'flame' && p.k !== 'spark') continue;
      const a = Math.max(0, p.life / p.max);
      if (p.k === 'spark') {
        circ(g, p.x, p.y, p.size, rgba(p.col, a));
        continue;
      }
      const r = p.size * (0.6 + (1 - a));
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, `rgba(255,240,180,${a})`);
      gr.addColorStop(0.4, `rgba(255,120,30,${a * 0.8})`);
      gr.addColorStop(1, 'rgba(255,40,0,0)');
      g.fillStyle = gr;
      g.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    g.restore();
  }
}
