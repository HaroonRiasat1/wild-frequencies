// The show director: runs the gig from mic check to credits. Waits use the
// audio context's clock (Tone's context.setTimeout), never window.setTimeout.

import * as Tone from 'tone';
import { BeatDetector } from '../audio/beatDetector';
import { engine } from '../audio/engine';
import { songPlayer } from '../audio/songPlayer';
import { analyzeTrack, type TrackMap } from '../audio/trackAnalysis';
import { trackPlayer } from '../audio/trackPlayer';
import { conductor } from '../conductor/conductor';
import { BANTER, ENCORE, getCompiled, OPENER, SETLIST } from '../songs';
import type { Song } from '../songs/types';
import { clearHeadliner, loadHeadliner, saveHeadliner } from '../state/headliner';
import { useShow } from '../state/store';
import { CAST, WALK_ON_ORDER } from './cast';
import { peakHype, resetPeak } from './hype';
import { unlock } from './score';

const ABORT = Symbol('abort');
let runId = 0;
export const detector = new BeatDetector();

const S = () => useShow.getState();

function wait(seconds: number, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    Tone.getContext().setTimeout(() => (id === runId ? resolve() : reject(ABORT)), seconds);
  });
}

const CAT = CAST.cat.name;

/** The cat "speaks" — a burst of meows while the subtitle shows the translation. */
export function catSays(text: string) {
  S().say(CAT, text);
  conductor.emit('bubble', { who: 'cat', text: '♪ mrrow mrrp meow ♪', seconds: 2.4 });
  const words = Math.min(9, text.split(' ').length);
  const now = Tone.now() + 0.05;
  for (let i = 0; i < words; i++) {
    engine.cat.sing(70 + Math.floor(Math.random() * 9), 0.14 + Math.random() * 0.1, now + i * 0.22, i % 3 ? 'mrr' : 'meow', 0.55);
  }
}

async function banter(key: string, id: number) {
  for (const line of BANTER[key] ?? []) {
    catSays(line);
    await wait(Math.max(2.4, line.length * 0.065), id);
  }
  S().set({ subtitle: null });
}

// ------------------------------------------------------------------ user tracks

let headlinerFile: File | null = null;
const analysed = new Map<string, { buffer: AudioBuffer; map: TrackMap }>();
const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

/** Decode + analyse once (beats, onsets, sections); cached for replays. */
async function prepareTrack(file: File): Promise<{ buffer: AudioBuffer; map: TrackMap }> {
  const hit = analysed.get(fileKey(file));
  if (hit) return hit;
  S().set({ analysing: true });
  try {
    const raw = Tone.getContext().rawContext as AudioContext;
    const buffer = await raw.decodeAudioData(await file.arrayBuffer());
    const map = await analyzeTrack(buffer);
    const r = { buffer, map };
    analysed.set(fileKey(file), r);
    return r;
  } finally {
    S().set({ analysing: false });
  }
}

const trackTitle = (f: File) => f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s*\([^)]*\)\s*$/, '').trim();

function playTrack(file: File, id: number, phase: 'playing' | 'upload'): Promise<void> {
  return new Promise((resolve, reject) => {
    prepareTrack(file)
      .then(({ buffer, map }) => {
        if (id !== runId) return reject(ABORT);
        const title = trackTitle(file);
        S().set({ songId: 'headliner', phase, sectionKind: null, sectionLabel: '', lyric: null, trackBpm: map.bpm, detectedKey: map.key.label });
        conductor.emit('ledText', { text: title.toUpperCase(), seconds: 4 });
        catSays('This one is a cover. We will mouth along with total conviction.');
        resetPeak();
        trackPlayer.play(buffer, map, title, () => {
          if (id !== runId) return reject(ABORT);
          const st = S();
          st.set({
            played: st.played.includes('headliner') ? st.played : [...st.played, 'headliner'],
            setLog: [...st.setLog, { songId: 'headliner', title, peakHype: Math.round(peakHype * 100) }],
            songId: null, sectionKind: null, soloist: null, trackBpm: null,
          });
          engine.applaud(3.5, 80);
          resolve();
        });
      })
      .catch((e) => (e === ABORT ? reject(e) : (console.error(e), S().say('Professor Hootenanny', 'Whooo… could not decode that file. Try an MP3 or WAV.'), resolve())));
  });
}

