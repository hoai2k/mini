// Browser check (Chromium through Playwright), run from icecreamcone/game:
//
//   node scripts/browser-check.mjs [--shots <dir>] [--bird <id>]
//
// It serves the game itself (the invite gate is off on localhost) and drives it
// with a simulated Xbox controller (navigator.getGamepads is replaced before
// the page loads) and with the keyboard:
//
//  1. Title: no errors; any controller button starts and opens the guide.
//  2. Guide → the first bird's page → Play → how-to card → count-in → play,
//     with stick and A input; Menu pauses, B resumes; the result card shows a
//     score and the progress is saved.
//  3. Keyboard: Enter through the title, guide and page; Space starts.
//  4. Every minigame that exists (or only --bird) is started with ?all, played
//     for a while with random input, and must run without errors, draw, and
//     reach its result card.
//
// Screenshots go to --shots (default: none). Playwright is found as the
// `playwright` package, at PLAYWRIGHT_MODULE, or in /opt/node-tools.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
};
const shots = arg('--shots');
const only = arg('--bird');

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

const FAKE_PADS = () => {
  const pads = [];
  const make = (i) => ({ index: i, id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve('complete') } });
  window.__pad = (i, { buttons = {}, axes } = {}) => {
    if (!pads[i]) {
      pads[i] = make(i);
      window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: pads[i] }));
    }
    const p = pads[i];
    for (const [b, on] of Object.entries(buttons)) p.buttons[b] = { pressed: !!on, touched: !!on, value: on ? 1 : 0 };
    if (axes) p.axes = axes.slice();
    p.timestamp++;
  };
  navigator.getGamepads = () => pads.map((p) => (p ? { ...p, buttons: p.buttons.map((b) => ({ ...b })), axes: p.axes.slice() } : null));
};

const { chromium } = await playwright();
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('FAIL:', msg);
};
const ok = (msg) => console.log('ok:', msg);
if (shots) await mkdir(shots, { recursive: true });

async function newPage(query = '') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(FAKE_PADS);
  await page.goto(url + '?dt=0.05' + query);
  await page.waitForFunction(() => window.__coot && window.__coot.S.screen === 'title');
  return { page, errors };
}
const shot = async (page, name) => shots && page.screenshot({ path: join(shots, name + '.png') });
const wait = (page, ms) => page.waitForTimeout(ms);
const press = async (page, b) => {
  await page.evaluate((b) => window.__pad(0, { buttons: { [b]: true } }), b);
  await wait(page, 80);
  await page.evaluate((b) => window.__pad(0, { buttons: { [b]: false } }), b);
  await wait(page, 80);
};
const state = (page) => page.evaluate(() => ({ screen: window.__coot.S.screen, phase: window.__coot.S.phase, paused: window.__coot.S.paused }));
const A = 0;
const B = 1;
const MENU = 9;

