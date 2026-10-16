// The stage renderer: one requestAnimationFrame loop drawing everything on a
// single canvas in a 1600x900 "world", with a camera that sways, zooms on
// soloists and pulls back on big choruses. All motion is phase-locked to the
// conductor's beat clock (Tone.Transport), and reacts to conductor events.

import { engine } from '../audio/engine';
import { micSinger } from '../audio/micSinger';
import { isYourLine, songPlayer } from '../audio/songPlayer';
import { trackPlayer } from '../audio/trackPlayer';
import { conductor } from '../conductor/conductor';
import { CAST } from '../show/cast';
import { party } from '../party/party';
import { addScore, unlock } from '../show/score';
import type { CharacterId, LightCue } from '../songs/types';
import { CHARACTER_TO_INSTRUMENT, isAudible, useShow } from '../state/store';
import { approach, clamp, type G } from './draw';
import type { Character, Frame } from './characters/base';
import { Cat } from './characters/cat';
import { Fox } from './characters/fox';
import { Goat } from './characters/goat';
import { Octopus } from './characters/octopus';
import { Owl } from './characters/owl';
import { Penguins } from './characters/penguins';
import { Roadie } from './characters/roadie';
import { Sloth } from './characters/sloth';
import { Concert } from './concert';
import { Crowd } from './crowd';
import { Fog, Particles } from './effects';
import { drawAfterparty, drawMerchStand, hitMerch, Mice, Rain } from './extras';
import { LedWall } from './ledWall';
import { Sky } from './sky';
import { Lights, StageSet } from './stage';

const W = 1600;
const H = 900;
const IDLE_PALETTE = ['#4b2a8c', '#1f6fff', '#a03cff'];

export class StageRenderer {
  private g: G;
  private raf = 0;
  private last = 0;
  private t0 = performance.now();
  private dpr = 1;
  private fit = 1;
  private offX = 0;
  private offY = 0;
  private cam = { zoom: 1, cx: W / 2, cy: H / 2, kick: 0 };
  private unsubs: (() => void)[] = [];
  private pokeCount: Partial<Record<CharacterId, number>> = {};

  readonly cat = new Cat();
  readonly fox = new Fox();
  readonly sloth = new Sloth();
  readonly octopus = new Octopus();
  readonly owl = new Owl();
  readonly penguins = new Penguins();
  readonly goat = new Goat();
  readonly band: Record<CharacterId, Character>;
  private drawOrder: Character[];
  private hitOrder: Character[];
  private roadie = new Roadie();
  private sky: Sky;
  private set = new StageSet();
  private lights = new Lights();
  private led = new LedWall();
  private fog: Fog;
  private particles: Particles;
  crowd: Crowd;
  concert: Concert;
  private lastPhase = '';
  private lastMicNote: string | null = null;
  private duetNotes = 0;
  private mice = new Mice();
  private rain: Rain;
  private cssW = W;
  private cssH = H;
  private fogBurstT = 0;
  private lastDive = 'none';

  constructor(private canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d', { alpha: false })!;
    const lq = useShow.getState().lowQuality;
    this.sky = new Sky(lq);
    this.fog = new Fog(lq);
    this.particles = new Particles(lq);
    this.crowd = new Crowd(lq);
    this.concert = new Concert(this.crowd, this.fox, this.goat, this.roadie);
    this.rain = new Rain(lq);
    this.crowd.onDiveDone = () => {
      unlock('stageDive', 80);
      this.concert.pop('STAGE DIVE COMPLETE 🤸', 800, 660, '#ffe066', 28);
    };
    this.band = { cat: this.cat, fox: this.fox, sloth: this.sloth, octopus: this.octopus, owl: this.owl, penguins: this.penguins, goat: this.goat };
    this.drawOrder = [this.octopus, this.owl, this.penguins, this.fox, this.sloth, this.cat];
    this.hitOrder = [this.goat, this.cat, this.sloth, this.fox, this.penguins, this.owl, this.octopus];
    this.octopus.emitInk = (x, y, n) => this.particles.ink(x, y, n);
    this.octopus.emitStick = (x, y) => this.particles.stick(x, y);
    this.frameCache = this.buildFrame(performance.now());
    this.subscribe();
    this.resize();
  }

  // ------------------------------------------------------------------ events

