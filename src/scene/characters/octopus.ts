// Octavia Eightfold — octopus, drums, all of them. Each arm owns a drum and
// swings on that drum's hit events. Inks when the music gets intense.

import type { DrumKind } from '../../songs/types';
import { circ, ell, eye, limb, rr, sunglasses, type G } from '../draw';
import { Character, type Frame } from './base';

const SKIN = '#c2459a';
const SKIN_DARK = '#8d2a70';
const SUCKER = '#f6b6dd';

interface Arm {
  kinds: DrumKind[];
  tx: number;
  ty: number;
  ox: number;
  hit: number;
}

export class Octopus extends Character {
  readonly id = 'octopus' as const;
  emitInk: ((x: number, y: number, n: number) => void) | null = null;
  emitStick: ((x: number, y: number) => void) | null = null;
  private blush = 0;
  private alt = 0;
  private arms: Arm[] = [
    { kinds: ['hat', 'openHat'], tx: -82, ty: -96, ox: -24, hit: 0 },
    { kinds: ['snare', 'clap'], tx: -50, ty: -74, ox: -16, hit: 0 },
    { kinds: ['snare'], tx: -40, ty: -76, ox: -8, hit: 0 },
    { kinds: ['tomHi'], tx: -22, ty: -110, ox: -4, hit: 0 },
    { kinds: ['tomLo'], tx: 26, ty: -110, ox: 4, hit: 0 },
    { kinds: ['kick'], tx: 64, ty: -70, ox: 10, hit: 0 },
    { kinds: ['crash'], tx: -104, ty: -150, ox: -30, hit: 0 },
    { kinds: ['ride'], tx: 104, ty: -142, ox: 28, hit: 0 },
  ];
  private kickPulse = 0;
  private cymbalWobble = [0, 0, 0];

  constructor() {
    super(800, 452, 1, 220, 220);
  }

  onHit(kind: DrumKind, vel: number, f: Frame) {
    if (this.frozen) return;
    if (kind === 'kick') this.kickPulse = 1;
    if (kind === 'crash') this.cymbalWobble[0] = 1;
    if (kind === 'ride') this.cymbalWobble[1] = 1;
    if (kind === 'hat' || kind === 'openHat') this.cymbalWobble[2] = 1;
    const candidates = this.arms.filter((a) => a.kinds.includes(kind));
    if (!candidates.length) return;
    // alternate snare hands like a real drummer (with fewer hands... more hands)
    const arm = candidates[this.alt++ % candidates.length];
    arm.hit = Math.max(arm.hit, vel);
    this.hit = 1;
    if (f.intensity > 0.85 && (kind === 'snare' || kind === 'crash') && Math.random() < (f.lowQuality ? 0.08 : 0.18)) {
      this.emitInk?.(this.x + (Math.random() - 0.5) * 120, this.y - 120, 4);
    }
    if (this.anim === 'solo' && Math.random() < 0.05) this.emitStick?.(this.x + arm.tx, this.y + arm.ty);
  }

  override poke(text: string) {
    super.poke(text);
    this.blush = 2.5;
    this.emitInk?.(this.x, this.y - 140, 10);
  }

  override update(f: Frame, muted: boolean) {
    super.update(f, muted);
    if (this.frozen) return;
    for (const a of this.arms) a.hit = Math.max(0, a.hit - f.dt * 7);
    this.kickPulse = Math.max(0, this.kickPulse - f.dt * 8);
    this.cymbalWobble = this.cymbalWobble.map((w) => Math.max(0, w - f.dt * 2.5));
    this.blush = Math.max(0, this.blush - f.dt);
  }

