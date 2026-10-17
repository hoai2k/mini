// A browser walk-through of Bookzam on a phone-sized screen with the real
// reader (worker, ONNX Runtime and the models) on a shelf drawn in the page,
// and Open Library mocked, so it needs no network. Saves screenshots to
// local/bookzam-check/.
//
//   cd local/tools && npm install playwright-core   (once)
//   node bookzam/tools/browser-check.mjs
//
// Set CHROMIUM to a Chromium binary if it isn't at /opt/pw-browsers.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const require = createRequire(join(root, 'local/tools/package.json'));
const { chromium } = require('playwright-core');
const app = join(root, 'bookzam/app');
const out = join(root, 'local/bookzam-check');
await mkdir(out, { recursive: true });

function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const dir = '/opt/pw-browsers';
  const name = existsSync(dir) && readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
  return name ? join(dir, name, 'chrome-linux/chrome') : undefined;
}

const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const file = join(app, path.endsWith('/') ? `${path}index.html` : path);
    if (!file.startsWith(app)) throw new Error('outside');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

// The shelf: spines with real titles (reading down and up), a book lying flat and a game box.
const SPINES = [
  { title: 'THE SELFISH GENE', by: 'DAWKINS', color: '#2b4c7e', up: false },
  { title: 'ONTOGENY AND PHYLOGENY', by: 'GOULD', color: '#7a2e2e', up: false },
  { title: 'A DROP OF BLOOD', by: 'SHOWERS', color: '#2e6b4f', up: true },
  { title: 'GÖDEL, ESCHER, BACH', by: 'HOFSTADTER', color: '#5b3a7a', up: false },
];
const OPEN_LIBRARY = [
  { key: '/works/OL1W', title: 'The Selfish Gene', author_name: ['Richard Dawkins'], first_publish_year: 1976, isbn: ['9780198788607'] },
  { key: '/works/OL2W', title: 'Ontogeny and phylogeny', author_name: ['Stephen Jay Gould'], first_publish_year: 1977 },
  { key: '/works/OL3W', title: 'A drop of blood', author_name: ['Paul Showers'], first_publish_year: 1967 },
  { key: '/works/OL4W', title: 'Gödel, Escher, Bach', author_name: ['Douglas R. Hofstadter'], first_publish_year: 1979 },
  { key: '/works/OL5W', title: 'Metamorphoses', author_name: ['Ovid'], first_publish_year: 8 },
];

const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };

const browser = await chromium.launch({ executablePath: chromiumPath() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/cpuid_info|Unknown CPU vendor/.test(m.text())) errors.push(m.text()); });

const olQueries = [];
await page.route('https://openlibrary.org/**', (route) => {
  const q = new URL(route.request().url()).searchParams.get('q') || '';
  olQueries.push(q);
  const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const terms = fold(q).split(/\s+or\s+|\s+/).filter(Boolean);
  const any = / OR /.test(q);
  const docs = OPEN_LIBRARY.filter((d) => {
    const hay = fold(`${d.title} ${d.author_name.join(' ')}`);
    return any ? terms.some((t) => hay.includes(t)) : terms.every((t) => hay.includes(t));
  });
  return route.fulfill({ json: { numFound: docs.length, docs } });
});
await page.route('https://covers.openlibrary.org/**', (route) => route.abort());

await page.goto(base);

