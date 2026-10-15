import type { CharacterId } from '../songs/types';

export interface CastMember {
  id: CharacterId;
  name: string;
  role: string;
  fact: string;
  color: string;
  /** Things they say when poked. */
  pokes: string[];
}

export const CAST: Record<CharacterId, CastMember> = {
  cat: {
    id: 'cat',
    name: 'Sir Reginald Purrcival III',
    role: 'Lead vocals, velvet, drama',
    fact: 'Maine Coon. 9 kg of pure ego. Has never once caught a mouse, only feelings.',
    color: '#b26bff',
    pokes: ['Do you know who I AM?', 'Not the jacket. NOT THE JACKET.', 'I am an ARTIST.', '*hisses in B flat*', 'Talk to my manager (a laser pointer).'],
  },
  fox: {
    id: 'fox',
    name: 'Rusty "Shred" Brushtail',
    role: 'Glitter guitar, knee slides',
    fact: 'Owns one guitar and four hundred knee pads.',
    color: '#ff7a1a',
    pokes: ['SOLO TIME? SOLO TIME.', 'I only know one scale. Watch this.', 'Hold my tail.', 'Did you see the glitter? YOU SAW THE GLITTER.'],
  },
  sloth: {
    id: 'sloth',
    name: 'Gary',
    role: 'Bass (eventually)',
    fact: 'Just Gary. Has never missed a beat. Has never been early to one either.',
    color: '#c7a27a',
    pokes: ['…', '…hi…', '…(yawns in E)…', '…I felt that… next Tuesday…', '…vibing…'],
  },
  octopus: {
    id: 'octopus',
    name: 'Octavia Eightfold',
    role: 'Drums (all of them)',
    fact: 'Three hearts, eight arms, zero chill. Inks when excited. Always excited.',
    color: '#ff2e97',
    pokes: ['Sorry, I ink when I\'m nervous!', 'Want a drumstick? I have eleven.', 'BA-DUM-TSSSHHH (x4)', 'Who touched arm number six?'],
  },
  owl: {
    id: 'owl',
    name: 'Professor Hootenanny',
    role: 'Vintage synths, wisdom, sunglasses',
    fact: 'Owns 400 patch cables. Knows what 3 of them do. Head rotates 180° on big drops.',
    color: '#9ad5ff',
    pokes: ['Whooo touched me?', 'Is that a patch cable in your paw or…', 'These sunglasses stay ON.', 'Hoo. Hoo hoo. (that was a modular joke)'],
  },
  penguins: {
    id: 'penguins',
    name: 'The Tuxedos (Pip, Pep & Kevin)',
    role: 'Backing vocals, synchronised waddling',
    fact: 'Perfect harmony. Kevin falls over at least once a show. It\'s choreographed. It isn\'t.',
    color: '#e6f0ff',
    pokes: ['HONK! (harmonised)', 'Kevin, stand up.', 'Ooooh (in three-part harmony)', 'We are dressed formally for a reason.'],
  },
  goat: {
    id: 'goat',
    name: 'Greg',
    role: 'Hype goat',
    fact: 'Vocabulary of one word. Uses it perfectly.',
    color: '#f2f2f2',
    pokes: ['MEEEEH!', 'MEEEEEEEEEH!!', 'meh. (quietly, emotionally)', 'MEH MEH MEEEEH'],
  },
};

/** Walk-on order: the diva enters last, obviously. */
export const WALK_ON_ORDER: CharacterId[] = ['penguins', 'sloth', 'owl', 'octopus', 'fox', 'goat', 'cat'];
