import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAIN, emptyBook, normalizeBook, backgrounds, cycle, shownBackground, placeOnSpread, pagePoint, moveSticker, drawOrder } from '../src/stickerbook.js';
import { bookLayout } from '../src/reward.js';

const IDS = ['coot', 'cupadee', 'shuttercluck', 'gullfinch'];

test('sticker book: the pictures are the plain page, then each passed bird in order', () => {
  const list = backgrounds(IDS, (i) => i === 0 || i === 2);
  assert.deepEqual(list, [PLAIN, 'coot', 'shuttercluck']);
  assert.deepEqual(backgrounds(IDS, () => false), [PLAIN]);
  assert.equal(cycle(list, PLAIN, 1), 'coot');
  assert.equal(cycle(list, 'shuttercluck', 1), PLAIN, 'round again');
  assert.equal(cycle(list, PLAIN, -1), 'shuttercluck', 'and backwards');
  assert.equal(cycle(list, 'gullfinch', 1), 'coot', 'one no longer unlocked counts as the plain page');
  assert.equal(cycle([PLAIN], PLAIN, 1), PLAIN);
  assert.equal(shownBackground(list, 'gullfinch'), PLAIN);
  assert.equal(shownBackground(list, 'coot'), 'coot');
});

test('sticker book: a dropped sticker stays on the page it is over, inside its edges', () => {
  const pages = [{ x: 0, y: 0, w: 500, h: 400 }, { x: 520, y: 0, w: 500, h: 400 }];
  const a = placeOnSpread(pages, 100, 100, 100);
  assert.deepEqual(a, { page: 0, u: 0.2, v: 0.25 });
  // off the top-left corner: pulled back in by 0.4 of its size
  const b = placeOnSpread(pages, -300, -300, 100);
  assert.deepEqual(b, { page: 0, u: 40 / 500, v: 40 / 400 });
  // past the right edge of the second page
  const c = placeOnSpread(pages, 5000, 200, 100);
  assert.equal(c.page, 1);
  assert.equal(c.u, 1 - 40 / 500);
  // over the spine: the nearer page
  assert.equal(placeOnSpread(pages, 515, 200, 100).page, 1);
  assert.equal(placeOnSpread(pages, 505, 200, 100).page, 0);
  // and back to stage units
  assert.deepEqual(pagePoint(pages, a), { x: 100, y: 100 });
});

test('sticker book: a place on the page survives turning a wide book upright', () => {
  const wide = bookLayout(28, { x: 120, y: 150, w: 1360, h: 640 }, true, 0);
  const tall = bookLayout(28, { x: 60, y: 250, w: 780, h: 1150 }, false, 0);
  const at = placeOnSpread(wide.pages, 1100, 500, wide.slots[0].s);
  assert.equal(at.page, 1);
  const p = pagePoint(tall.pages, at);
  const q = tall.pages[1];
  assert.ok(p.x > q.x && p.x < q.x + q.w && p.y > q.y && p.y < q.y + q.h, 'on the same page');
});

test('sticker book: the one put down goes on top of the pile', () => {
  const book = emptyBook();
  moveSticker(book, 'coot', { page: 0, u: 0.5, v: 0.5 });
  moveSticker(book, 'cupadee', { page: 0, u: 0.5, v: 0.5 });
  moveSticker(book, 'coot', { page: 1, u: 0.2, v: 0.3 });
  assert.deepEqual(drawOrder(IDS, book.pos), ['shuttercluck', 'gullfinch', 'cupadee', 'coot']);
  assert.equal(book.pos.coot.page, 1);
});

test('sticker book: what is saved comes back, and anything malformed is dropped', () => {
  const book = emptyBook();
  moveSticker(book, 'coot', { page: 1, u: 0.3, v: 0.6 });
  book.bg = 'cupadee';
  book.spread = 1;
  const back = normalizeBook(JSON.parse(JSON.stringify(book)), IDS, 2);
  assert.deepEqual(back, book);
  assert.deepEqual(normalizeBook(null, IDS, 2), emptyBook());
  assert.deepEqual(normalizeBook('nonsense', IDS, 2), emptyBook());
  const bad = normalizeBook({ pos: { coot: { page: 3, u: 0.1, v: 0.1 }, dodo: { page: 0, u: 0.1, v: 0.1 }, cupadee: { page: 0, u: 2, v: -1 } }, bg: 'nobody', spread: 7 }, IDS, 2);
  assert.deepEqual(bad, { pos: { cupadee: { page: 0, u: 1, v: 0, z: 0 } }, bg: PLAIN, spread: 0 });
});
