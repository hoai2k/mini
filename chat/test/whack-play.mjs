// Plays Mob Whack in test/game.html with two phone-sized seats sharing one
// field, clicking the mobs with the mouse as a player would, and checks:
//   - both seats get the same spawns at the same time;
//   - a whack by seat 1 removes the mob on seat 2 too and scores for seat 1;
//   - seat 2 hitting the same mob a moment later gets nothing ("Too slow!"),
//     and the earlier whack wins even when it comes from the non-owner;
//   - the other player's hammer is drawn on each field, where they aim;
//   - a creeper nobody whacks explodes for both: each loses a heart;
//   - whacking a villager costs only the player who whacked it;
//   - an enderman teleports between holes before it can be caught;
//   - the round ends with the same scores and winner on both seats;
//   - in a second round, debug-bot rookie moves (js/rookie.js) score on the
//     shared field and the seats still agree.
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
const ID = ['client1', 'client2'];
const line = (v, seat) => v.tally.find(p => p.id === ID[seat]) || { score: 0, hearts: 0, hits: 0 };
const wait = ms => page.waitForTimeout(ms);

// --- round 1: played by hand -------------------------------------------------
await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().playing), null, { timeout: 10000 });
let v = await views();
check(v[0].round === v[1].round && v[0].startAt === v[1].startAt && v[0].sched === v[1].sched && v[0].sched.length > 100,
  `both seats have the same round, start and spawns (${v[0].sched.split(',').length} mobs)`);
check(v[0].owner && !v[1].owner && v[0].tally.length === 2, 'seat 1 owns the round; both seats are in its tally');
await wait(800);
await page.screenshot({ path: `${outDir}whack-countdown.png` });

