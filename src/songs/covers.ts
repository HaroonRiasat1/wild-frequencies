// Famous songs the band is allowed to play: all PUBLIC DOMAIN.
//   • "Old MacDonald Had a Farm" — traditional (lyrics + melody public domain)
//   • "Ode to Joy" — Beethoven, Symphony No. 9 (1824); new silly English lyrics
//   • "In the Hall of the Mountain King" — Grieg, Peer Gynt (1875); instrumental
//   • "Twinkle Twinkle Little Star" — Jane Taylor's 1806 poem on the traditional
//     French melody "Ah! vous dirai-je, maman"
// The arrangements (and the goat) are ours.

import type { Section, Song, VocalLine, VoiceKind } from './types';

// ------------------------------------------------------------------ Old MacDonald

const OLD = 'G4:4 G4:4 G4:4 D4:4 E4:4 E4:4 D4:8';
const EIEIO = 'B4:4 B4:4 A4:4 A4:4 G4:12 _:4';
const FARM = 'D4:4 G4:4 G4:4 G4:4 D4:4 E4:4 E4:4 D4:4';
const HERE_THERE = 'D4:2 D4:2 G4:2 G4:2 G4:4 _:4 D4:2 D4:2 G4:2 G4:2 G4:4 _:4';
const EVERYWHERE = 'G4:2 G4:2 G4:4 G4:2 G4:2 G4:4 G4:2 G4:2 G4:2 G4:2 G4:4 G4:4';

const farmVerse = (animal: string, s: string, voice: VoiceKind): VocalLine[] => [
  { melody: OLD, words: 'Old Mac-Don-ald had a farm' },
  { melody: EIEIO, words: 'E-I-E-I-O' },
  { melody: FARM, words: `And on that farm he had a ${animal}` },
  { melody: EIEIO, words: 'E-I-E-I-O' },
  { melody: HERE_THERE, words: `With a ${s} ${s} here and a ${s} ${s} there`, voice },
  { melody: EVERYWHERE, words: `Here a ${s}, there a ${s}, ev-ery-where a ${s} ${s}`, voice },
  { melody: OLD, words: 'Old Mac-Don-ald had a farm' },
  { melody: EIEIO, words: 'E-I-E-I-O' },
];

const farm = (animal: string, s: string, voice: VoiceKind, extra: Partial<Section>): Section => ({
  kind: 'verse', bars: 16, chords: ['G', 'C', 'G', 'G'], drums: 'stomp', bass: 'oompah', pad: true, guitar: 'chords', keys: 'banjo',
  vocals: farmVerse(animal, s, voice), lights: { palette: ['#ffcf6b', '#7cff4f', '#ff7a1a'], movement: 'pulse', fog: 0.3 }, led: 'spiral', intensity: 0.7,
  ...extra,
});

