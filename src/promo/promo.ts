// Promo mode (?promo): a scripted ~45 s highlight reel — seven moments from the
// show with title cards — recorded straight from the canvas + audio engine.
// `node scripts/record-promo.mjs` drives this headlessly and saves an MP4.

import { engine } from '../audio/engine';
import { songPlayer } from '../audio/songPlayer';
import { conductor } from '../conductor/conductor';
import { party } from '../party/party';
import { stageRef } from '../scene/stageRef';
import { getCompiled } from '../songs';
import type { Member } from '../state/store';
import { useShow } from '../state/store';

const S = () => useShow.getState();
const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));

interface Scene {
  song: string;
  section: number;
  secs: number;
  title: string;
  sub: string;
  end?: boolean;
  /** Put the title card at the top (keeps the crowd visible). */
  top?: boolean;
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

const at = (secs: number, fn: () => void) => window.setTimeout(fn, secs * 1000);
const stage = () => stageRef.current!;

const SCENES: Scene[] = [
  {
    song: 'howl-at-the-disco', section: 2, secs: 7,
    title: 'WILD FREQUENCIES', sub: 'a live animal rock band — in your browser',
    run: () => at(1.5, () => stage().crowd.flashes(8)),
  },
  {
    song: 'eight-arms', section: 3, secs: 6.5,
    title: 'EVERY NOTE IS LIVE', sub: 'synthesised in real time. no samples. eight arms.',
  },
  {
    song: 'velvet-claws', section: 5, secs: 6.5,
    title: 'POKE THE BAND', sub: 'they react. the sloth reacts… eventually.',
    run: () => {
      at(0.8, () => stage().poke('cat'));
      at(2.6, () => stage().poke('goat'));
      at(4.2, () => stage().poke('sloth'));
    },
  },
  {
    song: 'fog-machine-heart', section: 4, secs: 6.5,
    title: 'LIGHTERS UP', sub: 'rain, fog, and a very emotional moon',
    run: () => {
      S().set({ raining: true });
      stage().crowd.balladMode(true);
      for (let i = 0; i < 6; i++) at(0.3 + i * 0.4, () => { const f = stage().crowd.fans[(i * 7) % stage().crowd.fans.length]; f.hold = 'lighter'; });
      S().set({ lighters: 1 });
    },
  },
  {
    song: 'old-macdonald', section: 1, secs: 6.5,
    title: 'CHEER. CLAP. CATCH A SHIRT.', sub: 'beach balls, Mexican waves, a crowd-surfing bear',
    run: () => {
      S().set({ raining: false, lighters: 0 });
      stage().crowd.balladMode(false);
      stage().concert.beachBall();
      at(0.4, () => stage().concert.beachBall());
      at(0.8, () => stage().crowd.surf('bear'));
      at(1.6, () => stage().concert.wave());
      at(3.2, () => stage().concert.shirtCannon());
      at(4.6, () => stage().concert.shirtCannon());
    },
  },
  {
    song: 'saints', section: 2, secs: 7,
    title: 'BRING YOUR FRIENDS', sub: 'party mode — they join from any phone, anywhere', top: true,
    run: () => {
      S().set({ party: { role: 'host', status: 'live', message: '', room: 'WILD', me: 'host', members: FRIENDS, urls: [] } });
      const emojis = ['🔥', '🤘', '😍', '👏', '🐐', '🦆'];
      FRIENDS.slice(1).forEach((m, i) => {
        at(0.4 + i * 0.5, () => party.friendFx.set(m.id, { emote: emojis[i], emoteT: 2.6, clap: 0 }));
        at(3 + i * 0.35, () => party.friendFx.set(m.id, { emote: emojis[(i + 2) % emojis.length], emoteT: 2.6, clap: 1 }));
      });
    },
  },
  {
    song: 'howl-at-the-disco', section: 6, secs: 7.5,
    title: 'WILD FREQUENCIES', sub: 'play free → wild-frequencies.vercel.app', end: true,
    run: () => {
      S().set({ sunglasses: true, hype: 0.95 });
      conductor.emit('pyro', {});
      engine.pyro();
      conductor.emit('confetti', { amount: 1 });
      at(2.5, () => conductor.emit('confetti', { amount: 0.8 }));
    },
  },
];

declare global {
  interface Window {
    /** Set by the headless recorder: receives the video in base64 chunks. */
    promoChunk?: (b64: string, last: boolean) => Promise<void>;
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
    // running by hand: offer a download link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wild-frequencies-promo.webm';
    a.textContent = '⬇ Download the promo video';
    Object.assign(a.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: '99', padding: '18px 26px', background: '#ff4fd8', color: '#fff', borderRadius: '14px', font: '900 22px system-ui' });
    document.body.appendChild(a);
  }
  window.promoDone = true;
}

export async function runPromo() {
  const st = stage();
  S().set({ phase: 'playing', panel: null, captions: false, volume: 0.7, onStage: { cat: true, fox: true, sloth: true, octopus: true, owl: true, penguins: true, goat: true } });
  Object.values(st.band).forEach((c) => c.snapHome());
  engine.setVolume(0.7);
  await sleep(0.4);

  // record the canvas + the band's audio
  const video = st.canvasEl.captureStream(60);
  const audio = engine.recordStream();
  const stream = new MediaStream([...video.getVideoTracks(), ...(audio ? audio.getAudioTracks() : [])]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 192_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(500);

  for (const sc of SCENES) {
    const song = getCompiled(sc.song);
    const sec = song.sections[sc.section];
    S().set({ songId: sc.song });
    songPlayer.play(song, () => {}, { startIn: 0.05, fromStep: sec.start });
    st.promoCard = { title: sc.title, sub: sc.sub, at: performance.now() + 250, dur: sc.secs - 0.6, end: sc.end, top: sc.top };
    sc.run?.();
    await sleep(sc.secs);
  }
  // let the last chord ring, then fade out
  engine.setVolume(0);
  await sleep(0.8);
  songPlayer.stop();
  rec.stop();
  await stopped;
  video.getTracks().forEach((t) => t.stop());
  await deliver(new Blob(chunks, { type: rec.mimeType || 'video/webm' }));
}
