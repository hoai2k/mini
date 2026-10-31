// Smoke check for the Micro prototypes: serves micro/prototypes/ locally,
// opens the list and each prototype in headless Chromium (software WebGL),
// drives the keyboard fallback for a few seconds, fails on any console error
// or page error, and saves a screenshot of each to $SHOTS (default: the
// system temp folder).
//
//   node micro/prototypes/check.mjs                 # every page
//   node micro/prototypes/check.mjs amoeba mite     # just these
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = dirname(fileURLToPath(import.meta.url));
const shots = process.env.SHOTS || tmpdir();
const ALL = ['', 'springtail/', 'mite/', 'tardigrade/', 'amoeba/', 'paramecium/', 'bacterium/', 'phage/', 'zoom/', 'split-demo/'];
const pages = process.argv.length > 2 ? process.argv.slice(2).map((p) => (p === 'index' ? '' : p.replace(/\/?$/, '/'))) : ALL;

// Syntax check every module first.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'vendor' ? [] : walk(join(d, e.name))) : [join(d, e.name)]));
for (const f of walk(root).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))) execFileSync(process.execPath, ['--check', f]);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try {
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error();
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
for (const page of pages) {
  const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  tab.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  tab.on('pageerror', (e) => errors.push(String(e)));
  tab.on('requestfailed', (r) => !/favicon/.test(r.url()) && errors.push(`request failed: ${r.url()}`));
  tab.on('response', (r) => r.status() >= 400 && !/favicon/.test(r.url()) && errors.push(`${r.status()} ${r.url()}`));
  await tab.goto(base + page, { waitUntil: 'load' });
  await tab.waitForTimeout(2500);
  if (page) {
    for (const k of ['KeyD', 'KeyW', 'Space']) { await tab.keyboard.down(k); await tab.waitForTimeout(700); await tab.keyboard.up(k); }
    await tab.waitForTimeout(500);
    const hasCanvas = await tab.evaluate(() => !!document.querySelector('canvas'));
    if (!hasCanvas) errors.push('no canvas on the page');
  }
  const name = (page || 'index').replace(/\/$/, '');
  await tab.screenshot({ path: join(shots, `micro-${name}.png`) });
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${name}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  failed += errors.length ? 1 : 0;
  await tab.close();
}
await browser.close();
server.close();
console.log(`screenshots in ${shots}`);
process.exit(failed ? 1 : 0);