const seen = {
  single: null, slow: null, early: null, hammer: null, villager: null, boom: null,
  enderHoles: new Map(), enderCaught: false, shots: new Set(),
};
const clicked = [new Set(), new Set()];
let sameUp = 0, upChecks = 0, prev = null;
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
  // A creeper nobody whacked: both lose a heart, on both seats' tallies.
  if (prev && !seen.boom) {
    const boom = v[1].outcomes.find(o => o.how === 'boom' && o.final && !prev[1].outcomes.some(p => p.id === o.id && p.final));
    if (boom && line(prev[1], 0).hearts > 0 && line(prev[1], 1).hearts > 0) {
      seen.boom = {
        hearts: [0, 1].map(s => [line(prev[1], s).hearts, line(v[1], s).hearts]),
        // (A player who also scored a hit meanwhile is judged by hearts alone.)
        score: [0, 1].map(s => [line(prev[1], s).score, line(v[1], s).score, line(v[1], s).hits - line(prev[1], s).hits]),
        onSeat1: v[0].outcomes.some(o => o.id === boom.id && o.how === 'boom'),
      };
      await page.screenshot({ path: `${outDir}whack-boom.png` });
    }
  }
  prev = v;
  for (const m of v[0].up) {
    if (m.kind === 'enderman') {
      if (!seen.enderHoles.has(m.id)) seen.enderHoles.set(m.id, new Set());
      seen.enderHoles.get(m.id).add(m.hole);
      if (!seen.shots.has('ender')) { seen.shots.add('ender'); await page.screenshot({ path: `${outDir}whack-enderman.png` }); }
    }
    if (m.kind === 'creeper' && m.left < 450 && m.left > 150 && !seen.shots.has('creeper')) {
      seen.shots.add('creeper');
      await page.screenshot({ path: `${outDir}whack-creeper.png` });
    }
  }
  const both = v[0].up.filter(m => m.since > 120 && m.left > 500 && v[1].up.some(n => n.id === m.id && n.stop === m.stop));
  const zombie = both.find(m => m.kind === 'zombie' && !clicked[0].has(m.id) && !clicked[1].has(m.id));
  if (zombie && v[0].t > 1500 && v[0].t < 55000) {
    const before = await views();
    if (!seen.single) {
      // Ana alone: the mob leaves Bo's field too, and the points are Ana's on both seats.
      clicked[0].add(zombie.id);
      await click(0, zombie.screen);
      await wait(500);
      const after = await views();
      seen.single = {
        goneOnBo: !after[1].up.some(n => n.id === zombie.id),
        by: after[1].outcomes.find(o => o.id === zombie.id)?.by,
        ana: [line(before[0], 0).score, line(after[0], 0).score, line(after[1], 0).score],
        bo: [line(before[1], 1).score, line(after[1], 1).score],
      };
      continue;
    }
    if (!seen.hammer) {
      // Ana's hammer, where she aims, on Bo's field.
      await page.mouse.move(boxes[0].x + zombie.screen.x - 30, boxes[0].y + zombie.screen.y + 20);
      await wait(350);
      const x = (await views())[1].hammers.find(hm => hm.id === ID[0]);
      seen.hammer = x ? { d: Math.hypot(x.x - (zombie.screen.x - 30), x.y - (zombie.screen.y + 20)), name: x.name } : { d: Infinity };
      await page.screenshot({ path: `${outDir}whack-hammers.png` });
    }
    if (!seen.slow) {
      // Ana first, Bo a moment later on the same mob: Bo gets nothing.
      clicked[0].add(zombie.id); clicked[1].add(zombie.id);
      await click(0, zombie.screen);
      await click(1, zombie.screen);
      await wait(330);
      await page.screenshot({ path: `${outDir}whack-tooslow.png` });
      await wait(300);
      const after = await views();
      seen.slow = {
        by: after.map(x => x.outcomes.find(o => o.id === zombie.id)?.by),
        ana: line(after[1], 0).score - line(before[1], 0).score,
        bo: [line(before[1], 1).score, line(after[1], 1).score, line(after[1], 1).hits - line(before[1], 1).hits],
      };
      continue;
    }
    if (!seen.early) {
      // Bo (not the owner) first, Ana (the owner) a moment later: Bo's earlier whack wins.
      clicked[0].add(zombie.id); clicked[1].add(zombie.id);
      await click(1, zombie.screen);
      await wait(70);
      await click(0, zombie.screen);
      await wait(600);
      const after = await views();
      seen.early = {
        by: after.map(x => x.outcomes.find(o => o.id === zombie.id)?.by),
        bo: line(after[0], 1).score - line(before[0], 1).score,
        ana: line(after[0], 0).score - line(before[0], 0).score,
      };
      continue;
    }
  }
  // Then: Ana whacks odd zombies, endermen where they settle, creepers once
  // one has exploded, and one villager once she has points; Bo whacks even zombies.
  for (let s = 0; s < 2; s++) {
    for (const m of v[s].up) {
      if (clicked[0].has(m.id) || clicked[1].has(m.id) || m.since < 120 || !seen.early) continue;
      let go = false;
      if (s === 0) {
        if (m.kind === 'zombie') go = m.id % 2 === 1;
        else if (m.kind === 'creeper') go = !!seen.boom;
        else if (m.kind === 'enderman') go = m.stop === m.stops - 1;
        else if (m.kind === 'villager') go = !seen.villager && line(v[0], 0).score >= 30;
      } else go = m.kind === 'zombie' && m.id % 2 === 0;
      if (!go) continue;
      clicked[s].add(m.id);
      const before = await views();
      await click(s, m.screen);
      if (m.kind === 'villager') {
        await wait(500);
        const after = await views();
        const hearts = [0, 1].map(k => line(before[1], k).hearts === line(after[1], k).hearts);
        if (hearts.every(Boolean)) {
          seen.villager = {
            ana: [line(before[1], 0).score, line(after[1], 0).score],
            bo: [line(before[1], 1).score, line(after[1], 1).score],
            by: after[1].outcomes.find(o => o.id === m.id)?.by,
          };
          await page.screenshot({ path: `${outDir}whack-villager.png` });
        }
      }
      if (m.kind === 'enderman') {
        await wait(300);
        if ((await views())[1].outcomes.some(o => o.id === m.id && o.how === 'hit' && o.by === ID[0])) seen.enderCaught = true;
      }
    }
  }
  if (v[0].t > 25000 && !seen.shots.has('mid')) {
    seen.shots.add('mid');
    await page.screenshot({ path: `${outDir}whack-mid.png` });
  }
  await wait(60);
}
check(upChecks > 50 && sameUp / upChecks > 0.97, `the same mobs are up on both fields (${sameUp}/${upChecks} checks)`);
const S1 = seen.single;
check(S1 && S1.goneOnBo && S1.by === ID[0] && S1.ana[1] > S1.ana[0] && S1.ana[2] === S1.ana[1] && S1.bo[1] === S1.bo[0],
  `Ana's whack takes the zombie off Bo's field and scores for Ana on both seats (Ana ${S1?.ana.join(' → ')}, Bo ${S1?.bo.join(' → ')}, by ${S1?.by})`);
const SL = seen.slow;
check(SL && SL.by.every(b => b === ID[0]) && SL.ana > 0 && SL.bo[0] === SL.bo[1] && SL.bo[2] === 0,
  `Bo hitting the same zombie a moment later gets nothing (Ana +${SL?.ana}, Bo ${SL?.bo[0]} → ${SL?.bo[1]})`);
const E = seen.early;
check(E && E.by.every(b => b === ID[1]) && E.bo > 0 && E.ana === 0,
  `the earlier whack wins even from the non-owner (Bo +${E?.bo}, Ana +${E?.ana}, by ${E?.by.join('/')})`);
