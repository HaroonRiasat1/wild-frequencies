// The physical stage: floor, risers, truss, speaker stacks, amp walls —
// plus the lighting rig: moving heads, lasers, spotlight and floor pools.

import type { LightCue } from '../songs/types';
import { circ, clamp, ell, limb, rgba, rr, type G } from './draw';
import type { Frame } from './characters/base';

const HEADS = [250, 470, 690, 910, 1130, 1350];

export class StageSet {
  private floorGrad: CanvasGradient | null = null;

  drawBack(g: G, f: Frame) {
    // truss towers + top truss
    this.truss(g, 150, 70, 22, 560, true);
    this.truss(g, 1428, 70, 22, 560, true);
    this.truss(g, 150, 66, 1300, 24, false);

    // amp walls (glowing tubes optional)
    for (let i = 0; i < 3; i++) this.amp(g, 404 + i * 76, 528, 72, 82);
    for (let i = 0; i < 2; i++) this.amp(g, 404 + i * 76 + 38, 446, 72, 82);
    this.amp(g, 980, 520, 110, 90);

    // floor
    if (!this.floorGrad) {
      this.floorGrad = g.createLinearGradient(0, 600, 0, 670);
      this.floorGrad.addColorStop(0, '#1d1230');
      this.floorGrad.addColorStop(1, '#2c1b44');
    }
    g.fillStyle = this.floorGrad;
    g.beginPath();
    g.moveTo(120, 600);
    g.lineTo(1480, 600);
    g.lineTo(1560, 668);
    g.lineTo(40, 668);
    g.closePath();
    g.fill();
    // floor planks
    g.strokeStyle = 'rgba(255,255,255,0.04)';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const y = 604 + i * 11;
      g.beginPath();
      g.moveTo(120 - i * 13, y);
      g.lineTo(1480 + i * 13, y);
      g.stroke();
    }

    // drum riser with neon sign
    rr(g, 680, 452, 240, 156, 4, '#160c26');
    rr(g, 676, 446, 248, 10, 3, '#2f1d4a');
    const neon = 0.6 + Math.pow(1 - f.phase, 2) * 0.4 * (f.playing ? 1 : 0.2);
    g.save();
    g.font = '900 22px "Arial Black", "Trebuchet MS", system-ui';
    g.textAlign = 'center';
    g.fillStyle = rgba('#ff4fd8', neon);
    g.fillText('WILD', 800, 560);
    g.fillStyle = rgba('#00e0c6', neon);
    g.fillText('FREQUENCIES', 800, 588);
    g.restore();

