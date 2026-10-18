// The open world's side-quest people (js/entities/people.js): every
// 'npc:<id>' model named in the regions and the Road West's stops has a look,
// every look is used and has a name. people.js pulls in three.js, which Node
// cannot load, so its PEOPLE keys are read from the source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { t } from '../js/text_config.js';

const root = new URL('../js/', import.meta.url);
const src = readFileSync(new URL('entities/people.js', root), 'utf8');
const body = src.slice(src.indexOf('export const PEOPLE = {'), src.indexOf('\n};\n', src.indexOf('export const PEOPLE = {')));
const PEOPLE_IDS = [...body.matchAll(/^ {2}([a-z_]+): \{$/gm)].map((m) => m[1]);
const NPC_MODELS = ['chiron', 'mr_d'];

const files = ['world/regions/', 'world/road/'].flatMap((d) => readdirSync(new URL(d, root)).filter((f) => f.endsWith('.js')).map((f) => d + f));
const uses = files.flatMap((f) => [...readFileSync(new URL(f, root), 'utf8').matchAll(/'npc:([a-z_]+)'/g)].map((m) => ({ file: f, id: m[1] })));

test('people.js defines the side-quest people', () => {
  assert.ok(PEOPLE_IDS.length >= 23, `found ${PEOPLE_IDS.length} people`);
  assert.equal(new Set(PEOPLE_IDS).size, PEOPLE_IDS.length);
});

test("every 'npc:<id>' model in the regions and road stops has a look", () => {
  assert.ok(uses.length > 0);
  for (const u of uses) assert.ok(PEOPLE_IDS.includes(u.id) || NPC_MODELS.includes(u.id), `${u.file}: no model for npc:${u.id}`);
});

test('every person is placed somewhere and has a name', () => {
  for (const id of PEOPLE_IDS) {
    assert.ok(uses.some((u) => u.id === id), `npc:${id} is not used by any region or road stop`);
    assert.notEqual(t(`people.${id}`), `people.${id}`, `no name for people.${id}`);
  }
});
