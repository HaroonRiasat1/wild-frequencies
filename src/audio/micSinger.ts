// Microphone mode: your voice -> pitch tracking (pitchy, McLeod method) ->
// snapped to the nearest semitone (or the current song's scale) -> an animal
// voice sings it live.

import { PitchDetector } from 'pitchy';
import * as Tone from 'tone';
import { conductor } from '../conductor/conductor';
import { freqToMidi, midiToFreq, midiToNote, snapMidi } from '../songs/theory';
import type { MicAnimal } from '../state/store';
import { AnimalVoice } from './animalVoice';
import { engine } from './engine';

const VOWELS = ['a', 'o', 'e', 'u'] as const;

export class MicSinger {
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: PitchDetector<Float32Array<ArrayBuffer>> | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private voice: AnimalVoice | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  level = 0;
  note: string | null = null;
  private vowelT = 0;

  get active() {
    return !!this.stream;
  }

  async start(animal: MicAnimal) {
    if (this.stream) return;
    const raw = Tone.getContext().rawContext as AudioContext;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.source = raw.createMediaStreamSource(this.stream);
    this.analyser = raw.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.detector = PitchDetector.forFloat32Array(this.analyser.fftSize);
    this.detector.minVolumeDecibels = -45;
    this.voice = new AnimalVoice(animal);
    this.voice.output.connect(engine.master);
    this.voice.output.connect(engine.reverb);
  }

  setAnimal(animal: MicAnimal) {
    this.voice?.setPreset(animal);
  }

  /** Call every animation frame. Returns true while you're audibly singing. */
  update(): boolean {
    if (!this.analyser || !this.buf || !this.detector || !this.voice) return false;
    this.analyser.getFloatTimeDomainData(this.buf);
    let rms = 0;
    for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
    rms = Math.sqrt(rms / this.buf.length);
    const [pitch, clarity] = this.detector.findPitch(this.buf, this.analyser.context.sampleRate);

    if (clarity > 0.88 && rms > 0.012 && pitch > 70 && pitch < 1400) {
      const song = conductor.state.song;
      // autotune: snap to the song's scale while a song plays, else to semitones
      const snapped = snapMidi(freqToMidi(pitch), song?.tonic, song?.scale);
      this.level = Math.min(1, rms * 9);
      this.vowelT += 1;
      const vowel = VOWELS[Math.floor(this.vowelT / 14) % VOWELS.length];
      this.voice.glide(midiToFreq(snapped), this.level * 0.9, vowel);
      this.note = midiToNote(snapped);
      return true;
    }
    this.level *= 0.85;
    this.voice.silence();
    this.note = null;
    return false;
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source?.disconnect();
    this.voice?.silence();
    const v = this.voice;
    Tone.getContext().setTimeout(() => v?.dispose(), 0.3);
    this.stream = null;
    this.analyser = null;
    this.voice = null;
    this.note = null;
    this.level = 0;
  }
}

export const micSinger = new MicSinger();
