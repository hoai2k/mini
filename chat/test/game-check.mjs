// Opens test/game.html for each game with simulated players, checks that the
// session starts on every seat without errors, and screenshots it.
//   node chat/test/game-check.mjs                every game
//   node chat/test/game-check.mjs hoops rps      just these
//   node chat/test/game-check.mjs --n=3 hoops    with three players
//   node chat/test/game-check.mjs --n=3 --late bowling
//                                                the last seat joins mid-game
//                                                (also pictured as game-<id>-late.png)
// Pictures land in local/chat-shots/game-<id>.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const args = process.argv.slice(2);
const nArg = args.find(a => a.startsWith('--n='));
const n = nArg ? parseInt(nArg.slice(4), 10) : 2;
const late = args.includes('--late') && n > 1;
const { GAME_IDS } = await import('../games/index.js');
const ids = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : GAME_IDS;

const server = await serve(chatDir);
const browser = await launch();
let failed = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: Math.min(1900, n * 480 + 40), height: 640 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource|mediapipe|vision_wasm|TensorFlow Lite/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(`${server.url}/test/game.html?game=${id}&n=${n}&expr=0${late ? '&hold=1' : ''}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
  const loaded = await page.evaluate(() => window.loadedGames);
  if (!loaded.includes(id)) errors.push(`game ${id} did not load`);
  await page.waitForTimeout(3500);
  if (late) {
    await page.screenshot({ path: `${outDir}game-${id}.png` });
    await page.evaluate(i => window.joinSeat(i), n - 1);
    await page.waitForTimeout(3500);
  }
  const seats = await page.evaluate(() => window.seats.map(s => ({
    open: !!s.gh.current,
    players: s.gh.current ? s.gh.current.api.players().length : 0,
    content: s.el.querySelector('.panel .game-root')?.childElementCount ?? 0,
  })));
  seats.forEach((s, i) => {
    if (!s.open) errors.push(`seat ${i + 1} has no game open`);
    else if (s.players !== n) errors.push(`seat ${i + 1} sees ${s.players} players, expected ${n}`);
    if (s.open && !s.content) errors.push(`seat ${i + 1} game root is empty`);
  });
  await page.screenshot({ path: `${outDir}game-${id}${late ? '-late' : ''}.png` });
  if (errors.length) {
    failed++;
    console.log(`FAIL ${id}: ${errors.join(' | ')}`);
  } else {
    console.log(`ok ${id}`);
  }
  await page.close();
}
await browser.close();
server.close();
if (failed) process.exit(1);