    // owl riser
    rr(g, 1150, 560, 228, 48, 4, '#160c26');
    rr(g, 1146, 554, 236, 8, 3, '#2f1d4a');
  }

  drawFront(g: G, f: Frame) {
    // stage lip with LED strip
    rr(g, 40, 668, 1520, 38, 2, '#0c0716');
    const n = 48;
    for (let i = 0; i < n; i++) {
      const col = f.palette[(i + Math.floor(f.beat)) % Math.max(1, f.palette.length)] ?? '#ff4fd8';
      const on = f.playing ? 0.35 + 0.65 * Math.pow(1 - f.phase, 2) * ((i + Math.floor(f.beat)) % 3 === 0 ? 1 : 0.4) : 0.2;
      rr(g, 52 + i * 31.4, 680, 22, 6, 2, rgba(col, on));
    }
    // speaker stacks
    this.speakerStack(g, 8, 432, f);
    this.speakerStack(g, 1458, 432, f);
    // monitor wedges
    for (const x of [300, 560, 760, 1040]) {
      g.fillStyle = '#120a1e';
      g.beginPath();
      g.moveTo(x - 40, 668);
      g.lineTo(x - 30, 646);
      g.lineTo(x + 30, 646);
      g.lineTo(x + 40, 668);
      g.fill();
      ell(g, x, 658, 14, 6, '#24163a');
    }
  }

  private truss(g: G, x: number, y: number, w: number, h: number, vertical: boolean) {
    g.strokeStyle = '#6f6a7d';
    g.lineWidth = 2.5;
    g.strokeRect(x, y, w, h);
    g.lineWidth = 1.5;
    g.beginPath();
    if (vertical) {
      for (let yy = y; yy < y + h; yy += w) {
        g.moveTo(x, yy);
        g.lineTo(x + w, yy + w);
      }
    } else {
      for (let xx = x; xx < x + w; xx += h) {
        g.moveTo(xx, y);
        g.lineTo(xx + h, y + h);
      }
    }
    g.stroke();
  }

  private amp(g: G, x: number, y: number, w: number, h: number) {
    rr(g, x, y, w, h, 4, '#151018');
    rr(g, x + 4, y + 4, w - 8, 12, 2, '#2a2230');
    rr(g, x + 6, y + 20, w - 12, h - 26, 3, '#3a2f2a');
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(x + 6, y + 24 + i * ((h - 30) / 6));
      g.lineTo(x + w - 6, y + 24 + i * ((h - 30) / 6));
      g.stroke();
    }
    g.fillStyle = '#e8d9b5';
    g.font = 'italic bold 8px serif';
    g.fillText('Howlmaster', x + 8, y + 13);
  }

  private speakerStack(g: G, x: number, y: number, f: Frame) {
    const thump = f.energy.bass * 4;
    for (let i = 0; i < 3; i++) {
      const cy = y + i * 78;
      rr(g, x, cy, 134, 76, 4, '#0f0b14');
      for (const cx of [x + 36, x + 98]) {
        circ(g, cx, cy + 40, 26 + (i === 2 ? thump : thump * 0.5), '#221a2c');
        circ(g, cx, cy + 40, 10, '#3b2f48');
      }
      circ(g, x + 67, cy + 14, 6, '#2b2236');
    }
  }
}

// ------------------------------------------------------------------ lights

export class Lights {
  private angles = HEADS.map(() => Math.PI / 2);
  private strobeT = 0;
  spotX = 800;
  spotY = 650;
  spotOn = 0;

  strobeHit() {
    this.strobeT = 1;
  }

  update(f: Frame, cue: LightCue | null, soloPos: { x: number; y: number } | null) {
    const mv = cue?.movement ?? 'still';
    const speed = f.reduceMotion ? 0.3 : 1;
    HEADS.forEach((_, i) => {
      let target = Math.PI / 2 + (i < 3 ? 0.18 : -0.18);
      if (mv === 'sweep') target = Math.PI / 2 + Math.sin(f.t * 0.9 * speed + i * 0.9) * 0.55;
      if (mv === 'chase' || mv === 'strobe') target = Math.PI / 2 + ((Math.floor(f.beat) + i) % 2 ? 0.45 : -0.45);
      if (mv === 'pulse') target = Math.PI / 2 + Math.sin(i * 1.3) * 0.3;
      if (!f.playing) target = Math.PI / 2 + Math.sin(f.t * 0.3 + i) * 0.25;
      this.angles[i] += (target - this.angles[i]) * Math.min(1, f.dt * (mv === 'chase' ? 9 : 3) * speed);
    });
    this.strobeT = Math.max(0, this.strobeT - f.dt * 12);
    if (soloPos) {
      this.spotX += (soloPos.x - this.spotX) * Math.min(1, f.dt * 4);
      this.spotY += (soloPos.y - this.spotY) * Math.min(1, f.dt * 4);
    }
    this.spotOn += ((soloPos ? 1 : 0) - this.spotOn) * Math.min(1, f.dt * 3);
  }

