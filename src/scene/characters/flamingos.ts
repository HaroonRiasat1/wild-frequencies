// The Flamingos — Rosa, Coco & Flo. Session backing singers: they are not in
// the band, they are *booked*. They strut on when a song has backing vocals,
// "ooh" into three matching mics, and strut off the second the chorus ends.

import { circ, ell, eye, limb, poly, rr, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const PINK = '#ff8fc4';
const DEEP = '#ff5fa8';
const LEG = '#f0709e';

export const FLAMINGO_POKES = ['Ooooh! (offended, in harmony)', 'We charge by the ooh.', 'Rosa, Coco & Flo. Remember it.', 'Don\'t touch the feathers.', 'One leg. Zero mistakes.'];

export class Flamingos extends Character<'flamingos'> {
  readonly id = 'flamingos' as const;
  private beak = [0, 0, 0];
  /** User tracks: mouth along to the analysed vocal (they sing with the lead). */
  private along = 0;
  private entrances = 0;

  constructor() {
    super(1275, 660, 0.82, 330, 190);
  }

  sing(_syl: string, durSec: number) {
    this.beak = this.beak.map(() => Math.min(1, 0.55 + durSec * 0.25));
    this.hit = 1;
  }

  mouthAlong(v: number) {
    this.along = v;
  }

  override setOnStage(on: boolean) {
    if (on && !this.onStage && this.entrances++ % 3 === 0) this.say('♪ backing vocals have arrived ♪', 2.4);
    super.setOnStage(on);
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (this.frozen) return;
    this.beak = this.beak.map((b, i) => {
      // each one breathes in a hair later than the last — it looks sung, not copied
      const target = this.along > 0.05 ? this.along * (0.85 + 0.15 * Math.sin(this.local * 9 + i * 1.7)) : 0;
      return Math.max(target, b - f.dt * 0.9);
    });
  }

  drawBody(g: G, f: Frame) {
    const a = this.anim;
    const busy = a === 'play' || a === 'solo' || a === 'celebrate';
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 118;
      // step-touch: all three to the left on one beat, right on the next
      const step = busy && !f.reduceMotion ? Math.sin(this.beat * Math.PI) * 9 : 0;
      g.save();
      g.translate(x + step, -this.bounce(f, 3));
      // face the band (stage left), unless strutting off to the right
      if (!(this.anim === 'walk' && !this.onStage)) g.scale(-1, 1);
      this.mic(g);
      this.flamingo(g, f, i, busy);
      g.restore();
    }
  }

  private mic(g: G) {
    limb(g, 50, 0, 50, -128, 3, '#4a4570');
    limb(g, 38, 0, 62, 0, 4, '#4a4570');
    limb(g, 50, -128, 42, -150, 3, '#4a4570');
    rr(g, 34, -166, 13, 18, 6, '#8a85b8');
    rr(g, 34, -166, 13, 7, 4, '#c9c4ee');
  }

  private flamingo(g: G, f: Frame, i: number, busy: boolean) {
    const a = this.anim;
    const walking = a === 'walk';
    const w = this.walkPhase + i * 0.9;
    // legs: one tucked up (classic) unless walking
    const tuck = !walking && i !== 1 && (Math.floor(this.local * 0.5 + i) % 2 === 0);
    const kneeA = walking ? Math.sin(w) * 10 : 0;
    limb(g, -6, -70, -6 + kneeA, -36, 3.5, LEG);
    limb(g, -6 + kneeA, -36, -6, 0, 3.5, LEG);
    if (tuck) {
      limb(g, 6, -70, 18, -46, 3.5, LEG);
      limb(g, 18, -46, 4, -40, 3.5, LEG);
    } else {
      limb(g, 6, -70, 6 - kneeA, -36, 3.5, LEG);
      limb(g, 6 - kneeA, -36, 6, 0, 3.5, LEG);
    }
    ell(g, -10, -1, 9, 3, LEG);
    if (!tuck) ell(g, 10, -1, 9, 3, LEG);

    // body + wings (flap on big moments)
    const flap = a === 'celebrate' ? Math.abs(Math.sin(this.local * 10 + i)) : busy ? this.hit * 0.35 : 0;
    ell(g, 0, -88, 34, 22, PINK, -0.12);
    g.save();
    g.translate(-8, -92);
    g.rotate(-0.25 - flap * 0.9);
    ell(g, -10, 0, 24, 12, DEEP, -0.2);
    g.restore();
    poly(g, [28, -96, 44, -86, 28, -82], DEEP); // tail

    // S-curve neck, leaning toward the mic while singing
    const lean = Math.min(1, this.beak[i] * 1.4) * 6;
    g.beginPath();
    g.moveTo(-22, -96);
    g.bezierCurveTo(-40, -120, 0 + lean, -128, -6 + lean, -150);
    g.bezierCurveTo(-10 + lean, -162, 4 + lean, -170, 10 + lean, -168);
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.strokeStyle = PINK;
    g.stroke();

    // head + beak (black tip, opens with the "ooh")
    const hx = 12 + lean;
    const hy = -170;
    circ(g, hx, hy, 11, PINK);
    eye(g, hx + 3, hy - 3, 3.2, a === 'react' ? 1.4 : 1, 0.25, 0.2, '#111');
    if (f.sunglasses) sunglasses(g, hx + 2, hy - 3, 24);
    const open = this.beak[i];
    g.save();
    g.translate(hx + 8, hy + 2);
    g.rotate(0.5 - open * 0.25);
    poly(g, [0, -4, 16, -2, 18, 6, 0, 3], '#fff2e0');
    poly(g, [12, -2.5, 18, 0, 18, 6, 12, 4.5], '#1b1b2a');
    g.restore();
    if (open > 0.05) {
      g.save();
      g.translate(hx + 8, hy + 5);
      g.rotate(0.5 + open * 0.55);
      poly(g, [0, 0, 15, 1, 17, 5, 0, 4], '#fff2e0');
      poly(g, [11, 0.7, 17, 1.5, 17, 5, 11, 4.3], '#1b1b2a');
      g.restore();
    }
  }
}