// ---------- 1 and 2: controller ----------
{
  const { page, errors } = await newPage();
  await page.evaluate(() => window.__pad(0, {}));
  await wait(page, 300);
  await shot(page, '01-title');
  await press(page, A);
  let s = await state(page);
  s.screen === 'guide' ? ok('controller A on the title opens the guide') : fail(`after A on title: ${JSON.stringify(s)}`);
  await wait(page, 300);
  await shot(page, '02-guide');
  await press(page, A);
  s = await state(page);
  s.screen === 'page' ? ok('A on the first card opens its page') : fail(`after A on card: ${JSON.stringify(s)}`);
  await wait(page, 400);
  await shot(page, '03-page');
  await press(page, A); // Play (the primary button)
  await page.waitForFunction(() => window.__coot.S.phase === 'howto', null, { timeout: 5000 }).catch(() => {});
  s = await state(page);
  s.phase === 'howto' ? ok('Play shows the how-to card') : fail(`after Play: ${JSON.stringify(s)}`);
  await shot(page, '04-howto');
  await press(page, A);
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  s = await state(page);
  s.phase === 'play' ? ok('count-in leads to play') : fail(`after start: ${JSON.stringify(s)}`);
  for (let i = 0; i < 12; i++) {
    await page.evaluate((x) => window.__pad(0, { axes: [x, 0, 0, 0] }), i % 2 ? 0.8 : -0.8);
    await wait(page, 120);
  }
  await page.evaluate(() => window.__pad(0, { axes: [0, 0, 0, 0] }));
  await shot(page, '05-play');
  await press(page, MENU);
  s = await state(page);
  s.paused ? ok('Menu pauses') : fail('Menu did not pause');
  await shot(page, '06-pause');
  await press(page, B);
  s = await state(page);
  !s.paused ? ok('B resumes') : fail('B did not resume');
  await page.waitForFunction(() => window.__coot.S.phase === 'result', null, { timeout: 60000 }).catch(() => {});
  s = await state(page);
  s.phase === 'result' ? ok('the game ends on the result card') : fail(`no result: ${JSON.stringify(s)}`);
  await shot(page, '07-result');
  const saved = await page.evaluate(() => window.__coot.progress.coot);
  saved && saved.plays === 1 ? ok(`progress saved (best ${saved.best})`) : fail('progress not saved');
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the controller round');
  await page.close();
}

// ---------- 3: keyboard ----------
{
  const { page, errors } = await newPage();
  await page.keyboard.press('Enter');
  await wait(page, 200);
  let s = await state(page);
  s.screen === 'guide' ? ok('Enter on the title opens the guide') : fail(`keyboard title: ${JSON.stringify(s)}`);
  await page.keyboard.press('Enter');
  await wait(page, 200);
  s = await state(page);
  s.screen === 'page' ? ok('Enter opens the first page') : fail(`keyboard guide: ${JSON.stringify(s)}`);
  await page.keyboard.press('Escape');
  await wait(page, 200);
  s = await state(page);
  s.screen === 'guide' ? ok('Escape goes back to the guide') : fail(`keyboard back: ${JSON.stringify(s)}`);
  errors.length ? fail('page errors: ' + errors.join(' | ')) : ok('no page errors in the keyboard round');
  await page.close();
}

// ---------- 4: every minigame ----------
const ids = ['coot', 'cupadee', 'shuttercluck', 'gullfinch', 'plume', 'bobolinks', 'peeper', 'piffle', 'dodo', 'crow'];
for (const [i, id] of ids.entries()) {
  if (only && id !== only) continue;
  if (!existsSync(join(root, 'src/games', id + '.js'))) {
    console.log(`skip: ${id} (not built yet)`);
    continue;
  }
  const { page, errors } = await newPage('&all');
  await page.evaluate((i) => window.__coot.startBird(i), i);
  await page.waitForFunction(() => window.__coot.S.phase === 'howto', null, { timeout: 5000 }).catch(() => {});
  await shot(page, `game-${id}-0-howto`);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__coot.S.phase === 'play', null, { timeout: 8000 }).catch(() => {});
  let k = 0;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const ph = (await state(page)).phase;
    if (ph === 'result') break;
    const r = Math.sin(k * 1.7);
    await page.evaluate(([x, y, a, sh]) => window.__pad(0, { axes: [x, y, 0, 0], buttons: { 0: a, 4: sh === 1, 5: sh === 2 } }), [r, Math.cos(k), k % 3 === 0, k % 4]);
    await wait(page, 90);
    if (k === 20) await shot(page, `game-${id}-1-play`);
    k++;
  }
  const s = await state(page);
  s.phase === 'result' ? ok(`${id}: plays to its result card`) : fail(`${id}: no result card (${JSON.stringify(s)})`);
  await shot(page, `game-${id}-2-result`);
  errors.length ? fail(`${id}: page errors: ` + errors.join(' | ')) : ok(`${id}: no page errors`);
  await page.close();
}

await browser.close();
server.close();
if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('browser check passed');
