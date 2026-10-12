// Plays Kart Dash through test/game.html with two racers (plus two computer
// karts) on phone-sized seats:
//   - the countdown holds everyone on the grid, then GO starts the race and
//     the karts drive off on their own (auto-accelerate);
//   - holding steer turns the kart;
//   - driving through an item box gives an item;
//   - a banana peel dropped by one racer spins the other out with kart parts
//     flying, and both see it;
//   - a thrown bomb goes off for both;
//   - debug-bot rookie inputs (js/rookie.js) drive both karts round all three
//     laps, the laps count, and the race ends with a finishing order.
// Also measures frame times. Pictures land in local/chat-shots/kart-*.png.
//   node chat/test/kart-play.mjs
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 860, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/Failed to load resource|mediapipe|vision_wasm|TensorFlow Lite/i.test(m.text())) errors.push(m.text());
});
await page.goto(`${server.url}/test/game.html?game=kart&n=2&expr=0&w=400&h=720`);
await page.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const pause = ms => page.waitForTimeout(ms);
const info = i => page.evaluate(i => window.seats[i].gh.current.instance._test.info(), i);
const call = (i, fn, ...args) => page.evaluate(([i, fn, args]) => window.seats[i].gh.current.instance._test[fn](...args), [i, fn, args]);
const until = async (fn, ms, what) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await pause(100);
  }
  console.log(`  (timed out waiting for ${what})`);
  return false;
};

// 1. Countdown, then GO.
{
  await until(async () => (await info(0)).racers.length === 2, 4000, 'the second racer on the grid');
  const a = await info(0);
  check(a.phase === 'count' && a.racers.length === 2 && a.ai === 2, `the race opens on a countdown with 2 racers and 2 computer karts (${a.phase}, ${a.racers.length}+${a.ai})`);
  await pause(1500);
  await page.screenshot({ path: `${outDir}kart-start.png` });
  const b = await info(0);
  check(b.phase === 'count' && b.me.v === 0 && Math.hypot(b.me.x - a.me.x, b.me.z - a.me.z) < 0.01, 'karts wait on the grid during the countdown');
  await until(async () => (await info(0)).phase === 'race', 8000, 'GO');
  await pause(1500);
  const c = await info(0), c1 = await info(1);
  check(c.phase === 'race' && c.me.v > 8 && c.me.total > b.me.total + 5, `GO starts the race and the kart drives off (${c.me.v.toFixed(1)} m/s, ${(c.me.total - b.me.total).toFixed(1)} m)`);
  check(c1.me.v > 8, `the second racer drives off too (${c1.me.v.toFixed(1)} m/s)`);
  check(c.ground === 'webgl', `the ground is drawn with WebGL (${c.ground})`);
}

// 2. Steering: hold left on the controller, then right.
{
  await call(0, 'place', 40, 0, 20);
  await pause(200);
  const h0 = (await info(0)).me.h;
  await page.evaluate(() => window.seats[0].pad({ x: -1 }));
  await pause(500);
  const h1 = (await info(0)).me.h;
  await page.evaluate(() => window.seats[0].pad({ x: 1 }));
  await pause(500);
  const h2 = (await info(0)).me.h;
  await page.evaluate(() => window.seats[0].pad({ x: 0 }));
  const turnL = Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0)), turnR = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1));
  check(turnL < -0.3 && turnR > 0.3, `holding left turns left (${turnL.toFixed(2)} rad) and right turns right (${turnR.toFixed(2)} rad)`);
}

// 3. An item box gives an item.
{
  const boxes = await call(0, 'boxes');
  const length = (await info(0)).length;
  // The first row of boxes is a fifth of the way round; drive into the second box from 8 m before.
  await call(0, 'place', length * 0.2 - 8, -1.8, 18);
  const got = await until(async () => { const i = await info(0); return i.me.item && !i.me.roll; }, 3000, 'an item');
  const i = await info(0);
  check(got && ['boost', 'banana', 'bomb', 'star'].includes(i.me.item), `driving through an item box gives an item (${i.me.item}, ${boxes.length} boxes, ${i.boxesUp} up)`);
  const other = await until(async () => (await info(1)).boxesUp < 12, 2000, 'the box to vanish for the other racer');
  check(other, 'the taken box disappears for the other racer too');
  await pause(300);
  await page.screenshot({ path: `${outDir}kart-item.png` });
}

