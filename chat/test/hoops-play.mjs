// Plays Hoops on a phone-sized screen with a mouse standing in for a finger.
// Throws are not helped in, so this checks that they are read faithfully:
//   - the ball follows the finger while held, and flies on from the release
//     point in the direction of the flick;
//   - a flick aimed at a spot beside the hoop arrives at that spot (where
//     the flick's line crosses the rim's height on screen);
//   - a soft flick falls short, a hard one flies long, and somewhere between
//     there is a speed that scores;
//   - letting go without a flick puts the ball down.
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
const pause = ms => page.waitForTimeout(ms);
await page.screenshot({ path: `${outDir}hoops-ready.png` });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const ready = () => page.waitForFunction(() => window.seats[0].gh.current.instance._view().ready, null, { timeout: 8000 });

// A flick from the ball: `len` px up and `side` px sideways in about `ms`.
// Watches the flight and returns where the ball was on screen as it reached
// the hoop's distance, and whether it scored.
async function flick(len, side = 0, ms = 60) {
  await ready();
  const v = await view();
  const before = v.total;
  const x = box.x + v.ball.x, y = box.y + v.ball.y;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await pause(60);
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (side * i) / steps, y - (len * i) / steps);
    await pause(ms / steps);
  }
  await page.mouse.up();
  // Poll the flight for the moment it reaches the hoop's distance.
  const cross = await page.evaluate(async () => {
    const inst = window.seats[0].gh.current.instance;
    let prev = inst._view();
    for (let i = 0; i < 200; i++) {
      await new Promise(r => requestAnimationFrame(r));
      const v = inst._view();
      if (!v.flying) break;
      if (prev.ball.z < v.hoop.z && v.ball.z >= v.hoop.z) return { x: v.ball.x, rimY: v.hoop.y };
      prev = v;
    }
    return null;
  });
  await page.waitForFunction(() => !window.seats[0].gh.current.instance._view().flying, null, { timeout: 8000 });
  const after = await view();
  return { scored: after.total > before, cross, start: { x: v.ball.x, y: v.ball.y }, toss: after.lastToss };
}

// 1. Holding: the ball follows the finger.
{
  await ready();
  const v = await view();
  const x = box.x + v.ball.x, y = box.y + v.ball.y;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x - 5 * i, y - 4 * i); await pause(25); }
  await pause(100);
  const held = await view();
  const off = Math.hypot(held.ball.x + box.x - (x - 40), held.ball.y + box.y - (y - 32));
  check(held.held && off < 3, `the ball follows the finger (${off.toFixed(1)} px away)`);
  await page.screenshot({ path: `${outDir}hoops-holding.png` });
  // 2. Letting go without a flick puts it down.
  await pause(200);
  await page.mouse.up();
  await pause(300);
  check(!(await view()).flying, 'letting go without a flick puts the ball down');
}

// 3. Accuracy: aim at points beside the hoop; the ball arrives there.
for (const aimAt of [-90, 70]) {
  await ready();
  const v = await view();
  const len = 300;
  // Sideways so that the flick's line crosses the rim's height at hoop.x + aimAt.
  const side = ((v.hoop.x + aimAt - v.ball.x) / (v.ball.y - v.hoop.y)) * len;
  const r = await flick(len, side);
  const want = v.hoop.x + aimAt;
  const miss = r.cross ? Math.abs(r.cross.x - want) : Infinity;
  check(miss < 14, `a flick aimed ${aimAt} px beside the hoop arrives there (${r.cross ? r.cross.x.toFixed(0) : '—'} vs ${want.toFixed(0)}, scored=${r.scored})`);
}

// 4. Power: soft falls short, hard goes long, something in between scores.
{
  const soft = await flick(25, 0, 80);
  const hard = await flick(700, 0, 40);
  check(!soft.scored && !hard.scored, `a soft flick (${soft.toss?.up.toFixed(2)} m/s) and a hard one (${hard.toss?.up.toFixed(2)} m/s) both miss`);
  let hit = null;
  const tried = [];
  for (let len = 90; len <= 420 && !hit; len += 12) {
    const v = await view();
    const side = ((v.hoop.x - v.ball.x) / (v.ball.y - v.hoop.y)) * len;
    const r = await flick(len, side, 60);
    tried.push(`${len}:${r.toss?.thrown ? r.toss.up.toFixed(2) : 'put down'}${r.scored ? '✓' : ''}`);
    if (r.scored) hit = len;
  }
  check(!!hit, `a straight flick of the right speed scores (${tried.join(' ')})`);
}

await page.screenshot({ path: `${outDir}hoops-play.png` });

// 5. Two seats share one hoop, and it moves after five shots in total
// across both of them (three from one seat, two from the other).
{
  const two = await browser.newPage({ viewport: { width: 860, height: 760 } });
  await two.goto(`${server.url}/test/game.html?game=hoops&n=2&expr=0&h=640`);
  await two.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  await two.waitForTimeout(1500);
  const views = () => two.evaluate(() => window.seats.map(s => s.gh.current.instance._view()));
  const v0 = await views();
  check(v0[0].spot === v0[1].spot && Math.abs(v0[0].hoop.x - v0[1].hoop.x) < 0.5 && Math.abs(v0[0].hoop.y - v0[1].hoop.y) < 0.5,
    `both seats start at the same hoop (spots ${v0[0].spot}, ${v0[1].spot})`);
  const start = v0[0].spot;
  let moved = false;
  for (let k = 0; k < 5; k++) {
    const seat = k % 2;
    await two.waitForFunction(i => window.seats[i].gh.current.instance._view().ready, seat, { timeout: 8000 });
    const spotBefore = (await views())[seat].spot;
    if (spotBefore !== start) moved = true;
    await two.evaluate(i => window.seats[i].gh.current.instance.rookie(), seat);
    await two.waitForFunction(i => window.seats[i].gh.current.instance._view().flying, seat, { timeout: 3000 });
  }
  check(!moved, 'the hoop stays put for the first four shots');
  // After the fifth shot the hoop moves, to the same place on both seats.
  await two.waitForFunction(s => window.seats.every(x => {
    const v = x.gh.current.instance._view();
    return v.spot !== s && v.ready;
  }), start, { timeout: 10000 }).catch(() => {});
  const v1 = await views();
  check(v1[0].spot !== start && v1[0].spot === v1[1].spot && Math.abs(v1[0].hoop.x - v1[1].hoop.x) < 0.5 && Math.abs(v1[0].hoop.y - v1[1].hoop.y) < 0.5,
    `after five shots across both seats the hoop moved for both (${start} -> ${v1[0].spot}, ${v1[1].spot})`);
  await two.screenshot({ path: `${outDir}hoops-two.png` });
  await two.close();
}

await browser.close();
server.close();
if (failed) process.exit(1);
