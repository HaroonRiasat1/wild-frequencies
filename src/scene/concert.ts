// Real-gig moments: beach balls bouncing over the crowd, Greg's T-shirt cannon,
// picks and drumsticks tossed into the pit, a clap-along game, the crowd cam on
// the LED wall, the Mexican wave, and the night Rusty broke a string.

import * as Tone from 'tone';
import { engine } from '../audio/engine';
import { conductor } from '../conductor/conductor';
import { isAudible, useShow } from '../state/store';
import type { Frame } from './characters/base';
import type { Fox } from './characters/fox';
import type { Goat } from './characters/goat';
import type { Roadie } from './characters/roadie';
import type { Crowd, Fan } from './crowd';
import { NEON } from './crowd';
import { circ, clamp, ell, limb, poly, rr, TAU, type G } from './draw';
import { LED_RECT } from './ledWall';

interface Ball { x: number; y: number; vx: number; vy: number; r: number; rot: number; life: number; cols: string[] }
interface Toss { kind: 'shirt' | 'pick' | 'stick'; x0: number; y0: number; target: Fan | 'you'; t: number; dur: number; col: string; who: string }
interface Popup { text: string; x: number; y: number; t: number; col: string; size: number }

const BALL_COLORS = [['#ff2e63', '#fff', '#2bf1ff'], ['#ffe600', '#fff', '#ff2bd6'], ['#39ff14', '#fff', '#ff7a1a']];
const SHIRTS = ['#ff2e63', '#7b2cff', '#00b4ff', '#ff7a1a', '#16a34a'];

export class Concert {
  private balls: Ball[] = [];
  private tosses: Toss[] = [];
  private popups: Popup[] = [];
  private cam: { who: Fan | 'you'; t: number; label: string } | null = null;
  private cannonCd = 0;
  private streak = 0;
  private clapBeats = 0;
  private promptedSong: string | null = null;
  private waveSong: string | null = null;
  private stringBroken = false;
  private songsSeen = 0;
  /** Set by the renderer each frame. */
  frame!: Frame;
  private unsubs: (() => void)[] = [];

  constructor(
    private crowd: Crowd,
    private fox: Fox,
    private goat: Goat,
    private roadie: Roadie,
  ) {
    this.unsubs.push(
      conductor.on('section', ({ section, song }) => this.onSection(section.section.kind, section.section.intensity, song.id, !!song.ballad)),
      conductor.on('beat', ({ beat }) => this.onBeat(beat)),
      conductor.on('hype', ({ source }) => {
        if (source === 'song' && Math.random() < 0.5) this.shirtCannon(false);
      }),
      conductor.on('songEnd', () => this.onSongEnd()),
    );
  }

  dispose() {
    this.unsubs.forEach((u) => u());
  }

  // ------------------------------------------------------------------ triggers

  private onSection(kind: string, intensity: number, songId: string, ballad: boolean) {
    const big = kind === 'chorus' || kind === 'drop' || kind === 'solo';
    if (!ballad) this.crowd.glowMode(big || kind === 'verse' && intensity > 0.6);
    if (kind === 'intro' || kind === 'outro') this.crowd.glowMode(false);
    if (big) this.crowd.flashes(useShow.getState().lowQuality ? 3 : 7);
    if (big && this.balls.length < (useShow.getState().lowQuality ? 1 : 2) && Math.random() < 0.6) this.beachBall();
    if (big && this.promptedSong !== songId && !this.clapBeats) {
      this.promptedSong = songId;
      this.pop('👏 CLAP ALONG! (press H on the beat)', 800, 640, '#ffe066', 30);
    }
    if (kind === 'chorus' && intensity >= 0.85 && this.waveSong !== songId && Math.random() < 0.6) {
      this.waveSong = songId;
      this.wave();
    }
    if (big && !this.cam && Math.random() < 0.3) this.crowdCam();
    // the one time Rusty breaks a string (second song onwards, in a verse, our own songs only)
    if (kind === 'verse' && !this.stringBroken && this.songsSeen >= 1 && songId !== 'headliner' && this.fox.onStage && Math.random() < 0.55) {
      this.breakString();
    }
  }

