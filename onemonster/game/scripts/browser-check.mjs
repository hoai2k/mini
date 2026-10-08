// A walk through the game in Chromium: title -> modes -> a chapter card ->
// play (driven by key presses) -> the end of the snatch -> the celebration;
// pause and resume; screenshots of each step in ./shots (or SHOTS).
//
//   cd onemonster/game && node scripts/browser-check.mjs [chapter numbers...]
//
// It serves the game itself. Playwright is found as the `playwright` package,
// at PLAYWRIGHT_MODULE, or in /opt/node-tools.

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
const URL_ = `http://localhost:${server.address().port}/`;

async function playwright() {
  const tries = [process.env.PLAYWRIGHT_MODULE && pathToFileURL(process.env.PLAYWRIGHT_MODULE).href, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const t of tries) {
    try { return await import(t); } catch { /* next */ }
  }
  console.error('Playwright not found.');
  process.exit(2);
}
const { chromium } = await playwright();
const BASE = URL_;
const OUT = process.env.SHOTS || 'shots';
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2).map(Number).filter(Boolean);
const chapters = (want.length ? want : [1, 2, 3, 4, 5, 6, 7, 8, 9]).filter((n) => existsSync(`src/chapters/ch${String(n).padStart(2, '0')}.js`));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('requestfailed', (r) => errors.push('failed: ' + r.url()));

const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const state = () => page.evaluate(() => ({ screen: __onemonster.S.screen, phase: __onemonster.S.phase, done: __onemonster.S.chapter?.done, outcome: __onemonster.S.chapter?.outcome, time: __onemonster.S.chapter?.time }));

await page.goto(BASE + '?all');
await page.waitForFunction(() => globalThis.__onemonster, null, { timeout: 15000 });
await wait(1500);
await shot('01-title');
await page.click('#press-start', { force: true });
await wait(400);
await shot('02-modes');
await page.click('[data-action="journey-1"]', { force: true });
await wait(800);
await shot('03-prologue');

for (const n of chapters) {
  await page.evaluate((ci) => __onemonster.jump(ci), n - 1);
  await wait(1500);
  await shot(`c${n}-1-card`);
  await page.evaluate(() => __onemonster.begin());
  await wait(3600); // the count-in
  // Play: wander and press things for a while.
  const keys = ['KeyD', 'KeyS', 'KeyA', 'KeyW'];
  for (let i = 0; i < 16; i++) {
    const k = keys[i % 4];
    await page.keyboard.down(k);
    if (i % 3 === 0) await page.keyboard.down('ShiftLeft');
    await wait(220);
    await page.keyboard.press('Space');
    await wait(160);
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up(k);
    if (i === 5) await shot(`c${n}-2-play`);
  }
  await shot(`c${n}-3-play`);
  // Pause and resume.
  await page.keyboard.press('Escape');
  await wait(300);
  const paused = await page.evaluate(() => __onemonster.S.paused);
  await shot(`c${n}-4-pause`);
  await page.click('[data-action="resume"]', { force: true });
  // Run the clock out (fast-forward the chapter).
  await page.evaluate(() => { const c = __onemonster.S.chapter; if (!c.done) c.time = Math.min(c.time, 0.5); });
  await page.waitForFunction(() => ['celebrate'].includes(__onemonster.S.screen), null, { timeout: 15000 }).catch(() => {});
  await wait(1500);
  const st = await state();
  await shot(`c${n}-5-celebrate`);
  console.log(`chapter ${n}: paused=${paused} screen=${st.screen} outcome=${st.outcome}`);
}

// Snatch & Keep: two players join on the split keyboard and play a chapter head to head.
if (chapters.includes(2)) {
  await page.evaluate(() => __onemonster.show('modes'));
  await wait(300);
  await page.click('[data-action="versus"]', { force: true });
  await wait(300);
  await page.keyboard.press('Space');
  await wait(150);
  await page.keyboard.press('Enter');
  await wait(300);
  await shot('v-1-join');
  const ready = await page.evaluate(() => __onemonster.S.join.map((j) => j && j[0]));
  await page.click('#versus-go', { force: true });
  await wait(600);
  await page.click('[data-action="story-next"]', { force: true });
  await wait(1500);
  await shot('v-2-card');
  await page.evaluate(() => __onemonster.showCard(1));
  await wait(1200);
  await page.evaluate(() => __onemonster.begin());
  await wait(3600);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.down(i % 2 ? 'KeyD' : 'KeyA');
    await page.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    await wait(250);
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await page.keyboard.up(i % 2 ? 'KeyD' : 'KeyA');
    await page.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  }
  await shot('v-3-play');
  await page.evaluate(() => { const c = __onemonster.S.chapter; if (!c.done) c.time = 0.3; });
  await page.waitForFunction(() => __onemonster.S.screen === 'celebrate', null, { timeout: 15000 }).catch(() => {});
  await wait(1200);
  await shot('v-4-celebrate');
  const tally = await page.evaluate(() => __onemonster.S.tally);
  console.log(`versus: joined=${JSON.stringify(ready)} tally=${JSON.stringify(tally)}`);
}

console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no errors');
await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
