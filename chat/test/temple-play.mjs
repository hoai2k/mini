// Plays Temple Dash through test/game.html with two runners on phone-sized
// seats:
//   - both seats run the same seeded temple, start together after the
//     countdown, and stand still until it ends;
//   - real touch swipes: left and right change lanes, up jumps a root, down
//     slides under an arch, and a swipe the corner's way inside its window
//     turns; the controller stick changes lanes too;
//   - a stumble brings the monkeys up behind, a second soon after ends the run;
//   - running past a corner without turning goes off the edge, and the other
//     seat sees the puff and "Ana fell!";
//   - the other seat sees my runner in its scene at my distance;
//   - a tap runs again from the start while the other runner carries on;
//   - debug-bot rookie inputs (js/rookie.js) run both seats and survive a
//     while, running again after falls;
//   - a landscape seat draws too.
// Also measures frame times. Pictures land in local/chat-shots/temple-*.png.
//   node chat/test/temple-play.mjs
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
await page.goto(`${server.url}/test/game.html?game=temple&n=2&expr=0&w=400&h=720`);
await page.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const pause = ms => page.waitForTimeout(ms);
const info = (i, p = page) => p.evaluate(i => window.seats[i].gh.current.instance._test.info(), i);
const call = (i, fn, ...args) => page.evaluate(([i, fn, args]) => window.seats[i].gh.current.instance._test[fn](...args), [i, fn, args]);
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const rectOf = (i, sel) => page.evaluate(([i, sel]) => { const r = window.seats[i].el.querySelector(sel).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [i, sel]);
// A real swipe on seat i's game: dx, dy in pixels.
async function swipe(i, dx, dy) {
  const c = await rectOf(i, '.td-wrap canvas.g-canvas');
  const x = c.x + c.w / 2, y = c.y + c.h * 0.55;
  await touch('touchStart', x, y);
  for (let k = 1; k <= 4; k++) { await touch('touchMove', x + (dx * k) / 4, y + (dy * k) / 4); await pause(12); }
  await touch('touchEnd');
}
// A picture of both seats, drawn at full resolution for it.
async function shot(name, p = page) {
  await p.evaluate(() => window.seats.forEach(s => s.gh.current.instance._test.sharp(true)));
  await p.waitForTimeout(120);
  await p.screenshot({ path: `${outDir}${name}` });
  await p.evaluate(() => window.seats.forEach(s => s.gh.current.instance._test.sharp(false)));
}
async function tap(i) {
  const c = await rectOf(i, '.td-wrap canvas.g-canvas');
  await touch('touchStart', c.x + c.w / 2, c.y + c.h * 0.4);
  await pause(40);
  await touch('touchEnd');
}
// Seat i running (a seat left alone trips and gets caught; a tap runs again).
async function revive(i) {
  if ((await info(i)).alive) return;
  await tap(i);
  await until(async () => (await info(i)).alive, 2000, `seat ${i + 1} running again`);
}
const until = async (fn, ms, what) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await pause(60);
  }
  console.log(`  (timed out waiting for ${what})`);
  return false;
};

// 1. One temple for both, a countdown, then off they go.
{
  const a = await info(0), b = await info(1);
  check(a.seed > 0 && a.seed === b.seed && a.runSeed === a.seed && b.runSeed === a.seed, `both seats run the same temple (seed ${a.seed})`);
  check(a.phase === 'count' && b.phase === 'count', `the first run opens on a countdown on both seats (${a.phase}, ${b.phase})`);
  await shot('temple-start.png');
  const a2 = await info(0), b2 = await info(1);
  const seen = b2.remote.find(r => r.id === 'client1');
  check(a2.s === 0 && seen && seen.a === 5 && seen.d === 0, `runners stand still during the countdown, and are drawn standing at the start (${seen?.d.toFixed(1)} m)`);
  await until(async () => (await info(0)).phase === 'run' && (await info(1)).phase === 'run', 6000, 'GO');
  await pause(800);
  const c = await info(0), d = await info(1);
  check(c.s > 3 && d.s > 3 && Math.abs(c.s - d.s) < 3, `both run off together (${c.s.toFixed(1)} m and ${d.s.toFixed(1)} m)`);
  check(c.scene === 'webgl', `the temple is drawn with WebGL (${c.scene})`);
}

