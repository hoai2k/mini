// Loot rules: items roll valid, enchantment rows offer choices, salvage
// refunds exactly what was spent, favourites and blessings work, every magic
// item's effect exists, and old saved items are converted.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, ENCHANTS, PROC, rollItem, rollChest, normalizeItem, gearStats, spentPoints, enchCost, powerFor, itemInfo, rerollRow, mulberry32 } from '../js/loot.js';

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
    assert.ok(it.power >= 1 && it.power < 80, 'area 1-4 and level 1-20: at most about gear level 5');
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

// ---------------------------------------------------------------- the loot rework (design/loot-design.md)
import { existsSync, readdirSync } from 'node:fs';
import * as P from '../js/progression.js';
import { RARITY, BOONS, BOSS_SIGNATURE, ITEM_BY_ID, PLACE_TAGS, SALVAGE, itemTier, itemStrength, salvageValue, temperCost, rerollCost, reforgeCost, reforge, reforgeTarget, isOutdated, rollBoons, rollBossLoot, rollChapterReward, applyPity, signatureDue, recordSignature, signatureKey, rollTierFor } from '../js/loot.js';
import { normalizeData, freshData } from '../js/save.js';
import { ICON_CELL, ICON_SHEETS } from '../js/ui/icons.js';
import { CHAPTERS } from '../js/story/chapters.js';
import { t } from '../js/text_config.js';
import { hitEffects } from '../js/gearEffects.js';

const TIERS = ['common', 'rare', 'heroic', 'unique'];
const tally = (n, f) => { const c = { common: 0, rare: 0, heroic: 0, unique: 0 }; for (let i = 0; i < n; i++) c[f(i)]++; for (const k in c) c[k] /= n; return c; };

test('rarity: four tiers with their colours, rows, boons and the smaller hidden strength', () => {
  assert.deepEqual(Object.keys(RARITY), TIERS);
  assert.equal(RARITY.rare.color, '#3fe0b0'); assert.equal(RARITY.heroic.color, '#b884ff'); assert.equal(RARITY.unique.color, '#ff9a2a');
  assert.deepEqual(TIERS.map((k) => RARITY[k].mult), [1, 1.02, 1.05, 1.08]);
  assert.deepEqual(TIERS.map((k) => RARITY[k].rows), [1, 2, 2, 3]);
  assert.deepEqual(TIERS.map((k) => RARITY[k].boons), [0, 1, 2, 1]);
  assert.equal(t('rarity.heroic'), 'Heroic');
});

// §4.2's table of resulting odds (C / R / H / L in %), at Mortal and at the top difficulty
const TABLE = {
  monster: { 1: [77, 23, 0, 0], 4: [53, 34, 9.1, 4], 6: [40, 38, 16, 7], 10: [36, 27, 26, 11], 13: [37, 22, 29, 12], top: [28, 17, 39, 16] },
  chest: { 1: [63, 38, 0, 0], 4: [36, 46, 12, 5.5], 6: [25, 47, 20, 8.8], 10: [22, 33, 31, 14], 13: [23, 27, 36, 14], top: [16, 20, 46, 18] },
  rare: { 1: [0, 100, 0, 0], 4: [0, 72, 19, 8.6], 6: [0, 62, 26, 12], 10: [0, 42, 40, 18], 13: [0, 35, 47, 19], top: [0, 23, 55, 22] },
  boss: { 1: [0, 100, 0, 0], 4: [0, 69, 15, 15], 6: [0, 59, 21, 21], 10: [0, 38, 31, 31], 13: [0, 32, 36, 32], top: [0, 21, 41, 37] },
  quest: { 1: [45, 55, 0, 0], 4: [23, 60, 13, 3], 6: [16, 59, 21, 4.6], 10: [14, 43, 35, 7.7], 13: [15, 36, 40, 8.1], top: [11, 27, 52, 10] },
};
test('rarity weights by source match the design table (and normalise)', () => {
  for (const [src, rows] of Object.entries(TABLE)) for (const [L, want] of Object.entries(rows)) {
    const o = L === 'top' ? P.rarityWeights(src, 13, 4) : P.rarityWeights(src, +L, 1);
    assert.ok(Math.abs(TIERS.reduce((a, k) => a + o[k], 0) - 1) < 1e-9, `${src} ${L} sums to 1`);
    TIERS.forEach((k, i) => assert.ok(Math.abs(o[k] * 100 - want[i]) <= 1, `${src} level ${L} ${k}: ${(o[k] * 100).toFixed(1)}% vs ${want[i]}%`));
  }
  // the sources that share a table
  assert.deepEqual(P.rarityWeights('elite', 9, 2), P.rarityWeights('rare', 9, 2));
  assert.deepEqual(P.rarityWeights('champion', 9, 2), P.rarityWeights('rare', 9, 2));
  assert.deepEqual(P.rarityWeights('epic', 9, 2), P.rarityWeights('boss', 9, 2));
});

