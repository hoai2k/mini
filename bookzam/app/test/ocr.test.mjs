// The on-device reader's pure parts: box geometry, decoding, spine grouping,
// matching and identification (Open Library mocked). The models themselves
// are exercised by tools/browser-check.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minAreaRect, boxesFromMap, readingDirections, recInput, ctcDecode, detInput, isVertical } from '../src/ocr/core.js';
import { parseDict } from '../src/ocr/engine.js';
import { groupLines, sameSpine, wordMatches, matchScore, words, strongWords } from '../src/ocr/spines.js';
import { pickMatch, identify, queryWords, clearSearches } from '../src/ocr/identify.js';
import { scanLines, findInLines, describeWhere } from '../src/reader.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('the smallest rectangle around points, long side first', () => {
  const r = minAreaRect([[0, 0], [10, 0], [10, 4], [0, 4], [5, 2]]);
  assert.ok(near(r.cx, 5) && near(r.cy, 2));
  assert.ok(near(r.w, 11) && near(r.h, 5));
  assert.ok(near(Math.abs(Math.sin(r.angle)), 0));
  const tall = minAreaRect([[0, 0], [3, 0], [3, 20], [0, 20]]);
  assert.ok(tall.w > tall.h && isVertical(tall), 'a spine-shaped region is vertical');
});

test('the detector map becomes boxes in photo pixels', () => {
  const w = 64, h = 32, map = new Float32Array(w * h);
  for (let y = 10; y < 16; y++) for (let x = 8; x < 40; x++) map[y * w + x] = 0.9;
  const boxes = boxesFromMap(map, w, h, 2, 2);
  assert.equal(boxes.length, 1);
  const b = boxes[0];
  assert.ok(near(b.cx, 48, 1.5) && near(b.cy, 26, 1.5), `centre ${b.cx},${b.cy}`);
  assert.ok(b.w > 64 && b.h > b.th && b.th >= 11, 'grown by the margin, letters height kept');
  map.fill(0.2);
  assert.equal(boxesFromMap(map, w, h, 1, 1).length, 0, 'nothing above the threshold, nothing found');
});

test('spines are read both ways up, flat text left to right', () => {
  assert.equal(readingDirections({ angle: 0 }).length, 1);
  assert.ok(readingDirections({ angle: Math.PI }).every((d) => d.ax > 0));
  const spine = readingDirections({ angle: Math.PI / 2 });
  assert.equal(spine.length, 2);
  assert.ok(near(spine[0].ay, 1) && near(spine[1].ay, -1));
});

test('a text line is cut out upright', () => {
  // A 40 x 10 image: left half black, right half white.
  const width = 40, height = 10, data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.fill(x < 20 ? 0 : 255, (y * width + x) * 4, (y * width + x) * 4 + 4);
  const img = { data, width, height };
  const box = { cx: 20, cy: 5, w: 40, h: 10, angle: 0 };
  const { tensor, width: w } = recInput(img, box, { ax: 1, ay: 0 });
  assert.equal(w, 192);
  assert.ok(tensor[5 * w + 10] < -0.9 && tensor[5 * w + w - 10] > 0.9, 'dark on the left, light on the right');
  const flipped = recInput(img, box, { ax: -1, ay: 0 }).tensor;
  assert.ok(flipped[5 * w + 10] > 0.9, 'read the other way, the light end comes first');
  const det = detInput(img, 64);
  assert.equal(det.width % 32, 0);
  assert.equal(det.height % 32, 0);
});

test('CTC decoding drops blanks and repeats', () => {
  const dict = parseDict('a\nb\nc\n');
  assert.deepEqual(dict, ['a', 'b', 'c']);
  const classes = 5; // blank, a, b, c, space
  const steps = [1, 1, 0, 2, 4, 3, 3];
  const probs = new Float32Array(steps.length * classes);
  steps.forEach((k, t) => { probs[t * classes + k] = 0.9; });
  const out = ctcDecode(probs, steps.length, classes, dict);
  assert.equal(out.text, 'ab c');
  assert.ok(near(out.score, 0.9));
});

