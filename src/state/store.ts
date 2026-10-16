import { create } from 'zustand';
import type { CharacterId, InstrumentId, SectionKind } from '../songs/types';

export type Phase =
  | 'landing'
  | 'micCheck'
  | 'walkOn'
  | 'playing'
  | 'banter'
  | 'fakeEnding'
  | 'encore'
  | 'outro'
  | 'credits'
  | 'upload'
  | 'openingAct'
  | 'afterparty';

export type MicAnimal = 'cat' | 'goat' | 'penguin' | 'wolf';
export type Panel = 'mixer' | 'setlist' | 'mic' | 'upload' | 'settings' | 'merch' | 'shout' | 'lights' | 'remix' | 'score' | 'party' | null;

export type FanAnimal = 'raccoon' | 'deer' | 'hedgehog' | 'bear';
export interface Member {
  id: string;
  name: string;
  animal: FanAnimal;
  color: string;
  role: 'host' | 'guest';
}
export interface PartyState {
  role: 'off' | 'host' | 'guest';
  status: 'idle' | 'connecting' | 'live' | 'error' | 'ended';
  message: string;
  room: string | null;
  me: string | null;
  members: Member[];
  urls: string[];
  /** Guest: progress of downloading the host's track. */
  trackMsg?: string;
}

export type Movement = 'still' | 'sweep' | 'chase' | 'pulse' | 'strobe';
export interface LightOverride {
  palette: string[];
  movement: Movement;
  lasers: boolean;
}
export interface Outfit {
  shirt: string | null;
  hat: 'none' | 'ears' | 'crown' | 'bucket';
  extra: 'none' | 'paw' | 'necklace';
}
export interface Toast {
  id: number;
  icon: string;
  title: string;
  text: string;
}

export interface Subtitle {
  speaker: string;
  text: string;
  id: number;
}

export interface LyricState {
  words: string[];
  animal: string[];
  active: number;
  id: number;
  /** Duet mode: this line is yours to sing. */
  yours?: boolean;
}

export interface SetLogEntry {
  songId: string;
  title: string;
  peakHype: number;
}

export const INSTRUMENTS: { id: InstrumentId; label: string; who: CharacterId; emoji: string }[] = [
  { id: 'vocals', label: 'Vocals', who: 'cat', emoji: '🐱' },
  { id: 'guitar', label: 'Guitar', who: 'fox', emoji: '🦊' },
  { id: 'bass', label: 'Bass', who: 'sloth', emoji: '🦥' },
  { id: 'drums', label: 'Drums', who: 'octopus', emoji: '🐙' },
  { id: 'keys', label: 'Synths', who: 'owl', emoji: '🦉' },
  { id: 'backing', label: 'Backing', who: 'penguins', emoji: '🐧' },
  { id: 'hype', label: 'Hype', who: 'goat', emoji: '🐐' },
];

export const CHARACTER_TO_INSTRUMENT: Record<CharacterId, InstrumentId> = {
  cat: 'vocals', fox: 'guitar', sloth: 'bass', octopus: 'drums', owl: 'keys', penguins: 'backing', goat: 'hype',
};

const noInstruments = (): Record<InstrumentId, boolean> => ({
  drums: false, bass: false, guitar: false, keys: false, vocals: false, backing: false, hype: false,
});

const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 900);
const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface State {
  phase: Phase;
  songId: string | null;
  sectionKind: SectionKind | null;
  sectionLabel: string;
  soloist: CharacterId | null;
  played: string[];
  requested: string | null;
  setLog: SetLogEntry[];

  muted: Record<InstrumentId, boolean>;
  soloed: Record<InstrumentId, boolean>;

  hype: number;
  cheering: boolean;
  encoreUnlocked: boolean;

  translate: boolean;
  captions: boolean;
  reduceMotion: boolean;
  strobe: boolean;
  volume: number;
  lowQuality: boolean;

  subtitle: Subtitle | null;
  lyric: LyricState | null;
  nameCard: CharacterId | null;
  onStage: Record<CharacterId, boolean>;

  sunglasses: boolean;
  moonClicks: number;
  moonJoined: boolean;
  lighters: number;

  panel: Panel;
  micActive: boolean;
  micAnimal: MicAnimal;
  micNote: string | null;
  uploadName: string | null;
  /** A user's track saved (in this browser only) to open the set. */
  headliner: { name: string } | null;
  trackBpm: number | null;
  analysing: boolean;
  detectedKey: string | null;

  score: number;
  achievements: string[];
  toasts: Toast[];
  acorns: number;
  outfit: Outfit;
  duet: boolean;
  lightOverride: LightOverride | null;
  haptics: boolean;
  weather: 'auto' | 'rain' | 'clear';
  raining: boolean;
  clip: { recording: boolean; url: string | null; seconds: number };
  stageDive: 'none' | 'climbing' | 'stage' | 'surfing';
  party: PartyState;

  set: (p: Partial<State>) => void;
  toggleMute: (id: InstrumentId) => void;
  toggleSolo: (id: InstrumentId) => void;
  say: (speaker: string, text: string) => void;
  togglePanel: (p: Panel) => void;
}

let subId = 0;

export const useShow = create<State>((set, get) => ({
  phase: 'landing',
  songId: null,
  sectionKind: null,
  sectionLabel: '',
  soloist: null,
  played: [],
  requested: null,
  setLog: [],

  muted: noInstruments(),
  soloed: noInstruments(),

  hype: 0,
  cheering: false,
  encoreUnlocked: false,

  translate: false,
  captions: true,
  reduceMotion: !!prefersReduced,
  strobe: false,
  volume: 0.8,
  lowQuality: !!isMobile,

  subtitle: null,
  lyric: null,
  nameCard: null,
  onStage: { cat: false, fox: false, sloth: false, octopus: false, owl: false, penguins: false, goat: false },

  sunglasses: false,
  moonClicks: 0,
  moonJoined: false,
  lighters: 0,

  panel: null,
  micActive: false,
  micAnimal: 'cat',
  micNote: null,
  uploadName: null,
  headliner: null,
  trackBpm: null,
  analysing: false,
  detectedKey: null,

  score: 0,
  achievements: [],
  toasts: [],
  acorns: 30,
  outfit: { shirt: null, hat: 'none', extra: 'none' },
  duet: false,
  lightOverride: null,
  haptics: !!isMobile,
  weather: 'auto',
  raining: false,
  clip: { recording: false, url: null, seconds: 0 },
  stageDive: 'none',
  party: { role: 'off', status: 'idle', message: '', room: null, me: null, members: [], urls: [] },

  set: (p) => set(p),
  toggleMute: (id) => set({ muted: { ...get().muted, [id]: !get().muted[id] } }),
  toggleSolo: (id) => set({ soloed: { ...get().soloed, [id]: !get().soloed[id] } }),
  say: (speaker, text) => set({ subtitle: { speaker, text, id: ++subId } }),
  togglePanel: (p) => set({ panel: get().panel === p ? null : p }),
}));

/** Is this instrument currently heard (respecting mute + solo)? */
export function isAudible(id: InstrumentId): boolean {
  const { muted, soloed } = useShow.getState();
  const anySolo = Object.values(soloed).some(Boolean);
  return !muted[id] && (!anySolo || soloed[id]);
}
