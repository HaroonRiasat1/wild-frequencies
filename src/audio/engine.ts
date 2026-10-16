// The audio engine: every instrument, the psychedelic effects rack, the mixer
// channels and the crowd. Built once, after the "Doors open" click unlocks audio.

import * as Tone from 'tone';
import { conductor } from '../conductor/conductor';
import type { CharacterId, DrumKind, InstrumentId } from '../songs/types';
import { AnimalVoice } from './animalVoice';

const INSTRUMENT_IDS: InstrumentId[] = ['drums', 'bass', 'guitar', 'keys', 'vocals', 'backing', 'hype'];

class Engine {
  ready = false;

  // master + analysis
  master!: Tone.Gain;
  volume!: Tone.Volume;
  fft!: Tone.FFT;
  meter!: Tone.Meter;

  // FX
  reverb!: Tone.Reverb;
  delay!: Tone.FeedbackDelay;
  private reverbSend!: Tone.Gain;
  private delaySend!: Tone.Gain;
  private masterFilter!: Tone.Filter;
  private recordDest: MediaStreamAudioDestinationNode | null = null;

  ch!: Record<InstrumentId, Tone.Channel>;

  // drums
  private kick!: Tone.MembraneSynth;
  private snare!: Tone.NoiseSynth;
  private snareBody!: Tone.MembraneSynth;
  // cymbals are filtered noise: MetalSynth's FM banks run constantly and cost
  // more CPU than the whole rest of the band
  private hat!: Tone.NoiseSynth;
  private openHat!: Tone.NoiseSynth;
  private clap!: Tone.NoiseSynth;
  private tomHi!: Tone.MembraneSynth;
  private tomLo!: Tone.MembraneSynth;
  private crash!: Tone.NoiseSynth;
  private ride!: Tone.NoiseSynth;
  private tamb!: Tone.NoiseSynth;

  // melodic
  bass!: Tone.MonoSynth;
  pad!: Tone.PolySynth;
  keys!: Tone.PolySynth;
  lead!: Tone.MonoSynth;
  guitar!: Tone.PolySynth;
  guitarLead!: Tone.MonoSynth;
  private padFilter!: Tone.Filter;

  // voices
  cat!: AnimalVoice;
  penguins!: AnimalVoice[];
  goat!: AnimalVoice;
  raccoon!: AnimalVoice;
  owlVoice!: AnimalVoice;
  private crowdWoo!: AnimalVoice[];

  // crowd
  private roar!: Tone.Noise;
  private murmurNoise!: Tone.Noise;
  private roarOffTimer = 0;
  private murmurOffTimer = 0;
  private roarGain!: Tone.Gain;
  private roarFilter!: Tone.Filter;
  private murmurGain!: Tone.Gain;
  private applause!: Tone.NoiseSynth;
  private whine!: Tone.Oscillator;
  private whineGain!: Tone.Gain;
  private boom!: Tone.MembraneSynth;
  private crowdBus!: Tone.Gain;

  private applauseLast = 0;
  /** Last start time per drum voice — Tone asserts strictly increasing times. */
  private lastHit: Partial<Record<DrumKind | 'tamb', number>> = {};

  private at(kind: DrumKind | 'tamb', time: number): number {
    const last = this.lastHit[kind] ?? 0;
    const t = time <= last ? last + 0.002 : time;
    this.lastHit[kind] = t;
    return t;
  }

  /** Upload mode */
  player: Tone.Player | null = null;
  playerAnalyser: AnalyserNode | null = null;

