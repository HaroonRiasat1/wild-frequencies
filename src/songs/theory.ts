// Tiny music-theory helpers: note names <-> MIDI, chord symbols, scales.

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function noteToMidi(note: string): number {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`Bad note "${note}" (the cat cannot sing this)`);
  return NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}

export function midiToNote(midi: number): string {
  const n = Math.round(midi);
  return `${NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  m9: [0, 3, 7, 10, 14],
  '9': [0, 4, 7, 10, 14],
  '6': [0, 4, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  add9: [0, 4, 7, 14],
  dim: [0, 3, 6],
  '13': [0, 4, 10, 14, 21],
};

export interface Chord {
  symbol: string;
  root: number; // pitch class 0..11
  intervals: number[];
}

export function parseChord(symbol: string): Chord {
  const m = /^([A-G][#b]?)(.*)$/.exec(symbol);
  if (!m) throw new Error(`Bad chord ${symbol}`);
  const q = m[2];
  const intervals = QUALITIES[q];
  if (!intervals) throw new Error(`Unknown chord quality "${q}" in ${symbol}`);
  return { symbol, root: NOTE_INDEX[m[1]], intervals };
}

/** Chord tones as MIDI, starting at the root nearest `around`. */
export function chordMidis(chord: Chord, around: number): number[] {
  let root = chord.root;
  while (root + 12 <= around) root += 12;
  while (root > around) root -= 12;
  return chord.intervals.map((i) => root + i);
}

/** A tidy pad voicing kept inside a comfortable range (no muddy low thirds). */
export function padVoicing(chord: Chord): number[] {
  const base = chordMidis(chord, 52);
  return base.map((n) => (n < 55 ? n + 12 : n)).sort((a, b) => a - b);
}

/** Bass interval for a pattern character, relative to the chord root. */
export function bassInterval(ch: string, chord: Chord): number | null {
  const third = chord.intervals.includes(3) ? 3 : 4;
  switch (ch) {
    case '1': return 0;
    case '3': return third;
    case '5': return 7;
    case '7': return chord.intervals.includes(11) ? 11 : 10;
    case 'b': return 10;
    case '8': return 12;
    case '2': return 2;
    case '4': return 5;
    default: return null;
  }
}

const SCALES = {
  minor: [0, 3, 5, 7, 10], // minor pentatonic — guitarists' comfort blanket
  dorian: [0, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 7, 9],
};

export function scaleMidis(tonic: string, scale: keyof typeof SCALES, lo: number, hi: number): number[] {
  const t = NOTE_INDEX[tonic];
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) {
    if (SCALES[scale].includes((((n - t) % 12) + 12) % 12)) out.push(n);
  }
  return out;
}

/** Autotune: snap a (fractional) MIDI number to the nearest note of a scale, or semitone. */
export function snapMidi(midi: number, tonic?: string, scale?: keyof typeof SCALES): number {
  if (!tonic || !scale) return Math.round(midi);
  const notes = scaleMidis(tonic, scale, Math.floor(midi) - 12, Math.ceil(midi) + 12);
  let best = notes[0];
  for (const n of notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n;
  return best;
}

/** Deterministic little RNG so solos are "improvised" identically every night. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
