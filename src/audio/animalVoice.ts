// The animal voice synth. No samples: a buzzy source oscillator is pushed
// through three formant band-pass filters whose frequencies glide between
// vowel shapes ("m" -> "ee" -> "aa" -> "oo" = meow). Each note starts slightly
// flat and snaps up to pitch (that's the autotune), then grows vibrato.

import * as Tone from 'tone';
import type { VoiceKind } from '../songs/types';

type Formants = [number, number, number];

const VOWEL: Record<string, Formants> = {
  m: [260, 900, 2200],
  i: [310, 2300, 3000],
  e: [470, 1900, 2600],
  a: [760, 1250, 2550],
  ae: [660, 1700, 2400],
  o: [470, 860, 2450],
  u: [330, 780, 2250],
  r: [420, 1300, 1650],
  n: [280, 1600, 2600],
};

export interface VoicePreset {
  osc: 'sawtooth' | 'square' | 'triangle' | 'sine';
  /** Multiplies every formant: small animals = higher. */
  formantShift: number;
  /** Semitones the note scoops up from (autotune snap). */
  scoop: number;
  vibratoRate: number;
  /** Cents of vibrato at full bloom. */
  vibratoDepth: number;
  /** 0..1 rolling-r amplitude flutter. */
  trem: number;
  tremRate: number;
  /** Breath noise level. */
  breath: number;
  /** Octave offset applied to every note. */
  octave: number;
  q: number;
  gain: number;
}

export const PRESETS: Record<VoiceKind, VoicePreset> = {
  cat: { osc: 'sawtooth', formantShift: 1.25, scoop: 2.5, vibratoRate: 5.5, vibratoDepth: 35, trem: 0, tremRate: 24, breath: 0.08, octave: 0, q: 7, gain: 1 },
  wolf: { osc: 'triangle', formantShift: 0.9, scoop: 5, vibratoRate: 4.5, vibratoDepth: 45, trem: 0, tremRate: 20, breath: 0.12, octave: 0, q: 6, gain: 1.4 },
  penguin: { osc: 'square', formantShift: 0.95, scoop: 1, vibratoRate: 6, vibratoDepth: 15, trem: 0, tremRate: 30, breath: 0.02, octave: 0, q: 9, gain: 0.7 },
  goat: { osc: 'sawtooth', formantShift: 1.05, scoop: 1, vibratoRate: 9, vibratoDepth: 90, trem: 0.55, tremRate: 9, breath: 0.15, octave: 0, q: 5, gain: 1.1 },
  owl: { osc: 'sine', formantShift: 0.8, scoop: 3, vibratoRate: 3, vibratoDepth: 20, trem: 0, tremRate: 10, breath: 0.2, octave: -1, q: 4, gain: 1.6 },
  raccoon: { osc: 'square', formantShift: 1.4, scoop: 0, vibratoRate: 7, vibratoDepth: 20, trem: 0, tremRate: 30, breath: 0.1, octave: 0, q: 6, gain: 0.8 },
};

/** Map a syllable to a list of [vowel, position 0..1] targets + whether it rolls its r's. */
function shapeFor(syl: string): { path: [string, number][]; roll: boolean; nasal: boolean } {
  const s = syl.toLowerCase().replace(/[^a-z]/g, '');
  const roll = /rr|pr/.test(s);
  const nasal = /nk|ny|^n/.test(s);
  if (/^m.*(ow|ao|aow)/.test(s)) return { path: [['m', 0], ['i', 0.15], ['a', 0.5], ['u', 0.9]], roll, nasal };
  if (/^mr+o/.test(s)) return { path: [['m', 0], ['r', 0.2], ['a', 0.5], ['u', 0.9]], roll: true, nasal };
  if (/^me+/.test(s)) return { path: [['m', 0], ['e', 0.2], ['e', 0.8], ['ae', 1]], roll, nasal };
  if (/^mew|^mya/.test(s)) return { path: [['m', 0], ['i', 0.3], ['u', 1]], roll, nasal };
  if (/^nya/.test(s)) return { path: [['n', 0], ['i', 0.2], ['a', 0.6]], roll, nasal: true };
  if (/^pr|^mr/.test(s)) return { path: [['m', 0], ['r', 0.3], ['r', 1]], roll: true, nasal };
  if (/a?woo|ahoo|ahro/.test(s)) return { path: [['a', 0], ['o', 0.35], ['u', 0.7]], roll, nasal };
  if (/honk|onk|nk/.test(s)) return { path: [['a', 0], ['o', 0.5], ['n', 1]], roll, nasal: true };
  if (/^(w?ho+|hu)/.test(s)) return { path: [['u', 0], ['u', 1]], roll, nasal };
  if (/^o+h/.test(s)) return { path: [['o', 0], ['u', 0.6]], roll, nasal };
  if (/^ba+/.test(s)) return { path: [['m', 0], ['a', 0.2], ['ae', 1]], roll, nasal };
  if (/squ|sk|chk|chr/.test(s)) return { path: [['i', 0], ['i', 0.5], ['e', 1]], roll, nasal };
  if (/^a/.test(s)) return { path: [['a', 0], ['u', 0.8]], roll, nasal };
  return { path: [['e', 0], ['a', 0.5]], roll, nasal };
}

