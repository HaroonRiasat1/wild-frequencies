// More famous songs — all PUBLIC DOMAIN worldwide:
//   • "When the Saints Go Marching In" — traditional spiritual (the set opener)
//   • "The Entertainer" — Scott Joplin, 1902 (instrumental)
//   • "Jingle Bells" — James Lord Pierpont, 1857 (lyrics + melody)
//   • "Happy Birthday to You" — Hill sisters' melody (1893); in the US a 2015
//     court ruling found no valid copyright, and it is public domain in the EU
//     since 2017
// Extra verses and arrangements are ours.

import type { Section, Song, VocalLine } from './types';

// ------------------------------------------------------------------ When the Saints (opener)

const S1 = '_:4 C5:4 E5:4 F5:4 G5:16';
const S3 = '_:4 C5:4 E5:4 F5:4 G5:8 E5:8 C5:8 E5:8 D5:16';
const S4 = '_:4 E5:4 E5:4 D5:4 C5:12 C5:4 E5:8 G5:6 G5:2 F5:12 F5:4';
const S5 = '_:4 E5:4 F5:4 G5:4 E5:8 C5:8 D5:8 _:8 C5:16';
const SAINTS_CHORDS = ['C', 'C', 'C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'C7', 'F', 'C', 'C', 'G', 'C'];

const saintsVerse = (who: string, doing: string, doingWords: string): VocalLine[] => [
  { melody: S1, words: `Oh when the ${who}` },
  { melody: S1, words: doingWords },
  { melody: S3, words: `Oh when the ${who} ${doing}` },
  { melody: S4, words: 'Oh Lord I want to be in that num-ber' },
  { melody: S5, words: `When the ${who} ${doing}` },
];

const saintsVerseSection = (extra: Partial<Section>, vocals: VocalLine[]): Section => ({
  kind: 'verse', bars: 16, chords: SAINTS_CHORDS, drums: 'parade', bass: 'twobeat', pad: true, guitar: 'chords', keys: 'brass', vocals,
  lights: { palette: ['#ffd23f', '#ff7a1a', '#ff2e63'], movement: 'pulse', fog: 0.4 }, led: 'spiral', intensity: 0.7, ...extra,
});

export const saints: Song = {
  id: 'saints',
  title: 'When the Saints Go Marching In (Forest Parade)',
  tagline: 'Traditional. The band marches in. Kevin marches into a speaker.',
  bpm: 108,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  swing: 0.18,
  progression: SAINTS_CHORDS,
  drumPatterns: {
    snareRoll: { snare: 'x.x.x.x.xxxxxxxx', kick: 'x.......x.......' },
    parade: { kick: 'x.......x.......', snare: '..x...x.o.x...x.', hat: 'x.x.x.x.x.x.x.x.' },
    full: { kick: 'x...x...x...x...', snare: '....x.......x...', clap: '....x.......x...', hat: 'xoxoxoxoxoxoxoxo', crash: 'x...............' },
  },
  bassPatterns: { twobeat: '1-------5-------', walk: '1---3---5---6---' },
  keysPatterns: { brass: '4-..5-..6-..5-..' },
  guitarStabs: '..x-..x-..x-..x-',
  sections: [
    { kind: 'intro', bars: 4, label: 'THE BAND MARCHES IN (drum roll please)', drums: 'snareRoll', bass: 'twobeat', lead: `${S1} ${S1}`, fill: true, lights: { palette: ['#ffd23f', '#ff7a1a'], movement: 'chase', fog: 0.5 }, led: 'tunnel', intensity: 0.5 },
    saintsVerseSection({ label: 'VERSE 1 (traditional)' }, saintsVerse('saints', 'go mar-ching in', 'go mar-ching in')),
    saintsVerseSection({ label: 'VERSE 2: THE BAND', drums: 'full', bass: 'walk', backing: 'ooh', hype: true, intensity: 0.85 }, saintsVerse('band', 'goes mar-ching in', 'goes mar-ching in')),
    {
      kind: 'solo', bars: 8, label: 'FOX SOLO (marching knee slide)', chords: SAINTS_CHORDS.slice(0, 8), drums: 'full', bass: 'walk', pad: true, guitar: 'solo', soloist: 'fox', hype: true, fill: true,
      lights: { palette: ['#ffd23f', '#ffffff', '#ff2e63'], movement: 'chase', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1,
    },
    saintsVerseSection({ label: 'VERSE 3: GREG (everybody!)', kind: 'chorus', drums: 'full', bass: 'walk', backing: 'ooh', hype: true, intensity: 1, lights: { palette: ['#ff4fd8', '#ffd23f', '#00e0c6'], movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido' },
      saintsVerse('goat', 'starts scream-ing loud', 'starts scream-ing loud')),
    { kind: 'outro', bars: 4, label: 'MARCHING OUT (nobody leaves, we just march in place)', drums: 'snareRoll', bass: 'twobeat', lead: S5, hype: true, lights: { palette: ['#ffd23f'], movement: 'still', fog: 0.7 }, led: 'lava', intensity: 0.6 },
  ],
};

// ------------------------------------------------------------------ The Entertainer (Joplin)

const ENT_1 = 'D5:1 D#5:1 E5:2 C6:4 E5:2 C6:4 E5:2 C6:12 C6:2 D6:2 D#6:2 E6:2 C6:2 D6:2 E6:4 B5:2 D6:2 C6:16';
const ENT_2 = 'D5:1 D#5:1 E5:2 C6:4 E5:2 C6:4 E5:2 C6:12 A5:2 G5:2 F#5:2 A5:2 C6:2 E6:4 D6:2 C6:2 A5:2 D6:16';
const ENT_LEAD = `${ENT_1} ${ENT_2} ${ENT_1} ${ENT_1}`;
const ENT_CHORDS = ['C', 'C', 'F', 'C', 'C', 'C', 'D7', 'G', 'C', 'C', 'F', 'C', 'C', 'G', 'C', 'C'];
const RAG = ['#ffcf6b', '#c47a2c', '#fff1a8'];

export const entertainer: Song = {
  id: 'entertainer',
  title: 'The Entertainer (Sloth Rag)',
  tagline: 'Scott Joplin, 1902. Gary has been practising the left hand since 1903.',
  bpm: 88,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: ENT_CHORDS,
  drumPatterns: {
    brush: { hat: 'x.o.x.o.x.o.x.o.', snare: '....o.......o...' },
    rag: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
  },
  bassPatterns: { stride: '1.......5.......' },
  keysPatterns: { stride: '..0.2...4.0.2...' },
  sections: [
    { kind: 'intro', bars: 2, label: 'PROFESSOR HOOTENANNY AT THE UPRIGHT', lead: 'C6:2 B5:2 A5:2 G5:2 F5:4 E5:4 D5:4 C5:4 G4:8', lights: { palette: RAG, movement: 'still', fog: 0.3 }, led: 'lava', intensity: 0.2 },
    { kind: 'verse', bars: 16, chords: ENT_CHORDS, label: 'THE FAMOUS BIT', soloist: 'owl', bass: 'stride', keys: 'stride', drums: 'brush', lead: ENT_LEAD, lights: { palette: RAG, movement: 'pulse', fog: 0.3 }, led: 'spiral', intensity: 0.5 },
    { kind: 'chorus', bars: 16, chords: ENT_CHORDS, label: 'THE FAMOUS BIT (with drums and a penguin)', bass: 'stride', keys: 'stride', drums: 'rag', pad: true, lead: ENT_LEAD, backing: 'honk', hype: true, lights: { palette: RAG, movement: 'sweep', fog: 0.3 }, led: 'kaleido', intensity: 0.8 },
    { kind: 'solo', bars: 8, chords: ENT_CHORDS.slice(0, 8), label: 'FOX TRIES RAGTIME GUITAR', guitar: 'solo', soloist: 'fox', bass: 'stride', drums: 'rag', keys: 'stride', lights: { palette: ['#ffcf6b', '#ff7a1a', '#ffffff'], movement: 'chase', fog: 0.4 }, led: 'tunnel', intensity: 0.9 },
    { kind: 'outro', bars: 2, bass: 'stride', lead: 'C6:4 G5:4 E5:4 C5:4 C5:16', hype: true, lights: { palette: RAG, movement: 'still', fog: 0.4 }, led: 'lava', intensity: 0.4 },
  ],
};

// ------------------------------------------------------------------ Jingle Bells

const JB1 = 'E5:4 E5:4 E5:8 E5:4 E5:4 E5:8';
const JB2 = 'E5:4 G5:4 C5:6 D5:2 E5:16';
const JB3 = 'F5:4 F5:4 F5:6 F5:2 F5:4 E5:4 E5:4 E5:2 E5:2';
const JB4 = 'E5:4 D5:4 D5:4 E5:4 D5:8 G5:8';
const JB8 = 'G5:4 G5:4 F5:4 D5:4 C5:16';
const JINGLE: VocalLine[] = [
  { melody: JB1, words: 'Jin-gle bells, jin-gle bells' },
  { melody: JB2, words: 'Jin-gle all the way' },
  { melody: JB3, words: 'Oh what fun it is to ride in a' },
  { melody: JB4, words: 'one-horse o-pen sleigh, hey!' },
  { melody: JB1, words: 'Jin-gle bells, jin-gle bells' },
  { melody: JB2, words: 'Jin-gle all the way' },
  { melody: JB3, words: 'Oh what fun it is to ride in a' },
  { melody: JB8, words: 'one-horse o-pen sleigh' },
];
const JB_CHORDS = ['C', 'C', 'C', 'C', 'F', 'C', 'D7', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G7', 'C'];
const SNOW = ['#ffffff', '#ff2e63', '#16a34a', '#9ad5ff'];

export const jingleBells: Song = {
  id: 'jingle-bells',
  title: 'Jingle Bells (Sleigh-less Edit)',
  tagline: 'Pierpont, 1857. It is October. The moon brought sleigh bells anyway.',
  bpm: 128,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: JB_CHORDS,
  drumPatterns: {
    sleigh: { hat: 'xxxxxxxxxxxxxxxx', kick: 'x.......x.......' },
    gallop: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', openHat: '..x...x...x...x.' },
  },
  bassPatterns: { polka: '1...5...1...5...' },
  keysPatterns: { bells: '4.6.5.6.4.6.5.6.' },
  guitarStabs: '..x...x...x...x.',
  sections: [
    { kind: 'intro', bars: 4, label: 'SLEIGH BELLS (it\'s a hi-hat, don\'t tell anyone)', drums: 'sleigh', bass: 'polka', keys: 'bells', lights: { palette: SNOW, movement: 'chase', fog: 0.5 }, led: 'spiral', intensity: 0.5 },
    { kind: 'verse', bars: 16, chords: JB_CHORDS, drums: 'sleigh', bass: 'polka', keys: 'bells', pad: true, vocals: JINGLE, lights: { palette: SNOW, movement: 'pulse', fog: 0.5 }, led: 'kaleido', intensity: 0.6 },
    { kind: 'solo', bars: 8, chords: JB_CHORDS.slice(8), label: 'GUITAR SOLO (one-horse power)', drums: 'gallop', bass: 'polka', guitar: 'solo', soloist: 'fox', hype: true, lights: { palette: SNOW, movement: 'chase', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 0.9 },
    { kind: 'chorus', bars: 16, chords: JB_CHORDS, label: 'EVERYBODY (snow optional)', drums: 'gallop', bass: 'polka', keys: 'bells', pad: true, guitar: 'chords', backing: 'ooh', vocals: JINGLE, hype: true, lights: { palette: SNOW, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 4, drums: 'sleigh', bass: 'polka', keys: 'bells', lead: JB8, lights: { palette: SNOW, movement: 'still', fog: 0.7 }, led: 'lava', intensity: 0.4 },
  ],
};

// ------------------------------------------------------------------ Happy Birthday (punk, for Gary)

const HB1 = 'G4:2 G4:2 A4:4 G4:4 C5:4 B4:16';
const HB2 = 'G4:2 G4:2 A4:4 G4:4 D5:4 C5:16';
const HB3 = 'G4:2 G4:2 G5:4 E5:4 C5:4 B4:4 A4:12';
const HB4 = 'F5:2 F5:2 E5:4 C5:4 D5:4 C5:16';
const birthday = (name: string): VocalLine[] => [
  { melody: HB1, words: 'Hap-py birth-day to you' },
  { melody: HB2, words: 'Hap-py birth-day to you' },
  { melody: HB3, words: `Hap-py birth-day dear ${name}` },
  { melody: HB4, words: 'Hap-py birth-day to you' },
];
const HB_CHORDS = ['C', 'G', 'G', 'C', 'C', 'F', 'C', 'G'];
const PUNK = ['#ff2e63', '#111111', '#ffe600'];
const hbVerse = (name: string, extra: Partial<Section> = {}): Section => ({
  kind: 'verse', bars: 8, chords: HB_CHORDS, drums: 'punk', bass: 'eighths', guitar: 'chords', vocals: birthday(name),
  lights: { palette: PUNK, movement: 'chase', fog: 0.4 }, led: 'tunnel', intensity: 0.85, ...extra,
});

export const happyBirthday: Song = {
  id: 'happy-birthday',
  title: 'Happy Birthday (Punk Version, for Gary)',
  tagline: 'Hill sisters, 1893. Public domain. Gary\'s birthday was in March. We are only now ready.',
  bpm: 168,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: HB_CHORDS,
  drumPatterns: {
    count: { hat: 'x...x...x...x...', snare: '............xxxx' },
    punk: { kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
  },
  bassPatterns: { eighths: '1.1.1.1.1.1.1.1.' },
  keysPatterns: {},
  guitarStabs: 'x.x.x.x.x.x.x.x.',
  sections: [
    { kind: 'intro', bars: 4, label: '1-2-3-4! (the octopus counted to 8)', drums: 'count', guitar: 'chords', fill: true, lights: { palette: PUNK, movement: 'strobe', fog: 0.3 }, led: 'tunnel', intensity: 0.7 },
    hbVerse('Ga-ry', { label: 'FOR GARY (he is 47 seconds behind)', soloist: 'sloth', hype: true }),
    hbVerse('Kev-in', { label: 'FOR KEVIN (he fell over)' }),
    { kind: 'drop', bars: 8, chords: HB_CHORDS, label: 'MOSH PIT (gently, there are hedgehogs)', drums: 'punk', bass: 'eighths', guitar: 'chords', backing: 'honk', hype: true, lead: `${HB1} ${HB2}`, lights: { palette: PUNK, movement: 'strobe', lasers: true, fog: 0.5 }, led: 'tunnel', intensity: 1 },
    hbVerse('Greg-gy', { label: 'FOR GREG (MEEEH)', hype: true }),
    { kind: 'solo', bars: 8, chords: HB_CHORDS, label: 'FOX SOLO (birthday shred)', drums: 'punk', bass: 'eighths', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: PUNK, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    hbVerse('For-est', { kind: 'chorus', label: 'FOR EVERYONE (yes, you)', backing: 'ooh', hype: true, intensity: 1 }),
    hbVerse('For-est', { kind: 'chorus', label: 'ONE MORE TIME (louder)', backing: 'ooh', hype: true, intensity: 1 }),
    { kind: 'outro', bars: 4, label: 'Gary blows out the candles (eventually)', drums: 'count', bass: 'eighths', hype: true, lights: { palette: PUNK, movement: 'still', fog: 0.8 }, led: 'lava', intensity: 0.5 },
  ],
};
