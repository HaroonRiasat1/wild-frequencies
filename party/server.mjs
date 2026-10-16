// Wild Frequencies party server: serves the built app and relays a concert
// between a host and their friends over WebSockets. Nothing leaves your
// network; there are no accounts and nothing is stored.
//
//   npm run party        (builds, then serves on http://<your-lan-ip>:5180)
//
// Protocol (JSON): every client says hello with a role; the host's show
// messages fan out to guests, guests' crowd messages go to the host (and to
// everyone, for claps/emotes/pokes). `ping` returns the server clock, which
// all clients use as the shared clock for starting songs together.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 5180);
const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const COLORS = ['#ff4fd8', '#00e0c6', '#ffe066', '#ff7a1a', '#7cff4f', '#9ad5ff', '#ff2e63', '#c7a2ff'];
const MAX_GUESTS = 30;

function lanUrls() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${PORT}`);
  }
  return out.length ? out : [`http://localhost:${PORT}`];
}

/** @type {Map<string, {host: any, clients: Map<string, any>, members: Map<string, any>, lastState: any, lastSong: any, colorIdx: number}>} */
const rooms = new Map();

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ party: true, urls: lanUrls(), rooms: rooms.size }));
    return;
  }
  if (!existsSync(DIST)) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Run "npm run build" first (the party server serves dist/).');
    return;
  }
  let file = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!file.startsWith(DIST)) file = join(DIST, 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 });
const send = (ws, msg) => ws.readyState === 1 && ws.send(JSON.stringify(msg));
const roster = (room) => [...room.members.values()];
const toAll = (room, msg, except) => {
  for (const [id, ws] of room.clients) if (id !== except) send(ws, msg);
};
const code = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

let nextId = 1;
wss.on('connection', (ws) => {
  const id = `p${nextId++}`;
  let room = null;
  let role = null;

  ws.on('message', (raw) => {
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (m.t === 'ping') return send(ws, { t: 'pong', c: m.c, s: Date.now() });

    if (m.t === 'hello' && !room) {
      const name = clean(m.name, 18) || (m.role === 'host' ? 'The Host' : 'A Fan');
      const animal = ['raccoon', 'deer', 'hedgehog', 'bear'].includes(m.animal) ? m.animal : 'raccoon';
      if (m.role === 'host') {
        let c = code();
        while (rooms.has(c)) c = code();
        room = { host: ws, clients: new Map(), members: new Map(), lastState: null, lastSong: null, colorIdx: 0 };
        rooms.set(c, room);
        room.code = c;
        role = 'host';
      } else {
        room = rooms.get(clean(m.room, 4).toUpperCase());
        if (!room) return send(ws, { t: 'error', msg: 'No concert with that code (did the host close it?)' });
        if (room.members.size > MAX_GUESTS) return send(ws, { t: 'error', msg: 'This concert is full.' });
        role = 'guest';
      }
      const member = { id, name, animal, color: COLORS[room.colorIdx++ % COLORS.length], role };
      room.clients.set(id, ws);
      room.members.set(id, member);
      send(ws, { t: 'welcome', id, room: room.code, role, urls: lanUrls(), roster: roster(room) });
      if (role === 'guest') {
        if (room.lastState) send(ws, room.lastState);
        if (room.lastSong) send(ws, room.lastSong);
      }
      toAll(room, { t: 'roster', roster: roster(room) }, id);
      return;
    }
    if (!room) return;

    m.from = id;
    if (role === 'host') {
      if (m.t === 'state') room.lastState = { ...m, full: true, ...(room.lastState ? { patch: { ...room.lastState.patch, ...m.patch } } : {}) };
      if (m.t === 'song') room.lastSong = m;
      if (m.t === 'stop') room.lastSong = null;
      // `to`: a message for one guest (e.g. sending a newcomer the host's track)
      if (m.to) {
        const target = room.clients.get(m.to);
        if (target) send(target, m);
      } else toAll(room, m, id);
    } else {
      // guest → host (cheer, shout, request) and, for visible stuff, everyone
      if (['clap', 'emote', 'poke'].includes(m.t)) toAll(room, m, id);
      else if (['cheer', 'shout', 'request'].includes(m.t)) send(room.host, m);
    }
  });

  ws.on('close', () => {
    if (!room) return;
    room.clients.delete(id);
    room.members.delete(id);
    if (role === 'host') {
      toAll(room, { t: 'hostLeft' });
      rooms.delete(room.code);
    } else {
      toAll(room, { t: 'roster', roster: roster(room) });
    }
  });
});

server.listen(PORT, () => {
  console.log('\n🎸 Wild Frequencies party server');
  for (const u of lanUrls()) console.log(`   open ${u}  (friends on the same Wi-Fi can use this too)`);
  console.log('   press Ctrl+C to end the party\n');
});