/** What plays next: a request, else your headliner (it opens the set), else the running order. */
function peekNext(): Song | 'headliner' | null {
  const s = S();
  if (s.requested === 'headliner' && headlinerFile && !s.played.includes('headliner')) return 'headliner';
  const req = s.requested && !s.played.includes(s.requested) ? SETLIST.find((x) => x.id === s.requested) : null;
  if (req) return req;
  if (headlinerFile && !s.played.includes('headliner')) return 'headliner';
  return SETLIST.find((x) => !s.played.includes(x.id)) ?? null;
}

function pickNext(): Song | 'headliner' | null {
  const next = peekNext();
  S().set({ requested: null });
  return next;
}

function playSong(song: Song, id: number, phase?: 'openingAct'): Promise<void> {
  const s = S();
  s.set({ songId: song.id, phase: phase ?? (song.encore ? 'encore' : 'playing'), sectionKind: null, sectionLabel: '', lyric: null, subtitle: null });
  conductor.emit('ledText', { text: song.title.toUpperCase(), seconds: 4 });
  resetPeak();
  return new Promise((resolve, reject) => {
    songPlayer.play(getCompiled(song.id), () => {
      if (id !== runId) return reject(ABORT);
      const st = S();
      st.set({
        played: st.played.includes(song.id) ? st.played : [...st.played, song.id],
        setLog: [...st.setLog, { songId: song.id, title: song.title, peakHype: Math.round(peakHype * 100) }],
        songId: null,
        sectionKind: null,
        soloist: null,
        lyric: null,
      });
      engine.applaud(3.2, 70);
      resolve();
    });
  });
}

function everyone(onStage: boolean) {
  S().set({ onStage: { cat: onStage, fox: onStage, sloth: onStage, octopus: onStage, owl: onStage, penguins: onStage, goat: onStage } });
}

