// Headless check for the Micro workbench: serves micro/, opens
// workbench/index.html, fails on any console or page error or failed request,
// plays a trigger in each sound set, a menu sound in each set and a song,
// switches to the Sounds view and plays a take, and marks a sound.
// Also fails if audio-triggers.js is stale.
//
//   node micro/workbench/check.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here); // micro/
execFileSync(process.execPath, [join(here, 'build_audio_triggers.mjs'), '--check'], { stdio: 'inherit' });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try {
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const { chromium } = createRequire(join(root, 'game', 'check.mjs'))('playwright');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const tab = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
const ignore = (t) => /fonts\.g(oogleapis|static)/.test(t);
tab.on('console', (m) => m.type() === 'error' && !ignore(m.text()) && errors.push(m.text()));
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('requestfailed', (r) => !ignore(r.url()) && errors.push(`request failed: ${r.url()}`));
tab.on('response', (r) => r.status() >= 400 && !ignore(r.url()) && errors.push(`${r.status()} ${r.url()}`));
const step = (s) => console.log(`  ${s}`);
try {
  await tab.goto(`http://127.0.0.1:${server.address().port}/workbench/`, { waitUntil: 'load' });
  await tab.waitForSelector('.row');
  const n = await tab.locator('.row').count();
  if (n < 100) throw new Error(`only ${n} trigger rows`);
  step(`${n} trigger rows`);
  // A trigger with a different sound in each set: mite's jump.
  await tab.fill('#q', 'mite/jump');
  const row = tab.locator('.row').filter({ hasText: 'mite/jump' }).first();
  await row.locator('.side:not(.exp) .play').click();
  await row.locator('.side.exp .play').click();
  await tab.waitForTimeout(800);
  step('mite jump played in Default (mite/dash) and Experimental (mite/jump)');
  await tab.fill('#q', '');
  await tab.selectOption('#world', 'game');
  await tab.locator('[data-menu="1"][data-set="old"]').click();
  await tab.locator('[data-menu="1"][data-set="new"]').click();
  await tab.locator('[data-song="lullaby"]').click();
  await tab.waitForTimeout(1500);
  await tab.locator('[data-song="lullaby"]').click();
  const set = await tab.evaluate(() => localStorage.getItem('micro.sfxSet'));
  if (set !== null) throw new Error(`the workbench wrote the game's sound set (${set})`);
  step('menu select in both sets, Clockwork Lullaby; the game’s sound set untouched');
  await tab.selectOption('#world', 'all');
  await tab.click('[data-view="sounds"]');
  const takes = tab.locator('.row.sound').filter({ hasText: 'mite/step' }).first();
  await takes.locator('.play').nth(1).click();
  await takes.locator('[data-mark] select').selectOption('regenerate');
  await tab.waitForTimeout(500);
  const marks = await tab.evaluate(() => JSON.parse(localStorage.getItem('micro.workbench.audioMarks')));
  if (marks['mite/step']?.mark !== 'regenerate') throw new Error('the mark was not kept');
  step('Sounds view: a take of mite/step, marked Regenerate');
  await tab.screenshot({ path: join(process.env.SHOTS || '/tmp', 'micro-workbench.png'), fullPage: false });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('ok   micro workbench');
} catch (e) {
  console.error(`FAIL micro workbench\n  ${String(e.message || e).split('\n').join('\n  ')}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
