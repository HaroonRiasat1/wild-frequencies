// Even more famous songs — all PUBLIC DOMAIN worldwide:
//   • "Can-Can" (Galop infernal) — Offenbach, Orpheus in the Underworld (1858)
//   • "William Tell Overture" (finale) — Rossini (1829)
//   • "Für Elise" — Beethoven (c. 1810)
//   • "Oh! Susanna" — Stephen Foster (1848); first verse + chorus only
//   • "Frère Jacques" / "Are You Sleeping" — traditional round
//   • "La Cucaracha" — traditional Mexican folk song; the second half's
//     English words are ours
// Arrangements (and the goat) are ours.

import type { Song, VocalLine } from './types';

// ------------------------------------------------------------------ Can-Can

const CAN1 = 'C5:4 C5:4 D5:2 F5:2 E5:2 D5:2 G5:4 G5:4 G5:2 A5:2 E5:2 F5:2';
const CAN2 = 'D5:4 D5:4 D5:2 F5:2 E5:2 D5:2 C5:2 C6:2 B5:2 A5:2 G5:2 F5:2 E5:2 D5:2';
const CAN_END = 'D5:4 D5:4 D5:2 F5:2 E5:2 D5:2 C5:2 G5:2 D5:2 E5:2 C5:8';
const CAN = `${CAN1} ${CAN2} ${CAN1} ${CAN_END}`;
const CAN_CHORDS = ['C', 'G7', 'G7', 'C', 'C', 'G7', 'G7', 'C'];
const CABARET = ['#ff2e63', '#ffe066', '#ffffff', '#ff4fd8'];