  private tentacle(g: G, x1: number, y1: number, x2: number, y2: number, wave: number, stick: boolean) {
    const n = 7;
    const mx = (x1 + x2) / 2 + wave * 22;
    const my = (y1 + y2) / 2 + 16;
    let px = x1;
    let py = y1;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const qx = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2;
      const qy = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
      limb(g, px, py, qx, qy, 13 - u * 8, SKIN);
      if (i % 2 === 0) circ(g, qx, qy + 2, 2.2, SUCKER);
      px = qx;
      py = qy;
    }
    if (stick) limb(g, x2, y2, x2 - 4, y2 - 26, 3.5, '#f3d9a4');
  }

  drawBody(g: G, f: Frame) {
    const t = this.local;
    const a = this.anim;
    const busy = a === 'play' || a === 'solo';
    const solo = a === 'solo';
    const by = -this.bounce(f, 5);
    const cele = a === 'celebrate';

    // ---- cymbal stands (back)
    limb(g, -104, -4, -104, -146, 3, '#888');
    limb(g, 104, -4, 104, -138, 3, '#888');
    limb(g, -84, -4, -84, -92, 3, '#888');

    // ---- the mantle (head)
    const headY = -170 + by + (busy ? Math.sin(this.beat * Math.PI * 2) * 3 : 0);
    ell(g, 0, headY, 50, 58, SKIN);
    ell(g, -14, headY - 22, 16, 22, 'rgba(255,255,255,0.12)');
    for (let i = 0; i < 5; i++) circ(g, -26 + i * 13, headY - 34 + (i % 2) * 6, 3, SKIN_DARK);
    const look = busy ? Math.sin(t * 3) * 0.8 : 0;
    eye(g, -18, headY + 16, 12, a === 'react' ? 1.3 : solo ? 0.6 : 1, look, 0.3, '#1d0b30');
    eye(g, 18, headY + 16, 12, a === 'react' ? 1.3 : solo ? 0.6 : 1, look, 0.3, '#1d0b30');
    if (f.sunglasses) sunglasses(g, 0, headY + 16, 70);
    if (this.blush > 0) {
      ell(g, -30, headY + 34, 9, 5, `rgba(255,80,120,${Math.min(0.8, this.blush)})`);
      ell(g, 30, headY + 34, 9, 5, `rgba(255,80,120,${Math.min(0.8, this.blush)})`);
    }
    g.strokeStyle = '#3a0f22';
    g.lineWidth = 3;
    g.beginPath();
    if (solo || cele) g.arc(0, headY + 34, 8, 0, Math.PI);
    else g.arc(0, headY + 32, 5, 0.3, Math.PI - 0.3);
    g.stroke();

    const oy = headY + 46;
    // kick "foot" goes behind the bass drum
    const kick = this.arms[5];
    this.tentacle(g, kick.ox, oy, 30, -12 + this.kickPulse * 6, 0.5, false);

    // ---- drum kit
    // bass drum
    const kp = 1 + this.kickPulse * 0.04;
    ell(g, 0, -46, 48 * kp, 46 * kp, '#e9e1ff');
    ell(g, 0, -46, 42 * kp, 40 * kp, '#1b0d33');
    g.fillStyle = '#ff4fd8';
    g.font = 'bold 22px "Trebuchet MS", system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('WF', 0, -50);
    g.font = 'bold 8px system-ui';
    g.fillStyle = '#9ad5ff';
    g.fillText('WILD FREQUENCIES', 0, -32);
    // toms
    rr(g, -42, -122, 38, 22, 6, '#ff4fd8');
    ell(g, -23, -122, 19, 5, '#f4eaff');
    rr(g, 6, -122, 40, 22, 6, '#ff4fd8');
    ell(g, 26, -122, 20, 5, '#f4eaff');
    // snare + floor tom
    rr(g, -70, -78, 44, 18, 5, '#c0c0d0');
    ell(g, -48, -78, 22, 5, '#fff');
    limb(g, -48, -60, -48, -4, 3, '#888');
    rr(g, 44, -80, 44, 40, 6, '#ff4fd8');
    ell(g, 66, -80, 22, 5, '#f4eaff');
    // hi-hat
    const hw = this.cymbalWobble[2];
    ell(g, -84, -96 + hw * 2, 26, 4, '#e8c55a', hw * 0.1);
    ell(g, -84, -92, 26, 4, '#d4b048');

    // ---- the seven drumming arms (plus juice box duty when idle)
    this.arms.forEach((arm, i) => {
      if (i === 5) return;
      const flail = solo ? Math.sin(t * 13 + i * 1.7) * 14 : 0;
      const lift = busy ? (1 - arm.hit) * 18 * (0.5 + f.intensity * 0.5) : 4;
      let tx = arm.tx + flail;
      let ty = arm.ty - lift - (solo ? Math.abs(Math.cos(t * 11 + i)) * 10 : 0);
      if (!busy && i === 7) {
        // juice box break
        tx = 70;
        ty = headY + 50 + Math.sin(t) * 4;
      }
      if (cele) {
        tx = arm.tx * 1.3;
        ty = -230 + Math.sin(t * 8 + i) * 14;
      }
      this.tentacle(g, arm.ox, oy, tx, ty, Math.sin(t * 2 + i) * (busy ? 0.3 : 0.8), !(i === 7 && !busy));
      if (!busy && i === 7 && !cele) {
        rr(g, tx - 7, ty - 16, 14, 18, 2, '#ffd23f');
        limb(g, tx + 3, ty - 16, tx + 6, ty - 26, 2, '#fff');
      }
    });

    // ---- cymbals (front, wobble when hit)
    const cw = this.cymbalWobble;
    ell(g, -104, -150, 34, 6, '#f0cd60', -0.15 + Math.sin(t * 30) * cw[0] * 0.2);
    ell(g, 104, -142, 32, 6, '#e8c55a', 0.15 + Math.sin(t * 25) * cw[1] * 0.15);
  }
}
