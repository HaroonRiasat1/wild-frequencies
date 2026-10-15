// The song compiler: turns a declarative Song into a flat array of 16th-note
// steps. The audio engine plays a step; the conductor broadcasts the same step
// to the visuals. One source of truth = everything stays in sync.

import type { CharacterId, DrumKind, Section, Song, VoiceKind } from './types';
import { bassInterval, chordMidis, noteToMidi, padVoicing, parseChord, rng, scaleMidis, type Chord } from './theory';

export interface NoteEv { midi: number; dur: number; vel: number }
export interface VocalEv extends NoteEv { syl: string; word: string; line: number; idx: number; voice: VoiceKind }

export interface StepEvent {
  drums: { kind: DrumKind; vel: number }[];
  bass?: NoteEv;
  pad?: { midis: number[]; dur: number };
  keys?: NoteEv;
  lead?: NoteEv;
  guitar?: { midis: number[]; dur: number; vel: number; solo?: boolean; bend?: boolean };
  vocal?: VocalEv;
  backing?: { midis: number[]; dur: number; syl: string };
  hype?: boolean;
}

export interface LyricLine {
  id: number;
  start: number;
  end: number;
  words: string[];
  animal: string[];
  voice: VoiceKind;
}

export interface CompiledSection {
  index: number;
  start: number; // step
  end: number;
  section: Section;
  soloist: CharacterId | null;
}

export interface CompiledSong {
  song: Song;
  totalSteps: number;
  steps: StepEvent[];
  sections: CompiledSection[];
  lines: LyricLine[];
  barChords: string[];
  durationSec: number;
}

export function parseMini(src: string): { midi: number | null; dur: number }[] {
  return src
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [n, d] = tok.split(':');
      const dur = parseInt(d ?? '1', 10);
      return { midi: n === '_' ? null : noteToMidi(n), dur };
    });
}

const ANIMAL: Record<VoiceKind, { short: string[]; mid: string[]; long: string[] }> = {
  cat: { short: ['mew', 'mrr', 'mya', 'meh', 'prt'], mid: ['meow', 'mrrow', 'nyaa', 'mrrp'], long: ['mrrrooow', 'meeeoww', 'prrrrrr', 'mraaaow'] },
  wolf: { short: ['a', 'wu', 'ow'], mid: ['awoo', 'ahoo', 'wooo'], long: ['awoooooo', 'ahroooooo'] },
  penguin: { short: ['onk', 'nk'], mid: ['honk', 'hoonk'], long: ['ooooh', 'hooooonk'] },
  goat: { short: ['meh', 'bah'], mid: ['meeh', 'baah'], long: ['MEEEEH', 'BAAAAH'] },
  owl: { short: ['hu', 'ho'], mid: ['hoo', 'whoo'], long: ['hooooo', 'whoooo'] },
  raccoon: { short: ['chk', 'sk'], mid: ['squeak', 'chrr'], long: ['squeeeak'] },
};

export function animalSyllable(voice: VoiceKind, dur: number, seed: number): string {
  const bank = ANIMAL[voice];
  const list = dur <= 2 ? bank.short : dur <= 5 ? bank.mid : bank.long;
  return list[Math.abs(seed) % list.length];
}

const emptyStep = (): StepEvent => ({ drums: [] });

