// Smoke check for the Micro Zoom shell: serves micro/ locally (the game at
// /game/, the worlds at /prototypes/), opens the game in headless Chromium
// (software WebGL) and walks title → menu → intro → play (springtail) →
// controls card → pause → settings → resume → a forward landmark (the zoom
// into the mite) → a back landmark (back to the springtail). Fails on any
// console or page error; saves a screenshot of each screen to $SHOTS (default:
// the system temp folder).
//
//   node micro/game/check.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here); // micro/
const shots = process.env.SHOTS || tmpdir();

for (const f of readdirSync(join(here, 'src')).filter((f) => f.endsWith('.js'))) execFileSync(process.execPath, ['--check', join(here, 'src', f)]);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try {
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
// shared/players.js is being written in parallel; until it exists the shell
// uses its stub and the module fetch 404s, which is expected.
const expected = (t) => /favicon|shared\/players\.js|fonts\.g(oogleapis|static)/.test(t);
tab.on('console', (m) => m.type() === 'error' && !expected(m.text()) && !/Failed to load resource: the server responded with a status of 404/.test(m.text()) && errors.push(m.text()));
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('requestfailed', (r) => !expected(r.url()) && errors.push(`request failed: ${r.url()}`));
tab.on('response', (r) => r.status() >= 400 && !expected(r.url()) && errors.push(`${r.status()} ${r.url()}`));

const state = () => tab.evaluate(() => window.__game.state());
const shot = (name) => tab.screenshot({ path: join(shots, `microzoom-${name}.png`) });
async function until(fn, ms = 30000, what = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn(await state())) return; await tab.waitForTimeout(150); }
  throw new Error(`timed out waiting for ${what}: ${JSON.stringify(await state())}`);
}
const steps = [];
const step = (s) => { steps.push(s); console.log(`  ${s}`); };

try {
  await tab.goto(base + 'game/', { waitUntil: 'load' });
  await tab.waitForFunction(() => !!window.__game, null, { timeout: 15000 });
  await tab.waitForTimeout(1800);
  await shot('1-title');
  step('title');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'menu', 5000, 'menu');
  await tab.waitForTimeout(900);
  await shot('2-menu');
  await tab.keyboard.press('ArrowRight');
  await tab.waitForTimeout(800);
  await shot('2b-menu-mite');
  await tab.keyboard.press('ArrowLeft');
  await tab.waitForTimeout(700);
  const sel = (await state()).sel;
  if (sel !== 0) throw new Error(`springtail should be focused, got ${sel}`);
  step('menu (springtail focused)');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'intro', 5000, 'intro');
  await tab.waitForTimeout(1300);
  await shot('3-intro');
  step('intro');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'play' && !s.loading, 45000, 'springtail to load');
  await tab.waitForTimeout(2500);
  await tab.evaluate(() => window.__game.toggleControls());
  await tab.waitForTimeout(700);
  await shot('4-play-controls');
  await tab.evaluate(() => window.__game.near('back'));
  await tab.evaluate(() => window.__game.near('forward'));
  step('play springtail, controls card');

  await tab.evaluate(() => window.__game.pause());
  await until((s) => s.paused && s.modals.includes('pause'), 5000, 'pause');
  await tab.waitForTimeout(600);
  await shot('5-pause');
  step('pause');
  await tab.evaluate(() => window.__game.openModal('settings'));
  await tab.waitForTimeout(600);
  await shot('6-settings');
  await tab.keyboard.press('Escape');
  await tab.waitForTimeout(300);
  await tab.evaluate(() => window.__game.openModal('instructions'));
  await tab.waitForTimeout(500);
  await shot('6b-instructions');
  await tab.keyboard.press('Escape');
  await tab.waitForTimeout(300);
  step('settings, instructions');
  await tab.evaluate(() => window.__game.resume());
  await until((s) => !s.paused && s.modals.length === 0, 5000, 'resume');
  await tab.waitForTimeout(800);
  step('resume');

  await tab.evaluate(() => { window.__game.forceLandmark('forward'); });
  await until((s) => s.transitioning && +s.transitionProgress >= 0.45, 20000, 'transition halfway');
  await shot('7-transition-in');
  await until((s) => s.world === 'mite' && !s.loading && !s.transitioning, 45000, 'mite');
  await tab.waitForTimeout(1500);
  await shot('8-mite-controls');
  const st = await state();
  if (!st.controlsShown) throw new Error('the controls card should show at the start of the second board');
  step('forward landmark → mite (controls card shown)');

  await tab.evaluate(() => { window.__game.forceLandmark('back'); });
  await until((s) => s.transitioning && +s.transitionProgress >= 0.45, 20000, 'back transition halfway');
  await shot('9-transition-out');
  await until((s) => s.world === 'springtail' && !s.loading && !s.transitioning, 45000, 'back to springtail');
  await tab.waitForTimeout(1200);
  step('back landmark → springtail');
  const fin = await state();
  if (fin.progress.furthest < 1) throw new Error('furthest world not recorded');
} catch (e) {
  errors.push(String(e && e.stack || e));
  await shot('failure').catch(() => {});
}

await browser.close();
server.close();
console.log(`${errors.length ? 'FAIL' : 'ok  '} micro zoom${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
console.log(`screenshots in ${shots}`);
process.exit(errors.length ? 1 : 0);
