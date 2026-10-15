// The Conductor: a tiny typed event bus. The song player (or the beat detector
// in upload mode) emits musical events exactly when they are heard — via
// Tone.Draw, which fires the callback on the animation frame closest to the
// scheduled audio time. Characters, lights, crowd and UI just subscribe.

import type { CompiledSection, LyricLine, VocalEv } from '../songs/compile';
import type { CharacterId, DrumKind, Song } from '../songs/types';

export interface ConductorEvents {
  beat: { beat: number; bar: number; downbeat: boolean };
  bar: { bar: number; chord: string };
  section: { section: CompiledSection; song: Song };
  solo: { who: CharacterId | null };
  hit: { kind: DrumKind; vel: number };
  note: { who: CharacterId; midi: number; dur: number; vel: number };
  vocal: VocalEv & { durSec: number };
  backing: { midis: number[]; syl: string; durSec: number };
  line: { line: LyricLine | null };
  hype: { source: 'song' | 'cheer' | 'click' };
  songStart: { song: Song };
  songEnd: { song: Song };
  react: { who: CharacterId; kind: string };
  cheer: { level: number };
  confetti: { amount: number };
  pyro: Record<string, never>;
  frogSurf: Record<string, never>;
  ledText: { text: string; seconds: number };
  bubble: { who: CharacterId | 'raccoon' | 'moon'; text: string; seconds?: number };
}

type Handler<T> = (payload: T) => void;

class Conductor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<keyof ConductorEvents, Set<Handler<any>>>();

  /** Live musical state the render loop reads every frame. */
  state = {
    bpm: 100,
    /** Called by the render loop: returns the current beat as a float. */
    beatSource: (() => 0) as () => number,
    section: null as CompiledSection | null,
    song: null as Song | null,
    soloist: null as CharacterId | null,
    intensity: 0.2,
    playing: false,
    /** 0..1 vocal energy of a user track (the cat mouths along to it). */
    vocal: 0,
    /** Optional override: next on-grid time for click licks (user tracks). */
    quantize: null as (() => number) | null,
  };

  on<K extends keyof ConductorEvents>(type: K, fn: Handler<ConductorEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn);
    return () => set.delete(fn);
  }

  emit<K extends keyof ConductorEvents>(type: K, payload: ConductorEvents[K]) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[conductor] ${type} handler exploded (like Octavia's hi-hat)`, e);
      }
    }
  }

  beat(): number {
    return this.state.beatSource();
  }
}

export const conductor = new Conductor();
