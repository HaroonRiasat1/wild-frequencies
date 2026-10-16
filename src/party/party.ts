// Party mode: friends join your concert from their own devices.
//
// The HOST runs the show (director, setlist, hype). It sends:
//   • `state` patches of the shared show state (phase, subtitles, hype, rain…)
//   • `song` — which song starts, and when, on the server's shared clock
//   • `fx`   — one-off moments (confetti, pyro, LED text, speech bubbles) and,
//              for the host's own audio track, its beats and hits
// Two transports: the local party server (WebSocket, `npm run party`) or, when
// the app is hosted online (e.g. Vercel), peer-to-peer WebRTC via PeerJS where
// the host's own browser plays the server's role for its room.
// GUESTS synthesise the band locally, starting each song at the same server
// time (clock offset measured by ping), and send back cheers, claps, emotes,
// shouts, song requests and pokes. The host's own track file is never sent.

import * as Tone from 'tone';
import { songHooks, songPlayer } from '../audio/songPlayer';
import type { TrackMap } from '../audio/trackAnalysis';
import { trackHooks, trackPlayer } from '../audio/trackPlayer';
import { conductor, type ConductorEvents } from '../conductor/conductor';
import { stageRef } from '../scene/stageRef';
import { getCompiled } from '../songs';
import type { CompiledSection } from '../songs/compile';
import type { CharacterId, Song } from '../songs/types';
import { useShow, type FanAnimal, type Member } from '../state/store';

const S = () => useShow.getState();

/** Show state every guest shares with the host. */
const SHARED = [
  'phase', 'songId', 'subtitle', 'nameCard', 'onStage', 'played', 'setLog', 'encoreUnlocked', 'hype', 'raining',
  'moonJoined', 'moonClicks', 'sunglasses', 'lightOverride', 'requested', 'headliner', 'trackBpm', 'detectedKey',
] as const;
type SharedKey = (typeof SHARED)[number];

/** Host → guest one-off events that we mirror. */
const FX_EVENTS = ['confetti', 'pyro', 'ledText', 'bubble', 'cheer'] as const;
/** Host-track events (only while the host plays their own file). */
const TRACK_EVENTS = ['beat', 'hit', 'note', 'backing', 'hype'] as const;

/** Which 16th-step is `seconds` into a song, honouring per-section tempo changes. */
function stepAt(song: ReturnType<typeof getCompiled>, seconds: number): { exact: number; s16: number } {
  let t = 0;
  let bpm = song.song.bpm;
  for (const sec of song.sections) {
    bpm = sec.section.bpm ?? bpm;
    const s16 = 60 / bpm / 4;
    const len = (sec.end - sec.start) * s16;
    if (seconds < t + len) return { exact: sec.start + (seconds - t) / s16, s16 };
    t += len;
  }
  return { exact: song.totalSteps - 1, s16: 60 / bpm / 4 };
}

// WebRTC data channels silently drop messages over ~16 KB, so: 11 KB of audio
// per chunk = ~15 KB of base64 + JSON
const CHUNK = 11 * 1024;
const MAX_TRACK_BYTES = 40 * 1024 * 1024;

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;

