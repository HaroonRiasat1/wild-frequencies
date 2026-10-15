// Little Canvas2D drawing helpers shared by every character and prop.

export type G = CanvasRenderingContext2D;

export const TAU = Math.PI * 2;

export function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string, rot = 0) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  g.fillStyle = fill;
  g.fill();
}

export function circ(g: G, x: number, y: number, r: number, fill: string) {
  ell(g, x, y, r, r, fill);
}

export function limb(g: G, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.strokeStyle = color;
  g.stroke();
}

/** Two-segment limb with an elbow; returns the hand position. */
export function arm(
  g: G, x: number, y: number, a1: number, l1: number, a2: number, l2: number, w: number, color: string,
): [number, number] {
  const ex = x + Math.cos(a1) * l1;
  const ey = y + Math.sin(a1) * l1;
  const hx = ex + Math.cos(a1 + a2) * l2;
  const hy = ey + Math.sin(a1 + a2) * l2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(ex, ey);
  g.lineTo(hx, hy);
  g.lineWidth = w;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = color;
  g.stroke();
  return [hx, hy];
}

export function rr(g: G, x: number, y: number, w: number, h: number, r: number, fill: string) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}

export function poly(g: G, pts: number[], fill: string) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/** Cartoon eye. `open` 0 = closed line, 1 = wide. */
export function eye(g: G, x: number, y: number, r: number, open: number, lookX = 0, lookY = 0, iris = '#222') {
  if (open < 0.15) {
    g.beginPath();
    g.moveTo(x - r, y);
    g.quadraticCurveTo(x, y + r * 0.6, x + r, y);
    g.lineWidth = Math.max(1.5, r * 0.3);
    g.strokeStyle = '#1a1020';
    g.lineCap = 'round';
    g.stroke();
    return;
  }
  ell(g, x, y, r, r * open, '#fff');
  ell(g, x + lookX * r * 0.35, y + lookY * r * 0.3, r * 0.55, r * 0.55 * Math.min(1, open * 1.2), iris);
  circ(g, x + lookX * r * 0.35 - r * 0.18, y - r * 0.2, r * 0.18, '#fff');
}

export function sunglasses(g: G, x: number, y: number, w: number, color = '#111', rim = '#ff4fd8') {
  const r = w * 0.24;
  g.lineWidth = Math.max(1.5, w * 0.05);
  g.strokeStyle = rim;
  for (const dx of [-w * 0.26, w * 0.26]) {
    g.beginPath();
    g.ellipse(x + dx, y, r, r * 0.8, 0, 0, TAU);
    g.fillStyle = color;
    g.fill();
    g.stroke();
    // shine
    g.beginPath();
    g.moveTo(x + dx - r * 0.5, y - r * 0.2);
    g.lineTo(x + dx - r * 0.1, y - r * 0.55);
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.stroke();
    g.strokeStyle = rim;
  }
  limb(g, x - w * 0.04, y - 1, x + w * 0.04, y - 1, Math.max(1.5, w * 0.05), rim);
}

export function bubble(g: G, x: number, y: number, text: string, alpha: number) {
  g.save();
  g.globalAlpha = alpha;
  g.font = 'bold 17px "Trebuchet MS", "Comic Sans MS", system-ui, sans-serif';
  const lines = wrap(g, text, 220);
  const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 24;
  const h = lines.length * 21 + 14;
  const bx = x - w / 2;
  const by = y - h - 16;
  g.fillStyle = 'rgba(255,255,255,0.96)';
  g.strokeStyle = '#1a1030';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(bx, by, w, h, 14);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(x - 9, by + h - 1);
  g.lineTo(x, by + h + 13);
  g.lineTo(x + 9, by + h - 1);
  g.fill();
  g.stroke();
  g.fillStyle = '#1a1030';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, x, by + 8 + i * 21));
  g.restore();
}

function wrap(g: G, text: string, max: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (g.measureText(t).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** Smoothly approach a target independent of frame rate. */
export const approach = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
/** Sharp beat pulse: 1 at the beat, decaying to 0. */
export const pulse = (beatPhase: number, sharp = 3) => Math.pow(1 - beatPhase, sharp);

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