const line = (text, cx, cy, w, th, angle = Math.PI / 2, score = 0.95) => {
  const box = { cx, cy, w, h: th * 2.5, th, angle };
  return { text, score, box, dir: readingDirections(box)[0] };
};

test('lines on one spine group; neighbouring spines stay apart', () => {
  const lines = [
    line('THE SELFISH', 100, 200, 150, 12),
    line('GENE', 100, 330, 50, 12), // further down the same spine
    line('Richard Dawkins', 118, 250, 120, 9), // second line on the same spine
    line('ONTOGENY AND', 140, 200, 150, 12), // the next spine along
    line('Sven Hedin,', 300, 500, 80, 10, 0), // horizontal labels on neighbouring spines
    line('Sven Hedin,', 400, 500, 80, 10, 0),
  ];
  assert.ok(sameSpine(lines[0], lines[1]));
  assert.ok(!sameSpine(lines[0], lines[3]), 'next spine');
  assert.ok(!sameSpine(lines[4], lines[5]), 'labels on neighbouring spines');
  const groups = groupLines(lines);
  assert.equal(groups.length, 4);
  const selfish = groups.find((g) => g.text.includes('SELFISH'));
  assert.equal(selfish.lines.length, 3);
  assert.ok(selfish.bounds.x0 < 100 && selfish.bounds.x1 > 118);
});

test('OCR words match loosely, short ones exactly', () => {
  assert.ok(wordMatches('metamorphoes', 'metamorphoses'));
  assert.ok(wordMatches('seve', 'seven'), 'a letter lost at the spine edge');
  assert.ok(!wordMatches('fire', 'five'), 'four-letter words must match exactly');
  assert.ok(wordMatches('secre', 'secret'));
  assert.ok(wordMatches('bogees', 'borges', true), 'surnames get two slips');
  assert.ok(!wordMatches('bogees', 'borges'));
  assert.ok(!wordMatches('cat', 'cap'));
  assert.deepEqual(words('Erzählungen1 Jorge'), ['erzahlungen', 'jorge']);
  assert.deepEqual(strongWords('THE SECRET of 1984 rrgs'), ['secret']);
});

test('a match needs most of the title, in order, explaining the text', () => {
  const m = matchScore('OVID METAMORPHOES HUMPHRIES', 'Metamorphoses', 'Ovid');
  assert.equal(m.score, 1);
  assert.ok(m.author && m.inOrder);
  assert.equal(matchScore('Five fall', 'The Fall of Five').inOrder, false);
  const docs = [
    { title: 'The Fall of Five', author_name: ['Pittacus Lore'], edition_count: 20 },
    { title: 'The Cousins', author_name: ['Karen M. McManus'], edition_count: 30 },
    { title: 'Androids', author_name: ['Chet Haase'], edition_count: 2 },
  ];
  assert.equal(pickMatch('Five fall', docs), null, 'words out of order');
  assert.equal(pickMatch('ADVENTURES OF THE SIX COUSINS', docs), null, 'explains too little of the text');
  assert.equal(pickMatch('Android', docs), null, 'one-word titles need their author');
  const borges = [
    { title: 'Obras completas', author_name: ['Miguel de Cervantes Saavedra'], edition_count: 40 },
    { title: 'Obras completas', author_name: ['Jorge Luis Borges'], edition_count: 30 },
  ];
  assert.equal(pickMatch('BOGEES OBRAS COMPLETAS', borges).doc.author_name[0], 'Jorge Luis Borges', 'the author decides');
  assert.ok(pickMatch('OBRAS COMPLETAS', borges).ambiguous, 'nothing says whose');
  assert.equal(pickMatch('Erzahlungen Jorge Luis Borges', [{ title: 'Jorge Luis Borges', author_name: ['Jorge Luis Borges'] }]), null, 'a title that is only the author');
});