  private onBeat(beat: number) {
    const f = this.frame;
    if (f?.playing && (f.section === 'chorus' || f.section === 'drop') && Math.random() < 0.25) this.crowd.flashes(1);
    if (this.clapBeats <= 0) return;
    this.clapBeats--;
    // beats 2 & 4: the crowd claps now (visual) and we schedule the next clap's sound
    if (((beat % 2) + 2) % 2 === 1) this.crowd.clap();
    if ((((beat + 1) % 2) + 2) % 2 === 1 && this.clapBeats > 0) {
      const spb = 60 / conductor.state.bpm;
      engine.crowdClap(Tone.immediate() + spb);
    }
    if (this.clapBeats === 0) this.pop('the crowd is tired now. good work.', 800, 640, '#b9aee0', 20);
  }

  private onSongEnd() {
    this.songsSeen++;
    this.streak = 0;
    this.clapBeats = 0;
    this.crowd.glowMode(false);
    // souvenirs: Rusty flicks a pick, Octavia launches a drumstick
    if (this.fox.onStage) this.toss('pick', 560, 560, 'Rusty');
    this.toss('stick', 800, 470, 'Octavia');
    if (!this.cam) this.crowdCam(true);
  }

  // ------------------------------------------------------------------ public actions (buttons/keys)

  /** H: clap. Judged against the beat; 8 in a row and the whole crowd joins in. */
  clap() {
    engine.userClap();
    this.crowd.youWave = Math.max(this.crowd.youWave, 0.3);
    const f = this.frame;
    if (!f?.playing) {
      this.pop('👏 (to what?)', 800, 700, '#b9aee0', 18);
      return;
    }
    const beat = conductor.beat();
    const frac = ((beat % 1) + 1) % 1;
    const err = Math.min(frac, 1 - frac) * (60 / conductor.state.bpm);
    if (err < 0.06) {
      this.streak++;
      this.pop(this.streak >= 4 ? `PERFECT ×${this.streak}` : 'PERFECT!', 800, 700, '#39ff14', 24);
    } else if (err < 0.12) {
      this.streak++;
      this.pop('good', 800, 700, '#2bf1ff', 20);
    } else {
      this.streak = 0;
      this.pop('off-beat (Gary approves)', 800, 700, '#ff7a9a', 18);
    }
    if (this.streak === 8 && this.clapBeats <= 0) {
      this.clapBeats = 32;
      conductor.emit('ledText', { text: '👏 THE WHOLE CROWD IS CLAPPING 👏', seconds: 3 });
      this.bumpHype(0.15);
      this.streak = 0;
    }
  }

  /** W: start a Mexican wave. */
  wave() {
    if (this.crowd.waving) return;
    this.crowd.wave();
    engine.cheerStart();
    Tone.getContext().setTimeout(() => engine.cheerStop(), 1.6);
    this.pop('🌊 THE WAVE! 🌊', 800, 620, '#2bf1ff', 30);
    this.bumpHype(0.05);
  }

  /** J: launch a beach ball into the crowd. */
  beachBall() {
    if (this.balls.length >= 4) return;
    const fromLeft = Math.random() < 0.5;
    this.balls.push({
      x: fromLeft ? 120 : 1480, y: 620, vx: (fromLeft ? 1 : -1) * (160 + Math.random() * 140), vy: -700,
      r: 30, rot: 0, life: 40, cols: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
    });
  }

  /** G: Greg fires the T-shirt cannon. From the button you have a decent chance of catching one. */
  shirtCannon(fromButton = true) {
    if (this.cannonCd > 0 || !this.goat.onStage) return;
    this.cannonCd = 1.2;
    engine.cannon();
    this.goat.say('MEEEH! (free shirt)', 1.4);
    const target: Fan | 'you' = (fromButton && Math.random() < 0.4) || (fromButton && !this.crowd.youShirt && Math.random() < 0.5)
      ? 'you'
      : this.crowd.fans[Math.floor(Math.random() * this.crowd.fans.length)];
    this.tosses.push({ kind: 'shirt', x0: 1490, y0: 420, target, t: 0, dur: 1.3, col: SHIRTS[Math.floor(Math.random() * SHIRTS.length)], who: 'Greg' });
  }

  /** Click on a beach ball? Bonk it. Returns true if something was hit. */
  click(cx: number, cy: number): boolean {
    for (const b of this.balls) {
      if (Math.hypot(b.x - cx, b.y - cy) < b.r + 16) {
        b.vy = -950;
        b.vx = (b.x - cx) * 9 + (Math.random() - 0.5) * 200;
        this.pop('BONK!', b.x, b.y - 40, '#ffe066', 26);
        this.bumpHype(0.03);
        return true;
      }
    }
    return false;
  }