/** STUN finds a direct path; a TURN relay (optional, from env) rescues strict networks. */
function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const env = import.meta.env;
  if (env.VITE_TURN_URLS) {
    servers.push({ urls: env.VITE_TURN_URLS.split(',').map((u) => u.trim()), username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  }
  return servers;
}

export const EMOTES = ['🔥', '🤘', '😂', '😍', '👏', '🦆', '🌕', '🐐'];
const CHARACTERS: CharacterId[] = ['cat', 'fox', 'sloth', 'octopus', 'owl', 'penguins', 'goat'];
/** Per-guest rate limits: [burst, refill per second]. */
const LIMITS: Record<string, [number, number]> = {
  clap: [8, 6], emote: [3, 1.5], poke: [2, 0.5], shout: [2, 0.25], request: [2, 0.2], cheer: [6, 4],
};

const RESUME_KEY = 'wf-host-room';
const RESUME_MAX_AGE = 30 * 60 * 1000;
export interface ResumeInfo {
  room: string;
  name: string;
  at: number;
  show: Record<string, unknown>;
}

export interface FriendFx {
  emote: string | null;
  emoteT: number;
  clap: number;
}

type Conn = import('peerjs').DataConnection;

class Party {
  private ws: WebSocket | null = null;
  private mode: 'ws' | 'p2p' = 'ws';
  private peer: import('peerjs').Peer | null = null;
  private hostConn: Conn | null = null;
  /** P2P host only: connected guests (the host is the room server). */
  private guests = new Map<string, { conn: Conn; member: Member }>();
  private colorIdx = 1;
  private nextGuest = 1;
  // host: the track friends should have, and whether it's playing
  private track: { file: File; key: string; name: string } | null = null;
  private nowPlaying: { key: string; name: string; startAt: number } | null = null;
  // guest: tracks received from the host
  private incoming = new Map<string, { name: string; mime: string; parts: string[]; got: number; n: number }>();
  private ready = new Map<string, { buffer: AudioBuffer; map: TrackMap; name: string }>();
  private hostPlaying: { key: string; name: string; startAt: number } | null = null;
  private offset = 0;
  private bestRtt = Infinity;
  private pingTimer = 0;
  private stateTimer = 0;
  private lastSent: Partial<Record<SharedKey, unknown>> = {};
  private unsubs: (() => void)[] = [];
  /** Guests currently holding cheer (host counts these into the hype meter). */
  cheering = new Set<string>();
  friendFx = new Map<string, FriendFx>();
  // guest-side clock for the host's own track
  private trackBeat = { index: 0, at: 0, period: 0.5, active: false };
  // reliability
  private lastHello: { role: 'host' | 'guest'; name: string; animal: FanAnimal; room?: string } | null = null;
  private lastHeard = 0;
  private reconnectTimer = 0;
  private reconnectUntil = 0;
  private heartbeat = 0;
  private intentional = false;
  /** Guest: we've been in this concert before, so errors mean "try again". */
  private wasLive = false;
  private lastSeen = new Map<string, number>();
  private buckets = new Map<string, { tokens: number; at: number }>();
  private saveTimer = 0;

  get role() {
    return S().party.role;
  }
  get isHost() {
    return this.role === 'host' && S().party.status === 'live';
  }
  get isGuest() {
    return this.role === 'guest' && S().party.status !== 'idle';
  }

  serverNow() {
    return Date.now() + this.offset;
  }

  memberName(id: string) {
    return S().party.members.find((m) => m.id === id)?.name ?? 'Someone';
  }

  // ------------------------------------------------------------------ connection

  /** Where the party server lives: same origin when served by it, else :5180 on this host. */
  private async serverBase(): Promise<string | null> {
    const tryInfo = async (base: string) => {
      try {
        const ctl = new AbortController();
        const timer = window.setTimeout(() => ctl.abort(), 1500);
        const r = await fetch(`${location.protocol}//${base}/api/info`, { cache: 'no-store', signal: ctl.signal });
        window.clearTimeout(timer);
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return false;
        return !!(await r.json()).party;
      } catch {
        return false;
      }
    };
    if (await tryInfo(location.host)) return location.host;
    // only look for a separate local server when we're on a local/LAN address
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
    const dev = `${location.hostname}:5180`;
    if (local && (await tryInfo(dev))) return dev;
    return null;
  }

  private setParty(p: Partial<ReturnType<typeof S>['party']>) {
    S().set({ party: { ...S().party, ...p } });
  }

  /** Host a party; `room` reuses a code (after a refresh). */
  async host(name: string, room?: string) {
    await this.connect({ role: 'host', name, animal: 'raccoon', room });
  }

  /** A host who refreshed within the last 30 min gets their room back. */
  resumeInfo(): ResumeInfo | null {
    try {
      const r = JSON.parse(sessionStorage.getItem(RESUME_KEY) ?? 'null') as ResumeInfo | null;
      return r && Date.now() - r.at < RESUME_MAX_AGE ? r : null;
    } catch {
      return null;
    }
  }

  private saveResume() {
    const s = S();
    if (s.party.role !== 'host' || !s.party.room) return;
    const host = s.party.members.find((m) => m.role === 'host');
    const show = {
      played: s.played, setLog: s.setLog, encoreUnlocked: s.encoreUnlocked, moonJoined: s.moonJoined, sunglasses: s.sunglasses,
      score: s.score, achievements: s.achievements, acorns: s.acorns, outfit: s.outfit, hype: s.hype,
    };
    try {
      sessionStorage.setItem(RESUME_KEY, JSON.stringify({ room: s.party.room, name: host?.name ?? 'The Host', at: Date.now(), show }));
    } catch {
      /* private mode: no resume, the party still works */
    }
  }

  /** Token bucket per guest + message type. */
  private allow(from: string, t: string): boolean {
    const lim = LIMITS[t];
    if (!lim) return true;
    const key = `${from}:${t}`;
    const now = performance.now() / 1000;
    const b = this.buckets.get(key) ?? { tokens: lim[0], at: now };
    b.tokens = Math.min(lim[0], b.tokens + (now - b.at) * lim[1]);
    b.at = now;
    this.buckets.set(key, b);
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  /** Reject malformed or spammy guest messages before anyone acts on them. */
  private validGuestMessage(m: Record<string, any>): boolean {
    if (!m || typeof m.t !== 'string' || typeof m.from !== 'string') return false;
    if (!this.allow(m.from, m.t)) return false;
    switch (m.t) {
      case 'clap': return true;
      case 'cheer': return typeof m.on === 'boolean';
      case 'emote': return EMOTES.includes(m.emoji);
      case 'poke': return CHARACTERS.includes(m.who);
      case 'shout': return typeof m.text === 'string' && m.text.length <= 60;
      case 'request': return typeof m.songId === 'string' && m.songId.length <= 40;
      default: return false;
    }
  }

  async join(room: string, name: string, animal: FanAnimal) {
    await this.connect({ role: 'guest', room, name, animal });
  }

  private async connect(hello: { role: 'host' | 'guest'; name: string; animal: FanAnimal; room?: string }, reconnecting = false) {
    if (!reconnecting) {
      this.leave(false);
      this.lastHello = hello;
      this.intentional = false;
      this.wasLive = false;
      this.setParty({ role: hello.role, status: 'connecting', message: 'Finding the party server…' });
    }
    const base = await this.serverBase();
    if (!base) return this.connectP2P(hello);
    this.mode = 'ws';
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${base}`);
    this.ws = ws;
    ws.onopen = () => {
      this.send({ t: 'hello', ...hello });
      this.syncClock();
    };
    ws.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connectionLost();
    };
    ws.onerror = () => this.setParty({ status: 'error', message: 'Could not connect to the party server.' });
  }

  leave(announce = true) {
    if (announce) {
      // tell the room this was on purpose (no reconnect attempts)
      this.intentional = true;
      this.send({ t: this.role === 'host' ? 'hostLeft' : 'bye' });
      try {
        sessionStorage.removeItem(RESUME_KEY);
      } catch {
        /* ignore */
      }
    }
    window.clearTimeout(this.reconnectTimer);
    this.reconnectUntil = 0;
    if (announce) this.wasLive = false;
    const ws = this.ws;
    const peer = this.peer;
    this.ws = null;
    this.peer = null;
    this.hostConn = null;
    this.guests.clear();
    this.cleanup();
    ws?.close();
    peer?.destroy();
    if (announce) this.setParty({ role: 'off', status: 'idle', message: '', room: null, me: null, members: [], urls: [] });
  }

  private cleanup() {
    window.clearInterval(this.pingTimer);
    window.clearInterval(this.stateTimer);
    window.clearInterval(this.heartbeat);
    window.clearInterval(this.saveTimer);
    this.lastSeen.clear();
    this.buckets.clear();
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    songHooks.onPlay = null;
    songHooks.onStop = null;
    songHooks.leadIn = 0.1;
    trackHooks.onPlay = null;
    trackHooks.onStop = null;
    trackHooks.leadIn = 0.1;
    this.nowPlaying = null;
    this.hostPlaying = null;
    this.incoming.clear();
    this.cheering.clear();
    this.friendFx.clear();
    this.lastSent = {};
    this.stopTrackClock();
  }

  send(msg: Record<string, unknown>) {
    if (this.mode === 'p2p') {
      if (this.role === 'host') for (const g of this.guests.values()) this.sendTo(g.conn, msg);
      else if (this.hostConn) this.sendTo(this.hostConn, msg);
      return;
    }
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg));
  }

  private sendTo(conn: Conn, msg: Record<string, unknown>) {
    if (conn.open) conn.send(msg);
  }

  /** Host → one guest. */
  private sendToMember(id: string, msg: Record<string, unknown>) {
    if (this.mode === 'p2p') {
      const g = this.guests.get(id);
      if (g) this.sendTo(g.conn, msg);
    } else this.send({ ...msg, to: id });
  }

  private buffered(id: string | null): number {
    if (this.mode === 'p2p') {
      if (id) return this.guests.get(id)?.conn.dataChannel?.bufferedAmount ?? 0;
      return Math.max(0, ...[...this.guests.values()].map((g) => g.conn.dataChannel?.bufferedAmount ?? 0));
    }
    return this.ws?.bufferedAmount ?? 0;
  }

  // ------------------------------------------------------------------ sharing the host's own track

  /** Host: make this track available to everyone in the room (downloads start now). */
  offerTrack(file: File, name: string) {
    const key = fileKey(file);
    if (this.track?.key === key) return;
    this.track = { file, key, name };
    if (this.isHost) void this.sendFile(null);
  }

  /** Host: this track is about to play (sends it first if friends don't have it). */
  hostTrack(file: File, name: string) {
    this.offerTrack(file, name);
  }

  private async sendFile(to: string | null) {
    const t = this.track;
    if (!t) return;
    if (t.file.size > MAX_TRACK_BYTES) {
      stageRef.current?.concert.pop('Track too big to share (max 40 MB) — friends see the band but won\'t hear it', 800, 660, '#ff7a9a', 18);
      return;
    }
    const bytes = new Uint8Array(await t.file.arrayBuffer());
    const n = Math.ceil(bytes.length / CHUNK);
    const out = (msg: Record<string, unknown>) => (to ? this.sendToMember(to, msg) : this.send(msg));
    out({ t: 'trackBegin', key: t.key, name: t.name, mime: t.file.type || 'audio/mpeg', n });
    for (let i = 0; i < n; i++) {
      if (this.track !== t || S().party.status !== 'live') return;
      // backpressure: don't flood the connection
      while (this.buffered(to) > 2 * 1024 * 1024) await new Promise((r) => setTimeout(r, 40));
      out({ t: 'trackChunk', key: t.key, i, d: toB64(bytes.subarray(i * CHUNK, (i + 1) * CHUNK)) });
      if (i % 24 === 23) await new Promise((r) => setTimeout(r, 0));
    }
    out({ t: 'trackEnd', key: t.key });
    if (this.nowPlaying && this.nowPlaying.key === t.key) out({ t: 'trackPlay', ...this.nowPlaying });
  }

  /** Host: a newcomer gets the current track (and where we are in it). */
  private catchUpGuest(id: string) {
    if (!this.track) return;
    void this.sendFile(id);
  }

  // guest side
  private onTrackMessage(m: Record<string, any>) {
    if (m.t === 'trackBegin') {
      if (this.ready.has(m.key)) return;
      this.incoming.set(m.key, { name: m.name, mime: m.mime, parts: new Array(m.n), got: 0, n: m.n });
      this.setParty({ trackMsg: `⬇️ Getting the host's track "${m.name}"… 0%` });
    } else if (m.t === 'trackChunk') {
      const inc = this.incoming.get(m.key);
      if (!inc || inc.parts[m.i]) return;
      inc.parts[m.i] = m.d;
      inc.got++;
      const pct = Math.floor((inc.got / inc.n) * 100);
      if (pct % 5 === 0) this.setParty({ trackMsg: `⬇️ Getting the host's track "${inc.name}"… ${pct}%` });
    } else if (m.t === 'trackEnd') {
      const inc = this.incoming.get(m.key);
      if (!inc || inc.got < inc.n) return;
      this.incoming.delete(m.key);
      void this.finishTrack(m.key, inc);
    } else if (m.t === 'trackPlay') {
      this.hostPlaying = { key: m.key, name: m.name, startAt: m.startAt };
      this.startLocalTrack();
    } else if (m.t === 'trackStop') {
      this.hostPlaying = null;
      if (trackPlayer.active) trackPlayer.stop();
    }
  }

  private async finishTrack(key: string, inc: { name: string; mime: string; parts: string[] }) {
    this.setParty({ trackMsg: `🎛️ Soundchecking "${inc.name}"…` });
    try {
      const blobParts = inc.parts.map((p) => fromB64(p));
      const file = new File(blobParts as BlobPart[], inc.name, { type: inc.mime });
      const { prepareTrack } = await import('../show/director');
      const { buffer, map } = await prepareTrack(file);
      this.ready.set(key, { buffer, map, name: inc.name });
      this.setParty({ trackMsg: '' });
      this.startLocalTrack();
    } catch (e) {
      console.error(e);
      this.setParty({ trackMsg: '⚠️ Could not play the host\'s track on this device' });
    }
  }

  /** Guest: play the host's track locally, in sync (jumping in if we're late). */
  private startLocalTrack() {
    const hp = this.hostPlaying;
    if (!hp) return;
    const r = this.ready.get(hp.key);
    if (!r || (trackPlayer.active && trackPlayer.map === r.map)) return;
    this.stopTrackClock();
    const la = Tone.getContext().lookAhead;
    const wait = (hp.startAt - this.serverNow()) / 1000;
    if (wait - la > 0.03) trackPlayer.play(r.buffer, r.map, hp.name, () => {}, { startIn: wait - la });
    else {
      const lead = 0.25;
      trackPlayer.play(r.buffer, r.map, hp.name, () => {}, { startIn: lead, offset: -wait + la + lead });
    }
  }

  // ------------------------------------------------------------------ peer-to-peer (online hosting)

  private async connectP2P(hello: { role: 'host' | 'guest'; name: string; animal: FanAnimal; room?: string }) {
    this.mode = 'p2p';
    this.setParty({ message: 'Opening an online room…' });
    const { Peer } = await import('peerjs');
    const peerId = (code: string) => `wildfreq-${code.toLowerCase()}`;

    if (hello.role === 'host') {
      const wanted = hello.room?.toUpperCase();
      const tryCode = (attempt: number) => {
        // after a refresh, keep asking for the old code for ~30 s (the broker
        // frees it once the old page's connection times out), then give up
        const code = wanted && attempt < 10 ? wanted : Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
        const peer = new Peer(peerId(code), { config: { iceServers: iceServers() } });
        this.peer = peer;
        peer.on('open', () => {
          if (this.peer !== peer) return;
          const me: Member = { id: 'host', name: hello.name, animal: hello.animal, color: '#ff4fd8', role: 'host' };
          this.onMessage({ t: 'welcome', id: 'host', room: code, role: 'host', urls: [location.origin + location.pathname.replace(/\/$/, '')], roster: [me] });
        });
        peer.on('connection', (conn) => this.acceptGuest(conn));
        peer.on('disconnected', () => this.peer === peer && !peer.destroyed && peer.reconnect());
        peer.on('error', (err) => {
          if (this.peer !== peer) return;
          if (err.type === 'unavailable-id' && attempt < 15) {
            peer.destroy();
            if (wanted && attempt < 10) {
              this.setParty({ message: `Getting your room ${wanted} back… (${attempt + 1}/10)` });
              this.reconnectTimer = window.setTimeout(() => tryCode(attempt + 1), 3000);
              return;
            }
            return tryCode(attempt + 1);
          }
          this.setParty({ status: 'error', message: `Could not open an online room (${err.type}). Check your connection and try again.` });
        });
      };
      tryCode(0);
      return;
    }

    // guest
    const peer = new Peer({ config: { iceServers: iceServers() } });
    this.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(peerId(hello.room ?? ''), { reliable: true, serialization: 'json' });
      this.hostConn = conn;
      // a connection to a host who isn't there (yet) can hang forever: time it out
      window.setTimeout(() => {
        if (this.hostConn !== conn || conn.open) return;
        this.hostConn = null;
        conn.close();
        if (S().party.status === 'reconnecting') this.scheduleReconnect();
        else if (S().party.status === 'connecting') this.setParty({ status: 'error', message: 'No answer from that concert. Check the code, or ask the host if the party is still on.' });
      }, 6000);
      conn.on('open', () => {
        this.lastHeard = Date.now();
        this.sendTo(conn, { t: 'hello', ...hello });
        this.syncClock();
      });
      conn.on('data', (d) => {
        this.lastHeard = Date.now();
        this.onMessage(d as Record<string, any>);
      });
      conn.on('close', () => {
        if (this.hostConn !== conn) return;
        this.hostConn = null;
        this.connectionLost();
      });
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      // once we've been in the concert, any error just means: try again shortly
      if (this.wasLive && !this.intentional) {
        if (S().party.status !== 'reconnecting') return this.connectionLost();
        return this.scheduleReconnect();
      }
      this.setParty({
        status: 'error',
        message: err.type === 'peer-unavailable' ? 'No concert with that code (did the host close it?)' : `Could not reach the concert (${err.type}). Some school/office networks block this.`,
      });
    });
  }

  /** P2P host: the room-server logic from party/server.mjs, in the browser. */
  private acceptGuest(conn: Conn) {
    const id = `g${this.nextGuest++}`;
    this.lastSeen.set(id, Date.now());
    conn.on('data', (raw) => {
      const m = raw as Record<string, any>;
      if (!m || typeof m !== 'object') return;
      this.lastSeen.set(id, Date.now());
      if (m.t === 'ping') return this.sendTo(conn, { t: 'pong', c: m.c, s: this.serverNow() });
      if (m.t === 'bye') return conn.close();
      if (m.t === 'hello') {
        if (this.guests.size >= 30) return this.sendTo(conn, { t: 'error', msg: 'This concert is full.' });
        const COLORS = ['#ff4fd8', '#00e0c6', '#ffe066', '#ff7a1a', '#7cff4f', '#9ad5ff', '#ff2e63', '#c7a2ff'];
        const member: Member = {
          id,
          name: String(m.name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 18) || 'A Fan',
          animal: ['raccoon', 'deer', 'hedgehog', 'bear'].includes(m.animal) ? m.animal : 'raccoon',
          color: COLORS[this.colorIdx++ % COLORS.length],
          role: 'guest',
        };
        this.guests.set(id, { conn, member });
        const roster = this.roster();
        this.sendTo(conn, { t: 'welcome', id, room: S().party.room, role: 'guest', urls: S().party.urls, roster });
        this.sendTo(conn, { t: 'state', patch: this.fullPatch() });
        if (songPlayer.current) this.sendTo(conn, { t: 'song', songId: songPlayer.current.song.id, startAt: this.serverNow() - this.songElapsedMs() });
        this.announceRoster();
        this.catchUpGuest(id);
        return;
      }
      if (!this.guests.has(id)) return;
      m.from = id;
      if (!this.validGuestMessage(m)) return;
      if (['clap', 'emote', 'poke'].includes(m.t)) {
        for (const [gid, g] of this.guests) if (gid !== id) this.sendTo(g.conn, m);
        this.onMessage(m);
      } else if (['cheer', 'shout', 'request'].includes(m.t)) {
        this.onMessage(m);
      }
    });
    conn.on('close', () => {
      this.lastSeen.delete(id);
      if (!this.guests.delete(id)) return;
      this.cheering.delete(id);
      this.announceRoster();
    });
  }

  private roster(): Member[] {
    const host = S().party.members.find((x) => x.role === 'host');
    return [...(host ? [host] : []), ...[...this.guests.values()].map((g) => g.member)];
  }

  private announceRoster() {
    const roster = this.roster();
    this.send({ t: 'roster', roster });
    this.onMessage({ t: 'roster', roster });
  }

  private fullPatch(): Record<string, unknown> {
    const s = S();
    const patch: Record<string, unknown> = {};
    for (const k of SHARED) patch[k] = s[k];
    return patch;
  }

  private syncClock() {
    let n = 0;
    const ping = () => this.send({ t: 'ping', c: Date.now() });
    ping();
    this.pingTimer = window.setInterval(() => {
      ping();
      if (++n === 6) {
        window.clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(ping, 5000);
      }
    }, 300);
  }

  // ------------------------------------------------------------------ messages

  private onMessage(m: Record<string, any>) {
    switch (m.t) {
      case 'pong': {
        this.lastHeard = Date.now();
        const rtt = Date.now() - m.c;
        if (rtt <= this.bestRtt * 1.5) {
          this.bestRtt = Math.min(this.bestRtt, rtt);
          this.offset = m.s - (m.c + rtt / 2);
        }
        return;
      }
      case 'welcome': {
        const wasReconnect = S().party.status === 'reconnecting';
        window.clearTimeout(this.reconnectTimer);
        this.reconnectUntil = 0;
        this.lastHeard = Date.now();
        this.setParty({ status: 'live', room: m.room, me: m.id, members: m.roster, urls: m.urls, message: '' });
        this.wasLive = true;
        if (wasReconnect) stageRef.current?.concert.pop('📶 Back in the concert!', 800, 640, '#7cff4f', 24);
        if (m.role === 'host') this.startHosting();
        else this.startGuesting();
        this.startHeartbeat();
        return;
      }
      case 'roster': {
        const before = new Set(S().party.members.map((x: Member) => x.id));
        this.setParty({ members: m.roster });
        for (const mem of m.roster as Member[]) {
          if (!before.has(mem.id) && mem.id !== S().party.me) {
            stageRef.current?.concert.pop(`${mem.name} joined the crowd! 🎉`, 800, 640, mem.color, 22);
            if (this.role === 'host' && this.mode === 'ws') this.catchUpGuest(mem.id);
          }
        }
        for (const id of [...this.cheering]) if (!m.roster.some((x: Member) => x.id === id)) this.cheering.delete(id);
        return;
      }
      case 'error':
        this.setParty({ status: 'error', message: m.msg });
        return;
      case 'hostLeft':
        this.intentional = true;
        this.setParty({ status: 'ended', message: 'The host ended the concert. Thanks for coming!' });
        songPlayer.stop();
        return;
      // ---- shared crowd stuff (anyone → everyone)
      case 'clap':
        this.fx(m.from).clap = 1;
        return;
      case 'emote':
        Object.assign(this.fx(m.from), { emote: String(m.emoji).slice(0, 4), emoteT: 2.6 });
        return;
      case 'poke':
        stageRef.current?.poke(m.who as CharacterId, true);
        return;
    }
    if (this.role === 'host') this.onHostMessage(m);
    else this.onGuestMessage(m);
  }

  // ------------------------------------------------------------------ reliability

  /** The link dropped without a goodbye: guests keep the music going and retry. */
  private connectionLost() {
    if (this.intentional || S().party.status === 'idle') return;
    if (this.role === 'guest' && this.lastHello) {
      this.reconnectUntil = this.reconnectUntil || Date.now() + 180_000;
      this.setParty({ status: 'reconnecting', message: 'Connection lost — reconnecting to the concert…' });
      this.scheduleReconnect();
      return;
    }
    // host lost the local server (P2P hosts reconnect to the broker on their own)
    const was = S().party.status;
    this.cleanup();
    this.setParty({ status: was === 'error' ? 'error' : 'ended', message: was === 'error' ? S().party.message : 'Lost the party server.' });
  }

  private scheduleReconnect() {
    window.clearTimeout(this.reconnectTimer);
    if (!this.reconnectUntil || Date.now() > this.reconnectUntil) {
      this.cleanup();
      this.setParty({ status: 'ended', message: 'Lost the concert and could not get back in. The host may have left.' });
      return;
    }
    this.reconnectTimer = window.setTimeout(() => void this.reconnect(), 2000);
  }

  private async reconnect() {
    const hello = this.lastHello;
    if (!hello || S().party.status !== 'reconnecting') return;
    // tear down only the connection; keep songs/tracks playing locally
    this.peer?.destroy();
    this.peer = null;
    this.hostConn = null;
    this.ws?.close();
    this.ws = null;
    window.clearInterval(this.pingTimer);
    window.clearInterval(this.heartbeat);
    this.unsubs.forEach((u) => u()); // startGuesting subscribes again on welcome
    this.unsubs = [];
    this.bestRtt = Infinity;
    await this.connect(hello, true);
  }

  private startHeartbeat() {
    window.clearInterval(this.heartbeat);
    this.heartbeat = window.setInterval(() => {
      const now = Date.now();
      if (this.role === 'guest') {
        // pings go out every 5 s; 13 s of silence means the link is dead
        if (now - this.lastHeard > 13_000) {
          this.hostConn?.close();
          this.ws?.close();
          if (this.mode === 'p2p') {
            this.hostConn = null;
            this.connectionLost();
          }
        }
      } else if (this.mode === 'p2p') {
        for (const [id, seen] of this.lastSeen) {
          if (now - seen > 16_000) this.guests.get(id)?.conn.close();
        }
      }
    }, 2000);
    if (this.role === 'host') {
      window.clearInterval(this.saveTimer);
      this.saveResume();
      this.saveTimer = window.setInterval(() => this.saveResume(), 3000);
    }
  }

  private localSongStartAt(): number {
    const tr = Tone.getTransport();
    if (tr.state !== 'started') return 0;
    return this.serverNow() - tr.getSecondsAtTime(Tone.immediate()) * 1000;
  }

  private fx(id: string): FriendFx {
    let f = this.friendFx.get(id);
    if (!f) this.friendFx.set(id, (f = { emote: null, emoteT: 0, clap: 0 }));
    return f;
  }

  // ------------------------------------------------------------------ host side

  private startHosting() {
    songHooks.leadIn = 0.8; // give guests' devices time to hear about the song
    // transport.start(Tone.now() + x) is audible at now + lookAhead + x — announce the audible time
    songHooks.onPlay = (songId, startIn) =>
      this.send({ t: 'song', songId, startAt: this.serverNow() + (startIn + Tone.getContext().lookAhead) * 1000 });
    songHooks.onStop = () => this.send({ t: 'stop' });
    trackHooks.leadIn = 0.8;
    trackHooks.onPlay = (startIn) => {
      if (!this.track) return;
      this.nowPlaying = { key: this.track.key, name: this.track.name, startAt: this.serverNow() + (startIn + Tone.getContext().lookAhead) * 1000 };
      this.send({ t: 'trackPlay', ...this.nowPlaying });
    };
    trackHooks.onStop = () => {
      this.nowPlaying = null;
      this.send({ t: 'trackStop' });
    };
    if (this.track) void this.sendFile(null);
    this.stateTimer = window.setInterval(() => this.broadcastState(), 100);
    for (const e of FX_EVENTS) {
      this.unsubs.push(conductor.on(e, (p) => this.send({ t: 'fx', e, p })));
    }
    for (const e of TRACK_EVENTS) {
      this.unsubs.push(conductor.on(e, (p) => trackPlayer.active && this.send({ t: 'fx', e, p, track: true })));
    }
    this.unsubs.push(
      conductor.on('section', ({ section }) => trackPlayer.active && this.send({ t: 'fx', e: 'section', p: { section }, track: true })),
      conductor.on('react', ({ who, kind }) => kind === 'poke' && this.send({ t: 'poke', who })),
    );
    // the host's track: send the singer's mouth too
    const vocalTimer = window.setInterval(() => trackPlayer.active && this.send({ t: 'fx', e: 'vocal', p: conductor.state.vocal, track: true }), 70);
    this.unsubs.push(() => window.clearInterval(vocalTimer));
    this.broadcastState(true);
    // a song may already be playing when the party starts
    if (songPlayer.current) this.send({ t: 'song', songId: songPlayer.current.song.id, startAt: this.serverNow() - this.songElapsedMs() });
  }

  private songElapsedMs(): number {
    const tr = Tone.getTransport();
    return tr.state === 'started' ? tr.getSecondsAtTime(Tone.immediate()) * 1000 : 0;
  }

  private broadcastState(full = false) {
    const s = S();
    const patch: Record<string, unknown> = {};
    for (const k of SHARED) {
      const v = s[k];
      if (full || this.lastSent[k] !== v) {
        patch[k] = v;
        this.lastSent[k] = v;
      }
    }
    if (Object.keys(patch).length) this.send({ t: 'state', patch });
  }

  private async onHostMessage(m: Record<string, any>) {
    // (P2P already validated these on arrival; WS messages come via the server)
    if (this.mode === 'ws' && ['cheer', 'shout', 'request'].includes(m.t) && !this.validGuestMessage(m)) return;
    const name = this.memberName(m.from);
    if (m.t === 'cheer') {
      if (m.on) this.cheering.add(m.from);
      else this.cheering.delete(m.from);
      if (m.on) conductor.emit('cheer', { level: S().hype });
    } else if (m.t === 'shout') {
      const { shout } = await import('../show/shout');
      shout(String(m.text ?? ''), name);
    } else if (m.t === 'request') {
      const { director } = await import('../show/director');
      director.request(String(m.songId), false);
      stageRef.current?.concert.pop(`${name} requested a song ★`, 800, 660, '#ffe066', 20);
    }
  }

  // ------------------------------------------------------------------ guest side

  private startGuesting() {
    // guests never run the director: the host's state drives everything.
    // A guest's own pokes go out to the whole room.
    this.unsubs.push(conductor.on('react', ({ who, kind }) => kind === 'poke' && this.send({ t: 'poke', who })));
  }

  private onGuestMessage(m: Record<string, any>) {
    if (typeof m.t === 'string' && m.t.startsWith('track')) return this.onTrackMessage(m);
    switch (m.t) {
      case 'state': {
        const patch = m.patch as Partial<Record<SharedKey, unknown>>;
        S().set(patch as never);
        if (patch.songId !== undefined && patch.songId !== 'headliner') this.stopTrackClock();
        return;
      }
      case 'song': {
        this.stopTrackClock();
        if (songPlayer.current?.song.id === m.songId && Math.abs(this.localSongStartAt() - m.startAt) < 60) return; // still in sync
        const compiled = getCompiled(m.songId);
        const la = Tone.getContext().lookAhead;
        const wait = (m.startAt - this.serverNow()) / 1000;
        if (wait - la > 0.03) songPlayer.play(compiled, () => {}, { startIn: wait - la });
        else {
          // late: jump in where the host is now (+ a little lead-in)
          // land exactly on the next 16th: start a hair later, at a whole step
          const lead = 0.15;
          const { exact, s16 } = stepAt(compiled, -wait + la + lead);
          const step = Math.ceil(exact);
          songPlayer.play(compiled, () => {}, { startIn: lead + (step - exact) * s16, fromStep: step });
        }
        return;
      }
      case 'stop':
        if (songPlayer.current) songPlayer.skip();
        return;
      case 'fx':
        if (m.track) this.onTrackFx(m.e, m.p);
        else conductor.emit(m.e, m.p);
        return;
    }
  }

  /** Host is playing their own file: follow its beats (no audio here). */
  private onTrackFx(e: string, p: unknown) {
    if (trackPlayer.active) return; // we have the real track — our own analysis drives the band
    const tb = this.trackBeat;
    if (!tb.active) {
      tb.active = true;
      conductor.state.playing = true;
      this.restoreBeat ??= conductor.state.beatSource;
      conductor.state.beatSource = () => tb.index + Math.min(0.999, (performance.now() / 1000 - tb.at) / tb.period);
    }
    if (e === 'beat') {
      const now = performance.now() / 1000;
      const gap = now - tb.at;
      if (gap > 0.25 && gap < 1.5) tb.period = tb.period * 0.7 + gap * 0.3;
      tb.at = now;
      tb.index = (p as ConductorEvents['beat']).beat;
    }
    if (e === 'section') {
      const sec = (p as { section: CompiledSection }).section;
      conductor.state.section = sec;
      conductor.state.intensity = sec.section.intensity;
      conductor.state.soloist = sec.soloist;
      conductor.emit('section', { section: sec, song: { id: 'headliner', ballad: false } as Song });
      return;
    }
    if (e === 'vocal') {
      conductor.state.vocal = p as number;
      return;
    }
    conductor.emit(e as keyof ConductorEvents, p as never);
  }

  private restoreBeat: (() => number) | null = null;

  get followingTrack() {
    return this.trackBeat.active;
  }

  private stopTrackClock() {
    if (!this.trackBeat.active) return;
    this.trackBeat.active = false;
    if (this.restoreBeat) conductor.state.beatSource = this.restoreBeat;
    this.restoreBeat = null;
    conductor.state.playing = false;
    conductor.state.vocal = 0;
  }

  // ------------------------------------------------------------------ guest actions

  cheer(on: boolean) {
    if (this.isGuest) this.send({ t: 'cheer', on });
  }

  clap() {
    if (S().party.status === 'live') this.send({ t: 'clap' });
  }

  emote(emoji: string) {
    if (S().party.status !== 'live') return;
    this.send({ t: 'emote', emoji });
    const me = S().party.me;
    if (me) Object.assign(this.fx(me), { emote: emoji, emoteT: 2.6 });
  }

  /** Returns true when the action was handled by sending it to the host. */
  shout(text: string): boolean {
    if (!this.isGuest) return false;
    this.send({ t: 'shout', text: text.slice(0, 60) });
    return true;
  }

  request(songId: string): boolean {
    if (!this.isGuest) return false;
    this.send({ t: 'request', songId });
    return true;
  }

  /** Called every frame (renderer): decay emotes/claps. */
  tick(dt: number) {
    for (const f of this.friendFx.values()) {
      f.emoteT = Math.max(0, f.emoteT - dt);
      f.clap = Math.max(0, f.clap - dt * 6);
    }
  }
}

export const party = new Party();
