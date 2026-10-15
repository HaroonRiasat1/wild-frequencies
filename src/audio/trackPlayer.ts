// Plays a user's track as a full show song. The audio runs on Tone.Transport
// (player.sync()), and every analysed beat, onset and section is scheduled on
// the same transport — so the octopus hits *with* the kick, not after it.

import * as Tone from 'tone';
import { conductor } from '../conductor/conductor';
import type { CompiledSection } from '../songs/compile';
import type { Section, Song } from '../songs/types';
import { useShow } from '../state/store';
import { engine } from './engine';
import { songPlayer } from './songPlayer';
import type { TrackMap } from './trackAnalysis';

class TrackPlayer {
  map: TrackMap | null = null;
  private player: Tone.Player | null = null;
  private sections: CompiledSection[] = [];
  private secIndex = -1;
  private pseudo: Song | null = null;
  private onEnd: (() => void) | null = null;
  private restoreBeat: (() => number) | null = null;

  get active() {
    return !!this.map;
  }

  play(buffer: AudioBuffer, map: TrackMap, name: string, onEnd: () => void) {
    this.stop();
    songPlayer.stop();
    const tr = Tone.getTransport();
    tr.bpm.value = map.bpm;
    tr.swing = 0;
    tr.position = 0;
    this.map = map;
    this.onEnd = onEnd;
    this.secIndex = -1;

    const pseudo: Song = {
      id: 'headliner', title: name, tagline: 'your track', bpm: map.bpm, key: '?', tonic: 'C', scale: 'minor', voice: 'cat',
      progression: ['C'], drumPatterns: {}, bassPatterns: {}, keysPatterns: {}, sections: [],
    };
    this.pseudo = pseudo;
    this.sections = map.sections.map((s, index) => {
      const section: Section = { kind: s.kind, bars: 0, label: s.label, lights: s.lights, led: s.led, intensity: s.intensity, soloist: s.soloist ?? undefined };
      return { index, start: 0, end: 0, section, soloist: s.soloist };
    });

    const player = new Tone.Player(buffer);
    player.connect(engine.master);
    player.sync().start(0);
    this.player = player;

    const draw = Tone.getDraw();
    const sectionAt = (t: number) => map.sections.find((s) => t >= s.start && t < s.end);

    // beats -> bounce, tambourine, and "the band is playing" note events
    map.beats.forEach((t, i) => {
      const b = i - map.downbeat;
      tr.schedule((time) => {
        if (useShow.getState().moonJoined) engine.tambourine(time, b % 2 === 0 ? 0.9 : 0.5);
        draw.schedule(() => {
          const sec = sectionAt(t);
          const big = !!sec && (sec.kind === 'chorus' || sec.kind === 'drop' || sec.kind === 'solo');
          conductor.emit('beat', { beat: b, bar: Math.floor(b / 4), downbeat: ((b % 4) + 4) % 4 === 0 });
          if (((b % 4) + 4) % 4 === 0) conductor.emit('bar', { bar: Math.floor(b / 4), chord: '' });
          conductor.emit('note', { who: 'owl', midi: 60 + (((b % 8) + 8) % 8), dur: 2, vel: big ? 1 : 0.5 });
          if (sec && sec.kind !== 'intro') conductor.emit('note', { who: 'fox', midi: 64 + (((b % 5) + 5) % 5), dur: 2, vel: big ? 1 : 0.6 });
          if (big && ((b % 4) + 4) % 4 === 0) conductor.emit('backing', { midis: [67, 71, 74], syl: 'ooh', durSec: (60 / map.bpm) * 3 });
        }, time);
      }, t);
    });

    // onsets -> drum hits (and Gary plucks on the kicks)
    for (const o of map.onsets) {
      tr.schedule((time) => {
        draw.schedule(() => {
          conductor.emit('hit', { kind: o.kind, vel: o.vel });
          if (o.kind === 'kick') conductor.emit('note', { who: 'sloth', midi: 40, dur: 2, vel: o.vel });
        }, time);
      }, o.t);
    }

    // goat screams exactly on the downbeat of big sections
    map.sections.forEach((s) => {
      if (!s.hype) return;
      tr.schedule((time) => {
        engine.meeeh(time);
        draw.schedule(() => conductor.emit('hype', { source: 'song' }), time);
      }, s.start);
    });

    tr.scheduleOnce((time) => draw.schedule(() => this.finish(), time), map.duration + 0.4);

    conductor.state.bpm = map.bpm;
    conductor.state.song = null; // mic mode snaps to semitones (we don't know the key)
    conductor.state.playing = true;
    this.restoreBeat = conductor.state.beatSource;
    conductor.state.beatSource = () => this.beatAt(tr.getSecondsAtTime(Tone.immediate()));
    conductor.state.quantize = () => this.nextGrid();
    Tone.getDraw().schedule(() => conductor.emit('songStart', { song: pseudo }), Tone.now());
    tr.start('+0.1');
  }