  async init() {
    if (this.ready) return;
    await Tone.start();
    const ctx = Tone.getContext();
    ctx.lookAhead = 0.08;

    this.volume = new Tone.Volume(-4).toDestination();
    const limiter = new Tone.Limiter(-1).connect(this.volume);
    const comp = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.01, release: 0.2 }).connect(limiter);
    this.masterFilter = new Tone.Filter({ type: 'lowpass', frequency: 20000, rolloff: -24, Q: 2 }).connect(comp);
    this.master = new Tone.Gain(0.9).connect(this.masterFilter);
    this.fft = new Tone.FFT({ size: 512, smoothing: 0.6 });
    this.meter = new Tone.Meter({ smoothing: 0.7 });
    limiter.connect(this.fft);
    limiter.connect(this.meter);

    // ---- FX rack: big reverb + wobbly tape delay
    this.reverb = new Tone.Reverb({ decay: 3.4, preDelay: 0.03, wet: 1 }).connect(this.master);
    this.reverbSend = new Tone.Gain(1).connect(this.reverb);
    const tapeTone = new Tone.Filter({ type: 'lowpass', frequency: 2800 }).connect(this.master);
    this.delay = new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.38, wet: 1 }).connect(tapeTone);
    tapeTone.connect(this.reverbSend);
    const wow = new Tone.Vibrato({ frequency: 0.7, depth: 0.12, wet: 1 }).connect(this.delay);
    this.delaySend = new Tone.Gain(1).connect(wow);

    const sends: Record<InstrumentId, [number, number]> = {
      drums: [0.12, 0], bass: [0.05, 0], guitar: [0.3, 0.2], keys: [0.45, 0.3], vocals: [0.4, 0.25], backing: [0.6, 0.1], hype: [0.3, 0.3],
    };
    const vols: Record<InstrumentId, number> = { drums: -3, bass: 2, guitar: -8, keys: -4, vocals: -1, backing: -12, hype: -3 };
    this.ch = {} as Record<InstrumentId, Tone.Channel>;
    for (const id of INSTRUMENT_IDS) {
      const c = new Tone.Channel({ volume: vols[id] }).connect(this.master);
      const rs = new Tone.Gain(sends[id][0]).connect(this.reverbSend);
      const ds = new Tone.Gain(sends[id][1]).connect(this.delaySend);
      c.connect(rs);
      c.connect(ds);
      this.ch[id] = c;
    }

    this.buildDrums();
    this.buildMelodic();
    this.buildVoices();
    this.buildCrowd();
    await this.reverb.ready;
    this.ready = true;
  }

  private buildDrums() {
    const bus = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.003, release: 0.12 }).connect(this.ch.drums);
    const crunch = new Tone.Distortion({ distortion: 0.12, wet: 0.35 }).connect(bus);
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.045, octaves: 6.5, oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.1 }, volume: 2,
    }).connect(crunch);
    this.snareBody = new Tone.MembraneSynth({
      pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -10,
    }).connect(crunch);
    const snareTone = new Tone.Filter({ type: 'highpass', frequency: 900 }).connect(crunch);
    this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.17, sustain: 0 }, volume: -5 }).connect(snareTone);
    const clapTone = new Tone.Filter({ type: 'bandpass', frequency: 1400, Q: 0.8 }).connect(crunch);
    this.clap = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.004, decay: 0.14, sustain: 0 }, volume: -2 }).connect(clapTone);
    const hatTone = new Tone.Filter({ type: 'highpass', frequency: 7500, Q: 0.8 }).connect(bus);
    this.hat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.045, sustain: 0 }, volume: -15 }).connect(hatTone);
    this.openHat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.3, sustain: 0 }, volume: -19 }).connect(hatTone);
    const rideTone = new Tone.Filter({ type: 'bandpass', frequency: 6200, Q: 1.6 }).connect(bus);
    this.ride = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.45, sustain: 0 }, volume: -16 }).connect(rideTone);
    const crashTone = new Tone.Filter({ type: 'highpass', frequency: 3800 }).connect(bus);
    this.crash = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 1.3, sustain: 0 }, volume: -15 }).connect(crashTone);
    this.tomHi = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 3, envelope: { attack: 0.001, decay: 0.3, sustain: 0 }, volume: -4 }).connect(crunch);
    this.tomLo = new Tone.MembraneSynth({ pitchDecay: 0.06, octaves: 3, envelope: { attack: 0.001, decay: 0.4, sustain: 0 }, volume: -3 }).connect(crunch);
    const tambTone = new Tone.Filter({ type: 'highpass', frequency: 6500 }).connect(this.ch.hype);
    this.tamb = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.07, sustain: 0 }, volume: -14 }).connect(tambTone);
  }

  private buildMelodic() {
    // Gary's bass: fat, round, slightly seasick
    const wobble = new Tone.Vibrato({ frequency: 4, depth: 0.06 }).connect(this.ch.bass);
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'fatsawtooth', count: 2, spread: 12 } as Tone.OmniOscillatorOptions,
      filter: { Q: 3, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.55, release: 0.12 },
      filterEnvelope: { attack: 0.004, decay: 0.18, sustain: 0.25, release: 0.2, baseFrequency: 110, octaves: 3.2 },
      volume: 0,
    }).connect(wobble);

    // The owl's pad: phaser -> chorus. Neo-psychedelia in a box.
    const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.5, depth: 0.7, wet: 0.6 }).start().connect(this.ch.keys);
    const phaser = new Tone.Phaser({ frequency: 0.22, octaves: 3, baseFrequency: 380, wet: 0.65 }).connect(chorus);
    this.padFilter = new Tone.Filter({ type: 'lowpass', frequency: 1700, Q: 1 }).connect(phaser);
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 28 } as Tone.OmniOscillatorOptions,
      envelope: { attack: 0.6, decay: 0.6, sustain: 0.7, release: 2.2 },
      volume: -12,
    }).connect(this.padFilter);
    this.keys = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square8' } as Tone.OmniOscillatorOptions,
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.15, release: 0.4 },
      volume: -18,
    }).connect(phaser);
    this.lead = new Tone.MonoSynth({
      oscillator: { type: 'square' },
      portamento: 0.06,
      filter: { Q: 2, type: 'lowpass' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.7, release: 0.5 },
      filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.5, baseFrequency: 600, octaves: 2.5 },
      volume: -14,
    }).connect(chorus);

    // Rusty's glittery Telecaster
    const gChorus = new Tone.Chorus({ frequency: 2, delayTime: 2.5, depth: 0.5, wet: 0.4 }).start().connect(this.ch.guitar);
    const drive = new Tone.Distortion({ distortion: 0.45, wet: 0.7 }).connect(gChorus);
    const gTone = new Tone.Filter({ type: 'lowpass', frequency: 3200 }).connect(drive);
    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsquare', count: 2, spread: 10 } as Tone.OmniOscillatorOptions,
      envelope: { attack: 0.003, decay: 0.12, sustain: 0.2, release: 0.12 },
      volume: -14,
    }).connect(gTone);
    const soloDelay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0.25 }).connect(this.ch.guitar);
    const soloDrive = new Tone.Distortion({ distortion: 0.7, wet: 0.85 }).connect(soloDelay);
    const soloTone = new Tone.Filter({ type: 'lowpass', frequency: 3600 }).connect(soloDrive);
    this.guitarLead = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      portamento: 0.025,
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.6, release: 0.25 },
      filterEnvelope: { attack: 0.004, decay: 0.2, sustain: 0.7, baseFrequency: 900, octaves: 2 },
      volume: -12,
    }).connect(soloTone);
  }

  private buildVoices() {
    this.cat = new AnimalVoice('cat');
    this.cat.output.connect(this.ch.vocals);
    this.penguins = [0, 1, 2].map(() => {
      const v = new AnimalVoice('penguin');
      v.output.connect(this.ch.backing);
      return v;
    });
    this.goat = new AnimalVoice('goat');
    this.goat.output.connect(this.ch.hype);
    this.owlVoice = new AnimalVoice('owl');
    this.owlVoice.output.connect(this.ch.keys);
  }

  private buildCrowd() {
    this.crowdBus = new Tone.Gain(0.8).connect(this.master);
    this.crowdBus.connect(this.reverbSend);
    this.roarFilter = new Tone.Filter({ type: 'bandpass', frequency: 900, Q: 0.6 });
    this.roarGain = new Tone.Gain(0).connect(this.crowdBus);
    this.roar = new Tone.Noise('pink');
    this.roar.chain(this.roarFilter, this.roarGain);

    const murmurFilter = new Tone.Filter({ type: 'lowpass', frequency: 520 });
    this.murmurGain = new Tone.Gain(0).connect(this.crowdBus);
    const murmurAm = new Tone.Gain(1);
    const lfo = new Tone.LFO({ frequency: 0.35, min: 0.4, max: 1 }).start();
    lfo.connect(murmurAm.gain);
    this.murmurNoise = new Tone.Noise('brown');
    this.murmurNoise.chain(murmurFilter, murmurAm, this.murmurGain);

    const applauseTone = new Tone.Filter({ type: 'bandpass', frequency: 2000, Q: 0.5 }).connect(this.crowdBus);
    this.applause = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 }, volume: -12 }).connect(applauseTone);

    this.raccoon = new AnimalVoice('raccoon');
    this.raccoon.output.connect(this.crowdBus);
    this.crowdWoo = [0, 1].map(() => {
      const v = new AnimalVoice('wolf');
      v.output.gain.value = 0.35;
      v.output.connect(this.crowdBus);
      return v;
    });

    this.whineGain = new Tone.Gain(0).connect(this.crowdBus);
    this.whine = new Tone.Oscillator({ type: 'sine', frequency: 2900 }).start().connect(this.whineGain);

    this.boom = new Tone.MembraneSynth({ pitchDecay: 0.2, octaves: 4, envelope: { attack: 0.001, decay: 1.2, sustain: 0 }, volume: -2 }).connect(this.master);
  }

  // ------------------------------------------------------------------ playing

  drum(kind: DrumKind, t0: number, vel: number) {
    const time = this.at(kind, t0);
    switch (kind) {
      case 'kick': this.kick.triggerAttackRelease('C1', '8n', time, vel); break;
      case 'snare':
        this.snare.triggerAttackRelease('16n', time, vel);
        this.snareBody.triggerAttackRelease('G3', '32n', time, vel * 0.8);
        break;
      case 'clap': this.clap.triggerAttackRelease('16n', time, vel); break;
      case 'hat': this.hat.triggerAttackRelease('32n', time, vel * 0.8); break;
      case 'openHat': this.openHat.triggerAttackRelease('8n', time, vel * 0.8); break;
      case 'ride': this.ride.triggerAttackRelease('8n', time, vel * 0.7); break;
      case 'crash': this.crash.triggerAttackRelease('2n', time, vel); break;
      case 'tomHi': this.tomHi.triggerAttackRelease('A2', '8n', time, vel); break;
      case 'tomLo': this.tomLo.triggerAttackRelease('E2', '8n', time, vel); break;
    }
  }

  tambourine(time: number, vel: number) {
    this.tamb.triggerAttackRelease('32n', this.at('tamb', time), vel);
  }

  setPadBrightness(b: number) {
    this.padFilter?.frequency.rampTo(900 + b * 2400, 0.5);
  }

  setVolume(v: number) {
    if (!this.volume) return;
    this.volume.volume.rampTo(v <= 0.001 ? -Infinity : Tone.gainToDb(v) - 2, 0.1);
  }

  setAudible(id: InstrumentId, audible: boolean) {
    if (this.ch) this.ch[id].mute = !audible;
  }

  /** Next 16th on the grid if a song is running, otherwise "right now". */
  quantized(): number {
    if (conductor.state.quantize) return conductor.state.quantize();
    const tr = Tone.getTransport();
    if (tr.state === 'started') return tr.nextSubdivision('16n');
    return Tone.now() + 0.03;
  }

  /** The "you clicked me" mini-solos. */
  lick(who: CharacterId) {
    if (!this.ready) return;
    const t = this.quantized();
    const s16 = Tone.Time('16n').toSeconds();
    switch (who) {
      case 'cat':
        this.cat.sing(76, s16 * 2, t, 'mrrp');
        this.cat.sing(81, s16 * 2, t + s16 * 2, 'mew');
        this.cat.sing(84, s16 * 6, t + s16 * 4, 'MEEEOWW');
        break;
      case 'fox':
        [64, 67, 69, 71, 74, 76, 79, 81].forEach((m, i) =>
          this.guitarLead.triggerAttackRelease(Tone.Frequency(m, 'midi').toFrequency(), s16 * 0.9, t + i * s16 * 0.75, 0.9));
        this.guitarLead.frequency.setValueAtTime(Tone.Frequency(83, 'midi').toFrequency(), t + 8 * s16 * 0.75);
        this.guitarLead.triggerAttackRelease(Tone.Frequency(83, 'midi').toFrequency(), s16 * 4, t + 8 * s16 * 0.75, 1);
        break;
      case 'sloth':
        this.bass.triggerAttackRelease('E1', s16 * 6, t, 1);
        this.bass.triggerAttackRelease('B1', s16 * 6, t + s16 * 8, 0.8);
        this.owlVoice.sing(45, 1.4, t + 0.1, 'aaaah');
        break;
      case 'octopus':
        for (let i = 0; i < 8; i++) this.drum(i < 4 ? 'tomHi' : 'tomLo', t + i * s16 * 0.5, 0.9);
        this.drum('crash', t + 4 * s16, 1);
        this.drum('kick', t + 4 * s16, 1);
        break;
      case 'owl':
        [60, 64, 67, 71, 72, 76, 79, 83].forEach((m, i) =>
          this.keys.triggerAttackRelease(Tone.Frequency(m, 'midi').toFrequency(), s16, t + i * s16 * 0.5, 0.7));
        this.owlVoice.sing(67, 0.35, t + s16 * 4, 'hoo');
        this.owlVoice.sing(64, 0.6, t + s16 * 6, 'whoooo');
        break;
      case 'penguins':
        [67, 71, 74].forEach((m, i) => this.penguins[i].sing(m, 0.5, t, 'honk'));
        [69, 72, 76].forEach((m, i) => this.penguins[i].sing(m, 0.7, t + 0.55, 'hoonk'));
        break;
      case 'goat':
        this.meeeh(t);
        break;
    }
  }

  meeeh(time?: number) {
    if (!this.ready) return;
    const t = time ?? Tone.now() + 0.02;
    this.goat.sing(57 + Math.floor(Math.random() * 5), 0.95, t, 'MEEEEH');
  }

  // ------------------------------------------------------------------ crowd

  murmur(on: boolean) {
    if (!this.ready) return;
    window.clearTimeout(this.murmurOffTimer);
    if (on && this.murmurNoise.state !== 'started') this.murmurNoise.start();
    this.murmurGain.gain.rampTo(on ? 0.12 : 0, on ? 1.5 : 2);
    if (!on) this.murmurOffTimer = window.setTimeout(() => this.murmurNoise.state === 'started' && this.murmurNoise.stop(), 2600);
  }

  cheerStart() {
    if (!this.ready) return;
    window.clearTimeout(this.roarOffTimer);
    if (this.roar.state !== 'started') this.roar.start();
    const now = Tone.now();
    this.roarGain.gain.cancelScheduledValues(now);
    this.roarGain.gain.linearRampToValueAtTime(0.55, now + 0.25);
    this.roarFilter.frequency.rampTo(1300, 0.4);
    this.crowdWoo.forEach((v, i) => {
      const base = 62 + Math.floor(Math.random() * 10);
      v.sing(base, 0.5 + Math.random() * 0.4, now + 0.05 + i * 0.13, 'woooo');
    });
  }

  cheerStop() {
    if (!this.ready) return;
    const now = Tone.now();
    this.roarGain.gain.cancelScheduledValues(now);
    this.roarGain.gain.setValueAtTime(this.roarGain.gain.value, now);
    this.roarGain.gain.linearRampToValueAtTime(0, now + 1.4);
    this.roarFilter.frequency.rampTo(900, 1);
    this.roarOffTimer = window.setTimeout(() => this.roar.state === 'started' && this.roar.stop(), 1700);
  }

  applaud(seconds = 3, density = 60) {
    if (!this.ready) return;
    const now = Tone.now();
    const n = Math.floor(seconds * density);
    // a monophonic NoiseSynth needs strictly increasing start times
    const times = Array.from({ length: n }, () => now + 0.01 + Math.random() * seconds).sort((a, b) => a - b);
    for (let i = 0; i < n; i++) {
      const tt = Math.max(times[i], this.applauseLast + 0.004);
      this.applauseLast = tt;
      const fade = 1 - (tt - now) / seconds;
      this.applause.triggerAttackRelease('64n', tt, 0.3 + Math.random() * 0.7 * fade);
    }
    this.cheerStart();
    Tone.getContext().setTimeout(() => this.cheerStop(), seconds * 0.6);
  }

  /** "One two, one two, squeak" + a tiny bit of feedback. */
  micCheck(): number {
    const now = Tone.now() + 0.05;
    const r = this.raccoon;
    r.sing(64, 0.25, now, 'wun');
    r.sing(66, 0.3, now + 0.35, 'too');
    r.sing(64, 0.25, now + 0.9, 'wun');
    r.sing(66, 0.3, now + 1.25, 'too');
    r.sing(88, 0.18, now + 1.9, 'squeak');
    r.sing(91, 0.22, now + 2.1, 'squeeeak');
    this.whineGain.gain.setValueAtTime(0, now + 2.5);
    this.whineGain.gain.linearRampToValueAtTime(0.05, now + 2.9);
    this.whine.frequency.setValueAtTime(2700, now + 2.5);
    this.whine.frequency.linearRampToValueAtTime(3300, now + 3.3);
    this.whineGain.gain.linearRampToValueAtTime(0, now + 3.4);
    return 3.6;
  }

  pyro() {
    if (!this.ready) return;
    this.boom.triggerAttackRelease('A0', '2n', Tone.now() + 0.01, 1);
  }

  // ------------------------------------------------------------------ live remix

  /** DJ filter sweep: the whole mix dives underwater and comes back up. */
  filterSweep() {
    if (!this.ready) return;
    const f = this.masterFilter.frequency;
    const now = Tone.now();
    f.cancelScheduledValues(now);
    f.setValueAtTime(20000, now);
    f.exponentialRampToValueAtTime(350, now + 1.8);
    f.exponentialRampToValueAtTime(20000, now + 3.6);
  }

  /** Echo throw: crank the tape-delay feedback for a couple of seconds. */
  echoThrow() {
    if (!this.ready) return;
    const now = Tone.now();
    this.delay.feedback.cancelScheduledValues(now);
    this.delay.feedback.setValueAtTime(0.75, now);
    this.delay.feedback.linearRampToValueAtTime(0.38, now + 2.5);
    this.delaySend.gain.cancelScheduledValues(now);
    this.delaySend.gain.setValueAtTime(2.5, now);
    this.delaySend.gain.linearRampToValueAtTime(1, now + 2.5);
  }

  /** Drum fill on demand, landing on the grid. */
  fill() {
    if (!this.ready) return;
    const t = this.quantized();
    const s16 = 60 / conductor.state.bpm / 4;
    const kinds: DrumKind[] = ['snare', 'snare', 'tomHi', 'tomHi', 'tomHi', 'tomLo', 'tomLo', 'tomLo'];
    kinds.forEach((k, i) => this.drum(k, t + i * s16, 0.6 + i * 0.05));
    this.drum('crash', t + 8 * s16, 1);
    this.drum('kick', t + 8 * s16, 1);
  }

  /** "Drop it": a sub boom + crash right now. */
  dropBoom() {
    if (!this.ready) return;
    const t = this.quantized();
    this.boom.triggerAttackRelease('A0', '2n', t, 1);
    this.drum('crash', t, 1);
  }

  /** A MediaStream of the master output, for recording clips. */
  recordStream(): MediaStream | null {
    if (!this.ready) return null;
    if (!this.recordDest) {
      const raw = Tone.getContext().rawContext as AudioContext;
      this.recordDest = raw.createMediaStreamDestination();
      Tone.connect(this.volume, this.recordDest);
    }
    return this.recordDest.stream;
  }

  /** A crowd clapping together on a beat (a smear of a few dozen hands). */
  crowdClap(time: number) {
    if (!this.ready) return;
    for (let i = 0; i < 7; i++) {
      const tt = Math.max(time + i * 0.005 + Math.random() * 0.004, this.applauseLast + 0.002);
      this.applauseLast = tt;
      this.applause.triggerAttackRelease('64n', tt, 0.5 + Math.random() * 0.5);
    }
  }

  /** You, clapping. Played immediately (no look-ahead) so it feels instant. */
  userClap() {
    if (!this.ready) return;
    this.drum('clap', Tone.immediate() + 0.005, 0.9);
  }

  /** Greg's T-shirt cannon: a deep "fwoomp". */
  cannon() {
    if (!this.ready) return;
    this.boom.triggerAttackRelease('E1', '8n', Tone.now() + 0.01, 0.8);
    this.cheerStart();
    Tone.getContext().setTimeout(() => this.cheerStop(), 0.8);
  }

  /** A guitar string snapping: a bright pluck that sags out of tune. */
  stringSnap() {
    if (!this.ready) return;
    const t = Tone.now() + 0.01;
    this.guitarLead.triggerAttackRelease(660, 0.6, t, 1);
    this.guitarLead.frequency.setValueAtTime(660, t + 0.02);
    this.guitarLead.frequency.exponentialRampToValueAtTime(140, t + 0.55);
  }

  // ------------------------------------------------------------------ upload mode

  async playUpload(file: File, onEnded: () => void): Promise<number> {
    this.stopUpload();
    const url = URL.createObjectURL(file);
    const player = new Tone.Player();
    await player.load(url);
    player.connect(this.master);
    const raw = Tone.getContext().rawContext as AudioContext;
    const analyser = raw.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.2;
    // widen the dB window so loud masters don't saturate every bin at 255
    analyser.minDecibels = -85;
    analyser.maxDecibels = -5;
    Tone.connect(player, analyser);
    player.onstop = () => {
      if (this.player === player) onEnded();
    };
    player.start('+0.05');
    this.player = player;
    this.playerAnalyser = analyser;
    return player.buffer.duration;
  }

  stopUpload() {
    if (this.player) {
      const p = this.player;
      this.player = null;
      p.onstop = () => {};
      p.stop();
      p.dispose();
    }
    this.playerAnalyser = null;
  }

  /** Spectrum bands (0..1) for the visuals. */
  bands(): { bass: number; mid: number; high: number; level: number } {
    if (!this.ready) return { bass: 0, mid: 0, high: 0, level: 0 };
    const v = this.fft.getValue();
    const n = v.length;
    const nyq = Tone.getContext().sampleRate / 2;
    const bin = (hz: number) => Math.min(n - 1, Math.floor((hz / nyq) * n));
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = bin(a); i <= bin(b); i++) s += v[i] as number;
      return s / (bin(b) - bin(a) + 1);
    };
    const norm = (db: number) => Math.max(0, Math.min(1, (db + 85) / 60));
    const lvl = this.meter.getValue() as number;
    return {
      bass: norm(avg(30, 160)),
      mid: norm(avg(300, 2500)),
      high: norm(avg(5000, 12000) + 10),
      level: Math.max(0, Math.min(1, (lvl + 45) / 42)),
    };
  }
}

export const engine = new Engine();
