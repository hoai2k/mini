// A browser walk-through of Bookzam on a phone-sized screen, with the photo
// server and Open Library mocked, so it needs no network or AI. Saves
// screenshots to local/bookzam-check/.
//
//   cd local/tools && npm install playwright-core   (once)
//   node bookzam/tools/browser-check.mjs
//
// Set CHROMIUM to a Chromium binary if it isn't at /opt/pw-browsers.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
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

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
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

// A fake shelf: coloured spines on a brown board.
function shelfSvg() {
  const spines = Array.from({ length: 14 }, (_, i) => `<rect x="${60 + i * 78}" y="120" width="66" height="560" fill="hsl(${i * 47} 50% 40%)"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#6b4a2b"/>${spines}<rect y="680" width="1200" height="40" fill="#3d2814"/></svg>`;
}

const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };

const browser = await chromium.launch({ executablePath: chromiumPath() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// A real JPEG of the fake shelf, made by the browser itself.
const shelf = await page.evaluate(async (svg) => {
  const img = new Image();
  img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = Object.assign(document.createElement('canvas'), { width: 1200, height: 900 });
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/jpeg', 0.9).split(',')[1];
}, shelfSvg());
const shelfFile = { name: 'shelf.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(shelf, 'base64') };

const finds = [];
await page.route('https://mini-rooms.hoai2k.workers.dev/bookzam/**', async (route) => {
  const body = route.request().postDataJSON();
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith('/scan')) {
    await new Promise((r) => setTimeout(r, 400));
    return route.fulfill({ json: {
      books: [
        { title: 'Dune', author: 'Frank Herbert', confidence: 0.95 },
        { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', confidence: 0.9 },
        { title: 'Piranesi', author: 'Susanna Clarke', confidence: 0.5 },
      ],
      games: [{ title: 'Wingspan', publisher: 'Stonemaier Games', designer: 'Elizabeth Hargrave', year: 2019, confidence: 0.9 }],
      unreadable: 2, source: 'claude',
    } });
  }
  finds.push(body);
  if (/zzz/i.test(body.query)) return route.fulfill({ json: { found: false, title: null, box: null, where: 'It is not on these shelves.', similar: ['Dune', 'Piranesi'], source: 'claude' } });
  // First look: a loose box on spine 6; the close-up: tighter, inside the crop.
  const box = finds.length % 2 ? { x0: 0.42, y0: 0.1, x1: 0.52, y1: 0.8 } : { x0: 0.3, y0: 0.08, x1: 0.55, y1: 0.9 };
  return route.fulfill({ json: { found: true, title: 'Dune', box, where: 'Middle of the shelf.', similar: [], source: 'claude' } });
});
await page.route('https://openlibrary.org/**', (route) => route.fulfill({ json: { docs: [{ key: '/works/OL893415W', title: 'Dune', author_name: ['Frank Herbert'], first_publish_year: 1965, isbn: ['9780441172719'] }] } }));
await page.route('https://covers.openlibrary.org/**', (route) => route.abort());

await page.goto(base);
await page.screenshot({ path: join(out, '1-empty.png') });
check(await page.isVisible('#empty'), 'an empty catalogue shows the big add button');

await page.setInputFiles('#add-input', shelfFile);
await page.waitForSelector('.job[data-state="done"]', { timeout: 10000 });
await page.waitForFunction(() => !document.querySelector('.looking'), null, { timeout: 10000 });
await page.screenshot({ path: join(out, '2-books.png') });
check(await page.locator('#items .item').count() === 3, 'three books were added');
check((await page.textContent('#count-games')) === '1', 'one board game was added');
check(/Added 3 books and 1 board game/.test(await page.textContent('.job')), 'the job says what it added');
check(await page.locator('.unsure').count() === 1, 'the unsure title is marked');

await page.setInputFiles('#add-input', shelfFile);
await page.waitForFunction(() => document.querySelectorAll('.job[data-state="done"]').length === 2, null, { timeout: 10000 });
check(await page.locator('#items .item').count() === 3, 'the same photo again adds no duplicates');

await page.click('#seg-games');
check(/Wingspan/.test(await page.textContent('#items')), 'the board game list shows Wingspan');
await page.click('#seg-books');
await page.click('#items .item >> text=Dune');
await page.waitForSelector('#item-sheet[open]');
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, '3-item.png') });
check(/1965/.test(await page.textContent('#item-facts')), 'the item shows its Open Library year');

// Find on shelf from the item.
await page.click('#item-find');
check(await page.isVisible('#view-find'), 'Find on shelf opens Find Book');
check((await page.inputValue('#find-query')) === 'Dune', 'with the title filled in');
await page.setInputFiles('#find-input', shelfFile);
await page.waitForSelector('.overlay .ring.refined', { timeout: 10000 });
await page.waitForFunction(() => !document.querySelector('.frame.scanning'), null, { timeout: 10000 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(out, '4-found.png') });
check(finds.length === 2, 'Find looks twice: the photo, then a close-up');
check(finds[1].width <= 1568 && finds[1].height <= 1568, 'the close-up fits the size limit');
check(/Found/.test(await page.textContent('#verdict')), 'it says it found the book');
await page.click('#frame');
await page.waitForTimeout(600);
await page.screenshot({ path: join(out, '5-zoomed.png') });
check((await page.getAttribute('#zoomer', 'style') || '').includes('scale'), 'tapping the photo zooms in');

await page.fill('#find-query', 'zzz not here');
await page.click('#find-again');
await page.waitForSelector('.chip', { timeout: 10000 });
await page.screenshot({ path: join(out, '6-missing.png') });
check(/Couldn't find/.test(await page.textContent('#verdict')), 'a missing book says so');

// Export and reload persistence.
await page.click('#tab-catalogue');
await page.click('#menu-btn');
const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-books')]);
const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
check(exported.count === 3 && exported.items.some((b) => b.isbn === '9780441172719'), 'books export as JSON with ISBNs');
await page.reload();
await page.waitForSelector('#items .item');
check(await page.locator('#items .item').count() === 3, 'the catalogue survives a reload');

check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no sideways scrolling at 390 px');
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed` : `\nall passed; screenshots in ${out}`);
process.exit(failures.length ? 1 : 0);
