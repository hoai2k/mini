// Bookzam's pure logic: title matching, merging scans, exports, and the Find
// Book geometry. Run: node --test bookzam/app/test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, sameItem, emptyCatalogue, mergeScan, removePhoto, moveItem, filterItems, sortItems, exportData } from '../src/catalogue.js';
import { fitSize, ringFor } from '../src/geometry.js';
import { pickDoc, toLookup } from '../src/lookup.js';

test('titles are matched loosely but not too loosely', () => {
  assert.equal(normalize('The Hobbit, or There & Back Again'), 'hobbit or there and back again');
  assert.equal(normalize('Les Misérables'), 'miserables');
  assert.ok(sameItem({ title: 'The Hobbit', author: 'J.R.R. Tolkien' }, { title: 'Hobbit', author: 'J. R. R. Tolkien' }));
  assert.ok(sameItem({ title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari' }, { title: 'Sapiens', author: 'Harari' }));
  assert.ok(sameItem({ title: 'Emma', author: null }, { title: 'Emma', author: 'Jane Austen' }), 'a missing author does not block a match');
  assert.ok(!sameItem({ title: 'Emma', author: 'Jane Austen' }, { title: 'Emma', author: 'Some Other Writer' }));
  assert.ok(!sameItem({ title: 'Dune', author: 'Frank Herbert' }, { title: 'Dune Messiah', author: 'Frank Herbert' }));
  assert.ok(!sameItem({ title: '', author: 'X' }, { title: '', author: 'X' }));
});

test('a scan merges into the catalogue without duplicates', () => {
  const cat = emptyCatalogue();
  const first = mergeScan(cat, { books: [{ title: 'Dune', author: 'Frank Herbert', confidence: 0.9 }, { title: 'Emma', author: null }], games: [{ title: 'Catan', publisher: 'Kosmos' }] }, 'p1', '2026-10-01T00:00:00Z');
  assert.equal(first.added.length, 3);
  assert.equal(cat.books.length, 2);
  assert.equal(cat.games[0].lookupStatus, 'pending', 'games typed in are looked up on Wikidata');
  assert.equal(cat.books[0].lookupStatus, 'pending');
  const second = mergeScan(cat, { books: [{ title: 'dune', author: 'Herbert' }, { title: 'Emma', author: 'Jane Austen' }, { title: 'Persuasion', author: 'Jane Austen' }], games: [] }, 'p2', '2026-10-02T00:00:00Z');
  assert.equal(second.added.length, 1);
  assert.equal(second.existing.length, 2);
  assert.equal(cat.books.length, 3);
  const emma = cat.books.find((b) => b.title === 'Emma');
  assert.equal(emma.author, 'Jane Austen', 'a later photo fills in a missing author');
  assert.deepEqual(emma.photos, ['p1', 'p2']);
  cat.photos = [{ id: 'p1' }, { id: 'p2' }];
  removePhoto(cat, 'p2');
  assert.deepEqual(cat.books.map((b) => b.title).sort(), ['Dune', 'Emma'], 'Persuasion only came from p2');
  assert.deepEqual(emma.photos, ['p1']);
});

test('items move between lists, filter and sort', () => {
  const cat = emptyCatalogue();
  mergeScan(cat, { books: [{ title: 'Ticket to Ride', author: null }, { title: 'The Road', author: 'Cormac McCarthy' }, { title: 'Atonement', author: 'Ian McEwan' }] }, 'p1', '2026-10-01T00:00:00Z');
  const moved = moveItem(cat, cat.books.find((b) => b.title === 'Ticket to Ride').id);
  assert.equal(moved.kind, 'game');
  assert.equal(cat.games.length, 1);
  assert.equal(cat.books.length, 2);
  assert.deepEqual(filterItems(cat.books, 'mccarthy').map((b) => b.title), ['The Road']);
  assert.deepEqual(sortItems(cat.books, 'title').map((b) => b.title), ['Atonement', 'The Road']);
  assert.deepEqual(sortItems(cat.books, 'author').map((b) => b.title), ['The Road', 'Atonement'], 'McCarthy before McEwan');
});

test('exports are plain JSON with links', () => {
  const cat = emptyCatalogue();
  mergeScan(cat, { books: [{ title: 'Dune', author: 'Frank Herbert', confidence: 0.9 }], games: [{ title: 'Catan', publisher: 'Kosmos', year: 1995 }] }, 'p1', '2026-10-01T00:00:00Z');
  cat.books[0].lookup = { key: '/works/OL893415W', title: 'Dune', authors: ['Frank Herbert'], year: 1965, isbn: '9780441172719', subjects: ['Science fiction'], cover: 'https://covers.openlibrary.org/b/id/1-M.jpg' };
  const books = exportData(cat, 'books', '2026-10-17T00:00:00Z');
  assert.equal(books.app, 'Bookzam');
  assert.equal(books.count, 1);
  assert.equal(books.items[0].openLibrary, 'https://openlibrary.org/works/OL893415W');
  assert.equal(books.items[0].year, 1965);
  assert.equal(books.items[0].isbn, '9780441172719');
  const games = exportData(cat, 'games');
  assert.equal(games.items[0].year, 1995);
  assert.match(games.items[0].boardGameGeek, /q=Catan$/);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(books)));
});

test('Open Library results are matched to the book', () => {
  const docs = [
    { key: '/works/1', title: 'Dune Messiah', author_name: ['Frank Herbert'] },
    { key: '/works/2', title: 'Dune', author_name: ['Frank Herbert'], isbn: ['0441172717', '9780441172719'], cover_i: 42 },
  ];
  assert.equal(pickDoc(docs, { title: 'Dune', author: 'Frank Herbert' }).key, '/works/2');
  assert.equal(pickDoc(docs, { title: 'Dune', author: 'Someone Else' }), null);
  assert.equal(pickDoc([{ key: '/works/3', title: 'The' }], { title: 'Thereabouts', author: null }), null);
  const l = toLookup(docs[1]);
  assert.equal(l.isbn, '9780441172719');
  assert.equal(l.cover, 'https://covers.openlibrary.org/b/id/42-M.jpg');
});

test('Find Book geometry', () => {
  assert.deepEqual(fitSize(4032, 3024, 1568), { width: 1568, height: 1176 });
  assert.deepEqual(fitSize(800, 600, 1568), { width: 800, height: 600 });
  const ring = ringFor({ x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 }, 1000, 800, 0);
  assert.equal(ring.cx, 500);
  assert.equal(ring.cy, 400);
  assert.ok(ring.rx > 250 * Math.SQRT2 && ring.ry > 200 * Math.SQRT2, 'the ring goes round the corners');
});
