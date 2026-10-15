// Offline "soundcheck" for a user's track: before it plays, we analyse the
// whole file once — band envelopes, onsets, tempo, a dynamic-programming beat
// tracker (Ellis-style), downbeats and an energy-based section map — so the
// band can play *exactly* on the beat instead of reacting late in real time.

import type { CharacterId, DrumKind, LedMode, LightCue, SectionKind } from '../songs/types';

const SR = 22050;
const HOP = 256;
const FPS = SR / HOP; // ~86 analysis frames per second

export interface TrackSection {
  start: number; // seconds
  end: number;
  kind: SectionKind;
  label: string;
  intensity: number;
  soloist: CharacterId | null;
  hype: boolean;
  led: LedMode;
  lights: LightCue;
}

export interface TrackMap {
  duration: number;
  bpm: number;
  /** Median distance (ms) from detected drum hits to the 16th grid — lower = tighter. */
  gridErrorMs: number;
  /** Beat times in seconds. */
  beats: number[];
  /** Index into `beats` of the first downbeat (bar line). */
  downbeat: number;
  onsets: { t: number; kind: DrumKind; vel: number }[];
  /** Vocal-band energy 0..1, one value per analysis frame. */
  vocal: Float32Array;
  /** Overall energy 0..1 per analysis frame. */
  energy: Float32Array;
  frameRate: number;
  sections: TrackSection[];
}

// ------------------------------------------------------------------ helpers

function percentile(a: ArrayLike<number>, p: number): number {
  const s = Array.from(a).sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))] ?? 0;
}

function smooth(a: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(a.length);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length + radius; i++) {
    if (i < a.length) { sum += a[i]; n++; }
    if (i - 2 * radius - 1 >= 0) { sum -= a[i - 2 * radius - 1]; n--; }
    const c = i - radius;
    if (c >= 0 && c < a.length) out[c] = sum / n;
  }
  return out;
}

function envelope(ch: Float32Array, frames: number): Float32Array {
  const e = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const o = f * HOP;
    for (let i = 0; i < HOP; i++) {
      const v = ch[o + i] ?? 0;
      s += v * v;
    }
    e[f] = Math.log1p(100 * Math.sqrt(s / HOP));
  }
  return e;
}

function rise(e: Float32Array): Float32Array {
  const d = new Float32Array(e.length);
  for (let i = 1; i < e.length; i++) d[i] = Math.max(0, e[i] - e[i - 1]);
  return d;
}

const frameTime = (f: number) => (f + 0.5) / FPS;

// ------------------------------------------------------------------ analysis

