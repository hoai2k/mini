// Loot rules: items roll valid, enchantment rows offer choices, salvage
// refunds exactly what was spent, favourites and blessings work, every magic
// item's effect exists, and old saved items are converted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, ENCHANTS, rollItem, rollChest, normalizeItem, gearStats, spentPoints, enchCost, powerFor, itemInfo, rerollRow, mulberry32 } from '../js/loot.js';

const artifacts = readFileSync(new URL('../js/artifacts.js', import.meta.url), 'utf8');

test('the item list is varied and complete', () => {
  const by = (k) => ITEMS.filter((i) => i.kind === k);
  assert.ok(by('weapon').length >= 15 && by('armor').length >= 12 && by('artifact').length >= 18);
  for (const r of ['common', 'rare', 'unique']) for (const k of ['weapon', 'armor', 'artifact']) assert.ok(ITEMS.some((i) => i.kind === k && i.rarity === r), `${r} ${k}`);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length, 'ids are unique');
  for (const i of ITEMS) {
    for (const f of i.fixed ?? []) assert.ok(ENCHANTS[f]?.for.includes(i.kind), `${i.id}: fixed ${f} fits a ${i.kind}`);
    if (i.kind === 'artifact') assert.match(artifacts, new RegExp(`case '${i.act}'`), `${i.id}: effect ${i.act} exists`);
  }
});

test('rolled items have rows of choices and sensible power', () => {
  const rng = mulberry32(42);
  for (let n = 0; n < 400; n++) {
    const it = rollItem(powerFor(1 + (n % 4), 1 + (n % 20), rng), { rng });
    const b = itemInfo(it);
    assert.ok(it.power >= 1 && it.power < 60);
    const seen = new Set();
    for (const e of it.ench) {
      assert.ok(e.options.length >= 1);
      for (const o of e.options) { assert.ok(ENCHANTS[o].for.includes(b.kind), `${o} on ${b.kind}`); assert.ok(!seen.has(o), 'no repeated choice'); seen.add(o); }
      if (!e.fixed) assert.equal(e.pick, null);
    }
  }
});

test('enchanting and salvage refunds balance', () => {
  const it = rollItem(20, { id: 'labrys', rng: mulberry32(1) });
  const row = it.ench.find((e) => !e.fixed);
  let paid = 0;
  row.pick = row.options[0];
  for (let l = 1; l <= 3; l++) { paid += enchCost(row.pick, l); row.level = l; }
  assert.equal(spentPoints(it), paid);
  assert.ok(gearStats([it]).s.meleeMult > 1);
});

test('re-rolling only touches rows nobody invested in', () => {
  const it = rollItem(20, { id: 'xiphos', rng: mulberry32(9) });
  const open = it.ench.findIndex((e) => !e.fixed && !e.pick);
  assert.ok(rerollRow(it, open, mulberry32(3)));
  it.ench[open].pick = it.ench[open].options[0]; it.ench[open].level = 1;
  assert.equal(rerollRow(it, open), false);
});

test('favourites and blessings', () => {
  const fav = rollItem(20, { id: 'xiphos', blessed: false });
  assert.ok(gearStats([fav], 'percy').s.meleeMult > gearStats([fav], 'grover').s.meleeMult);
  const blessed = rollItem(20, { id: 'xiphos', blessed: true });
  assert.equal(blessed.blessed.level, 3);
});

test('chests drop per player and bosses drop more', () => {
  assert.equal(rollChest(1, 'common', { rng: mulberry32(2) }).length, 1);
  assert.equal(rollChest(2, 'boss', { rng: mulberry32(2) }).length, 2);
});

test('old saved items are converted', () => {
  const old = { uid: 'x', id: 'katana', power: 12, ench: [{ id: 'sharpness', level: 2 }] };
  const it = normalizeItem(old);
  assert.ok(ITEMS.some((i) => i.id === it.id));
  assert.deepEqual(it.ench[0], { options: ['sharpness'], pick: 'sharpness', level: 2, fixed: false });
});
