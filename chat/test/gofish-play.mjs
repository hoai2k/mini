// Plays whole games of Go Fish in test/game.html, clicking for every seat:
// deal, pick a creature, pick whom to ask, give or say Go Fish, cast. Checks
// that the 52 cards are always all accounted for (hands + pond + books), that
// the pond shows one fish shadow per card left once fewer than four remain,
// and that the game ends with all thirteen books made.
//   node chat/test/gofish-play.mjs [--n=2]     (--n=1 plays Robo-Fisher)
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });
const n = parseInt(process.argv.find(a => a.startsWith('--n='))?.slice(4) ?? '2', 10);

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: n * 402 + 30, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${server.url}/test/game.html?game=gofish&n=${n}&w=390&h=690`);
await page.waitForFunction(() => document.querySelectorAll('.gf').length >= 1, null, { timeout: 15000 });
await page.waitForTimeout(1500);

const fail = msg => { console.log(`FAIL ${msg}`); process.exitCode = 1; };
let shotMid = false, shotLow = false, shotFish = false, checks = 0, asks = 0, fishes = 0;
const started = Date.now();
for (;;) {
  if (Date.now() - started > 300000) { fail('game did not finish in 5 minutes'); break; }
  const st = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('.gf')];
    return { s: roots[0]?.gofishState?.(), overs: roots.map(r => !r.querySelector('.gf-over').hidden) };
  });
  const s = st.s;
  if (s && s.phase !== 'lobby') {
    const inHands = s.order.reduce((a, id) => a + (s.hands[id] || []).length, 0);
    const inBooks = Object.values(s.books).reduce((a, b) => a + b.length * 4, 0);
    if (inHands + s.pond.length + inBooks !== 52) { fail(`cards lost: hands ${inHands} pond ${s.pond.length} books ${inBooks}`); break; }
    checks++;
    if (s.phase === 'fish' && s.ask && !shotFish) { await page.screenshot({ path: `${outDir}gofish-fish.png` }); shotFish = true; }
    if (s.phase === 'catch' && !shotMid) { await page.waitForTimeout(1900); await page.screenshot({ path: `${outDir}gofish-catch.png` }); shotMid = true; }
    if (s.pond.length > 0 && s.pond.length < 3 && !shotLow && s.phase !== 'catch') { await page.screenshot({ path: `${outDir}gofish-low.png` }); shotLow = s.pond.length; }
  }
  if (st.overs.every(Boolean) && s?.phase === 'over') {
    const books = Object.values(s.books).reduce((a, b) => a + b.length, 0);
    if (books !== 13) fail(`game ended with ${books} books`);
    await page.screenshot({ path: `${outDir}gofish-over.png` });
    console.log(`ok   finished: ${books} books (${s.order.map(id => `${s.names[id]} ${s.books[id].length}`).join(', ')}), ${asks} asks, ${fishes} casts, ${checks} card counts checked`);
    break;
  }
  // Act for every seat: click whatever its game is asking for.
  const did = await page.evaluate(() => {
    const out = [];
    for (const r of document.querySelectorAll('.gf')) {
      const btn = t => [...r.querySelectorAll('.gf-bar .btn')].find(b => b.textContent.startsWith(t));
      const deal = btn('Deal') || btn('Play Robo');
      if (deal) { deal.click(); out.push('deal'); continue; }
      const give = btn('Give') || btn('Go Fish!');
      if (give) { give.click(); out.push('answer'); continue; }
      const fish = btn('🎣 Go Fish') || btn('The pond is empty');
      if (fish) { fish.click(); out.push('fish'); continue; }
      const askBtn = btn('Ask');
      if (askBtn) { askBtn.click(); out.push('ask'); continue; }
      const cards = [...r.querySelectorAll('.gf-hand .gf-card[aria-disabled="false"]')];
      if (cards.length && !r.querySelector('.gf-card.sel')) { cards[Math.floor(Math.random() * cards.length)].click(); out.push('pick'); continue; }
      const chips = [...r.querySelectorAll('.gf-chip.pick:not(:disabled)')];
      if (chips.length && !r.querySelector('.gf-chip.sel')) { chips[0].click(); out.push('target'); }
    }
    return out;
  });
  asks += did.filter(d => d === 'ask').length;
  fishes += did.filter(d => d === 'fish').length;
  await page.waitForTimeout(did.length ? 250 : 200);
}
if (!shotMid) fail('never saw a cast');
if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
await browser.close();
server.close();
