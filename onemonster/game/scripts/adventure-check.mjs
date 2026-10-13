// Plays Adventure boards in Chromium on their autopilots and takes screenshots
// along the way, to check the art lines up (feet on the ground, sprites the
// right size, the backdrop and ground joining) and nothing throws.
//
//   cd onemonster/game && node scripts/adventure-check.mjs [board numbers...]
//   SHOTS=dir (default shots/adv), EVERY=seconds of game time between shots
//   (default 8), PHONE=1 also plays at a phone held upright (390 x 844).
//
// It runs the game at a fixed step of 1/20 s per frame (about three times real
// speed) and replaces the player's input with the board's autopilot.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
const BASE = `http://localhost:${server.address().port}/`;

async function playwright() {
  const tries = [process.env.PLAYWRIGHT_MODULE && pathToFileURL(process.env.PLAYWRIGHT_MODULE).href, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const t of tries) {
    try { return await import(t); } catch { /* next */ }
  }
  console.error('Playwright not found.');
  process.exit(2);
}
const { chromium } = await playwright();
const OUT = process.env.SHOTS || 'shots/adv';
const EVERY = Number(process.env.EVERY) || 8;
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2).map(Number).filter(Boolean);
const boards = (want.length ? want : [1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((n) => existsSync(join(root, `src/adventure/b${String(n).padStart(2, '0')}.js`)));

const browser = await chromium.launch(existsSync('/opt/pw-browsers/chromium') ? {} : {});
const errors = [];
const sizes = [['wide', { width: 1280, height: 720 }]];
if (process.env.PHONE) sizes.push(['phone', { width: 390, height: 844 }]);

for (const [label, viewport] of sizes) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => { if (!r.url().includes('fonts.')) errors.push('failed: ' + r.url()); });
  await page.goto(BASE + '?all&dt=0.05');
  await page.waitForFunction(() => globalThis.__onemonster, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  for (const n of boards) {
    const nn = String(n).padStart(2, '0');
    await page.evaluate((ci) => __onemonster.jump(ci, 'adv'), n - 1);
    await page.waitForFunction(() => __onemonster.S.factory, null, { timeout: 15000 });
    await page.waitForTimeout(1500); // the art loading
    await page.screenshot({ path: `${OUT}/b${nn}-${label}-0-card.png` });
    await page.evaluate(() => __onemonster.begin());
    // Drive the board with its autopilot from now on.
    await page.evaluate(async (file) => {
      const m = await import(`./src/adventure/${file}.js`);
      const ch = __onemonster.S.chapter;
      const orig = ch.update;
      ch.update = function (dt, inS, inH) { return orig.call(this, dt, ch.done ? inS : m.autopilot(ch), inH); };
    }, `b${nn}`);
    let shotT = 0;
    let k = 1;
    for (let i = 0; i < 2000; i++) {
      const st = await page.evaluate(() => {
        const S = __onemonster.S;
        return { screen: S.screen, phase: S.phase, time: S.chapter?.time, done: S.chapter?.done, outcome: S.chapter?.outcome, t: S.t };
      });
      if (st.screen !== 'play') break;
      if (st.phase === 'play' && st.t - shotT >= EVERY) {
        shotT = st.t;
        await page.screenshot({ path: `${OUT}/b${nn}-${label}-${String(k++).padStart(2, '0')}.png` });
      }
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    const end = await page.evaluate(() => ({ screen: __onemonster.S.screen, outcome: __onemonster.S.chapter?.outcome, marks: __onemonster.S.lastMarks, time: __onemonster.S.chapter?.time }));
    await page.screenshot({ path: `${OUT}/b${nn}-${label}-zz-end.png` });
    console.log(`board ${n} (${label}): ${end.screen}, ${end.outcome}, postmarks ${JSON.stringify(end.marks)}, ${end.time?.toFixed(1)} s left`);
  }
  await page.close();
}

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
