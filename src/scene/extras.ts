// Scenery for the extra show moments: the opening-act mice, rain (with
// splashes and puddle reflections), the merch stand, and afterparty props.

import { bubble, circ, ell, eye, limb, poly, rgba, rr, type G } from './draw';
import type { Frame } from './characters/base';

// ------------------------------------------------------------------ The Crumbs

export class Mice {
  private mouth = [0, 0];
  private t = 0;
  private say: { text: string; t: number } | null = null;

  sing(durSec: number) {
    this.mouth = [Math.min(1, 0.6 + durSec), Math.min(1, 0.4 + durSec)];
  }

  speak(text: string) {
    this.say = { text, t: 2.5 };
  }

  update(f: Frame) {
    this.t += f.dt;
    this.mouth = this.mouth.map((m) => Math.max(0, m - f.dt * 3));
    if (this.say && (this.say.t -= f.dt) <= 0) this.say = null;
  }

  draw(g: G, f: Frame) {
    const shake = Math.sin(this.t * 40) * 1.2; // nervous knees
    [[700, '#cfc6d8', 'Brie'], [900, '#e8d8b8', 'Cheddar']].forEach(([x, col, name], i) => {
      const bob = Math.pow(1 - f.phase, 2) * 5;
      g.save();
      g.translate((x as number) + shake * (i ? -1 : 1), 652 - bob);
      // tiny mic stand
      limb(g, 34, 0, 34, -70, 3, '#bbb');
      ell(g, 34, -74, 4, 6, '#333');
      // tail, body, feet
      g.strokeStyle = '#e7a3b5';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-14, -12);
      g.quadraticCurveTo(-40, -6, -36, -30 + Math.sin(this.t * 3) * 6);
      g.stroke();
      ell(g, -8, -2, 8, 4, '#e7a3b5');
      ell(g, 8, -2, 8, 4, '#e7a3b5');
      ell(g, 0, -28, 18, 26, col as string);
      // instrument: ukulele (Brie) / shaker (Cheddar)
      if (i === 0) {
        ell(g, 4, -26, 11, 8, '#c47a2c');
        limb(g, 4, -26, -26, -46, 3, '#8a5524');
        limb(g, 12, -36, 4, -24 + Math.sin(this.t * 14) * 3, 4, col as string);
      } else {
        const sh = Math.sin(this.t * 16) * 6;
        limb(g, 14, -38, 22 + sh, -54, 4, col as string);
        ell(g, 24 + sh, -58, 6, 4, '#ff7ab6');
      }
      // head: big ears, nervous eyes, sweat drop
      circ(g, -14, -68, 12, col as string);
      circ(g, 14, -68, 12, col as string);
      circ(g, -14, -68, 7, '#f2b8c6');
      circ(g, 14, -68, 7, '#f2b8c6');
      ell(g, 0, -56, 15, 13, col as string);
      eye(g, -6, -58, 3.5, 1.2, 0.2, -0.3, '#111');
      eye(g, 6, -58, 3.5, 1.2, 0.2, -0.3, '#111');
      circ(g, 0, -50, 2.5, '#e7738a');
      if (this.mouth[i] > 0.05) ell(g, 0, -45, 3, 1 + this.mouth[i] * 3, '#3a0f22');
      if (Math.sin(this.t * 1.3 + i) > 0.3) ell(g, 16, -64 + ((this.t * 20) % 10), 2.5, 4, '#9ad5ff');
      g.restore();
      g.fillStyle = '#fff';
      g.font = 'bold 12px system-ui';
      g.textAlign = 'center';
      g.fillText(name as string, x as number, 672);
    });
    // the merch: one (1) cracker on a stool
    rr(g, 790, 630, 20, 22, 2, '#5a3b25');
    rr(g, 786, 624, 28, 8, 2, '#e8c27a');
    if (this.say) bubble(g, 800, 560, this.say.text, Math.min(1, this.say.t * 3));
  }
}

// ------------------------------------------------------------------ weather

interface Drop { x: number; y: number; v: number; l: number }

export class Rain {
  private drops: Drop[] = [];
  private splashes: { x: number; y: number; t: number }[] = [];
  amount = 0; // 0..1, eases in/out

  constructor(private lowQuality: boolean) {
    const n = lowQuality ? 140 : 380;
    for (let i = 0; i < n; i++) this.drops.push(this.spawn(Math.random() * 1000 - 100));
  }

  private spawn(y = -60): Drop {
    return { x: Math.random() * 1800 - 100, y, v: 900 + Math.random() * 500, l: 14 + Math.random() * 16 };
  }

  update(f: Frame, raining: boolean) {
    this.amount += ((raining ? 1 : 0) - this.amount) * Math.min(1, f.dt * 0.6);
    if (this.amount < 0.01) return;
    for (const d of this.drops) {
      d.y += d.v * f.dt;
      d.x -= d.v * 0.12 * f.dt;
      if (d.y > 1000) Object.assign(d, this.spawn());
      // splash on the stage floor
      if (d.y > 600 && d.y < 670 && d.x > 120 && d.x < 1480 && Math.random() < (this.lowQuality ? 0.01 : 0.03)) {
        this.splashes.push({ x: d.x, y: d.y, t: 0.25 });
        Object.assign(d, this.spawn());
      }
    }
    for (const s of this.splashes) s.t -= f.dt;
    this.splashes = this.splashes.filter((s) => s.t > 0);
  }

