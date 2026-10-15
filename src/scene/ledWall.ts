// The LED wall: a tiny software "shader" rendered per-pixel into a low-res
// buffer, then scaled up with an LED dot mask. Four modes, all audio reactive.

import type { LedMode } from '../songs/types';
import { hexToRgb, type G } from './draw';
import type { Frame } from './characters/base';

export const LED_RECT = { x: 420, y: 112, w: 760, h: 306 };
const LW = 120;
const LH = 48;

export class LedWall {
  private buf: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private img: ImageData;
  private lut = new Uint8ClampedArray(256 * 3);
  private mask: CanvasPattern | null = null;
  private text: { text: string; t: number } | null = null;
  mode: LedMode = 'lava';
  private modeBlend = 1;
  private prevMode: LedMode = 'lava';
  private time = 0;

  constructor() {
    this.buf = document.createElement('canvas');
    this.buf.width = LW;
    this.buf.height = LH;
    this.bctx = this.buf.getContext('2d')!;
    this.img = this.bctx.createImageData(LW, LH);
  }

  setMode(m: LedMode) {
    if (m === this.mode) return;
    this.prevMode = this.mode;
    this.mode = m;
    this.modeBlend = 0;
  }

  showText(text: string, seconds: number) {
    this.text = { text, t: seconds };
  }

  private buildLut(palette: string[], shift: number) {
    const cols = palette.map(hexToRgb);
    for (let i = 0; i < 256; i++) {
      const u = ((i / 256) * cols.length + shift) % cols.length;
      const a = cols[Math.floor(u) % cols.length];
      const b = cols[(Math.floor(u) + 1) % cols.length];
      const k = u - Math.floor(u);
      const s = k * k * (3 - 2 * k);
      this.lut[i * 3] = a[0] + (b[0] - a[0]) * s;
      this.lut[i * 3 + 1] = a[1] + (b[1] - a[1]) * s;
      this.lut[i * 3 + 2] = a[2] + (b[2] - a[2]) * s;
    }
  }

  private field(mode: LedMode, u: number, v: number, t: number, bass: number, mid: number): number {
    const r = Math.sqrt(u * u + v * v);
    let ang = Math.atan2(v, u);
    switch (mode) {
      case 'spiral':
        return ang / (Math.PI * 2) * 3 + r * (2.2 + bass) - t * 0.6;
      case 'kaleido': {
        const seg = Math.PI / 4;
        ang = Math.abs((((ang + t * 0.15) % seg) + seg) % seg - seg / 2);
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        return Math.sin(x * 9 + t * 1.3) * 0.5 + Math.cos(y * 12 - t) * 0.5 + r * (1 + mid * 2) - t * 0.3;
      }
      case 'tunnel': {
        const depth = 0.4 / (r + 0.05) + t * (1.2 + bass * 2);
        const check = (Math.floor(depth * 2) + Math.floor((ang / Math.PI) * 6 + t * 0.5)) & 1;
        return depth * 0.25 + check * 0.5;
      }
      case 'lava':
      default: {
        let s = 0;
        for (let i = 0; i < 5; i++) {
          const bx = Math.sin(t * (0.3 + i * 0.07) + i * 2) * 1.2;
          const by = Math.cos(t * (0.25 + i * 0.05) + i) * 0.5;
          const d = (u - bx) * (u - bx) + (v - by) * (v - by);
          s += (0.08 + bass * 0.06) / (d + 0.01);
        }
        return s > 1 ? 0.5 + Math.min(s, 6) * 0.08 + t * 0.05 : t * 0.05 + s * 0.2;
      }
    }
  }

  update(f: Frame) {
    this.time += f.dt * (0.6 + f.intensity * 0.8);
    this.modeBlend = Math.min(1, this.modeBlend + f.dt * 0.8);
    if (this.text) {
      this.text.t -= f.dt;
      if (this.text.t <= 0) this.text = null;
    }
  }

  draw(g: G, f: Frame) {
    const { x, y, w, h } = LED_RECT;
    const t = this.time;
    const bass = f.energy.bass;
    const mid = f.energy.mid;
    this.buildLut(f.palette.length ? f.palette : ['#7b2cff', '#ff4fd8'], t * 0.15);
    const d = this.img.data;
    const aspect = w / h;
    const bright = (0.35 + f.intensity * 0.45 + bass * 0.35) * (f.playing ? 1 : 0.55);
    const blend = this.modeBlend;
    for (let j = 0; j < LH; j++) {
      const v = (j / LH - 0.5) * 2;
      for (let i = 0; i < LW; i++) {
        const u = (i / LW - 0.5) * 2 * aspect * 0.5;
        let val = this.field(this.mode, u, v, t, bass, mid);
        if (blend < 1) val = val * blend + this.field(this.prevMode, u, v, t, bass, mid) * (1 - blend);
        const idx = ((((val % 1) + 1) % 1) * 255) | 0;
        const o = (j * LW + i) * 4;
        const shade = bright * (0.7 + 0.3 * Math.sin(val * 6.28));
        d[o] = this.lut[idx * 3] * shade;
        d[o + 1] = this.lut[idx * 3 + 1] * shade;
        d[o + 2] = this.lut[idx * 3 + 2] * shade;
        d[o + 3] = 255;
      }
    }
    this.bctx.putImageData(this.img, 0, 0);

    // frame
    g.fillStyle = '#0a0612';
    g.fillRect(x - 10, y - 10, w + 20, h + 20);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.buf, x, y, w, h);

    // text overlay (song titles, name cards, crowd prompts)
    if (this.text) {
      const a = Math.min(1, this.text.t * 2);
      g.save();
      g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(x, y + h / 2 - 44, w, 88);
      g.fillStyle = '#fff';
      g.font = `900 ${this.text.text.length > 22 ? 34 : 50}px "Arial Black", "Trebuchet MS", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const jitter = f.reduceMotion ? 0 : Math.sin(f.t * 20) * 1.5;
      g.fillStyle = '#ff4fd8';
      g.fillText(this.text.text, x + w / 2 + 3, y + h / 2 + 3);
      g.fillStyle = '#00e0c6';
      g.fillText(this.text.text, x + w / 2 - 2 + jitter, y + h / 2 - 1);
      g.fillStyle = '#fff';
      g.fillText(this.text.text, x + w / 2, y + h / 2);
      g.restore();
    }

    // LED dot mask
    if (!this.mask) {
      const c = document.createElement('canvas');
      c.width = c.height = 6;
      const cg = c.getContext('2d')!;
      cg.fillStyle = 'rgba(0,0,0,0.55)';
      cg.fillRect(0, 0, 6, 6);
      cg.clearRect(1, 1, 4, 4);
      this.mask = g.createPattern(c, 'repeat');
    }
    if (this.mask) {
      g.fillStyle = this.mask;
      g.fillRect(x, y, w, h);
    }
  }
}
