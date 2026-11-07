// Smoke check for the Micro Zoom shell: serves micro/ locally (the game at
// /game/, the worlds at /game/<world>/), opens the game in headless Chromium
// (software WebGL) and walks title → menu → intro → play (springtail) →
// controls card → pause → settings → resume → the springtail's portal (the
// continuous transition into the mite) → a back landmark (the zoom back out
// to the springtail). Fails on any
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
const expected = (t) => /favicon|shared\/players\.js|zoom\/player\.js|fonts\.g(oogleapis|static)/.test(t);
tab.on('console', (m) => m.type() === 'error' && !expected(m.text()) && !/Failed to load resource: the server responded with a status of 404/.test(m.text()) && errors.push(m.text()));
tab.on('pageerror', (e) => errors.push(String(e.stack || e)));
tab.on('requestfailed', (r) => !expected(r.url()) && errors.push(`request failed: ${r.url()}`));
tab.on('response', (r) => r.status() >= 400 && !expected(r.url()) && errors.push(`${r.status()} ${r.url()}`));

const state = () => tab.evaluate(() => window.__game.state());
const shot = (name) => tab.screenshot({ path: join(shots, `microzoom-${name}.png`), timeout: 90000 });
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

  // A click away from Press Start starts the title music and stays on the title.
  await tab.mouse.click(40, 360);
  await until((s) => s.music.wanted === 'chamber' && s.music.playing.includes('chamber'), 8000, 'Clockwork Chamber Music after a click on the title');
  if ((await state()).screen !== 'title') throw new Error('a click away from Press Start must stay on the title');
  step('title music on a click, still on the title');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'menu', 20000, 'menu');
  await tab.waitForTimeout(900);
  await shot('2-menu');
  await tab.waitForFunction(() => document.querySelector('#menu-veil').hidden, null, { timeout: 30000 });
  await tab.keyboard.press('ArrowRight');
  await tab.waitForTimeout(800);
  await shot('2b-menu-mite');
  await tab.keyboard.press('ArrowLeft');
  await tab.waitForTimeout(700);
  const sel = (await state()).sel;
  if (sel !== 0) throw new Error(`springtail should be focused, got ${sel}`);
  await until((s) => s.music.wanted === 'lullaby' && s.music.playing.includes('lullaby'), 8000, 'Clockwork Lullaby on world select');
  step('menu (springtail focused, Clockwork Lullaby playing)');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'intro', 20000, 'intro');
  await tab.waitForTimeout(1300);
  await shot('3-intro');
  await until((s) => s.preloading === 'springtail' && s.preloadReady, 120000, 'world to preload during intro');
  await tab.evaluate(() => { window.__introFrame = document.querySelector('#frame-host iframe'); });
  if ((await state()).music.wanted !== 'lullaby') throw new Error('the intro should keep Clockwork Lullaby');
  step('intro');

  await tab.keyboard.press('Enter');
  await until((s) => s.screen === 'play' && !s.loading, 120000, 'springtail to load');
  await until((s) => s.music.wanted === null && s.music.playing.length === 0, 6000, 'menu music to stop in the world');
  const reused = await tab.evaluate(() => document.querySelector('#frame-host iframe') === window.__introFrame && document.querySelector('#veil').hidden);
  if (!reused) throw new Error('Begin must reuse the prepared world without a loading veil');
  await tab.waitForTimeout(2500);
  await tab.evaluate(() => window.__game.toggleControls());
  await tab.waitForTimeout(700);
  await shot('4-play-controls');
  await tab.evaluate(() => window.__game.near('back'));
  await tab.evaluate(() => window.__game.near('forward'));
  step('play springtail, controls card');

  await tab.evaluate(() => window.__game.pause());
  await until((s) => s.paused && s.modals.includes('pause'), 20000, 'pause');
  await tab.waitForTimeout(600);
  await shot('5-pause');
  if (await tab.locator('#pause [data-open="instructions"], #pause [data-open="settings"]').count()) throw new Error('pause should offer neither Instructions nor Settings');
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
  await until((s) => !s.paused && s.modals.length === 0, 20000, 'resume');
  await tab.waitForTimeout(800);
  step('resume');

  // Stills of the specimen zoom (the real transitions below run too fast for
  // software rendering to screenshot reliably).
  for (const [a, b, dir, p, name] of [['springtail', 'mite', 'in', 0.55, '7-transition-in'], ['mite', 'tardigrade', 'in', 0.5, '7b-handoff'], ['bacterium', 'phage', 'in', 0.35, '7c-transition-phage'], ['tardigrade', 'mite', 'out', 0.6, '7d-transition-out']]) {
    await tab.evaluate(([a, b, dir, p]) => window.__game.previewTransition(a, b, dir, p), [a, b, dir, p]);
    await shot(name);
  }
  await tab.evaluate(() => window.__game.hideTransition());
  step('transition stills');

  // Through the springtail's own portal: its outro (success, slow-down,
  // freeze) and the continuous transition into the mite (embed.js).
  await tab.evaluate(() => { const m = window.__game.frame().contentWindow.__micro; m.placePortal(); m.enterPortal(0); });
  await until((s) => s.transitioning, 20000, 'transition to start');
  await until((s) => s.cont && s.cont.phase === 'move', 120000, 'the continuous camera move (the mite preloaded and held)');
  await until((s) => s.world === 'mite' && !s.loading && !s.transitioning, 120000, 'mite');
  // read at once: the card hides itself after 8 s, and a screenshot under
  // software rendering can take longer than that (the old failure here)
  const st = await state();
  if (!(st.controlsShown || st.cardBoard === st.board)) throw new Error('the controls card should show at the start of the second board');
  await tab.waitForTimeout(1500);
  await shot('8-mite-controls');
  step('forward portal → continuous transition → mite (controls card shown)');

  await tab.evaluate(() => { window.__game.forceLandmark('back'); });
  await until((s) => s.transitioning, 20000, 'back transition to start');
  await until((s) => s.world === 'springtail' && !s.loading && !s.transitioning, 120000, 'back to springtail');
  await tab.waitForTimeout(1200);
  await shot('9-back-springtail');
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