  private subscribe() {
    const S = useShow.getState;
    this.unsubs.push(
      conductor.on('hit', ({ kind, vel }) => {
        this.octopus.onHit(kind, vel, this.frameCache);
        if (kind === 'hat' || kind === 'openHat' || kind === 'ride') this.sky.hat();
        if (kind === 'kick') this.cam.kick = 1;
        const cue = conductor.state.section?.section.lights;
        if (S().strobe && cue?.movement === 'strobe' && (kind === 'snare' || kind === 'clap')) this.lights.strobeHit();
      }),
      conductor.on('note', ({ who, midi, dur, vel }) => {
        if (who !== 'cat') this.band[who].onNote(midi, dur, vel);
        else if (S().phase === 'upload') this.cat.sing(midi, 0.3);
      }),
      conductor.on('vocal', (v) => {
        if (S().phase === 'openingAct') return this.mice.sing(v.durSec);
        if (!v.yours) this.cat.sing(v.midi, v.durSec);
        else if (micSinger.level > 0.25) {
          // you're actually singing your line
          addScore(4, 0);
          if (++this.duetNotes >= 12) unlock('duet');
        }
        const ly = S().lyric;
        if (ly) S().set({ lyric: { ...ly, active: v.idx } });
      }),
      conductor.on('line', ({ line }) => {
        S().set({ lyric: line ? { words: line.words, animal: line.animal, active: -1, id: line.id, yours: isYourLine(line.id) } : null });
      }),
      conductor.on('backing', ({ syl, durSec }) => this.penguins.sing(syl, durSec)),
      conductor.on('hype', ({ source }) => {
        if (source !== 'click') this.goat.scream();
      }),
      conductor.on('beat', ({ downbeat }) => {
        if (S().moonJoined) this.sky.tambourine();
        // haptics: a tiny buzz on every bar line (phones only, opt-out in settings)
        if (downbeat && S().haptics && this.frameCache.playing && 'vibrate' in navigator) navigator.vibrate?.(12);
      }),
      conductor.on('section', ({ section, song }) => {
        const sec = section.section;
        if (sec.led) this.led.setMode(sec.led);
        this.fog.density = sec.lights.fog ?? 0.5;
        S().set({ sectionKind: sec.kind, sectionLabel: sec.label ?? sec.kind.toUpperCase(), soloist: section.soloist });
        if (sec.kind === 'chorus' || sec.kind === 'drop') this.owl.spin();
        if (sec.kind === 'drop' || (sec.kind === 'chorus' && sec.intensity >= 1)) this.crowd.surf();
        this.crowd.balladMode(!!song.ballad && sec.kind !== 'intro');
        if (section.soloist) {
          const c = this.band[section.soloist];
          if (section.soloist === 'sloth') c.say('…(groove intensifies)…', 3);
          if (section.soloist === 'fox') c.say('KNEE SLIDE!!!', 2);
          if (section.soloist === 'octopus') c.say('ALL EIGHT!', 2);
          if (section.soloist === 'owl') c.say('Hoo.', 2);
        }
      }),
      conductor.on('songStart', () => {
        this.crowd.balladMode(false);
      }),
      conductor.on('songEnd', () => {
        Object.values(this.band).forEach((c) => c.celebrate(2.2));
        this.crowd.cheer();
        this.crowd.balladMode(false);
        this.led.setMode('lava');
        this.fog.density = 0.6;
      }),
      conductor.on('cheer', () => {
        this.crowd.cheer();
        const members = Object.values(this.band);
        members[Math.floor(Math.random() * members.length)].celebrate(1.2);
        if (Math.random() < 0.3) this.cat.say(['Thank you!', 'I KNOW.', 'Louder!', 'You\'re too kind (continue)'][Math.floor(Math.random() * 4)], 1.6);
      }),
      conductor.on('confetti', ({ amount }) => this.particles.confetti(amount)),
      conductor.on('pyro', () => {
        this.particles.pyro();
        Object.values(this.band).forEach((c) => c.celebrate(2));
      }),
      conductor.on('ledText', ({ text, seconds }) => this.led.showText(text, seconds)),
      conductor.on('bubble', ({ who, text, seconds }) => {
        if (who === 'raccoon') this.roadie.say(text, seconds);
        else if (who !== 'moon') this.band[who].say(text, seconds);
      }),
    );
  }

