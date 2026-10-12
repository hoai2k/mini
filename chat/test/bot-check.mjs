// Plays every game with seat 2 driven exactly as a debug bot drives it
// (js/rookie.js) and seat 1 doing the same as a stand-in human, then reports
// how much the bot did: messages sent, its own state changes, and shared
// state changes made while it was the owner. A bot that sends nothing and
// never changes its state "just sat there".
//   node chat/test/bot-check.mjs [ids] [--secs=20]
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const secs = parseFloat(args.find(a => a.startsWith('--secs='))?.slice(7) ?? '20');
const { GAME_IDS } = await import('../games/index.js');
const ids = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : GAME_IDS;
const server = await serve(chatDir);
const browser = await launch();
let idle = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/test/game.html?game=${id}&n=2&expr=0`);
  await page.waitForFunction(() => window.ready === true && window.seats?.every(s => s.gh.current), null, { timeout: 20000 });
  const result = await page.evaluate(async ({ secs }) => {
    const { driveRookie } = await import('../js/rookie.js');
    const counts = window.seats.map(() => ({ sends: 0, states: 0, shared: 0 }));
    window.seats.forEach((seat, i) => {
      const api = seat.gh.current.api;
      for (const [fn, key] of [['send', 'sends'], ['sendTo', 'sends'], ['setState', 'states'], ['setShared', 'shared']]) {
        const orig = api[fn];
        if (typeof orig !== 'function') continue;
        let last = '';
        api[fn] = (...a) => {
          const sig = JSON.stringify(a);
          if (key === 'sends' || sig !== last) counts[i][key]++;
          last = sig;
          return orig.apply(api, a);
        };
      }
    });
    let step = 0;
    await new Promise(done => {
      const t = setInterval(() => {
        step++;
        for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
        if (step * 0.4 >= secs) { clearInterval(t); done(); }
      }, 400);
    });
    return counts;
  }, { secs });
  const bot = result[1];
  const did = bot.sends + bot.states + bot.shared;
  if (!did) idle++;
  console.log(`${did ? 'ok  ' : 'IDLE'} ${id.padEnd(11)} bot: ${bot.sends} sends, ${bot.states} state changes, ${bot.shared} shared   (other seat: ${result[0].sends}/${result[0].states}/${result[0].shared})${errors.length ? `  ERRORS: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await page.close();
}
await browser.close();
server.close();
if (idle) { console.log(`${idle} games where the bot did nothing`); process.exit(1); }
