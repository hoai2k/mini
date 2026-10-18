import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileOrder, sortTracks, moveItem, groupAlbums, groupArtists, searchTracks, formatTime, formatTotal, hashIndex } from '../src/library.js';

const tracks = [
  { id: 'a', title: 'Zebra', artist: 'The Beatles', album: 'Abbey Road', track: 2, addedAt: 1 },
  { id: 'b', title: 'apple', artist: 'Adele', album: '25', track: 1, addedAt: 3 },
  { id: 'c', title: 'Mango', artist: 'The Beatles', album: 'Abbey Road', track: 1, addedAt: 2 },
  { id: 'd', fileName: 'loose.mp3', addedAt: 4 },
];

test('reconcileOrder drops missing ids and appends new ones oldest first', () => {
  assert.deepEqual(reconcileOrder(['x', 'b', 'b', 'a'], tracks), ['b', 'a', 'c', 'd']);
});

test('sorts', () => {
  const ids = (mode, order) => sortTracks(tracks, mode, order).map((t) => t.id);
  assert.deepEqual(ids('custom', ['d', 'c']), ['d', 'c', 'a', 'b']);
  assert.deepEqual(ids('title'), ['b', 'd', 'c', 'a']); // apple, loose.mp3, Mango, Zebra
  assert.deepEqual(ids('artist'), ['b', 'c', 'a', 'd']); // Adele, Beatles (ignoring "The"), Unknown
  assert.deepEqual(ids('added'), ['d', 'b', 'c', 'a']);
  assert.deepEqual(ids('album'), ['b', 'c', 'a', 'd']); // 25, Abbey Road 1–2, Unknown album
});

test('moveItem', () => {
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(moveItem([1, 2, 3], 1, 99), [1, 3, 2]);
});

test('albums and artists', () => {
  const albums = groupAlbums(tracks);
  assert.deepEqual(albums.map((a) => a.name), ['25', 'Abbey Road', 'Unknown album']);
  assert.deepEqual(albums[1].tracks.map((t) => t.id), ['c', 'a']);
  const artists = groupArtists(tracks);
  assert.deepEqual(artists.map((a) => a.name), ['Adele', 'The Beatles', 'Unknown artist']);
  assert.deepEqual(artists[1].tracks.map((t) => t.id), ['c', 'a']);
});

test('search matches every word across fields, ignoring accents and case', () => {
  const list = [...tracks, { id: 'e', title: 'Café del Mar', artist: 'Énergie' }];
  assert.deepEqual(searchTracks(list, 'beatles mango').map((t) => t.id), ['c']);
  assert.deepEqual(searchTracks(list, 'CAFE energie').map((t) => t.id), ['e']);
  assert.equal(searchTracks(list, '  ').length, list.length);
});

test('formatting', () => {
  assert.equal(formatTime(187.9), '3:07');
  assert.equal(formatTime(3723), '1:02:03');
  assert.equal(formatTime(NaN), '–:––');
  assert.equal(formatTotal(2520), '42 min');
  assert.equal(formatTotal(3900), '1 hr 5 min');
  assert.equal(hashIndex('Abbey Road', 8), hashIndex('Abbey Road', 8));
  assert.ok(hashIndex('x', 8) < 8);
});
