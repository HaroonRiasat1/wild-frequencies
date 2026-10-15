// Rusty "Shred" Brushtail — fox, glitter guitar, chronic knee-slider.

import { arm, circ, ell, eye, limb, poly, rgba, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const ORANGE = '#e8692a';
const DARK = '#2a1a14';
const WHITE = '#fff6ea';

// deterministic glitter flecks on the guitar body
const GLITTER = Array.from({ length: 26 }, (_, i) => ({
  x: Math.sin(i * 12.9898) * 22,
  y: Math.cos(i * 78.233) * 16,
  p: (i * 0.37) % 1,
}));

export class Fox extends Character {
  readonly id = 'fox' as const;
  private fret = 0;

  constructor() {
    super(520, 652, 1.05, 120, 180);
  }

  override onNote(midi: number, dur: number, vel: number) {
    super.onNote(midi, dur, vel);
    this.fret = ((midi % 12) / 12) * 0.8;
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    // knee slide: glide across the stage during solos, then sheepishly walk back
    if (this.anim === 'solo' && !f.reduceMotion) {
      const s = this.soloT;
      const slide = s < 1.2 ? (s / 1.2) * 150 : 150 + Math.sin((s - 1.2) * 0.8) * 40;
      this.x = this.homeX + slide;
    } else if (!this.walking && this.onStage) {
      this.x += (this.homeX - this.x) * Math.min(1, f.dt * 2);
    }
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const a = this.anim;
    const solo = a === 'solo';
    const cele = a === 'celebrate';
    const react = a === 'react';
    const kneel = solo ? 1 : 0;
    const by = -this.bounce(f, 6) + kneel * 34 - (cele ? Math.abs(Math.sin(t * 8)) * 22 : 0);
    const lean = solo ? -0.32 : react ? 0.5 * Math.sin(this.reactT * 10) : 0;
    // head-bang locked to the beat
    const bang = a === 'play' || solo ? Math.pow(1 - this.ph, 3) * (0.35 + f.intensity * 0.3) : 0;

    // fur glow from the stage lights
    if (f.playing) {
      const col = f.palette[Math.floor(this.beat / 4) % f.palette.length] ?? '#ff7a1a';
      const grad = g.createRadialGradient(0, -90, 10, 0, -90, 110);
      grad.addColorStop(0, rgba(col, 0.25 + f.energy.bass * 0.3));
      grad.addColorStop(1, rgba(col, 0));
      g.fillStyle = grad;
      g.fillRect(-110, -200, 220, 220);
    }

    // tail
    g.save();
    g.translate(-22, -40 + by);
    g.rotate(-0.6 + Math.sin(t * 2.4) * 0.35);
    g.lineCap = 'round';
    limb(g, 0, 0, -50, -40, 24, ORANGE);
    limb(g, -50, -40, -66, -62, 20, WHITE);
    g.restore();

    // legs (kneeling during solos)
    const walk = a === 'walk' ? Math.sin(this.walkPhase) * 10 : 0;
    if (kneel) {
      limb(g, -12, -6, -38, -4, 13, DARK);
      limb(g, 14, -6, 34, -10, 13, DARK);
    } else {
      limb(g, -12, -40 + by, -14 + walk, -4, 12, ORANGE);
      limb(g, 12, -40 + by, 14 - walk, -4, 12, ORANGE);
      ell(g, -14 + walk, -4, 11, 6, DARK);
      ell(g, 14 - walk, -4, 11, 6, DARK);
    }

    g.save();
    g.translate(0, by);
    g.rotate(lean);
    // body
    ell(g, 0, -72, 30, 42, ORANGE);
    ell(g, 0, -70, 17, 32, WHITE);
    // strap
    limb(g, -24, -100, 24, -46, 4, '#3b1a4a');

    // ---- glitter Telecaster
    g.save();
    g.translate(4, -60);
    g.rotate(-0.42 + (solo ? -0.35 : 0) + (cele ? -0.8 : 0));
    // neck + headstock
    limb(g, -10, -4, -96, -4, 7, '#d9b27c');
    for (let i = 0; i < 6; i++) limb(g, -20 - i * 12, -7, -20 - i * 12, -1, 1, '#999');
    poly(g, [-96, -9, -118, -12, -118, 3, -96, 1], '#f4f0e8');
    // body (single cutaway)
    g.beginPath();
    g.moveTo(-8, -18);
    g.bezierCurveTo(20, -26, 34, -14, 30, 4);
    g.bezierCurveTo(28, 22, 0, 24, -14, 16);
    g.bezierCurveTo(-20, 8, -16, -2, -6, -6);
    g.closePath();
    g.fillStyle = '#ff3fa4';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#ffd5f0';
    g.stroke();
    for (const s of GLITTER) {
      const tw = (Math.sin(t * 6 + s.p * 20 + this.beat * 3) + 1) / 2;
      if (tw > 0.55) circ(g, 8 + s.x * 0.9, s.y * 0.8, 1 + tw * 1.4, tw > 0.85 ? '#fff' : '#ffe066');
    }
    rr0(g);
    g.restore();

    // strumming arm + fretting arm
    const strum = (a === 'play' || solo) ? Math.sin(this.local * (solo ? 30 : 14)) * 0.3 * (0.4 + this.hit) : 0;
    const hR = arm(g, 22, -96, 1.7 + strum, 26, -1.3, 24, 10, ORANGE);
    circ(g, hR[0], hR[1], 6, DARK);
    const fretReach = 0.9 + this.fret * 0.4 + (solo ? Math.sin(t * 9) * 0.15 : 0);
    const hL = arm(g, -24, -96, 2.6 - (cele ? 4 : 0), 26, -fretReach * 0.4, 30, 10, ORANGE);
    circ(g, hL[0], hL[1], 6, DARK);

    // ---- head (with head-bang)
    g.save();
    g.translate(0, -114);
    g.rotate(bang * 0.9 - (cele ? 0.2 : 0));
    g.translate(0, bang * 8);
    for (const s of [-1, 1]) {
      poly(g, [s * 8, -16, s * 26, -50, s * 30, -8], ORANGE);
      poly(g, [s * 12, -16, s * 25, -40, s * 26, -12], DARK);
    }
    ell(g, 0, -4, 28, 24, ORANGE);
    poly(g, [-26, 0, 0, 30, 26, 0, 0, 6], WHITE);
    circ(g, 0, 28, 5, DARK);
    const closed = solo && Math.sin(t * 2) > 0;
    eye(g, -11, -6, 6, closed ? 0 : react ? 1.3 : 0.9, 0.3, 0, '#3d2200');
    eye(g, 11, -6, 6, closed ? 0 : react ? 1.3 : 0.9, 0.3, 0, '#3d2200');
    if (f.sunglasses) sunglasses(g, 0, -6, 44);
    if (solo || cele || react) ell(g, 0, 16, 6, 5 + this.hit * 3, '#3a0f22');
    g.restore();
    g.restore();
  }
}

// pickguard + pickups detail
function rr0(g: G) {
  ell(g, 6, 4, 8, 6, '#fff');
  limb(g, 14, -8, 14, 6, 3, '#333');
  limb(g, -2, -6, -2, 8, 3, '#333');
}
