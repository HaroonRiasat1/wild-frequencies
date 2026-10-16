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
import { trackPlayer } from '../audio/trackPlayer';
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

  async host(name: string) {
    await this.connect({ role: 'host', name, animal: 'raccoon' });
  }

  async join(room: string, name: string, animal: FanAnimal) {
    await this.connect({ role: 'guest', room, name, animal });
  }

  private async connect(hello: { role: 'host' | 'guest'; name: string; animal: FanAnimal; room?: string }) {
    this.leave(false);
    this.setParty({ role: hello.role, status: 'connecting', message: 'Finding the party server…' });
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
      const was = S().party.status;
      this.cleanup();
      this.setParty({ status: was === 'error' ? 'error' : 'ended', message: was === 'error' ? S().party.message : 'Disconnected from the party.' });
    };
    ws.onerror = () => this.setParty({ status: 'error', message: 'Could not connect to the party server.' });
  }

  leave(announce = true) {
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
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    songHooks.onPlay = null;
    songHooks.onStop = null;
    songHooks.leadIn = 0.1;
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

  // ------------------------------------------------------------------ peer-to-peer (online hosting)

  private async connectP2P(hello: { role: 'host' | 'guest'; name: string; animal: FanAnimal; room?: string }) {
    this.mode = 'p2p';
    this.setParty({ message: 'Opening an online room…' });
    const { Peer } = await import('peerjs');
    const peerId = (code: string) => `wildfreq-${code.toLowerCase()}`;

    if (hello.role === 'host') {
      const tryCode = (attempt: number) => {
        const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
        const peer = new Peer(peerId(code));
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
          if (err.type === 'unavailable-id' && attempt < 5) {
            peer.destroy();
            return tryCode(attempt + 1);
          }
          this.setParty({ status: 'error', message: `Could not open an online room (${err.type}). Check your connection and try again.` });
        });
      };
      tryCode(0);
      return;
    }

    // guest
    const peer = new Peer();
    this.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(peerId(hello.room ?? ''), { reliable: true, serialization: 'json' });
      this.hostConn = conn;
      conn.on('open', () => {
        this.sendTo(conn, { t: 'hello', ...hello });
        this.syncClock();
      });
      conn.on('data', (d) => this.onMessage(d as Record<string, any>));
      conn.on('close', () => {
        if (this.hostConn !== conn) return;
        this.cleanup();
        this.setParty({ status: 'ended', message: 'The host ended the concert (or lost connection). Thanks for coming!' });
        songPlayer.stop();
      });
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      this.setParty({
        status: 'error',
        message: err.type === 'peer-unavailable' ? 'No concert with that code (did the host close it?)' : `Could not reach the concert (${err.type}). Some school/office networks block this.`,
      });
    });
  }

  /** P2P host: the room-server logic from party/server.mjs, in the browser. */
  private acceptGuest(conn: Conn) {
    const id = `g${this.nextGuest++}`;
    conn.on('data', (raw) => {
      const m = raw as Record<string, any>;
      if (m.t === 'ping') return this.sendTo(conn, { t: 'pong', c: m.c, s: this.serverNow() });
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
        return;
      }
      if (!this.guests.has(id)) return;
      m.from = id;
      if (['clap', 'emote', 'poke'].includes(m.t)) {
        for (const [gid, g] of this.guests) if (gid !== id) this.sendTo(g.conn, m);
        this.onMessage(m);
      } else if (['cheer', 'shout', 'request'].includes(m.t)) {
        this.onMessage(m);
      }
    });
    conn.on('close', () => {
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
        const rtt = Date.now() - m.c;
        if (rtt <= this.bestRtt * 1.5) {
          this.bestRtt = Math.min(this.bestRtt, rtt);
          this.offset = m.s - (m.c + rtt / 2);
        }
        return;
      }
      case 'welcome':
        this.setParty({ status: 'live', room: m.room, me: m.id, members: m.roster, urls: m.urls, message: '' });
        if (m.role === 'host') this.startHosting();
        else this.startGuesting();
        return;
      case 'roster': {
        const before = new Set(S().party.members.map((x: Member) => x.id));
        this.setParty({ members: m.roster });
        for (const mem of m.roster as Member[]) {
          if (!before.has(mem.id) && mem.id !== S().party.me) stageRef.current?.concert.pop(`${mem.name} joined the crowd! 🎉`, 800, 640, mem.color, 22);
        }
        for (const id of [...this.cheering]) if (!m.roster.some((x: Member) => x.id === id)) this.cheering.delete(id);
        return;
      }
      case 'error':
        this.setParty({ status: 'error', message: m.msg });
        return;
      case 'hostLeft':
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
    switch (m.t) {
      case 'state': {
        const patch = m.patch as Partial<Record<SharedKey, unknown>>;
        S().set(patch as never);
        if (patch.songId !== undefined && patch.songId !== 'headliner') this.stopTrackClock();
        return;
      }
      case 'song': {
        this.stopTrackClock();
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