test('rarity distributions per source, simulated: within tolerance of the table', () => {
  const rng = mulberry32(77), N = 20000;
  for (const [src, rows] of Object.entries(TABLE)) for (const L of [4, 10, 13]) {
    const got = tally(N, () => itemTier(rollItem(P.powerAt(3), { rng, source: src, level: L })));
    TIERS.forEach((k, i) => assert.ok(Math.abs(got[k] * 100 - rows[L][i]) < 1.6, `${src} level ${L} ${k}: ${(got[k] * 100).toFixed(1)}% vs ${rows[L][i]}%`));
  }
  // a whole chest by kind: rare and epic chests never give Commons
  for (const kind of ['rare', 'epic']) for (let i = 0; i < 300; i++) for (const it of rollChest(5, kind, { rng, level: 12 })) assert.notEqual(itemTier(it), 'common', kind);
});

test('no Commons from rare chests, elites, champions, bosses or epic chests; the shop never sells a Legendary; level 1 has no Heroic or Legendary', () => {
  const rng = mulberry32(5);
  for (const src of ['rare', 'elite', 'champion', 'boss', 'epic']) for (const L of [1, 5, 20, 40]) assert.equal(P.rarityWeights(src, L, 3).common, 0, `${src} ${L}`);
  for (const L of [1, 8, 20, 40]) for (const d of [1, 4]) assert.equal(P.rarityWeights('shop', L, d).unique, 0);
  for (let i = 0; i < 3000; i++) assert.notEqual(itemTier(rollItem(60, { rng, source: 'shop', level: 30, difficulty: 4, raider: 0.2 })), 'unique', 'a shop roll is never Legendary, even with Tyche');
  for (const src of Object.keys(P.RARITY_WEIGHTS)) { const o = P.rarityWeights(src, 1, 4); assert.equal(o.heroic + o.unique, 0, `${src} at level 1`); }
  // the 0.15 floor (0.25 for Legendary) from level 2, and difficulty raises Heroic and Legendary
  assert.equal(P.levelFactors(2).heroic, 0.15); assert.equal(P.levelFactors(2).unique, 0.25);
  assert.ok(P.rarityWeights('monster', 2).unique > 0);
  for (const src of ['monster', 'chest', 'boss', 'quest']) {
    const a = P.rarityWeights(src, 8, 1), b = P.rarityWeights(src, 8, 3);
    assert.ok(b.unique > a.unique && b.heroic > a.heroic, `${src}: difficulty raises the best tiers`);
  }
  assert.equal(P.difficultyFactor(4), 1.75);
});

test('a Heroic is a Common or Rare base raised a tier; a Rare is sometimes a Common base; Legendaries are Legendary bases', () => {
  const rng = mulberry32(8);
  let promoted = 0;
  for (let i = 0; i < 2000; i++) {
    const h = rollItem(40, { rng, tier: 'heroic' }); assert.equal(itemTier(h), 'heroic'); assert.notEqual(itemInfo(h).rarity, 'unique');
    assert.equal(h.ench.length, Math.max(2, (itemInfo(h).fixed ?? []).length)); assert.equal(h.boons.length, 2);
    const r = rollItem(40, { rng, tier: 'rare' }); assert.equal(itemTier(r), 'rare'); if (itemInfo(r).rarity === 'common') promoted++;
    const u = rollItem(40, { rng, tier: 'unique' }); assert.equal(itemInfo(u).rarity, 'unique'); assert.equal(u.ench.length, 3);
  }
  assert.ok(Math.abs(promoted / 2000 - 0.3) < 0.04, `30% of Rares are raised Commons (${promoted / 20}%)`);
  // strength follows the tier: the same base raised to Heroic is a little stronger
  const c = rollItem(40, { id: 'club', rng: mulberry32(1), blessed: false }), hc = rollItem(40, { id: 'club', tier: 'heroic', rng: mulberry32(1), blessed: false }); hc.power = c.power;
  assert.ok(Math.abs(itemStrength(hc) / itemStrength(c) - 1.05) < 1e-9);
});