// 2. Swipes left and right change lanes; the stick does too.
{
  await call(0, 'place', 8, 0);
  await call(0, 'scale', 0.25);
  await swipe(0, -70, 0);
  await pause(300);
  const a = await info(0);
  check(a.lane === -1 && Math.abs(a.x + 1.6) < 0.05, `a swipe left moves to the left lane (lane ${a.lane}, x ${a.x.toFixed(2)})`);
  await swipe(0, 70, 0);
  await pause(200);
  await swipe(0, 70, 0);
  await pause(300);
  const b = await info(0);
  check(b.lane === 1 && Math.abs(b.x - 1.6) < 0.05, `two swipes right move to the right lane (lane ${b.lane}, x ${b.x.toFixed(2)})`);
  await page.evaluate(() => window.seats[0].pad({ x: -1 }));
  await pause(120);
  await page.evaluate(() => window.seats[0].pad({ x: 0 }));
  await pause(250);
  check((await info(0)).lane === 0, 'the controller stick moves one lane');
}

// 3. Swipe up jumps a root.
{
  const root = await call(0, 'find', 'root', 20);
  await call(0, 'place', root.s - 4.2, 0);
  await call(0, 'scale', 0.12);
  await swipe(0, 0, -80);
  const up = await until(async () => (await info(0)).y > 0.9, 3000, 'the jump');
  await shot('temple-jump.png');
  await until(async () => (await info(0)).s > root.s + root.len + 1.5, 8000, 'passing the root');
  const a = await info(0);
  check(up && a.alive && a.stumbles === 0 && a.maxY > 1, `a swipe up jumps the root (top ${a.maxY.toFixed(2)} m, ${a.stumbles} stumbles)`);
}

// 4. Swipe down slides under an arch.
{
  const arch = await call(0, 'find', 'arch', 20);
  // Coming up to it: the beam across the whole walkway and the "Slide!" cue.
  await call(0, 'place', arch.s - 14, 0);
  await call(0, 'scale', 0.05);
  await new Promise(r => setTimeout(r, 400));
  await shot('temple-beam-ahead.png');
  await call(0, 'place', arch.s - 3.2, 0);
  await call(0, 'scale', 0.12);
  await swipe(0, 0, 80);
  const low = await until(async () => (await info(0)).slide > 0, 2000, 'the slide');
  await until(async () => (await info(0)).s > arch.s - 0.6, 6000, 'reaching the arch');
  await shot('temple-slide.png');
  await until(async () => (await info(0)).s > arch.s + arch.len + 1, 6000, 'passing the arch');
  const a = await info(0);
  check(low && a.alive, `a swipe down slides under the arch (${a.alive ? 'still running' : a.cause})`);
  // Without sliding the arch is a crash.
  await call(0, 'place', arch.s - 3, 0);
  await until(async () => !(await info(0)).alive, 6000, 'the crash');
  const b = await info(0);
  check(!b.alive && b.cause === 'crash', `running into an arch upright is a crash (${b.cause})`);
  await pause(600);
  await tap(0);
  await until(async () => (await info(0)).alive, 2000, 'running again');
}

// 5. A swipe the corner's way, inside its window, turns.
{
  await call(0, 'scale', 1);
  await pause(200);
  const c = await call(0, 'corner', 0);
  await call(0, 'place', c.window[0] + 1.5, 0);
  await call(0, 'scale', 0.15);
  await swipe(0, c.dir * 70, 0);
  await until(async () => (await info(0)).turned === 0 || (await info(0)).g === 1, 2000, 'the turn');
  await call(0, 'scale', 0.4);
  await until(async () => (await info(0)).s > c.D + 4, 8000, 'running on round the corner');
  await call(0, 'scale', 0.05);
  await pause(400);
  await shot('temple-turn.png');
  const a = await info(0);
  check(a.alive && a.g === 1 && a.lane === 0, `swiping ${c.dir > 0 ? 'right' : 'left'} at the corner turns onto the next stretch (segment ${a.g}, lane ${a.lane})`);
}

// 6. The other seat sees me in its scene where I am.
{
  await call(0, 'scale', 0.25);
  await call(1, 'scale', 0.25);
  const free = 14;
  await revive(1);
  await call(1, 'place', free, 0);
  await call(0, 'place', free + 9, 1);
  await pause(900);
  const a = await info(0), b = await info(1);
  const seen = b.remote.find(r => r.id === 'client1');
  check(seen && seen.live && Math.abs(seen.d - a.s) < 2 && Math.abs(seen.x - a.x) < 0.3, `seat 2 has seat 1 at ${seen?.d.toFixed(1)} m in lane x ${seen?.x.toFixed(2)} (really ${a.s.toFixed(1)} m, ${a.x.toFixed(2)})`);
  const r = await rectOf(1, '.td-wrap canvas.g-canvas');
  check(seen?.shown && seen.shown.x > 0 && seen.shown.x < r.w && seen.shown.y > 0 && seen.shown.y < r.h && seen.shown.x > r.w / 2, `and draws Ana's runner in its scene ahead and to the right (${seen?.shown ? `${seen.shown.x.toFixed(0)}, ${seen.shown.y.toFixed(0)}` : 'not drawn'})`);
  await shot('temple-friend.png');
}