async function runShow(skipIntro: boolean) {
  const id = ++runId;
  try {
    if (!skipIntro) {
      // ---- 0. the opening act (two nervous mice, one song)
      S().set({ phase: 'openingAct' });
      engine.murmur(true);
      await wait(1.5, id);
      S().say('The Crumbs', 'h-hello. we are The Crumbs. this is our song.');
      await wait(2.5, id);
      const heckle = Tone.getContext().setTimeout(() => {
        if (id !== runId) return;
        S().say('Someone in the back', 'PLAY THE MEOW ONE!!');
        Tone.getContext().setTimeout(() => id === runId && S().say('Brie (The Crumbs)', '…we don\'t have a meow one.'), 2.2);
      }, 9);
      await playSong(OPENER, id, 'openingAct');
      Tone.getContext().clearTimeout(heckle);
      engine.applaud(2.2, 18);
      for (const line of BANTER['opening-act']) {
        const [who, text] = line.split(': ');
        S().say(`${who} (The Crumbs)`, text);
        await wait(3, id);
      }
      unlock('openingAct');
      S().set({ subtitle: null });
      await wait(1.5, id);

      // ---- 1. mic check
      S().set({ phase: 'micCheck' });
      engine.murmur(true);
      await wait(1.2, id);
      S().say('Trash Panda Pete (roadie)', 'One two, one two… *squeak*');
      conductor.emit('bubble', { who: 'raccoon', text: 'one two, one two…', seconds: 2 });
      const d = engine.micCheck();
      await wait(d, id);
      S().say('Trash Panda Pete (roadie)', 'Is this thing on? It\'s on. Ladies, gentlemen and assorted wildlife…');
      await wait(3.2, id);
      S().say('Trash Panda Pete (roadie)', '…please welcome to the stage… WILD! FREQUENCIES!');
      engine.applaud(2.5, 50);
      await wait(2.4, id);

      // ---- 2. walk on, one by one, with name cards
      S().set({ phase: 'walkOn', subtitle: null });
      engine.murmur(false);
      for (const who of WALK_ON_ORDER) {
        S().set({ nameCard: who, onStage: { ...S().onStage, [who]: true } });
        conductor.emit('ledText', { text: CAST[who].name.toUpperCase(), seconds: 2.2 });
        engine.applaud(1.3, 35);
        await wait(1.1, id);
        engine.lick(who);
        await wait(1.4, id);
      }
      S().set({ nameCard: null });
      await banter('pre-show', id);
    } else {
      everyone(true);
    }

    // ---- 3. the set (with the weather doing whatever it wants)
    const w = S().weather;
    let songNo = 0;
    const rainSong = w === 'auto' && Math.random() < 0.7 ? 2 + Math.floor(Math.random() * 2) : -1;
    for (let next = pickNext(); next; next = pickNext()) {
      const rain = w === 'rain' || songNo === rainSong;
      if (rain && !S().raining) {
        S().set({ raining: true });
        S().say('Stage Manager (a badger)', 'Is that… rain? Ponchos are free at the merch stand. The show goes ON.');
      }
      if (next === 'headliner' && headlinerFile) await playTrack(headlinerFile, id, 'playing');
      else if (next !== 'headliner') await playSong(next, id);
      if (S().raining && w !== 'rain') {
        S().set({ raining: false });
        unlock('rain');
      }
      songNo++;
      S().set({ phase: 'banter' });
      await wait(1.5, id);
      if (peekNext()) await banter(next === 'headliner' ? 'headliner' : next.id, id);
    }

    // ---- 4. fake ending
    await banter('goodnight', id);
    S().set({ phase: 'fakeEnding' });
    everyone(false);
    await wait(2, id);
    const deadline = S().encoreUnlocked ? 4 : 18;
    for (let t = 0; t < deadline; t += 1.6) {
      conductor.emit('ledText', { text: S().encoreUnlocked ? 'ONE MORE SONG!' : 'HOLD CHEER FOR AN ENCORE', seconds: 1.6 });
      S().say('The Crowd', S().encoreUnlocked ? 'ONE! MORE! SONG!' : 'one… more… song? (hold SPACE / Cheer to convince them)');
      engine.applaud(1.2, 40);
      await wait(1.6, id);
      if (S().encoreUnlocked && t >= 3) break;
    }

    // ---- 5. encore (only if the crowd earned it)
    if (S().encoreUnlocked) {
      everyone(true);
      await wait(2.5, id);
      await banter('encore-intro', id);
      await playSong(ENCORE, id);
      S().set({ phase: 'banter' });
      await banter('last-call', id);
    } else {
      S().say('Stage Manager (a badger)', 'No encore tonight. Next time, cheer like you mean it.');
      await wait(2.5, id);
      everyone(true);
      await wait(1.5, id);
    }

    // ---- 6. bows + credits
    S().set({ phase: 'outro', subtitle: null });
    conductor.emit('ledText', { text: 'THANK YOU, FOREST!', seconds: 5 });
    conductor.emit('confetti', { amount: 0.6 });
    engine.applaud(5, 80);
    await wait(5.5, id);
    S().set({ phase: 'credits' });
  } catch (e) {
    if (e !== ABORT) throw e;
  }
}