  /** Wet stage: puddle reflections of the lights + splashes (stage layer). */
  drawStage(g: G, f: Frame) {
    if (this.amount < 0.01) return;
    g.save();
    g.globalCompositeOperation = 'lighter';
    const pal = f.palette.length ? f.palette : ['#7b2cff'];
    for (let i = 0; i < 6; i++) {
      const x = 250 + i * 220 + Math.sin(f.t * 0.7 + i) * 20;
      const gr = g.createLinearGradient(x, 600, x, 668);
      gr.addColorStop(0, rgba(pal[i % pal.length], 0.0));
      gr.addColorStop(0.5, rgba(pal[i % pal.length], 0.28 * this.amount));
      gr.addColorStop(1, rgba(pal[i % pal.length], 0.05 * this.amount));
      g.fillStyle = gr;
      g.fillRect(x - 40 - Math.sin(f.t * 3 + i) * 6, 600, 80, 68);
    }
    g.restore();
    g.strokeStyle = `rgba(200,220,255,${0.6 * this.amount})`;
    g.lineWidth = 1.5;
    for (const s of this.splashes) {
      const r = (0.25 - s.t) * 60;
      g.beginPath();
      g.ellipse(s.x, s.y, r, r * 0.3, 0, Math.PI, 2 * Math.PI);
      g.stroke();
    }
  }

  /** The rain itself, in front of everything (crowd layer). */
  drawFront(g: G) {
    if (this.amount < 0.01) return;
    g.strokeStyle = `rgba(190,210,255,${0.35 * this.amount})`;
    g.lineWidth = 1.4;
    g.beginPath();
    for (const d of this.drops) {
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + d.l * 0.12, d.y - d.l);
    }
    g.stroke();
  }
}

// ------------------------------------------------------------------ merch stand (crowd layer)

export const MERCH_RECT = { x: 1440, y: 600, w: 160, h: 150 };

export function drawMerchStand(g: G, f: Frame, highlight: boolean) {
  const { x, y, w, h } = MERCH_RECT;
  // awning
  for (let i = 0; i < 6; i++) rr(g, x + (i * w) / 6, y, w / 6, 24, 0, i % 2 ? '#ff2e63' : '#fff6d8');
  rr(g, x, y + 24, w, 8, 0, '#3a1c44');
  g.fillStyle = '#ffe066';
  g.font = '900 15px "Arial Black", system-ui';
  g.textAlign = 'center';
  g.fillText('MERCH', x + w / 2, y + 52);
  g.font = 'bold 10px system-ui';
  g.fillStyle = '#fff';
  g.fillText('& POND WATER', x + w / 2, y + 66);
  // shirts hanging on a line
  limb(g, x + 8, y + 74, x + w - 8, y + 74, 2, '#ccc');
  ['#ff2e63', '#7b2cff', '#00b4ff', '#ffe600'].forEach((c, i) => {
    const sx = x + 22 + i * 36;
    const sw = Math.sin(f.t * 2 + i) * 2;
    poly(g, [sx - 12, y + 76, sx - 4, y + 74, sx + 4, y + 74, sx + 12, y + 76, sx + 16 + sw, y + 86, sx + 9, y + 88, sx + 9, y + 100, sx - 9, y + 100, sx - 9, y + 88, sx - 16 + sw, y + 86], c);
  });
  // the badger, behind the counter
  ell(g, x + w / 2, y + 122, 26, 20, '#3d3a3f');
  ell(g, x + w / 2, y + 112, 9, 18, '#f2f2f2');
  eye(g, x + w / 2 - 10, y + 110, 3, 1, 0, 0, '#111');
  eye(g, x + w / 2 + 10, y + 110, 3, 1, 0, 0, '#111');
  rr(g, x, y + 126, w, h - 126, 3, '#5a3b25');
  if (highlight) {
    g.strokeStyle = `rgba(255,224,102,${0.5 + Math.sin(f.t * 5) * 0.4})`;
    g.lineWidth = 3;
    g.strokeRect(x - 3, y - 3, w + 6, h + 6);
  }
}

export function hitMerch(cx: number, cy: number): boolean {
  const { x, y, w, h } = MERCH_RECT;
  return cx > x && cx < x + w && cy > y && cy < y + h;
}

// ------------------------------------------------------------------ afterparty props (stage layer)

export function drawAfterparty(g: G, f: Frame) {
  // warm house lights
  const gl = g.createRadialGradient(800, 560, 50, 800, 560, 700);
  gl.addColorStop(0, 'rgba(255,190,120,0.18)');
  gl.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gl;
  g.fillRect(0, 100, 1600, 700);
  // Octavia's autograph table + a queue of fans
  rr(g, 905, 610, 120, 12, 3, '#6b4a2a');
  limb(g, 915, 622, 915, 652, 4, '#6b4a2a');
  limb(g, 1015, 622, 1015, 652, 4, '#6b4a2a');
  for (let i = 0; i < 3; i++) {
    const qx = 1050 + i * 46;
    const bob = Math.sin(f.t * 2 + i) * 2;
    ell(g, qx, 630 + bob, 14, 20, ['#55505e', '#8a5a3a', '#4a3324'][i]);
    circ(g, qx, 600 + bob, 12, ['#55505e', '#8a5a3a', '#4a3324'][i]);
    rr(g, qx - 8, 612 + bob, 14, 10, 1, '#fff');
  }
  // paper being signed, eight times
  for (let i = 0; i < 4; i++) rr(g, 920 + i * 26, 600, 18, 12, 1, '#fff');
  // the cat's drink
  rr(g, 800, 560, 14, 18, 3, 'rgba(180,230,255,0.7)');
  limb(g, 808, 560, 814, 544, 2, '#ff4fd8');
  // penguins playing cards
  for (let i = 0; i < 5; i++) rr(g, 270 + i * 12, 640 + (i % 2) * 2, 10, 14, 1, i % 2 ? '#fff' : '#ffd1ec');
  // Greg eating the setlist
  rr(g, 1498, 352 + Math.sin(f.t * 6) * 2, 18, 22, 1, '#fbf6e6');
}