  private breakString() {
    this.stringBroken = true;
    engine.stringSnap();
    this.fox.poke('MY E STRING!! 😱');
    Tone.getContext().setTimeout(() => engine.setAudible('guitar', false), 0.5);
    Tone.getContext().setTimeout(() => this.roadie.errand(this.fox.homeX), 0.7);
    Tone.getContext().setTimeout(() => {
      engine.setAudible('guitar', isAudible('guitar'));
      this.fox.say("WE'RE BACK, BABY", 2);
      this.fox.celebrate(1.5);
    }, 4.2);
  }

  private crowdCam(betweenSongs = false) {
    const you = Math.random() < 0.35;
    const who: Fan | 'you' = you ? 'you' : this.crowd.fans[Math.floor(Math.random() * this.crowd.fans.length)];
    const labels = you ? ['THAT\'S YOU! WAVE!', 'CAPYBARA CAM'] : ['CROWD CAM 📷', 'WAVE AT THE CAMERA!', betweenSongs ? 'FAN OF THE NIGHT' : 'LOOK AT THIS ONE GO'];
    this.cam = { who, t: 5, label: labels[Math.floor(Math.random() * labels.length)] };
    if (you) this.crowd.youWave = 1;
    else (who as Fan).jump = 1;
  }

  private toss(kind: Toss['kind'], x0: number, y0: number, who: string) {
    const front = this.crowd.fans.filter((f) => f.y > 820);
    const pool = front.length ? front : this.crowd.fans;
    const target = Math.random() < 0.15 ? 'you' : pool[Math.floor(Math.random() * pool.length)];
    this.tosses.push({ kind, x0, y0, target, t: 0, dur: 1.1, col: kind === 'pick' ? '#ff3fa4' : '#f3d9a4', who });
  }

  private bumpHype(d: number) {
    const s = useShow.getState();
    s.set({ hype: Math.min(1, s.hype + d) });
  }

  private pop(text: string, x: number, y: number, col: string, size: number) {
    this.popups.push({ text, x, y, t: 1.6, col, size });
    if (this.popups.length > 8) this.popups.shift();
  }

  // ------------------------------------------------------------------ update + draw (crowd layer)

  update(f: Frame) {
    this.frame = f;
    const dt = f.dt;
    this.cannonCd = Math.max(0, this.cannonCd - dt);
    for (const b of this.balls) {
      b.life -= dt;
      b.vy += 620 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vx * dt * 0.02;
      b.vx *= 0.995;
      const hands = this.crowd.handsY(b.x);
      if (b.life > 0 && b.vy > 0 && b.y + b.r > hands) {
        b.y = hands - b.r;
        b.vy = -(430 + Math.random() * 280);
        b.vx += (Math.random() - 0.5) * 220;
        const fan = this.crowd.nearestFan(b.x, hands + 40, 200);
        if (fan) fan.jump = 0.5;
      }
      if (b.x < 40 || b.x > 1560) { b.vx *= -1; b.x = clamp(b.x, 40, 1560); }
      if (b.y < 140) { b.y = 140; b.vy = Math.abs(b.vy) * 0.5; }
    }
    this.balls = this.balls.filter((b) => b.y < 1100);

    for (const t of this.tosses) t.t += dt;
    for (const t of this.tosses.filter((x) => x.t >= x.dur)) this.land(t);
    this.tosses = this.tosses.filter((t) => t.t < t.dur);

    for (const p of this.popups) {
      p.t -= dt;
      p.y -= dt * 30;
    }
    this.popups = this.popups.filter((p) => p.t > 0);
    if (this.cam) {
      this.cam.t -= dt;
      if (this.cam.t <= 0) this.cam = null;
    }
  }

  private targetPos(t: Toss): [number, number] {
    if (t.target === 'you') return [800, 760];
    return [t.target.x, t.target.y - 110 * t.target.s];
  }