  // ------------------------------------------------------------------ interaction

  poke(id: CharacterId, remote = false) {
    const c = this.band[id];
    if (c.anim === 'offstage' || c.walking) return;
    const n = (this.pokeCount[id] = (this.pokeCount[id] ?? 0) + 1);
    const lines = CAST[id].pokes;
    c.poke(lines[(n - 1) % lines.length]);
    if (id === 'goat') this.goat.scream();
    engine.lick(id);
    conductor.emit('react', { who: id, kind: remote ? 'remotePoke' : 'poke' });
  }

  private toLayer(clientX: number, clientY: number, p: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const lx = (clientX - r.left - this.offX) / this.fit;
    const ly = (clientY - r.top - this.offY) / this.fit;
    const z = 1 + (this.cam.zoom - 1) * p;
    const cx = W / 2 + (this.cam.cx - W / 2) * p;
    const cy = H / 2 + (this.cam.cy - H / 2) * p;
    return [(lx - W / 2) / z + cx, (ly - H / 2) / z + cy];
  }

  get canvasEl() {
    return this.canvas;
  }

  /** Light remote: a big puff from the fog machines. */
  fogBurst() {
    this.fogBurstT = 4;
  }

  handleClick(clientX: number, clientY: number, pointerType = 'mouse') {
    const S = useShow.getState();
    // foreground first: beach balls, the merch stand, your capybara
    const [cx0, cy0] = this.toLayer(clientX, clientY, 0.5);
    if (S.phase !== 'landing') {
      if (this.concert.click(cx0, cy0)) return;
      if (hitMerch(cx0, cy0)) return S.togglePanel('merch');
      if (this.crowd.hitYou(cx0, cy0)) {
        if (this.frameCache.playing) this.crowd.startDive();
        else this.concert.pop('(stage-diving is only allowed during a song)', 800, 700, '#b9aee0', 18);
        return;
      }
    }
    const [wx, wy] = this.toLayer(clientX, clientY, 1);
    for (const c of this.hitOrder) {
      if (c.hitTest(wx, wy)) {
        this.poke(c.id);
        return;
      }
    }
    const [sx, sy] = this.toLayer(clientX, clientY, 0.25);
    if (this.sky.hitMoon(sx, sy)) {
      this.clickMoon();
      return;
    }
    const [cx, cy] = this.toLayer(clientX, clientY, 0.5);
    if (S.phase !== 'landing' && this.concert.click(cx, cy)) return;
    if (cy > 650 && S.phase !== 'landing') {
      if (this.crowd.raiseLighter(cx, cy)) {
        S.set({ lighters: S.lighters + 1 });
        addScore(2);
        return;
      }
    }
    // phones: tap anywhere else to clap on the beat
    if (pointerType === 'touch' && this.frameCache.playing) {
      this.concert.clap();
      if (S.haptics) navigator.vibrate?.(20);
    }
  }

  clickMoon() {
    const s = useShow.getState();
    if (s.moonJoined) {
      s.say('The Moon', 'I am WORKING. (tambourine intensifies)');
      return;
    }
    const n = s.moonClicks + 1;
    s.set({ moonClicks: n });
    const lines = ['', 'The Moon: …hm?', 'The Moon: stop poking me.', 'The Moon: I said STOP.', 'The Moon: …is that a tambourine?'];
    if (n < 5) {
      s.say('The Moon', lines[n].replace('The Moon: ', ''));
    } else {
      s.set({ moonJoined: true });
      unlock('moon');
      s.say('The Moon', 'I have waited 4.5 billion years for this. Hit it.');
      conductor.emit('ledText', { text: 'NOW ON TAMBOURINE: THE MOON', seconds: 3.5 });
      engine.applaud(2, 50);
    }
  }

  // ------------------------------------------------------------------ loop

