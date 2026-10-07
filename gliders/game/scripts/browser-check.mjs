// Browser check (Chromium through Playwright), run from gliders/game:
//
//   node scripts/browser-check.mjs [--shots <dir>]
//
// It serves the game itself and drives it with simulated Xbox controllers
// (navigator.getGamepads is replaced before the page loads) and the keyboard:
//
//  1. Title: no errors; any controller button starts and joins that pad as P1.
//  2. Lobby: three more controllers join, change gliders, and ready up.
//  3. Level select appears; A on the focused sky starts a four-player round.
//  4. Four players fly for a while with stick input: nothing throws, the
//     round clock runs, frames stay under budget.
//  5. Menu pauses, B resumes; End round now shows the results.
//  6. A one-player keyboard round: Enter starts, Space readies, Enter flies.
//
// Screenshots go to --shots (default: none). Playwright is found as the
// `playwright` package, at PLAYWRIGHT_MODULE, or in /opt/node-tools.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const shotsArg = process.argv.indexOf('--shots');
const shots = shotsArg > 0 ? process.argv[shotsArg + 1] : null;

async function playwright() {
  const tries = [process.env.PLAYWRIGHT_MODULE && pathToFileURL(process.env.PLAYWRIGHT_MODULE).href, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const t of tries) {
    try {
      return await import(t);
    } catch {
      /* next */
    }
  }
  console.error('Playwright not found: install it (npm i -D playwright) or set PLAYWRIGHT_MODULE.');
  process.exit(2);
}

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

// Fake gamepads, controlled from the test through window.__pad(i, patch).
const FAKE_PADS = () => {
  const pads = [];
  const make = (i) => ({ index: i, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve('complete') } });
  window.__pad = (i, { buttons = {}, axes } = {}) => {
    if (!pads[i]) {
      pads[i] = make(i);
      window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pads[i] }));
    }
    const p = pads[i];
    for (const [b, on] of Object.entries(buttons)) p.buttons[b] = { pressed: !!on, touched: !!on, value: typeof on === 'number' ? on : on ? 1 : 0 };
    if (axes) p.axes = axes.slice();
    p.timestamp++;
  };
  navigator.getGamepads = () => pads.map((p) => (p ? { ...p, buttons: p.buttons.map((b) => ({ ...b })), axes: p.axes.slice() } : null));
};

const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('FAIL:', msg);
};
const ok = (msg) => console.log('ok:', msg);
if (shots) await mkdir(shots, { recursive: true });

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(FAKE_PADS);
  // Low graphics keeps the software renderer's frames bearable.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gliders.settings.v1', JSON.stringify({ quality: 2 }));
    } catch {
      /* ignore */
    }
  });
  await page.goto(url + '?dt=0.1');
  await page.waitForFunction(() => window.__gliders && window.__gliders.screen === 'title');
  return { page, errors };
}
const shot = async (page, name) => shots && page.screenshot({ path: join(shots, name + '.png'), timeout: 300000 });
// Wait for the game to run n more frames (software WebGL is slow and uneven).
const frames = (page, n = 2) => page.evaluate((n) => new Promise((r) => {
  const start = window.__gliders.frames;
  const check = () => (window.__gliders.frames - start >= n ? r() : setTimeout(check, 10));
  check();
}), n);
const tap = async (page, i, b) => {
  await page.evaluate(([i, b]) => window.__pad(i, { buttons: { [b]: true } }), [i, b]);
  await frames(page, 2);
  await page.evaluate(([i, b]) => window.__pad(i, { buttons: { [b]: false } }), [i, b]);
  await frames(page, 2);
};
const screen = (page) => page.evaluate(() => window.__gliders.screen);

