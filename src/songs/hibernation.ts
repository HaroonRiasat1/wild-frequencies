import type { Section, Song, VocalLine } from './types';

const DAWN = ['#ff9f1c', '#2ec4b6', '#ffbf69', '#cbf3f0'];
const NIGHT = ['#3a86ff', '#8338ec', '#ff006e'];

const VERSE_A = 'B4:2 B4:2 D5:2 B4:2 F#5:4 E5:2 D5:2 B4:4 A4:4 _:8';
const VERSE_B = 'A4:2 A4:2 D5:2 F#5:2 E5:4 D5:2 C#5:2 E5:4 C#5:4 _:8';
const CHORUS_A = 'F#5:6 E5:2 D5:2 D5:2 E5:4 F#5:4 D5:4 B4:8';
const CHORUS_B = 'A5:6 G5:2 F#5:2 F#5:2 E5:4 E5:4 C#5:4 A4:8';

const CHORUS: VocalLine[] = [
  { melody: CHORUS_A, words: 'Hi-ber-na-tion is for quit-ters' },
  { melody: CHORUS_B, words: 'We will sleep when the en-core\'s done' },
  { melody: CHORUS_A, words: 'Wake the bears and wake the bad-gers' },
  { melody: CHORUS_B, words: 'Spring can wait, the band is still on' },
];

const chorus = (extra: Partial<Section> = {}): Section => ({
  kind: 'chorus', bars: 8, drums: 'rock', bass: 'eighths', pad: true, guitar: 'chords', keys: 'arp', backing: 'ooh', vocals: CHORUS, hype: true,
  lights: { palette: DAWN, movement: 'chase', lasers: true, fog: 0.4 }, led: 'kaleido', intensity: 0.9, ...extra,
});

export const hibernation: Song = {
  id: 'hibernation',
  title: 'Hibernation Is for Quitters',
  tagline: 'A protest song against sleep. Written at 4am. Obviously.',
  bpm: 116,
  key: 'B minor',
  tonic: 'B',
  scale: 'minor',
  voice: 'cat',
  progression: ['Bm', 'G', 'D', 'A'],
  drumPatterns: {
    count: { hat: 'x.x.x.x.x.x.x.x.', kick: 'x.......x.......' },
    rock: { kick: 'x...x.x.x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', openHat: '......x.......x.' },
  },
  bassPatterns: { eighths: '1.1.1.1.1.1.5.8.' },
  keysPatterns: { arp: '0.1.2.4.2.1.0.1.' },
  guitarStabs: 'x-x-x-x-x-x-x-x-',
  sound: { drive: 0.6 },
  sections: [
    { kind: 'intro', bars: 4, label: 'INTRO (the alarm clock goes off)', drums: 'count', guitar: 'chords', bass: 'eighths', lights: { palette: NIGHT, movement: 'chase', fog: 0.5 }, led: 'tunnel', intensity: 0.55 },
    {
      kind: 'verse', bars: 8, drums: 'rock', bass: 'eighths', keys: 'arp',
      vocals: [
        { melody: VERSE_A, words: 'All the bears say that it\'s time to sleep' },
        { melody: VERSE_B, words: 'But I\'ve got a gig and some co-ffee' },
        { melody: VERSE_A, words: 'Win-ter\'s a sug-ges-tion, not a rule' },
        { melody: VERSE_B, words: 'I\'ll nap in A-pril, may-be in June' },
      ],
      lights: { palette: NIGHT, movement: 'pulse', fog: 0.4 }, led: 'spiral', intensity: 0.6,
    },
    chorus(),
    {
      kind: 'solo', bars: 8, label: 'FOX SOLO (fuelled entirely by espresso)', drums: 'rock', bass: 'eighths', pad: true, guitar: 'solo', soloist: 'fox', hype: true, fill: true,
      lights: { palette: ['#ff9f1c', '#ffffff', '#ff006e'], movement: 'chase', lasers: true, fog: 0.6 }, led: 'tunnel', intensity: 1,
    },
    {
      kind: 'verse', bars: 8, drums: 'rock', bass: 'eighths', keys: 'arp', guitar: 'chords',
      vocals: [
        { melody: VERSE_A, words: 'Dor-mice are snor-ing in the old log' },
        { melody: VERSE_B, words: 'Ground-hog called in sick a-gain to-day' },
        { melody: VERSE_A, words: 'I can hear cof-fee call-ing my name' },
        { melody: VERSE_B, words: 'Sleep is for those who don\'t have a stage' },
      ],
      lights: { palette: NIGHT, movement: 'pulse', fog: 0.4 }, led: 'lava', intensity: 0.7, fill: true,
    },
    chorus({ label: 'LAST CHORUS (nobody is going to bed)', intensity: 1 }),
    { kind: 'outro', bars: 4, drums: 'count', bass: 'eighths', pad: true, backing: 'ooh', lights: { palette: DAWN, movement: 'still', fog: 0.8 }, led: 'lava', intensity: 0.4 },
  ],
};
