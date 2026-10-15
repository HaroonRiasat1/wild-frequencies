// Professor Hootenanny — owl, a wall of vintage synths, sunglasses that never come off.
// Head swivels 180° on big moments (it's anatomically allowed).

import { circ, ell, limb, poly, rr, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const FEATHER = '#7a6248';
const FEATHER_LIGHT = '#d8c3a0';
const LED = ['#ff4fd8', '#00e0c6', '#ffe066', '#ff7a1a'];

export class Owl extends Character {
  readonly id = 'owl' as const;
  private swivel = 0; // 0..1 progress of the turn
  private swivelT = 0;
  private leds = [0, 0, 0, 0, 0, 0, 0, 0];
  private key = 0;

  constructor() {
    super(1262, 560, 1, 160, 180);
  }

  spin() {
    if (this.swivelT <= 0) this.swivelT = 1.6;
  }

  override onNote(midi: number, dur: number, vel: number) {
    super.onNote(midi, dur, vel);
    this.leds[midi % 8] = 1;
    this.key = (midi % 12) / 12;
  }

  override poke(text: string) {
    super.poke(text);
    this.spin();
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (this.frozen) return;
    this.swivelT = Math.max(0, this.swivelT - f.dt);
    this.swivel = this.swivelT > 0 ? Math.sin(((1.6 - this.swivelT) / 1.6) * Math.PI) : 0;
    this.leds = this.leds.map((l) => Math.max(0, l - f.dt * 3));
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const a = this.anim;
    const busy = a === 'play' || a === 'solo';
    const by = -this.bounce(f, 4);
    const flap = a === 'solo' || a === 'celebrate' ? Math.sin(t * 9) * 0.6 : 0;

    // body
    ell(g, 0, -86 + by, 44, 56, FEATHER);
    ell(g, 0, -80 + by, 30, 42, FEATHER_LIGHT);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      g.strokeStyle = '#a58c6a';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(-15 + c * 10, -100 + r * 12 + by, 4, 0, Math.PI);
      g.stroke();
    }
    // wings (playing the keys)
    for (const s of [-1, 1]) {
      g.save();
      g.translate(s * 40, -100 + by);
      const press = busy ? (s < 0 ? this.hit : this.key) * 0.25 : 0;
      g.rotate(s * (0.5 + flap) - s * press);
      poly(g, [0, 0, s * 14, 30, s * 4, 62, -s * 8, 40], '#5e4a35');
      g.restore();
    }

    // head with swivel: cos of the turn angle squashes it; past 90° we see the back
    g.save();
    g.translate(0, -158 + by + (busy ? Math.sin(this.beat * Math.PI * 2) * 2 : 0));
    const ang = this.swivel * Math.PI;
    const sx = Math.cos(ang);
    g.scale(Math.max(0.08, Math.abs(sx)), 1);
    ell(g, 0, 0, 42, 36, FEATHER);
    poly(g, [-34, -22, -42, -54, -18, -30], FEATHER);
    poly(g, [34, -22, 42, -54, 18, -30], FEATHER);
    if (sx > 0) {
      ell(g, -16, 0, 17, 17, FEATHER_LIGHT);
      ell(g, 16, 0, 17, 17, FEATHER_LIGHT);
      // round sunglasses: permanent. The Konami code just adds a second pair.
      sunglasses(g, 0, -1, 70, '#111', '#ffe066');
      if (f.sunglasses) sunglasses(g, 0, -14, 52, '#220022', '#00e0c6');
      poly(g, [-5, 12, 5, 12, 0, 24], '#f0a830');
      if (a === 'react' || a === 'celebrate' || this.mouth > 0.1) ell(g, 0, 22, 4, 3, '#3a0f22');
    } else {
      // back of the head: just a very calm feather pattern
      for (let i = 0; i < 3; i++) circ(g, -12 + i * 12, -6 + (i % 2) * 8, 5, '#5e4a35');
    }
    g.restore();

    // ---- synth stack (in front of the owl)
    rr(g, -92, -58, 184, 58, 6, '#2a1f33');
    for (let tier = 0; tier < 2; tier++) {
      const y = -82 - tier * 26;
      const w = 170 - tier * 30;
      const n = 14 - tier * 3;
      const kw = (w - 16) / n;
      rr(g, -w / 2, y, w, 24, 4, tier ? '#d9643a' : '#e8d9b5');
      for (let k = 0; k < n; k++) {
        const pressed = busy && Math.floor(t * 8 + k * 3.3) % 9 === 0 && this.hit > 0.2;
        rr(g, -w / 2 + 8 + k * kw, y + 6 + (pressed ? 2 : 0), kw - 1.5, 12, 1, '#fffaf0');
      }
    }
    // knobs + LEDs
    for (let i = 0; i < 8; i++) {
      circ(g, -70 + i * 20, -36, 5, '#111');
      limb(g, -70 + i * 20, -36, -70 + i * 20 + Math.cos(t + i) * 4, -36 + Math.sin(t + i) * 4, 1.5, '#fff');
      const l = this.leds[i];
      circ(g, -70 + i * 20, -18, 3.5, l > 0.05 ? LED[i % 4] : '#331d2a');
    }
    limb(g, -60, -6, -30, 40, 2, '#ff4fd8');
    limb(g, 50, -6, 80, 30, 2, '#00e0c6');
  }
}
