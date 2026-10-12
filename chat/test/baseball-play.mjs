// Plays a round of Baseball in test/game.html on two phone-sized seats.
// Seat 1 taps through the page's pointer events, timed against the pitch:
//   - a tap right on the ball as it reaches the plate is a home run;
//   - a swing far too early misses, a late one goes foul, a tap well above
//     the ball tops it, and no swing is a taken pitch;
//   - after ten pitches the round ends with the card, the home runs are in
//     the player's state for friends to see, and Bat again starts round two.
// Seat 2 is a debug bot (js/rookie.js driven every 400 ms) that must swing
// and get through pitches, and it sees seat 1's hits as ghost balls.
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
const page = await browser.newPage({ viewport: { width: 2 * 402 + 30, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${server.url}/test/game.html?game=baseball&n=2&w=390&h=720&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current), null, { timeout: 20000 });
await page.waitForTimeout(500);

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const view = i => page.evaluate(i => window.seats[i].gh.current.instance._view(), i);

// The bot in seat 2, as Settings > Add Debug Bot drives it.
await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  let step = 0;
  window.botSwings = 0;
  window.botTimer = setInterval(() => {
    step++;
    const cur = window.seats[1].gh.current;
    if (!cur) return;
    const before = cur.instance._view().lastHit;
    driveRookie(cur, step);
    if (cur.instance._view().lastHit !== before) window.botSwings++;
  }, 400);
  // Counts the bot's swings between calls too (they happen in its frame loop).
  window.botSeen = new Set();
  const watch = () => {
    const v = window.seats[1].gh.current?.instance._view();
    if (v?.lastHit) window.botSeen.add(v.lastHit);
    window.botGhosts = Math.max(window.botGhosts || 0, v?.ghosts || 0);
    requestAnimationFrame(watch);
  };
  watch();
});

// Waits for seat 1's next pitch and taps `early` seconds before it reaches
// the plate (negative: late), `offY` px below the ball (negative: above), or
// doesn't swing at all. Returns the pitch's result once it is known.
async function bat({ early = 0, offY = 0, swing = true } = {}) {
  await page.waitForFunction(() => window.seats[0].gh.current.instance._view().phase === 'pitch', null, { timeout: 15000 });
  const tapped = await page.evaluate(async ({ early, offY, swing }) => {
    const inst = window.seats[0].gh.current.instance;
    const canvas = window.seats[0].el.querySelector('.panel canvas');
    const frame = () => new Promise(r => requestAnimationFrame(r));
    const n0 = inst._view().n;
    for (let k = 0; k < 400; k++) {
      const v = inst._view();
      if (v.phase !== 'pitch' || !swing) return { n0 };
      if (swing && v.sinceRelease >= v.T - early - 0.008) {
        const p = inst._ahead(0);
        const r = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', clientX: r.left + p.x, clientY: r.top + p.y + offY, bubbles: true }));
        return { n0, at: v.sinceRelease, T: v.T };
      }
      await frame();
    }
    return { n0 };
  }, { early, offY, swing });
  // The result is known once the pitch counts.
  await page.waitForFunction(n0 => window.seats[0].gh.current.instance._view().n > n0, tapped.n0, { timeout: 15000 });
  const v = await view(0);
  return { kind: v.result?.kind, dist: v.result?.dist, hit: v.lastHit, tapped };
}

const fmt = r => `${r.kind}${r.dist ? ` ${Math.round(r.dist * 3.281)} ft` : ''}${r.hit ? ` (dt ${r.hit.dt.toFixed(3)} s, dy ${r.hit.dy.toFixed(3)} m)` : ''}`;
await page.screenshot({ path: `${outDir}baseball-ready.png` });

// 1-2: right on the ball, right on time.
const perfect = [];
for (let i = 0; i < 2; i++) {
  if (i === 0) {
    // Picture the ball on its way in.
    await page.waitForFunction(() => {
      const v = window.seats[0].gh.current.instance._view();
      return v.phase === 'pitch' && v.sinceRelease > v.T * 0.6;
    }, null, { timeout: 15000 });
    await page.screenshot({ path: `${outDir}baseball-pitch.png` });
  }
  const r = await bat();
  perfect.push(r);
  if (i === 0) {
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${outDir}baseball-flight.png` });
  }
}
check(perfect.every(r => r.kind === 'hr'), `taps right on the ball as it reaches the plate are home runs: ${perfect.map(fmt).join(', ')}`);
check((await page.evaluate(() => window.botGhosts)) > 0, 'the bot sees those hits as ghost balls');

// 3: far too early.
const early = await bat({ early: 0.3 });
check(early.kind === 'miss', `a swing 0.3 s early misses: ${fmt(early)}`);
// 4: late.
const late = await bat({ early: -0.11 });
check(late.kind === 'foul', `a swing 0.11 s late is fouled off: ${fmt(late)}`);
// 5: tapping well above the ball.
const top = await bat({ offY: -30 });
check(['grounder', 'miss'].includes(top.kind), `a tap well above the ball tops it: ${fmt(top)}`);
// 6: no swing.
const take = await bat({ swing: false });
check(take.kind === 'take', `no swing is a taken pitch: ${fmt(take)}`);
// 7-10: a bit early (pulled) and right on.
const rest = [];
for (const e of [0.04, 0, -0.03, 0]) {
  const r = await bat({ early: e });
  rest.push(r);
  if (r.kind === 'hr' && !rest.shot) {
    rest.shot = true;
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}baseball-homerun.png` });
  }
}
check(rest.filter(r => r.kind === 'hr').length >= 3, `good timing a little either side still goes out: ${rest.map(fmt).join(', ')}`);

// The round ends after ten pitches.
await page.waitForFunction(() => window.seats[0].gh.current.instance._view().phase === 'over', null, { timeout: 15000 });
const end = await view(0);
const hrs = [...perfect, early, late, top, take, ...rest].filter(r => r.kind === 'hr').length;
check(end.n === 10 && end.hr === hrs, `the round ends after 10 pitches with ${end.hr} home runs (counted ${hrs})`);
check(end.record.best === end.hr && end.record.longest > 0, `records kept: best round ${end.record.best}, longest ${Math.round(end.record.longest * 3.281)} ft`);
const seen = await page.evaluate(() => window.seats[1].gh.current.api.players().find(p => !p.me).state);
check(seen?.hr === end.hr && seen?.n === 10, `the friend's scoreboard shows ${seen?.hr} home runs and ${seen?.n}/10`);
const cardShown = await page.evaluate(() => {
  const b = [...window.seats[0].el.querySelectorAll('button')].find(x => /Bat again/.test(x.textContent));
  return !!b && !!b.getClientRects().length;
});
check(cardShown, 'the round card shows with Bat again');
await page.screenshot({ path: `${outDir}baseball-over.png` });
await page.evaluate(() => [...window.seats[0].el.querySelectorAll('button')].find(x => /Bat again/.test(x.textContent)).click());
await page.waitForTimeout(300);
const again = await view(0);
check(again.r === 2 && again.n === 0 && again.phase !== 'over', `Bat again starts round ${again.r}`);

// The bot.
const bot = await view(1);
const botSwings = await page.evaluate(() => window.botSeen.size);
check(botSwings >= 3 && (bot.n > 3 || bot.r > 1), `the bot swings (${botSwings} swings) and gets through pitches (round ${bot.r}, pitch ${bot.n}, ${bot.hr} HR)`);

check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await page.evaluate(() => clearInterval(window.botTimer));
await browser.close();
server.close();
if (failed) {
  console.log(`${failed} checks failed`);
  process.exit(1);
}
console.log('all baseball checks passed');