// 7. A stumble brings the monkeys; a second one soon after and they catch you.
{
  await call(0, 'scale', 0.3);
  const root = await call(0, 'find', 'root', 20);
  await call(0, 'place', root.s - 3, 0);
  await until(async () => (await info(0)).stumbles > 0, 4000, 'the stumble');
  await pause(500);
  const a = await info(0);
  check(a.alive && a.stumbles === 1 && a.chase > 0.8 && a.monkeys > 0.3, `tripping on a root brings the monkeys up behind (chase ${a.chase.toFixed(2)}, monkeys ${a.monkeys.toFixed(2)})`);
  await shot('temple-monkeys.png');
  // The next root or fire, straight away (the monkeys still close behind).
  const root2 = await call(0, 'find', 'root', root.s + 5);
  const fire = await call(0, 'find', 'fire', root.s + 5);
  const next = !fire || (root2 && root2.s < fire.s) ? root2 : fire;
  const lane = next.type === 'fire' ? [0, 1, 2].find(l => next.mask & (1 << l)) - 1 : 0;
  await call(0, 'place', next.s - 3, lane, true);
  await until(async () => !(await info(0)).alive, 5000, 'being caught');
  const b = await info(0);
  check(!b.alive && b.cause === 'caught', `a second stumble while they're close and the monkeys catch you (${b.cause || 'still running'})`);
  await pause(800);
  await shot('temple-caught.png');
  await tap(0);
  await until(async () => (await info(0)).alive, 2000, 'running again');
}

// 8. Missing a turn runs off the edge; both seats see it; a tap runs again.
{
  await call(0, 'scale', 1);
  await call(1, 'scale', 1);
  const c = await call(0, 'corner', 0);
  const before = (await info(1)).counts.falls;
  await revive(1);
  await call(1, 'place', c.D - 26, 0);
  await call(0, 'place', c.D - 16, 0);
  await until(async () => !(await info(0)).alive, 5000, 'the fall');
  const a = await info(0);
  check(!a.alive && a.cause === 'edge', `running past the corner without turning goes off the edge (${a.cause})`);
  // Seat 2 turns in time and watches it.
  await call(1, 'scale', 0.2);
  await swipe(1, c.dir * 70, 0);
  const seen = await until(async () => { const b = await info(1); return b.counts.falls > before && b.floaters.includes('Ana fell!'); }, 3000, 'seat 2 to see the fall');
  await shot('temple-fell.png');
  const b = await info(1);
  check(seen && b.counts.fellSeen.includes('client1'), `the other seat sees the puff and "Ana fell!" (${b.floaters.join(', ')})`);
  const card = await until(async () => (await info(0)).card, 2000, 'the run-again card');
  check(card, 'the fallen runner gets a card with Run again');
  const n0 = a.n;
  await pause(300);
  await tap(0);
  await until(async () => (await info(0)).alive, 2000, 'running again');
  await pause(500);
  const d = await info(0), e = await info(1);
  check(d.alive && d.n === n0 + 1 && d.s < 15 && d.seed === a.seed, `a tap runs again from the start of the same temple (run ${d.n}, ${d.s.toFixed(1)} m)`);
  check(e.remote.find(r => r.id === 'client1')?.n === d.n, 'the other seat picks up the new run');
}