test('the pity rule: a Legendary after 30 item drops without one, from a pity source only', () => {
  const d = { sinceLegendary: 0 }, rng = mulberry32(3);
  // level 1: nothing rolls Legendary by luck, so only the Fates' Thread gives one
  for (let i = 0; i < P.PITY_AT; i++) assert.notEqual(itemTier(rollItem(12, { rng, source: 'chest', level: 1, pity: d })), 'unique');
  assert.equal(d.sinceLegendary, 30);
  assert.notEqual(itemTier(rollItem(12, { rng, source: 'chest', level: 1, pity: d })), 'unique', 'a common chest is not a pity source');
  const it = rollItem(12, { rng, source: 'rare', level: 1, pity: d });
  assert.equal(itemTier(it), 'unique', 'the next rare chest drop is Legendary');
  assert.equal(d.sinceLegendary, 0, 'and the count starts again');
  // any Legendary resets it, a forced one too; the boss table counts its drops
  d.sinceLegendary = 17; applyPity(d, 'unique', 'quest', false); assert.equal(d.sinceLegendary, 0);
  d.sinceLegendary = 30; const boss = rollBossLoot('minotaur', 1, { rng, level: 1, pity: d });
  assert.ok(boss.items.some((x) => itemTier(x) === 'unique'), 'after 30 drops without one, a boss’s first drop is Legendary');
  // a profile without pity data is fine
  assert.equal(applyPity(null, 'rare', 'boss'), 'rare');
  assert.equal(rollTierFor('boss', { level: 1, rng, pity: { sinceLegendary: 30 } }), 'unique');
});

test('boss loot: 1 guaranteed + 3 at 50%, Legendaries last, the signature on the first win at each difficulty', () => {
  const rng = mulberry32(21), N = 4000;
  let total = 0, min = 9, max = 0;
  for (let i = 0; i < N; i++) { const n = rollBossLoot('chimera', 6, { rng, level: 14 }).items.length; total += n; min = Math.min(min, n); max = Math.max(max, n); }
  assert.equal(min, 1); assert.equal(max, 4); assert.ok(Math.abs(total / N - 2.5) < 0.06, `about 2.5 a kill (${(total / N).toFixed(2)})`);
  const first = rollBossLoot('minotaur', 1, { rng, level: 1, first: true, difficulty: 1 });
  assert.equal(first.signature.id, 'minotaur_horn'); assert.equal(first.items.at(-1), first.signature, 'the signature lands last');
  assert.equal(first.signature.blessed, undefined, 'not Blessed at Mortal');
  assert.ok(first.signature.power >= P.powerAt(1.7) - 6, 'at boss power');
  const hard = rollBossLoot('minotaur', 3, { rng, level: 6, first: true, difficulty: 3 });
  assert.ok(hard.signature.blessed, 'Blessed from difficulty 3');
  for (let i = 0; i < 200; i++) { const r = rollBossLoot('alecto', 8, { rng, level: 20 }); const tiers = r.items.map((x) => (itemTier(x) === 'unique' ? 1 : 0)); assert.deepEqual(tiers, [...tiers].sort(), 'Legendaries land last'); assert.ok(r.items.every((x) => itemTier(x) !== 'common')); }
  // once per difficulty: recorded, then due again only on a higher difficulty
  const d = freshData('T');
  assert.ok(signatureDue(d, 'minotaur', 1)); recordSignature(d, 'minotaur', 1);
  assert.equal(signatureDue(d, 'minotaur', 1), false); assert.ok(signatureDue(d, 'minotaur', 2)); recordSignature(d, 'minotaur', 3);
  assert.equal(signatureDue(d, 'minotaur', 2), false); assert.equal(d.signatures.minotaur, 3);
  // later wins: about half the Legendaries from the boss are its signature
  let sig = 0, leg = 0;
  for (let i = 0; i < 3000; i++) for (const x of rollBossLoot('cerberus', 10, { rng, level: 30, difficulty: 4 }).items) if (itemTier(x) === 'unique') { leg++; if (x.id === 'cerberus_ball') sig++; }
  assert.ok(Math.abs(sig / leg - 0.5) < 0.06, `${sig} of ${leg}`);
});

