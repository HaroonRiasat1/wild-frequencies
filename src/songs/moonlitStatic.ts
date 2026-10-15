import type { Song } from './types';

const VIOLET = ['#7b2cff', '#ff4fd8', '#3a1cff'];
const TEAL = ['#00e0c6', '#7b2cff', '#ffe066'];

export const moonlitStatic: Song = {
  id: 'moonlit-static',
  title: 'Moonlit Static',
  tagline: 'A love song to a radio tower. The radio tower did not reply.',
  bpm: 96,
  key: 'A minor',
  tonic: 'A',
  scale: 'minor',
  voice: 'cat',
  progression: ['Am7', 'Fmaj7', 'C', 'G'],
  drumPatterns: {
    hats: { hat: 'x.o.x.o.x.o.x.o.' },
    verse: { kick: 'x.......x.x.....', snare: '....o.......o...', hat: 'x.o.x.o.x.o.x.o.' },
    build: { kick: 'x...x...x...x...', snare: 'x.x.x.x.xxxxxxxx', hat: 'xxxxxxxxxxxxxxxx' },
    full: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'xoxoxoxoxoxoxoxo', openHat: '..............x.' },
  },
  bassPatterns: {
    pulse: '1-------5---8---',
    groove: '1--.1.5.8--.b.5.',
  },
  keysPatterns: {
    arp: '0.1.2.3.4.3.2.1.',
    shimmer: '4-..6-..5-..7-..',
  },
  guitarStabs: 'x-..x-..x-..x.x.',
  sections: [
    {
      kind: 'intro', bars: 8, label: 'INTRO (atmospheric humming)', pad: true, keys: 'arp',
      lead: 'E5:6 D5:2 C5:8 C5:6 A4:2 A4:8 G4:6 E5:2 E5:8 D5:8 B4:8',
      drums: null, lights: { palette: VIOLET, movement: 'still', fog: 0.9 }, led: 'lava', intensity: 0.15,
    },
    {
      kind: 'verse', bars: 8, pad: true, bass: 'pulse', drums: 'hats', keys: 'shimmer',
      vocals: [
        { melody: '_:2 E4:2 E4:2 G4:2 A4:4 G4:2 E4:2 D4:2 C4:2 E4:8 _:4', words: 'Moon-lit sta-tic on my whis-kers, oh' },
        { melody: '_:2 E4:2 G4:2 G4:2 C5:4 B4:2 G4:2 A4:2 G4:2 D4:8 _:4', words: 'Ra-di-o hum-ming in the pine trees' },
        { melody: '_:2 A4:2 A4:2 C5:2 E5:4 D5:2 C5:2 A4:2 G4:2 A4:8 _:4', words: 'Fire-flies are tun-ing in to me now' },
        { melody: '_:4 G4:2 E4:2 G4:4 A4:4 B4:4 D5:4 B4:8', words: 'Pur-ring on a fre-quen-cy' },
      ],
      lights: { palette: VIOLET, movement: 'sweep', fog: 0.6 }, led: 'lava', intensity: 0.35,
    },
    {
      kind: 'build', bars: 4, label: 'BUILD (everybody hold your whiskers)', pad: true, bass: 'pulse', drums: 'build', keys: 'arp', fill: true,
      backing: 'ooh', lights: { palette: TEAL, movement: 'chase', fog: 0.5 }, led: 'tunnel', intensity: 0.6,
    },
    {
      kind: 'drop', bars: 8, label: 'THE DROP', hype: true, pad: true, bass: 'groove', drums: 'full', keys: 'arp', guitar: 'chords',
      backing: 'ooh',
      vocals: [
        { melody: 'E5:4 E5:2 D5:2 C5:4 D5:4 C5:2 A4:2 A4:12', words: 'Oh, moon-lit sta-tic, crunch-y night' },
        { melody: 'E5:4 E5:2 D5:2 C5:4 E5:4 G5:4 D5:4 B4:8', words: 'I can hear the sat-el-lites bark' },
        { melody: 'E5:4 E5:2 D5:2 C5:4 D5:4 C5:2 A4:2 A4:12', words: 'Oh, moon-lit sta-tic, tune me in' },
        { melody: 'C5:4 B4:2 A4:2 G4:4 A4:4 A4:16', words: 'Night owls get the good worms' },
      ],
      lights: { palette: ['#ff4fd8', '#00e0c6', '#ffe066', '#7b2cff'], movement: 'sweep', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.9,
    },
    {
      kind: 'verse', bars: 8, pad: true, bass: 'groove', drums: 'verse', keys: 'shimmer', fill: true,
      vocals: [
        { melody: '_:2 E4:2 E4:2 G4:2 A4:4 G4:2 E4:2 D4:2 C4:2 E4:8 _:4', words: 'Sat-el-lite dish-es are pur-ring back' },
        { melody: '_:2 E4:2 G4:2 G4:2 C5:4 B4:2 G4:2 A4:2 G4:2 D4:8 _:4', words: 'Ev-ery cric-ket\'s on the same chan-nel' },
        { melody: '_:2 A4:2 A4:2 C5:2 E5:4 D5:2 C5:2 A4:2 G4:2 A4:8 _:4', words: 'Who-ev-er\'s lis-ten-ing, please send snacks' },
        { melody: '_:4 G4:2 E4:2 G4:4 A4:4 B4:4 D5:4 B4:8', words: 'Tu-na fla-voured ra-di-o' },
      ],
      lights: { palette: VIOLET, movement: 'pulse', fog: 0.5 }, led: 'spiral', intensity: 0.5,
    },
    {
      kind: 'chorus', bars: 8, label: 'FINAL CHORUS', hype: true, pad: true, bass: 'groove', drums: 'full', keys: 'arp', guitar: 'chords',
      backing: 'ooh',
      vocals: [
        { melody: 'E5:4 E5:2 D5:2 C5:4 D5:4 C5:2 A4:2 A4:12', words: 'Oh, moon-lit sta-tic, crunch-y night' },
        { melody: 'E5:4 E5:2 D5:2 C5:4 E5:4 G5:4 D5:4 B4:8', words: 'I can hear the sat-el-lites bark' },
        { melody: 'E5:4 E5:2 D5:2 C5:4 D5:4 C5:2 A4:2 A4:12', words: 'Oh, moon-lit sta-tic, tune me in' },
        { melody: 'C5:4 B4:2 A4:2 G4:4 A4:4 A4:16', words: 'Night owls get the good worms' },
      ],
      lights: { palette: ['#ff4fd8', '#00e0c6', '#ffe066', '#7b2cff'], movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 1,
    },
    {
      kind: 'outro', bars: 4, pad: true, keys: 'arp', bass: 'pulse',
      lights: { palette: VIOLET, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.2,
    },
  ],
};
