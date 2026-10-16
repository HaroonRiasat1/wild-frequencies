// Promo mode (?promo): a bar-timed highlight edit recorded from the canvas +
// audio engine. Plays one continuous track — a song you provide (the recorder
// passes it in) or the band's own "Howl at the Disco" — and cuts between
// framings exactly on bar lines, with kinetic titles that land on the beat.
//
//   npm run promo -- --track song.mp3 --start 48.49 [--vertical]

import { engine } from '../audio/engine';
import { songPlayer } from '../audio/songPlayer';
import { trackPlayer } from '../audio/trackPlayer';
import { conductor } from '../conductor/conductor';
import { party } from '../party/party';
import { stageRef } from '../scene/stageRef';
import { getCompiled } from '../songs';
import type { Member } from '../state/store';
import { useShow } from '../state/store';

const S = () => useShow.getState();
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
const stage = () => stageRef.current!;
const at = (secs: number, fn: () => void) => window.setTimeout(fn, secs * 1000);

type Cam = { cx: number; cy: number; zoom: number; push?: number };
const CAM: Record<string, Cam> = {
  wide: { cx: 800, cy: 450, zoom: 1, push: 0.02 },
  wideLow: { cx: 800, cy: 520, zoom: 1.08, push: 0.03 },
  cat: { cx: 760, cy: 535, zoom: 2.15 },
  octopus: { cx: 800, cy: 330, zoom: 2.1 },
  fox: { cx: 545, cy: 545, zoom: 2.15 },
  goat: { cx: 1490, cy: 360, zoom: 2.4 },
  owl: { cx: 1262, cy: 445, zoom: 2.2 },
  sloth: { cx: 1040, cy: 545, zoom: 2.2 },
  penguins: { cx: 320, cy: 585, zoom: 2.1 },
  crowd: { cx: 800, cy: 740, zoom: 1.35, push: 0.03 },
  you: { cx: 800, cy: 780, zoom: 1.9 },
};

interface Card {
  title: string;
  sub?: string;
  kinetic?: boolean;
  top?: boolean;
  end?: boolean;
}

interface Shot {
  bars: number;
  cam: Cam;
  card?: Card;
  flash?: boolean;
  run?: () => void;
}

const FRIENDS: Member[] = [
  { id: 'host', name: 'You', animal: 'raccoon', color: '#ff4fd8', role: 'host' },
  { id: 'f1', name: 'Maya', animal: 'deer', color: '#00e0c6', role: 'guest' },
  { id: 'f2', name: 'Leo', animal: 'bear', color: '#ffe066', role: 'guest' },
  { id: 'f3', name: 'Sam', animal: 'hedgehog', color: '#ff7a1a', role: 'guest' },
  { id: 'f4', name: 'Aisha', animal: 'raccoon', color: '#7cff4f', role: 'guest' },
  { id: 'f5', name: 'Kai', animal: 'deer', color: '#c7a2ff', role: 'guest' },
];

