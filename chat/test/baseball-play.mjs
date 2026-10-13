// Plays the tabletop Baseball board in test/game.html on phone-sized seats.
//   - Two seats: Ana bats (top of the 1st) and Bo pitches; the pitch buttons
//     show only for Bo, and the board and line-up agree on both seats.
//   - Bo's fastball rolls down the groove on both seats.
//   - Ana holds (pointer down) to pull the bat back, the spring winds up, and
//     lets go timed to the pitch: the bat swings, meets the ball and both
//     seats roll the very same ball into the very same pocket (or spot), the
//     owner records that outcome, and runners, count and score agree.
//   - Takes and a used-up vanishing pitch; three outs switch sides: Bo bats,
//     Ana pitches.
//   - A third seat (Cy) joining mid-game is put in a team's batting order,
//     watches the same board and is told where they are in the order.
//   - Debug-bot rookie moves (js/rookie.js) pitch and swing for every seat,
//     and the next seat runs the game when the owner leaves.
//   - Alone, the computer pitches and the player bats.
//   - Landscape: the board with the scoreboard and controls beside it.
//   node chat/test/baseball-play.mjs
// Pictures land in local/chat-shots/baseball-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const errors = [];

async function open(query, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/test/game.html?game=baseball&expr=0&${query}`);
  await page.waitForFunction(() => window.ready === true && window.seats.some(s => s.gh.current), null, { timeout: 20000 });
  return page;
}
const views = page => page.evaluate(() => window.seats.map(s => s.gh.current?.instance._view() ?? null));
async function until(page, fn, arg, ms = 15000) {
  try {
    await page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
    return true;
  } catch {
    return false;
  }
}

// Clicks a pitch button on seat i.
async function pitch(page, i, type = 'fast') {
  await until(page, i => window.seats[i].gh.current.instance._view().buttons, i, 25000);
  return page.evaluate(({ i, type }) => {
    const b = window.seats[i].el.querySelector(`.bb-pitch button[data-type="${type}"]`);
    if (!b || b.disabled) return false;
    b.click();
    return true;
  }, { i, type });
}
// Seat i bats the current pitch: holds the pointer for `pull`'s worth of
// spring and lets go so the bat meets the ball heading `angle` off straight
// up (+ is to the right). `shot` grabs the page that long after the release.
async function swing(page, i, pn, pull, angle, shot = null, want = null) {
  await until(page, ({ i, pn }) => window.seats[i].gh.current.instance._view().pitch?.n === pn, { i, pn });
  const r = await page.evaluate(async ({ i, pull, angle, want }) => {
    const inst = window.seats[i].gh.current.instance;
    const soon = performance.now() + 150;
    const aim = (want && inst._aim(pull, angle, [...want], soon)) || inst._aim(pull, angle, null, soon) || inst._aim(pull, angle);
    if (!aim) return null;
    const canvas = window.seats[i].el.querySelector('.panel canvas');
    const box = canvas.getBoundingClientRect();
    const fire = type => canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'touch', clientX: box.left + box.width / 2, clientY: box.top + box.height * 0.6, bubbles: true }));
    const relAt = aim.t0 + aim.tRel * 1000, pressAt = relAt - aim.hold;
    const at = async t => {
      while (performance.now() < t - 20) await new Promise(r => requestAnimationFrame(r));
      while (performance.now() < t) { /* spin to the millisecond */ }
    };
    await at(pressAt);
    const pressed = performance.now();
    fire('pointerdown');
    await at(pressAt + aim.hold * 0.6);
    const mid = inst._view().bat;
    await at(relAt);
    fire('pointerup');
    return { aim, late: pressed - pressAt, searched: soon - 150, mid, after: inst._view().bat };
  }, { i, pull, angle, want });
  if (shot) {
    await page.waitForTimeout(shot);
    await page.screenshot({ path: `${outDir}baseball-swing.png` });
  }
  return r;
}
const sameState = (a, b) => JSON.stringify([a.score, a.outs, a.b, a.s, a.bases, a.inn, a.half, a.pk, a.bonus, a.bat, a.pit, a.teams])
  === JSON.stringify([b.score, b.outs, b.b, b.s, b.bases, b.inn, b.half, b.pk, b.bonus, b.bat, b.pit, b.teams]);
// Waits for pitch pn's result to be applied on every open seat.
const settled = (page, pn, n = 2) => until(page, ({ pn, n }) => window.seats.slice(0, n).every(s => {
  const v = s.gh.current?.instance._view();
  return v && v.sh && v.sh.last && v.sh.last.n >= pn && v.sh.phase !== 'play';
}), { pn, n }, 20000);

// --- two seats, then a third ---------------------------------------------------
{
  const page = await open('n=3&hold=1&w=390&h=720', { width: 3 * 402 + 30, height: 860 });
  await until(page, () => window.seats.slice(0, 2).every(s => s.gh.current?.instance._view().sh?.teams[1].length === 1));
  await page.waitForTimeout(300);
  let v = await views(page);
  check(v[0].role === 'bat' && v[1].role === 'pitch', `roles: Ana ${v[0].role}, Bo ${v[1].role}`);
  check(v[0].sh.half === 0 && v[0].sh.inn === 1 && sameState(v[0].sh, v[1].sh), 'both seats see the same board: top of the 1st, same pockets and line-up');
  check(!v[0].buttons && v[1].buttons, 'only the pitcher has the pitch buttons');
  check(/pull back|choosing/i.test(v[0].status) && /pitch/i.test(v[1].status), `told what to do: "${v[0].status}" / "${v[1].status}"`);
  await page.screenshot({ path: `${outDir}baseball-ready.png` });

  // A fastball, and a swing timed for a hit.
  check(await pitch(page, 1, 'fast'), 'Bo throws a fastball');
  // (Not a home run: the next check needs her still on base.)
  const swung = swing(page, 0, 1, 0.9, -0.3, 40, '123');
  await until(page, () => window.seats.slice(0, 2).every(s => s.gh.current.instance._view().pitch?.n === 1));
  const flight = await page.evaluate(async () => {
    const frame = () => new Promise(r => requestAnimationFrame(r));
    for (let k = 0; k < 200; k++) {
      const v = window.seats[0].gh.current.instance._view();
      if (v.pitch && v.pitch.t > 0.1) break;
      await frame();
    }
    return window.seats.slice(0, 2).map(s => s.gh.current.instance._view().pitch);
  });
  check(flight[0].type === 'fast' && flight[1].type === 'fast' && flight[0].t > 0 && flight[1].t > 0 && Math.abs(flight[0].t - flight[1].t) < 0.15,
    `the pitch is rolling on both seats (${flight.map(f => f.t.toFixed(2)).join(' / ')} s out of the mound)`);
  const sw = await swung;
  check(sw && sw.late < 15 && sw.mid.mode === 'pull' && sw.mid.th > 0.95 + 0.3, `holding pulls the bat back against the spring (to ${sw?.mid.th.toFixed(2)} rad)`);
  check(sw && sw.after.mode === 'swing', 'letting go swings it');
  await until(page, () => window.seats.slice(0, 2).every(s => s.gh.current.instance._view().ball?.done), null, 12000);
  v = await views(page);
  check(v[0].ball && v[1].ball, `the bat met the ball (launch ${JSON.stringify(v[0].ball?.L)}, aimed for ${sw?.aim.o})`);
  if (v[0].ball && v[1].ball) {
    const a = v[0].ball, b = v[1].ball;
    check(JSON.stringify(a.L) === JSON.stringify(b.L), 'both seats have the same launch');
    check(a.end === b.end && a.slot === b.slot && a.x === b.x && a.y === b.y,
      `the same roll on both seats: ${a.end}${a.slot >= 0 ? ` into pocket ${a.slot}` : ''} at (${a.x.toFixed(3)}, ${a.y.toFixed(3)}), ${a.res}`);
    check(a.L.vy < 0, `the ball goes out into the field (vx ${a.L.vx}, vy ${a.L.vy})`);
  }
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}baseball-hit.png` });
  check(await settled(page, 1), 'the owner applies the result');
  v = await views(page);
  check(v[0].ball?.res === v[0].sh.last.res && v[1].ball?.res === v[0].sh.last.res, `the owner's call matches the roll on both seats: ${v[0].ball?.res} / ${v[1].ball?.res} -> ${v[0].sh.last.res}`);
  check(sameState(v[0].sh, v[1].sh), `runners, count and score agree: bases ${JSON.stringify(v[0].sh.bases)}, score ${v[0].sh.score}, outs ${v[0].sh.outs}`);
  check('123H'.includes(v[0].sh.last.res) && v[0].sh.last.moves.some(m => m.id === 'client1' && m.from === 0), `a hit: Ana runs from home (${v[0].sh.last.res})`);

  // Ana again (her team has only her): another hit moves the runner on.
  let pn = 2;
  check(await pitch(page, 1, 'slow'), 'Bo throws a slow ball');
  await swing(page, 0, pn, 0.9, 0.25, null, '123H');
  await page.waitForTimeout(200);
  await settled(page, pn);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}baseball-runners.png` });
  v = await views(page);
  check(sameState(v[0].sh, v[1].sh), `runners, count and score agree: bases ${JSON.stringify(v[0].sh.bases)}, score ${v[0].sh.score}`);
  const moved = v[0].sh.last.moves;
  check('123H'.includes(v[0].sh.last.res) && moved.some(m => m.from > 0 && m.to > m.from), `the runner moves up on the next hit (${v[0].sh.last.res}: ${moved.map(m => `${m.from}->${m.to}`).join(', ')})`);
  check(v[0].sh.score[0] === moved.filter(m => m.to === 4).length, `runs score as runners reach home (${v[0].sh.score[0]})`);

  // Then Bo strikes out the side: taken pitches, one the vanishing pitch.
  let usedVanish = false;
  for (let k = 0; k < 14; k++) {
    const s0 = (await views(page))[0].sh;
    if (s0.half !== 0 || s0.phase === 'over') break;
    pn = s0.pn + 1;
    const type = !usedVanish ? 'vanish' : 'fast';
    if (!(await pitch(page, 1, type))) check(false, `pitch ${pn}: ${type}`);
    if (type === 'vanish') {
      usedVanish = true;
      const under = await until(page, pn => window.seats.slice(0, 2).every(s => { const v = s.gh.current.instance._view(); return v.pitch?.n === pn && v.pitch.t > 0.35 && v.sh.vn === 0; }), pn, 5000);
      v = await views(page);
      check(under && v[1].sh.vn === 0 && v[1].sh.pitch.type === 'vanish', 'the vanishing pitch is thrown and used up for the inning');
    }
    await settled(page, pn);
    v = await views(page);
    if (!sameState(v[0].sh, v[1].sh)) check(false, `seats disagree after pitch ${pn}`);
  }
  v = await views(page);
  check(v[0].sh.half === 1 && v[0].sh.outs === 0 && sameState(v[0].sh, v[1].sh), `three outs switch sides (bottom of the ${v[0].sh.inn}, ${v[0].sh.score.join('-')})`);
  check(v[0].role === 'pitch' && v[1].role === 'bat', `now Bo bats and Ana pitches (${v[0].role} / ${v[1].role})`);
  check(v[0].sh.bases.every(b => b === null) && v[0].sh.vn === 1, 'the bases are cleared and the new pitcher has a vanishing pitch');
  await page.screenshot({ path: `${outDir}baseball-switch.png` });

  // Cy joins mid-game.
  await page.evaluate(() => window.joinSeat(2));
  await until(page, () => window.seats.every(s => s.gh.current?.instance._view().sh?.teams.flat().includes('client3')), null, 15000);
  await page.waitForTimeout(400);
  v = await views(page);
  check(v[2] && v[2].sh.teams[0].includes('client3'), `Cy joins Ana's team, in the batting order (${JSON.stringify(v[2]?.sh.teams)})`);
  check(v[2] && v[2].role === 'watch' && sameState(v[0].sh, v[2].sh) && sameState(v[1].sh, v[2].sh), `Cy watches the same board: "${v[2]?.status}"`);
  check(/fielding|order|deck/i.test(v[2]?.status || ''), 'and is told what is going on');
  await page.screenshot({ path: `${outDir}baseball-join.png` });

  // Rookie bots play every seat for a while.
  const before = (await views(page)).map(x => ({ ...x.stats, pn: x.sh.pn }));
  await page.evaluate(async () => {
    const { driveRookie } = await import('../js/rookie.js');
    let step = 0;
    window.botTimer = setInterval(() => {
      step++;
      for (const s of window.seats) if (s.gh.current) driveRookie(s.gh.current, step);
    }, 400);
  });
  await page.waitForTimeout(26000);
  let after = await views(page);
  const pitched = after[0].sh.pn - before[0].pn;
  const swings = after.reduce((n, x, i) => n + x.stats.swings - before[i].swings, 0);
  const contacts = after.reduce((n, x, i) => n + x.stats.sent - before[i].sent, 0);
  check(pitched >= 4, `rookie bots pitch (${pitched} pitches)`);
  check(swings >= 2, `rookie bots swing (${swings} swings, ${contacts} pitches reported)`);
  check(after.every(x => sameState(x.sh, after[0].sh)) || after.some(x => x.sh.phase === 'play'), 'all three seats agree');
  await page.screenshot({ path: `${outDir}baseball-bots.png` });

  // The owner leaves: Bo runs the game on.
  const pnBefore = after[1].sh.pn;
  await page.evaluate(() => window.leaveSeat(0));
  await until(page, pn => window.seats[1].gh.current.instance._view().sh.pn > pn + 1 || window.seats[1].gh.current.instance._view().sh.phase === 'over', pnBefore, 25000);
  after = await views(page);
  check(after[1].owner === 'client2' && (after[1].sh.pn > pnBefore + 1 || after[1].sh.phase === 'over'), `Bo takes over and the game goes on (pitch ${pnBefore} -> ${after[1].sh.pn})`);
  check(!after[1].sh.teams.flat().includes('client1'), 'Ana is out of the line-up');
  await page.evaluate(() => clearInterval(window.botTimer));
  await page.close();
}

