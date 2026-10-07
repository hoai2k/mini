// Plays Hoops on a phone-sized screen with real swipes: several straight and
// slightly crooked flicks of different lengths, which should all score.
//   node chat/test/hoops-play.mjs
// The picture lands in local/chat-shots/hoops-play.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
await page.goto(`${server.url}/test/game.html?game=hoops&n=1&expr=0`);
await page.addStyleTag({ content: ':root { --seat-h: 700px; }' });
await page.waitForFunction(() => window.ready === true, null, { timeout: 20000 });
await page.waitForTimeout(1500);
const box = await page.locator('.g-canvas').first().boundingBox();
await page.screenshot({ path: `${outDir}hoops-ready.png` });
// Start near the bottom middle of the game, where the ball sits.
const sx = box.x + box.width / 2, sy = box.y + box.height * 0.82;
const flicks = [[0, 120], [0, 260], [12, 200], [-15, 160], [0, 380], [20, 300]];
let failed = 0;
for (const [dx, len] of flicks) {
  const before = await page.evaluate(() => window.seats[0].gh.current.api.store.get('total', 0));
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(sx + (dx * i) / 6, sy - (len * i) / 6);
  await page.mouse.up();
  await page.waitForTimeout(2600);
  const after = await page.evaluate(() => window.seats[0].gh.current.api.store.get('total', 0));
  const ok = after === before + 1;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'MISS'} flick ${len}px up, ${dx}px sideways`);
}
await page.screenshot({ path: `${outDir}hoops-play.png` });
await browser.close();
server.close();
if (failed) process.exit(1);