test('the chapter reward: one item on the quest table and 20 drachmas a level; lt8 (no boss) gives its signature on the first clear', () => {
  const rng = mulberry32(4);
  const r = rollChapterReward('lt5', 4, { rng, level: 10 });
  assert.equal(r.items.length, 1); assert.equal(r.coins, 80); assert.equal(r.signature, null);
  const casino = rollChapterReward('lt8', 7, { rng, level: 18, first: true });
  assert.equal(casino.signature.id, 'lotus_card'); assert.equal(casino.items.length, 2);
  const got = tally(8000, () => itemTier(rollChapterReward('lt9', 9, { rng, level: 10 }).items[0]));
  TIERS.forEach((k, i) => assert.ok(Math.abs(got[k] * 100 - TABLE.quest[10][i]) < 1.8, `quest table ${k}`));
});

test('the 12 signature items: every chapter has one, and each can be reached', () => {
  assert.equal(CHAPTERS.filter((c) => c.book === 'book1' || /^lt\d+$/.test(c.id)).length >= 12, true);
  const want = { lt1: 'fury_lash', lt2: 'minotaur_horn', lt3: 'hellhound_hide', lt4: 'fury_wings', lt5: 'medusa_head', lt6: 'chimera_fang', lt7: 'ares_shield', lt8: 'lotus_card', lt9: 'procrustes_axe', lt10: 'cerberus_ball', lt11: 'ares_sword', lt12: 'backbiter' };
  const rng = mulberry32(12);
  for (const [cid, id] of Object.entries(want)) {
    const ch = CHAPTERS.find((c) => c.id === cid); assert.ok(ch, cid);
    const key = signatureKey(cid, ch.boss);
    assert.equal(BOSS_SIGNATURE[key], id, `${cid}: ${key}`);
    const it = ITEM_BY_ID[id]; assert.equal(it.rarity, 'unique'); assert.equal(it.sig, key);
    const got = ch.boss ? rollBossLoot(key, P.CHAPTER_LEVEL[cid], { rng, level: 5, first: true }).signature : rollChapterReward(cid, P.CHAPTER_LEVEL[cid], { rng, level: 5, first: true }).signature;
    assert.equal(got?.id, id, `${cid} drops ${id}`);
  }
  assert.equal(new Set(Object.values(want)).size, 12);
  // and they are in the ordinary Legendary pool too (any Legendary roll can find them)
  const seen = new Set(); for (let i = 0; i < 20000; i++) seen.add(rollItem(60, { rng, tier: 'unique' }).id);
  for (const id of Object.values(want)) assert.ok(seen.has(id), `${id} in the Legendary pool`);
});