// --- alone against the computer ---------------------------------------------------
{
  const page = await open('n=1&w=390&h=720', { width: 430, height: 860 });
  await until(page, () => window.seats[0].gh.current?.instance._view().sh?.pn >= 1, null, 15000);
  let v = (await views(page))[0];
  check(v.sh.pit === 'cpu' && v.role === 'bat', `alone: the computer pitches to me (${v.sh.pit})`);
  const sw = await swing(page, 0, v.sh.pn, 1.1, 0);
  check(!!sw, 'I swing at the computer\'s pitch');
  await settled(page, v.sh.pn, 1);
  v = (await views(page))[0];
  check(!!v.sh.last && v.sh.last.n >= 1, `and it counts: ${v.sh.last?.res}`);
  // Landscape: drawn mid-pitch.
  await page.setViewportSize({ width: 430, height: 860 });
  await page.close();
}
{
  const page = await open('n=1&w=844&h=390', { width: 880, height: 520 });
  await until(page, () => window.seats[0].gh.current?.instance._view().pitch?.t > 0.15, null, 15000);
  const v = (await views(page))[0];
  check(v.layout.panel, 'landscape: scoreboard and controls sit beside the board');
  await page.screenshot({ path: `${outDir}baseball-landscape.png` });
  await page.close();
}

check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
server.close();
if (failed) {
  console.log(`${failed} check(s) failed`);
  process.exit(1);
}
console.log('all baseball checks passed');
