// Greg — hype goat. Stands on the speaker stack. Vocabulary: one word.

import { circ, ell, eye, limb, poly, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

export class Goat extends Character {
  readonly id = 'goat' as const;
  private screamT = 0;

  constructor() {
    super(1508, 428, 0.95, 110, 150);
  }

  scream() {
    if (this.frozen) return;
    this.screamT = 1.3;
    this.say(Math.random() < 0.5 ? 'MEEEEEH!!!' : 'MEEEEEEEEEEH!', 1.4);
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (!this.frozen) this.screamT = Math.max(0, this.screamT - f.dt);
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const s = this.screamT > 0 ? 1 : 0;
    const shake = s ? Math.sin(t * 60) * 2.5 : 0;
    const hop = s ? Math.abs(Math.sin(t * 9)) * 16 : this.anim === 'celebrate' ? Math.abs(Math.sin(t * 7)) * 20 : 0;
    const by = -this.bounce(f, 5) - hop;

    g.save();
    g.translate(shake, by);
    // legs (four, standing proudly on the speaker)
    for (const x of [-22, -10, 10, 22]) limb(g, x, -30, x, -2, 7, '#e8e4dc');
    for (const x of [-22, -10, 10, 22]) ell(g, x, -2, 5, 3, '#333');
    ell(g, 0, -50, 36, 28, '#f2efe8');
    ell(g, 6, -56, 12, 9, '#d8d2c6');
    // head: tilts way back to scream
    g.save();
    g.translate(0, -84);
    g.rotate(s ? -0.5 : Math.sin(t * 0.8) * 0.06);
    // horns
    g.lineCap = 'round';
    for (const sd of [-1, 1]) {
      g.strokeStyle = '#8a7a5a';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(sd * 8, -20);
      g.quadraticCurveTo(sd * 30, -50, sd * 34, -22);
      g.stroke();
      ell(g, sd * 26, -8, 10, 5, '#f2efe8', sd * 0.4);
    }
    ell(g, 0, -4, 20, 24, '#f2efe8');
    // goat eyes: rectangular pupils, deeply unsettling
    for (const sd of [-1, 1]) {
      eye(g, sd * 9, -10, 6, s ? 1.3 : 1, 0, 0, '#c9a227');
      g.fillStyle = '#111';
      g.fillRect(sd * 9 - 4, -11, 8, 2.5);
    }
    if (f.sunglasses) sunglasses(g, 0, -10, 40);
    ell(g, 0, 14, 13, 10, '#e2dccf');
    circ(g, -4, 10, 1.6, '#555');
    circ(g, 4, 10, 1.6, '#555');
    // mouth: chewing, or SCREAMING
    if (s) ell(g, 0, 20, 8, 9, '#3a0f22');
    else limb(g, -5, 19 + Math.sin(t * 7) * 1.5, 5, 19 - Math.sin(t * 7) * 1.5, 2, '#555');
    // beard
    poly(g, [-6, 24, 6, 24, 0, 44 + Math.sin(t * 3) * 2], '#d8d2c6');
    g.restore();
    g.restore();

    if (s) {
      // scream lines
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.35;
        const r1 = 70 + ((t * 300) % 30);
        g.beginPath();
        g.moveTo(Math.cos(ang) * r1, -100 + Math.sin(ang) * r1);
        g.lineTo(Math.cos(ang) * (r1 + 18), -100 + Math.sin(ang) * (r1 + 18));
        g.stroke();
      }
    }
  }
}