test('the 16 new items (68 → 84): valid, with text, tags, icon cells and their effects', () => {
  assert.equal(ITEMS.length, 84);
  const count = (k, r) => ITEMS.filter((i) => i.kind === k && i.rarity === r).length;
  assert.deepEqual(['common', 'rare', 'unique'].map((r) => count('weapon', r)), [6, 11, 15]);
  assert.deepEqual(['common', 'rare', 'unique'].map((r) => count('armor', r)), [5, 10, 9]);
  assert.deepEqual(['common', 'rare', 'unique'].map((r) => count('artifact', r)), [6, 13, 9]);
  assert.equal(ITEMS.filter((i) => i.rarity === 'unique').length, 33);
  const NEW = { hunter_knives: ['weapon', 'rare'], fury_lash: ['weapon', 'unique', 'fire_aspect'], minotaur_horn: ['weapon', 'unique', 'rampaging'], chimera_fang: ['weapon', 'unique', 'venom'], procrustes_axe: ['weapon', 'unique', 'committed'],
    counsellor_vest: ['armor', 'common'], lotus_robe: ['armor', 'rare'], mist_cloak: ['armor', 'rare'], fury_wings: ['armor', 'unique', 'speed_synergy'], hellhound_hide: ['armor', 'unique', 'thorns'], drakon_scale: ['armor', 'unique', 'protection'],
    ares_shield: ['artifact', 'unique', null, 'bulwark'], lotus_card: ['artifact', 'unique', null, 'lotus'], cerberus_ball: ['artifact', 'unique', null, 'fetch'], dionysus_vine: ['artifact', 'rare', null, 'vines'], hermes_vitamins: ['artifact', 'rare', null, 'vitamins'] };
  for (const [id, [kind, rarity, fixed, act]] of Object.entries(NEW)) {
    const b = ITEM_BY_ID[id]; assert.ok(b, id);
    assert.equal(b.kind, kind, id); assert.equal(b.rarity, rarity, id);
    if (fixed) assert.deepEqual(b.fixed, [fixed], id);
    if (act) { assert.equal(b.act, act); assert.match(artifacts, new RegExp(`case '${act}'`)); }
    const it = rollItem(40, { id, rng: mulberry32(1) });
    assert.ok(gearStats([it]).s.maxHp > 0 && Number.isFinite(gearStats([it]).s.meleeMult), id);
  }
  assert.equal(ITEM_BY_ID.hermes_vitamins.charges, 2);
  for (const i of ITEMS) {
    assert.ok(i.name && !i.name.startsWith('items.') && i.desc && !i.desc.startsWith('items.'), `${i.id}: text`);
    assert.ok(i.tags.length >= 1, `${i.id}: tags`);
    assert.ok(ICON_CELL[i.id], `${i.id}: an icon cell`);
  }
  // the sheets hold exactly the items, in cells that exist
  const cells = Object.values(ICON_SHEETS).flatMap((S) => { assert.ok(S.ids.length <= S.cols * S.rows); return S.ids; });
  assert.equal(cells.length, ITEMS.length); assert.equal(new Set(cells).size, ITEMS.length);
  // assets/icons.json names exactly the sheets delivered to game/assets (so the game never asks for a missing one)
  const listed = JSON.parse(readFileSync(new URL('../assets/icons.json', import.meta.url), 'utf8')).sheets;
  const there = Object.keys(ICON_SHEETS).filter((s) => existsSync(new URL(`../assets/${s}.png`, import.meta.url)));
  assert.deepEqual([...listed].sort(), there.sort(), 'assets/icons.json lists the delivered icon sheets');
});