  /** Fractional beat number at track time t (downbeats land on multiples of 4). */
  beatAt(t: number): number {
    const m = this.map;
    if (!m || !m.beats.length) return 0;
    const b = m.beats;
    if (t <= b[0]) {
      const p = b.length > 1 ? b[1] - b[0] : 0.5;
      return (t - b[0]) / p - m.downbeat;
    }
    let lo = 0;
    let hi = b.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (b[mid] <= t) lo = mid;
      else hi = mid;
    }
    if (t >= b[b.length - 1]) return b.length - 1 - m.downbeat + (t - b[b.length - 1]) / (60 / m.bpm);
    return lo + (t - b[lo]) / (b[lo + 1] - b[lo]) - m.downbeat;
  }

  /** Audio-context time of the next 16th on the track's beat grid (for click licks). */
  private nextGrid(): number {
    const tr = Tone.getTransport();
    const now = Tone.now();
    const t = tr.getSecondsAtTime(now);
    const beat = this.beatAt(t);
    const next = Math.ceil(beat * 4 + 0.01) / 4;
    const m = this.map!;
    const spb = 60 / m.bpm;
    return now + Math.max(0.005, (next - beat) * spb);
  }

  /** Per animation frame: section changes + the cat mouthing along to the vocals. */
  sync() {
    const m = this.map;
    if (!m || !this.pseudo) return;
    const tr = Tone.getTransport();
    if (tr.state !== 'started') return;
    const t = tr.getSecondsAtTime(Tone.immediate());
    const i = m.sections.findIndex((s) => t >= s.start && t < s.end);
    if (i >= 0 && i !== this.secIndex) {
      this.secIndex = i;
      const sec = this.sections[i];
      conductor.state.section = sec;
      conductor.state.intensity = sec.section.intensity;
      conductor.state.soloist = sec.soloist;
      conductor.emit('section', { section: sec, song: this.pseudo });
      conductor.emit('solo', { who: sec.soloist });
    }
    const f = Math.floor(t * m.frameRate);
    conductor.state.vocal = m.vocal[f] ?? 0;
  }

  private finish() {
    const cb = this.onEnd;
    const pseudo = this.pseudo;
    this.stop();
    if (pseudo) conductor.emit('songEnd', { song: pseudo });
    cb?.();
  }

  skip() {
    if (this.map) this.finish();
  }

  stop() {
    if (!this.map && !this.player) return;
    const tr = Tone.getTransport();
    tr.stop();
    tr.cancel(0);
    if (this.player) {
      const p = this.player;
      p.unsync();
      p.stop();
      p.dispose();
    }
    this.player = null;
    this.map = null;
    this.onEnd = null;
    this.pseudo = null;
    if (this.restoreBeat) conductor.state.beatSource = this.restoreBeat;
    this.restoreBeat = null;
    conductor.state.quantize = null;
    conductor.state.vocal = 0;
    conductor.state.playing = false;
    conductor.state.section = null;
    conductor.state.soloist = null;
  }
}

export const trackPlayer = new TrackPlayer();
