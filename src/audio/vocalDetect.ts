// Finds where the *singer* is singing, so the cat's mouth follows the voice and
// not the band. Three filters, all offline:
//   1. centre extraction — vocals sit in the middle of the stereo image, most
//      synths and guitars are spread wide (per-frequency L/R similarity);
//   2. harmonic/percussive separation (median filtering, à la Fitzgerald 2010)
//      — throws away drum hits that also sit in the centre;
//   3. a voice-band "syllable" envelope with a hysteresis gate — only sustained,
//      fluctuating centre energy counts as singing.

const SR = 22050;
const N = 1024;
const HOP = 512;
const LO_HZ = 220;
const HI_HZ = 3500;

/** In-place radix-2 FFT. */
export function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

function median(buf: Float32Array, n: number): number {
  const a = buf.subarray(0, n).sort();
  return a[n >> 1];
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export interface VocalTrack {
  /** 0..1 mouth opening per output frame (0 when nobody is singing). */
  mouth: Float32Array;
  /** 1 while singing, 0 otherwise (for section labelling). */
  singing: Uint8Array;
  frameRate: number;
}

export async function detectVocals(buf: AudioBuffer, outFrameRate: number): Promise<VocalTrack> {
  // resample to 22.05 kHz stereo
  const len = Math.ceil(buf.duration * SR);
  const oc = new OfflineAudioContext(2, len, SR);
  const src = oc.createBufferSource();
  src.buffer = buf;
  src.connect(oc.destination);
  src.start();
  const r = await oc.startRendering();
  const L = r.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? r.getChannelData(1) : L;

  const frames = Math.max(1, Math.floor((len - N) / HOP));
  const k0 = Math.floor((LO_HZ / SR) * N);
  const k1 = Math.ceil((HI_HZ / SR) * N);
  const bins = k1 - k0;
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));

  // 1. centre-weighted magnitude spectrogram (voice band only)
  const C = new Float32Array(frames * bins);
  const lr = new Float32Array(N), li = new Float32Array(N), rr = new Float32Array(N), ri = new Float32Array(N);
  for (let f = 0; f < frames; f++) {
    const o = f * HOP;
    for (let i = 0; i < N; i++) {
      lr[i] = L[o + i] * win[i];
      rr[i] = R[o + i] * win[i];
      li[i] = 0;
      ri[i] = 0;
    }
    fft(lr, li);
    fft(rr, ri);
    for (let k = k0; k < k1; k++) {
      const sr = lr[k] + rr[k];
      const si = li[k] + ri[k];
      const dr = lr[k] - rr[k];
      const di = li[k] - ri[k];
      const sum = Math.hypot(sr, si);
      const diff = Math.hypot(dr, di);
      const sim = Math.max(0, 1 - diff / (sum + 1e-9));
      C[f * bins + (k - k0)] = (sum / 2) * sim * sim * sim;
    }
    if (f % 1500 === 0) await tick();
  }

  // 2. harmonic / percussive split: median over time vs over frequency
  const HT = 8; // ±8 frames ≈ ±0.19 s
  const HF = 8; // ±8 bins ≈ ±170 Hz
  const tmp = new Float32Array(2 * Math.max(HT, HF) + 1);
  const harm = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let h = 0;
    for (let b = 0; b < bins; b++) {
      let n = 0;
      for (let d = -HT; d <= HT; d++) {
        const ff = f + d;
        if (ff >= 0 && ff < frames) tmp[n++] = C[ff * bins + b];
      }
      const H = median(tmp, n);
      n = 0;
      for (let d = -HF; d <= HF; d++) {
        const bb = b + d;
        if (bb >= 0 && bb < bins) tmp[n++] = C[f * bins + bb];
      }
      const P = median(tmp, n);
      const c = C[f * bins + b];
      const mask = (H * H) / (H * H + P * P + 1e-12);
      h += c * mask;
    }
    harm[f] = h;
    if (f % 800 === 0) await tick();
  }

  // 3. syllable envelope + hysteresis gate
  const logH = harm.map((v) => Math.log1p(200 * v));
  const sorted = Array.from(logH).sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const floor = p(0.25);
  const top = p(0.97);
  const span = top - floor || 1;
  const env = logH.map((v) => Math.max(0, Math.min(1, (v - floor) / span)));
  // syllables make the voice envelope wobble; steady centre pads don't
  const wob = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let mn = 1, mx = 0;
    for (let d = -6; d <= 6; d++) {
      const v = env[Math.max(0, Math.min(frames - 1, f + d))];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    wob[f] = mx - mn;
  }
  // presence score, smoothed over ~0.35 s
  const score = new Float32Array(frames);
  for (let f = 0; f < frames; f++) score[f] = env[f] * 0.7 + wob[f] * 0.6;
  const sm = new Float32Array(frames);
  const R2 = 7;
  for (let f = 0; f < frames; f++) {
    let s = 0, c = 0;
    for (let d = -R2; d <= R2; d++) {
      const ff = f + d;
      if (ff >= 0 && ff < frames) { s += score[ff]; c++; }
    }
    sm[f] = s / c;
  }
  const ss = Array.from(sm).sort((a, b) => a - b);
  const on = ss[Math.floor(ss.length * 0.55)];
  const off = ss[Math.floor(ss.length * 0.4)];
  const singing = new Uint8Array(frames);
  let state = 0;
  for (let f = 0; f < frames; f++) {
    if (!state && sm[f] > on) state = 1;
    else if (state && sm[f] < off) state = 0;
    singing[f] = state;
  }
  // drop blips shorter than 0.4 s and bridge gaps shorter than 0.3 s
  const fps = SR / HOP;
  const runs = (val: number, minLen: number, to: number) => {
    let i = 0;
    while (i < frames) {
      if (singing[i] !== val) { i++; continue; }
      let j = i;
      while (j < frames && singing[j] === val) j++;
      if (j - i < minLen && i > 0 && j < frames) singing.fill(to, i, j);
      i = j;
    }
  };
  runs(0, Math.round(0.3 * fps), 1);
  runs(1, Math.round(0.4 * fps), 0);

  // 4. resample to the caller's frame rate; mouth = syllable envelope while singing
  const outFrames = Math.ceil(buf.duration * outFrameRate);
  const mouth = new Float32Array(outFrames);
  const sing = new Uint8Array(outFrames);
  for (let i = 0; i < outFrames; i++) {
    const t = i / outFrameRate;
    const f = Math.min(frames - 1, Math.max(0, Math.round(t * fps - N / HOP / 2)));
    sing[i] = singing[f];
    mouth[i] = singing[f] ? Math.max(0.15, Math.min(1, env[f] * 1.15)) : 0;
  }
  return { mouth, singing: sing, frameRate: outFrameRate };
}
