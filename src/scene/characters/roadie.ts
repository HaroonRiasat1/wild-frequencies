// Trash Panda Pete — roadie raccoon. Does the mic check, then scurries off
// with something he found in the green room.

import { bubble, circ, ell, eye, limb, poly, rr, type G } from '../draw';
import type { Frame } from './base';

export class Roadie {
  x = -120;
  private target = -120;
  private t = 0;
  private bubbleText: string | null = null;
  private bubbleT = 0;
  visible = false;

  enter() {
    this.visible = true;
    this.target = 800;
  }

  exit() {
    this.target = 1800;
  }

  say(text: string, seconds = 2) {
    this.bubbleText = text;
    this.bubbleT = seconds;
  }

  update(f: Frame) {
    this.t += f.dt;
    this.bubbleT = Math.max(0, this.bubbleT - f.dt);
    const d = this.target - this.x;
    this.x += Math.sign(d) * Math.min(Math.abs(d), (this.target > 900 ? 700 : 380) * f.dt);
    if (this.x >= 1790) this.visible = false;
  }

  draw(g: G) {
    if (!this.visible) return;
    const running = Math.abs(this.target - this.x) > 2;
    const hop = running ? Math.abs(Math.sin(this.t * 14)) * 8 : 0;
    const y = 652 - hop;
    g.save();
    g.translate(this.x, y);
    // striped tail
    for (let i = 0; i < 5; i++) circ(g, -26 - i * 9, -30 - i * 5, 10 - i, i % 2 ? '#2a2630' : '#77707f');
    limb(g, -10, -30, -12 + (running ? Math.sin(this.t * 14) * 8 : 0), -2, 9, '#5a5463');
    limb(g, 10, -30, 12 - (running ? Math.sin(this.t * 14) * 8 : 0), -2, 9, '#5a5463');
    ell(g, 0, -50, 26, 32, '#6a6474');
    rr(g, -20, -70, 40, 34, 6, '#222');
    g.fillStyle = '#ffe066';
    g.font = 'bold 9px system-ui';
    g.textAlign = 'center';
    g.fillText('CREW', 0, -50);
    // head + mask + backwards cap
    poly(g, [-20, -94, -14, -116, -4, -100], '#6a6474');
    poly(g, [20, -94, 14, -116, 4, -100], '#6a6474');
    ell(g, 0, -92, 24, 21, '#6a6474');
    ell(g, 0, -94, 20, 7, '#1d1b22');
    eye(g, -8, -94, 4, 1, running ? 1 : 0, 0, '#111');
    eye(g, 8, -94, 4, 1, running ? 1 : 0, 0, '#111');
    ell(g, 0, -80, 8, 6, '#cfc8d6');
    circ(g, 0, -83, 2.5, '#111');
    ell(g, 0, -110, 20, 8, '#ff2e63');
    rr(g, -24, -110, 14, 5, 2, '#ff2e63');
    // mic (or, when leaving, a stolen slice of pizza)
    if (running && this.target > 900) poly(g, [18, -60, 40, -66, 30, -44], '#ffc94a');
    else {
      limb(g, 18, -60, 22, -84, 6, '#5a5463');
      ell(g, 22, -90, 5, 7, '#333');
    }
    g.restore();
    if (this.bubbleT > 0 && this.bubbleText) bubble(g, this.x, 530, this.bubbleText, Math.min(1, this.bubbleT * 3));
  }
}
