import { compileSong, type CompiledSong } from './compile';
import { eightArms } from './eightArms';
import { fogMachineHeart } from './fogMachineHeart';
import { hibernation } from './hibernation';
import { howlAtTheDisco } from './howlAtTheDisco';
import { lastCall } from './lastCall';
import { moonlitStatic } from './moonlitStatic';
import { squeakEasy } from './openingAct';
import type { Song } from './types';
import { velvetClaws } from './velvetClaws';

/** The main set, in default running order. Add your own song here. */
export const SETLIST: Song[] = [moonlitStatic, velvetClaws, eightArms, fogMachineHeart, hibernation, howlAtTheDisco];
export const ENCORE: Song = lastCall;
/** The opening act's one (1) song. */
export const OPENER: Song = squeakEasy;
export const ALL_SONGS: Song[] = [...SETLIST, ENCORE, OPENER];

const cache = new Map<string, CompiledSong>();
export function getCompiled(id: string): CompiledSong {
  let c = cache.get(id);
  if (!c) {
    const song = ALL_SONGS.find((s) => s.id === id);
    if (!song) throw new Error(`No such song: ${id}`);
    c = compileSong(song);
    cache.set(id, c);
  }
  return c;
}

/** Things Sir Reginald says between songs. Keyed by the song that just finished. */
export const BANTER: Record<string, string[]> = {
  'opening-act': [
    'Brie: um. thank you. we are The Crumbs.',
    'Cheddar: our merch is one (1) cracker. it is at the back.',
  ],
  'pre-show': [
    'Good evening, Hollow Log Amphitheater! We are WILD FREQUENCIES.',
    'Please silence your crickets.',
  ],
  'moonlit-static': [
    'Thank you! That one was about the moon.',
    'They are all about the moon. We have a problem.',
  ],
  'velvet-claws': [
    'Give it up for Gary on bass!',
    'Gary has asked me to announce that he is "vibing". He said it in March.',
  ],
  'eight-arms': [
    'OCTAVIA, EVERYBODY! Someone please get a mop.',
    'And a lawyer. Row three, we are so sorry.',
  ],
  'fog-machine-heart': [
    'That was a ballad. I cried. It was the fog.',
    'It is always the fog.',
  ],
  hibernation: [
    'That one goes out to everyone who should be asleep right now.',
    'Which is all of you. It is 2am. You are a deer.',
  ],
  'howl-at-the-disco': [
    'Somebody please check on the hedgehog.',
    'He is doing the worm again. He cannot stop.',
  ],
  headliner: [
    'Thank you! We did not write that one. We did, however, play it.',
    'Gary would like it noted that he knew every note. He did not.',
  ],
  goodnight: [
    'Thank you, goodnight!!',
    '(we are definitely not hiding behind the amps)',
  ],
  'encore-intro': [
    'You want ONE MORE? Fine.',
    'But only because we parked in the river.',
  ],
  'last-call': [
    'We love you! Tip your bartender, he is a badger.',
    'Drive safe. Or hop. Or slither. Whatever you do.',
  ],
};

export type { Song };
