// Request shouting: type something, the cat answers. Song names get queued.

import { engine } from '../audio/engine';
import { conductor } from '../conductor/conductor';
import { SETLIST } from '../songs';
import { useShow } from '../state/store';
import { catSays, director } from './director';
import { unlock } from './score';

const COMEBACKS = [
  'Bold words from someone dressed as a capybara.',
  'We will take that under consideration. (We will not.)',
  'The owl says "hoo". He means "who said that".',
  'Noted. Gary will get back to you in six to eight weeks.',
  'I cannot hear you over how magnificent I am.',
  'Someone write that on a sign. Kevin, find a pen.',
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

/** Returns what the band replied (also says it on stage). */
export function shout(raw: string): string {
  const text = raw.trim().slice(0, 60);
  if (!text) return '';
  const t = norm(text);
  const s = useShow.getState();
  s.say('YOU (from the crowd)', `"${text}"`);
  unlock('shout', 25);
  let reply: string;

  const song = SETLIST.find((x) =>
    norm(x.title).split(' ').filter((w) => w.length > 3 && !['love', 'with', 'from', 'that'].includes(w)).some((w) => t.includes(w)),
  );
  if (song) {
    if (s.played.includes(song.id)) reply = `We already played "${song.title}". Were you in the bathroom?`;
    else if (s.songId === song.id) reply = `We are LITERALLY playing "${song.title}" right now.`;
    else {
      director.request(song.id, false);
      reply = `"${song.title}"? Excellent taste. That one is next.`;
    }
  } else if (/encore|one more|another/.test(t)) reply = 'You will have to cheer for that. Hold the button. HOLD IT.';
  else if (/cowbell/.test(t)) {
    reply = 'We do not have a cowbell. We have a goat.';
    engine.meeeh();
    conductor.emit('hype', { source: 'click' });
  } else if (/love|marry|best/.test(t)) reply = 'I know. Everyone does. It is a burden.';
  else if (/gary|sloth/.test(t)) reply = 'Gary says… (we will let you know when Gary says something).';
  else if (/louder|volume|cant hear|can t hear/.test(t)) reply = 'THIS IS AS LOUD AS A CAT GETS.';
  else if (/meow|purr/.test(t)) reply = 'Mrrrow. (He said hi back.)';
  else if (/bear/.test(t)) reply = 'Please stop throwing the bear.';
  else if (/kevin/.test(t)) reply = 'Kevin is fine. Kevin is always fine. Stand up, Kevin.';
  else if (/moon/.test(t)) reply = 'Leave the moon alone. …Unless you click it five times.';
  else if (/rain|wet/.test(t)) reply = 'It is not rain. It is the fog machine crying.';
  else reply = COMEBACKS[Math.floor(Math.random() * COMEBACKS.length)];

  window.setTimeout(() => catSays(reply), 1400);
  return reply;
}
