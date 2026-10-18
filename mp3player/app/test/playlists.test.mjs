import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_RULES, matchesRule, uniqueName, syncAuto, removeFromAll, restoreToAll, mosaicKeys } from '../src/playlists.js';

let n = 0;
const makeId = () => `p${++n}`;
const T = (id, title, extra = {}) => ({ id, title, ...extra });
const lib = [T('a', 'Yellow (No Bass)'), T('b', 'Clocks'), T('c', 'Fix You (no piano)'), T('d', 'Sparks (NO BASS)'), T('e', 'Trouble (no-piano)')];

test('the labels match whatever the case or spacing', () => {
  const [bass, piano] = AUTO_RULES;
  assert.ok(matchesRule(T('x', 'Song ( no bass )'), bass));
  assert.ok(matchesRule(T('x', 'Song (No-Bass)'), bass));
  assert.ok(!matchesRule(T('x', 'No Bass Song'), bass)); // only the bracketed label
  assert.ok(!matchesRule(T('x', 'Song (no bassoon)'), bass));
  assert.ok(matchesRule({ id: 'x', fileName: 'Song (no piano).mp3' }, piano));
});

test('collections appear only when songs match, in library order', () => {
  n = 0;
  const empty = syncAuto([], [T('b', 'Clocks')], {}, true, { makeId });
  assert.deepEqual(empty.playlists, []);
  assert.equal(empty.changed, false);
  const r = syncAuto([], lib, {}, true, { makeId });
  assert.deepEqual(r.playlists.map((p) => [p.name, p.auto, p.ids]), [['No Bass', 'no-bass', ['a', 'd']], ['No Piano', 'no-piano', ['c', 'e']]]);
  assert.deepEqual(r.added, { 'no-bass': 2, 'no-piano': 2 });
  // run again: nothing to do
  assert.equal(syncAuto(r.playlists, lib, {}, true, { makeId }).changed, false);
});

test('new songs join at the end; ones the listener took out stay out', () => {
  n = 0;
  let { playlists } = syncAuto([], lib, {}, true, { makeId });
  const bass = playlists.find((p) => p.auto === 'no-bass');
  playlists = playlists.map((p) => (p === bass ? { ...p, ids: ['d', 'a'] } : p)); // reordered by hand
  const more = [...lib, T('f', 'Viva (No Bass)')];
  const r = syncAuto(playlists, more, { excluded: { 'no-bass': ['a'] } }, true, { makeId });
  assert.deepEqual(r.playlists.find((p) => p.auto === 'no-bass').ids, ['d', 'a', 'f']); // a stays where the listener left it
  const r2 = syncAuto([{ ...bass, ids: ['d'] }], more, { excluded: { 'no-bass': ['a'] } }, true, { makeId });
  assert.deepEqual(r2.playlists.find((p) => p.auto === 'no-bass').ids, ['d', 'f']);
});

test('a deleted collection is not made again; the switch off adds nothing', () => {
  n = 0;
  const r = syncAuto([], lib, { dismissed: { 'no-bass': true } }, true, { makeId });
  assert.deepEqual(r.playlists.map((p) => p.name), ['No Piano']);
  assert.deepEqual(syncAuto([], lib, {}, false, { makeId }).playlists, []);
});

test('a name the listener already uses gets a number', () => {
  n = 0;
  const mine = [{ id: 'm', name: 'No Bass', ids: ['b'] }];
  const r = syncAuto(mine, lib, {}, true, { makeId });
  assert.deepEqual(r.playlists.map((p) => p.name), ['No Bass', 'No Bass 2', 'No Piano']);
  assert.deepEqual(r.playlists[0].ids, ['b']); // the listener's own playlist is untouched
  assert.equal(uniqueName('  ', []), 'New playlist');
  assert.equal(uniqueName('mix', [{ id: '1', name: 'Mix' }, { id: '2', name: 'Mix 2' }]), 'mix 3');
  assert.equal(uniqueName('Mix', [{ id: '1', name: 'Mix' }], '1'), 'Mix'); // renaming to its own name
});

test('songs leaving the library leave playlists; an emptied collection goes', () => {
  n = 0;
  const { playlists } = syncAuto([{ id: 'm', name: 'Mine', ids: ['a', 'b'] }], lib, {}, true, { makeId });
  const left = lib.filter((t) => t.id !== 'a' && t.id !== 'd');
  const r = syncAuto(playlists, left, {}, true, { makeId });
  assert.deepEqual(r.playlists.map((p) => [p.name, p.ids]), [['Mine', ['b']], ['No Piano', ['c', 'e']]]);
  // with the switch off they are ordinary playlists: an empty one stays
  const off = syncAuto(playlists, left, {}, false, { makeId });
  assert.deepEqual(off.playlists.map((p) => [p.name, p.ids]), [['Mine', ['b']], ['No Bass', []], ['No Piano', ['c', 'e']]]);
  // emptied by hand while its songs are still in the library: it stays (empty)
  const byHand = playlists.map((p) => (p.auto === 'no-bass' ? { ...p, ids: [] } : p));
  const kept = syncAuto(byHand, lib, { excluded: { 'no-bass': ['a', 'd'] } }, true, { makeId });
  assert.deepEqual(kept.playlists.find((p) => p.auto === 'no-bass').ids, []);
});

test('remove and undo put songs back where they were', () => {
  const pls = [{ id: 'x', name: 'X', ids: ['a', 'b', 'c', 'd'] }, { id: 'y', name: 'Y', ids: ['c'] }];
  const { playlists, removed } = removeFromAll(pls, ['b', 'c']);
  assert.deepEqual(playlists.map((p) => p.ids), [['a', 'd'], []]);
  assert.deepEqual(restoreToAll(playlists, removed).map((p) => p.ids), [['a', 'b', 'c', 'd'], ['c']]);
});

test('mosaic: up to four different covers', () => {
  const m = new Map([['a', { artKey: 'k1' }], ['b', { artKey: 'k1' }], ['c', {}], ['d', { artKey: 'k2' }]]);
  assert.deepEqual(mosaicKeys({ ids: ['a', 'b', 'c', 'd'] }, m), ['k1', 'k2']);
});