/** The edit: 26 bars. Build-up hook → drop → band roll-call → crowd → party → end card. */
const SHOTS: Shot[] = [
  { bars: 2, cam: { ...CAM.wide, zoom: 1.0, push: 0.05 }, flash: false, card: { title: 'WHAT IF YOUR FAVOURITE BAND…', kinetic: true },
    run: () => { S().set({ hype: 0.4 }); stage().crowd.flashes(4); } },
  { bars: 2, cam: { ...CAM.wideLow, push: 0.06 }, card: { title: '…WAS ALL ANIMALS?', kinetic: true },
    run: () => stage().crowd.flashes(6) },
  // the drop
  { bars: 2, cam: CAM.wide, card: { title: 'WILD FREQUENCIES', sub: 'a live animal rock band — in your browser' },
    run: () => { conductor.emit('pyro', {}); conductor.emit('confetti', { amount: 0.9 }); stage().crowd.cheer(); S().set({ hype: 0.85 }); } },
  { bars: 1, cam: CAM.cat, card: { title: 'SIR REGINALD', sub: 'vocals · velvet · drama' } },
  { bars: 1, cam: CAM.octopus, card: { title: 'OCTAVIA', sub: 'drums (all of them)' } },
  { bars: 1, cam: CAM.fox, card: { title: 'RUSTY', sub: 'glitter guitar' } },
  { bars: 1, cam: CAM.goat, card: { title: 'GREG', sub: 'hype goat · one word: MEEEH' }, run: () => stage().goat.scream() },
  { bars: 1, cam: CAM.owl, card: { title: 'PROF. HOOTENANNY', sub: 'synths · sunglasses stay on' }, run: () => stage().owl.spin() },
  { bars: 1, cam: CAM.sloth, card: { title: 'GARY', sub: 'bass (eventually)' } },
  { bars: 1, cam: CAM.penguins, card: { title: 'THE TUXEDOS', sub: 'backing honks' } },
  { bars: 1, cam: { ...CAM.wide, zoom: 1.05 }, card: { title: 'THE WHOLE BAND', kinetic: true },
    run: () => Object.values(stage().band).forEach((c) => c.celebrate(1.4)) },
  // the crowd
  { bars: 2, cam: CAM.crowd, card: { title: 'THE CROWD IS YOU', sub: 'cheer · clap · do the wave', top: true },
    run: () => { stage().concert.wave(); stage().concert.beachBall(); at(0.3, () => stage().concert.beachBall()); at(0.6, () => stage().crowd.surf('bear')); } },
  { bars: 2, cam: CAM.you, card: { title: 'CATCH A SHIRT', sub: 'Greg has a T-shirt cannon', top: true },
    run: () => { S().set({ outfit: { shirt: null, hat: 'none', extra: 'none' } }); at(0.25, () => stage().concert.shirtCannon()); at(1.6, () => S().set({ outfit: { shirt: '#ff2e63', hat: 'crown', extra: 'paw' } })); } },
  { bars: 2, cam: { cx: 790, cy: 470, zoom: 1.45 }, card: { title: 'POKE THE BAND', sub: 'they react. the sloth reacts… eventually.', top: true },
    run: () => { stage().poke('cat'); at(0.9, () => stage().poke('octopus')); at(1.8, () => stage().poke('goat')); } },
  // friends
  { bars: 2, cam: { cx: 800, cy: 720, zoom: 1.25 }, card: { title: 'BRING YOUR FRIENDS', sub: 'party mode — they join from any phone, anywhere', top: true },
    run: () => {
      S().set({ party: { role: 'host', status: 'live', message: '', room: 'WILD', me: 'host', members: FRIENDS, urls: [] } });
      const emojis = ['🔥', '🤘', '😍', '👏', '🐐', '🦆'];
      FRIENDS.slice(1).forEach((m, i) => {
        at(0.1 + i * 0.25, () => party.friendFx.set(m.id, { emote: emojis[i], emoteT: 2.6, clap: 1 }));
        at(1.6 + i * 0.2, () => party.friendFx.set(m.id, { emote: emojis[(i + 3) % emojis.length], emoteT: 2.6, clap: 1 }));
      });
    } },
  { bars: 2, cam: CAM.wide, card: { title: 'A REAL CONCERT IN YOUR BROWSER', kinetic: true },
    run: () => { S().set({ sunglasses: true, hype: 1 }); conductor.emit('pyro', {}); conductor.emit('confetti', { amount: 1 }); } },
  { bars: 2, cam: { ...CAM.wide, push: 0.01 }, card: { title: 'WILD FREQUENCIES', sub: 'play free → wild-frequencies.vercel.app', end: true },
    run: () => at(1.2, () => conductor.emit('confetti', { amount: 0.7 })) },
];

declare global {
  interface Window {
    /** Set by the headless recorder: receives the video in base64 chunks. */
    promoChunk?: (b64: string, last: boolean) => Promise<void>;
    /** Set by the headless recorder: the music to edit to (base64 + name). */
    promoTrackData?: () => Promise<{ b64: string; name: string } | null>;
    promoDone?: boolean;
  }
}