  /** Beams, floor pools — drawn additively over the band. */
  drawBeams(g: G, f: Frame, cue: LightCue | null) {
    const mv = cue?.movement ?? 'still';
    const pal = f.palette.length ? f.palette : ['#7b2cff'];
    const base = f.playing ? 0.18 + f.intensity * 0.22 : 0.08;
    g.save();
    g.globalCompositeOperation = 'lighter';
    HEADS.forEach((hx, i) => {
      let a = base;
      if (mv === 'pulse') a *= 0.5 + Math.pow(1 - f.phase, 2) * 1.2;
      if (mv === 'chase') a *= (Math.floor(f.beat) % HEADS.length) === i ? 1.8 : 0.5;
      a *= 0.8 + f.energy.bass * 0.6;
      const col = pal[(i + Math.floor(f.beat / 4)) % pal.length];
      const ang = this.angles[i];
      const len = 640;
      const spread = 0.13;
      const hy = 92;
      const x1 = hx + Math.cos(ang - spread) * len;
      const y1 = hy + Math.sin(ang - spread) * len;
      const x2 = hx + Math.cos(ang + spread) * len;
      const y2 = hy + Math.sin(ang + spread) * len;
      const gr = g.createLinearGradient(hx, hy, (x1 + x2) / 2, (y1 + y2) / 2);
      gr.addColorStop(0, rgba(col, clamp(a * 1.6)));
      gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(hx, hy);
      g.lineTo(x1, y1);
      g.lineTo(x2, y2);
      g.closePath();
      g.fill();
      // floor pool
      const fx = hx + Math.cos(ang) * ((640 - hy) / Math.max(0.2, Math.sin(ang)));
      const pool = g.createRadialGradient(fx, 640, 0, fx, 640, 120);
      pool.addColorStop(0, rgba(col, clamp(a * 0.9)));
      pool.addColorStop(1, rgba(col, 0));
      g.fillStyle = pool;
      g.fillRect(fx - 120, 590, 240, 100);
    });

    // spotlight on the soloist
    if (this.spotOn > 0.02) {
      const sx = this.spotX;
      const sy = this.spotY;
      const gr = g.createLinearGradient(sx, -40, sx, sy);
      gr.addColorStop(0, `rgba(255,250,225,${0.05 * this.spotOn})`);
      gr.addColorStop(1, `rgba(255,250,225,${0.28 * this.spotOn})`);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(sx - 14, -40);
      g.lineTo(sx + 14, -40);
      g.lineTo(sx + 95, sy);
      g.lineTo(sx - 95, sy);
      g.closePath();
      g.fill();
      ell(g, sx, sy, 100, 20, `rgba(255,250,225,${0.3 * this.spotOn})`);
    }

    // lasers
    if (cue?.lasers && f.playing && !f.lowQuality) {
      const n = 7;
      for (const [ox, col] of [[430, '#3dff7a'], [1170, '#ff3df2']] as const) {
        for (let i = 0; i < n; i++) {
          const ang = Math.PI / 2 + (i - (n - 1) / 2) * 0.16 + Math.sin(f.t * 1.4 + (ox > 800 ? 1.5 : 0)) * 0.5;
          const ex = ox + Math.cos(ang) * 900;
          const ey = 410 + Math.sin(ang) * 900;
          limb(g, ox, 410, ex, ey, 1.6, rgba(col, 0.55));
          limb(g, ox, 410, ex, ey, 5, rgba(col, 0.12));
        }
        circ(g, ox, 410, 5, rgba(col, 0.9));
      }
    }

    // moving-head fixtures
    g.globalCompositeOperation = 'source-over';
    HEADS.forEach((hx, i) => {
      rr(g, hx - 14, 86, 28, 14, 3, '#24202c');
      g.save();
      g.translate(hx, 98);
      g.rotate(this.angles[i] - Math.PI / 2);
      rr(g, -9, 0, 18, 18, 4, '#3a3446');
      circ(g, 0, 17, 6, rgba(pal[i % pal.length], f.playing ? 0.95 : 0.4));
      g.restore();
    });
    g.restore();
  }

  /** Full-screen strobe flash (only if the user enabled strobe). */
  drawStrobe(g: G, w: number, h: number) {
    if (this.strobeT <= 0) return;
    g.fillStyle = `rgba(255,255,255,${this.strobeT * 0.55})`;
    g.fillRect(0, 0, w, h);
  }
}
