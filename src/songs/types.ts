// Shared song / band types. A song is pure data: the compiler (./compile.ts)
// turns it into a step-by-step event list the audio engine and visuals share.

export type InstrumentId = 'drums' | 'bass' | 'guitar' | 'keys' | 'vocals' | 'backing' | 'hype';

export type CharacterId = 'cat' | 'fox' | 'sloth' | 'octopus' | 'owl' | 'penguins' | 'goat';

export type SectionKind = 'intro' | 'verse' | 'build' | 'chorus' | 'drop' | 'solo' | 'bridge' | 'outro';

export type LedMode = 'kaleido' | 'lava' | 'spiral' | 'tunnel';

export type DrumKind = 'kick' | 'snare' | 'hat' | 'openHat' | 'clap' | 'tomHi' | 'tomLo' | 'crash' | 'ride';

/** 16-step strings (one bar of 16ths). `x` = accent, `o` = ghost/soft, `.` = nothing. */
export type DrumPattern = Partial<Record<DrumKind, string>>;

export interface LightCue {
  /** CSS colours the moving heads + LED wall cycle through. */
  palette: string[];
  movement: 'still' | 'sweep' | 'chase' | 'pulse' | 'strobe';
  lasers?: boolean;
  /** 0..1 fog machine output. */
  fog?: number;
}

export interface VocalLine {
  /** Mini-notation: `E4:2 G4:4 _:2` — note:duration-in-16ths, `_` is a rest. */
  melody: string;
  /** Human "translation" — syllables split on spaces and hyphens, one per note. */
  words: string;
  /** Which animal sound the singer uses. Defaults to the song's voice. */
  voice?: VoiceKind;
}

export type VoiceKind = 'cat' | 'wolf' | 'penguin' | 'goat' | 'owl' | 'raccoon';

export interface Section {
  kind: SectionKind;
  bars: number;
  /** Shown on the HUD ("CHORUS", "DROP", "GARY'S MOMENT"). */
  label?: string;
  /** Chord per bar, cycled. Falls back to song.progression. */
  chords?: string[];
  drums?: string | null;
  /** Replace the final bar with a tom fill. */
  fill?: boolean;
  bass?: string | null;
  pad?: boolean;
  keys?: string | null;
  guitar?: 'chords' | 'solo' | null;
  vocals?: VocalLine[];
  backing?: 'ooh' | 'honk' | null;
  /** Owl lead line (mini-notation), looped over the section. */
  lead?: string;
  soloist?: CharacterId;
  /** Greg the goat screams at the top of this section. */
  hype?: boolean;
  /** Octopus improvises fills every two bars. */
  drumSolo?: boolean;
  lights: LightCue;
  led?: LedMode;
  /** 0..1 — drives crowd energy, camera, particle density. */
  intensity: number;
  /** Change tempo at the start of this section (accelerandos!). */
  bpm?: number;
}

export interface Song {
  id: string;
  title: string;
  tagline: string;
  bpm: number;
  key: string;
  /** Root of the key used for solos (e.g. 'A'), and its scale. */
  tonic: string;
  scale: 'minor' | 'major' | 'dorian';
  swing?: number;
  progression: string[];
  voice: VoiceKind;
  drumPatterns: Record<string, DrumPattern>;
  /** 16 chars per bar: 1 root, 3 third, 5 fifth, 7 seventh, 8 octave, b flat-7, `-` hold, `.` rest. */
  bassPatterns: Record<string, string>;
  /** 16 chars: 0-3 chord tones, 4-7 same an octave up, `-` hold, `.` rest. */
  keysPatterns: Record<string, string>;
  /** 16 chars: `x` stab, `-` hold, `.` rest. */
  guitarStabs?: string;
  sections: Section[];
  encore?: boolean;
  /** Mood knobs for the synths. */
  sound?: { padBrightness?: number; bassWobble?: number; drive?: number };
  /** Lighter/phone moment. */
  ballad?: boolean;
}
