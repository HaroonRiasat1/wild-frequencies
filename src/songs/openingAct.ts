import type { Song } from './types';

/** The opening act: The Crumbs (Brie & Cheddar), two very nervous mice. */
export const squeakEasy: Song = {
  id: 'squeak-easy',
  title: 'Squeak Easy',
  tagline: 'The Crumbs — opening act. Their first gig. Please be nice.',
  bpm: 120,
  key: 'F major',
  tonic: 'F',
  scale: 'major',
  voice: 'raccoon',
  progression: ['F', 'C', 'C7', 'F'],
  drumPatterns: {
    shaker: { hat: 'x.o.x.o.x.o.x.o.' },
    tiny: { kick: 'x.......x.......', hat: 'x.o.x.o.x.o.x.o.', snare: '....o.......o...' },
  },
  bassPatterns: { bounce: '1...5...1...5...' },
  keysPatterns: { uke: '0.1.2.1.0.1.2.1.' },
  sections: [
    { kind: 'intro', bars: 2, keys: 'uke', drums: 'shaker', lights: { palette: ['#ffd8a8', '#ffb3c7'], movement: 'still', fog: 0.2 }, led: 'lava', intensity: 0.15 },
    {
      kind: 'verse', bars: 8, keys: 'uke', drums: 'tiny', bass: 'bounce',
      vocals: [
        { melody: 'F5:2 F5:2 A5:2 C6:2 A5:4 F5:4 G5:2 A5:2 G5:4 _:8', words: 'We are the o-pen-ing act to-night' },
        { melody: 'E5:2 E5:2 G5:2 Bb5:2 G5:4 E5:4 F5:2 G5:2 F5:4 _:8', words: 'No-bo-dy came here to see us, right' },
        { melody: 'F5:2 F5:2 A5:2 C6:2 A5:4 F5:4 G5:2 A5:2 G5:4 _:8', words: 'We brought a song and a piece of cheese' },
        { melody: 'E5:2 E5:2 G5:2 Bb5:2 G5:4 E5:4 F5:2 G5:2 F5:4 _:8', words: 'Clap po-lite-ly, that would be so nice' },
      ],
      lights: { palette: ['#ffd8a8', '#ffb3c7', '#c7f0ff'], movement: 'pulse', fog: 0.2 }, led: 'spiral', intensity: 0.3,
    },
    {
      kind: 'chorus', bars: 4, keys: 'uke', drums: 'tiny', bass: 'bounce',
      vocals: [
        { melody: 'A5:4 A5:4 G5:4 F5:4 C6:8 A5:8', words: 'Squeak squeak, thank you, good night' },
        { melody: 'Bb5:4 A5:4 G5:4 E5:4 F5:16', words: 'Tip jar\'s by the door' },
      ],
      lights: { palette: ['#ffd8a8', '#ff7ab6'], movement: 'sweep', fog: 0.3 }, led: 'kaleido', intensity: 0.4,
    },
    { kind: 'outro', bars: 2, keys: 'uke', lights: { palette: ['#ffd8a8'], movement: 'still', fog: 0.2 }, led: 'lava', intensity: 0.1 },
  ],
};
