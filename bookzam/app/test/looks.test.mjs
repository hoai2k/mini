// Spine looks (looks.js) and barcodes (barcodes.js): the parts that need no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planes, describe, spineRect, lookOf, pack, unpack, similarity, flip, prepare, bestMatch, isSure, recognise, detail } from '../src/looks.js';
import { readingDirections } from '../src/ocr/core.js';
import { groupLines } from '../src/ocr/spines.js';
import { isbnOf, validCheckDigit, codeForms, bookByIsbn } from '../src/barcodes.js';
import { gameByBarcode, setLocalGames } from '../src/games.js';
import { emptyCatalogue, mergeScan, addLook, removePhoto } from '../src/catalogue.js';
import { readFileSync } from 'node:fs';

// A shelf drawn in memory: spines of different colours with "lettering" stripes.
function shelf(width, height, spines, light = 1) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = 90 * light; data[i + 1] = 60 * light; data[i + 2] = 40 * light; data[i + 3] = 255; }
  for (const s of spines) {
    for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
      const band = s.bands.some(([a, b]) => y >= s.y + a && y < s.y + b) && x > s.x + s.w * 0.3 && x < s.x + s.w * 0.7;
      const c = band ? s.ink : s.colour, p = (y * width + x) * 4;
      data[p] = c[0] * light; data[p + 1] = c[1] * light; data[p + 2] = c[2] * light;
    }
  }
  return { data, width, height };
}
const SPINES = [
  { x: 20, y: 20, w: 30, h: 200, colour: [40, 60, 160], ink: [240, 230, 200], bands: [[20, 60], [80, 90], [150, 180]] },
  { x: 60, y: 20, w: 30, h: 200, colour: [170, 40, 40], ink: [250, 250, 250], bands: [[30, 40], [50, 120]] },
  { x: 100, y: 20, w: 30, h: 200, colour: [40, 140, 70], ink: [20, 20, 20], bands: [[10, 30], [100, 110], [130, 190]] },
];
const lineFor = (s) => {
  const box = { cx: s.x + s.w / 2, cy: s.y + s.h / 2, w: s.h * 0.9, h: s.w * 0.75, th: s.w * 0.3, angle: Math.PI / 2 };
  return { text: 'x', score: 0.9, box, dir: readingDirections(box)[0] };
};

test('a look survives packing, and matches its own spine, not the others', () => {
  const pl = planes(shelf(160, 240, SPINES));
  const groups = SPINES.map((s) => groupLines([lineFor(s)])[0]);
  const raws = groups.map((g) => describe(pl, spineRect(g)));
  const look = lookOf(pl, spineRect(groups[0]));
  assert.equal(look.vertical, true);
  const back = unpack(pack(raws[0]));
  assert.ok(raws[0].every((v, k) => Math.abs(v - back[k]) <= 1.5), 'packing loses at most a step');
  assert.ok(similarity(raws[0], raws[0]) > 0.99);
  assert.ok(similarity(raws[0], flip(raws[0])) > 0.99, 'upside down is the same spine');
  assert.ok(similarity(raws[0], raws[1]) < 0.6 && similarity(raws[0], raws[2]) < 0.6);
  assert.ok(detail(raws[0]) > 14);
});

test('a known spine is found in a darker photo, and only a sure match counts', () => {
  const first = planes(shelf(160, 240, SPINES));
  const look = lookOf(first, spineRect(groupLines([lineFor(SPINES[2])])[0]));
  // The same shelf, darker and in a different order.
  const moved = SPINES.map((s, i) => ({ ...s, x: [100, 20, 60][i] }));
  const second = planes(shelf(160, 240, moved, 0.7));
  const candidates = moved.map((s) => prepare(describe(second, spineRect(groupLines([lineFor(s)])[0]))));
  const m = bestMatch(look, candidates);
  assert.equal(m.index, 2, 'the green spine, wherever it is now');
  assert.ok(isSure(m), `sure (${m.score} vs ${m.runnerUp})`);
  const elsewhere = planes(shelf(160, 240, [SPINES[0], SPINES[1]]));
  const others = SPINES.slice(0, 2).map((s) => prepare(describe(elsewhere, spineRect(groupLines([lineFor(s)])[0]))));
  assert.ok(!isSure(bestMatch(look, others)), 'not on this shelf, so no match');
  const plain = { v: pack(new Float32Array(768).fill(120)), aspect: 6, vertical: true };
  assert.equal(bestMatch(plain, candidates), null, 'a plain spine is too plain to look for');
  const item = { title: 'Green', looks: [look] };
  assert.equal(recognise(candidates[2], [item, { title: 'Other', looks: [lookOf(first, spineRect(groupLines([lineFor(SPINES[0])])[0]))] }])?.item, item);
});