check(seen.hammer && seen.hammer.d < 30 && seen.hammer.name === 'Ana',
  `Ana's hammer is drawn on Bo's field where she aims (${seen.hammer?.d?.toFixed(1)} px off)`);
const B = seen.boom;
check(B && B.onSeat1 && B.hearts.every(([a, b]) => b === a - 1) && B.score.every(([a, b, hit]) => b === Math.max(0, a - 10) || hit > 0),
  `an unwhacked creeper explodes for both: hearts ${B?.hearts.map(h => h.join('→')).join(', ')}, scores ${B?.score.map(h => h.slice(0, 2).join('→')).join(', ')}`);
const VI = seen.villager;
check(VI && VI.by === ID[0] && VI.ana[1] < VI.ana[0] && VI.bo[1] === VI.bo[0],
  `a villager costs only its whacker (Ana ${VI?.ana.join(' → ')}, Bo ${VI?.bo.join(' → ')})`);
const hops = [...seen.enderHoles.values()].map(s => s.size);
check(hops.some(n => n >= 2), `an enderman teleports between holes (holes per enderman: ${hops.join(', ') || 'none seen'}; caught: ${seen.enderCaught})`);

await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().winner), null, { timeout: 8000 }).catch(() => {});
await wait(1600);
v = await views();
const names = await page.evaluate(() => window.seats.map(s => s.me.name));
const winnerOf = x => (x.winner === 'client1' || x.winner === 'client2' ? names[Number(x.winner.slice(6)) - 1] : x.winner);
const [a1, b1] = [line(v[0], 0).score, line(v[0], 1).score];
const expected = a1 > b1 ? 'Ana' : b1 > a1 ? 'Bo' : '';
check(JSON.stringify(v[0].tally) === JSON.stringify(v[1].tally) && v[0].score === a1 && v[1].score === b1 && !v[0].pending && !v[1].pending,
  `final scores agree on both seats (Ana ${a1}, Bo ${b1})`);
check(v.every(x => x.over) && winnerOf(v[0]) === expected && winnerOf(v[1]) === expected,
  `the round ends with the same winner on both seats (${winnerOf(v[0])} / ${winnerOf(v[1])})`);
await page.screenshot({ path: `${outDir}whack-over.png` });

// --- round 2: debug-bot rookie moves ----------------------------------------
await page.waitForFunction(() => window.seats.every(s => s.gh.current.instance._view().canAgain), null, { timeout: 10000 });
await page.evaluate(() => window.seats[1].el.querySelector('.mw-over .btn').click());
await page.waitForFunction(() => window.seats.every(s => { const x = s.gh.current.instance._view(); return x.round === 2 && x.playing && !x.over; }), null, { timeout: 8000 });
// Halfway through, Ana (the owner) leaves: Bo takes over refereeing.
const r2 = await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  let step = 0, mid = null, tries = 0;
  await new Promise(done => {
    const t = setInterval(() => {
      step++;
      const v = window.seats[1].gh.current.instance._view();
      if (!mid && v.t > 30000) {
        // The bots pause while the seats catch up with each other.
        const now = window.seats.map(s => s.gh.current.instance._view());
        if (++tries > 2 && (JSON.stringify(now[0].tally) === JSON.stringify(now[1].tally) || tries > 12)) {
          mid = now;
          window.seats[0].gh.close();
        }
        return;
      }
      for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
      if (v.over || v.t > 70000) { clearInterval(t); done(); }
    }, 400);
  });
  return { mid, end: window.seats[1].gh.current.instance._view() };
});
const m2 = r2.mid;
check(m2.every(x => x.hits > 0 && x.scoreAuth > 0) && JSON.stringify(m2[0].tally) === JSON.stringify(m2[1].tally),
  `rookie bots score on the shared field in round 2, and the seats agree (${m2.map(x => `${x.scoreAuth} pts, ${x.hits} hits`).join('; ')})`);
const boMid = line(m2[1], 1), boEnd = line(r2.end, 1), anaEnd = line(r2.end, 0);
const lateBooms = r2.end.outcomes.filter(o => o.final && o.how !== 'hit').length > m2[1].outcomes.filter(o => o.final && o.how !== 'hit').length;
check(r2.end.owner && boEnd.hits > boMid.hits && lateBooms && anaEnd.score >= line(m2[1], 0).score && anaEnd.score > 0 && r2.end.over && !r2.end.pending,
  `when the owner leaves mid-round Bo referees on: Bo ${boMid.hits} → ${boEnd.hits} hits, Ana keeps ${anaEnd.score}`);
await wait(1600);
await page.screenshot({ path: `${outDir}whack-over2.png` });

check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
server.close();
console.log(failed ? `${failed} checks failed` : 'all Mob Whack checks passed');
if (failed) process.exit(1);
