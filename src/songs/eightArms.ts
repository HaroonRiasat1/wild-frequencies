import type { Section, Song, VocalLine } from './types';

const DEEP = ['#00b4ff', '#7b2cff', '#00ffa3'];
const INK = ['#2b0b5c', '#ff2e97', '#00b4ff'];

const CHORUS: VocalLine[] = [
  { melody: 'A5:4 G5:2 F5:2 G5:4 A5:4 F5:4 D5:4 D5:8', words: 'Eight arms of love, wrapped a-round you' },
  { melody: 'A5:4 G5:2 F5:2 G5:4 A5:4 C6:4 G5:4 E5:8', words: 'Suc-tion cups for ev-ery heart-beat' },
  { melody: 'A5:4 G5:2 F5:2 G5:4 A5:4 F5:4 D5:4 D5:8', words: 'Eight arms of love, ink-y and true' },
  { melody: 'F5:2 F5:2 E5:2 D5:2 E5:4 C5:4 D5:16', words: 'Sor-ry \'bout the ink on you' },
];

const chorus = (extra: Partial<Section> = {}): Section => ({
  kind: 'chorus', bars: 8, drums: 'groove', bass: 'drive', pad: true, guitar: 'chords', keys: 'arp', backing: 'ooh', vocals: CHORUS,
  hype: true, lights: { palette: INK, movement: 'sweep', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.9, ...extra,
});

export const eightArms: Song = {
  id: 'eight-arms',
  title: 'Eight Arms of Love',
  tagline: 'A romantic drum showcase. Splash zone: rows 1 through 6.',
  bpm: 124,
  key: 'D minor',
  tonic: 'D',
  scale: 'minor',
  voice: 'cat',
  progression: ['Dm', 'Bb', 'F', 'C'],
  drumPatterns: {
    intro: { kick: 'x.x...x.x.x...x.', snare: '....x..o....x.oo', hat: 'xoxoxoxoxoxoxoxo', tomLo: '..............x.' },
    groove: { kick: 'x..x..x.x..x..x.', snare: '....x.......x..o', hat: 'xoxoxoxoxoxoxoxo', openHat: '..............x.' },
    solo: { kick: 'x..xx.x.x..xx.x.', snare: '....x.......x...', ride: 'x.xxx.xxx.xxx.xx', crash: 'x...............' },
  },
  bassPatterns: {
    drive: '1.1.1.1.8.1.5.b.',
  },
  keysPatterns: {
    arp: '0.1.2.4.2.1.0.1.',
  },
  guitarStabs: 'x-..x-..x-..x.x.',
  sections: [
    {
      kind: 'intro', bars: 4, label: 'OCTAVIA WARMS UP (all eight arms)', drums: 'intro', soloist: 'octopus', fill: true,
      lights: { palette: DEEP, movement: 'chase', fog: 0.6 }, led: 'tunnel', intensity: 0.6,
    },
    {
      kind: 'verse', bars: 8, drums: 'groove', bass: 'drive', keys: 'arp', pad: true,
      vocals: [
        { melody: 'D5:2 D5:2 D5:2 C5:2 A4:4 F4:4 G4:2 A4:2 G4:4 _:8', words: 'Eight arms of love and I\'m us-ing all' },
        { melody: 'F5:2 F5:2 F5:2 E5:2 C5:4 A4:4 C5:2 D5:2 E5:4 _:8', words: 'One for the hi-hat, one for your hand' },
        { melody: 'D5:2 D5:2 D5:2 C5:2 A4:4 F4:4 G4:2 A4:2 G4:4 _:8', words: 'Two for the toms and one for the crash' },
        { melody: 'F5:2 F5:2 F5:2 E5:2 C5:4 A4:4 C5:2 D5:2 E5:4 _:8', words: 'Three left to hug you, I count-ed twice' },
      ],
      lights: { palette: DEEP, movement: 'pulse', fog: 0.5 }, led: 'spiral', intensity: 0.6,
    },
    chorus({ fill: true }),
    {
      kind: 'solo', bars: 8, label: 'DRUM SOLO (please mind the ink)', drums: 'solo', drumSolo: true, bass: 'drive', soloist: 'octopus',
      hype: true, fill: true,
      lights: { palette: ['#ff2e97', '#ffffff', '#00ffa3'], movement: 'strobe', lasers: true, fog: 0.7 }, led: 'tunnel', intensity: 1,
    },
    {
      kind: 'verse', bars: 8, drums: 'groove', bass: 'drive', keys: 'arp', pad: true,
      vocals: [
        { melody: 'D5:2 D5:2 D5:2 C5:2 A4:4 F4:4 G4:2 A4:2 G4:4 _:8', words: 'Ink on the cym-bals, ink on the floor' },
        { melody: 'F5:2 F5:2 F5:2 E5:2 C5:4 A4:4 C5:2 D5:2 E5:4 _:8', words: 'Jan-i-tor\'s cry-ing out-side the door' },
        { melody: 'D5:2 D5:2 D5:2 C5:2 A4:4 F4:4 G4:2 A4:2 G4:4 _:8', words: 'Gave you my heart, all three of them, babe' },
        { melody: 'F5:2 F5:2 F5:2 E5:2 C5:4 A4:4 C5:2 D5:2 E5:4 _:8', words: 'Blue blood\'s ro-man-tic, it\'s not a phase' },
      ],
      lights: { palette: DEEP, movement: 'pulse', fog: 0.5 }, led: 'lava', intensity: 0.65,
    },
    chorus({ fill: true, intensity: 1 }),
    {
      kind: 'solo', bars: 4, label: 'ONE MORE FILL (she promised)', drums: 'solo', drumSolo: true, bass: 'drive', soloist: 'octopus', fill: true,
      lights: { palette: INK, movement: 'chase', lasers: true, fog: 0.8 }, led: 'tunnel', intensity: 1,
    },
    {
      kind: 'outro', bars: 4, pad: true, keys: 'arp', drums: 'intro',
      lights: { palette: DEEP, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.3,
    },
  ],
};
