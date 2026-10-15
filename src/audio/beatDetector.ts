// Upload mode: onset detection on the user's own track. Spectral energy per
// band is compared with its recent average; a sharp rise = an onset. Kicks
// drive the beat clock, so the whole band grooves to whatever you drop in.

import { conductor } from '../conductor/conductor';
import { engine } from './engine';

interface Band {
  lo: number;
  hi: number;
  hist: number[];
  last: number;
  prev: number;
}

const band = (lo: number, hi: number): Band => ({ lo, hi, hist: [], last: 0, prev: 0 });

export class BeatDetector {
  private kick = band(35, 150);
  private snare = band(1800, 5000);
  private hat = band(7000, 14000);
  private vocal = band(300, 3000);
  private buf: Uint8Array<ArrayBuffer> | null = null;
  private beatTimes: number[] = [];
  private period = 0.5;
  private lastBeat = 0;
  private beatIndex = 0;
  /** 0..1 — how much "singing" is happening (mid-band energy). */
  vocalLevel = 0;

  private timer = 0;

  start() {
    // Analysis runs on its own ~90 Hz timer so a dropped animation frame never
    // swallows a kick. (Visuals still render on rAF from the beat clock below.)
    window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.update(), 11);
    this.beatIndex = 0;
    this.lastBeat = performance.now() / 1000;
    conductor.state.playing = true;
    conductor.state.beatSource = () => {
      const now = performance.now() / 1000;
      return this.beatIndex + Math.min(0.999, (now - this.lastBeat) / this.period);
    };
  }

  private energy(b: Band, data: Uint8Array, hzPerBin: number): number {
    const a = Math.max(1, Math.floor(b.lo / hzPerBin));
    const z = Math.min(data.length - 1, Math.ceil(b.hi / hzPerBin));
    let s = 0;
    for (let i = a; i <= z; i++) s += data[i];
    return s / ((z - a + 1) * 255);
  }

  private onset(b: Band, e: number, now: number, k: number, gap: number): boolean {
    b.hist.push(e);
    if (b.hist.length > 43) b.hist.shift();
    const avg = b.hist.reduce((x, y) => x + y, 0) / b.hist.length;
    const rising = e - b.prev > 0.015;
    b.prev = e;
    if (e > avg * k && rising && e > 0.08 && now - b.last > gap) {
      b.last = now;
      return true;
    }
    return false;
  }

  update() {
    const an = engine.playerAnalyser;
    if (!an) return;
    if (!this.buf || this.buf.length !== an.frequencyBinCount) this.buf = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(this.buf);
    const hz = an.context.sampleRate / 2 / an.frequencyBinCount;
    const now = performance.now() / 1000;

    const ek = this.energy(this.kick, this.buf, hz);
    const es = this.energy(this.snare, this.buf, hz);
    const eh = this.energy(this.hat, this.buf, hz);
    const ev = this.energy(this.vocal, this.buf, hz);
    this.vocalLevel = this.vocalLevel * 0.7 + Math.min(1, ev * 2.2) * 0.3;
    conductor.state.intensity = Math.min(1, 0.2 + ek * 1.2 + es * 0.5);

    if (this.onset(this.kick, ek, now, 1.25, 0.22)) {
      conductor.emit('hit', { kind: 'kick', vel: Math.min(1, ek * 2) });
      // tempo tracking: median of recent kick gaps within a sane range
      const gap = now - this.lastBeat;
      if (gap > 0.27 && gap < 1.1) {
        this.beatTimes.push(gap);
        if (this.beatTimes.length > 12) this.beatTimes.shift();
        const sorted = [...this.beatTimes].sort((a, b) => a - b);
        this.period = sorted[Math.floor(sorted.length / 2)];
        conductor.state.bpm = Math.round(60 / this.period);
      }
      this.tick(now);
    } else if (now - this.lastBeat > this.period * 1.02) {
      // no kick? keep the clock rolling so nobody stops dancing
      this.tick(this.lastBeat + this.period);
    }
    if (this.onset(this.snare, es, now, 1.35, 0.15)) conductor.emit('hit', { kind: 'snare', vel: Math.min(1, es * 2.5) });
    if (this.onset(this.hat, eh, now, 1.3, 0.09)) conductor.emit('hit', { kind: 'hat', vel: Math.min(1, eh * 3) });
    if (this.vocalLevel > 0.35 && Math.random() < 0.08) {
      conductor.emit('note', { who: 'cat', midi: 60 + Math.round(this.vocalLevel * 20), dur: 2, vel: this.vocalLevel });
    }
  }

  private tick(at: number) {
    this.lastBeat = at;
    this.beatIndex++;
    conductor.emit('beat', { beat: this.beatIndex, bar: Math.floor(this.beatIndex / 4), downbeat: this.beatIndex % 4 === 0 });
    if (this.beatIndex % 16 === 0) conductor.emit('hype', { source: 'song' });
  }

  stop() {
    window.clearInterval(this.timer);
    conductor.state.playing = false;
  }
}