function fakeOpenLibrary(byQuery) {
  const calls = [];
  const fetch = async (url) => {
    const q = new URL(url).searchParams.get('q');
    calls.push(q);
    const docs = byQuery(q) || [];
    return { ok: true, json: async () => ({ docs }) };
  };
  return { fetch, calls };
}

test('identify searches every word, then any word', async () => {
  clearSearches();
  const group = groupLines([line('ONTOGENY AND PHYLOGENY', 100, 200, 300, 12), line('GOULD', 100, 420, 60, 12)])[0];
  assert.deepEqual(queryWords(group), ['ontogeny', 'phylogeny', 'gould']);
  const ol = fakeOpenLibrary((q) => (q.includes(' OR ') ? [{ key: '/works/OL1W', title: 'Ontogeny and phylogeny', author_name: ['Stephen Jay Gould'], first_publish_year: 1977, cover_i: 7 }] : []));
  const item = await identify(group, { fetch: ol.fetch });
  assert.deepEqual(ol.calls, ['ontogeny phylogeny gould', 'ontogeny OR phylogeny OR gould']);
  assert.equal(item.title, 'Ontogeny and phylogeny');
  assert.equal(item.author, 'Stephen Jay Gould');
  assert.equal(item.lookup.year, 1977);
  assert.equal(item.read, 'ONTOGENY AND PHYLOGENY GOULD');

  const unknown = groupLines([line('THE THREE STRANGE TRAUELLERS', 100, 200, 300, 12)])[0];
  const kept = await identify(unknown, { fetch: fakeOpenLibrary(() => []).fetch });
  assert.equal(kept.title, 'The Three Strange Trauellers', 'a clean reading is kept to fix by hand');
  assert.equal(kept.lookup, null);
  const noise = groupLines([line('rr TTT', 100, 200, 60, 12, Math.PI / 2, 0.6)])[0];
  assert.equal(await identify(noise, { fetch: fakeOpenLibrary(() => []).fetch }), null);
});

test('a read photo becomes catalogue entries, and Find circles the right spine', async () => {
  clearSearches();
  const lines = [
    line('The Selfish Gene', 100, 300, 300, 12),
    line('DAWKINS', 100, 520, 90, 12),
    line('ONTOGENY AND PHYLOGENY', 160, 300, 300, 12),
    line('xq', 400, 300, 20, 12, Math.PI / 2, 0.55),
  ];
  const ol = fakeOpenLibrary((q) => (/selfish/.test(q) ? [{ key: '/works/OL2W', title: 'The Selfish Gene', author_name: ['Richard Dawkins'] }] : []));
  const scan = await scanLines(lines, { fetch: ol.fetch });
  assert.deepEqual(scan.books.map((b) => b.title), ['The Selfish Gene', 'Ontogeny And Phylogeny']);
  assert.equal(scan.books[0].lookup.key, '/works/OL2W');

  const found = findInLines(lines, 1000, 800, 'selfish gene');
  assert.ok(found.found);
  assert.ok(found.box.x0 < 0.1 && found.box.x1 > 0.1 && found.box.y1 > 0.6, 'the box covers the title and the author');
  assert.equal(found.where, describeWhere(found.box));
  const byCatalogue = findInLines(lines, 1000, 800, 'The Selfish Gene', { title: 'The Selfish Gene', author: 'Richard Dawkins', read: 'The Selfish Gene DAWKINS' });
  assert.ok(byCatalogue.found);
  const missing = findInLines(lines, 1000, 800, 'Cryptonomicon');
  assert.equal(missing.found, false);
  assert.ok(missing.similar.length > 0, 'offers what it could read');
  assert.equal(describeWhere({ x0: 0, y0: 0, x1: 0.1, y1: 0.1 }), 'Near the top, on the left.');
});
