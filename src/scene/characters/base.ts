// Base class for every band member: a tiny state machine (offstage -> walk ->
// idle/play/solo/celebrate/react/frozen/bow) plus "skeletal" drawing helpers.
// Subclasses only implement drawBody() using the pose values computed here.

import type { Phase } from '../../state/store';
import type { CharacterId, SectionKind } from '../../songs/types';
import { approach, bubble, clamp, type G } from '../draw';

export interface Frame {
  t: number;
  dt: number;
  beat: number;
  phase: number; // 0..1 within the beat
  energy: { bass: number; mid: number; high: number; level: number };
  intensity: number;
  playing: boolean;
  section: SectionKind | null;
  soloist: CharacterId | null;
  sunglasses: boolean;
  reduceMotion: boolean;
  show: Phase;
  hype: number;
  lowQuality: boolean;
  palette: string[];
}

export type Anim = 'offstage' | 'walk' | 'idle' | 'play' | 'solo' | 'celebrate' | 'react' | 'frozen' | 'bow';

export abstract class Character<Id extends string = CharacterId> {
  abstract readonly id: Id;
  x: number;
  y: number;
  scale: number;
  anim: Anim = 'offstage';
  /** Personal clock: stops when frozen (muted). */
  local = Math.random() * 10;
  /** Beat phase as seen by this character (freezes with them). */
  ph = 0;
  beat = 0;
  /** 0..1 pulses that decay — set by note events. */
  hit = 0;
  mouth = 0;
  reactT = 0;
  celebrateT = 0;
  soloT = 0;
  bow = 0;
  walkPhase = 0;
  frozen = false;
  onStage = false;
  hitW: number;
  hitH: number;
  private bubbleText: string | null = null;
  private bubbleT = 0;
  private walkTarget: number;

  constructor(
    public homeX: number,
    public homeY: number,
    scale: number,
    hitW: number,
    hitH: number,
  ) {
    this.x = homeX < 800 ? -220 : 1820;
    this.y = homeY;
    this.scale = scale;
    this.hitW = hitW;
    this.hitH = hitH;
    this.walkTarget = this.x;
  }

  setOnStage(on: boolean) {
    if (on === this.onStage) return;
    this.onStage = on;
    this.walkTarget = on ? this.homeX : this.homeX < 800 ? -220 : 1820;
  }

  /** Teleport home (e.g. upload mode starting mid-show). */
  snapHome() {
    this.onStage = true;
    this.x = this.walkTarget = this.homeX;
  }

  say(text: string, seconds = 2.6) {
    this.bubbleText = text;
    this.bubbleT = seconds;
  }

  poke(text: string) {
    this.reactT = 1.6;
    this.say(text);
  }

  celebrate(seconds = 1.8) {
    this.celebrateT = Math.max(this.celebrateT, seconds);
  }

  onNote(_midi: number, _dur: number, vel: number) {
    this.hit = Math.max(this.hit, vel);
  }

  get walking() {
    return Math.abs(this.x - this.walkTarget) > 2;
  }

  update(f: Frame, muted: boolean) {
    const dt = f.dt;
    this.frozen = muted && f.playing && this.onStage && !this.walking;
    if (!this.frozen) {
      this.local += dt;
      this.ph = f.phase;
      this.beat = f.beat;
      this.hit = Math.max(0, this.hit - dt * 4);
      this.mouth = Math.max(0, this.mouth - dt * 3);
    }
    this.reactT = Math.max(0, this.reactT - dt);
    this.celebrateT = Math.max(0, this.celebrateT - dt);
    this.bubbleT = Math.max(0, this.bubbleT - dt);

    // walking on / off
    if (this.walking) {
      const dir = Math.sign(this.walkTarget - this.x);
      this.x += dir * Math.min(Math.abs(this.walkTarget - this.x), 420 * dt);
      this.walkPhase += dt * 9;
    }

    const soloing = f.playing && f.soloist === this.id;
    this.soloT = soloing ? this.soloT + dt : 0;
    this.bow = approach(this.bow, f.show === 'outro' && this.onStage ? 1 : 0, 3, dt);

    if (!this.onStage && !this.walking) this.anim = 'offstage';
    else if (this.walking) this.anim = 'walk';
    else if (this.frozen) this.anim = 'frozen';
    else if (this.reactT > 0) this.anim = 'react';
    else if (this.celebrateT > 0) this.anim = 'celebrate';
    else if (f.show === 'outro') this.anim = 'bow';
    else if (soloing) this.anim = 'solo';
    else if (f.playing) this.anim = 'play';
    else this.anim = 'idle';
  }

  /** Beat bounce, scaled down with reduced motion. */
  bounce(f: Frame, amp: number) {
    const k = f.reduceMotion ? 0.3 : 1;
    if (this.anim === 'idle' || this.anim === 'walk') return Math.sin(this.local * 2.2) * amp * 0.25 * k;
    return Math.pow(1 - this.ph, 2.5) * amp * k * (0.5 + f.intensity * 0.5);
  }

  draw(g: G, f: Frame) {
    if (this.anim === 'offstage') return;
    g.save();
    g.translate(this.x, this.y);
    g.scale(this.scale, this.scale);
    if (this.bow > 0.01) {
      // bow: squash and dip toward the crowd
      g.translate(0, 0);
      g.scale(1, 1 - this.bow * 0.16);
    }
    this.drawBody(g, f);
    if (this.frozen) this.drawFrozen(g);
    g.restore();
    if (this.bubbleT > 0 && this.bubbleText) {
      bubble(g, this.x, this.y - this.hitH * this.scale - 6, this.bubbleText, clamp(this.bubbleT * 3));
    }
  }

  private drawFrozen(g: G) {
    // a dramatic freeze: icy outline sign
    g.save();
    g.translate(0, -this.hitH * 0.55);
    g.rotate(-0.08);
    g.fillStyle = 'rgba(160,220,255,0.92)';
    g.strokeStyle = '#1b3a5a';
    g.lineWidth = 2.5;
    g.beginPath();
    g.roundRect(-46, -14, 92, 28, 6);
    g.fill();
    g.stroke();
    g.fillStyle = '#0b2440';
    g.font = 'bold 15px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('❄ MUTED ❄', 0, 1);
    g.restore();
  }

  hitTest(wx: number, wy: number): boolean {
    if (this.anim === 'offstage') return false;
    const w = this.hitW * this.scale;
    const h = this.hitH * this.scale;
    return wx > this.x - w / 2 && wx < this.x + w / 2 && wy > this.y - h && wy < this.y + 10;
  }

  abstract drawBody(g: G, f: Frame): void;
}