export function compileSong(song: Song): CompiledSong {
  const totalBars = song.sections.reduce((a, s) => a + s.bars, 0);
  const totalSteps = totalBars * 16;
  const steps: StepEvent[] = Array.from({ length: totalSteps }, emptyStep);
  const sections: CompiledSection[] = [];
  const lines: LyricLine[] = [];
  const barChords: string[] = [];
  const r = rng(song.title.length * 7919 + song.bpm);

  let bar = 0;
  let lineId = 0;
  song.sections.forEach((sec, si) => {
    const start = bar * 16;
    const prog = sec.chords ?? song.progression;
    const chordFor = (b: number): Chord => parseChord(prog[b % prog.length]);
    const prev = song.sections[si - 1];
    const crashHere = si > 0 && (prev?.fill || sec.kind === 'chorus' || sec.kind === 'drop') && !!sec.drums;

    for (let b = 0; b < sec.bars; b++) {
      const chord = chordFor(b);
      barChords.push(chord.symbol);
      const s0 = (bar + b) * 16;
      const isFillBar = sec.fill && b === sec.bars - 1;

      // ---- drums
      const pat = sec.drums ? song.drumPatterns[sec.drums] : undefined;
      if (pat) {
        for (let i = 0; i < 16; i++) {
          const ev = steps[s0 + i];
          if (isFillBar && i >= 8) {
            // tom fill — the octopus's favourite eight steps
            ev.drums.push({ kind: i < 12 ? 'tomHi' : 'tomLo', vel: 0.7 + (i % 4) * 0.08 });
            if (i % 2 === 0) ev.drums.push({ kind: 'snare', vel: 0.5 + i * 0.03 });
            if (i === 8 || i === 12) ev.drums.push({ kind: 'kick', vel: 0.9 });
            continue;
          }
          for (const k of Object.keys(pat) as DrumKind[]) {
            const c = pat[k]![i % pat[k]!.length];
            if (c === 'x') ev.drums.push({ kind: k, vel: 1 });
            else if (c === 'o') ev.drums.push({ kind: k, vel: 0.45 });
          }
        }
        if (sec.drumSolo && b % 2 === 1) {
          // Octavia improvises: random 16ths across the whole kit
          for (let i = 0; i < 16; i++) {
            if (r() < 0.55) {
              const kinds: DrumKind[] = ['tomHi', 'tomLo', 'snare', 'tomHi', 'clap'];
              steps[s0 + i].drums.push({ kind: kinds[Math.floor(r() * kinds.length)], vel: 0.55 + r() * 0.45 });
            }
          }
        }
      }
      if (b === 0 && crashHere) steps[s0].drums.push({ kind: 'crash', vel: 1 });

      // ---- bass (Gary)
      const bp = sec.bass ? song.bassPatterns[sec.bass] : undefined;
      if (bp) {
        const rootMidi = chordMidis(chord, 40)[0];
        for (let i = 0; i < 16; i++) {
          const iv = bassInterval(bp[i], chord);
          if (iv === null) continue;
          let d = 1;
          while (i + d < 16 && bp[i + d] === '-') d++;
          steps[s0 + i].bass = { midi: rootMidi + iv, dur: d, vel: i % 4 === 0 ? 1 : 0.8 };
        }
      }

      // ---- pad + keys (Professor Hootenanny)
      if (sec.pad) steps[s0].pad = { midis: padVoicing(chord), dur: 16 };
      const kp = sec.keys ? song.keysPatterns[sec.keys] : undefined;
      if (kp) {
        const tones = chordMidis(chord, 62);
        while (tones.length < 4) tones.push(tones[0] + 12);
        for (let i = 0; i < 16; i++) {
          const c = kp[i];
          if (c < '0' || c > '7') continue;
          const n = parseInt(c, 10);
          let d = 1;
          while (i + d < 16 && kp[i + d] === '-') d++;
          steps[s0 + i].keys = { midi: tones[n % 4] + (n >= 4 ? 12 : 0), dur: d, vel: 0.7 };
        }
      }

      // ---- guitar (Rusty)
      if (sec.guitar === 'chords' && song.guitarStabs) {
        const v = chordMidis(chord, 66).slice(0, 3);
        const gs = song.guitarStabs;
        for (let i = 0; i < 16; i++) {
          if (gs[i] !== 'x') continue;
          let d = 1;
          while (i + d < 16 && gs[i + d] === '-') d++;
          steps[s0 + i].guitar = { midis: v, dur: d, vel: 0.8 };
        }
      } else if (sec.guitar === 'solo') {
        const scale = scaleMidis(song.tonic, song.scale, 62, 86);
        let pos = Math.floor(scale.length / 2);
        const rhythms = ['x.x.xxx.x.x.x---', 'xxxxx.x.x---x.x.', 'x---x.x.xxxx----', 'x.xxx.xxx.x.x---'];
        const rh = rhythms[Math.floor(r() * rhythms.length)];
        for (let i = 0; i < 16; i++) {
          if (rh[i] !== 'x') continue;
          let d = 1;
          while (i + d < 16 && rh[i + d] === '-') d++;
          pos = Math.max(0, Math.min(scale.length - 1, pos + Math.floor(r() * 5) - 2 + (b % 4 === 3 ? 1 : 0)));
          steps[s0 + i].guitar = { midis: [scale[pos]], dur: d, vel: 0.9, solo: true, bend: d >= 4 };
        }
      }

      // ---- backing (The Tuxedos)
      if (sec.backing === 'ooh') {
        const t = chordMidis(chord, 67);
        steps[s0].backing = { midis: [t[0] + 12, t[1] + 12, t[2]].sort((a, c) => a - c).slice(0, 3), dur: 16, syl: 'ooh' };
      } else if (sec.backing === 'honk') {
        const t = chordMidis(chord, 64).slice(0, 3);
        for (const i of [4, 12]) steps[s0 + i].backing = { midis: t, dur: 2, syl: 'honk' };
      }
    }

    // ---- owl lead line (looped)
    if (sec.lead) {
      const notes = parseMini(sec.lead);
      let p = start;
      const end = start + sec.bars * 16;
      while (p < end) {
        for (const n of notes) {
          if (p >= end) break;
          if (n.midi !== null) steps[p].lead = { midi: n.midi, dur: n.dur, vel: 0.75 };
          p += n.dur;
        }
      }
    }

    // ---- vocals (Sir Reginald) — each line starts on a bar line
    if (sec.vocals) {
      let p = start;
      for (const line of sec.vocals) {
        const notes = parseMini(line.melody);
        const words = line.words.split(/[\s-]+/).filter(Boolean);
        const voice = line.voice ?? song.voice;
        const animal: string[] = [];
        const total = notes.reduce((a, n) => a + n.dur, 0);
        const sung = notes.filter((n) => n.midi !== null);
        if (sung.length !== words.length) {
          console.warn(`[${song.title}] "${line.words}" has ${words.length} syllables for ${sung.length} notes`);
        }
        const top = Math.max(...sung.map((n) => n.midi!));
        let q = p;
        let idx = 0;
        for (const n of notes) {
          if (n.midi !== null && q < totalSteps) {
            let syl = animalSyllable(voice, n.dur, q + idx * 31);
            if (n.midi === top && n.dur >= 4) syl = syl.toUpperCase() + '!';
            animal.push(syl);
            steps[q].vocal = {
              midi: n.midi, dur: n.dur, vel: 0.9, syl, word: words[idx] ?? '…', line: lineId, idx, voice,
            };
            idx++;
          }
          q += n.dur;
        }
        const len = Math.ceil(total / 16) * 16;
        lines.push({ id: lineId++, start: p, end: p + len, words, animal, voice });
        p += len;
      }
      if (p > start + sec.bars * 16) console.warn(`[${song.title}] vocals overflow ${sec.kind}`);
    }

    if (sec.hype) steps[start].hype = true;

    sections.push({
      index: si,
      start,
      end: start + sec.bars * 16,
      section: sec,
      soloist: sec.soloist ?? (sec.guitar === 'solo' ? 'fox' : sec.drumSolo ? 'octopus' : null),
    });
    bar += sec.bars;
  });

  return {
    song,
    totalSteps,
    steps,
    sections,
    lines,
    barChords,
    durationSec: song.sections.reduce((a, s) => a + s.bars * 4 * (60 / (s.bpm ?? song.bpm)), 0),
  };
}
