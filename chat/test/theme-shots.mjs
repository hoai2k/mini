// Screenshots the title screen, call screen, settings and games sheet in
// every theme on a phone-sized page with no relay, and fails on page errors.
//   chat/publish.sh local/pages/chat && node chat/test/theme-shots.mjs
// Pictures land in local/chat-shots/themes/. --color=#4cc3ff picks the
// player's colour (it frames every theme), and names the shots after it.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const pages = fileURLToPath(new URL('../../local/pages', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/themes/', import.meta.url));
await mkdir(outDir, { recursive: true });
const KEY = 'chat.settings';
const color = process.argv.find(a => a.startsWith('--color='))?.slice(8);
const tag = color ? `-${color.replace('#', '')}` : '';
const server = await serve(pages);
const browser = await launch();
let fails = 0;
for (const theme of ['teen', 'kid', 'art', 'classic']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  await ctx.addInitScript(([KEY, t, c]) => {
    try { localStorage.setItem(KEY, JSON.stringify(c ? { theme: t, color: c } : { theme: t })); } catch {}
  }, [KEY, theme, color]);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${server.url}/chat/?rooms=http://127.0.0.1:1`);
  await p.waitForTimeout(800);
  const got = await p.evaluate(() => document.documentElement.dataset.theme);
  if (got !== theme) { errors.push(`theme is ${got}, wanted ${theme}`); }
  await p.screenshot({ path: `${outDir}${theme}${tag}-1-title.png` });
  await p.fill('#name-input', 'Ana'); await p.click('#start-btn'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${outDir}${theme}${tag}-2-call.png` });
  const fxTab = p.locator('#btn-effects').first();
  if (await fxTab.count()) { await fxTab.click(); await p.waitForTimeout(500); }
  const item = p.locator('#effect-list .fx-item[data-fx]').nth(2);
  if (await item.count()) { await item.evaluate(e => { e.scrollIntoView({ inline: 'center' }); e.click(); }); await p.waitForTimeout(800); }
  await p.screenshot({ path: `${outDir}${theme}${tag}-3-effects.png` });
  // Tapping the strip's grip opens the grid of every effect.
  const grip = p.locator('#tray-effects .sheet-grip');
  if (await grip.count()) {
    await grip.click(); await p.waitForTimeout(700);
    await p.screenshot({ path: `${outDir}${theme}${tag}-3b-grid.png` });
    await grip.click(); await p.waitForTimeout(500);
  }
  const set = p.locator('.round-btn[data-open="settings"]').first();
  if (await set.count()) { await set.click(); await p.waitForTimeout(500); await p.screenshot({ path: `${outDir}${theme}${tag}-4-settings.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const gm = p.locator('#btn-games').first();
  if (await gm.count()) { await gm.click(); await p.waitForTimeout(600); await p.screenshot({ path: `${outDir}${theme}${tag}-5-games.png` }); }
  if (errors.length) { fails++; console.log(`FAIL ${theme}: ${errors.join(' | ')}`); } else console.log(`ok ${theme}`);
  await ctx.close();
}
await browser.close();
server.close();
if (fails) process.exit(1);
console.log(`ok: shots in ${outDir}`);
