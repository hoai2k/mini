// The size spec (design/sizes.json): every model the workbench lists has a
// size category relative to Percy, with its reason and source, and every
// category has a band in the one table that tunes them. The bands themselves
// are checked against the rendered models in the browser:
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/bodysize.cjs - '' --check
// The workbench's model list is the set of ids with a description
// (workbench.test.mjs holds the two lists equal).
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DESCRIPTIONS } from '../workbench/descriptions.js';

const spec = JSON.parse(readFileSync(new URL('../../design/sizes.json', import.meta.url), 'utf8'));
const cats = Object.fromEntries(Object.entries(spec.categories).filter(([k]) => !k.startsWith('_')));
const SOURCES = ['owner', 'sheet', 'books', 'role'];

test('the categories are ordered bands that overlap only a little', () => {
  const list = Object.entries(cats);
  assert.ok(list.length >= 7, 'at least the seven sizes the owner named');
  for (const [k, c] of list) {
    assert.equal(typeof c.label, 'string', k);
    assert.ok(c.min >= 0 && c.max > c.min, `${k}: ${c.min}–${c.max}`);
  }
  // (a band marked "aside" is a class of models given its own band beside the
  // ladder of sizes, as the adults are (round 10): it is not a step of it)
  const ladder = list.filter(([, c]) => !c.aside);
  assert.ok(ladder.length >= 7, 'at least the seven sizes the owner named, on the ladder');
  for (let i = 1; i < ladder.length; i++) {
    const [a, A] = ladder[i - 1], [b, B] = ladder[i];
    assert.ok(B.min > A.min && B.max > A.max, `${a} → ${b} grow`);
    assert.ok(B.min <= A.max, `${a} and ${b} leave no gap`);
    assert.ok(A.max - B.min <= 0.15 + 1e-9,`${a} and ${b} overlap by ${(A.max - B.min).toFixed(2)}`);
  }
});

test('every workbench model has a size category, a source and a reason', () => {
  const bad = [];
  for (const id of Object.keys(DESCRIPTIONS)) {
    const e = spec.models[id];
    if (!e) { bad.push(`${id}: no entry`); continue; }
    if (!cats[e.category]) bad.push(`${id}: unknown category ${e.category}`);
    if (!SOURCES.includes(e.source)) bad.push(`${id}: source ${e.source}`);
    if (typeof e.reason !== 'string' || e.reason.length < 8) bad.push(`${id}: no reason`);
    if (e.head !== undefined && (e.head !== 'followUp' || typeof e.headNote !== 'string')) bad.push(`${id}: head mark without a note`);
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(Object.keys(spec.models).filter((k) => !(k in DESCRIPTIONS)), [], 'no entry for a model the workbench no longer lists');
});

test('a sheet measurement adds up', () => {
  for (const [id, e] of Object.entries(spec.models)) {
    const s = e.sheetMeasure; if (!s) continue;
    assert.match(s.sheet, /^design\/concept\/[\w-]+\.png$/, id);
    assert.ok(Math.abs(s.ratio - s.bodyPx / s.percyPx) < 0.01, `${id}: ratio`);
    if (s.people) assert.ok(Math.abs(s.norm - s.ratio / s.people) < 0.01, `${id}: norm`);
  }
});

test('the owner\'s rulings keep their categories', () => {
  const want = { tyson: 'bigger', hellhound: 'muchBigger', hellhound_alpha: 'muchBigger', laistrygonian: 'bigger', medusa: 'bigger', pup: 'slightlyBigger', cerberus: 'giant', chimera: 'giant', fury: 'bigger', alecto: 'bigger', empousa: 'same' };
  for (const [id, cat] of Object.entries(want)) {
    assert.equal(spec.models[id].category, cat, id);
    assert.equal(spec.models[id].source, 'owner', id);
  }
  assert.ok(cats.giant.min <= 3.4, 'Cerberus at 3.4× and over fits "giant"');
  // the round-6 rulings: the dracaena notably bigger than Percy, the harpy at least his size
  assert.ok(cats[spec.models.dracaena.category].min >= 1.4);
  assert.ok(cats[spec.models.harpy.category].min >= 1.0);
});

test('the head rule falls from hero proportions toward an adult\'s', () => {
  const H = spec.head;
  assert.ok(H.hero >= 0.28 && H.hero <= 0.32, 'heroes measure 0.23–0.29');
  assert.ok(H.big < H.hero && H.big >= 0.13, 'an adult is about 0.13');
  assert.ok(H.from >= 1 && H.to > H.from);
});
