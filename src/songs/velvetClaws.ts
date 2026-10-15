import type { Section, Song, VocalLine } from './types';

const FUNK = ['#ff7a1a', '#ff2e63', '#ffd23f'];
const PLUSH = ['#8a2be2', '#ff2e63', '#2ec4ff'];

const CHORUS: VocalLine[] = [
  { melody: 'G5:4 F#5:2 E5:2 _:2 D5:2 E5:4 F#5:2 E5:2 D5:2 B4:6 _:4', words: 'Vel-vet claws, I\'m vel-vet claws, so soft' },
  { melody: 'G5:4 F#5:2 E5:2 _:2 D5:2 E5:4 F#5:4 A5:4 F#5:8', words: 'Pret-ty paws that hide a dag-ger' },
  { melody: 'G5:4 F#5:2 E5:2 _:2 D5:2 E5:4 F#5:2 E5:2 D5:2 B4:6 _:4', words: 'Vel-vet claws, I\'m vel-vet claws, don\'t touch' },
  { melody: 'E5:2 E5:2 D5:2 E5:2 G5:4 E5:4 B4:16', words: '(un-less you brought some tu-na)' },
];

const chorus = (extra: Partial<Section> = {}): Section => ({
  kind: 'chorus', bars: 8, chords: ['Cmaj7', 'Bm7', 'Am7', 'B7'], drums: 'funk', bass: 'funk', pad: true, guitar: 'chords',
  keys: 'clav', backing: 'honk', vocals: CHORUS, hype: true,
  lights: { palette: PLUSH, movement: 'sweep', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.85, ...extra,
});

export const velvetClaws: Song = {
  id: 'velvet-claws',
  title: 'Velvet Claws',
  tagline: 'A funk confession. Contains scenes of knocking things off tables.',
  bpm: 108,
  key: 'E minor (dorian, obviously)',
  tonic: 'E',
  scale: 'dorian',
  swing: 0.12,
  voice: 'cat',
  progression: ['Em9', 'Em9', 'A13', 'A13'],
  drumPatterns: {
    hats: { hat: 'xoxoxoxoxoxoxoxo' },
    funk: { kick: 'x.x...x...x..x..', snare: '....x..o....x...', hat: 'xoxoxoxoxoxoxoxo', openHat: '......x.........' },
  },
  bassPatterns: {
    funk: '1-.1.b.18-.5b.1.',
  },
  keysPatterns: {
    clav: '0..2..1.3..2..1.',
  },
  guitarStabs: '..x-..x...x.x...',
  sections: [
    {
      kind: 'intro', bars: 4, label: "GARY'S GROOVE (he's been practising since March)", bass: 'funk', drums: 'hats', soloist: 'sloth',
      lights: { palette: FUNK, movement: 'still', fog: 0.7 }, led: 'lava', intensity: 0.3,
    },
    {
      kind: 'verse', bars: 8, drums: 'funk', bass: 'funk', guitar: 'chords', keys: 'clav',
      vocals: [
        { melody: '_:2 B4:1 B4:1 D5:2 B4:2 _:2 A4:2 G4:2 E4:2 _:4 G4:2 A4:2 B4:6 _:2', words: 'I got vel-vet on my claws to-night, yeah' },
        { melody: '_:2 C#5:1 C#5:1 E5:2 C#5:2 _:2 B4:2 A4:2 G4:2 _:4 A4:2 B4:2 A4:6 _:2', words: 'Scratched the couch, I\'m not a-pol-o-gis-ing' },
        { melody: '_:2 B4:1 B4:1 D5:2 B4:2 _:2 A4:2 G4:2 E4:2 _:4 G4:2 A4:2 B4:6 _:2', words: 'Knocked your cof-fee off the ta-ble, whoop-sie' },
        { melody: '_:2 C#5:1 C#5:1 E5:2 C#5:2 _:2 B4:2 A4:2 G4:2 _:4 A4:2 B4:2 A4:6 _:2', words: 'Looked you in the eye and did it slow-ly' },
      ],
      lights: { palette: FUNK, movement: 'pulse', fog: 0.5 }, led: 'spiral', intensity: 0.55,
    },
    chorus(),
    {
      kind: 'verse', bars: 8, drums: 'funk', bass: 'funk', guitar: 'chords', keys: 'clav', fill: true,
      vocals: [
        { melody: '_:2 B4:1 B4:1 D5:2 B4:2 _:2 A4:2 G4:2 E4:2 _:4 G4:2 A4:2 B4:6 _:2', words: 'Sat on your lap-top while you were work-ing' },
        { melody: '_:2 C#5:1 C#5:1 E5:2 C#5:2 _:2 B4:2 A4:2 G4:2 _:4 A4:2 B4:2 A4:6 _:2', words: 'Typed a-bout a thou-sand j\'s, so sor-ry' },
        { melody: '_:2 B4:1 B4:1 D5:2 B4:2 _:2 A4:2 G4:2 E4:2 _:4 G4:2 A4:2 B4:6 _:2', words: 'Brought you a mouse, you did not seem grate-ful' },
        { melody: '_:2 C#5:1 C#5:1 E5:2 C#5:2 _:2 B4:2 A4:2 G4:2 _:4 A4:2 B4:2 A4:6 _:2', words: 'Won\'t stop un-til you prop-er-ly thank me' },
      ],
      lights: { palette: FUNK, movement: 'pulse', fog: 0.5 }, led: 'spiral', intensity: 0.6,
    },
    chorus(),
    {
      kind: 'solo', bars: 8, label: 'FOX SOLO (knee slide imminent)', drums: 'funk', bass: 'funk', pad: true, guitar: 'solo', keys: 'clav',
      soloist: 'fox', hype: true, fill: true,
      lights: { palette: ['#ff7a1a', '#ffd23f', '#ffffff'], movement: 'chase', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1,
    },
    chorus({ label: 'LAST CHORUS (paws in the air)', intensity: 1 }),
    {
      kind: 'outro', bars: 4, bass: 'funk', drums: 'hats', soloist: 'sloth', label: 'GARY TAKES IT HOME (slowly)',
      lights: { palette: FUNK, movement: 'still', fog: 0.8 }, led: 'lava', intensity: 0.3,
    },
  ],
};
