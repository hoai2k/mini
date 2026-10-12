// Plays Mob Whack in test/game.html with two phone-sized seats, clicking the
// mobs with the mouse as a player would, and checks:
//   - both seats get the same spawns at the same time;
//   - whacking a zombie scores;
//   - a creeper left alone explodes: a heart and points lost;
//   - whacking a villager costs points and the combo;
//   - an enderman teleports between holes before it can be caught;
//   - the round ends with the same winner on both seats;
//   - in a second round, debug-bot rookie moves (js/rookie.js) score.
//   node chat/test/whack-play.mjs
// Pictures land in local/chat-shots/whack-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 2 * 402 + 30, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${server.url}/test/game.html?game=whack&n=2&w=390&h=690&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current?.instance?._view), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const views = () => page.evaluate(() => window.seats.map(s => s.gh.current.instance._view()));
const boxes = await page.evaluate(() => window.seats.map(s => {
  const r = s.el.querySelector('canvas.g-canvas').getBoundingClientRect();
  return { x: r.left, y: r.top };
}));
const click = (seat, p) => page.mouse.click(boxes[seat].x + p.x, boxes[seat].y + p.y);

// --- round 1: played by hand -------------------------------------------------
await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().playing), null, { timeout: 10000 });
let v = await views();
check(v[0].round === v[1].round && v[0].startAt === v[1].startAt && v[0].sched === v[1].sched && v[0].sched.length > 100,
  `both seats have the same round, start and spawns (${v[0].sched.split(',').length} mobs)`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}whack-countdown.png` });

const seen = { zombieHit: null, villager: null, boom: null, enderHoles: new Map(), enderCaught: false, shots: new Set() };
const prev = [null, null];
const clicked = [new Set(), new Set()];
let sameUp = 0, upChecks = 0;
for (;;) {
  v = await views();
  if (v.every(x => x.over)) break;
  if (v[0].t > 75000) { check(false, 'round 1 ended'); break; }
  // Same mobs up on both fields at the same moment (allowing for whacked ones).
  if (v[0].t > 0 && v[0].t < 60000) {
    upChecks++;
    const ids0 = new Set(v[0].up.map(m => `${m.id}:${m.stop}`));
    if (v[1].up.every(m => ids0.has(`${m.id}:${m.stop}`) || v[0].outcomes.some(o => o.id === m.id))) sameUp++;
  }
  for (let s = 0; s < 2; s++) {
    const me = v[s], was = prev[s];
    if (was) {
      // A creeper exploded on Bo's field: a heart and points gone.
      const newBooms = me.outcomes.filter(o => o.how === 'boom' && !was.outcomes.some(p => p.id === o.id));
      if (s === 1 && newBooms.length && !seen.boom && was.hearts > 0) {
        seen.boom = { hearts: [was.hearts, me.hearts], score: [was.score, me.score] };
        await page.screenshot({ path: `${outDir}whack-boom.png` });
      }
    }
    prev[s] = me;
    for (const m of me.up) {
      if (m.kind === 'enderman') {
        if (!seen.enderHoles.has(m.id)) seen.enderHoles.set(m.id, new Set());
        seen.enderHoles.get(m.id).add(m.hole);
        if (!seen.shots.has('ender')) { seen.shots.add('ender'); await page.screenshot({ path: `${outDir}whack-enderman.png` }); }
      }
      if (m.kind === 'creeper' && m.left < 450 && m.left > 150 && !seen.shots.has('creeper')) {
        seen.shots.add('creeper');
        await page.screenshot({ path: `${outDir}whack-creeper.png` });
      }
      const tag = `${m.id}:${m.stop}`;
      if (clicked[s].has(tag) || m.since < 120) continue;
      // Ana whacks everything but creepers on her field until Bo's first
      // explosion has been seen, and one villager once she has points; Bo
      // whacks only some zombies, never creepers.
      let go = false;
      if (s === 0) {
        if (m.kind === 'zombie') go = true;
        else if (m.kind === 'creeper') go = !!seen.boom;
        else if (m.kind === 'enderman') go = m.stop === m.stops - 1;
        else if (m.kind === 'villager') go = !seen.villager && me.score >= 30;
      } else go = m.kind === 'zombie' && m.id % 2 === 0;
      if (!go) continue;
      clicked[s].add(tag);
      const before = me;
      await click(s, m.screen);
      const after = (await views())[s];
      if (m.kind === 'zombie' && !seen.zombieHit) seen.zombieHit = { before: before.score, after: after.score };
      if (m.kind === 'villager' && !seen.villager) {
        seen.villager = { before: before.score, after: after.score, combo: [before.combo, after.combo] };
        await page.waitForTimeout(150);
        await page.screenshot({ path: `${outDir}whack-villager.png` });
      }
      if (m.kind === 'enderman' && after.outcomes.some(o => o.id === m.id && o.how === 'hit')) seen.enderCaught = true;
    }
  }
  if (v[0].t > 25000 && !seen.shots.has('mid')) {
    seen.shots.add('mid');
    await page.screenshot({ path: `${outDir}whack-mid.png` });
  }
  await page.waitForTimeout(60);
}
check(upChecks > 50 && sameUp / upChecks > 0.97, `the same mobs are up on both fields (${sameUp}/${upChecks} checks)`);
check(seen.zombieHit && seen.zombieHit.after > seen.zombieHit.before, `whacking a zombie scores (${seen.zombieHit?.before} → ${seen.zombieHit?.after})`);
check(seen.boom && seen.boom.hearts[1] === seen.boom.hearts[0] - 1 && (seen.boom.score[1] < seen.boom.score[0] || seen.boom.score[0] === 0),
  `a creeper left alone explodes: hearts ${seen.boom?.hearts.join(' → ')}, score ${seen.boom?.score.join(' → ')}`);
check(seen.villager && seen.villager.after < seen.villager.before && seen.villager.combo[1] === 0,
  `whacking a villager costs: score ${seen.villager?.before} → ${seen.villager?.after}, combo ${seen.villager?.combo.join(' → ')}`);
const hops = [...seen.enderHoles.values()].map(s => s.size);
check(hops.some(n => n >= 2), `an enderman teleports between holes (holes per enderman: ${hops.join(', ') || 'none seen'}; caught: ${seen.enderCaught})`);

await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().winner), null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1600);
v = await views();
const names = await page.evaluate(() => window.seats.map(s => s.me.name));
const winnerOf = x => (x.winner === 'client1' || x.winner === 'client2' ? names[Number(x.winner.slice(6)) - 1] : x.winner);
const expected = v[0].score > v[1].score ? 'Ana' : v[1].score > v[0].score ? 'Bo' : '';
check(v.every(x => x.over) && winnerOf(v[0]) === expected && winnerOf(v[1]) === expected,
  `the round ends with the same winner on both seats (${winnerOf(v[0])} / ${winnerOf(v[1])}; Ana ${v[0].score}, Bo ${v[1].score})`);
await page.screenshot({ path: `${outDir}whack-over.png` });

// --- round 2: debug-bot rookie moves ----------------------------------------
await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().canAgain), null, { timeout: 10000 });
await page.evaluate(() => window.seats[1].el.querySelector('.mw-over .btn').click());
await page.waitForFunction(() => window.seats.every(s => { const x = s.gh.current.instance._view(); return x.round === 2 && x.playing && !x.over; }), null, { timeout: 8000 });
const r2 = await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  let step = 0;
  let shot = false;
  await new Promise(done => {
    const t = setInterval(() => {
      step++;
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
      const v = window.seats[0].gh.current.instance._view();
      if (v.t > 20000 && !shot) { shot = true; window.rookieShot = true; }
      if (v.over || v.t > 70000) { clearInterval(t); done(); }
    }, 400);
  });
  return window.seats.map(s => s.gh.current.instance._view());
});
check(r2.every(x => x.hits > 0 && x.score > 0), `rookie bots score in round 2 (${r2.map(x => `${x.score} pts, ${x.hits} hits`).join('; ')})`);
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}whack-over2.png` });

check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `${failed} checks failed` : 'all Mob Whack checks passed');
if (failed) process.exit(1);
