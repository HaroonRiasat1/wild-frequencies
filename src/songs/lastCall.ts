import type { Section, Song, VocalLine } from './types';

const AMBER = ['#ffb347', '#ff6f91', '#ffe29a'];
const SUNRISE = ['#ff9671', '#ffc75f', '#f9f871', '#d65db1'];

const CHORUS: VocalLine[] = [
  { melody: 'G4:4 C5:4 C5:2 D5:2 E5:4 D5:4 C5:2 B4:2 G4:8', words: 'Raise your paws for the last call to-night' },
  { melody: 'A4:4 C5:4 C5:2 D5:2 E5:4 F5:4 E5:2 D5:2 C5:8', words: 'Hoof, claw and fin, we were all al-right' },
  { melody: 'G4:4 C5:4 C5:2 D5:2 E5:4 D5:4 C5:2 B4:2 G4:8', words: 'Raise your paws for the last call to-night' },
  { melody: 'A4:4 C5:4 C5:2 D5:2 E5:4 D5:4 B4:2 D5:2 C5:8', words: 'See you next full moon, same time, same spot' },
];

const chorus = (extra: Partial<Section> = {}): Section => ({
  kind: 'chorus', bars: 8, drums: 'stomp', bass: 'walk', pad: true, guitar: 'chords', keys: 'piano', backing: 'ooh', vocals: CHORUS,
  lights: { palette: SUNRISE, movement: 'sweep', lasers: true, fog: 0.5 }, led: 'kaleido', intensity: 0.9, ...extra,
});

export const lastCall: Song = {
  id: 'last-call',
  title: 'Last Call at the Watering Hole',
  tagline: 'The encore. A singalong. The bartender is a badger. Tip him.',
  bpm: 100,
  key: 'C major',
  tonic: 'C',
  scale: 'major',
  voice: 'cat',
  encore: true,
  progression: ['C', 'G', 'Am', 'F'],
  drumPatterns: {
    stomp: { kick: 'x.......x.x.....', snare: '....x.......x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    soft: { kick: 'x.......x.......', hat: 'x.o.x.o.x.o.x.o.' },
  },
  bassPatterns: {
    walk: '1---5---8---5-3-',
  },
  keysPatterns: {
    piano: '0.1.2.1.0.1.2.1.',
  },
  guitarStabs: 'x-..x-..x-..x-x-',
  sections: [
    {
      kind: 'intro', bars: 4, label: 'ENCORE!!! (they came back!!!)', pad: true, keys: 'piano', drums: 'soft', hype: true,
      lights: { palette: AMBER, movement: 'still', fog: 0.7 }, led: 'lava', intensity: 0.4,
    },
    {
      kind: 'verse', bars: 8, pad: true, keys: 'piano', bass: 'walk', drums: 'soft',
      vocals: [
        { melody: 'E4:2 E4:2 E4:2 F4:2 G4:4 E4:4 D4:4 D4:4 _:8', words: 'Last call at the wa-ter-ing hole' },
        { melody: 'C4:2 C4:2 E4:2 G4:2 A4:4 G4:4 F4:4 F4:4 _:8', words: 'Bear\'s on his fifth bowl of hon-ey' },
        { melody: 'E4:2 E4:2 E4:2 F4:2 G4:4 E4:4 D4:4 D4:4 _:8', words: 'Moon\'s yawn-ing, the frogs all went home' },
        { melody: 'C4:2 C4:2 E4:2 G4:2 A4:4 G4:4 F4:4 F4:4 _:8', words: 'One more sip, then we wan-der off' },
      ],
      lights: { palette: AMBER, movement: 'sweep', fog: 0.5 }, led: 'lava', intensity: 0.5,
    },
    chorus({ hype: true }),
    {
      kind: 'verse', bars: 8, pad: true, keys: 'piano', bass: 'walk', drums: 'stomp', guitar: 'chords', fill: true,
      vocals: [
        { melody: 'E4:2 E4:2 E4:2 F4:2 G4:4 E4:4 D4:4 D4:4 _:8', words: 'Ot-ter\'s still danc-ing by the reeds' },
        { melody: 'C4:2 C4:2 E4:2 G4:2 A4:4 G4:4 F4:4 F4:4 _:8', words: 'Owl took his sun-glass-es off, gasp' },
        { melody: 'E4:2 E4:2 E4:2 F4:2 G4:4 E4:4 D4:4 D4:4 _:8', words: 'Frog\'s still sur-fing on some-bo-dy' },
        { melody: 'C4:2 C4:2 E4:2 G4:2 A4:4 G4:4 F4:4 F4:4 _:8', words: 'Goat says MEEH and we all say same' },
      ],
      lights: { palette: AMBER, movement: 'pulse', fog: 0.5 }, led: 'spiral', intensity: 0.65,
    },
    chorus({ fill: true }),
    chorus({ label: 'EVERYBODY SING (yes, you, the hedgehog)', hype: true, intensity: 1, led: 'tunnel' }),
    {
      kind: 'outro', bars: 4, pad: true, keys: 'piano', bass: 'walk', backing: 'ooh', drums: 'soft',
      lights: { palette: SUNRISE, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.4,
    },
  ],
};