export async function analyzeTrack(buf: AudioBuffer): Promise<TrackMap> {
  // 1. split into four bands in one offline render (low / vocal / snare / hat)
  const len = Math.ceil(buf.duration * SR);
  const oc = new OfflineAudioContext(4, len, SR);
  const src = oc.createBufferSource();
  src.buffer = buf;
  const merger = oc.createChannelMerger(4);
  const chain = (input: number, ...filters: [BiquadFilterType, number][]) => {
    let node: AudioNode = src;
    for (const [type, f] of filters) {
      const b = oc.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = 0.707;
      node.connect(b);
      node = b;
    }
    node.connect(merger, 0, input);
  };
  chain(0, ['lowpass', 150], ['lowpass', 150]);
  chain(1, ['highpass', 300], ['lowpass', 3000]);
  chain(2, ['highpass', 1500], ['lowpass', 5000]);
  chain(3, ['highpass', 7000]);
  merger.connect(oc.destination);
  src.start();
  const out = await oc.startRendering();

  const frames = Math.floor(len / HOP);
  const [low, voc, sn, hat] = [0, 1, 2, 3].map((c) => envelope(out.getChannelData(c), frames));
  const dLow = rise(low);
  const dSn = rise(sn);
  const dHat = rise(hat);
  const dVoc = rise(voc);

  // 2. onset-strength "novelty" curve, mean-removed
  const nov = new Float32Array(frames);
  for (let i = 0; i < frames; i++) nov[i] = 1.3 * dLow[i] + 1.0 * dSn[i] + 0.5 * dHat[i] + 0.4 * dVoc[i];
  const local = smooth(nov, Math.round(FPS * 0.25));
  let sd = 0;
  for (let i = 0; i < frames; i++) {
    nov[i] = Math.max(0, nov[i] - local[i]);
    sd += nov[i] * nov[i];
  }
  sd = Math.sqrt(sd / frames) || 1;
  for (let i = 0; i < frames; i++) nov[i] /= sd;

  // 3. tempo: autocorrelation with a gentle preference for ~115 BPM
  const minLag = Math.floor((60 * FPS) / 190);
  const maxLag = Math.ceil((60 * FPS) / 60);
  let bestLag = minLag;
  let best = -Infinity;
  const ac = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let s = 0;
    for (let i = 0; i + lag < frames; i++) s += nov[i] * nov[i + lag];
    ac[lag] = s;
  }
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * FPS) / lag;
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 115) / 0.8, 2));
    const score = ac[lag] * prior;
    if (score > best) { best = score; bestLag = lag; }
  }
  // parabolic refinement for a fractional period
  const y0 = ac[bestLag - 1] ?? ac[bestLag];
  const y1 = ac[bestLag];
  const y2 = ac[bestLag + 1] ?? ac[bestLag];
  const denom = y0 - 2 * y1 + y2;
  const period = bestLag + (denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0);

  // 4. beat tracking by dynamic programming: reward onsets, punish tempo wobble
  const tight = 120;
  const score = new Float32Array(frames);
  const back = new Int32Array(frames).fill(-1);
  const lo = Math.round(period * 0.5);
  const hi = Math.round(period * 2);
  for (let i = 0; i < frames; i++) {
    let m = 0;
    let arg = -1;
    for (let p = i - hi; p <= i - lo; p++) {
      if (p < 0) continue;
      const r = Math.log((i - p) / period);
      const v = score[p] - tight * r * r;
      if (arg === -1 || v > m) { m = v; arg = p; }
    }
    score[i] = nov[i] + (arg >= 0 ? Math.max(0, m) : 0);
    back[i] = arg >= 0 && m > 0 ? arg : -1;
  }
  let end = frames - 1;
  for (let i = frames - 1; i >= Math.max(0, frames - Math.round(period)); i--) if (score[i] > score[end]) end = i;
  const beatFrames: number[] = [];
  for (let i = end; i >= 0; i = back[i]) {
    beatFrames.push(i);
    if (back[i] < 0) break;
  }
  beatFrames.reverse();
  // extend the grid back to the start of the track (quiet intros)
  while (beatFrames.length && beatFrames[0] - period > 0) beatFrames.unshift(Math.round(beatFrames[0] - period));
  const rawBeats = beatFrames.map(frameTime);

  // 4b. tidy the grid: a tempo line through the beats plus slowly-varying drift.
  // The DP follows every onset (including syncopation); the smoothed grid
  // follows the actual pulse. We keep whichever lines up better with the drums.
  const smoothGrid = (b: number[]) => {
    const n = b.length;
    if (n < 8) return b;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sx += i; sy += b[i]; sxx += i * i; sxy += i * b[i]; }
    const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const icpt = (sy - slope * sx) / n;
    const res = b.map((t, i) => t - (icpt + slope * i));
    const R = 6;
    return b.map((_, i) => {
      let acc = 0, c = 0;
      for (let k = Math.max(0, i - R); k <= Math.min(n - 1, i + R); k++) { acc += res[k]; c++; }
      return icpt + slope * i + acc / c;
    });
  };
  const rawDrumOnsets: number[] = [];
  {
    const d = new Float32Array(frames);
    for (let i = 0; i < frames; i++) d[i] = dLow[i] + dSn[i];
    const p95 = percentile(d, 0.95);
    for (let i = 2; i < frames - 2; i++) if (d[i] > p95 && d[i] >= d[i - 1] && d[i] >= d[i + 1] && d[i] >= d[i - 2] && d[i] >= d[i + 2]) rawDrumOnsets.push(frameTime(i));
  }
  const gridError = (b: number[]) => {
    const g: number[] = [];
    for (let j = 0; j < b.length - 1; j++) for (let k = 0; k < 4; k++) g.push(b[j] + ((b[j + 1] - b[j]) * k) / 4);
    const errs = rawDrumOnsets.map((t) => {
      let lo = 0, hi = g.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g[m] < t) lo = m; else hi = m; }
      return Math.min(Math.abs(g[lo] - t), Math.abs(g[hi] - t));
    }).sort((x, y) => x - y);
    return errs[Math.floor(errs.length / 2)] ?? 1;
  };
  const tidy = smoothGrid(rawBeats);
  const errRaw = gridError(rawBeats);
  const errTidy = gridError(tidy);
  const beats = errTidy <= errRaw * 1.15 ? tidy : rawBeats;
  const gaps = beats.slice(1).map((b, i) => b - beats[i]).sort((a, b) => a - b);
  const bpm = gaps.length ? 60 / gaps[Math.floor(gaps.length / 2)] : (60 * FPS) / period;

  // 5. downbeat: the beat phase (of 4) where kicks land hardest and snares least
  const at = (arr: Float32Array, t: number) => {
    const f = Math.round(t * FPS - 0.5);
    let m = 0;
    for (let k = f - 2; k <= f + 2; k++) m = Math.max(m, arr[k] ?? 0);
    return m;
  };
  let downbeat = 0;
  let bestPhase = -Infinity;
  for (let ph = 0; ph < 4; ph++) {
    let s = 0;
    for (let j = ph; j < beats.length; j += 4) s += at(dLow, beats[j]) - 0.6 * at(dSn, beats[j]);
    if (s > bestPhase) { bestPhase = s; downbeat = ph; }
  }

  // 6. per-band onsets, snapped to the 16th-note grid when close (neat!)
  const grid: number[] = [];
  for (let j = 0; j < beats.length - 1; j++) {
    for (let k = 0; k < 4; k++) grid.push(beats[j] + ((beats[j + 1] - beats[j]) * k) / 4);
  }
  if (beats.length) grid.push(beats[beats.length - 1]);
  const snap = (t: number) => {
    let a = 0;
    let b = grid.length - 1;
    while (b - a > 1) {
      const m = (a + b) >> 1;
      if (grid[m] < t) a = m;
      else b = m;
    }
    const g = Math.abs(grid[a] - t) < Math.abs(grid[b] - t) ? grid[a] : grid[b];
    return g !== undefined && Math.abs(g - t) < 0.05 ? g : t;
  };
  const onsets: TrackMap['onsets'] = [];
  const pick = (d: Float32Array, kind: DrumKind, k: number, gap: number) => {
    const mean = smooth(d, Math.round(FPS * 0.5));
    const p98 = percentile(d, 0.98) || 1;
    let last = -1;
    for (let i = 3; i < frames - 3; i++) {
      const v = d[i];
      if (v < mean[i] * k + p98 * 0.12) continue;
      if (v < d[i - 1] || v < d[i + 1] || v < d[i - 2] || v < d[i + 2]) continue;
      const t = frameTime(i);
      if (last >= 0 && t - last < gap) continue;
      last = t;
      onsets.push({ t: snap(t), kind, vel: Math.min(1, 0.35 + v / p98) });
    }
  };
  pick(dLow, 'kick', 2.2, 0.16);
  pick(dSn, 'snare', 2.4, 0.12);
  pick(dHat, 'hat', 2.0, 0.08);
  onsets.sort((a, b) => a.t - b.t);

  // 7. vocal + energy curves (0..1)
  const norm = (a: Float32Array) => {
    const s = smooth(a, 4);
    const p10 = percentile(s, 0.1);
    const p97 = percentile(s, 0.97);
    const r = p97 - p10 || 1;
    return s.map((v) => Math.max(0, Math.min(1, (v - p10) / r)));
  };
  const vocal = norm(voc);
  const total = new Float32Array(frames);
  for (let i = 0; i < frames; i++) total[i] = low[i] + voc[i] + sn[i] + hat[i];
  const energy = norm(total);

  return {
    duration: buf.duration,
    bpm: Math.round(bpm * 10) / 10,
    gridErrorMs: Math.round(Math.min(errRaw, errTidy) * 1000 * 10) / 10,
    beats,
    downbeat,
    onsets,
    vocal,
    energy,
    frameRate: FPS,
    sections: buildSections(beats, downbeat, energy, vocal, buf.duration),
  };
}

