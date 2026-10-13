// Plays Beach Bump in test/game.html with phone-sized seats, moving each
// player's head with the mouse as a player would, and checks:
//   - a still head under the serve keeps the ball bouncing straight up to
//     the same height, launch after launch, on both seats;
//   - meeting the ball off-centre sends it into the other player's zone, and
//     that player (not the owner) heads it on: both seats see their touch;
//   - a ball nobody reaches drops in someone's zone and costs them (only
//     them) a life, on both seats, and the next serve hangs over them;
//   - both seats see the same ball (same launches, same place) throughout;
//   - a third seat (Cy) joining mid-game stands on the sand at once with
//     full lives, and the court widens with the ball carried across;
//   - debug-bot rookie moves (js/rookie.js) keep the ball up and pass it;
//   - when the owner leaves, the next seat runs the game on.
//   node chat/test/beachbump-play.mjs
// Pictures land in local/chat-shots/beachbump-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });
const { _physics: P } = await import('../games/beachbump.js');

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 3 * 402 + 30, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${server.url}/test/game.html?game=beachbump&n=3&hold=1&w=390&h=690&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats.slice(0, 2).every(s => s.gh.current?.instance?._view?.().ball && s.gh.current.instance._view().court.length === 2), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const ID = ['client1', 'client2', 'client3'];
const wait = ms => page.waitForTimeout(ms);
const shot = name => page.screenshot({ path: `${outDir}beachbump-${name}.png` });
// Every open seat's view at the same instant.
const views = () => page.evaluate(() => {
  const t = performance.timeOrigin + performance.now();
  return window.seats.map(s => s.gh.current?.instance?._view?.(t) ?? null);
});
const boxOf = () => page.evaluate(() => window.seats.map(s => {
  const r = s.el.querySelector('canvas.g-canvas')?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top } : null;
}));
let boxes = await boxOf();
// Put a seat's head at world (x, y) with the mouse.
async function headTo(seat, x, y = P.HEAD_Y) {
  const v = (await views())[seat];
  const m = v.map;
  await page.mouse.move(boxes[seat].x + m.ox + x * m.s, boxes[seat].y + m.gy - y * m.s);
}
const zoneLeft = (v, i) => (i * v.map.W) / v.map.n;
const zoneW = v => v.map.W / v.map.n;
const key = b => `${b.g}.${b.s}.${b.n}`;
const apex = b => b.y + (b.vy * b.vy) / (2 * P.G);

// Launches each seat has seen, by version, and how often the seats agreed.
const seen = [new Map(), new Map(), new Map()];
const agree = { same: 0, near: 0, off: 0, worst: 0, note: '' };
async function sample() {
  const v = await views();
  v.forEach((x, i) => { if (x?.ball) seen[i].set(key(x.ball), x.ball); });
  const open = v.filter(x => x?.ball);
  for (const x of open.slice(1)) {
    const a = open[0], b = x;
    if (key(a.ball) === key(b.ball) && JSON.stringify(a.ball) === JSON.stringify(b.ball)) {
      agree.same++;
      agree.worst = Math.max(agree.worst, Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y));
    } else if (a.ball.g === b.ball.g && a.ball.s === b.ball.s && Math.abs(a.ball.n - b.ball.n) <= 1) agree.near++;
    else if (a.ball.g === b.ball.g && Math.abs(a.ball.s - b.ball.s) <= 1 && (a.ball.n === 0 || b.ball.n === 0)) agree.near++;
    else { agree.off++; agree.note = `${key(a.ball)} vs ${key(b.ball)}`; }
  }
  return v;
}
async function until(fn, ms, step = 50) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await sample();
    const r = fn(v);
    if (r) return { v, r };
    if (Date.now() > end) return { v, r: null };
    await wait(step);
  }
}

// --- 1. a still head keeps it up -------------------------------------------
let v = await sample();
check(v[0].owner && !v[1].owner && v[0].court.join() === `${ID[0]},${ID[1]}` && v[1].court.join() === v[0].court.join(),
  'seat 1 owns the game; both seats stand on the sand in the same order');
const served = v[0].ball;
check(served.r === 0 && served.vx === 0 && served.vy === 0 && P.zoneIndex(served.x, 2, served.W) === 0 && Math.abs(served.y - P.SERVE_Y) < 1e-9,
  `the first serve hangs over Ana's zone (x ${served.x.toFixed(2)})`);