export const oldMacDonald: Song = {
  id: 'old-macdonald',
  title: 'Old MacDonald Had a Farm (Band Version)',
  tagline: 'Traditional. The band insists it is about them. It is a little bit about them.',
  bpm: 132,
  key: 'G major',
  tonic: 'G',
  scale: 'major',
  voice: 'cat',
  progression: ['G', 'C', 'G', 'D'],
  drumPatterns: {
    stomp: { kick: 'x.......x.......', snare: '....x.......x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    hoedown: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', hat: 'xxxxxxxxxxxxxxxx' },
  },
  bassPatterns: { oompah: '1...5...1...5...' },
  keysPatterns: { banjo: '0.2.1.2.0.2.1.2.' },
  guitarStabs: '..x...x...x...x.',
  sections: [
    { kind: 'intro', bars: 4, label: 'INTRO (yee-haw, in a forest)', drums: 'hoedown', bass: 'oompah', keys: 'banjo', lights: { palette: ['#ffcf6b', '#ff7a1a'], movement: 'chase', fog: 0.2 }, led: 'spiral', intensity: 0.5 },
    farm('goat', 'meh', 'goat', { label: 'VERSE 1: GREG\'S VERSE', soloist: 'goat', hype: true }),
    farm('penguin', 'honk', 'penguin', { label: 'VERSE 2: THE TUXEDOS', backing: 'honk', soloist: 'penguins' }),
    farm('cat', 'meow', 'cat', { label: 'VERSE 3: ALL ABOUT ME (Sir Reginald)', kind: 'chorus', drums: 'hoedown', backing: 'ooh', hype: true, intensity: 1, lights: { palette: ['#ff4fd8', '#ffe066', '#7cff4f'], movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido' }),
    { kind: 'outro', bars: 2, label: 'E-I-E-I-OUTRO', drums: 'hoedown', bass: 'oompah', hype: true, lights: { palette: ['#ffcf6b'], movement: 'still', fog: 0.5 }, led: 'lava', intensity: 0.6 },
  ],
};

// ------------------------------------------------------------------ Ode to Joy (disco)

const ODE_A = 'E5:4 E5:4 F5:4 G5:4 G5:4 F5:4 E5:4 D5:4 C5:4 C5:4 D5:4 E5:4 E5:6 D5:2 D5:8';
const ODE_A2 = 'E5:4 E5:4 F5:4 G5:4 G5:4 F5:4 E5:4 D5:4 C5:4 C5:4 D5:4 E5:4 D5:6 C5:2 C5:8';
const ODE_B = 'D5:4 D5:4 E5:4 C5:4 D5:4 E5:2 F5:2 E5:4 C5:4 D5:4 E5:2 F5:2 E5:4 D5:4 C5:4 D5:4 G4:8';
const ODE_CHORDS = ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C', 'G', 'C', 'G', 'C', 'C', 'G', 'C', 'C'];
const ODE_WORDS: VocalLine[] = [
  { melody: ODE_A, words: 'Dis-co ball is slow-ly spin-ning, all the fur is glit-ter-ing' },
  { melody: ODE_A2, words: 'Beet-ho-ven would be so proud, we are all play-ing ve-ry loud' },
  { melody: ODE_B, words: 'Hoot-ing, honk-ing, ev-ery an-i-mal is dan-cing, Kev-in fell a-gain' },
  { melody: ODE_A2, words: 'Dis-co ball is slow-ly spin-ning, Lud-wig, please come join us in' },
];
const DISCO = ['#ff2bd6', '#2bf1ff', '#ffe600', '#7cff4f'];

export const odeToJoy: Song = {
  id: 'ode-to-joy',
  title: 'Ode to Joy (Disco Edit)',
  tagline: 'Beethoven, 1824. Four-on-the-floor, 2024-ish. He would have wanted this. Probably.',
  bpm: 124,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: ODE_CHORDS,
  drumPatterns: {
    four: { kick: 'x...x...x...x...', hat: 'o.o.o.o.o.o.o.o.' },
    disco: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', openHat: '..x...x...x...x.' },
  },
  bassPatterns: { octave: '1.8.1.8.1.8.1.8.' },
  keysPatterns: { stab: '..4...5...4...6.' },
  guitarStabs: '..x..x....x..x.x',
  sections: [
    { kind: 'intro', bars: 4, label: 'INTRO (Ludwig, can you hear this?)', drums: 'four', bass: 'octave', pad: true, lead: ODE_A, lights: { palette: DISCO, movement: 'chase', fog: 0.4 }, led: 'spiral', intensity: 0.6 },
    { kind: 'verse', bars: 16, chords: ODE_CHORDS, drums: 'disco', bass: 'octave', guitar: 'chords', keys: 'stab', vocals: ODE_WORDS, lights: { palette: DISCO, movement: 'pulse', fog: 0.4 }, led: 'kaleido', intensity: 0.75 },
    { kind: 'drop', bars: 8, label: 'THE SYMPHONIC DROP', chords: ['G', 'C', 'G', 'C', 'C', 'G', 'C', 'C'], drums: 'disco', bass: 'octave', guitar: 'chords', backing: 'honk', hype: true, lead: `${ODE_B} ${ODE_A2}`, lights: { palette: ['#ffffff', '#ff2bd6', '#2bf1ff'], movement: 'strobe', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1 },
    { kind: 'chorus', bars: 16, chords: ODE_CHORDS, drums: 'disco', bass: 'octave', pad: true, guitar: 'chords', keys: 'stab', backing: 'ooh', vocals: ODE_WORDS, hype: true, lights: { palette: DISCO, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 4, drums: 'four', bass: 'octave', pad: true, lead: ODE_A2, lights: { palette: DISCO, movement: 'sweep', fog: 0.7 }, led: 'lava', intensity: 0.5 },
  ],
};

// ------------------------------------------------------------------ Mountain King (accelerando)

const KING = 'B4:2 C#5:2 D5:2 E5:2 F#5:2 D5:2 F#5:4 F5:2 C#5:2 F5:4 E5:2 C5:2 E5:4 B4:2 C#5:2 D5:2 E5:2 F#5:2 D5:2 F#5:2 B5:2 A5:2 F#5:2 D5:2 F#5:2 A5:8';
const KING_CHORDS = ['Bm', 'F#7', 'Bm', 'D'];
const CAVE = ['#2b0b5c', '#ff2e97', '#00b4ff'];

export const mountainKing: Song = {
  id: 'mountain-king',
  title: 'In the Hall of the Mountain King (Octavia Mix)',
  tagline: 'Grieg, 1875. It gets faster. And faster. Octavia cannot be stopped.',
  bpm: 96,
  key: 'B minor',
  tonic: 'B',
  scale: 'minor',
  voice: 'cat',
  progression: KING_CHORDS,
  drumPatterns: {
    tiptoe: { hat: 'x...x...x...x...', kick: 'x.......x.......' },
    march: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    gallop: { kick: 'x..xx..xx..xx..x', snare: '....x.......x...', ride: 'x.xxx.xxx.xxx.xx', crash: 'x...............' },
  },
  bassPatterns: { pizz: '1...1...5...1...', run: '1.1.1.1.5.5.8.8.' },
  keysPatterns: { stab: '0...2...0...1...' },
  guitarStabs: 'x-..x-..x-..x-..',
  sections: [
    { kind: 'intro', bars: 8, bpm: 96, label: 'TIPTOEING INTO THE CAVE (96 BPM)', drums: 'tiptoe', bass: 'pizz', lead: KING, lights: { palette: CAVE, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.25 },
    { kind: 'build', bars: 8, bpm: 112, label: 'GETTING FASTER (112 BPM)', drums: 'march', bass: 'pizz', keys: 'stab', lead: KING, guitar: 'chords', lights: { palette: CAVE, movement: 'pulse', fog: 0.8 }, led: 'spiral', intensity: 0.5 },
    { kind: 'chorus', bars: 8, bpm: 132, label: 'TROLLS ARE AWAKE (132 BPM)', drums: 'march', bass: 'run', pad: true, guitar: 'chords', lead: KING, backing: 'honk', hype: true, lights: { palette: ['#ff2e97', '#ffe066', '#00b4ff'], movement: 'chase', lasers: true, fog: 0.6 }, led: 'kaleido', intensity: 0.8 },
    { kind: 'verse', bars: 8, bpm: 140, label: 'THE TROLLS START A MOSH PIT (140 BPM)', drums: 'march', bass: 'run', pad: true, guitar: 'chords', keys: 'stab', lead: KING, backing: 'ooh', lights: { palette: CAVE, movement: 'sweep', lasers: true, fog: 0.6 }, led: 'spiral', intensity: 0.85 },
    { kind: 'solo', bars: 8, bpm: 150, label: 'OCTAVIA TAKES OVER (150 BPM)', drums: 'gallop', drumSolo: true, bass: 'run', lead: KING, soloist: 'octopus', fill: true, lights: { palette: ['#ff2e97', '#ffffff', '#00ffa3'], movement: 'strobe', lasers: true, fog: 0.7 }, led: 'tunnel', intensity: 1 },
    { kind: 'drop', bars: 8, bpm: 170, label: 'TOO FAST (170 BPM) — SOMEONE STOP HER', drums: 'gallop', bass: 'run', pad: true, guitar: 'solo', lead: KING, hype: true, fill: true, lights: { palette: ['#ffffff', '#ff2e97', '#ffe066'], movement: 'chase', lasers: true, fog: 0.8 }, led: 'tunnel', intensity: 1 },
    { kind: 'outro', bars: 4, bpm: 186, label: '186 BPM (the cave collapses)', drums: 'gallop', bass: 'run', lead: KING, hype: true, lights: { palette: CAVE, movement: 'chase', fog: 1 }, led: 'tunnel', intensity: 1 },
  ],
};

// ------------------------------------------------------------------ Twinkle Twinkle (arena ballad)

const TW1 = 'C5:4 C5:4 G5:4 G5:4 A5:4 A5:4 G5:8';
const TW2 = 'F5:4 F5:4 E5:4 E5:4 D5:4 D5:4 C5:8';
const TW3 = 'G5:4 G5:4 F5:4 F5:4 E5:4 E5:4 D5:8';
const TWINKLE: VocalLine[] = [
  { melody: TW1, words: 'Twin-kle, twin-kle, lit-tle star' },
  { melody: TW2, words: 'How I won-der what you are' },
  { melody: TW3, words: 'Up a-bove the world so high' },
  { melody: TW3, words: 'Like a dia-mond in the sky' },
  { melody: TW1, words: 'Twin-kle, twin-kle, lit-tle star' },
  { melody: TW2, words: 'How I won-der what you are' },
];
const TW_CHORDS = ['C', 'F', 'F', 'G', 'C', 'G', 'C', 'G', 'C', 'F', 'F', 'C'];
const STARS = ['#ffe29a', '#9ad5ff', '#c7a2ff'];

export const twinkle: Song = {
  id: 'twinkle',
  title: 'Twinkle Twinkle Little Star (Arena Version)',
  tagline: 'Traditional. Lighters up. The moon is crying. The moon is fine.',
  bpm: 76,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  ballad: true,
  progression: TW_CHORDS,
  drumPatterns: {
    ballad: { kick: 'x......x..x.....', snare: '....o.......x...', hat: 'x.o.x.o.x.o.x.o.' },
    big: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
  },
  bassPatterns: { slow: '1-------5-------' },
  keysPatterns: { musicbox: '4.5.6.5.4.5.6.5.' },
  guitarStabs: 'x-------x-------',
  sections: [
    { kind: 'intro', bars: 4, label: 'INTRO (music box, but enormous)', keys: 'musicbox', pad: true, lead: `${TW1} ${TW2}`, lights: { palette: STARS, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.15 },
    { kind: 'verse', bars: 12, chords: TW_CHORDS, keys: 'musicbox', pad: true, bass: 'slow', vocals: TWINKLE, lights: { palette: STARS, movement: 'sweep', fog: 0.9 }, led: 'spiral', intensity: 0.35 },
    { kind: 'chorus', bars: 12, chords: TW_CHORDS, label: 'LIGHTERS UP', keys: 'musicbox', pad: true, bass: 'slow', drums: 'ballad', backing: 'ooh', guitar: 'chords', vocals: TWINKLE, lights: { palette: STARS, movement: 'sweep', fog: 1 }, led: 'kaleido', intensity: 0.6 },
    { kind: 'bridge', bars: 4, label: 'OWL INTERLUDE (key change incoming)', soloist: 'owl', pad: true, bass: 'slow', drums: 'ballad', lead: `${TW3} ${TW3}`, lights: { palette: ['#c7a2ff', '#ffffff'], movement: 'pulse', fog: 1 }, led: 'kaleido', intensity: 0.5 },
    { kind: 'chorus', bars: 12, chords: TW_CHORDS, label: 'EVERYBODY (yes, the moon too)', keys: 'musicbox', pad: true, bass: 'slow', drums: 'big', backing: 'ooh', guitar: 'chords', vocals: TWINKLE, hype: true, lights: { palette: STARS, movement: 'chase', lasers: true, fog: 1 }, led: 'kaleido', intensity: 0.9 },
    { kind: 'outro', bars: 2, keys: 'musicbox', pad: true, lights: { palette: STARS, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.2 },
  ],
};

/** Request-only bonus covers (public domain). */
export const COVERS: Song[] = [oldMacDonald, odeToJoy, mountainKing, twinkle];
