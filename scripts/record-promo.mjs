// Records the promo video: opens the app's ?promo mode in Chrome, lets it play
// its scripted highlight reel, receives the canvas+audio recording, and turns
// it into an MP4 with ffmpeg.
//
//   npm run dev            (in another terminal)
//   npm run promo          → promo/wild-frequencies-promo.mp4
//
// Env: PROMO_URL (default http://localhost:5178/?promo), CHROME (path to Chrome).

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'promo');
const URL = process.env.PROMO_URL ?? 'http://localhost:5178/?promo';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1.5 },
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

console.log(`opening ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('button.doors');
await page.click('button.doors');
console.log('recording (≈50 s)…');
await done;
await browser.close();

const webm = resolve(OUT, 'wild-frequencies-promo.webm');
const mp4 = resolve(OUT, 'wild-frequencies-promo.mp4');
writeFileSync(webm, Buffer.concat(parts));
console.log(`\nsaved ${webm}`);
// constant 60 fps H.264 + AAC, web-friendly (plays on phones, Twitter, Instagram…)
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'fps=60,scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '12M', '-bufsize', '24M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
console.log(`saved ${mp4}`);