// ------------------------------------------------------------------ sections

const LOOKS: Record<SectionKind, { led: LedMode; lights: LightCue; label: string }> = {
  intro: { led: 'lava', lights: { palette: ['#7b2cff', '#ff4fd8', '#3a1cff'], movement: 'still', fog: 0.9 }, label: 'INTRO (the band pretends to know this one)' },
  verse: { led: 'spiral', lights: { palette: ['#ff7a1a', '#ff2e63', '#ffd23f'], movement: 'pulse', fog: 0.5 }, label: 'VERSE' },
  build: { led: 'tunnel', lights: { palette: ['#00e0c6', '#7b2cff', '#ffe066'], movement: 'chase', fog: 0.5 }, label: 'BUILD (hold your whiskers)' },
  chorus: { led: 'kaleido', lights: { palette: ['#ff4fd8', '#00e0c6', '#ffe066', '#7b2cff'], movement: 'sweep', lasers: true, fog: 0.4 }, label: 'CHORUS (paws in the air)' },
  drop: { led: 'tunnel', lights: { palette: ['#ffffff', '#ff2bd6', '#2bf1ff'], movement: 'strobe', lasers: true, fog: 0.6 }, label: 'THE DROP (Greg has entered the chat)' },
  solo: { led: 'tunnel', lights: { palette: ['#ff7a1a', '#ffd23f', '#ffffff'], movement: 'chase', lasers: true, fog: 0.6 }, label: 'INSTRUMENTAL (fox knee slide imminent)' },
  bridge: { led: 'kaleido', lights: { palette: ['#8f7bff', '#9ad5ff', '#ffffff'], movement: 'pulse', fog: 1 }, label: 'BRIDGE (owl moment)' },
  outro: { led: 'lava', lights: { palette: ['#ff9ad5', '#9ad5ff', '#c7a2ff'], movement: 'still', fog: 1 }, label: 'OUTRO' },
};