  private land(t: Toss) {
    const [x, y] = this.targetPos(t);
    const item = t.kind === 'shirt' ? 'a T-shirt' : t.kind === 'pick' ? `${t.who}'s pick` : `${t.who}'s drumstick`;
    if (t.target === 'you') {
      if (t.kind === 'shirt') this.crowd.youShirt = t.col;
      this.crowd.youWave = 1;
      this.pop(`YOU CAUGHT ${item.toUpperCase()}!`, 800, 680, '#ffe066', 28);
      this.bumpHype(0.08);
    } else {
      if (t.kind === 'shirt') t.target.shirt = t.col;
      t.target.jump = 1;
      t.target.arms = 1;
      this.pop(`caught ${item}!`, x, y - 30, '#ffffff', 18);
    }
  }

  draw(g: G, f: Frame) {
    // flying souvenirs
    for (const t of this.tosses) {
      const [x1, y1] = this.targetPos(t);
      const u = t.t / t.dur;
      const x = t.x0 + (x1 - t.x0) * u;
      const y = t.y0 + (y1 - t.y0) * u - Math.sin(u * Math.PI) * 260;
      g.save();
      g.translate(x, y);
      g.rotate(t.t * (t.kind === 'shirt' ? 6 : 14));
      if (t.kind === 'shirt') {
        poly(g, [-16, -12, -6, -16, 6, -16, 16, -12, 22, -2, 12, 2, 12, 16, -12, 16, -12, 2, -22, -2], t.col);
      } else if (t.kind === 'pick') {
        poly(g, [-7, -6, 7, -6, 0, 9], t.col);
      } else {
        limb(g, -16, 0, 16, 0, 4, t.col);
      }
      g.restore();
    }
    // beach balls
    for (const b of this.balls) {
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.rot);
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, b.r, (i / 6) * TAU, ((i + 1) / 6) * TAU);
        g.closePath();
        g.fillStyle = b.cols[i % 3];
        g.fill();
      }
      circ(g, 0, 0, 6, '#fff');
      ell(g, -b.r * 0.35, -b.r * 0.4, b.r * 0.25, b.r * 0.14, 'rgba(255,255,255,0.6)', -0.6);
      g.restore();
    }
    // popups
    for (const p of this.popups) {
      g.save();
      g.globalAlpha = clamp(p.t * 1.5);
      g.font = `900 ${p.size}px "Arial Black", "Trebuchet MS", system-ui`;
      g.textAlign = 'center';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(10,4,30,0.85)';
      g.strokeText(p.text, p.x, p.y);
      g.fillStyle = p.col;
      g.fillText(p.text, p.x, p.y);
      g.restore();
    }
    void f;
  }

  /** The crowd cam takes over the LED wall (drawn in the stage layer). */
  drawCrowdCam(g: G, f: Frame) {
    if (!this.cam) return;
    const { x, y, w, h } = LED_RECT;
    const a = clamp(this.cam.t * 2) * clamp((5 - this.cam.t) * 3);
    g.save();
    g.globalAlpha = a;
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    const bg = g.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#1a0c3d');
    bg.addColorStop(1, '#3b1450');
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    // a couple of blurry neighbours, then the star of the show
    // framed off-centre so Octavia (in front of the wall) doesn't photobomb it
    this.crowd.portrait(g, f, this.cam.who, x + w * 0.24, y + h + 10, this.cam.who === 'you' ? 1.45 : 1.6);
    // camera chrome
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 4;
    const c = 26;
    for (const [cx, cy, sx, sy] of [[x + 16, y + 16, 1, 1], [x + w - 16, y + 16, -1, 1], [x + 16, y + h - 16, 1, -1], [x + w - 16, y + h - 16, -1, -1]]) {
      g.beginPath();
      g.moveTo(cx, cy + sy * c);
      g.lineTo(cx, cy);
      g.lineTo(cx + sx * c, cy);
      g.stroke();
    }
    if (Math.sin(f.t * 6) > 0) circ(g, x + w - 96, y + 44, 8, '#ff2e4d');
    g.fillStyle = '#fff';
    g.font = '900 18px system-ui';
    g.textAlign = 'left';
    g.fillText('REC', x + w - 82, y + 50);
    rr(g, x + w * 0.24 - 160, y + 18, 320, 44, 8, 'rgba(0,0,0,0.55)');
    g.fillStyle = NEON[Math.floor(f.t * 3) % NEON.length];
    g.font = '900 22px "Arial Black", system-ui';
    g.textAlign = 'center';
    g.fillText(this.cam.label, x + w * 0.24, y + 50);
    g.restore();
  }
}