/** Every voice, so one watchdog can put idle ones to sleep. */
const VOICES = new Set<AnimalVoice>();
let watchdog = 0;

export class AnimalVoice {
  // sources only run while singing: nine always-on voices (osc + noise + four
  // filters each) were a big slice of the audio thread's budget
  private running = false;
  private activeUntil = 0;
  private lastStopAt = 0;

  readonly output: Tone.Gain;
  preset: VoicePreset;
  kind: VoiceKind;
  private osc: Tone.Oscillator;
  private filters: Tone.Filter[];
  private amp: Tone.Gain;
  private trem: Tone.Gain;
  private tremLfo: Tone.LFO;
  private vib: Tone.LFO;
  private breathGain: Tone.Gain;
  private noise: Tone.Noise;
  private body: Tone.Filter;

  constructor(kind: VoiceKind) {
    this.kind = kind;
    this.preset = PRESETS[kind];
    this.output = new Tone.Gain(this.preset.gain);
    this.amp = new Tone.Gain(0);
    this.trem = new Tone.Gain(1);
    this.osc = new Tone.Oscillator({ type: this.preset.osc, frequency: 220 });

    // vibrato & tremolo: LFOs centred on "no effect", amplitude = depth
    this.vib = new Tone.LFO({ frequency: this.preset.vibratoRate, min: -this.preset.vibratoDepth, max: this.preset.vibratoDepth }).start();
    this.vib.amplitude.value = 0;
    this.vib.connect(this.osc.detune);
    this.tremLfo = new Tone.LFO({ frequency: this.preset.tremRate, min: 0, max: 2 }).start();
    this.tremLfo.amplitude.value = 0;
    this.tremLfo.connect(this.trem.gain);

    this.filters = [0, 1, 2].map(
      (i) => new Tone.Filter({ type: 'bandpass', frequency: VOWEL.a[i], Q: this.preset.q - i }),
    );
    const fGains = [1, 0.7, 0.35].map((g) => new Tone.Gain(g * 2.2));
    this.filters.forEach((f, i) => {
      this.osc.connect(f);
      f.connect(fGains[i]);
      fGains[i].connect(this.trem);
    });
    // a little low body so the pitch reads clearly
    this.body = new Tone.Filter({ type: 'lowpass', frequency: 900 });
    const bodyGain = new Tone.Gain(0.25);
    this.osc.chain(this.body, bodyGain, this.trem);

    this.noise = new Tone.Noise('pink');
    this.breathGain = new Tone.Gain(0);
    const breathFilter = new Tone.Filter({ type: 'bandpass', frequency: 2500, Q: 1 });
    this.noise.chain(breathFilter, this.breathGain, this.trem);

    this.trem.connect(this.amp);
    this.amp.connect(this.output);
  }

  setPresetIfNeeded(kind: VoiceKind) {
    if (kind !== this.kind) this.setPreset(kind);
  }

  setPreset(kind: VoiceKind) {
    this.kind = kind;
    this.preset = PRESETS[kind];
    this.osc.type = this.preset.osc;
    this.vib.frequency.value = this.preset.vibratoRate;
    this.vib.min = -this.preset.vibratoDepth;
    this.vib.max = this.preset.vibratoDepth;
    this.tremLfo.frequency.value = this.preset.tremRate;
    this.output.gain.value = this.preset.gain;
  }

  private setFormants(v: Formants, time: number, ramp: boolean) {
    const k = this.preset.formantShift;
    this.filters.forEach((f, i) => {
      if (ramp) f.frequency.linearRampToValueAtTime(v[i] * k, time);
      else f.frequency.setValueAtTime(v[i] * k, time);
    });
  }