function buildSections(beats: number[], downbeat: number, energy: Float32Array, vocal: Float32Array, duration: number): TrackSection[] {
  // 4-bar phrases, starting at the first downbeat (anything before is intro)
  const phraseBeats = 16;
  const bounds: number[] = [0];
  for (let j = downbeat; j < beats.length; j += phraseBeats) if (beats[j] > 0.5) bounds.push(beats[j]);
  if (duration - bounds[bounds.length - 1] < 3 && bounds.length > 1) bounds.pop();
  bounds.push(duration);

  const mean = (a: Float32Array, t0: number, t1: number) => {
    const f0 = Math.floor(t0 * FPS);
    const f1 = Math.max(f0 + 1, Math.floor(t1 * FPS));
    let s = 0;
    for (let f = f0; f < f1 && f < a.length; f++) s += a[f];
    return s / (f1 - f0);
  };
  const ph = bounds.slice(0, -1).map((t0, i) => ({ t0, t1: bounds[i + 1], E: mean(energy, t0, bounds[i + 1]), V: mean(vocal, t0, bounds[i + 1]) }));
  // rank-normalise phrase energy so every track uses the whole range
  const sortedE = ph.map((p) => p.E).sort((a, b) => a - b);
  const rank = (e: number) => (ph.length > 1 ? sortedE.indexOf(e) / (ph.length - 1) : 0.5);
  const vMed = percentile(ph.map((p) => p.V), 0.5);

  const kinds: SectionKind[] = ph.map((p, i) => {
    const r = rank(p.E);
    const prev = i > 0 ? rank(ph[i - 1].E) : 0;
    const next = i < ph.length - 1 ? rank(ph[i + 1].E) : r;
    if (i === 0 && r < 0.5) return 'intro';
    if (i === ph.length - 1 && r < 0.6) return 'outro';
    if (r >= 0.8 && r - prev > 0.45) return 'drop';
    if (r >= 0.65) return p.V >= vMed * 0.85 ? 'chorus' : 'solo';
    if (next - r > 0.3) return 'build';
    if (r < 0.25) return 'bridge';
    return 'verse';
  });
  // intro can be longer than one phrase if the track starts quietly
  for (let i = 1; i < kinds.length && kinds[i - 1] === 'intro' && rank(ph[i].E) < 0.3; i++) kinds[i] = 'intro';

  const out: TrackSection[] = [];
  ph.forEach((p, i) => {
    const kind = kinds[i];
    const prevOut = out[out.length - 1];
    if (prevOut && prevOut.kind === kind) {
      prevOut.end = p.t1;
      return;
    }
    const look = LOOKS[kind];
    const r = rank(p.E);
    out.push({
      start: p.t0,
      end: p.t1,
      kind,
      label: look.label,
      intensity: 0.2 + r * 0.8,
      soloist: kind === 'solo' ? 'fox' : kind === 'bridge' ? 'owl' : null,
      hype: kind === 'drop' || kind === 'chorus' || kind === 'solo',
      led: look.led,
      lights: look.lights,
    });
  });
  return out;
}
