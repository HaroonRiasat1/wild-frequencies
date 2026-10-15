// The Tuxedos — Pip, Pep & Kevin. Three penguins, one hitbox, perfect sync.
// Kevin falls over. It's not choreographed.

import { circ, ell, eye, poly, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

export class Penguins extends Character {
  readonly id = 'penguins' as const;
  private beak = [0, 0, 0];
  private honk = false;
  private kevinDown = 0;

  constructor() {
    super(300, 656, 1, 230, 130);
  }

  sing(syl: string, durSec: number) {
    this.honk = syl === 'honk';
    this.beak = this.beak.map(() => Math.min(1, 0.6 + durSec * 0.3));
    this.hit = 1;
  }

  override poke(text: string) {
    super.poke(text);
    this.kevinDown = 3;
    this.honk = true;
    this.beak = [1, 1, 1];
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (this.frozen) return;
    const decay = this.honk ? 4 : 0.8;
    this.beak = this.beak.map((b) => Math.max(0, b - f.dt * decay));
    this.kevinDown = Math.max(0, this.kevinDown - f.dt);
  }

  drawBody(g: G, f: Frame) {
    const a = this.anim;
    const busy = a === 'play' || a === 'solo';
    // synchronized sway: left on odd beats, right on even
    const sway = busy ? Math.sin(this.beat * Math.PI) * 0.14 : Math.sin(this.local * 1.5) * 0.04;
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 74;
      const delay = i * 0.12;
      const jump = a === 'celebrate' ? Math.max(0, Math.sin((this.local - delay) * 8)) * 26 : 0;
      const isKevin = i === 2;
      const fallen = isKevin ? Math.min(1, this.kevinDown * 2) * (this.kevinDown > 0.4 ? 1 : this.kevinDown / 0.4) : 0;
      g.save();
      g.translate(x, -jump - this.bounce(f, 4));
      g.rotate(sway + fallen * 1.45);
      this.penguin(g, f, i, a === 'walk' ? Math.sin(this.walkPhase + i) * 0.15 : 0);
      g.restore();
      if (isKevin && fallen > 0.5) {
        g.fillStyle = '#fff';
        g.font = 'bold 13px system-ui';
        g.textAlign = 'center';
        g.fillText('(kevin)', x + 30, -20);
      }
    }
  }

  private penguin(g: G, f: Frame, i: number, waddle: number) {
    g.rotate(waddle);
    ell(g, -10, -3, 10, 5, '#f39a1e');
    ell(g, 10, -3, 10, 5, '#f39a1e');
    ell(g, 0, -52, 30, 50, '#1b1b2a');
    ell(g, 0, -46, 21, 40, '#f4f6ff');
    // bow tie (they are The Tuxedos after all)
    poly(g, [-8, -84, 0, -80, -8, -76], '#ff2e63');
    poly(g, [8, -84, 0, -80, 8, -76], '#ff2e63');
    circ(g, 0, -80, 2.5, '#ff2e63');
    // flippers: up on choruses
    const up = this.anim === 'celebrate' || (this.anim === 'play' && (this.beak[i] > 0.5 || this.hit > 0.6)) ? 1 : 0;
    for (const s of [-1, 1]) {
      g.save();
      g.translate(s * 26, -70);
      g.rotate(s * (0.3 + up * 1.6 + Math.sin(this.local * 6 + i) * 0.08 * up));
      ell(g, 0, 22, 8, 24, '#1b1b2a');
      g.restore();
    }
    // head
    ell(g, 0, -104, 22, 20, '#1b1b2a');
    ell(g, -8, -104, 7, 8, '#f4f6ff');
    ell(g, 8, -104, 7, 8, '#f4f6ff');
    const shock = this.anim === 'react' ? 1.3 : 1;
    eye(g, -8, -106, 4, shock, 0.2, 0, '#111');
    eye(g, 8, -106, 4, shock, 0.2, 0, '#111');
    if (f.sunglasses) sunglasses(g, 0, -106, 34);
    // beak: round "ooh" or wide "honk"
    const b = this.beak[i];
    if (this.honk) {
      poly(g, [-6, -98, 6, -98, 0, -86 - b * 2], '#f39a1e');
      poly(g, [-6, -96 + b * 6, 6, -96 + b * 6, 0, -86 + b * 8], '#d8810e');
    } else {
      poly(g, [-6, -98, 6, -98, 0, -88], '#f39a1e');
      if (b > 0.05) ell(g, 0, -90, 3 + b * 2, 2 + b * 4, '#3a0f22');
    }
  }
}
