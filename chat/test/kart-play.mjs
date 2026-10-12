// Plays Kart Dash through test/game.html with two racers (plus two computer
// karts) on phone-sized seats:
//   - the countdown holds everyone on the grid, then GO starts the race and
//     the karts drive off on their own (auto-accelerate);
//   - touch: dragging a finger right of where it went down turns right, left
//     turns left, dragging it well down brakes (and reverses), sliding back up
//     lets go, and a second finger starts a drift; the controller stick steers;
//   - driving through an item box gives an item, a second box a second item
//     (the item button shows both), and using one leaves the other;
//   - a banana peel dropped by one racer spins the other out with kart parts
//     flying, and both see it;
//   - a thrown bomb goes off for both;
//   - a third seat that joins after GO gets a kart on the road behind the
//     last racer, held for a countdown of its own, then drives; it is last in
//     both other seats' standings and shows in the results marked as late;
//   - debug-bot rookie inputs (js/rookie.js) drive the karts round all three
//     laps, the laps count, and the race ends with a finishing order;
//   - a fourth seat that joins once the first racer has finished watches
//     ("Next race starts soon") and races in the next one.
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
await page.goto(`${server.url}/test/game.html?game=kart&n=4&hold=2&expr=0&w=400&h=720`);
await page.waitForFunction(() => window.ready === true && window.seats.slice(0, 2).every(s => s.gh.current), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const pause = ms => page.waitForTimeout(ms);
const info = i => page.evaluate(i => window.seats[i].gh.current?.instance._test.info() ?? null, i);
const seatShot = async (i, name) => { await page.locator('.seat').nth(i).screenshot({ path: `${outDir}${name}` }); await page.evaluate(() => scrollTo(0, 0)); };
const call = (i, fn, ...args) => page.evaluate(([i, fn, args]) => window.seats[i].gh.current.instance._test[fn](...args), [i, fn, args]);
// Real touches through the DevTools protocol (they arrive as touch pointer events).
const cdp = await page.context().newCDPSession(page);
const fingers = new Map();       // id -> [x, y]
// Each event names only the finger it's about (as Puppeteer's touch handles do).
const touchOne = (type, id) => { const [x, y] = fingers.get(id); return cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x, y, id }] }); };
const down = async (id, x, y) => { fingers.set(id, [x, y]); await touchOne('touchStart', id); };
const move = async (id, x, y, steps = 6) => {
  const [x0, y0] = fingers.get(id);
  for (let i = 1; i <= steps; i++) {
    fingers.set(id, [x0 + ((x - x0) * i) / steps, y0 + ((y - y0) * i) / steps]);
    await touchOne('touchMove', id);
    await pause(16);
  }
};
const up = async id => { await touchOne('touchEnd', id); fingers.delete(id); };
const rectOf = (i, sel) => page.evaluate(([i, sel]) => { const r = window.seats[i].el.querySelector(sel).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, [i, sel]);
const turned = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
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

// 1b. A third racer joins after GO: a kart behind the last one, a countdown of its own, then off.
{
  await page.evaluate(() => window.joinSeat(2));
  const got = await until(async () => !!(await info(2))?.me, 6000, 'the late kart');
  const j = await info(2), a = await info(0);
  const others = a.karts.filter(k => k.id !== 'client3');
  const rear = Math.min(...others.map(k => k.total));
  const gap = Math.min(...others.map(k => Math.hypot(k.x - j.me.x, k.z - j.me.z)));
  check(got && j.late && j.myTime < -1 && j.phase === 'race', `a racer joining after GO gets a kart at once, held for a countdown of their own (${j?.myTime?.toFixed(1)} s to go)`);
  check(j.me.total < rear - 5 && gap > 4 && !j.me.offroad && Math.abs(j.me.d) < 7, `it starts on the road behind the last kart (${j.me.total.toFixed(1)} m vs ${rear.toFixed(1)} m, ${gap.toFixed(1)} m clear, ${j.me.d.toFixed(1)} m off centre)`);
  check(j.me.lap === 1 && j.order.at(-1) === 'client3' && j.rank === others.length + 1, `on lap 1 in last place (${j.rank}${j.order.length ? ' of ' + j.order.length : ''})`);
  const seen = await until(async () => (await info(0)).order.at(-1) === 'client3' && (await info(1)).order.at(-1) === 'client3', 3000, 'the others to see the late kart');
  check(seen, 'both other racers see it, last in their standings');
  await pause(600);
  await seatShot(2, 'kart-late-countdown.png');
  const k = await info(2);
  check(k.myTime < 0 && k.me.v === 0 && Math.hypot(k.me.x - j.me.x, k.me.z - j.me.z) < 0.01, 'its kart waits during its countdown');
  const go = await until(async () => (await info(2)).myTime > 1.2, 6000, 'its GO');
  const m = await info(2);
  check(go && m.me.v > 8 && m.me.total > j.me.total + 5, `after its GO it drives off (${m.me.v.toFixed(1)} m/s) and its race clock started at its own GO (${m.myTime.toFixed(1)} s)`);
  await seatShot(2, 'kart-late-go.png');
  const a2 = await info(0), b2 = await info(1);
  check(a2.order.includes('client3') && b2.order.includes('client3') && a2.order.length === 5 && b2.order.length === 5, `it is in both seats' standings (${a2.order.join(', ')})`);
}

// 2. Touch steering on seat 1: drag from where the finger goes down.
{
  const c = await rectOf(0, '.kd-wrap canvas.g-canvas');
  const vh = page.viewportSize().height;
  // Touch down a little left of centre (the anchor is the touch point, not the centre).
  const x0 = c.x + c.w * 0.4, y0 = Math.min(c.y + c.h * 0.5, vh - 140);
  const t = await call(0, 'touch');
  console.log(`  seat ${t.w}x${t.h}: full lock ${Math.max(48, Math.min(100, Math.min(t.w, t.h) * 0.14)).toFixed(0)} px sideways, brake ${Math.max(48, Math.min(110, t.h * 0.1)).toFixed(0)} px down`);
  await call(0, 'place', 40, 0, 20);
  await down(1, x0, y0);
  await pause(250);
  const a = await info(0), ta = await call(0, 'touch');
  check(ta.drag && Math.abs(ta.steer) < 0.05 && a.me.v > 15, `a finger resting where it went down (left of centre) steers straight (${ta.steer.toFixed(2)})`);
  await move(1, x0 + 70, y0);
  await pause(450);
  const b = await info(0), tb = await call(0, 'touch');
  const turnR = turned(a.me.h, b.me.h);
  check(tb.drag.steer === 1 && turnR > 0.3, `dragging right turns right (steer ${tb.drag.steer.toFixed(2)}, ${turnR.toFixed(2)} rad)`);
  await page.screenshot({ path: `${outDir}kart-steer.png` });
  // Back the other way: the anchor followed past full lock, so this is full left at once.
  await call(0, 'place', 40, 0, 20);
  const b2 = await info(0);
  await move(1, x0 - 70, y0);
  await pause(450);
  const d = await info(0), td = await call(0, 'touch');
  const turnL = turned(b2.me.h, d.me.h);
  check(td.drag.steer === -1 && turnL < -0.3, `dragging left turns left (steer ${td.drag.steer.toFixed(2)}, ${turnL.toFixed(2)} rad)`);
  // A small drift of the finger back near the anchor steers gently.
  await move(1, td.drag.x0 + c.x + 18, y0);
  await pause(150);
  const tg = await call(0, 'touch');
  check(tg.drag.steer > 0 && tg.drag.steer < 0.35, `a small drag steers gently (${tg.drag.steer.toFixed(2)})`);
  await up(1);
  await pause(200);
  check(!(await call(0, 'touch')).drag, 'lifting the finger lets go of the steering');

  // Dragging down brakes, keeps going into reverse, and sliding back up lets go.
  await call(0, 'place', 40, 0, 22);
  await down(1, x0, y0 - 40);
  await pause(150);
  await move(1, x0, y0 - 40 + 30);
  await pause(300);
  const e0 = await info(0);
  check(!(await call(0, 'touch')).drag.brake && e0.me.v > 18, `a short drag down doesn't brake (${e0.me.v.toFixed(1)} m/s)`);
  await move(1, x0, y0 - 40 + 100);
  await pause(700);
  const e1 = await info(0);
  check((await call(0, 'touch')).drag.brake && e1.me.v < 8, `dragging well down brakes the kart (${e0.me.v.toFixed(1)} -> ${e1.me.v.toFixed(1)} m/s)`);
  await pause(700);
  const e2 = await info(0);
  check(e2.me.v < 0, `still holding it down reverses (${e2.me.v.toFixed(1)} m/s)`);
  await move(1, x0, y0 - 40 + 20);
  await pause(800);
  const e3 = await info(0);
  check(!(await call(0, 'touch')).drag.brake && e3.me.v > 5, `sliding back up lets go and the kart drives on (${e3.me.v.toFixed(1)} m/s)`);
  await up(1);

  // A second finger while steering starts a drift (with a hop); letting it go ends it.
  await call(0, 'place', 40, 0, 22);
  await pause(100);
  await down(1, x0, y0);
  await move(1, x0 + 50, y0);
  await down(2, c.x + c.w * 0.75, y0 - 120);
  const drifted = await until(async () => (await info(0)).me.drift !== 0, 1500, 'the drift');
  const f = await info(0), tf = await call(0, 'touch');
  check(drifted && f.me.drift === 1 && tf.extra === 1, `a second finger while steering right starts a drift to the right (${f.me.drift})`);
  await pause(250);
  await page.screenshot({ path: `${outDir}kart-drift.png` });
  await up(2);
  await pause(200);
  check((await info(0)).me.drift === 0, 'lifting the second finger ends the drift');
  await up(1);
}

// 2b. The controller stick steers too.
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
  const turnL = turned(h0, h1), turnR = turned(h1, h2);
  check(turnL < -0.3 && turnR > 0.3, `the stick turns left (${turnL.toFixed(2)} rad) and right (${turnR.toFixed(2)} rad)`);
}