  resize() {
    const parent = this.canvas.parentElement!;
    const cw = parent.clientWidth;
    const ch = parent.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, useShow.getState().lowQuality ? 1.5 : 2);
    this.cssW = cw;
    this.cssH = ch;
    this.canvas.width = Math.floor(cw * this.dpr);
    this.canvas.height = Math.floor(ch * this.dpr);
    this.canvas.style.width = `${cw}px`;
    this.canvas.style.height = `${ch}px`;
    // portrait phones: show a narrower slice of the stage (~820 wide) and let
    // the camera pan to follow the action, instead of a tiny letterboxed stage
    this.fit = ch > cw ? Math.min(cw / 820, ch / H) : Math.min(cw / W, ch / H);
    this.offX = (cw - W * this.fit) / 2;
    this.offY = (ch - H * this.fit) / 2;
  }

  start() {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.frame(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.unsubs.forEach((u) => u());
    this.concert.dispose();
  }

  private frameCache: Frame;

  private buildFrame(now: number): Frame {
    const dt = clamp((now - (this.last || now)) / 1000, 0, 0.05);
    this.last = now;
    const S = useShow.getState();
    const st = conductor.state;
    const beat = conductor.beat();
    const sec = st.section?.section;
    const playing = st.playing && (S.phase === 'playing' || S.phase === 'encore' || S.phase === 'upload' || S.phase === 'openingAct');
    return {
      t: (now - this.t0) / 1000,
      dt,
      // user tracks can start with pickup beats (negative); visuals index palettes by beat
      beat: Math.max(0, beat),
      phase: ((beat % 1) + 1) % 1,
      energy: engine.bands(),
      intensity: playing ? st.intensity : 0.15,
      playing,
      section: sec?.kind ?? null,
      soloist: playing ? st.soloist : null,
      sunglasses: S.sunglasses,
      reduceMotion: S.reduceMotion,
      show: S.phase,
      hype: S.hype,
      lowQuality: S.lowQuality,
      palette: S.lightOverride?.palette
        ?? sec?.lights.palette
        ?? (S.phase === 'upload' ? ['#ff4fd8', '#00e0c6', '#ffe066'] : S.phase === 'afterparty' ? ['#ffb347', '#ff6f91', '#ffe29a'] : S.phase === 'openingAct' ? ['#ffd8a8', '#ffb3c7'] : IDLE_PALETTE),
    };
  }

  private frame(now: number) {
    songPlayer.sync();
    trackPlayer.sync();
    const f = this.buildFrame(now);
    this.frameCache = f;
    const S = useShow.getState();

    // show-phase transitions that the scene owns (roadie walk-on/off)
    if (S.phase !== this.lastPhase) {
      if (S.phase === 'micCheck') this.roadie.enter();
      if (S.phase === 'walkOn' || S.phase === 'upload') this.roadie.exit();
      if (S.phase === 'landing') Object.values(this.band).forEach((c) => c.setOnStage(false));
      if (S.phase === 'upload') Object.values(this.band).forEach((c) => c.snapHome());
      if (S.phase === 'fakeEnding') this.crowd.balladMode(true); // phone torches up for the encore chant
      this.lastPhase = S.phase;
    }

    // microphone mode
    if (micSinger.active) {
      micSinger.update();
      this.crowd.youSinging = micSinger.level;
      this.crowd.youNote = micSinger.note;
      if (micSinger.note !== this.lastMicNote) {
        this.lastMicNote = micSinger.note;
        S.set({ micNote: micSinger.note });
      }
    } else {
      this.crowd.youSinging = 0;
      this.crowd.youNote = null;
    }
    this.crowd.youLighter = S.lighters > 0;
    this.crowd.youShirt = S.outfit.shirt;
    this.crowd.youHat = S.outfit.hat;
    this.crowd.youExtra = S.outfit.extra;
    this.crowd.raining = this.rain.amount > 0.3;
    this.crowd.vipOnly = S.phase === 'afterparty';
    const ballad = !!conductor.state.song?.ballad && f.playing;
    this.sky.cloud = approach(this.sky.cloud, S.raining || ballad ? 1 : 0, 0.5, f.dt);
    this.fog.tint = ballad ? '#9b5cff' : S.raining ? '#8fa3c8' : null;
    this.rain.update(f, S.raining);
    this.mice.update(f);
    if (this.fogBurstT > 0) {
      this.fogBurstT -= f.dt;
      this.fog.density = 1;
    }
    if (this.crowd.diveState !== this.lastDive) {
      this.lastDive = this.crowd.diveState;
      if (this.lastDive === 'stage') {
        this.cat.say('Who let a capybara up here?! …ok, dance.', 3);
        this.fox.say('NEW BAND MEMBER', 2);
      }
      if (this.lastDive === 'surfing') this.cat.say('…and it\'s gone.', 2);
    }

    if (trackPlayer.active || party.followingTrack) this.cat.mouthAlong(conductor.state.vocal);

    // party: friends in the crowd
    party.tick(f.dt);
    const me = S.party.me;
    this.crowd.friends = S.party.status === 'live' ? S.party.members.filter((m) => m.id !== me).map((m) => ({ ...m, fx: party.friendFx.get(m.id) })) : [];
    this.crowd.youFx = me ? party.friendFx.get(me) : undefined;

    // update everyone
    for (const c of Object.values(this.band)) {
      c.setOnStage(S.onStage[c.id]);
      c.update(f, !isAudible(CHARACTER_TO_INSTRUMENT[c.id]));
    }
    const ov = S.lightOverride;
    const cue: LightCue | null = ov
      ? { palette: ov.palette, movement: ov.movement === 'strobe' && !S.strobe ? 'chase' : ov.movement, lasers: ov.lasers, fog: this.fog.density }
      : conductor.state.section?.section.lights ?? (S.phase === 'afterparty' ? { palette: f.palette, movement: 'still' } : null);
    const soloist = f.soloist ? this.band[f.soloist] : null;
    this.lights.update(f, cue, soloist && soloist.onStage ? { x: soloist.x, y: soloist.y } : null);
    this.sky.update(f);
    this.led.update(f);
    this.fog.update(f);
    this.particles.update(f);
    this.roadie.update(f);
    const armsUp = f.playing ? (f.section === 'chorus' || f.section === 'drop' || f.section === 'solo' ? 1 : f.hype > 0.6 ? 0.8 : 0) : S.cheering ? 1 : 0;
    this.crowd.update(f, Math.max(armsUp, S.cheering ? 1 : 0));
    this.concert.update(f);

    // camera
    let zoom = 1;
    let cx = W / 2;
    let cy = H / 2;
    if (!f.reduceMotion) {
      if (soloist && soloist.onStage) {
        zoom = 1.24;
        cx = soloist.x;
        cy = soloist.y - 120;
      } else if (f.playing && (f.section === 'chorus' || f.section === 'drop') && f.intensity > 0.8) {
        zoom = 0.97;
        cy = H / 2 + 10;
      }
      cx += Math.sin(f.t * 0.31) * 8;
      cy += Math.sin(f.t * 0.23) * 5;
    }
    // portrait: pan to whoever matters (soloist, you on stage, else the singer)
    const portrait = this.cssH > this.cssW;
    if (portrait && !(soloist && soloist.onStage)) cx = this.crowd.diveState === 'stage' ? 640 : this.cat.onStage ? this.cat.x : W / 2;
    // keep the camera inside the world (using how much of it is actually visible)
    const halfW = Math.min(W / 2, this.cssW / this.fit / 2) / zoom;
    const halfH = Math.min(H / 2, this.cssH / this.fit / 2) / zoom;
    cx = clamp(cx, halfW, W - halfW);
    cy = clamp(cy, halfH, H - halfH);
    if (zoom < 1 && !portrait) { cx = W / 2; cy = H / 2; }
    this.cam.zoom = approach(this.cam.zoom, zoom, 1.6, f.dt);
    this.cam.cx = approach(this.cam.cx, cx, 1.6, f.dt);
    this.cam.cy = approach(this.cam.cy, cy, 1.6, f.dt);
    this.cam.kick = Math.max(0, this.cam.kick - f.dt * 8);

    this.draw(f, cue);
  }

  private layer(p: number, f: Frame) {
    const g = this.g;
    const k = f.reduceMotion ? 0 : this.cam.kick * 0.006 * f.intensity;
    const z = (1 + (this.cam.zoom - 1) * p) * (1 + k * p);
    const cx = W / 2 + (this.cam.cx - W / 2) * p;
    const cy = H / 2 + (this.cam.cy - H / 2) * p;
    g.setTransform(this.dpr * this.fit, 0, 0, this.dpr * this.fit, this.dpr * this.offX, this.dpr * this.offY);
    g.translate(W / 2, H / 2);
    if (!f.reduceMotion) g.rotate(Math.sin(f.t * 0.37) * 0.004 * p);
    g.scale(z, z);
    g.translate(-cx, -cy);
  }

  private draw(f: Frame, cue: LightCue | null) {
    const g = this.g;
    const S = useShow.getState();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#05021a';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // sky (far parallax)
    this.layer(0.25, f);
    this.sky.drawBack(g, f, S.moonJoined, S.moonClicks);

    // stage
    this.layer(1, f);
    this.led.draw(g, f);
    this.concert.drawCrowdCam(g, f);
    this.set.drawBack(g, f);
    for (const c of this.drawOrder) c.draw(g, f);
    if (S.phase === 'openingAct') this.mice.draw(g, f);
    if (S.phase === 'afterparty') drawAfterparty(g, f);
    this.crowd.drawYouOnStage(g, f);
    this.roadie.draw(g);
    this.set.drawFront(g, f);
    this.rain.drawStage(g, f);
    this.goat.draw(g, f);
    this.lights.drawBeams(g, f, cue);
    this.fog.draw(g, f);
    this.particles.draw(g);

    // crowd (foreground)
    this.layer(0.5, f);
    this.sky.drawFireflies(g, f);
    if (S.phase !== 'landing') drawMerchStand(g, f, S.panel === 'merch' || S.raining);
    this.crowd.draw(g, f);
    this.concert.draw(g, f);
    this.rain.drawFront(g);

    // screen-space overlays
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cw = this.canvas.width / this.dpr;
    const ch = this.canvas.height / this.dpr;
    if (S.strobe) this.lights.drawStrobe(g, cw, ch);
    const vig = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${S.phase === 'landing' ? 0.85 : 0.55})`);
    g.fillStyle = vig;
    g.fillRect(0, 0, cw, ch);
    if (S.phase === 'landing' || S.phase === 'micCheck') {
      // house lights down
      g.fillStyle = `rgba(3,1,12,${S.phase === 'landing' ? 0.55 : 0.25})`;
      g.fillRect(0, 0, cw, ch);
    }
    if (this.promoCard) this.drawPromoCard(g, cw, ch, f);
  }

  /** Promo video title cards (drawn on the canvas so the recording includes them). */
  promoCard: { title: string; sub: string; at: number; dur: number; end?: boolean; top?: boolean } | null = null;

  private drawPromoCard(g: G, cw: number, ch: number, f: Frame) {
    const c = this.promoCard!;
    const t = (performance.now() - c.at) / 1000;
    if (t > c.dur) return;
    const a = Math.min(1, t * 3, (c.dur - t) * 3);
    const s = Math.min(cw / 1280, ch / 720);
    g.save();
    g.globalAlpha = a;
    if (c.end) {
      g.fillStyle = 'rgba(5,2,20,0.72)';
      g.fillRect(0, 0, cw, ch);
    } else if (c.top) {
      const grad = g.createLinearGradient(0, 0, 0, ch * 0.36);
      grad.addColorStop(0, 'rgba(5,2,20,0.85)');
      grad.addColorStop(1, 'rgba(5,2,20,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, cw, ch * 0.36);
    } else {
      const grad = g.createLinearGradient(0, ch * 0.58, 0, ch);
      grad.addColorStop(0, 'rgba(5,2,20,0)');
      grad.addColorStop(1, 'rgba(5,2,20,0.85)');
      g.fillStyle = grad;
      g.fillRect(0, ch * 0.58, cw, ch * 0.42);
    }
    const y = c.end ? ch * 0.46 : c.top ? ch * 0.12 : ch * 0.84;
    const slide = (1 - Math.min(1, t * 2.5)) * 30 * s;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${Math.round((c.end ? 78 : 54) * s)}px "Arial Black", "Trebuchet MS", system-ui, sans-serif`;
    const jitter = f.reduceMotion ? 0 : Math.sin(f.t * 18) * 1.2 * s;
    g.fillStyle = '#ff4fd8';
    g.fillText(c.title, cw / 2 + 4 * s, y + 4 * s + slide);
    g.fillStyle = '#00e0c6';
    g.fillText(c.title, cw / 2 - 3 * s + jitter, y - 2 * s + slide);
    g.fillStyle = '#ffffff';
    g.fillText(c.title, cw / 2, y + slide);
    g.font = `700 ${Math.round((c.end ? 30 : 24) * s)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    g.fillStyle = c.end ? '#ffe066' : '#f4ecff';
    g.fillText(c.sub, cw / 2, y + (c.end ? 76 : 50) * s + slide * 0.6);
    g.restore();
  }
}
