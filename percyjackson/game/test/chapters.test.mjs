// Chapter data checks: every chapter can be started from camp and played
// as a mission, has its story, and the book's prophecy is fulfilled.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS, CHAPTERS } from '../js/story/chapters.js';

const JS = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'js');
const read = (p) => readFileSync(join(JS, p), 'utf8');
const SUPPORTED = new Set(['exorcise', 'rescue', 'seal', 'flag', 'escape', 'boss', 'museum']);

test('the supported objectives are the ones the mission runtime knows', () => {
  const types = read('story/missionDef.js').match(/OBJECTIVE_TYPES = \[([^\]]*)\]/)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(new Set(types), SUPPORTED);
  const index = read('objectives/index.js');
  for (const t of ['flag', 'escape', 'boss', 'museum']) assert.match(index, new RegExp(`\\b${t}: \\w+Objective`), `objective ${t} is registered`);
});

test('every chapter of book 1 has a start, story and a supported objective', () => {
  const book1 = CHAPTERS.filter((c) => c.book === 'book1');
  assert.equal(book1.length, 12);
  const anchors = new Set();
  for (const ch of book1) {
    const at = `${ch.id} (${ch.title})`;
    assert.ok(SUPPORTED.has(ch.objective), `${at}: objective ${ch.objective} is supported`);
    assert.ok(ch.start && typeof ch.start.at === 'string' && ch.start.place, `${at}: has a start place in camp`);
    assert.ok(!anchors.has(ch.start.at) || ch.start.at === 'spawn', `${at}: its start anchor isn't shared`);
    anchors.add(ch.start.at);
    assert.ok(Array.isArray(ch.intro) && ch.intro.length === 3 && ch.intro.every((l) => typeof l === 'string' && l.length > 10), `${at}: three intro lines`);
    assert.ok(typeof ch.outro === 'string' && ch.outro.length > 10, `${at}: an outro`);
    assert.ok(typeof ch.objText === 'string' && ch.objText, `${at}: objective text`);
    assert.ok(ch.biome && ch.card, `${at}: biome and card`);
    assert.ok(ch.mist >= 0 && ch.mist <= 1, `${at}: mist 0..1`);
    if (ch.objective === 'escape') assert.equal(ch.boss, null, `${at}: an escape has no boss`);
    else assert.ok(typeof ch.boss === 'string', `${at}: has a boss`);
    if (ch.captive) assert.ok(['cage', 'statue'].includes(ch.captive), `${at}: captive style`);
    if (ch.seal) assert.ok(['altar', 'trap', 'rift'].includes(ch.seal), `${at}: seal style`);
    if (!ch.ready) assert.equal(ch.pending, true, `${at}: an unready chapter is marked pending`);
  }
});

test('chapters 3 to 12 start along the Road West', () => {
  const want = { lt3: 'woodsEdge', lt4: 'road1', lt5: 'road2', lt6: 'road3', lt7: 'road4', lt8: 'road5', lt9: 'road6', lt10: 'road7', lt11: 'road8', lt12: 'road9' };
  for (const [id, at] of Object.entries(want)) assert.equal(CHAPTERS.find((c) => c.id === id).start.at, at, id);
  const byId = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
  assert.equal(byId.lt3.boss, 'hellhound_alpha');
  assert.equal(byId.lt12.boss, 'luke');
  assert.equal(byId.lt3.objective, 'flag');
  assert.equal(byId.lt5.objective, 'rescue');
  assert.equal(byId.lt7.objective, 'seal');
  assert.equal(byId.lt8.objective, 'escape');
  assert.equal(byId.lt10.objective, 'seal');
  assert.equal(byId.lt11.objective, 'boss');
  assert.equal(byId.lt12.objective, 'boss');
});

test('every line of the Lightning Thief prophecy is fulfilled by exactly one chapter', () => {
  const book = BOOKS.find((b) => b.id === 'book1');
  book.prophecy.forEach((line, i) => {
    const by = CHAPTERS.filter((c) => c.book === 'book1' && c.prophecyLine === i);
    assert.equal(by.length, 1, `line ${i + 1} (“${line}”) is fulfilled by one chapter, not ${by.map((c) => c.id).join(', ') || 'none'}`);
  });
  for (const c of CHAPTERS) if (c.prophecyLine != null) assert.ok(Number.isInteger(c.prophecyLine) && c.prophecyLine < (BOOKS.find((b) => b.id === c.book).prophecy.length), `${c.id}: prophecy line in range`);
});

test('chapter numbers run in order within each book', () => {
  for (const b of BOOKS) CHAPTERS.filter((c) => c.book === b.id).forEach((c, i) => assert.equal(c.num, i + 1, c.id));
});

test('chapter bosses, biomes, start anchors and art exist (or fall back)', () => {
  const GAME = resolve(JS, '..');
  const bosses = read('entities/bosses.js'), biomes = read('world/biomes.js'), camp = read('world/camp.js'), def = read('story/missionDef.js');
  for (const ch of CHAPTERS.filter((c) => c.book === 'book1')) {
    if (ch.boss) assert.ok(new RegExp(`^  ${ch.boss}: \\{`, 'm').test(bosses) || new RegExp(`\\b${ch.boss}: '`).test(def), `${ch.id}: boss ${ch.boss} is built or has a fallback`);
    assert.ok(new RegExp(`^  ${ch.biome}: \\{`, 'm').test(biomes) || new RegExp(`\\b${ch.biome}: '`).test(def), `${ch.id}: biome ${ch.biome} is built or has a fallback`);
    if (ch.start.at !== 'spawn') assert.match(camp, new RegExp(`\\b${ch.start.at}\\b`), `${ch.id}: camp has the anchor ${ch.start.at}`);
    assert.ok(existsSync(join(GAME, ch.card)), `${ch.id}: card ${ch.card}`);
    if (ch.bossDown?.stinger) assert.ok(existsSync(join(GAME, `assets/music/${ch.bossDown.stinger}.mp3`)), `${ch.id}: stinger ${ch.bossDown.stinger}`);
  }
  assert.equal(CHAPTERS.find((c) => c.id === 'lt3').bossDown?.stinger, 'claimed', 'chapter 3: Percy is claimed with the stinger');
  // quest markers skip a start anchor camp doesn't have yet
  assert.match(read('story/questMarkers.js'), /if \(!anchor\?\.isVector3\) continue;/);
});

test('pending chapters are playable only with ?pending', async () => {
  const { chapterPlayable } = await import('../js/story/chapters.js');
  const lt1 = CHAPTERS.find((c) => c.id === 'lt1'), lt5 = CHAPTERS.find((c) => c.id === 'lt5');
  const had = Object.getOwnPropertyDescriptor(globalThis, 'location');
  try {
    Object.defineProperty(globalThis, 'location', { value: { search: '' }, configurable: true });
    assert.equal(chapterPlayable(lt1), true);
    assert.equal(chapterPlayable(lt5), lt5.ready === true);
    Object.defineProperty(globalThis, 'location', { value: { search: '?pending' }, configurable: true });
    assert.equal(chapterPlayable(lt5), true);
  } finally { if (had) Object.defineProperty(globalThis, 'location', had); else delete globalThis.location; }
});
