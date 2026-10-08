// Trivia with two simulated players: both vote, both answer, and the
// question must close as soon as the second answer is in (well before its
// 15-second clock runs out), with both answers recorded.
//   node chat/test/trivia-check.mjs
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const server = await serve(fileURLToPath(new URL('..', import.meta.url)));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page.goto(`${server.url}/test/game.html?game=trivia&n=2&expr=0`);
await page.waitForFunction(() => window.ready === true);
await page.waitForTimeout(3500);
const phase = i => page.evaluate(i => window.seats[i].gh.current.api.shared()?.phase, i);
const click = (i, k) => page.evaluate(([i, k]) => {
  const b = [...window.seats[i].el.querySelectorAll('.panel button')];
  b[b.length - 4 + k].click();
}, [i, k]);
for (const i of [0, 1]) await click(i, 0);
await page.waitForFunction(() => window.seats.every(s => s.gh.current.api.shared()?.phase === 'question'), null, { timeout: 15000 });
await page.waitForTimeout(800);
const t0 = Date.now();
await click(1, 0);
await page.waitForTimeout(300);
await click(0, 1);
const closed = await page.waitForFunction(() => window.seats[0].gh.current.api.shared()?.phase === 'reveal', null, { timeout: 20000 }).then(() => true, () => false);
const ms = Date.now() - t0;
const answers = await page.evaluate(() => Object.keys(window.seats[0].gh.current.api.shared()?.answers || {}).length);
const ok = closed && ms < 4000 && answers === 2 && (await phase(1)) === 'reveal';
console.log(`${ok ? 'ok  ' : 'FAIL'} the question closes once both have answered (${ms} ms, ${answers} answers)`);
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
