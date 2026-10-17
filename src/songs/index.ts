import { compileSong, type CompiledSong } from './compile';
import { COVERS as CLASSIC_COVERS } from './covers';
import { entertainer, happyBirthday, jingleBells, saints } from './famous';
import { MORE_COVERS } from './famousMore';
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
/** The set opens with a famous one: the band marches in. */
export const SETLIST: Song[] = [saints, moonlitStatic, velvetClaws, eightArms, fogMachineHeart, hibernation, howlAtTheDisco];
export const ENCORE: Song = lastCall;
/** The opening act's one (1) song. */
export const OPENER: Song = squeakEasy;
/** Famous (public-domain) songs, played on request. */
export const COVERS: Song[] = [...CLASSIC_COVERS, entertainer, jingleBells, happyBirthday, ...MORE_COVERS];
export const ALL_SONGS: Song[] = [...SETLIST, ENCORE, OPENER, ...COVERS];

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
  saints: [
    'Thank you! That was a song about us. Everything is about us.',
    'Kevin, please stop marching. The song is over.',
  ],
  entertainer: ['Professor Hootenanny, everybody. He learned that from a pianola.', 'Gary is still playing the left hand. Let him finish.'],
  'jingle-bells': ['Yes, it is October. No, we will not be taking questions.'],
  'happy-birthday': ['Happy birthday, Gary.', 'Gary: …thank… you… (it was in March)'],
  'old-macdonald': ['Greg would like to thank his agent, Old MacDonald.', 'E-I-E-I-thank you.'],
  'ode-to-joy': ['That was Beethoven. He could not hear it. Lucky him.', '(that is a joke, we love Ludwig)'],
  'mountain-king': ['Somebody get Octavia a glass of water.', 'And a new drum kit. And a nap.'],
  twinkle: ['That one was for the moon.', 'The moon says thank you. The moon is crying again.'],
  'can-can': ['Kevin, you can stop kicking now.', 'Kevin cannot stop kicking. Somebody hold Kevin.'],
  'william-tell': ['Octavia, everybody! That was eight horses and zero horses.', 'Please do not gallop to the exits.'],
  'fur-elise': ['That was for Elise. Wherever she is.', 'The owl says he knows her. The owl is lying.'],
  'oh-susanna': ['Susanna has stopped crying. Greg is crying now.', 'Rusty would like you to know that WAS a banjo.'],
  'frere-jacques': ['Gary is awake! Give it up for Gary!', '…he is asleep again.'],
  'la-cucaracha': ['¡Gracias! Greg would like to return the shoes.', 'He cannot. He ate them.'],
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
