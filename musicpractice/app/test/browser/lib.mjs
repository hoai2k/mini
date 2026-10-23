// Shared helpers for Music Practice's browser checks: find Playwright (in
// node_modules, the cloud containers' /opt/node-tools, or installed
// globally), serve app/ as it is (there is no build step), and open pages in
// a chosen theme and mode with a fake microphone.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { THEMES as APP_THEMES } from '../../src/settings.js';

export const APP = fileURLToPath(new URL('../../', import.meta.url));
// The themes' fonts as the apps bundle them (mobile/fonts/), served in place
// of Google Fonts: the same fonts every run, with no network.
const FONTS = fileURLToPath(new URL('../../../mobile/fonts/', import.meta.url));

async function playwright() {
  for (const name of ['playwright-core', 'playwright']) {
    try { return await import(name); } catch { /* next */ }
  }
  const opt = '/opt/node-tools/node_modules/playwright-core/index.mjs';
  if (existsSync(opt)) return import(opt);
  const root = execSync('npm root -g').toString().trim();
  return createRequire(join(root, 'noop.js'))(join(root, 'playwright'));
}

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
};

function serve(dir) {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const root = path.startsWith('/__fonts/') ? FONTS : dir;
    if (root === FONTS) path = path.slice('/__fonts'.length);
    const file = normalize(join(root, path));
    if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
    try {
      if ((await stat(file)).isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/index.html`, close: () => server.close() })));
}

/** One browser and one server for a whole run; `micFile`, a WAV for the fake microphone to play (looped). */
export async function start({ micFile } = {}) {
  const { chromium } = await playwright();
  const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      ...(micFile ? [`--use-file-for-fake-audio-capture=${micFile}`] : [])],
  });
  const site = await serve(APP);
  const fontCss = readdirSync(FONTS).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(FONTS, f), 'utf8')).join('\n')
    .replaceAll('url(files/', `url(${new URL('/__fonts/files/', site.url)}`);
  return {
    base: site.url,
    /** A page in `theme` and `mode` ('light', 'dark' or 'default'), as a phone (touch) or a desktop. */
    async page({ theme = 'classic', mode = 'default', width = 390, height = 844, touch = true, timer } = {}) {
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, permissions: ['microphone'] });
      await ctx.addInitScript(([t, m, routine]) => {
        if (sessionStorage.getItem('seeded')) return; // seeded once: a reload keeps what the page saved
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('musicpractice.settings.v1', JSON.stringify({ theme: t, themeChosen: true, ...(m === 'default' ? {} : { appearance: m, appearanceChosen: true }) }));
        if (routine) localStorage.setItem('musicpractice.routine.v1', JSON.stringify(routine));
      }, [theme, mode, timer || null]);
      // Google Fonts' stylesheet, answered with every theme's bundled faces.
      await ctx.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.fulfill({ contentType: 'text/css', body: fontCss }));
      const p = await ctx.newPage();
      p.errors = [];
      p.on('pageerror', (e) => p.errors.push(e.message));
      p.close = () => ctx.close();
      return p;
    },
    async stop() { site.close(); await browser.close(); },
  };
}

/**
 * A routine as the app saves it, built with the app's own model: `items` are
 * { kind (a suggestion's id, or null for Custom), ...fields to set }, and
 * `extra` the routine's own settings (rest, voiceOn, ...).
 */
export async function routine(p, base, items, extra = {}) {
  await p.goto(base);
  return p.evaluate(async ([items, extra]) => {
    const m = await import('./src/timer.js');
    const t = m.loadTimer({});
    t.items = items.map(({ kind = null, ...fields }) => Object.assign(m.newItem(kind, {}, {}), fields));
    return JSON.parse(JSON.stringify(Object.assign(t, extra)));
  }, [items, extra]);
}

export const THEMES = APP_THEMES.map((t) => t.id);

/** Collects pass/fail lines; `done()` prints them and sets the exit code. */
export function checks(name) {
  const failed = [];
  let passed = 0;
  return {
    ok(cond, what) { if (cond) passed++; else failed.push(what); },
    async done() {
      console.log(`${name}: ${passed} passed, ${failed.length} failed`);
      for (const f of failed) console.log(`  FAIL ${f}`);
      return failed.length;
    },
  };
}

/**
 * A WAV of a player at the microphone, looped by Chromium: silence, a
 * sustained note (`hz`, with a cello's first few harmonics and a little
 * vibrato) for `noteSec`, then silence long enough to end a take.
 */
export function playerWav(hz = 220, { leadSec = 1.5, noteSec = 3, tailSec = 6, rate = 48000 } = {}) {
  const n = Math.round((leadSec + noteSec + tailSec) * rate);
  const data = Buffer.alloc(44 + n * 2);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate - leadSec;
    let v = 0;
    if (t >= 0 && t < noteSec) {
      phase += (2 * Math.PI * hz * (1 + 0.004 * Math.sin(2 * Math.PI * 5 * t))) / rate;
      const env = Math.min(1, t / 0.08) * Math.min(1, (noteSec - t) / 0.15);
      v = 0.35 * env * (Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.33 * Math.sin(3 * phase) + 0.2 * Math.sin(4 * phase)) / 2;
    }
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2);
  }
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 2, 40);
  return data;
}