test('the new enchantments: venom poisons and slows, Hermes’s Haul and Tyche’s Favour fold into the stats', () => {
  for (const id of ['venom', 'hermes_haul', 'tyche_favour']) { assert.ok(ENCHANTS[id]); for (let l = 1; l <= 3; l++) assert.doesNotMatch(ENCHANTS[id].desc(l), /\{|undefined|NaN/); }
  assert.deepEqual([1, 2, 3].map((l) => Math.round(PROC.venom(l) * 100)), [8, 12, 16]);
  const e = { pos: { x: 0, y: 0, z: 0 }, dead: false };
  const out = hitEffects({ isPlayer: true, procs: { venom: 2 }, stats: {} }, e, 20, 30, { melee: true }, { time: 5, near: () => [], damage: () => {} });
  assert.deepEqual(out[0], ['venom', 20 * PROC.venom(2)]);
  assert.equal(e.pjVenom.until, 5 + PROC.venomFor); assert.equal(e.pjVenom.slow, 0.2);
  const a = rollItem(40, { id: 'camp_shirt', rng: mulberry32(2), blessed: false }); a.boons = [];
  a.ench[0] = { options: ['hermes_haul'], pick: 'hermes_haul', level: 3 };
  const m = rollItem(40, { id: 'aegis', rng: mulberry32(2), blessed: false }); m.boons = [];
  m.ench[0] = { options: ['tyche_favour'], pick: 'tyche_favour', level: 2 };
  const s = gearStats([null, a, m, null]).s;
  assert.equal(s.lootChance, 0.04); assert.equal(s.raider, 0.07);
  // Tyche's Favour: a drop sometimes rolls one tier higher
  const rng = mulberry32(6), base = tally(6000, () => itemTier(rollItem(40, { rng, source: 'chest', level: 10 }))), lucky = tally(6000, () => itemTier(rollItem(40, { rng, source: 'chest', level: 10, raider: 0.1 })));
  assert.ok(lucky.unique > base.unique && lucky.common < base.common);
});

test('boons: in range, never twice on one item, for the right kind, and they count', () => {
  const rng = mulberry32(31);
  for (const kind of ['weapon', 'armor', 'artifact']) for (let i = 0; i < 400; i++) {
    const bs = rollBoons(kind, 2, rng);
    assert.equal(new Set(bs.map((b) => b.id)).size, bs.length);
    for (const b of bs) { const B = BOONS[b.id]; assert.ok(B.for.includes(kind)); assert.ok(b.v >= B.min - 1e-9 && b.v <= B.max + 1e-9, `${b.id} ${b.v}`); if (B.int) assert.equal(b.v, Math.round(b.v)); assert.ok(t(`boons.${b.id}.name`) && !t(`boons.${b.id}.desc`, { n: 5 }).includes('{')); }
  }
  const w = rollItem(40, { id: 'xiphos', rng: mulberry32(1), blessed: false }); w.boons = [];
  const k = { ...w, boons: [{ id: 'keen', v: 0.06 }] };
  assert.ok(Math.abs(gearStats([k]).s.meleeMult / gearStats([w]).s.meleeMult - 1.06) < 1e-9, 'Keen: +6% melee damage');
  // a magic item's Lasting boon lengthens its effect (artifacts.js reads art.lasting)
  const ag = rollItem(40, { id: 'aegis', rng: mulberry32(1) }); ag.boons = [{ id: 'lasting', v: 0.15 }];
  assert.equal(gearStats([null, null, ag, null]).artifacts[0].lasting, 1.15);
  assert.match(artifacts, /art\.lasting/);
});

test('salvage C < R < H < L; the forge charges more for rarer items; Reforge to level; the outdated warning', () => {
  assert.deepEqual(SALVAGE, { common: 8, rare: 18, heroic: 30, unique: 45 });
  const mk = (tier, id) => { const it = rollItem(10, { id, tier, rng: mulberry32(1), blessed: false }); it.power = 10; return it; };
  const items = [mk('common', 'club'), mk('rare', 'club'), mk('heroic', 'club'), mk('unique', 'backbiter')];
  const sv = items.map(salvageValue); assert.deepEqual(sv, [8, 18, 30, 45]);
  const blessed = { ...items[1], blessed: { id: 'sharpness', level: 3 } }; assert.equal(salvageValue(blessed), 27);
  for (const it of items) it.power = 50;
  assert.deepEqual(items.map(temperCost), [55, 61, 66, 72]);
  assert.ok(rerollCost(items[3]) > rerollCost(items[0]));
  // reforge: straight to what drops now, for (10 + 0.9 × the gain) × the rarity cost
  const L = 20, target = P.reforgePower(L), it = mk('heroic', 'club'); it.power = target - 30;
  assert.equal(reforgeTarget(it, L), target); assert.equal(reforgeCost(it, L), Math.round((10 + 0.9 * 30) * 1.2));
  assert.ok(isOutdated(it, L), 'more than a gear level below: outdated');
  assert.ok(reforge(it, L)); assert.equal(it.power, target); assert.equal(reforge(it, L), false, 'nothing more to gain');
  assert.equal(isOutdated(it, L), false); it.power = target - P.POWER_STEP; assert.equal(isOutdated(it, L), false, 'one gear level is still fine');
});

test('loot pools by place: items tagged for a place drop three times as often there', () => {
  const rng = mulberry32(14), N = 20000;
  const under = new Set(ITEMS.filter((i) => i.tags.includes('underworld')).map((i) => i.id));
  const share = (place) => { let n = 0; for (let i = 0; i < N; i++) if (under.has(rollItem(60, { rng, level: 20, place }).id)) n++; return n / N; };
  const plain = share(null), there = share('underworld');
  assert.ok(there > plain * 2, `the Underworld: ${(there * 100).toFixed(1)}% vs ${(plain * 100).toFixed(1)}% elsewhere`);
  assert.ok(PLACE_TAGS.casino.includes('lotus') && ITEM_BY_ID.lotus_robe.tags.includes('lotus'));
  for (const [place, tags] of Object.entries(PLACE_TAGS)) for (const g of tags) assert.ok(ITEMS.some((i) => i.tags.includes(g)), `${place}: tag ${g} has items`);
});

test('drachmas: the design’s averages, stacks of 5', () => {
  const rng = mulberry32(19), N = 40000, avg = (k, L = 1) => { let s = 0; for (let i = 0; i < N; i++) s += P.rollCoins(k, L, rng); return s / N; };
  for (const [k, want] of [['minor', 0.6], ['fodder', 0.15], ['chest', 12.5], ['rare', 22], ['epic', 40], ['boss', 55], ['pot', 0.9]]) {
    assert.ok(Math.abs(avg(k) - want) < Math.max(0.03, want * 0.02), `${k}: ${avg(k).toFixed(2)} vs ${want}`);
    assert.ok(Math.abs(P.avgCoins(k) - want) < 1e-9);
  }
  assert.ok(Math.abs(avg('chest', 5) - 12.5 * 1.6) < 0.4, 'the level factor: 1 + 0.15 a level');
  assert.deepEqual(P.coinStacks(4), [0, 4]); assert.deepEqual(P.coinStacks(5), [1, 0]); assert.deepEqual(P.coinStacks(23), [4, 3]);
  // mobs pay far less than chests now (MCD2: 0.3 a mob, 15 a chest)
  assert.ok(P.avgCoins('minor') * 10 < P.avgCoins('chest'));
});

test('old saves load and gain the loot fields; old items get their tier and no boons', () => {
  const old = { id: 'abcdefgh12', name: 'Old', coins: 40, level: 7, xp: 0, enchantPoints: 2, heroes: {}, completed: { lt1: 2, lt2: 1 },
    inventory: [{ uid: 'u1', id: 'xiphos', power: 30, ench: [{ id: 'sharpness', level: 1 }], isNew: true }, { uid: 'u2', id: 'backbiter', power: 50, ench: [] }, { uid: 'u3', id: 'club', tier: 'mythic', power: 12, ench: [], boons: [{ id: 'nope', v: 1 }, { id: 'keen', v: 0.05 }, { id: 'sturdy', v: 9 }] }] };
  const d = normalizeData(JSON.parse(JSON.stringify(old)));
  assert.equal(d.sinceLegendary, 0); assert.deepEqual(d.signatures, {}); assert.equal(d.newCount, 1);
  assert.equal(d.coins, 40); assert.equal(d.level, 7); assert.deepEqual(d.completed, { lt1: 2, lt2: 1 });
  const [x, bb, club] = d.inventory;
  assert.equal(x.tier, 'rare'); assert.deepEqual(x.boons, []); assert.equal(x.ench[0].pick, 'sharpness');
  assert.equal(bb.tier, 'unique');
  assert.equal(club.tier, 'common', 'an unknown tier falls back to the base'); assert.deepEqual(club.boons, [{ id: 'keen', v: 0.05 }], 'a weapon keeps only weapon boons it knows');
  // a beaten boss with no signature on record still drops it on the next win
  assert.ok(signatureDue(d, 'alecto', 2));
  // bad values are cleaned; good ones are kept
  const d2 = normalizeData({ ...old, sinceLegendary: 12.7, signatures: { minotaur: 2, bad: 'x', neg: -1 } });
  assert.equal(d2.sinceLegendary, 12); assert.deepEqual(d2.signatures, { minotaur: 2 });
  assert.equal(normalizeData({ ...old, sinceLegendary: 'lots' }).sinceLegendary, 0);
  // a fresh profile has them too
  const f = freshData('New'); assert.equal(f.sinceLegendary, 0); assert.deepEqual(f.signatures, {}); assert.equal(f.newCount, 0);
  // the old shop stock (with a Legendary) is restocked: the shop never sells one now
  assert.match(read('ui/screens.js'), /itemTier\(it\) === 'unique'\)\) d\.shop = null/);
});
function read(f) { return readFileSync(new URL('../js/' + f, import.meta.url), 'utf8'); }