// 3. An item box gives an item; a second box a second one; using one leaves the other.
{
  const boxes = await call(0, 'boxes');
  const length = (await info(0)).length;
  // The first row of boxes is a fifth of the way round; drive into the second box from 8 m before.
  await call(0, 'place', length * 0.2 - 8, -1.8, 18);
  const got = await until(async () => { const i = await info(0); return i.me.item && !i.me.roll; }, 3000, 'an item');
  const i = await info(0);
  check(got && ['boost', 'banana', 'bomb', 'star'].includes(i.me.item) && i.me.items.length === 1, `driving through an item box gives an item (${i.me.item}, ${boxes.length} boxes, ${i.boxesUp} up)`);
  const other = await until(async () => (await info(1)).boxesUp < 12, 2000, 'the box to vanish for the other racer');
  check(other, 'the taken box disappears for the other racer too');
  await pause(300);
  await page.screenshot({ path: `${outDir}kart-item.png` });
  // The next row of boxes, just under halfway round.
  await call(0, 'place', length * 0.47 - 8, 1.8, 18);
  const got2 = await until(async () => { const j = await info(0); return j.me.items.length === 2 && !j.me.roll; }, 3000, 'a second item');
  const j = await info(0);
  check(got2 && j.me.items[0] === i.me.item && j.me.items.length === 2, `a second box fills the second slot (${j.me.items.join(' + ')})`);
  const nextShown = await page.evaluate(() => !window.seats[0].el.querySelector('.kd-next').classList.contains('empty'));
  check(nextShown, 'the item button shows the queued item beside the current one');
  await call(0, 'place', length * 0.55, 0, 0);
  await pause(200);
  await page.screenshot({ path: `${outDir}kart-two-items.png` });
  // Use one with a tap on the item button: the second moves up. (Swapped for a
  // boost and a star first, so no peel or bomb is left lying for the next test.)
  await call(0, 'give', 'boost');
  await call(0, 'give', 'star', true);
  const btn = await rectOf(0, '.kd-item');
  await down(5, btn.x + btn.w / 2, btn.y + btn.h / 2);
  await pause(60);
  const tapTouch = await call(0, 'touch');
  await up(5);
  const used = await until(async () => (await info(0)).me.items.length === 1, 1500, 'the item to be used');
  await pause(500);
  const k = await info(0);
  check(used && k.me.items.length === 1 && k.me.items[0] === 'star' && k.me.boost > 0, `tapping the item button uses the first item and the second moves up (${k.me.items.join(', ')})`);
  check(!tapTouch.drag, 'a finger on the item button does not steer');
  await pause(200);
  check(await page.evaluate(() => window.seats[0].el.querySelector('.kd-next').classList.contains('empty')), 'the queued slot is greyed out again');
}