// 4. A banana peel spins the other racer out, parts flying.
{
  const length = (await info(0)).length;
  await call(0, 'place', length * 0.32, 2, 0);
  await call(0, 'give', 'banana');
  await pause(100);
  await call(0, 'use');
  await until(async () => (await info(1)).bananas === 1, 3000, 'the peel to reach the other racer');
  const peel = (await call(0, 'bananaList'))[0];
  check(!!peel && (await info(1)).bananas === 1, 'a dropped banana peel shows for both racers');
  // Seat 1 drives straight into it from behind.
  await call(0, 'place', length * 0.5, 0, 0);
  await call(1, 'place', length * 0.32 - 8, 2, 16);
  const spun = await until(async () => (await info(1)).me.spin > 0, 3000, 'the spin');
  const s1 = await info(1);
  check(spun && s1.parts > 0, `driving over the peel spins the kart out with ${s1.parts} parts flying`);
  await pause(250);
  await page.screenshot({ path: `${outDir}kart-banana.png` });
  const seen = await until(async () => { const i = await info(0); return i.karts.find(k => k.id === 'client2')?.spin || i.counts.bursts > 0; }, 2000, 'the other racer to see the spin');
  const s0 = await info(0);
  check(seen && s0.counts.bursts > 0 && s0.bananas === 0, `the other racer sees the spin-out and its parts (${s0.counts.bursts} bursts) and the peel is gone`);
  void peel;
}

// 5. A bomb goes off.
{
  const length = (await info(0)).length;
  // Wait for the banana spin to end (a spinning kart can't be knocked again).
  await until(async () => (await info(1)).me.spin === 0 && (await info(0)).me.spin === 0, 3000, 'the spins to end');
  const hitsBefore = (await info(1)).counts.hits;
  await call(0, 'place', length * 0.4, 0, 20);
  await call(1, 'place', length * 0.4 + 18, 0, 0);
  await pause(200);
  await call(0, 'give', 'bomb');
  await pause(50);
  await call(0, 'use');
  await pause(500);
  await page.screenshot({ path: `${outDir}kart-bomb-flight.png` });
  const boom = await until(async () => (await info(0)).counts.explosions > 0 && (await info(1)).counts.explosions > 0, 4000, 'the explosion');
  await pause(120);
  await page.screenshot({ path: `${outDir}kart-bomb.png` });
  const b1 = await info(1);
  check(boom, `a thrown bomb explodes for both racers`);
  check(b1.counts.hits > hitsBefore, `the bomb knocks the kart near it into a spin (${b1.counts.hits - hitsBefore} new hit on seat 2)`);
}

// 6. Rookie bots race all three laps.
{
  await call(0, 'resetStats');
  await call(1, 'resetStats');
  const t0 = Date.now();
  await page.evaluate(async () => {
    const { driveRookie } = await import('../js/rookie.js');
    let step = 0;
    window.rookieTimer = setInterval(() => {
      step++;
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
    }, 400);
  });
  let mid = false;
  const done = await until(async () => {
    const a = await info(0);
    if (!mid && a.me && a.me.lap >= 2) {
      mid = true;
      await page.screenshot({ path: `${outDir}kart-race.png` });
      const s = await call(0, 'stats');
      console.log(`  frame time mid-race, seat 1: median ${s.frameMedian.toFixed(1)} ms between frames, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg, worst ${s.cpuWorst.toFixed(1)} ms`);
    }
    return a.phase === 'done';
  }, 240000, 'the race to finish');
  const a = await info(0), b = await info(1);
  console.log(`  race took ${((Date.now() - t0) / 1000).toFixed(0)} s of wall time`);
  check(done && a.results && a.results.length === 4, `the race finishes with a finishing order (${(a.results || []).map(r => `${r[1]} ${r[3] ? (r[3] / 1000).toFixed(1) + 's' : 'DNF'}`).join(', ')})`);
  const fin = (a.results || []).filter(r => r[3] > 0).map(r => r[0]);
  check(fin.includes('client1') && fin.includes('client2'), 'both rookie-driven racers complete three laps');
  check(a.me.laps === 3 && b.me.laps === 3, `laps count: ${a.me.laps} and ${b.me.laps} laps recorded`);
  check(JSON.stringify(a.results) === JSON.stringify(b.results), 'both racers see the same results');
  await pause(400);
  await page.screenshot({ path: `${outDir}kart-finish.png` });
  const s = await call(0, 'stats');
  console.log(`  frame time over the race, seat 1: median ${s.frameMedian.toFixed(1)} ms between frames, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg, worst ${s.cpuWorst.toFixed(1)} ms (two seats share one headless page)`);
  // Play again (a rookie bot presses the button too).
  const again = await until(async () => { const i = await info(0); return i.phase === 'count' || (i.phase === 'race' && i.raceTime < 10); }, 8000, 'a new race');
  check(again, 'Play again starts a new countdown');
  await page.evaluate(() => clearInterval(window.rookieTimer));
}

check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
server.close();
if (failed) process.exit(1);