export const director = {
  async doorsOpen() {
    await engine.init();
    headlinerFile = headlinerFile ?? (await loadHeadliner());
    engine.setVolume(S().volume);
    // ?rehearsal skips the mic check + walk-on (handy when adding songs)
    runShow(new URLSearchParams(location.search).has('rehearsal'));
  },

  abort() {
    runId++;
    songPlayer.stop();
    trackPlayer.stop();
  },

  /** Restore the saved headliner's name into the UI on page load. */
  async restoreHeadliner() {
    headlinerFile = await loadHeadliner();
    S().set({ headliner: headlinerFile ? { name: trackTitle(headlinerFile) } : null });
  },

  /** Make a track tonight's headliner (stored in this browser only). Opens the set. */
  async setHeadliner(file: File) {
    headlinerFile = file;
    S().set({ headliner: { name: trackTitle(file) } });
    try {
      await saveHeadliner(file);
    } catch (e) {
      console.warn('Could not remember the headliner (private window?)', e);
    }
    const s = S();
    if (s.phase !== 'landing' && !s.played.includes('headliner')) s.set({ requested: 'headliner' });
    prepareTrack(file).catch(() => {}); // soundcheck in the background
  },

  async removeHeadliner() {
    headlinerFile = null;
    S().set({ headliner: null, requested: S().requested === 'headliner' ? null : S().requested });
    await clearHeadliner().catch(() => {});
  },

  /** Request mode: queue a song, or play it right now. */
  request(songId: string, now: boolean) {
    if (songId === 'headliner' && !headlinerFile) return;
    const s = S();
    if (s.played.includes(songId) || s.songId === songId) return;
    s.set({ requested: songId });
    if (now && (s.phase === 'playing' || s.phase === 'banter')) this.skip();
  },

  skip() {
    songPlayer.skip();
    trackPlayer.skip();
  },

  /** After the credits: hang out backstage with the band. */
  async afterparty() {
    const id = ++runId;
    everyone(true);
    S().set({ phase: 'afterparty', panel: null, subtitle: null, raining: false, lightOverride: null, songId: null, sectionKind: null, sectionLabel: '', lyric: null });
    engine.murmur(true);
    unlock('afterparty');
    conductor.emit('ledText', { text: 'AFTERPARTY 🎉 (VIP ONLY)', seconds: 600 });
    const chatter: [string, string][] = [
      ['Gary', '…almost… in tune…'],
      ['Octavia Eightfold', 'Who wants an autograph? I can do eight at once.'],
      ['Sir Reginald Purrcival III', 'I was magnificent. Say it. Say I was magnificent.'],
      ['Kevin (The Tuxedos)', 'I only fell over twice tonight. Personal best.'],
      ['Greg', 'meh. (contentedly)'],
      ['Professor Hootenanny', 'No, I will not take the sunglasses off. Not even backstage.'],
      ['Rusty "Shred" Brushtail', 'Did anyone get the knee slide on camera? Asking for my knees.'],
      ['Trash Panda Pete (roadie)', 'Who left half a sandwich in the kick drum. I am not complaining. I am eating it.'],
      ['Gary', '…tuned. …what did I miss…'],
    ];
    try {
      for (let i = 0; ; i++) {
        const [who, text] = chatter[i % chatter.length];
        S().say(who, text);
        await wait(4.2, id);
      }
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  },

  leaveAfterparty() {
    runId++;
    engine.murmur(false);
    conductor.emit('ledText', { text: 'GOODNIGHT', seconds: 2 });
    S().set({ phase: 'credits', subtitle: null });
  },

  playAgain() {
    this.abort();
    detector.stop();
    engine.stopUpload();
    S().set({
      phase: 'landing', played: [], setLog: [], requested: null, hype: 0, encoreUnlocked: false, songId: null,
      subtitle: null, lyric: null, nameCard: null, moonJoined: false, moonClicks: 0, lighters: 0, panel: null,
      raining: false, stageDive: 'none', lightOverride: null, score: 0, achievements: [], toasts: [],
    });
    everyone(false);
    Tone.getContext().setTimeout(() => runShow(false), 0.4);
  },

  async enterUpload(file: File) {
    this.abort();
    const id = runId;
    everyone(true);
    S().set({ phase: 'upload', uploadName: file.name, songId: null, lyric: null, sectionKind: null });
    S().say('Professor Hootenanny', `Soundchecking "${trackTitle(file)}"… counting beats, finding the drops.`);
    conductor.emit('ledText', { text: 'SOUNDCHECK…', seconds: 3 });
    try {
      await playTrack(file, id, 'upload');
      if (id === runId) this.exitUpload();
    } catch (e) {
      if (e !== ABORT) throw e;
    }
  },

  exitUpload() {
    if (S().phase !== 'upload') return;
    runId++;
    trackPlayer.stop();
    engine.stopUpload();
    detector.stop();
    S().set({ uploadName: null });
    runShow(true);
  },
};
