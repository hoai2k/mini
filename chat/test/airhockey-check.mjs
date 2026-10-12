// Air Hockey serves and bots: after a goal (and at the start) the puck waits,
// still, on the side of the player who serves, until somebody hits it; and a
// test bot (js/rookie.js) goes and hits it. Seat 1 is idle, seat 2 is a bot.
//   node chat/test/airhockey-check.mjs
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// Reload until the first serve is the bot's (seat 2, the top half), so the
// puck waits on its side and it's the bot's job to hit it.
for (let i = 0; i < 12; i++) {
  await page.goto(`${server.url}/test/game.html?game=airhockey&n=2&expr=0`);
  await page.waitForFunction(() => window.ready === true && window.seats?.every(s => s.gh.current) && window.seats[0].gh.current.api.shared()?.ids, null, { timeout: 20000 });
  if ((await page.evaluate(() => window.seats[0].gh.current.api.shared().serveTo)) === 1) break;
}
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };
const shared = () => page.evaluate(() => window.seats[0].gh.current.api.shared());

// 1. Nobody plays: once the serve countdown is over the puck sits still.
await page.waitForFunction(() => { const s = window.seats[0].gh.current.api.shared(); return s && s.serveAt === 0; }, null, { timeout: 10000 });
const a = await shared();
await page.waitForTimeout(3000);
const b = await shared();
check(Math.hypot(b.puck[0] - a.puck[0], b.puck[1] - a.puck[1]) < 1e-3 && b.puck[2] === 0 && b.puck[3] === 0 && b.score[0] + b.score[1] === 0,
  `untouched after the serve, the puck stays put (${a.puck.slice(0, 2)} -> ${b.puck.slice(0, 2)}, score ${b.score})`);
const servedTo = b.serveTo;
check(servedTo === 0 ? b.puck[1] > 0.8 : b.puck[1] < 0.8, `it waits on the serving player's side (serveTo ${servedTo}, y ${b.puck[1]})`);

// 2. A bot on seat 2 (role 1, top half) plays: it hits the puck when it's on
//    its side. Make sure the serve is the bot's by scoring past the idle seat if needed.
const hits = await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  const bot = window.seats[1];
  let step = 0, moved = 0, goals = 0;
  const start = window.seats[0].gh.current.api.shared();
  let lastScore = start.score.join();
  await new Promise(done => {
    const t = setInterval(() => {
      driveRookie(bot.gh.current, ++step);
      const s = window.seats[0].gh.current.api.shared();
      if (Math.hypot(s.puck[2], s.puck[3]) > 0.05) moved++;
      if (s.score.join() !== lastScore) { goals++; lastScore = s.score.join(); }
      if (step >= 75) { clearInterval(t); done(); }
    }, 400);
  });
  return { moved, goals, score: window.seats[0].gh.current.api.shared().score };
});
check(hits.moved > 0, `the bot hits the puck (puck moving in ${hits.moved} of 75 checks, ${hits.goals} goals, score ${hits.score})`);
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