// 9. Rookie bots run both seats.
{
  await call(0, 'scale', 1);
  await call(1, 'scale', 1);
  await call(0, 'place', 0, 0);
  await call(1, 'place', 0, 0);
  await call(0, 'resetStats');
  await call(1, 'resetStats');
  const runs0 = [(await info(0)).n, (await info(1)).n];
  await page.evaluate(async () => {
    const { driveRookie } = await import('../js/rookie.js');
    let step = 0;
    window.rookieTimer = setInterval(() => {
      step++;
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
    }, 400);
  });
  const best = [0, 0];
  let pictured = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    for (const i of [0, 1]) best[i] = Math.max(best[i], (await info(i)).s);
    if (!pictured && best[0] > 150) {
      pictured = true;
      const s = await call(0, 'stats');
      console.log(`  frame time mid-run, seat 1: median ${s.frameMedian.toFixed(1)} ms between frames, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg, worst ${s.cpuWorst.toFixed(1)} ms; temple drawn at ${s.glScale}x`);
      await shot('temple-bots.png');
    }
    await pause(250);
  }
  await page.evaluate(() => clearInterval(window.rookieTimer));
  const a = await info(0), b = await info(1);
  console.log(`  bots: best ${best[0].toFixed(0)} m and ${best[1].toFixed(0)} m; runs ${a.n - runs0[0] + 1} and ${b.n - runs0[1] + 1}; ${a.counts.jumps + b.counts.jumps} jumps, ${a.counts.slides + b.counts.slides} slides, ${a.counts.turns + b.counts.turns} turns, ${a.counts.coins + b.counts.coins} coins`);
  check(best[0] > 200 && best[1] > 200, `rookie bots run and survive a while (best ${best[0].toFixed(0)} m and ${best[1].toFixed(0)} m)`);
  check(a.counts.turns > 0 && a.counts.jumps > 0 && a.counts.slides > 0, 'the bots jump, slide and turn');
  check(a.alive || a.card || a.phase === 'dead', 'a bot that falls is back running or about to be');
  const s = await call(0, 'stats');
  console.log(`  frame time over the bot runs, seat 1: median ${s.frameMedian.toFixed(1)} ms, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg (two seats share one headless page with software WebGL)`);
  const bench = await call(0, 'bench', 20);
  console.log(`  one frame, seat 1: temple ${bench.scene.toFixed(2)} ms (${bench.glPixels} px, ${bench.kind}), overlay ${bench.overlay.toFixed(2)} ms`);
}

// 10. The owner leaves: the other runner keeps the temple and runs on; joining
// again mid-game, the first seat just starts running on the same temple.
{
  const seed = (await info(1)).seed;
  await revive(1);
  await call(1, 'place', 6, 0);     // the clear opening stretch, so nothing trips it meanwhile
  const before = (await info(1)).s;
  await page.evaluate(() => window.seats[0].gh.close());
  await pause(1200);
  const b = await info(1);
  const shared = await page.evaluate(() => window.seats[1].gh.current.api.shared());
  const owns = await page.evaluate(() => window.seats[1].gh.current.api.isOwner());
  check(b.alive && b.s > before && b.seed === seed && shared?.seed === seed && owns, `when the owner leaves, the other runner owns the same temple and keeps running (${b.s.toFixed(0)} m)`);
  await page.evaluate(() => { const s = window.seats[0]; s.gh.join(s.gh.sessions().find(x => x.id === 'temple')); });
  await until(async () => page.evaluate(() => !!window.seats[0].gh.current), 3000, 'the rejoin');
  const ready = await until(async () => { const a = await info(0); return a.phase === 'count' || a.phase === 'run'; }, 3000, 'the joiner to get ready');
  const counted = (await info(0)).phase === 'count';
  const running = await until(async () => (await info(0)).phase === 'run' && (await info(0)).s > 2, 5000, 'the joiner to run');
  const a = await info(0);
  check(ready && counted && running && a.seed === seed, `joining mid-game, a short "get ready" and off on the same temple (${a.s.toFixed(1)} m)`);
  await shot('temple-join.png');
}

// 11. Landscape.
{
  const p2 = await browser.newPage({ viewport: { width: 1640, height: 520 } });
  p2.on('pageerror', e => errors.push(e.message));
  await p2.goto(`${server.url}/test/game.html?game=temple&n=2&expr=0&w=780&h=420`);
  await p2.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current), null, { timeout: 20000 });
  await p2.waitForFunction(() => window.seats[0].gh.current.instance._test.info().phase === 'run', null, { timeout: 8000 });
  await p2.evaluate(() => { const t = window.seats[0].gh.current.instance._test; const f = t.find('arch', 20); t.place(f.s - 14, 0); t.scale(0.1); const u = window.seats[1].gh.current.instance._test; u.place(f.s - 22, -1); u.scale(0.1); });
  await p2.waitForTimeout(700);
  await shot('temple-landscape.png', p2);
  const a = await info(0, p2);
  check(a.scene === 'webgl' && a.alive, 'a landscape seat draws the temple');
  await p2.close();
}

check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
server.close();
if (failed) process.exit(1);
