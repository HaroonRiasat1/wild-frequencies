// Records the promo edit: opens the app's ?promo mode in headless Chrome,
// optionally hands it a song to edit to, receives the canvas+audio recording,
// and encodes MP4 with ffmpeg.
//
//   npm run dev                                   (in another terminal)
//   npm run promo                                 → band music, 16:9
//   npm run promo -- --track song.mp3 --start 48.4 [--vertical] [--name europapa]
//
// --start is where in the song to begin (just before a bar line). The edit is
// 26 bars long and cuts on the song's own bar lines.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const flag = (k) => args.includes(`--${k}`);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'promo');
const BASE = process.env.PROMO_URL ?? 'http://localhost:5178/';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const track = opt('track');
const start = opt('start', '0');
const vertical = flag('vertical');
const name = `wild-frequencies-promo${opt('name') ? `-${opt('name')}` : ''}${vertical ? '-vertical' : ''}`;

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: vertical ? { width: 540, height: 960, deviceScaleFactor: 2 } : { width: 1280, height: 720, deviceScaleFactor: 1.5 },
});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.log('[page error]', m.text()));

const parts = [];
let resolveDone;
const done = new Promise((r) => (resolveDone = r));
await page.exposeFunction('promoChunk', (b64, last) => {
  parts.push(Buffer.from(b64, 'base64'));
  process.stdout.write('.');
  if (last) resolveDone();
});
await page.exposeFunction('promoTrackData', () => (track ? { b64: readFileSync(track).toString('base64'), name: basename(track) } : null));

const url = `${BASE}?promo&start=${encodeURIComponent(start)}`;
console.log(`opening ${url}${track ? `  (music: ${basename(track)} from ${start}s)` : ''}`);
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForSelector('button.doors');
await page.click('button.doors');
console.log('recording…');
// progress + a safety limit, so a stuck page can't hang forever
const ticker = setInterval(async () => {
  const st = await page.evaluate(() => ({ t: Math.round(performance.now() / 1000), card: document.title })).catch(() => null);
  if (st) process.stdout.write(` ${st.t}s`);
}, 10000);
const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('promo did not finish within 4 minutes')), 240000));
try {
  await Promise.race([done, timeout]);
} finally {
  clearInterval(ticker);
}
await browser.close();

const webm = resolve(OUT, `${name}.webm`);
const mp4 = resolve(OUT, `${name}.mp4`);
writeFileSync(webm, Buffer.concat(parts));
const size = vertical ? '1080:1920' : '1920:1080';
// constant 60 fps H.264 + AAC, web/phone friendly
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm,
  '-vf', `fps=60,scale=${size}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '16M', '-bufsize', '32M',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
console.log(`\nsaved ${mp4}`);