  /** Sing one note. `midi` is the written pitch; time is AudioContext time. */
  private wake(time: number, until: number) {
    if (!this.running) {
      const t = Math.max(time, this.lastStopAt + 0.005);
      this.osc.start(t);
      this.noise.start(t);
      this.running = true;
    }
    this.activeUntil = Math.max(this.activeUntil, until);
    VOICES.add(this);
    if (!watchdog) {
      watchdog = window.setInterval(() => {
        const now = Tone.now();
        for (const v of VOICES) v.sleepIfIdle(now);
      }, 500);
    }
  }

  private sleepIfIdle(now: number) {
    if (!this.running || now < this.activeUntil + 0.4) return;
    this.lastStopAt = now + 0.01;
    this.osc.stop(this.lastStopAt);
    this.noise.stop(this.lastStopAt);
    this.running = false;
  }

  sing(midi: number, durSec: number, time: number, syl: string, vel = 0.9) {
    this.wake(time, time + Math.max(0.08, durSec) + 0.2);
    const p = this.preset;
    const t = time;
    const freq = Tone.Frequency(midi + p.octave * 12, 'midi').toFrequency();
    const { path, roll, nasal } = shapeFor(syl);
    const d = Math.max(0.08, durSec);

    // pitch: scoop up and snap (autotune!), small fall at the very end
    this.osc.frequency.cancelScheduledValues(t);
    this.osc.frequency.setValueAtTime(freq * Math.pow(2, -p.scoop / 12), t);
    this.osc.frequency.exponentialRampToValueAtTime(freq, t + Math.min(0.09, d * 0.4));
    if (d > 0.4) {
      this.osc.frequency.setValueAtTime(freq, t + d * 0.92);
      this.osc.frequency.exponentialRampToValueAtTime(freq * 0.97, t + d);
    }

    // formant journey through the syllable
    this.filters.forEach((f) => f.frequency.cancelScheduledValues(t));
    this.setFormants(VOWEL[path[0][0]], t, false);
    for (const [v, pos] of path.slice(1)) this.setFormants(VOWEL[v], t + pos * d, true);
    this.body.frequency.setValueAtTime(nasal ? 500 : 900, t);

    // amplitude envelope ("m" onsets are softer)
    const attack = path[0][0] === 'm' ? 0.05 : 0.02;
    const g = this.amp.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(vel, t + attack);
    g.setValueAtTime(vel * 0.9, t + Math.max(attack, d * 0.85));
    g.linearRampToValueAtTime(0, t + d + 0.06);

    // vibrato blooms on long notes
    this.vib.amplitude.cancelScheduledValues(t);
    this.vib.amplitude.setValueAtTime(0, t);
    if (d > 0.25) this.vib.amplitude.linearRampToValueAtTime(1, t + Math.min(d, 0.7));

    this.tremLfo.amplitude.cancelScheduledValues(t);
    this.tremLfo.amplitude.setValueAtTime(roll ? Math.max(0.5, p.trem) : p.trem, t);

    this.breathGain.gain.cancelScheduledValues(t);
    this.breathGain.gain.setValueAtTime(p.breath * vel, t);
    this.breathGain.gain.linearRampToValueAtTime(0, t + d);

  }

  // ---- continuous mode (microphone): keep the voice open and steer it live
  glide(freq: number, level: number, vowel: keyof typeof VOWEL = 'a') {
    const now = Tone.now();
    this.wake(now, now + 0.6);
    const f = freq * Math.pow(2, this.preset.octave);
    this.osc.frequency.cancelScheduledValues(now);
    this.osc.frequency.linearRampToValueAtTime(f, now + 0.04);
    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.linearRampToValueAtTime(level, now + 0.05);
    this.vib.amplitude.linearRampToValueAtTime(level > 0.05 ? 0.6 : 0, now + 0.2);
    this.tremLfo.amplitude.setValueAtTime(this.preset.trem, now);
    this.filters.forEach((fl) => fl.frequency.cancelScheduledValues(now));
    this.setFormants(VOWEL[vowel], now + 0.08, true);
  }

  silence() {
    const now = Tone.now();
    this.amp.gain.cancelScheduledValues(now);
    this.amp.gain.linearRampToValueAtTime(0, now + 0.08);
    this.breathGain.gain.cancelScheduledValues(now);
    this.breathGain.gain.linearRampToValueAtTime(0, now + 0.08);
  }

  dispose() {
    VOICES.delete(this);
    this.running = false;
    [this.osc, this.vib, this.tremLfo, this.noise, this.amp, this.trem, this.output, this.breathGain, this.body, ...this.filters].forEach((n) =>
      n.dispose(),
    );
  }
}
