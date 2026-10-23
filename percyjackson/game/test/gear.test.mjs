// Gear on the heroes (js/entities/gear/): every weapon and armour item of
// loot.js has a model, every family's re-posed attack styles exist, and the
// online presence carries what a hero wears. The models need Three.js, which
// Node can't load, so these read the sources; perf/weapons.cjs and
// perf/gear.cjs check the built models in the browser.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS } from '../js/loot.js';
import { readHero } from '../js/net/proto.js';

const read = (p) => readFileSync(new URL('../js/' + p, import.meta.url), 'utf8');
const looks = (src, start) => new Set([...src.slice(src.indexOf(start)).matchAll(/^ {2}(\w+): \{ fam: '(\w+)'/gm)].map((m) => m[1]));

test('every weapon item has a held model, every armour item a look', () => {
  const W = looks(read('entities/gear/weapons.js'), 'export const WEAPON_LOOKS'), A = looks(read('entities/gear/armour.js'), 'export const ARMOUR_LOOKS');
  for (const it of ITEMS.filter((i) => i.kind === 'weapon')) assert.ok(W.has(it.id), `${it.id} has a model in gear/weapons.js`);
  for (const it of ITEMS.filter((i) => i.kind === 'armor')) assert.ok(A.has(it.id), `${it.id} has a look in gear/armour.js`);
  assert.equal(W.size, ITEMS.filter((i) => i.kind === 'weapon').length, 'no weapon model without an item');
  assert.equal(A.size, ITEMS.filter((i) => i.kind === 'armor').length, 'no armour look without an item');
});

test('each weapon family re-poses the combo into styles the rig can play', () => {
  const src = read('entities/gear/weapons.js'), chr = read('entities/character.js');
  const pose = chr.slice(chr.indexOf('  attackPose(T, a, k) {'), chr.indexOf('  physics(p) {'));
  const styles = new Set([...pose.matchAll(/case '(\w+)':/g)].map((m) => m[1]).concat(['shoot']));
  const fam = src.slice(src.indexOf('export const FAMILY'), src.indexOf('};', src.indexOf('export const FAMILY')));
  for (const st of fam.matchAll(/styles: \{([^}]*)\}/g)) for (const m of st[1].matchAll(/(\w+): '(\w+)'/g)) { assert.ok(styles.has(m[1]), `${m[1]} is a style`); assert.ok(styles.has(m[2]), `${m[1]} → ${m[2]} is a style attackPose plays`); }
  // every family a look names is a family
  const fams = new Set([...fam.matchAll(/^ {2}(\w+): \{ hands: '(one|two|twin)'/gm)].map((m) => m[1]));
  for (const m of src.matchAll(/\{ fam: '(\w+)'/g)) assert.ok(fams.has(m[1]), `family ${m[1]} is defined`);
  assert.ok(styles.has('backhand'), 'the backhand swing exists');
});

test('the online presence carries the gear a hero wears, and nothing else', () => {
  const base = { k: 'abcdefgh', x: 1, y: 2, z: 3 };
  const h = readHero({ ...base, gw: 'minotaur_horn', ga: 'achilles_armor', gt: 'h' });
  assert.equal(h.gw, 'minotaur_horn'); assert.equal(h.ga, 'achilles_armor'); assert.equal(h.gt, 'heroic');
  const bad = readHero({ ...base, gw: '<img src=x>', ga: 42, gt: 'x' });
  assert.equal(bad.gw, null); assert.equal(bad.ga, null); assert.equal(bad.gt, null);
  const none = readHero(base);
  assert.equal(none.gw, null); assert.equal(none.ga, null);
  // the sender puts them in
  assert.match(read('net/online.js'), /if \(G\?\.weapon\) e\.gw = G\.weapon;/);
});

test('the heroes are dressed wherever they show', () => {
  assert.match(read('entities/player.js'), /buildHeroModel\(hero, gearOf\(/, 'a player is built in its gear');
  assert.match(read('entities/player.js'), /this\.dress\(sv\);/, 'a gear change dresses the hero again');
  assert.match(read('main.js'), /buildHeroModel\(id, gear\)/, 'the hero select stage shows the gear');
  assert.match(read('ui/inventory.js'), /heroPreview\(who\.hero, g,/, 'the inventory shows the hero in their gear');
  assert.match(read('net/online.js'), /p\.dress\?\.\(null, \{ weapon: e\.gw, armor: e\.ga, tier: e\.gt \}\)/, 'an online hero is dressed from its presence');
});
