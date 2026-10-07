// Plays Hoops on a phone-sized screen with a mouse standing in for a finger:
// picks the ball up, checks it follows the finger, carries it around and
// tosses it with flicks of different speeds and directions, all of which
// should score, and checks the hoop moves after five shots.
//   node chat/test/hoops-play.mjs
// Pictures land in local/chat-shots/hoops-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
await page.goto(`${server.url}/test/game.html?game=hoops&n=1&expr=0`);
await page.addStyleTag({ content: ':root { --seat-h: 700px; }' });
await page.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
await page.waitForTimeout(1200);
const box = await page.locator('.g-canvas').first().boundingBox();
const view = () => page.evaluate(() => window.seats[0].gh.current.instance._view());
const total = () => page.evaluate(() => window.seats[0].gh.current.api.store.get('total', 0));
const pause = ms => page.waitForTimeout(ms);
await page.screenshot({ path: `${outDir}hoops-ready.png` });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};

// One toss: grab the ball, carry it by (cx, cy), then flick `len` px up at
// the hoop, `side` px off line, over `ms`.
async function toss({ cx = 0, cy = 0, len = 120, side = 0, ms = 50 }, shot) {
  await page.waitForFunction(() => window.seats[0].gh.current.instance._view().ready, null, { timeout: 8000 });
  const v = await view();
  let x = box.x + v.ball.x, y = box.y + v.ball.y;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x + (cx * i) / 8, y + (cy * i) / 8);
    await pause(25);
  }
  x += cx;
  y += cy;
  await pause(120);
  if (shot === 0) {
    const held = await view();
    const off = Math.hypot(held.ball.x + box.x - x, held.ball.y + box.y - y);
    check(held.held && off < 12, `the ball follows the finger (${off.toFixed(1)} px away)`);
    await page.screenshot({ path: `${outDir}hoops-holding.png` });
  }
  // Flick towards wherever the hoop is now, plus the toss's own sideways error.
  const now = await view();
  side += ((now.hoop.x - now.ball.x) / (now.ball.y - now.hoop.y)) * len;
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (side * i) / steps, y - (len * i) / steps);
    await pause(ms / steps);
  }
  await page.mouse.up();
}

const tosses = [
  { len: 120, ms: 60 },
  { cx: -60, cy: -40, len: 160, side: 15, ms: 60 },
  { cx: 70, cy: 0, len: 100, side: -20, ms: 50 },
  { len: 200, ms: 70 },
  { cx: 0, cy: -120, len: 90, ms: 40 },
  { len: 140, side: 10, ms: 60 },
  { cx: -40, len: 180, ms: 80 },
];
const spot0 = (await view()).hoop;
for (const [i, t] of tosses.entries()) {
  const before = await total();
  await toss(t, i);
  await pause(2300);
  const after = await total();
  check(after === before + 1, `toss ${i + 1} ${JSON.stringify(t)} scores (${JSON.stringify((await view()).lastToss)} at spot ${(await view()).spot})`);
  if (i === 4) {
    await pause(800);
    const v = await view();
    check(Math.hypot(v.hoop.x - spot0.x, v.hoop.y - spot0.y) > 5, `the hoop moves after five shots (spot ${v.spot})`);
    await page.screenshot({ path: `${outDir}hoops-moved.png` });
  }
}

// A toss far off to the side misses.
{
  const before = await total();
  await toss({ len: 80, side: 110, ms: 50 }, 99);
  await pause(2300);
  check((await total()) === before, 'a toss far off to the side misses');
}

// A gentle drop (no upward flick) just puts the ball back.
const before = await total();
const v = await view();
await page.mouse.move(box.x + v.ball.x, box.y + v.ball.y);
await page.mouse.down();
await page.mouse.move(box.x + v.ball.x + 30, box.y + v.ball.y - 20, { steps: 5 });
await pause(300);
await page.mouse.up();
await pause(400);
check(!(await view()).flying && (await total()) === before, 'letting go without a toss puts the ball back');

await page.screenshot({ path: `${outDir}hoops-play.png` });
await browser.close();
server.close();
if (failed) process.exit(1);