async function deliver(blob: Blob) {
  if (window.promoChunk) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const CH = 1 << 20;
    for (let i = 0; i < bytes.length; i += CH) {
      let s = '';
      const part = bytes.subarray(i, i + CH);
      for (let j = 0; j < part.length; j += 0x8000) s += String.fromCharCode(...part.subarray(j, j + 0x8000));
      await window.promoChunk(btoa(s), i + CH >= bytes.length);
    }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wild-frequencies-promo.webm';
    a.textContent = '⬇ Download the promo video';
    Object.assign(a.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: '99', padding: '18px 26px', background: '#ff4fd8', color: '#fff', borderRadius: '14px', font: '900 22px system-ui' });
    document.body.appendChild(a);
  }
  window.promoDone = true;
}

/** Start the music: the provided track (from `start` seconds) or the band's own song. */
async function startMusic(params: URLSearchParams): Promise<void> {
  const data = window.promoTrackData ? await window.promoTrackData() : null;
  if (data) {
    const bin = atob(data.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const { prepareTrack } = await import('../show/director');
    const { buffer, map } = await prepareTrack(new File([bytes], data.name));
    S().set({ songId: 'headliner', trackBpm: map.bpm });
    // only the real song plays: the band's own sounds (goat screams, penguin
    // harmonies, poke licks) stay silent — they still perform on screen
    for (const id of ['drums', 'bass', 'guitar', 'keys', 'vocals', 'backing', 'hype'] as const) engine.setAudible(id, false);
    trackPlayer.play(buffer, map, data.name, () => {}, { startIn: 0.15, offset: Number(params.get('start') ?? 0) });
    return;
  }
  // band version: 4 bars before the first chorus, so the drop lands on it
  // (and there are enough bars left for the whole 26-bar edit)
  const song = getCompiled('howl-at-the-disco');
  S().set({ songId: song.song.id });
  songPlayer.play(song, () => {}, { startIn: 0.15, fromStep: song.sections[2].start - 4 * 16 });
}

export async function runPromo() {
  const params = new URLSearchParams(location.search);
  const st = stage();
  S().set({ phase: 'playing', panel: null, captions: false, volume: 0.72, sunglasses: false,
    onStage: { cat: true, fox: true, sloth: true, octopus: true, owl: true, penguins: true, goat: true } });
  Object.values(st.band).forEach((c) => c.snapHome());
  engine.setVolume(0.72);

  // count bars from the music's own downbeats; every shot starts on a bar line
  const shotStarts: number[] = [];
  SHOTS.reduce((acc, sh) => (shotStarts.push(acc), acc + sh.bars), 0);
  const totalBars = SHOTS.reduce((a, s) => a + s.bars, 0);
  let bar = -1;
  let recording = false;
  let finished: () => void = () => {};
  const done = new Promise<void>((r) => (finished = r));

  // record the canvas + audio
  const video = st.canvasEl.captureStream(60);
  const audio = engine.recordStream();
  const stream = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000, audioBitsPerSecond: 256_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));

  const off = conductor.on('beat', ({ downbeat }) => {
    if (!downbeat) return;
    if (!recording) {
      // the video opens exactly on the first downbeat
      recording = true;
      rec.start(500);
    }
    bar++;
    const i = shotStarts.indexOf(bar);
    if (i >= 0) {
      const sh = SHOTS[i];
      st.promoCut(sh.cam, sh.flash !== false && i > 0);
      if (sh.card) {
        const secs = sh.bars * 4 * (60 / conductor.state.bpm);
        st.promoCard = { ...sh.card, sub: sh.card.sub ?? '', at: performance.now(), dur: secs - 0.05, beat0: sh.card.kinetic ? conductor.beat() : undefined };
      } else st.promoCard = null;
      sh.run?.();
    }
    if (bar === totalBars) finished();
  });
  // safety: if the music runs out first, finish anyway
  const offEnd = conductor.on('songEnd', () => finished());

  await startMusic(params);
  await done;
  // fade the music over half a bar, then stop
  engine.setVolume(0);
  await sleep(0.9);
  off();
  offEnd();
  songPlayer.stop();
  trackPlayer.stop();
  rec.stop();
  await stopped;
  video.getTracks().forEach((t) => t.stop());
  await deliver(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
}
