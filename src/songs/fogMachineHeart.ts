import type { Song, VocalLine } from './types';

const MIST = ['#ff9ad5', '#9ad5ff', '#c7a2ff'];
const GOLD = ['#ffcf6b', '#ff7ab6', '#8f7bff'];

const CHORUS: VocalLine[] = [
  { melody: 'C5:4 F5:6 E5:2 F5:4 E5:4 C5:4 A4:8', words: 'Oh, my fog ma-chine heart, oh' },
  { melody: 'D5:4 F5:6 E5:2 D5:4 C5:4 A4:4 G4:8', words: 'Pump-ing out the sad-dest mist' },
  { melody: 'C5:4 F5:6 E5:2 F5:4 E5:4 C5:4 A4:8', words: 'Oh my damp lit-tle heart, oh' },
  { melody: 'D5:4 C5:4 Bb4:4 A4:4 G4:8 F4:8', words: 'Some-one o-pen a door' },
];

export const fogMachineHeart: Song = {
  id: 'fog-machine-heart',
  title: 'Fog Machine Heart',
  tagline: 'The ballad. Lighters up. Phones up. Emotions… also up.',
  bpm: 72,
  key: 'F major',
  tonic: 'F',
  scale: 'major',
  voice: 'cat',
  ballad: true,
  progression: ['Fmaj7', 'Am7', 'Bbmaj7', 'Csus4'],
  drumPatterns: {
    ballad: { kick: 'x......x..x.....', snare: '....o.......x...', hat: 'x.o.x.o.x.o.x.o.' },
  },
  bassPatterns: {
    slow: '1-------5---3---',
  },
  keysPatterns: {
    lullaby: '0.2.4.2.1.3.5.3.',
  },
  sound: { padBrightness: 0.5 },
  sections: [
    {
      kind: 'intro', bars: 4, label: 'INTRO (someone turned the fog up to 11)', pad: true, keys: 'lullaby',
      lights: { palette: MIST, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.1,
    },
    {
      kind: 'verse', bars: 8, pad: true, keys: 'lullaby', bass: 'slow',
      vocals: [
        { melody: '_:4 A4:4 C5:4 A4:4 G4:4 E4:4 E4:8', words: 'Turn on the fog ma-chine' },
        { melody: '_:4 D5:4 C5:4 Bb4:4 A4:4 G4:4 G4:8', words: 'Let me just dis-ap-pear' },
        { melody: '_:4 A4:4 C5:4 A4:4 G4:4 E4:4 E4:8', words: 'No one can see me cry' },
        { melody: '_:4 D5:4 C5:4 Bb4:4 A4:4 G4:4 G4:8', words: 'Or eat this cheese I found' },
      ],
      lights: { palette: MIST, movement: 'sweep', fog: 0.9 }, led: 'lava', intensity: 0.3,
    },
    {
      kind: 'chorus', bars: 8, label: 'CHORUS (lighters up!)', pad: true, keys: 'lullaby', bass: 'slow', drums: 'ballad', backing: 'ooh',
      vocals: CHORUS, lights: { palette: GOLD, movement: 'sweep', fog: 0.9 }, led: 'spiral', intensity: 0.5,
    },
    {
      kind: 'bridge', bars: 4, label: 'OWL INTERLUDE (he took the sunglasses off… no he didn\'t)', soloist: 'owl', pad: true, bass: 'slow',
      chords: ['Dm7', 'Bbmaj7', 'Gm7', 'Csus4'], drums: 'ballad',
      lead: 'D5:4 F5:4 A5:8 G5:4 F5:4 D5:8 Bb4:4 D5:4 F5:8 E5:8 C5:8',
      lights: { palette: ['#8f7bff', '#9ad5ff', '#ffffff'], movement: 'pulse', fog: 1 }, led: 'kaleido', intensity: 0.45,
    },
    {
      kind: 'chorus', bars: 8, label: 'FINAL CHORUS (sway like a damp tree)', pad: true, keys: 'lullaby', bass: 'slow', drums: 'ballad',
      backing: 'ooh', guitar: 'chords', vocals: CHORUS, hype: true,
      lights: { palette: GOLD, movement: 'sweep', fog: 1 }, led: 'kaleido', intensity: 0.65,
    },
    {
      kind: 'outro', bars: 4, pad: true, keys: 'lullaby', backing: 'ooh',
      lights: { palette: MIST, movement: 'still', fog: 1 }, led: 'lava', intensity: 0.15,
    },
  ],
  guitarStabs: 'x-------x-------',
};
