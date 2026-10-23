// Shared helpers for Music Practice's browser checks: find Playwright (in
// node_modules, the cloud containers' /opt/node-tools, or installed
// globally), serve app/ as it is (there is no build step), and open pages in
// a chosen theme and mode with a fake microphone.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { THEMES as APP_THEMES } from '../../src/settings.js';

export const APP = fileURLToPath(new URL('../../', import.meta.url));

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
    const file = normalize(join(dir, path));
    if (!file.startsWith(normalize(dir))) { res.writeHead(403).end(); return; }
    try {
      if ((await stat(file)).isDirectory()) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(file));
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/index.html`, close: () => server.close() })));
}

/** One browser and one server for a whole run. */
export async function start() {
  const { chromium } = await playwright();
  const executablePath = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const site = await serve(APP);
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
