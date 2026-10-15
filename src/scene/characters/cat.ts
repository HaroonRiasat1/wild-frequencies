// Sir Reginald Purrcival III — Maine Coon, velvet jacket, enormous ego.

import { arm, circ, ell, eye, limb, poly, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const FUR = '#b07a45';
const FUR_DARK = '#6b4526';
const CREAM = '#f1dcb8';
const VELVET = '#5b1a7a';
const VELVET_HI = '#8a3cb0';
const GOLD = '#f0c04a';

export class Cat extends Character {
  readonly id = 'cat' as const;
  private highNote = 0;
  private lastMidi = 60;

  constructor() {
    super(760, 652, 1.12, 110, 190);
  }

  /** Called with every sung syllable. */
  sing(midi: number, durSec: number) {
    this.mouth = Math.min(1, 0.5 + durSec * 0.8);
    this.hit = 1;
    if (midi >= 79 && durSec > 0.35) this.highNote = Math.max(this.highNote, durSec + 0.2);
    this.lastMidi = midi;
  }

  /** User tracks: mouth along to the analysed vocal energy (no lyrics, just conviction). */
  mouthAlong(level: number) {
    // level is 0 whenever the singer isn't singing, so instrumentals keep the mouth shut
    if (this.frozen || level <= 0.05) return;
    this.mouth = Math.max(this.mouth, level);
    this.hit = Math.max(this.hit, level * 0.5);
    if (level > 0.92) this.highNote = Math.max(this.highNote, 0.2);
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (!this.frozen) this.highNote = Math.max(0, this.highNote - f.dt);
    // keep the mouth open for held notes
    if (this.mouth > 0 && this.mouth < 0.3 && this.hit > 0.2) this.mouth = 0.3;
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const a = this.anim;
    const walking = a === 'walk';
    const high = this.highNote > 0 || a === 'solo';
    const cele = a === 'celebrate';
    const react = a === 'react';
    const jump = cele ? Math.abs(Math.sin(t * 7)) * 18 : react ? Math.max(0, Math.sin(this.reactT * 6)) * 12 : 0;
    const by = -this.bounce(f, 7) - jump;
    const lean = high ? -0.1 : a === 'play' ? Math.sin(this.beat * Math.PI) * 0.04 : 0;
    const poof = react ? 1.15 : 1;

    // ---- tail: big fluffy Maine Coon tail, sways like it's at a festival
    const sway = Math.sin(t * 1.7) * 0.5 + (high ? Math.sin(t * 3) * 0.4 : 0);
    g.save();
    g.translate(-26, -40 + by);
    g.rotate(-0.9 + sway);
    g.lineCap = 'round';
    g.strokeStyle = FUR;
    g.lineWidth = 26 * poof;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-40, -30, -30, -88);
    g.stroke();
    g.setLineDash([9, 13]);
    g.strokeStyle = FUR_DARK;
    g.lineWidth = 24 * poof;
    g.stroke();
    g.setLineDash([]);
    circ(g, -30, -90, 14 * poof, FUR_DARK);
    g.restore();

    // ---- legs + feet
    const step = walking ? Math.sin(this.walkPhase) * 10 : 0;
    ell(g, -16 + step, -6, 15, 9, FUR);
    ell(g, 16 - step, -6, 15, 9, FUR);

    g.save();
    g.translate(0, by);
    g.rotate(lean);

    // ---- body + belly
    ell(g, 0, -62, 40 * poof, 48 * poof, FUR);
    ell(g, 0, -56, 22, 34, CREAM);

    // ---- velvet jacket (open front, gold trim)
    poly(g, [-40, -88, -8, -98, -6, -40, -18, -18, -42, -30], VELVET);
    poly(g, [40, -88, 8, -98, 6, -40, 18, -18, 42, -30], VELVET);
    poly(g, [-40, -88, -20, -95, -14, -60, -30, -70], VELVET_HI);
    g.strokeStyle = GOLD;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-8, -98); g.lineTo(-6, -40); g.lineTo(-18, -18);
    g.moveTo(8, -98); g.lineTo(6, -40); g.lineTo(18, -18);
    g.stroke();
    circ(g, -10, -60, 3, GOLD);
    circ(g, -11, -46, 3, GOLD);

    // ---- arms (velvet sleeves): mic arm + drama arm
    const micX = 40, micY = -118;
    const shoulderL: [number, number] = [-34, -88];
    const shoulderR: [number, number] = [34, -88];
    let dramaA1 = 1.9 + Math.sin(t * 1.3) * 0.1;
    let dramaA2 = -0.4;
    if (a === 'play') { dramaA1 = 2.4 - this.hit * 0.7; dramaA2 = -0.9; }
    if (high) { dramaA1 = -2.3 + Math.sin(t * 4) * 0.08; dramaA2 = 0.4; }
    if (cele) { dramaA1 = -2.0; dramaA2 = -0.2; }
    if (react) { dramaA1 = -2.6; dramaA2 = -0.6; }
    const hand = arm(g, shoulderL[0], shoulderL[1], dramaA1, 30, dramaA2, 28, 13, VELVET);
    circ(g, hand[0], hand[1], 8, FUR);
    if (cele || walking) {
      const h2 = arm(g, shoulderR[0], shoulderR[1], cele ? -1.1 : 1.2, 30, cele ? -0.3 : 0.3, 28, 13, VELVET);
      circ(g, h2[0], h2[1], 8, FUR);
    } else {
      limb(g, shoulderR[0], shoulderR[1], micX - 4, micY + 22, 13, VELVET);
      circ(g, micX - 4, micY + 20, 8, FUR);
    }

    // ---- ruff (that Maine Coon mane)
    poly(g, [-34, -100, -42, -118, -26, -112, -24, -128, -10, -114, 0, -130, 10, -114, 24, -128, 26, -112, 42, -118, 34, -100, 0, -92], CREAM);

    // ---- head
    const headTilt = high ? -0.25 : react ? Math.sin(t * 30) * 0.08 : Math.sin(t * 1.1) * 0.05;
    g.save();
    g.translate(0, -132);
    g.rotate(headTilt);
    // ears with lynx tufts
    for (const s of [-1, 1]) {
      poly(g, [s * 12, -22, s * 32, -52, s * 34, -12], FUR);
      poly(g, [s * 17, -22, s * 30, -44, s * 30, -16], '#e79aa6');
      limb(g, s * 32, -52, s * 36, -66, 2.5, FUR_DARK);
      limb(g, s * 32, -52, s * 30, -64, 2, FUR_DARK);
    }
    ell(g, 0, -4, 36 * poof, 31 * poof, FUR);
    // forehead "M"
    g.strokeStyle = FUR_DARK;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-12, -28); g.lineTo(-7, -18); g.lineTo(0, -28); g.lineTo(7, -18); g.lineTo(12, -28);
    g.stroke();
    // muzzle
    ell(g, -9, 10, 12, 9, CREAM);
    ell(g, 9, 10, 12, 9, CREAM);
    // eyes: closed on the big high notes, wide when poked
    const blink = Math.sin(t * 0.9) > 0.985 ? 0.05 : 1;
    const eyeOpen = high ? 0 : react ? 1.2 : blink;
    eye(g, -14, -6, 8, eyeOpen, f.playing ? Math.sin(t * 0.7) * 0.6 : 0, 0, '#2fa65a');
    eye(g, 14, -6, 8, eyeOpen, f.playing ? Math.sin(t * 0.7) * 0.6 : 0, 0, '#2fa65a');
    if (f.sunglasses) sunglasses(g, 0, -6, 52);
    // nose
    poly(g, [-5, 3, 5, 3, 0, 9], '#e2738a');
    // mouth: opens with the vocal, hiss when poked
    const m = react ? 0.8 : this.mouth;
    if (m > 0.05) {
      const round = this.lastMidi > 74 ? 1 : 0.7;
      ell(g, 0, 17 + m * 4, 7 * round + m * 3, 3 + m * 9, '#3a0f22');
      ell(g, 0, 21 + m * 8, 4 + m * 2, 2 + m * 3, '#e2738a');
      if (react) {
        poly(g, [-5, 12, -3, 18, -1, 12], '#fff');
        poly(g, [1, 12, 3, 18, 5, 12], '#fff');
      }
    } else {
      g.strokeStyle = '#3a0f22';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-6, 13); g.quadraticCurveTo(-3, 17, 0, 12); g.quadraticCurveTo(3, 17, 6, 13);
      g.stroke();
    }
    // whiskers
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.2;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(s * 14, 10 + i * 3);
        g.lineTo(s * 46, 4 + i * 7 + Math.sin(t * 2 + i) * 2);
        g.stroke();
      }
    }
    g.restore();
    g.restore();

    // ---- mic stand (in front of everything)
    if (!walking) {
      limb(g, micX + 6, 0, micX + 6, micY + 26, 4, '#bbb');
      limb(g, micX - 10, 0, micX + 22, 0, 5, '#999');
      limb(g, micX + 6, micY + 26, micX - 2, micY + 10 + by * 0.3, 4, '#bbb');
      ell(g, micX - 4, micY + 6 + by * 0.3, 7, 10, '#333', -0.5);
    }
  }
}