export const canCan: Song = {
  id: 'can-can',
  title: 'Can-Can (Kick Line Edition)',
  tagline: 'Offenbach, 1858. The penguins have been rehearsing the kicks. Kevin has not.',
  bpm: 150,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: CAN_CHORDS,
  drumPatterns: {
    roll: { snare: 'x.x.x.x.xxxxxxxx', kick: 'x.......x.......' },
    galop: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.' },
    kick: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', clap: '..x...x...x...x.', hat: 'xxxxxxxxxxxxxxxx', crash: 'x...............' },
  },
  bassPatterns: { oompah: '1...5...1...5...', run: '1.5.8.5.1.5.8.5.' },
  keysPatterns: { stab: '..4...5...4...5.' },
  guitarStabs: '..x-..x-..x-..x-',
  sections: [
    { kind: 'intro', bars: 4, label: 'CURTAIN UP (drum roll, feathers everywhere)', drums: 'roll', bass: 'oompah', lead: `${CAN1} ${CAN2}`, fill: true, lights: { palette: CABARET, movement: 'chase', fog: 0.4 }, led: 'spiral', intensity: 0.5 },
    { kind: 'verse', bars: 8, chords: CAN_CHORDS, label: 'THE FAMOUS BIT', soloist: 'owl', drums: 'galop', bass: 'oompah', keys: 'stab', lead: CAN, lights: { palette: CABARET, movement: 'pulse', fog: 0.3 }, led: 'kaleido', intensity: 0.7 },
    { kind: 'chorus', bars: 8, chords: CAN_CHORDS, label: 'KICK LINE (penguins, flamingos, one goat)', drums: 'kick', bass: 'run', pad: true, guitar: 'chords', keys: 'stab', lead: CAN, backing: 'ooh', hype: true, lights: { palette: CABARET, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 1 },
    { kind: 'solo', bars: 8, chords: CAN_CHORDS, label: 'FOX SOLO (high kicks optional)', drums: 'kick', bass: 'run', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: ['#ffe066', '#ff2e63', '#ffffff'], movement: 'strobe', lasers: true, fog: 0.5 }, led: 'tunnel', intensity: 1 },
    { kind: 'chorus', bars: 8, chords: CAN_CHORDS, label: 'ONE MORE KICK LINE (louder)', drums: 'kick', bass: 'run', pad: true, guitar: 'chords', keys: 'stab', lead: CAN, backing: 'ooh', hype: true, lights: { palette: CABARET, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 2, label: 'TA-DAAA (splits, nobody can get up)', drums: 'roll', bass: 'oompah', lead: 'C6:4 G5:4 C6:8 C5:16', hype: true, lights: { palette: CABARET, movement: 'still', fog: 0.6 }, led: 'lava', intensity: 0.6 },
  ],
};

// ------------------------------------------------------------------ William Tell (finale)

const WT1 = 'G4:1 G4:1 G4:2 G4:1 G4:1 G4:2 G4:1 G4:1 C5:2 D5:2 E5:2';
const WT2 = 'G4:1 G4:1 G4:2 G4:1 G4:1 G4:2 G4:1 G4:1 E5:2 C5:2 E5:2';
const WT3 = 'G5:1 G5:1 G5:2 G5:1 G5:1 G5:2 G5:2 F5:2 E5:2 D5:2';
const WT4 = 'C5:4 E5:4 C5:4 G4:4';
const TELL = `${WT1} ${WT2} ${WT1} ${WT3} ${WT1} ${WT2} ${WT3} ${WT4}`;
const TELL_CHORDS = ['C', 'C', 'C', 'G7', 'C', 'C', 'G7', 'C'];
const GALLOP = ['#00b4ff', '#ffe066', '#ff2e63'];

export const williamTell: Song = {
  id: 'william-tell',
  title: 'William Tell Overture (Stampede Mix)',
  tagline: 'Rossini, 1829. Nobody owns a horse. Octavia sounds like four of them.',
  bpm: 152,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: TELL_CHORDS,
  drumPatterns: {
    trot: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx' },
    gallop: { kick: 'x..xx..xx..xx..x', snare: '....x.......x...', ride: 'x.xxx.xxx.xxx.xx', crash: 'x...............' },
  },
  bassPatterns: { gallop: '1.11.11.5.55.55.' },
  keysPatterns: { fanfare: '4...4...5...6...' },
  guitarStabs: 'x.xx.xx.x.xx.xx.',
  sections: [
    { kind: 'intro', bars: 2, label: 'TRUMPET CALL (it\'s an owl, he\'s trying)', lead: 'G4:2 G4:2 C5:4 E5:4 G5:4 E5:4 G5:4 C6:8', lights: { palette: GALLOP, movement: 'still', fog: 0.4 }, led: 'lava', intensity: 0.3 },
    { kind: 'verse', bars: 8, chords: TELL_CHORDS, label: 'THE GALLOP', soloist: 'owl', drums: 'trot', bass: 'gallop', keys: 'fanfare', lead: TELL, lights: { palette: GALLOP, movement: 'chase', fog: 0.4 }, led: 'tunnel', intensity: 0.7 },
    { kind: 'chorus', bars: 8, chords: TELL_CHORDS, label: 'FULL STAMPEDE', drums: 'gallop', bass: 'gallop', pad: true, guitar: 'chords', keys: 'fanfare', lead: TELL, backing: 'honk', hype: true, lights: { palette: GALLOP, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'solo', bars: 8, chords: TELL_CHORDS, label: 'OCTAVIA IS EIGHT HORSES', drums: 'gallop', drumSolo: true, bass: 'gallop', lead: TELL, soloist: 'octopus', fill: true, lights: { palette: ['#ffffff', '#00b4ff', '#ff2e63'], movement: 'strobe', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1 },
    { kind: 'chorus', bars: 8, chords: TELL_CHORDS, label: 'HOME STRETCH', drums: 'gallop', bass: 'gallop', pad: true, guitar: 'chords', keys: 'fanfare', lead: TELL, backing: 'ooh', hype: true, lights: { palette: GALLOP, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 2, label: 'PHOTO FINISH', drums: 'gallop', bass: 'gallop', lead: 'G5:2 G5:2 G5:4 C6:4 _:4 C5:16', hype: true, lights: { palette: GALLOP, movement: 'still', fog: 0.7 }, led: 'lava', intensity: 0.6 },
  ],
};

// ------------------------------------------------------------------ Für Elise (power ballad)

const FE1 = 'E5:2 D#5:2 E5:2 D#5:2 E5:2 B4:2 D5:2 C5:2 A4:6 C4:2 E4:2 A4:2 B4:6 E4:2 G#4:2 B4:2 C5:6 E4:2';
const FE2 = 'E5:2 D#5:2 E5:2 D#5:2 E5:2 B4:2 D5:2 C5:2 A4:6 C4:2 E4:2 A4:2 B4:6 E4:2 C5:2 B4:2 A4:8';
const ELISE = `${FE1} ${FE2}`;
const FE_CHORDS = ['Am', 'Am', 'E', 'Am', 'Am', 'Am'];
const CANDLE = ['#c7a2ff', '#ff9ad5', '#9ad5ff'];

export const furElise: Song = {
  id: 'fur-elise',
  title: 'Für Elise (Power Ballad)',
  tagline: 'Beethoven, c. 1810. Nobody knows who Elise was. The owl claims he does.',
  bpm: 96,
  key: 'A minor',
  tonic: 'A',
  scale: 'minor',
  voice: 'cat',
  ballad: true,
  progression: FE_CHORDS,
  drumPatterns: {
    ballad: { kick: 'x......x..x.....', snare: '....o.......x...', hat: 'x.o.x.o.x.o.x.o.' },
    big: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
  },
  bassPatterns: { slow: '1-------5-------' },
  keysPatterns: { arp: '0.1.2.4.0.1.2.4.' },
  guitarStabs: 'x-------x-------',
  sections: [
    { kind: 'intro', bars: 6, chords: FE_CHORDS, label: 'PROFESSOR HOOTENANNY, ALONE, UNDER ONE SPOTLIGHT', soloist: 'owl', lead: ELISE, lights: { palette: CANDLE, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.15 },
    { kind: 'verse', bars: 6, chords: FE_CHORDS, label: 'GARY JOINS (slowly)', bass: 'slow', pad: true, lead: ELISE, lights: { palette: CANDLE, movement: 'sweep', fog: 0.9 }, led: 'spiral', intensity: 0.35 },
    { kind: 'chorus', bars: 6, chords: FE_CHORDS, label: 'LIGHTERS UP', bass: 'slow', pad: true, drums: 'ballad', guitar: 'chords', keys: 'arp', lead: ELISE, backing: 'ooh', lights: { palette: CANDLE, movement: 'sweep', fog: 1 }, led: 'kaleido', intensity: 0.6 },
    { kind: 'solo', bars: 6, chords: FE_CHORDS, label: 'FOX POWER-BALLAD SOLO (wind machine on)', bass: 'slow', pad: true, drums: 'big', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: ['#ff9ad5', '#ffffff', '#c7a2ff'], movement: 'chase', lasers: true, fog: 1 }, led: 'tunnel', intensity: 0.9 },
    { kind: 'chorus', bars: 6, chords: FE_CHORDS, label: 'EVERYBODY (whisper it, then don\'t)', bass: 'slow', pad: true, drums: 'big', guitar: 'chords', keys: 'arp', lead: ELISE, backing: 'ooh', hype: true, lights: { palette: CANDLE, movement: 'chase', lasers: true, fog: 1 }, led: 'kaleido', intensity: 0.9 },
    { kind: 'outro', bars: 3, chords: ['Am', 'E', 'Am'], lead: FE2, pad: true, lights: { palette: CANDLE, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.2 },
  ],
};

// ------------------------------------------------------------------ Oh! Susanna (hoedown)

const OS_A = '_:12 C5:2 D5:2 E5:4 G5:3 G5:1 A5:4 G5:4 E5:3 C5:1 D5:4 E5:4 E5:4 D5:4 D5:12';
const OS_B = '_:12 C5:2 D5:2 E5:4 G5:3 G5:1 A5:4 G5:4 E5:3 C5:1 D5:4 E5:4 E5:4 D5:2 D5:2 C5:12';
const OS_CH = 'F5:8 A5:4 A5:8 A5:4 G5:4 G5:4 E5:4 C5:4 D5:4 D5:12 _:8';
const SUSANNA_VERSE: VocalLine[] = [
  { melody: OS_A, words: 'I come from Al-a-ba-ma with a ban-jo on my knee' },
  { melody: OS_B, words: 'I\'m go-ing to Lou-i-si-an-a my true love for to see' },
];
const SUSANNA_CHORUS: VocalLine[] = [
  { melody: OS_CH, words: 'Oh Su-san-na, oh don\'t you cry for me' },
  { melody: OS_B, words: 'for I come from Al-a-ba-ma with a ban-jo on my knee' },
];
const OS_VERSE_CHORDS = ['C', 'C', 'C', 'G', 'C', 'C', 'G', 'C'];
const OS_CHORUS_CHORDS = ['F', 'C', 'C', 'G', 'C', 'C', 'G', 'C'];
const BARN = ['#ffcf6b', '#ff7a1a', '#7cff4f'];

export const ohSusanna: Song = {
  id: 'oh-susanna',
  title: 'Oh! Susanna (Banjo-less Hoedown)',
  tagline: 'Stephen Foster, 1848. There is no banjo. Rusty is doing his best impression.',
  bpm: 120,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  swing: 0.12,
  progression: OS_VERSE_CHORDS,
  drumPatterns: {
    stomp: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    hoedown: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' },
  },
  bassPatterns: { oompah: '1...5...1...5...', walk: '1...3...5...6...' },
  keysPatterns: { banjo: '0.2.1.2.0.2.1.2.' },
  guitarStabs: '..x...x...x...x.',
  sections: [
    { kind: 'intro', bars: 4, label: 'YEE-HAW (in a forest, at night)', drums: 'hoedown', bass: 'oompah', keys: 'banjo', lights: { palette: BARN, movement: 'chase', fog: 0.3 }, led: 'spiral', intensity: 0.5 },
    { kind: 'verse', bars: 8, chords: OS_VERSE_CHORDS, drums: 'stomp', bass: 'oompah', keys: 'banjo', guitar: 'chords', vocals: SUSANNA_VERSE, lights: { palette: BARN, movement: 'pulse', fog: 0.3 }, led: 'spiral', intensity: 0.65 },
    { kind: 'chorus', bars: 8, chords: OS_CHORUS_CHORDS, label: 'OH! SUSANNA (everybody)', drums: 'hoedown', bass: 'walk', pad: true, keys: 'banjo', guitar: 'chords', backing: 'ooh', vocals: SUSANNA_CHORUS, hype: true, lights: { palette: BARN, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.95 },
    { kind: 'solo', bars: 8, chords: OS_VERSE_CHORDS, label: 'FOX "BANJO" SOLO (it is a guitar)', drums: 'hoedown', bass: 'walk', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: ['#ffcf6b', '#ffffff', '#ff7a1a'], movement: 'chase', lasers: true, fog: 0.5 }, led: 'tunnel', intensity: 1 },
    { kind: 'verse', bars: 8, chords: OS_VERSE_CHORDS, label: 'VERSE (again, louder)', drums: 'stomp', bass: 'walk', keys: 'banjo', guitar: 'chords', vocals: SUSANNA_VERSE, lights: { palette: BARN, movement: 'pulse', fog: 0.4 }, led: 'spiral', intensity: 0.75 },
    { kind: 'chorus', bars: 8, chords: OS_CHORUS_CHORDS, label: 'OH! SUSANNA (Greg knows one word of it)', drums: 'hoedown', bass: 'walk', pad: true, keys: 'banjo', guitar: 'chords', backing: 'ooh', vocals: SUSANNA_CHORUS, hype: true, lights: { palette: BARN, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 2, drums: 'hoedown', bass: 'oompah', lead: 'G5:4 E5:4 D5:4 _:4 C5:16', hype: true, lights: { palette: BARN, movement: 'still', fog: 0.6 }, led: 'lava', intensity: 0.5 },
  ],
};

// ------------------------------------------------------------------ Frère Jacques (a rock round)

const FJ1 = 'C5:4 D5:4 E5:4 C5:4 C5:4 D5:4 E5:4 C5:4';
const FJ2 = 'E5:4 F5:4 G5:8 E5:4 F5:4 G5:8';
const FJ3 = 'G5:2 A5:2 G5:2 F5:2 E5:4 C5:4 G5:2 A5:2 G5:2 F5:2 E5:4 C5:4';
const FJ4 = 'C5:4 G4:4 C5:8 C5:4 G4:4 C5:8';
const JACQUES: VocalLine[] = [
  { melody: FJ1, words: 'Are you sleep-ing, are you sleep-ing' },
  { melody: FJ2, words: 'Bro-ther John, Bro-ther John' },
  { melody: FJ3, words: 'Morn-ing bells are ring-ing, morn-ing bells are ring-ing' },
  { melody: FJ4, words: 'Ding dang dong, ding dang dong' },
];
// the owl comes in two bars later — that's what makes it a round
const ROUND = `_:32 ${FJ1} ${FJ2} ${FJ3} ${FJ4}`;
const FJ_CHORDS = ['C', 'C', 'C', 'C', 'C', 'G', 'C', 'G'];
const DAWN = ['#ffd23f', '#ff9ad5', '#9ad5ff'];

export const frereJacques: Song = {
  id: 'frere-jacques',
  title: 'Are You Sleeping? (Frère Jacques, Wake-Up Call)',
  tagline: 'Traditional round. Brother John is Gary. He is, in fact, sleeping.',
  bpm: 116,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  progression: FJ_CHORDS,
  drumPatterns: {
    bells: { hat: 'x...x...x...x...', ride: '..x...x...x...x.' },
    rock: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    big: { kick: 'x.....x.x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
  },
  bassPatterns: { pulse: '1.1.1.1.1.1.1.1.', rock: '1...1.5.1...5.8.' },
  keysPatterns: { bells: '4...6...5...6...' },
  guitarStabs: 'x-..x-..x-..x-..',
  sections: [
    { kind: 'intro', bars: 4, label: 'MORNING BELLS (it is 3am)', drums: 'bells', keys: 'bells', lead: `${FJ1} ${FJ2}`, lights: { palette: DAWN, movement: 'still', fog: 0.6 }, led: 'lava', intensity: 0.25 },
    { kind: 'verse', bars: 8, chords: FJ_CHORDS, label: 'SIR REGINALD WAKES GARY', soloist: 'sloth', drums: 'rock', bass: 'pulse', keys: 'bells', vocals: JACQUES, lights: { palette: DAWN, movement: 'pulse', fog: 0.4 }, led: 'spiral', intensity: 0.6 },
    { kind: 'chorus', bars: 8, chords: FJ_CHORDS, label: 'THE ROUND (owl comes in late, on purpose)', drums: 'big', bass: 'rock', pad: true, guitar: 'chords', vocals: JACQUES, lead: ROUND, backing: 'ooh', hype: true, lights: { palette: DAWN, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.9 },
    { kind: 'solo', bars: 8, chords: FJ_CHORDS, label: 'FOX SOLO (Gary is STILL asleep)', drums: 'big', bass: 'rock', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: ['#ffd23f', '#ffffff', '#ff2e63'], movement: 'chase', lasers: true, fog: 0.5 }, led: 'tunnel', intensity: 1 },
    { kind: 'chorus', bars: 8, chords: FJ_CHORDS, label: 'EVERYBODY, A ROUND (start whenever, it works)', drums: 'big', bass: 'rock', pad: true, guitar: 'chords', vocals: JACQUES, lead: ROUND, backing: 'ooh', hype: true, lights: { palette: DAWN, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 2, label: 'DING. DANG. DONG. (Gary wakes up)', drums: 'bells', bass: 'pulse', lead: FJ4, backing: 'honk', hype: true, lights: { palette: DAWN, movement: 'still', fog: 0.6 }, led: 'lava', intensity: 0.5 },
  ],
};

// ------------------------------------------------------------------ La Cucaracha (fiesta)

const LC1 = 'C5:2 C5:2 C5:2 F5:6 A5:4 C5:2 C5:2 C5:2 F5:6 A5:4';
const LC2 = 'F5:2 F5:2 E5:2 E5:2 D5:2 D5:2 C5:12 _:8';
const LC3 = 'C5:2 C5:2 C5:2 E5:6 G5:4 C5:2 C5:2 C5:2 E5:6 G5:4';
const LC4 = 'C6:4 D6:2 C6:2 A#5:2 A5:2 G5:2 F5:10 _:8';
const CUCARACHA: VocalLine[] = [
  { melody: LC1, words: 'La cu-ca-ra-cha, la cu-ca-ra-cha' },
  { melody: LC2, words: 'ya no pue-de ca-mi-nar' },
  { melody: LC3, words: 'be-cause the goat ate, be-cause the goat ate' },
  { melody: LC4, words: 'all the shoes it had to wear' },
];
const LC_CHORDS = ['F', 'F', 'C7', 'C7', 'C7', 'C7', 'C7', 'F'];
const FIESTA = ['#ff2e63', '#ffd23f', '#00e0c6', '#7cff4f'];

export const laCucaracha: Song = {
  id: 'la-cucaracha',
  title: 'La Cucaracha (Fiesta in the Forest)',
  tagline: 'Traditional. The cockroach could not walk. Greg ate its shoes. Greg is not sorry.',
  bpm: 132,
  key: 'F major',
  tonic: 'F',
  scale: 'major',
  voice: 'cat',
  progression: LC_CHORDS,
  drumPatterns: {
    fiesta: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.', clap: '......x.......x.' },
    big: { kick: 'x...x...x...x...', snare: '..x...x...x...x.', clap: '..x...x...x...x.', hat: 'xxxxxxxxxxxxxxxx', crash: 'x...............' },
  },
  bassPatterns: { oompah: '1...5...1...5...', run: '1.3.5.3.1.3.5.8.' },
  keysPatterns: { mariachi: '4.5.6.5.4.5.6.5.' },
  guitarStabs: '..x-..x-..x-..x-',
  sections: [
    { kind: 'intro', bars: 4, label: 'TRUMPETS (it is the owl again)', drums: 'fiesta', bass: 'oompah', lead: `${LC1} ${LC2}`, lights: { palette: FIESTA, movement: 'chase', fog: 0.3 }, led: 'spiral', intensity: 0.55 },
    { kind: 'verse', bars: 8, chords: LC_CHORDS, drums: 'fiesta', bass: 'oompah', keys: 'mariachi', guitar: 'chords', vocals: CUCARACHA, lights: { palette: FIESTA, movement: 'pulse', fog: 0.3 }, led: 'kaleido', intensity: 0.7 },
    { kind: 'chorus', bars: 8, chords: LC_CHORDS, label: 'LA CUCARACHA (everybody!)', drums: 'big', bass: 'run', pad: true, keys: 'mariachi', guitar: 'chords', vocals: CUCARACHA, backing: 'ooh', hype: true, lights: { palette: FIESTA, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 1 },
    { kind: 'solo', bars: 8, chords: LC_CHORDS, label: 'GREG\'S SHOE-EATING SOLO (it\'s the fox)', drums: 'big', bass: 'run', guitar: 'solo', soloist: 'fox', fill: true, lights: { palette: ['#ffd23f', '#ff2e63', '#ffffff'], movement: 'strobe', lasers: true, fog: 0.5 }, led: 'tunnel', intensity: 1 },
    { kind: 'chorus', bars: 8, chords: LC_CHORDS, label: 'ONE MORE TIME (the cockroach is dancing now)', drums: 'big', bass: 'run', pad: true, keys: 'mariachi', guitar: 'chords', vocals: CUCARACHA, backing: 'ooh', hype: true, lights: { palette: FIESTA, movement: 'chase', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 1 },
    { kind: 'outro', bars: 2, label: '¡OLÉ! (Greg: MEEEH)', drums: 'fiesta', bass: 'oompah', lead: 'C6:2 A5:2 F5:4 C6:4 _:4 F5:16', hype: true, lights: { palette: FIESTA, movement: 'still', fog: 0.5 }, led: 'lava', intensity: 0.5 },
  ],
};

/** Request-only bonus covers (public domain), round three. */
export const MORE_COVERS: Song[] = [canCan, williamTell, furElise, ohSusanna, frereJacques, laCucaracha];