test('icon sheets: each item is found where it really lies, over a cell line, without a neighbour’s spark', async () => {
  const { segmentData, cellsOf, pieceData, keyMagentaData, keyWhiteGlowData } = await import('../js/ui/icons.js');
  // a 2 × 2 sheet of 64-pixel cells on magenta: cell 0 a bar that reaches 10 px into cell 1,
  // cell 1 a block, cell 3 a body with a spark over the line in cell 1, cell 2 empty but for dust and a stray spark
  const W = 128, H = 128, d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) d.set([252, 2, 250, 255], i * 4);
  const fill = (x0, y0, x1, y1, rgb) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d.set([...rgb, 255], (y * W + x) * 4); };
  fill(8, 20, 74, 34, [200, 150, 60]);      // cell 0's bar, over the line into cell 1
  fill(90, 8, 120, 50, [40, 120, 200]);      // cell 1's block
  fill(84, 70, 120, 120, [220, 60, 40]);     // cell 3's body
  fill(78, 58, 82, 62, [255, 220, 80]);      // cell 3's spark: its centre is in cell 1, but by cell 3's body
  fill(40, 70, 44, 74, [255, 220, 80]);      // a stray spark in cell 2, far from every body
  fill(30, 100, 32, 102, [255, 255, 255]);   // dust in cell 2, nothing near
  keyMagentaData(d);
  assert.equal(d[3], 0, 'magenta keyed out'); assert.equal(d[(25 * W + 20) * 4 + 3], 255, 'the bar stays');
  const seg = segmentData(d, W, H, { minBlocks: 1 });
  const cells = cellsOf(seg, W, H, 2, 2);
  assert.ok(cells[0] && cells[0].x1 >= 74 && cells[0].x0 <= 8, 'the bar is whole, over the cell line');
  assert.ok(cells[1] && cells[1].x0 >= 88, 'the block keeps out the bar reaching in');
  assert.equal(cells[2], null, 'dust and a stray spark make no picture');
  assert.ok(cells[3] && cells[3].x0 <= 78 && cells[3].y0 <= 58, 'the spark joins the body it belongs to');
  assert.ok(cells[1].y1 <= 52, 'and not the block of the cell it lies in');
  // the cut is masked: cell 1's box holds none of the bar
  const p = pieceData(d, W, seg, cells[1]);
  let bar = 0; for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const o = (y * p.w + x) * 4; if (p.data[o + 3] && p.data[o] === 200) bar++; }
  assert.equal(bar, 0);
  // a white glow over magenta: its strength is the alpha
  const g = new Uint8ClampedArray([252, 2, 250, 255, 255, 255, 255, 255, 253, 128, 253, 255]);
  keyWhiteGlowData(g);
  assert.deepEqual([g[3], g[7], g[11] > 100 && g[11] < 160], [0, 255, true]);
});

test('the loot kit: its regions lie on the sheet, apart, and a frame for every rarity', async () => {
  const { KIT_REGIONS, KIT_W, KIT_H, FRAME_FOR } = await import('../js/ui/lootkit.js');
  const R = Object.entries(KIT_REGIONS);
  for (const [n, { r }] of R) assert.ok(r[0] >= 0 && r[1] >= 0 && r[2] <= KIT_W && r[3] <= KIT_H && r[2] > r[0] && r[3] > r[1], n);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, b] = [R[i][1].r, R[j][1].r];
    assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], `${R[i][0]} and ${R[j][0]} overlap`);
  }
  for (const t of ['common', 'rare', 'heroic', 'unique', 'blessed']) assert.ok(KIT_REGIONS[FRAME_FOR[t]], t);
});
