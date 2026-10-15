import type { Section, Song, VocalLine } from './types';

const DISCO = ['#ff2bd6', '#2bf1ff', '#ffe600', '#7cff4f'];
const MIRROR = ['#ffffff', '#ff2bd6', '#2bf1ff'];

const CHORUS: VocalLine[] = [
  { melody: 'D5:2 D5:2 _:2 D5:2 G5:4 F5:2 D5:2 _:4 F5:2 G5:2 D5:8', words: 'A-woo, a-woo, howl at the dis-co', voice: 'wolf' },
  { melody: 'D5:2 D5:2 _:2 D5:2 G5:4 Bb5:2 A5:2 _:4 G5:2 F#5:2 D5:8', words: 'A-woo, a-woo, glit-ter in my fur', voice: 'wolf' },
  { melody: 'D5:2 D5:2 _:2 D5:2 G5:4 F5:2 D5:2 _:4 F5:2 G5:2 D5:8', words: 'A-woo, a-woo, howl at the dis-co', voice: 'wolf' },
  { melody: 'D5:2 D5:2 _:2 D5:2 G5:4 Bb5:2 A5:2 _:4 G5:2 F#5:2 D5:8', words: 'Ev-ery-bo-dy\'s a wolf on the floor', voice: 'wolf' },
];

const chorus = (extra: Partial<Section> = {}): Section => ({
  kind: 'chorus', bars: 8, drums: 'disco', bass: 'octave', pad: true, guitar: 'chords', keys: 'stab', backing: 'ooh', vocals: CHORUS,
  lights: { palette: DISCO, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.9, ...extra,
});

const drop = (extra: Partial<Section> = {}): Section => ({
  kind: 'drop', bars: 8, label: 'DROP (Greg has entered the chat)', drums: 'disco', bass: 'octave', guitar: 'chords', keys: 'stab', hype: true,
  backing: 'honk', lead: 'G5:2 _:2 G5:2 Bb5:2 D6:4 C6:4 Bb5:2 A5:2 G5:4 F5:4 D5:4',
  lights: { palette: MIRROR, movement: 'strobe', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1, ...extra,
});

export const howlAtTheDisco: Song = {
  id: 'howl-at-the-disco',
  title: 'Howl at the Disco',
  tagline: 'Four-on-the-floor. Four paws on the floor. Same thing.',
  bpm: 122,
  key: 'G minor',
  tonic: 'G',
  scale: 'minor',
  voice: 'cat',
  progression: ['Gm7', 'C7', 'Ebmaj7', 'D7'],
  drumPatterns: {
    four: { kick: 'x...x...x...x...', hat: 'o.o.o.o.o.o.o.o.' },
    disco: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', openHat: '..x...x...x...x.' },
  },
  bassPatterns: {
    octave: '1.8.1.8.1.8.1.8.',
  },
  keysPatterns: {
    stab: '..4...5...4...6.',
  },
  guitarStabs: '..x..x....x..x.x',
  sound: { drive: 0.5 },
  sections: [
    {
      kind: 'intro', bars: 4, label: 'INTRO (mirror ball deployed)', drums: 'four', bass: 'octave', keys: 'stab', fill: true,
      lights: { palette: DISCO, movement: 'chase', fog: 0.5 }, led: 'spiral', intensity: 0.6,
    },
    {
      kind: 'verse', bars: 8, drums: 'disco', bass: 'octave', guitar: 'chords',
      vocals: [
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 C5:2 D5:4 _:2 Bb4:2 C5:2 Bb4:2 G4:8', words: 'Moon\'s up, so put on your dan-cing fur' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 Eb5:2 D5:4 _:2 C5:2 A4:2 F#4:2 D4:8', words: 'Shake your tail like no-bo-dy\'s watch-ing' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 C5:2 D5:4 _:2 Bb4:2 C5:2 Bb4:2 G4:8', words: 'Strobe lights flash-ing, my pu-pils are huge' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 Eb5:2 D5:4 _:2 C5:2 A4:2 F#4:2 D4:8', words: 'Some-bo-dy stepped on my tail, it\'s fine' },
      ],
      lights: { palette: DISCO, movement: 'pulse', fog: 0.4 }, led: 'spiral', intensity: 0.65,
    },
    chorus({ hype: true }),
    drop(),
    {
      kind: 'verse', bars: 8, drums: 'disco', bass: 'octave', guitar: 'chords', keys: 'stab',
      vocals: [
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 C5:2 D5:4 _:2 Bb4:2 C5:2 Bb4:2 G4:8', words: 'Ten-der-ly paw-ing the dis-co ball' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 Eb5:2 D5:4 _:2 C5:2 A4:2 F#4:2 D4:8', words: 'Hedge-hog\'s do-ing the worm on the floor' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 C5:2 D5:4 _:2 Bb4:2 C5:2 Bb4:2 G4:8', words: 'Deer in the spot-light, fro-zen and proud' },
        { melody: 'G4:2 _:2 G4:2 Bb4:2 _:2 Eb5:2 D5:4 _:2 C5:2 A4:2 F#4:2 D4:8', words: 'Bear on the speak-ers is los-ing it' },
      ],
      lights: { palette: DISCO, movement: 'pulse', fog: 0.4 }, led: 'lava', intensity: 0.7, fill: true,
    },
    chorus({ hype: true }),
    drop({ label: 'FINAL DROP (crowd surfing frog spotted)' }),
    {
      kind: 'outro', bars: 4, drums: 'four', bass: 'octave', pad: true, backing: 'ooh',
      lights: { palette: DISCO, movement: 'sweep', fog: 0.8 }, led: 'kaleido', intensity: 0.5,
    },
  ],
};
