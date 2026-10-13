// Air Hockey serves and bots: after a goal (and at the start) the puck waits,
// still, on the side of the player who serves, until somebody hits it; and a
// test bot (js/rookie.js) goes and hits it. Seat 1 is idle, seat 2 is a bot.
// Then with three people: the third waits in line and rotates in after a
// match (winner stays, loser to the back of the line), and takes over a seat
// when a player leaves. Pictures: local/chat-shots/airhockey-queue.png, -swap.png.
//   node chat/test/airhockey-check.mjs
import { mkdir } from 'node:fs/promises';
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
// 3. Three people: Cy waits in line. When a match is won, the winner stays
//    on, the loser goes to the back of the line and Cy takes the free seat;
//    everyone is told. Then the owner leaves and the next in line takes over.
const shotDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(shotDir, { recursive: true });
const p3 = await browser.newPage({ viewport: { width: 1480, height: 700 } });
p3.on('pageerror', e => errors.push(e.message));
await p3.goto(`${server.url}/test/game.html?game=airhockey&n=3&expr=0`);
await p3.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current?.api.shared()?.q?.length === 1), null, { timeout: 20000 });
const sh3 = () => p3.evaluate(() => window.seats.map(s => s.gh.current?.api.shared() ?? null));
let s3 = await sh3();
check(s3.every(s => JSON.stringify(s.ids) === '["client1","client2"]' && JSON.stringify(s.q) === '["client3"]'),
  `Ana and Bo play, Cy waits in line on every seat (ids ${s3[2].ids}, line ${s3[2].q})`);
// Ana wins 7-2 (the owner's tally set directly, to skip a whole match).
await p3.evaluate(() => {
  const api = window.seats[0].gh.current.api;
  api.setShared({ ...api.shared(), score: [7, 2], winner: 0, serveAt: 0 });
});
await p3.waitForFunction(() => window.seats.every(s => !s.el.querySelector('.g-center:last-of-type')?.hidden), null, { timeout: 5000 }).catch(() => {});
await p3.waitForTimeout(400);
const cards = await p3.evaluate(() => window.seats.map(s => {
  const card = [...s.el.querySelectorAll('.g-center')].find(c => c.querySelector('button'));
  const btn = card?.querySelector('button');
  return { shown: card && !card.hidden, text: card?.textContent || '', button: btn && !btn.hidden ? btn.textContent : '' };
}));
check(cards[2].shown && /You’re up next/.test(cards[2].text) && cards[2].button === 'Play next',
  `Cy's result card: "${cards[2].text}" with "${cards[2].button}"`);
check(/Next up: Cy/.test(cards[1].text) && cards[1].button === 'Next game', `Bo's result card: "${cards[1].text}" with "${cards[1].button}"`);
await p3.screenshot({ path: `${shotDir}airhockey-queue.png` });
// Bo (the loser, not the owner) asks for the next game.
await p3.evaluate(() => [...window.seats[1].el.querySelectorAll('.g-center button')].find(b => !b.hidden).click());
await p3.waitForFunction(() => window.seats.every(s => s.gh.current.api.shared()?.ids?.[1] === 'client3'), null, { timeout: 5000 }).catch(() => {});
await p3.waitForTimeout(500);
s3 = await sh3();
const logs = await p3.evaluate(() => window.seats.map(s => s.log.join(' | ')));
check(s3.every(s => JSON.stringify(s.ids) === '["client1","client3"]' && JSON.stringify(s.q) === '["client2"]' && s.winner == null && s.score.join() === '0,0'),
  `the winner stays, Cy takes Bo's seat, Bo goes to the back of the line (ids ${s3[0].ids}, line ${s3[0].q})`);
check(/You’re in!/.test(logs[2]) && /Cy takes your seat/.test(logs[1]) && /Cy takes Bo’s seat/.test(logs[0]),
  `everyone is told about the swap (${logs.map(l => `"${l}"`).join(', ')})`);
await p3.screenshot({ path: `${shotDir}airhockey-swap.png` });
// Cy, now on the top seat, plays as a rookie bot and her paddle moves the puck.
const cy = await p3.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  const owner = window.seats[0].gh.current.api;
  let step = 0, moved = 0;
  const p0 = JSON.stringify(window.seats[2].gh.current.api.state().p);
  await new Promise(done => {
    const t = setInterval(() => {
      driveRookie(window.seats[2].gh.current, ++step);
      driveRookie(window.seats[0].gh.current, step);
      const s = owner.shared();
      if (Math.hypot(s.puck[2], s.puck[3]) > 0.05) moved++;
      if (step >= 40) { clearInterval(t); done(); }
    }, 400);
  });
  return { moved, paddle: JSON.stringify(window.seats[2].gh.current.api.state().p) !== p0, score: owner.shared().score };
});
check(cy.paddle && cy.moved > 0, `Cy plays her seat: paddle published, puck moving in ${cy.moved} of 40 checks (score ${cy.score})`);
// Ana (owner, seat 0) leaves: Bo inherits the table and, first in line, her seat.
await p3.evaluate(() => window.leaveSeat(0));
await p3.waitForFunction(() => window.seats[1].gh.current.api.isOwner() && window.seats.slice(1).every(s => s.gh.current.api.shared()?.ids?.[0] === 'client2'), null, { timeout: 5000 }).catch(() => {});
const after = await p3.evaluate(() => window.seats.slice(1).map(s => s.gh.current.api.shared()));
check(after.every(s => JSON.stringify(s.ids) === '["client2","client3"]' && s.q.length === 0),
  `when Ana leaves, Bo takes her seat and plays Cy (${after.map(s => JSON.stringify([s.ids, s.q])).join(' / ')})`);
await p3.close();

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
