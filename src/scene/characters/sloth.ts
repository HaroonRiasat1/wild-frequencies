// Gary — a sloth. Bass. Has never missed a beat. Has never hurried one either.

import { arm, circ, ell, eye, limb, poly, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const FUR = '#8c7458';
const FUR_LIGHT = '#c9b394';
const MASK = '#3b2a1c';

export class Sloth extends Character {
  readonly id = 'sloth' as const;
  private yawnT = 0;
  private nextYawn = 12 + Math.random() * 10;
  private thumb = 0;

  constructor() {
    super(1040, 652, 1.05, 110, 175);
  }

  yawn() {
    this.yawnT = 2.8;
  }

  private pendingText: string | null = null;
  private pendingT = 0;

  override poke(text: string) {
    // reactions arrive… eventually
    this.say('…', 1.2);
    this.yawn();
    this.reactT = 2.5;
    this.pendingText = text;
    this.pendingT = 1.3;
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (this.frozen) return;
    this.yawnT = Math.max(0, this.yawnT - f.dt);
    if (this.pendingText) {
      this.pendingT -= f.dt;
      if (this.pendingT <= 0) {
        this.say(this.pendingText, 3);
        this.pendingText = null;
      }
    }
    if (f.playing && this.onStage) {
      this.nextYawn -= f.dt;
      if (this.nextYawn <= 0) {
        this.yawn();
        this.nextYawn = 15 + Math.random() * 15;
      }
    }
    // celebration: a thumbs up, delivered at sloth speed
    this.thumb += ((this.anim === 'celebrate' || this.anim === 'solo' ? 1 : 0) - this.thumb) * Math.min(1, f.dt * 0.6);
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const a = this.anim;
    const sway = Math.sin(t * 0.6) * 0.05;
    const nod = a === 'play' || a === 'solo' ? Math.sin(this.beat * Math.PI) * 0.03 : 0;
    const walk = a === 'walk' ? Math.sin(this.walkPhase * 0.4) * 6 : 0;

    g.save();
    g.rotate(sway);
    // legs
    limb(g, -14, -40, -16 + walk, -4, 14, FUR);
    limb(g, 14, -40, 16 - walk, -4, 14, FUR);
    // shaggy body
    ell(g, 0, -70, 36, 50, FUR);
    for (let i = 0; i < 9; i++) limb(g, -30 + i * 7.5, -40, -32 + i * 7.5, -24 + (i % 2) * 4, 5, FUR);

    // bass guitar (long neck, wooden)
    g.save();
    g.translate(2, -62);
    g.rotate(-0.5);
    limb(g, -6, 0, -120, 0, 7, '#6b3b1f');
    poly(g, [-120, -6, -138, -8, -138, 6, -120, 5], '#2b1a10');
    ell(g, 6, 2, 30, 22, '#9e4a1c');
    ell(g, 6, 2, 22, 15, '#b8622e');
    for (let i = 0; i < 4; i++) limb(g, -14, -4 + i * 2.6, -120, -4 + i * 2.6, 0.8, '#ddd');
    g.restore();

    // plucking arm: tiny movement on every note. Fretting arm: long, claws.
    const pluck = this.hit * 0.12;
    const up = this.thumb;
    const hR = arm(g, 26, -98, 1.6 - pluck - up * 3.4, 30, -1.1 + up * 0.6, 28, 12, FUR);
    for (let i = 0; i < 3; i++) limb(g, hR[0], hR[1], hR[0] + 6 + i * 2, hR[1] + 8 - i * 3, 2.5, '#efe3c8');
    if (up > 0.6) limb(g, hR[0], hR[1], hR[0], hR[1] - 14, 4, '#efe3c8'); // the thumb
    const hL = arm(g, -26, -98, 2.4, 32, -0.5, 34, 12, FUR);
    for (let i = 0; i < 3; i++) limb(g, hL[0], hL[1], hL[0] - 8, hL[1] - 4 + i * 4, 2.5, '#efe3c8');

    // head
    g.save();
    g.translate(0, -128);
    g.rotate(nod + (this.yawnT > 0 ? -0.15 : 0));
    ell(g, 0, 0, 30, 26, FUR);
    ell(g, 0, 4, 24, 18, FUR_LIGHT);
    // the iconic eye-mask stripes
    ell(g, -12, 0, 11, 6, MASK, -0.3);
    ell(g, 12, 0, 11, 6, MASK, 0.3);
    const lids = this.yawnT > 0 || a === 'react' && this.pendingText ? 0 : 0.45 + Math.sin(t * 0.3) * 0.05;
    eye(g, -12, 0, 4.5, lids, 0, 0.2, '#1a1008');
    eye(g, 12, 0, 4.5, lids, 0, 0.2, '#1a1008');
    if (f.sunglasses) sunglasses(g, 0, 0, 46);
    circ(g, 0, 9, 4, MASK);
    if (this.yawnT > 0) {
      const y = Math.sin(Math.min(1, (2.8 - this.yawnT) / 0.8) * Math.PI * 0.5) * Math.min(1, this.yawnT);
      ell(g, 0, 17, 7 + y * 4, 3 + y * 10, '#4a1f26');
    } else {
      g.strokeStyle = MASK;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 13, 7, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    g.restore();
    g.restore();

    // Zzz when idle for a while
    if (a === 'idle' && Math.sin(t * 0.25) > 0.6) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.font = 'bold 16px system-ui';
      g.fillText('z', 26, -160 - (t % 2) * 10);
      g.fillText('Z', 36, -176 - (t % 2) * 12);
    }
  }
}