// Draw the shelf as a photo (a JPEG made by the page itself).
const shelf = await page.evaluate(async ({ spines }) => {
  const W = 1400, H = 1000, c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d');
  g.fillStyle = '#6b4a2b'; g.fillRect(0, 0, W, H);
  const xs = [];
  spines.forEach((s, i) => {
    const x = 120 + i * 130, w = 110, y = 80, h = 760;
    xs.push([x / W, (x + w) / W]);
    g.fillStyle = s.color; g.fillRect(x, y, w, h);
    g.save();
    g.translate(x + w / 2, y + h / 2);
    g.rotate(s.up ? -Math.PI / 2 : Math.PI / 2);
    g.fillStyle = '#f4ecd8'; g.textAlign = 'center'; g.textBaseline = 'middle';
    // Title towards the top of the spine, author at the bottom, well apart.
    g.font = 'bold 36px Georgia, serif'; g.textAlign = 'left'; g.fillText(s.title, -h / 2 + 30, 0);
    g.font = 'bold 28px Georgia, serif'; g.textAlign = 'right'; g.fillText(s.by, h / 2 - 30, 0);
    g.restore();
  });
  // A book lying flat, and a game box.
  g.fillStyle = '#c9b48a'; g.fillRect(760, 760, 560, 80);
  g.fillStyle = '#2a1d10'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('OVID  METAMORPHOSES', 790, 800);
  g.fillStyle = '#e8f1f8'; g.fillRect(760, 180, 560, 420);
  g.fillStyle = '#1b4965'; g.font = 'bold 64px sans-serif'; g.fillText('WINGSPAN', 860, 330);
  g.font = 'bold 34px sans-serif'; g.fillText('A competitive bird game', 800, 420); g.fillText('1-5 players  ages 14+', 840, 480);
  g.fillStyle = '#3d2814'; g.fillRect(0, 840, W, 40);
  return { jpeg: c.toDataURL('image/jpeg', 0.92).split(',')[1], xs };
}, { spines: SPINES });
const shelfFile = { name: 'shelf.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(shelf.jpeg, 'base64') };
await writeFile(join(out, 'shelf.jpg'), shelfFile.buffer);

await page.screenshot({ path: join(out, '1-empty.png') });
check(await page.isVisible('#empty'), 'an empty catalogue shows the big add button');

const t0 = Date.now();
const seen = new Set();
await page.setInputFiles('#add-input', shelfFile);
// Watch the job card's progress text until it finishes.
for (;;) {
  const state = await page.getAttribute('.job', 'data-state');
  const text = (await page.textContent('.job .job-text')) || '';
  if (/ready/.test(text)) seen.add('download');
  if (/Reading the titles: \d/.test(text)) seen.add('recognise');
  if (/Looking them up/.test(text)) seen.add('lookup');
  if (state === 'done' || state === 'failed') break;
  if (Date.now() - t0 > 240000) break;
  await page.waitForTimeout(150);
}
const seconds = ((Date.now() - t0) / 1000).toFixed(1);
await page.screenshot({ path: join(out, '2-books.png') });
const jobText = await page.textContent('.job');
console.log(`     read the shelf in ${seconds} s: ${jobText.replace('×', '')}`);
check(await page.getAttribute('.job', 'data-state') === 'done', 'the photo was read');
check(seen.has('download') && seen.has('recognise'), `progress shows the download and the reading (${[...seen].join(', ')})`);
const titles = await page.$$eval('#items .item .title', (els) => els.map((e) => e.textContent.trim()));
for (const want of ['The Selfish Gene', 'Ontogeny and phylogeny', 'A drop of blood', 'Gödel, Escher, Bach', 'Metamorphoses']) {
  check(titles.some((t) => t.startsWith(want)), `found "${want}"`);
}
check(olQueries.some((q) => /selfish/.test(q) && /gene/.test(q)), 'Open Library was searched with the words read');
await page.click('#seg-games');
const games = await page.$$eval('#items .item .title', (els) => els.map((e) => e.textContent.trim()));
console.log(`     books: ${titles.join(' | ')}\n     games: ${games.join(' | ')}`);
check(games.some((t) => /Wingspan/i.test(t)), 'the game box went to board games');
await page.click('#seg-books');

await page.setInputFiles('#add-input', shelfFile);
await page.waitForFunction(() => document.querySelectorAll('.job[data-state="done"], .job[data-state="failed"]').length === 2, null, { timeout: 240000 });
check((await page.locator('#items .item').count()) === titles.length, 'the same photo again adds no duplicates');

await page.click('#items .item >> text=The Selfish Gene');
await page.waitForSelector('#item-sheet[open]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, '3-item.png') });
check(/1976/.test(await page.textContent('#item-facts')), 'the item shows its Open Library year');

// Find on shelf from the item.
await page.click('#item-find');
check(await page.isVisible('#view-find'), 'Find on shelf opens Find Book');
await page.setInputFiles('#find-input', shelfFile);
await page.waitForFunction(() => ['found', 'missing', 'error'].includes(document.querySelector('#verdict').dataset.state), null, { timeout: 240000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '4-found.png') });
check(/Found/.test(await page.textContent('#verdict')), 'it found The Selfish Gene');
const ring = await page.evaluate(() => {
  const e = document.querySelector('.overlay ellipse.ring');
  const vb = document.querySelector('.overlay').viewBox.baseVal;
  const dim = document.querySelector('.overlay .dim');
  return e && { cx: e.cx.baseVal.value / vb.width, cy: e.cy.baseVal.value / vb.height, dim: dim ? getComputedStyle(dim).opacity : null };
});
const [sx0, sx1] = shelf.xs[0];
check(ring && ring.cx > sx0 && ring.cx < sx1, `the ring is on the first spine (${ring && ring.cx.toFixed(3)} in ${sx0.toFixed(3)}–${sx1.toFixed(3)})`);
check(ring && Number(ring.dim) > 0.9, 'the rest of the photo is dimmed');

const t1 = Date.now();
await page.fill('#find-query', 'Gödel Escher Bach');
await page.click('#find-again');
await page.waitForFunction(() => ['found', 'missing', 'error'].includes(document.querySelector('#verdict').dataset.state), null, { timeout: 60000 });
check(Date.now() - t1 < 2000, 'searching the same photo again is instant');
const ring2 = await page.evaluate(() => { const e = document.querySelector('.overlay ellipse.ring'); return e && e.cx.baseVal.value / document.querySelector('.overlay').viewBox.baseVal.width; });
const [gx0, gx1] = shelf.xs[3];
check(ring2 > gx0 && ring2 < gx1, 'and finds a spine that reads the other way');

await page.fill('#find-query', 'Cryptonomicon');
await page.click('#find-again');
await page.waitForSelector('#verdict[data-state="missing"]', { timeout: 60000 });
await page.screenshot({ path: join(out, '5-missing.png') });
check((await page.locator('.chip').count()) > 0, 'a missing book offers the titles it could read');

// Export and reload persistence.
await page.click('#tab-catalogue');
await page.click('#menu-btn');
const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-books')]);
const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
check(exported.items.some((b) => b.openLibrary === 'https://openlibrary.org/works/OL1W' && b.isbn === '9780198788607'), 'books export as JSON with Open Library links and ISBNs');
await page.reload();
await page.waitForSelector('#items .item');
check((await page.locator('#items .item').count()) === titles.length, 'the catalogue survives a reload');

check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no sideways scrolling at 390 px');
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed` : `\nall passed; screenshots in ${out}`);
process.exit(failures.length ? 1 : 0);