test('barcodes: ISBNs, check digits and code forms', () => {
  assert.equal(isbnOf('9780441172719'), '9780441172719');
  assert.equal(isbnOf('9780441172718'), null, 'bad check digit');
  assert.equal(isbnOf('0824968717813'), null, 'a game, not a book');
  assert.ok(validCheckDigit('0824968717813'));
  assert.ok(validCheckDigit('96385074'), 'EAN-8');
  assert.deepEqual(codeForms('824968717813').sort(), ['0824968717813', '824968717813'], 'UPC-A is EAN-13 with a leading 0');
});

test('a game is found by the barcode on its box, from the bundled list', async () => {
  setLocalGames(JSON.parse(readFileSync(new URL('../data/games.json', import.meta.url), 'utf8')));
  const offline = async () => { throw new Error('no network'); };
  assert.equal((await gameByBarcode('824968717813', { fetch: offline })).title, 'Ticket to Ride', 'read as UPC-A');
  assert.equal((await gameByBarcode('0824968717813', { fetch: offline })).title, 'Ticket to Ride', 'read as EAN-13');
});

test('the catalogue keeps a few looks per item, and barcode items outlive photos', () => {
  const cat = emptyCatalogue();
  const { pairs } = mergeScan(cat, { books: [{ title: 'Dune', author: 'Frank Herbert' }, { title: 'Dune', author: 'Herbert' }] }, 'p1');
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].item, pairs[1].item, 'both readings are the one item');
  const item = pairs[0].item;
  for (let i = 0; i < 4; i++) addLook(item, { look: { v: String(i), aspect: 5, vertical: true }, thumb: `t${i}` });
  assert.deepEqual(item.looks.map((l) => l.v), ['1', '2', '3'], 'the three newest');
  assert.equal(item.thumb, 't0', 'the first picture stays');
  const { added } = mergeScan(cat, { books: [{ title: 'Emma', author: 'Jane Austen' }] }, 'barcode');
  added[0].manual = true;
  cat.photos = [{ id: 'p1' }];
  removePhoto(cat, 'p1');
  assert.deepEqual(cat.books.map((b) => b.title), ['Emma']);
});

test("a barcode's book takes that edition's title", async () => {
  const fetch = async (url) => {
    assert.equal(new URL(url).searchParams.get('isbn'), '9780140449136');
    return { ok: true, json: async () => ({ docs: [{ key: '/works/OL166894W', title: 'Преступление и наказание', author_name: ['Fyodor Dostoevsky'], editions: { docs: [{ key: '/books/OL7355481M', title: 'Crime and Punishment (Penguin Classics)' }] } }] }) };
  };
  const book = await bookByIsbn('9780140449136', { fetch });
  assert.equal(book.title, 'Crime and Punishment');
  assert.equal(book.author, 'Fyodor Dostoevsky');
  assert.equal(book.lookup.isbn, '9780140449136');
  assert.equal(book.lookup.edition, '/books/OL7355481M');
  const noEdition = await bookByIsbn('9780140449136', { fetch: async () => ({ ok: true, json: async () => ({ docs: [{ key: '/works/OL1W', title: 'Dune', author_name: ['Frank Herbert'] }] }) }) });
  assert.equal(noEdition.title, 'Dune');
});