// ---- 1-5: four controllers
{
  const { page, errors } = await newPage();
  await page.evaluate(() => [0, 1, 2, 3].forEach((i) => window.__pad(i)));
  await page.waitForTimeout(1500);
  await shot(page, '01-title');
  await tap(page, 0, 0);
  (await screen(page)) === 'lobby' ? ok('controller A on the title opens the lobby') : fail('title did not start on A');
  const p1 = await page.evaluate(() => window.__gliders.players.map((p) => p.device));
  p1.length === 1 && p1[0] === 'pad0' ? ok('the starting pad is P1') : fail('P1 not joined from the start press: ' + p1);
  for (const i of [1, 2, 3]) await tap(page, i, 0);
  await tap(page, 1, 15); // D-pad right: next glider
  await tap(page, 2, 15);
  await tap(page, 2, 15);
  await tap(page, 3, 14);
  await tap(page, 3, 13); // D-pad down: colours
  await page.waitForTimeout(600);
  await shot(page, '02-lobby');
  const ids = await page.evaluate(() => window.__gliders.players.map((p) => p.gliderId));
  ids.length === 4 ? ok('four players joined: ' + ids.join(', ')) : fail('players joined: ' + ids.length);
  for (const i of [0, 1, 2, 3]) await tap(page, i, 0);
  await page.waitForTimeout(800);
  (await screen(page)) === 'levels' ? ok('all ready → level select') : fail('not on level select: ' + (await screen(page)));
  await page.waitForTimeout(800);
  await shot(page, '03-levels');
  await tap(page, 0, 0);
  await page.waitForTimeout(500);
  (await screen(page)) === 'play' ? ok('A on a sky starts the round') : fail('round did not start');
  await page.waitForFunction(() => window.__gliders.round?.phase === 'play', null, { timeout: 900000 });
  await shot(page, '04-countdown-end');
  // Fly: everyone dives a little, rolls in different directions.
  await page.evaluate(() => {
    window.__pad(0, { axes: [0.3, -0.4, 0, 0] });
    window.__pad(1, { axes: [-0.5, 0.2, 0, 0], buttons: { 7: 0.8 } });
    window.__pad(2, { axes: [0.0, -0.8, 0, 0] });
    window.__pad(3, { axes: [0.6, 0.0, 0, 0], buttons: { 6: 0.5 } });
  });
  const t0 = await page.evaluate(() => performance.now());
  const frames0 = await page.evaluate(() => new Promise((r) => {
    let n = 0;
    const s = performance.now();
    const f = () => (performance.now() - s < 3000 ? (n++, requestAnimationFrame(f)) : r(n));
    requestAnimationFrame(f);
  }));
  const fps = frames0 / 3;
  console.log(`  four views: ${fps.toFixed(1)} fps in software WebGL`);
  await page.evaluate(() => [0, 1, 2, 3].forEach((i) => window.__pad(i, { axes: [0.1 * i, 0.15, 0, 0], buttons: { 6: 0, 7: 0 } })));
  await frames(page, 60);
  await shot(page, '05-four-players');
  const snd = await page.evaluate(() => window.__gliders.audio.debug());
  snd.recordedWind && Object.values(snd.layers).some((g) => g > 0.05) && snd.bus > 0.3
    ? ok('recorded wind loaded and playing: ' + JSON.stringify(snd.layers))
    : fail('recorded wind not playing: ' + JSON.stringify(snd));
  console.log('  ms per frame: update ' + (await page.evaluate(() => window.__gliders.updateMs.toFixed(1))) + ', render ' + (await page.evaluate(() => window.__gliders.renderMs.toFixed(0))));
  const r = await page.evaluate(() => ({ time: window.__gliders.round.time, players: window.__gliders.players.map((p) => ({ alive: p.alive, speed: p.flyer.speed, y: p.flyer.pos.y, score: p.score.score, crashes: p.score.crashes })) }));
  r.time > 3 ? ok(`round clock runs (${r.time.toFixed(1)} s)`) : fail('round clock stuck at ' + r.time);
  r.players.every((p) => Number.isFinite(p.speed) && Number.isFinite(p.y)) ? ok('flight state finite: ' + JSON.stringify(r.players.map((p) => [Math.round(p.speed), Math.round(p.y), p.crashes]))) : fail('bad flight state');
  await tap(page, 2, 9); // Menu
  (await page.evaluate(() => window.__gliders.paused)) ? ok('Menu pauses') : fail('Menu did not pause');
  await shot(page, '06-pause');
  await tap(page, 2, 1); // B
  !(await page.evaluate(() => window.__gliders.paused)) ? ok('B resumes') : fail('B did not resume');
  await tap(page, 0, 9);
  await page.click('[data-action="end-round"]');
  await page.waitForFunction(() => window.__gliders.layers.includes('results'), null, { timeout: 900000 }).catch(() => {});
  (await page.evaluate(() => window.__gliders.layers.includes('results'))) ? ok('End round now → results') : fail('no results');
  await shot(page, '07-results');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors (controllers)');
  await page.close();
}

// ---- 6: one player on the keyboard
{
  const { page, errors } = await newPage();
  await frames(page, 4);
  await page.bringToFront();
  await page.keyboard.press('Enter');
  await frames(page, 3);
  (await screen(page)) === 'lobby' ? ok('Enter on Press Start opens the lobby') : fail('keyboard start failed');
  await page.keyboard.press('KeyD');
  await frames(page, 2);
  await page.keyboard.press('Space');
  await frames(page, 3);
  await page.waitForTimeout(400);
  await frames(page, 3);
  (await screen(page)) === 'levels' ? ok('Space readies the keyboard player') : fail('keyboard ready failed: ' + (await screen(page)));
  await page.keyboard.press('ArrowRight');
  await frames(page, 2);
  await page.keyboard.press('ArrowRight');
  await frames(page, 2);
  await page.keyboard.press('Enter');
  await frames(page, 3);
  await page.waitForFunction(() => window.__gliders.round?.phase === 'play', null, { timeout: 900000 });
  (await screen(page)) === 'play' ? ok('Enter flies the focused sky') : fail('keyboard round did not start');
  await page.keyboard.down('KeyW');
  await frames(page, 20);
  await page.keyboard.up('KeyW');
  await frames(page, 10);
  await shot(page, '08-one-player');
  const s = await page.evaluate(() => ({ speed: window.__gliders.players[0].flyer.speed, def: window.__gliders.round.def.id }));
  s.speed > 30 ? ok(`diving with W gains speed (${s.speed.toFixed(0)} m/s on ${s.def})`) : fail('W did not dive: ' + s.speed);
  await page.keyboard.press('Escape');
  await frames(page, 2);
  (await page.evaluate(() => window.__gliders.paused)) ? ok('Esc pauses') : fail('Esc did not pause');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors (keyboard)');
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `${failures} failure(s)` : 'all browser checks passed');
process.exit(failures ? 1 : 0);