// 4. A banana peel spins the other racer out, parts flying.
{
  const length = (await info(0)).length;
  await call(0, 'place', length * 0.32, 2, 0);
  await call(0, 'give', 'banana');
  await pause(100);
  await call(0, 'use');
  // (Computer karts may have peels down too: look for mine by its id.)
  const mineOf = async i => (await call(i, 'bananaList')).find(b => b.id.startsWith('client1.'));
  await until(async () => !!(await mineOf(1)), 3000, 'the peel to reach the other racer');
  const peel = await mineOf(0);
  check(!!peel && (await mineOf(1))?.id === peel.id, 'a dropped banana peel shows for both racers');
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
  const gone = !(await call(0, 'bananaList')).some(b => b.id === peel?.id);
  check(seen && s0.counts.bursts > 0 && gone, `the other racer sees the spin-out and its parts (${s0.counts.bursts} bursts) and the peel is gone`);
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
  let mid = false, joined4 = false, wait4 = null;
  const done = await until(async () => {
    const a = await info(0);
    if (!mid && a.me && a.me.lap >= 2) {
      mid = true;
      await page.screenshot({ path: `${outDir}kart-race.png` });
      const s = await call(0, 'stats');
      console.log(`  frame time mid-race, seat 1: median ${s.frameMedian.toFixed(1)} ms between frames, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg, worst ${s.cpuWorst.toFixed(1)} ms`);
    }
    // Once the first racer is over the line, a fourth seat joins: it should wait for the next race.
    if (!joined4 && a.phase === 'race' && a.cl && a.karts.some(k => k.finished > 0)) {
      joined4 = true;
      await page.evaluate(() => window.joinSeat(3));
    }
    if (joined4 && !wait4) {
      const d = await info(3);
      if (d && d.phase === 'race') {
        await pause(1200);
        const d2 = await info(3);
        if (d2 && d2.phase === 'race') {
          wait4 = d2;
          await seatShot(3, 'kart-late-wait.png');
        }
      }
    }
    return a.phase === 'done';
  }, 240000, 'the race to finish');
  check(joined4 && wait4 && !wait4.me && wait4.note === 'next' && !wait4.racers.includes('client4'), `a racer joining after the first finisher watches and waits for the next race (${wait4 ? wait4.note : 'not seen during the race'})`);
  const a = await info(0), b = await info(1);
  console.log(`  race took ${((Date.now() - t0) / 1000).toFixed(0)} s of wall time`);
  check(done && a.results && a.results.length === 5, `the race finishes with a finishing order (${(a.results || []).map(r => `${r[1]} ${r[3] ? (r[3] / 1000).toFixed(1) + 's' : 'DNF'}`).join(', ')})`);
  const fin = (a.results || []).filter(r => r[3] > 0).map(r => r[0]);
  check(fin.includes('client1') && fin.includes('client2'), 'both rookie-driven racers complete three laps');
  check(a.me.laps === 3 && b.me.laps === 3, `laps count: ${a.me.laps} and ${b.me.laps} laps recorded`);
  check(JSON.stringify(a.results) === JSON.stringify(b.results), 'both racers see the same results');
  const late = (a.results || []).find(r => r[0] === 'client3');
  check(late && late[5] === 1 && a.results.filter(r => r[5] === 1).length === 1, `the late joiner is in the results, marked as joined late (${late ? late[1] + ' ' + (late[3] ? (late[3] / 1000).toFixed(1) + 's' : 'DNF') : 'missing'})`);
  await pause(400);
  const shown = await page.evaluate(() => window.seats[0].el.querySelector('.kd-res')?.textContent || '');
  check(shown.includes('joined late'), 'the results show "joined late" beside them');
  await page.screenshot({ path: `${outDir}kart-finish.png` });
  const s = await call(0, 'stats');
  console.log(`  frame time over the race, seat 1: median ${s.frameMedian.toFixed(1)} ms between frames, p90 ${s.frameP90.toFixed(1)} ms; JS ${s.cpuAvg.toFixed(2)} ms avg, worst ${s.cpuWorst.toFixed(1)} ms (two seats share one headless page)`);
  // Play again (a rookie bot presses the button too).
  const again = await until(async () => { const i = await info(0); return i.phase === 'count' || (i.phase === 'race' && i.raceTime < 10); }, 8000, 'a new race');
  check(again, 'Play again starts a new countdown');
  const next = await until(async () => { const i = await info(3); return i && i.racers.includes('client4') && i.me; }, 6000, 'the waiting racer on the next grid');
  const n4 = await info(3);
  check(next && n4.racers.length === 4 && n4.ai === 0, `the racer who waited is on the grid for the next race (${n4?.racers.join(', ')}, ${n4?.ai} computer karts)`);
  await page.evaluate(() => clearInterval(window.rookieTimer));

  // 7. The owner leaves mid-race: the race goes on under the next owner, and
  // coming back puts them on the road behind the last kart, not on the grid.
  await until(async () => { const i = await info(1); return i.phase === 'race' && i.raceTime > 2; }, 12000, 'the new race to get going');
  await page.evaluate(() => window.leaveSeat(0));
  await pause(1500);
  const o = await info(1);
  check(o.phase === 'race' && o.me && o.me.v > 5 && o.racers.length === 4, `the race goes on after the owner leaves (${o.phase}, ${o.me?.v.toFixed(1)} m/s)`);
  await page.evaluate(() => window.joinSeat(0));
  const back = await until(async () => !!(await info(0))?.me, 6000, 'the owner back in');
  const r = await info(0), r1 = await info(1);
  const rear = Math.min(...r1.karts.filter(k => k.id !== 'client1').map(k => k.total));
  check(back && r.late && r.myTime < 0 && r.me.total < rear && r1.lt.some(e => e[0] === 'client1'), `coming back mid-race puts them behind the last kart with a countdown (${r.me?.total.toFixed(1)} m vs ${rear.toFixed(1)} m)`);
}

check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
server.close();
if (failed) process.exit(1);
