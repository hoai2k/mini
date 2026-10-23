// The model workbench (workbench/workbench.js) shows a short description of
// every model it lists (workbench/descriptions.js). The workbench builds its
// list from registries that import three.js, which Node cannot load, so the
// monster and champion ids come from their data modules (js/data) and the
// rest are read from the registries' source text.
// A model with no description, or a description for a model that is gone,
// fails here.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DESCRIPTIONS } from '../workbench/descriptions.js';
import { MONSTER_IDS } from '../js/data/monsters.js';
import { CHAMPION_SHOWCASE } from '../js/data/champions.js';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
// the text between a head line and the first closing "};" after it
const block = (src, head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n};', i)); };
const keys = (src, re) => [...src.matchAll(re)].map((m) => m[1]);

const wbSrc = read('workbench/workbench.js');
const MODELS = {
  heroes: keys(read('js/heroes/index.js'), /^  (\w+): \{ name: t\('heroes\./gm),
  npcs: keys(wbSrc.match(/const npcs = \{(.*)\};/)[1], /(\w+): \[/g).concat(/add\('npcs', 'dummy'/.test(wbSrc) ? ['dummy'] : []),
  monsters: MONSTER_IDS,
  bosses: keys(block(read('js/entities/bosses.js'), 'const BOSSES = {'), /^  (\w+): \{\n    name: txt\('bosses\./gm),
  champions: CHAMPION_SHOWCASE,
  mortals: keys(block(read('js/entities/mortals.js'), 'export const MORTALS = {'), /^  (\w+): \{\n    name: txt\('mortals\./gm),
  people: keys(block(read('js/entities/people.js'), 'export const PEOPLE = {'), /^  (\w+): \{\n    painter:/gm),
};

test('the id lists were read from the sources', () => {
  assert.deepEqual(MODELS.npcs, ['chiron', 'mr_d', 'dummy']);
  for (const [g, ids] of Object.entries(MODELS)) assert.ok(ids.length >= 3, `${g}: ${ids.length} ids`);
  assert.ok(MODELS.monsters.includes('mortal') && MODELS.monsters.includes('karpos'));
  assert.ok(MODELS.champions.includes('kind:cyclops') && MODELS.champions.includes('oth_gorgos'));
});

test('every workbench model has a description', () => {
  const missing = [];
  for (const [g, ids] of Object.entries(MODELS)) for (const id of ids) if (typeof DESCRIPTIONS[id] !== 'string' || DESCRIPTIONS[id].trim().length < 40) missing.push(`${g}:${id}`);
  assert.deepEqual(missing, [], `no description (workbench/descriptions.js) for: ${missing.join(', ')}`);
});

test('no description is left for a model the workbench no longer lists', () => {
  const all = new Set(Object.values(MODELS).flat());
  assert.deepEqual(Object.keys(DESCRIPTIONS).filter((k) => !all.has(k)), []);
});

test('descriptions are short', () => {
  for (const [id, text] of Object.entries(DESCRIPTIONS)) assert.ok(text.length <= 420, `${id}: ${text.length} characters`);
});

test('the workbench shows them', () => {
  assert.match(wbSrc, /descriptions\.js/);
  assert.match(wbSrc, /DESCRIPTIONS\[item\.key\]/);
});