await headTo(1, zoneLeft(v[1], 1) + zoneW(v[1]) / 2);
await headTo(0, served.x);
await wait(600);
await shot('serve');
let res = await until(x => x[0].ball.r >= 5 && x[1].ball.r >= 5, 15000);
const s0 = served.s;
const stillHits = [...seen[0].values()].filter(b => b.s === s0 && b.k === 'hit');
const apexes = stillHits.map(apex);
check(res.r && stillHits.length >= 5 && apexes.every(a => Math.abs(a - P.SERVE_Y) < 1e-6) && stillHits.every(b => Math.abs(b.vx) < 1e-9 && b.by === ID[0]),
  `a still head bounces it straight back to the same height: ${stillHits.length} touches, apex ${apexes.map(a => a.toFixed(4)).join(', ')} (serve ${P.SERVE_Y})`);
const onBo = stillHits.map(b => seen[1].get(key(b)));
check(onBo.every((b, i) => b && JSON.stringify(b) === JSON.stringify(stillHits[i])),
  `Bo's seat saw the very same ${onBo.filter(Boolean).length} launches`);
check(res.v[0].ball.r === res.v[1].ball.r && res.v[0].best >= 5, `the touch counter agrees (${res.v[0].ball.r} / ${res.v[1].ball.r}; Ana's best ${res.v[0].best})`);
await shot('keepup');

// --- 2. an off-centre touch passes it to Bo, who heads it on ---------------
// Wait for the ball to rise off Ana's head, then lean: meet it on its left side.
res = await until(x => x[0].pos.vy > 0.6 && x[0].ball.by === ID[0], 5000);
const bx = res.v[0].ball.x;
await headTo(0, bx - 0.06);
res = await until(x => x[0].ball.by === ID[0] && x[0].ball.vx > 0.2, 5000);
const pass = res.v?.[0].ball;
const landing = res.v?.[0].landing;
check(!!res.r && P.zoneIndex(landing, 2, pass.W) === 1,
  `meeting it off-centre knocks it across to Bo's zone (vx ${pass?.vx.toFixed(2)}, comes down at x ${landing?.toFixed(2)})`);
await wait(250);
await shot('pass');
// Bo gets under it, a touch to the right of where it lands to calm it.
await headTo(1, landing + 0.025);
res = await until(x => x.slice(0, 2).every(y => y.ball.by === ID[1]), 5000);
check(!!res.r && key(res.v[0].ball) === key(res.v[1].ball),
  `Bo (not the owner) heads it on and both seats see his touch (${res.v[0].ball.by} / ${res.v[1].ball.by}, rally ${res.v[0].ball.r})`);
await wait(120);
await shot('bo-touch');

// --- 3. a miss costs a life --------------------------------------------------
// Both heads keep clear of wherever the ball will come down.
async function dodge(x) {
  for (const seat of [0, 1]) {
    const y = x[seat];
    if (y.landing == null || y.zone < 0) continue;
    const z0 = zoneLeft(y, y.zone), z1 = z0 + zoneW(y);
    if (y.landing < z0 || y.landing > z1) continue;
    const far = y.landing - z0 > z1 - y.landing ? z0 + P.HR : z1 - P.HR;
    if (!y.head || Math.abs(y.head.x - far) > 0.01) await headTo(seat, far);
  }
}
const livesBefore = (await views())[0].lives;
const resBefore = (await views())[0].res?.at ?? 0;
let dropped = null;
for (let k = 0; k < 120 && !dropped; k++) {
  const x = await sample();
  if (x[0].res && x[0].res.at !== resBefore && x[1].res?.at === x[0].res.at && x[1].lives[x[0].res.who] === x[0].lives[x[0].res.who]) dropped = x;
  else await dodge(x);
  await wait(80);
}
const who = dropped?.[0].res.who;
const lost = dropped ? Object.keys(livesBefore).filter(id => dropped[0].lives[id] !== livesBefore[id]) : [];
check(!!dropped && lost.length === 1 && lost[0] === who && dropped[0].lives[who] === livesBefore[who] - 1 && dropped[1].lives[who] === dropped[0].lives[who]
  && dropped[0].court[P.zoneIndex(dropped[0].res.x, 2, dropped[0].map.W)] === who,
  `the ball nobody reached drops in ${who}'s zone and costs ${who} (only) a life on both seats (${JSON.stringify(livesBefore)} → ${JSON.stringify(dropped?.[1].lives)})`);
