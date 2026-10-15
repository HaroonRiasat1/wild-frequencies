// Key + chord detection for a user's track, so the penguins can sing harmonies
// that actually fit. Chromagram (12 pitch-class energies) from an STFT, key by
// correlation with the Krumhansl–Kessler profiles, one chord per bar by
// matching major/minor triad templates (with a nudge toward chords in the key).

import { fft } from './vocalDetect';

const SR = 11025;
const N = 4096;
const HOP = 2048;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface BarChord {
  t: number; // bar start (s)
  root: number; // pitch class
  minor: boolean;
}

export interface KeyInfo {
  tonic: string;
  scale: 'major' | 'minor';
  label: string;
  bars: BarChord[];
}

function corr(a: number[], b: number[]): number {
  const ma = a.reduce((x, y) => x + y, 0) / 12;
  const mb = b.reduce((x, y) => x + y, 0) / 12;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < 12; i++) {
    n += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return n / Math.sqrt(da * db || 1);
}

export async function detectKey(buf: AudioBuffer, beats: number[], downbeat: number): Promise<KeyInfo> {
  const len = Math.ceil(buf.duration * SR);
  const oc = new OfflineAudioContext(1, len, SR);
  const src = oc.createBufferSource();
  src.buffer = buf;
  src.connect(oc.destination);
  src.start();
  const mono = (await oc.startRendering()).getChannelData(0);

  // pitch class for every FFT bin in a musical range
  const pcOf = new Int8Array(N / 2).fill(-1);
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N;
    if (f < 60 || f > 2000) continue;
    pcOf[k] = (((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12);
  }
  const frames = Math.max(1, Math.floor((len - N) / HOP));
  const chroma: Float32Array[] = [];
  const re = new Float32Array(N), im = new Float32Array(N);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < N; i++) { re[i] = mono[f * HOP + i] * win[i]; im[i] = 0; }
    fft(re, im);
    const c = new Float32Array(12);
    for (let k = 1; k < N / 2; k++) if (pcOf[k] >= 0) c[pcOf[k]] += Math.hypot(re[k], im[k]);
    const s = c.reduce((x, y) => x + y, 0) || 1;
    for (let i = 0; i < 12; i++) c[i] /= s;
    chroma.push(c);
    if (f % 400 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  // key
  const total = new Array(12).fill(0);
  for (const c of chroma) for (let i = 0; i < 12; i++) total[i] += c[i];
  let best = { r: -2, tonic: 0, minor: false };
  for (let t = 0; t < 12; t++) {
    const rot = total.slice(t).concat(total.slice(0, t));
    const rMaj = corr(rot, MAJOR);
    const rMin = corr(rot, MINOR);
    if (rMaj > best.r) best = { r: rMaj, tonic: t, minor: false };
    if (rMin > best.r) best = { r: rMin, tonic: t, minor: true };
  }
  const scaleSteps = best.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const inKey = (pc: number) => scaleSteps.includes(((pc - best.tonic) % 12 + 12) % 12);

  // one chord per bar
  const bars: BarChord[] = [];
  for (let j = downbeat; j + 4 < beats.length + 1; j += 4) {
    const t0 = beats[j];
    const t1 = beats[Math.min(beats.length - 1, j + 4)] ?? buf.duration;
    if (t1 <= t0) break;
    const avg = new Array(12).fill(0);
    const f0 = Math.floor((t0 * SR) / HOP);
    const f1 = Math.max(f0 + 1, Math.floor((t1 * SR) / HOP));
    for (let f = f0; f < f1 && f < chroma.length; f++) for (let i = 0; i < 12; i++) avg[i] += chroma[f][i];
    let bc = { s: -1e9, root: best.tonic, minor: best.minor };
    for (let r = 0; r < 12; r++) {
      for (const minor of [false, true]) {
        const third = (r + (minor ? 3 : 4)) % 12;
        const fifth = (r + 7) % 12;
        let s = avg[r] * 1.2 + avg[third] + avg[fifth] * 0.9;
        if (inKey(r) && inKey(third) && inKey(fifth)) s *= 1.12;
        if (s > bc.s) bc = { s, root: r, minor };
      }
    }
    bars.push({ t: t0, root: bc.root, minor: bc.minor });
  }

  const tonic = NAMES[best.tonic];
  return { tonic, scale: best.minor ? 'minor' : 'major', label: `${tonic} ${best.minor ? 'minor' : 'major'}`, bars };
}
