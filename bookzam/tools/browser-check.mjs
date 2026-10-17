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

import { ean13, barcodeImage, y4m } from './ean13.mjs';

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
  { title: 'THE SELFISH GENE', by: 'DAWKINS', color: '#2b4c7e', band: '#101820', bands: [20, 560], up: false },
  { title: 'ONTOGENY AND PHYLOGENY', by: 'GOULD', color: '#7a2e2e', band: '#2a0808', bands: [60, 470], up: false },
  { title: 'A DROP OF BLOOD', by: 'SHOWERS', color: '#2e6b4f', band: '#0a2a10', bands: [120, 610], up: true },
  { title: 'GÖDEL, ESCHER, BACH', by: 'HOFSTADTER', color: '#5b3a7a', band: '#100820', bands: [30, 380], up: false },
];
const OPEN_LIBRARY = [
  { key: '/works/OL1W', title: 'The Selfish Gene', author_name: ['Richard Dawkins'], first_publish_year: 1976, isbn: ['9780198788607'] },
  { key: '/works/OL2W', title: 'Ontogeny and phylogeny', author_name: ['Stephen Jay Gould'], first_publish_year: 1977 },
  { key: '/works/OL3W', title: 'A drop of blood', author_name: ['Paul Showers'], first_publish_year: 1967 },
  { key: '/works/OL4W', title: 'Gödel, Escher, Bach', author_name: ['Douglas R. Hofstadter'], first_publish_year: 1979 },
  { key: '/works/OL5W', title: 'Metamorphoses', author_name: ['Ovid'], first_publish_year: 8 },
];
// Books found by the ISBN on their barcodes.
const BY_ISBN = {
  '9780441172719': { key: '/works/OL6W', title: 'Dune', author_name: ['Frank Herbert'], first_publish_year: 1965 },
  '9780140449136': { key: '/works/OL7W', title: 'The Odyssey', author_name: ['Homer'], first_publish_year: -700 },
};
// The fake camera films the barcode of The Odyssey.
const cameraFile = join(out, 'camera.y4m');
await writeFile(cameraFile, y4m(barcodeImage('9780140449136', { width: 640, height: 300, top: 90 })));

const failures = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };

const browser = await chromium.launch({
  executablePath: chromiumPath(),
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${cameraFile}`],
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, permissions: ['camera'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/cpuid_info|Unknown CPU vendor/.test(m.text())) errors.push(m.text()); });

const olQueries = [];
await page.route('https://openlibrary.org/**', (route) => {
  const isbn = new URL(route.request().url()).searchParams.get('isbn');
  if (isbn) return route.fulfill({ json: { docs: BY_ISBN[isbn] ? [BY_ISBN[isbn]] : [] } });
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
const BLANK_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
await page.route('https://covers.openlibrary.org/**', (route) => route.fulfill({ contentType: 'image/png', body: BLANK_PNG }));
// Wikidata, for board games: two known games with BoardGameGeek IDs.
const WIKIDATA = {
  Q1: { id: 'Q1', labels: { en: { value: 'Wingspan' } }, claims: { P2339: [{ mainsnak: { datavalue: { value: '266192' } } }], P577: [{ mainsnak: { datavalue: { value: { time: '+2019-01-01T00:00:00Z' } } } }], P1872: [{ mainsnak: { datavalue: { value: { amount: '+1' } } } }], P1873: [{ mainsnak: { datavalue: { value: { amount: '+5' } } } }] } },
  Q2: { id: 'Q2', labels: { en: { value: 'Ticket to Ride' } }, claims: { P2339: [{ mainsnak: { datavalue: { value: '9209' } } }] } },
};
const wdQueries = [];
await page.route('https://www.wikidata.org/**', (route) => {
  const p = new URL(route.request().url()).searchParams;
  if (p.get('action') === 'query') {
    const q = (p.get('srsearch') || '').toLowerCase().replace(' haswbstatement:p2339', '');
    wdQueries.push(q);
    const hits = Object.values(WIKIDATA).filter((e) => q.split(/ or | /).some((t) => t && e.labels.en.value.toLowerCase().includes(t)));
    return route.fulfill({ json: { query: { search: hits.map((e) => ({ title: e.id })) } } });
  }
  const entities = Object.fromEntries((p.get('ids') || '').split('|').filter((id) => WIKIDATA[id]).map((id) => [id, WIKIDATA[id]]));
  return route.fulfill({ json: { entities } });
});
await page.route('https://commons.wikimedia.org/**', (route) => route.fulfill({ contentType: 'image/png', body: BLANK_PNG }));

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
    // Bands and a block, as real spine designs have, different on each spine.
    g.fillStyle = s.band; g.fillRect(x, y + s.bands[0], w, 46); g.fillRect(x, y + s.bands[1], w, 28);
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
console.log(`     books: ${titles.join(' | ')}`);
check((await page.textContent('#count-games')) === '0', 'a photo added to Books adds only books');

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

// Find by look: the same shelf from much further away, its titles too small to read.
const far = await page.evaluate(async (jpeg) => {
  const img = new Image();
  img.src = `data:image/jpeg;base64,${jpeg}`;
  await img.decode();
  const c = Object.assign(document.createElement('canvas'), { width: 1400, height: 1000 });
  const g = c.getContext('2d');
  g.fillStyle = '#4a3220'; g.fillRect(0, 0, 1400, 1000);
  g.filter = 'blur(2.5px)';
  g.drawImage(img, 385, 275, 630, 450); // under half the size and out of focus: text seen, not readable
  return c.toDataURL('image/jpeg', 0.9).split(',')[1];
}, shelf.jpeg);
await writeFile(join(out, 'far.jpg'), Buffer.from(far, 'base64'));
await page.fill('#find-query', 'Ontogeny and phylogeny');
await page.setInputFiles('#find-input', { name: 'far.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(far, 'base64') });
await page.waitForFunction(() => {
  const v = document.querySelector('#verdict');
  return /Ontogeny/.test(v.textContent) && ['found', 'missing', 'error'].includes(v.dataset.state);
}, null, { timeout: 240000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '5b-far.png') });
const farVerdict = await page.textContent('#verdict');
console.log(`     far away: ${farVerdict}`);
if (/Found/.test(farVerdict)) {
  check(/by its look/.test(farVerdict), 'a spine too small to read is recognised by its look');
  const farRing = await page.evaluate(() => { const e = document.querySelector('.overlay ellipse.ring'); const vb = document.querySelector('.overlay').viewBox.baseVal; return e && e.cx.baseVal.value / vb.width; });
  const [fx0, fx1] = shelf.xs[1].map((x) => 0.275 + x * 0.45);
  check(farRing > fx0 && farRing < fx1, `and circled on the right spine (${farRing?.toFixed(3)} in ${fx0.toFixed(3)}–${fx1.toFixed(3)})`);
} else {
  check(await page.isVisible('.spine-hint img'), 'not recognised, it shows what the spine looks like');
}

// A photo of game boxes, added to Board games.
await page.click('#tab-catalogue');
await page.click('#seg-games');
check(/Snap your games/.test(await page.textContent('#empty')), 'the empty Board games list asks for a photo of games');
const gamesPhoto = await page.evaluate(async () => {
  const W = 1200, H = 900, c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d');
  g.fillStyle = '#5a3d24'; g.fillRect(0, 0, W, H);
  const boxes = [['WINGSPAN', '#e8f1f8', '#1b4965', '1-5 players  ages 14+'], ['KINGDOMINO', '#f3e3c3', '#7a1f1f', '2-4 players  ages 8+'], ['GLIMMERWICK HOLLOW', '#d9ecd0', '#2c5e1a', '2-4 players  30-60 min']];
  boxes.forEach(([name, bg, fg, small], i) => {
    const y = 80 + i * 260;
    g.fillStyle = bg; g.fillRect(150, y, 900, 200);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 72px sans-serif'; g.fillText(name, 600, y + 80);
    g.font = 'bold 28px sans-serif'; g.fillText(small, 600, y + 160);
  });
  return c.toDataURL('image/jpeg', 0.92).split(',')[1];
});
await writeFile(join(out, 'games.jpg'), Buffer.from(gamesPhoto, 'base64'));
await page.setInputFiles('#add-input', { name: 'games.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(gamesPhoto, 'base64') });
await page.waitForTimeout(300);
await page.waitForFunction(() => !document.querySelector('.job[data-state="waiting"], .job[data-state="reading"]'), null, { timeout: 240000 });
const gameTitles = await page.$$eval('#items .item .title', (els) => els.map((e) => e.textContent.trim()));
console.log(`     games: ${gameTitles.join(' | ')}`);
await page.screenshot({ path: join(out, '6-games.png') });
check(gameTitles.some((t) => t === 'Wingspan') && gameTitles.some((t) => t === 'Kingdomino'), 'board games are identified from the bundled list');
check(wdQueries.every((q) => !/wingspan|kingdomino/.test(q)), 'with no Wikidata search for games the list knows');
check(gameTitles.some((t) => /Glimmerwick/i.test(t)) && wdQueries.some((q) => /glimmerwick/.test(q)), 'an unknown game is searched on Wikidata, then kept to confirm');
check(!gameTitles.some((t) => /players|ages/i.test(t)), "the boxes' small print is not an item");
check((await page.textContent('#count-books')) === String(titles.length), 'a photo added to Board games adds only games');
await page.click('#items .item >> text=Wingspan');
await page.waitForSelector('#item-sheet[open]');
check(/\d–\d players/.test(await page.textContent('#item-facts')), 'a game shows its players');
check(await page.getAttribute('#item-links a', 'href') === 'https://boardgamegeek.com/boardgame/266192', 'and links straight to BoardGameGeek');
await page.click('#item-form .close');

// Barcodes: one in a photo, one through the live scanner (Chromium's fake camera).
await page.click('#seg-books');
const barcodePhoto = await page.evaluate(async (bits) => {
  const c = Object.assign(document.createElement('canvas'), { width: 900, height: 600 });
  const g = c.getContext('2d');
  g.fillStyle = '#d8c7a5'; g.fillRect(0, 0, 900, 600);
  g.fillStyle = '#fff'; g.fillRect(180, 160, 540, 280);
  g.fillStyle = '#000';
  [...bits].forEach((b, i) => { if (b === '1') g.fillRect(212 + i * 5, 190, 5, 200); });
  g.font = '24px sans-serif'; g.fillText('ISBN 978-0-441-17271-9', 300, 425);
  return c.toDataURL('image/jpeg', 0.92).split(',')[1];
}, ean13('9780441172719'));
await page.setInputFiles('#add-input', { name: 'back.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(barcodePhoto, 'base64') });
await page.waitForTimeout(300);
await page.waitForFunction(() => !document.querySelector('.job[data-state="waiting"], .job[data-state="reading"]'), null, { timeout: 240000 });
check((await page.$$eval('#items .item .title', (els) => els.map((e) => e.textContent.trim()))).includes('Dune'), "a photo of a book's barcode adds the book (by its ISBN)");

await page.click('#fab-scan');
await page.waitForSelector('#scan-sheet[open]');
await page.waitForSelector('#scan-list li', { timeout: 60000 });
await page.screenshot({ path: join(out, '7-scanner.png') });
check(/The Odyssey/.test(await page.textContent('#scan-list')), 'the live scanner reads a barcode from the camera and adds the book');
await page.click('#scan-sheet .close');
await page.waitForTimeout(400);
check(await page.evaluate(() => !document.querySelector('#scan-video').srcObject), 'closing the scanner stops the camera');
check((await page.$$eval('#items .item .title', (els) => els.map((e) => e.textContent.trim()))).includes('The Odyssey'), 'and the book is in the list');

// Export and reload persistence.
const bookCount = await page.locator('#items .item').count();
await page.click('#menu-btn');
const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-books')]);
const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
check(exported.items.some((b) => b.openLibrary === 'https://openlibrary.org/works/OL1W' && b.isbn === '9780198788607'), 'books export as JSON with Open Library links and ISBNs');
await page.reload();
await page.waitForSelector('#items .item');
check((await page.locator('#items .item').count()) === bookCount, 'the catalogue survives a reload');

check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no sideways scrolling at 390 px');
check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);

await browser.close();
server.close();
console.log(failures.length ? `\n${failures.length} failed` : `\nall passed; screenshots in ${out}`);
process.exit(failures.length ? 1 : 0);