await shot('drop');
const next = dropped?.[0].ball;
check(next?.k === 'serve' && next.r === 0 && dropped[0].court[P.zoneIndex(next.x, 2, next.W)] === who,
  `the next serve hangs over ${who}, the rally back at 0`);
// A deliberate miss: the server stands aside, the ball drops straight down.
const seatOf = ID.indexOf(who);
const z = dropped[0].court.indexOf(who);
await headTo(seatOf, zoneLeft(dropped[0], z) + (z === 0 ? zoneW(dropped[0]) - P.HR : P.HR));
const lb = dropped[0].lives[who];
res = await until(x => x[0].res?.at !== dropped[0].res.at && x[1].res?.at === x[0].res?.at && x[1].lives[who] === x[0].lives[who], 6000);
check(!!res.r && res.v[0].res.who === who && res.v[0].lives[who] === lb - 1 && res.v[1].lives[who] === lb - 1,
  `standing aside lets the serve fall: ${who} ${lb} → ${res.v?.[0].lives[who]} lives on both seats`);
await wait(200);

// --- 4. Cy joins mid-game ----------------------------------------------------
await page.evaluate(() => window.joinSeat(2));
res = await until(x => x.every(y => y && y.court.length === 3 && Math.abs(y.ball.W - P.courtWidth(3)) < 1e-9), 6000);
boxes = await boxOf();
check(!!res.r && res.v.every(y => y.lives[ID[2]] === P.LIVES && y.court[2] === ID[2]) && JSON.stringify(res.v[0].ball) === JSON.stringify(res.v[2].ball),
  `Cy joining mid-game stands on the sand at once with ${res.v?.[2].lives[ID[2]]} lives; the court widens to ${res.v?.[2].ball.W.toFixed(1)} on all seats`);
await wait(400);
await shot('join');

// --- 5. rookie bots ------------------------------------------------------------
const bots = await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  const hitters = new Set();
  let best = 0, step = 0, owner = null;
  const seen = new Set();
  await new Promise(done => {
    const t = setInterval(() => {
      step++;
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
      const v = window.seats[1].gh.current.instance._view();
      if (v.ball?.k === 'hit' && !seen.has(`${v.ball.s}.${v.ball.n}`)) {
        seen.add(`${v.ball.s}.${v.ball.n}`);
        hitters.add(v.ball.by);
        best = Math.max(best, v.ball.r);
      }
      if (step > 160) { clearInterval(t); done(); }
    }, 100);
  });
  return { hitters: [...hitters], best, touches: seen.size };
});
await sample();
check(bots.touches >= 5 && bots.hitters.length >= 2 && bots.best >= 2,
  `rookie bots head it about and pass it (${bots.touches} touches by ${bots.hitters.join(', ')}; best run ${bots.best})`);
await shot('bots');

// --- 6. the owner leaves ---------------------------------------------------------
await page.evaluate(() => window.leaveSeat(0));
res = await until(x => x[1] && x[2] && x[1].owner && !x[1].court.includes(ID[0]) && x[2].court.join() === x[1].court.join()
  && Math.abs(x[1].ball.W - P.courtWidth(x[1].court.length)) < 1e-9 && key(x[1].ball) === key(x[2].ball), 6000);
const before6 = res.v?.[1];
// Bo now rules: a ball that drops is ruled on, or the bots keep it up.
const after6 = await page.evaluate(async b => {
  const { driveRookie } = await import('../js/rookie.js');
  let step = 0;
  await new Promise(done => {
    const t = setInterval(() => {
      step++;
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
      if (step > 50) { clearInterval(t); done(); }
    }, 100);
  });
  return window.seats[1].gh.current.instance._view();
}, before6);
check(!!res.r && after6.owner && (after6.res?.at !== before6.res?.at || after6.ball.s !== before6.ball.s || after6.ball.n > before6.ball.n || after6.over),
  `when the owner leaves, Bo runs the game on (court ${after6.court.join(',')}, launch ${key(before6?.ball ?? { g: 0, s: 0, n: 0 })} → ${key(after6.ball)})`);
await shot('owner-left');

check(agree.off === 0 && agree.same > 20 * agree.near / 10 && agree.worst < 1e-6,
  `both seats see the same ball: ${agree.same} samples identical (worst ${agree.worst.toExponential(1)}), ${agree.near} a launch apart in transit, ${agree.off} diverged${agree.note ? ` (${agree.note})` : ''}`);
check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `${failed} checks failed` : 'all Beach Bump checks passed');
if (failed) process.exit(1);
