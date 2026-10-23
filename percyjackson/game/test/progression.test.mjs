// Progression and gear: the XP curve paces the whole game, chapters take
// the level of their place, drops follow the area's monster level and the
// player's level, gear keeps pace with the monsters' health without silly
// numbers, the enchantments' effects do what their text says, magic items
// with charges recharge one at a time, the stash sorts new and strong
// first, and every skill tree grows to the end without dead levels.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as P from '../js/progression.js';
import { ITEMS, ENCHANTS, PROC, rollItem, rollChest, gearStats, itemStrength, sortItems, isUpgrade, slotFor, normalizeItem, mulberry32 } from '../js/loot.js';
import { hitEffects, tickArtifact, spendArtifact, artifactReady } from '../js/gearEffects.js';
import { TREES, TIER_LEVEL, treeCost, canRank, rankUp, rankOf, nodeOf, sanitizeSkills, applyNodeStats, pointsLeft } from '../js/heroes/skillRules.js';
import { t } from '../js/text_config.js';

const read = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const HP_STEP = 0.35;                                 // entities/enemy.js: +35% health a monster level
const monsterHp = (L) => 1 + HP_STEP * (L - 1);

// ---------------------------------------------------------------- XP and levels
test('the XP curve: quick first levels, then steadily dearer, never falling', () => {
  assert.ok(P.xpFor(1) <= 300, 'the first level comes quickly');
  for (let l = 1; l < 60; l++) assert.ok(P.xpFor(l + 1) >= P.xpFor(l), `level ${l}`);
  assert.ok(P.xpFor(30) > 6 * P.xpFor(1));
  assert.equal(P.xpToReach(1), 0);
  assert.equal(P.xpToReach(3), P.xpFor(1) + P.xpFor(2));
});

test('XP follows a monster’s level as its health does; elites, champions, chapters, bosses and shrines pay more', () => {
  assert.equal(P.killXp(4, 1), 4);
  for (let L = 2; L <= 12; L++) assert.ok(Math.abs(P.killXp(100, L) / 100 - monsterHp(L)) < 0.01, `level ${L}`);
  assert.equal(P.killXp(10, 1, { elite: true }), 20);
  assert.equal(P.killXp(10, 1, { elite: true, champion: true }), 80);
  assert.ok(P.chapterXp(12, 1) > 4 * P.chapterXp(1, 1));
  assert.ok(P.chapterXp(5, 3) > P.chapterXp(5, 1));
  assert.ok(P.bossXp(12) > P.bossXp(1) && P.shrineXp(10) > P.shrineXp(3));
});

test('a play-through in level order keeps about 2.6 player levels per monster level', () => {
  // the content of each place, roughly as the regions build it (camps, a
  // champion, a shrine, quests and roaming kills) and the chapters there
  const places = [['camp', 1, 2, ['lt1', 'lt2'], 100], ['fields', 1, 3, ['lt3'], 1520], ['woods', 2, 4, [], 1720], ['shore', 3, 5, [], 2090], ['turnpike', 3, 4, ['lt4'], 820],
    ['auntyem', 4, 5, ['lt5'], 940], ['canyon', 5, 7, [], 3220], ['stlouis', 5, 6, ['lt6'], 1040], ['labyrinth', 6, 8, [], 3460], ['denver', 6, 7, ['lt7'], 1200], ['vegas', 7, 8, ['lt8'], 2600],
    ['othrys', 8, 10, [], 5710], ['la', 9, 10, ['lt9', 'lt10'], 3550], ['asphodel', 9, 12, [], 6500], ['santamonica', 11, 12, ['lt11', 'lt12'], 5050]];
  let level = 1, xp = 0;
  const add = (n) => { xp += n; while (xp >= P.xpFor(level)) { xp -= P.xpFor(level); level++; } };
  const at = {};
  for (const [id, a, b, chs, quests] of places) {
    for (const ch of chs) { const L = P.missionLevel(ch, 1); add(45 * P.killXp(3.5, L) + 6 * P.killXp(12, L) + P.bossXp(L) + P.chapterXp(L, 1)); }
    if (id !== 'camp') {
      const mid = (a + b) / 2, road = ['turnpike', 'auntyem', 'stlouis', 'denver', 'vegas', 'la', 'santamonica'].includes(id);
      add((road ? 80 : 110) * P.killXp(3, mid) + (road ? 2 : 4) * (5 * P.killXp(4.5, mid) + 7.5 * P.killXp(2.5, mid)) + P.killXp(11, b + 1, { elite: true, champion: true }));
      if (!road) add(P.shrineXp(b) + 12 * P.killXp(4, b));
    }
    add(quests);
    at[id] = level;
  }
  assert.ok(at.camp >= 2 && at.camp <= 5, `leaving camp at level ${at.camp}`);
  assert.ok(at.shore >= 8 && at.shore <= 13, `after the North Shore (3-5): ${at.shore}`);
  assert.ok(at.labyrinth >= 15 && at.labyrinth <= 22, `after the Labyrinth (6-8): ${at.labyrinth}`);
  assert.ok(at.santamonica >= 28 && at.santamonica <= 38, `the end: ${at.santamonica}`);
  // the trees fill about when the content ends: no long stretch of unspendable points
  for (const hero of Object.keys(TREES)) assert.ok(treeCost(hero) >= at.santamonica - 3 && treeCost(hero) <= at.santamonica + 6, `${hero}'s tree (${treeCost(hero)}) fills near the end (level ${at.santamonica})`);
  // and the curve's own idea of where a player of that level stands
  assert.ok(Math.abs(P.expectedArea(at.santamonica) - 12) <= 1.5);
});

test('chapters take the level of their place, plus one a difficulty step', () => {
  assert.equal(P.missionLevel('lt1', 1), 1, 'chapter 1 at Mortal is as it was');
  assert.equal(P.missionLevel('lt1', 4), 4, 'and at Olympian too');
  assert.equal(P.missionLevel('lt12', 1), 12);
  assert.equal(P.missionLevel('lt6', 3), 7);
  assert.equal(P.missionLevel(undefined, 2), 2, 'a mission without a chapter keeps its difficulty');
  let last = 0; for (let i = 1; i <= 12; i++) { const L = P.missionLevel('lt' + i, 1); assert.ok(L >= last, `lt${i}`); last = L; }
  assert.match(read('story/missionDef.js'), /level: missionLevel\(ch\.id, difficulty\)/);
  assert.match(read('mission.js'), /level: this\.def\.level \?\? this\.def\.difficulty/);
});

// ---------------------------------------------------------------- drop power
test('drops get stronger with the area’s monster level, and follow the player’s level a little', () => {
  const rng = mulberry32(7);
  const med = (area, level, src = 'chest') => median(Array.from({ length: 101 }, () => P.itemPowerFor(area, level, src, rng)));
  let prev = 0;
  for (let A = 1; A <= 12; A++) {
    const pl = Math.round(1 + (A - 1) * P.LEVEL_PER_AREA);   // a player on the curve
    const m = med(A, pl);
    assert.ok(m > prev, `area ${A}: ${m} > ${prev}`);
    assert.ok(Math.abs(m - P.powerAt(A)) <= P.POWER_STEP * 0.6, `area ${A}: about gear level ${A} (${m} vs ${P.powerAt(A)})`);
    prev = m;
  }
  // a player far ahead gets at most one gear level more; far behind, half a level less
  assert.ok(med(3, 40) <= P.powerAt(4) + 4 && med(3, 40) > med(3, 6));
  assert.ok(med(10, 1) >= P.powerAt(9.5) - 4 && med(10, 1) < med(10, 24));
  // better sources: champion's epic chest > rare chest > common chest > shop
  assert.ok(med(6, 14, 'epic') > med(6, 14, 'rare') && med(6, 14, 'rare') > med(6, 14, 'chest') && med(6, 14, 'chest') > med(6, 14, 'shop'));
});

test('chests and bosses: per player, harder places give rarer gear', () => {
  const rng = mulberry32(3);
  assert.equal(rollChest(1, 'common', { rng }).length, 1);
  assert.equal(rollChest(9, 'boss', { rng, level: 24 }).length, 2);
  const share = (A) => { let r = 0; for (let i = 0; i < 400; i++) { const it = rollItem(P.powerAt(A), { rng }); if (ITEMS.find((b) => b.id === it.id).rarity !== 'common') r++; } return r / 400; };
  assert.ok(share(12) > share(1) + 0.1, 'more rare and legendary items in the Fields of Asphodel than the Strawberry Fields');
  const boss = rollChest(10, 'boss', { rng, level: 27 }), chest = rollChest(10, 'common', { rng, level: 27 });
  assert.ok(boss[0].power >= chest[0].power - 4, 'a boss’s first item is at least as strong as a chest’s');
  assert.ok(['rare', 'unique'].includes(ITEMS.find((b) => b.id === boss[0].id).rarity));
});

// ---------------------------------------------------------------- the gear curve
test('the gear curve keeps pace with the monsters’ health, and damage numbers stay sane', () => {
  const rows = [];
  for (let A = 1; A <= 12; A++) {
    const pw = P.powerAt(A);
    const w = rollItem(pw, { id: 'xiphos', rng: mulberry32(A), blessed: false }); w.power = pw;
    const a = rollItem(pw, { id: 'spartan_cloak', rng: mulberry32(A), blessed: false }); a.power = pw;
    w.boons = []; a.boons = [];   // (the curve itself: no rolled boons)
    const s = gearStats([w, a, null, null]).s;
    rows.push({ A, melee: s.meleeMult / 1.2, hp: s.maxHp, tech: s.techMult });
  }
  for (const r of rows) {
    const k = r.melee / monsterHp(r.A);
    assert.ok(k > 0.7 && k < 1.3, `area ${r.A}: weapon ×${r.melee.toFixed(2)} vs monster health ×${monsterHp(r.A).toFixed(2)}`);
    assert.ok(r.tech > 0.7 * monsterHp(r.A) / 1.15, `area ${r.A}: abilities keep pace (×${r.tech.toFixed(2)})`);
  }
  assert.ok(rows[11].hp > 2.2 * rows[0].hp, 'health grows with the armour');
  // the biggest hit a fully kitted level-12 hero can stack stays in the low thousands
  const it = rollItem(P.powerAt(13.5), { id: 'imperial_gladius', rng: mulberry32(1), blessed: true });
  for (const e of it.ench) if (!e.fixed) { e.pick = e.options[0]; e.level = 3; }
  const s = gearStats([it, null, null, null], 'percy').s;
  const finisher = 25 * s.meleeMult * 1.24 /* riptide */ * (1 + 0.45) /* committed */ * (1 + 0.6) /* bane */ * (2 + 0.5) /* crit */ * 1.25 /* war cry */ * 1.5 /* mark */;
  assert.ok(finisher < 4000, `the biggest stacked hit: ${Math.round(finisher)}`);
  assert.ok(25 * s.meleeMult < 300, `a plain finisher: ${Math.round(25 * s.meleeMult)}`);
});

test('gear stats: bonuses multiply, health enchantments scale, caps hold, Power is the average', () => {
  const w = rollItem(60, { id: 'fang_dagger', rng: mulberry32(2), blessed: false });
  const a = rollItem(60, { id: 'hoplite_panoply', rng: mulberry32(2), blessed: false });
  const s = gearStats([w, a, null, null]).s;
  assert.equal(s.lifesteal, PROC.lifesteal(1), 'Vampire’s Kiss I');
  assert.equal(s.heroPower, Math.round((w.power + a.power) / 2));
  const row = a.ench.find((e) => !e.fixed); row.options = ['health']; row.pick = 'health'; row.level = 3;
  const s2 = gearStats([w, a]).s;
  assert.ok(s2.maxHp - s.maxHp > 45 * 1.5, 'Ambrosia-Fed grows with the armour’s power');
  const sharp = rollItem(60, { id: 'labrys', rng: mulberry32(4), blessed: false }); const r = sharp.ench.find((e) => !e.fixed); r.options = ['sharpness']; r.pick = 'sharpness'; r.level = 3;
  const plain = rollItem(60, { id: 'labrys', rng: mulberry32(4), blessed: false }); plain.power = sharp.power;
  assert.ok(Math.abs(gearStats([sharp]).s.meleeMult / gearStats([plain]).s.meleeMult - 1.3) < 1e-6, 'Celestial Edge III: ×1.3, at any power');
  const stack = Array.from({ length: 4 }, (_, i) => { const x = rollItem(100, { id: 'achilles_armor', rng: mulberry32(i), blessed: false }); for (const e of x.ench) if (!e.fixed) { e.options = ['protection']; e.pick = 'protection'; e.level = 3; } return x; });
  assert.ok(gearStats(stack).s.armor <= 0.7);
});

// ---------------------------------------------------------------- effects
function fakeWorld(n = 4) {
  const mk = (i) => ({ id: i, pos: { x: i, y: 0, z: 0 }, dead: false, hp: 100, maxHp: 100, state: 'windup', cancelAttack() { this.cancelled = true; } });
  const enemies = Array.from({ length: n }, (_, i) => mk(i));
  const hits = [];
  const api = { time: 10, near: (e, r, max) => enemies.filter((q) => q !== e && !q.dead && Math.abs(q.pos.x - e.pos.x) < r).sort((a, b) => Math.abs(a.pos.x - e.pos.x) - Math.abs(b.pos.x - e.pos.x)).slice(0, max), damage: (t2, amount, o) => hits.push({ t: t2, amount, o }) };
  const hero = (procs, stats = {}) => ({ isPlayer: true, procs, stats: { lifesteal: 0, ...stats }, healed: 0, heal(n) { this.healed += n; } });
  return { enemies, hits, api, hero };
}
test('Vampire’s Kiss heals a share of each melee hit; procs never set off more procs', () => {
  const W = fakeWorld(), src = W.hero({}, { lifesteal: PROC.lifesteal(2) });
  hitEffects(src, W.enemies[0], 20, 50, { melee: true }, W.api);
  assert.equal(src.healed, 50 * PROC.lifesteal(2));
  hitEffects(src, W.enemies[0], 20, 50, { melee: false }, W.api);
  assert.equal(src.healed, 50 * PROC.lifesteal(2), 'abilities and burns don’t heal');
  const s2 = W.hero({ chain: 3, shock: 3, burn: 3 });
  assert.deepEqual(hitEffects(s2, W.enemies[0], 20, 50, { melee: true, proc: true }, W.api, () => 0), [], 'a proc hit triggers nothing more');
});
test('Forge Flame sets a monster burning for its share of the hit; a stronger burn wins', () => {
  const W = fakeWorld(), src = W.hero({ burn: 2 }), e = W.enemies[0];
  hitEffects(src, e, 20, 40, { melee: true }, W.api);
  assert.equal(e.pjBurn.dps, 20 * PROC.burn(2));
  assert.equal(e.pjBurn.until, W.api.time + PROC.burnFor);
  hitEffects(W.hero({ burn: 1 }), e, 20, 40, { melee: true }, W.api);
  assert.equal(e.pjBurn.dps, 20 * PROC.burn(2), 'a weaker burn doesn’t replace it');
});
test('Boreas’s Chill slows every hit and sometimes freezes solid (never a boss)', () => {
  const W = fakeWorld(), src = W.hero({ freeze: 3 }), e = W.enemies[0];
  hitEffects(src, e, 20, 40, { melee: true }, W.api, () => 0.99);
  assert.ok(e.slowT >= 2.2 && !e.sealT, 'slowed, not frozen');
  const out = hitEffects(src, e, 20, 40, { melee: true }, W.api, () => 0);
  assert.deepEqual(out.map((x) => x[0]), ['freeze']);
  assert.equal(e.sealT, PROC.freezeFor); assert.ok(e.cancelled && e.state === 'idle');
  const boss = { ...W.enemies[1], isBoss: true, sealT: 0 };
  hitEffects(src, boss, 20, 40, { melee: true }, W.api, () => 0);
  assert.equal(boss.sealT, 0);
  assert.ok(Math.abs(PROC.freeze(3) - 0.15) < 1e-9);
});
test('Chain Lightning leaps to level + 1 nearby monsters; Poseidon’s Shove pushes the ones round the hit away', () => {
  const W = fakeWorld(6), e = W.enemies[0];
  const out = hitEffects(W.hero({ chain: 2 }), e, 20, 40, { melee: true }, W.api, () => 0);
  assert.equal(out[0][0], 'chain'); assert.equal(W.hits.length, 3);
  for (const h of W.hits) { assert.equal(h.amount, 20 * PROC.chainDmg); assert.ok(h.o.proc && h.t !== e); }
  assert.equal(hitEffects(W.hero({ chain: 2 }), e, 20, 40, { melee: true }, W.api, () => 0.99).length, 0, 'it only sometimes leaps');
  W.hits.length = 0;
  hitEffects(W.hero({ shock: 1 }), e, 20, 40, { melee: true }, W.api, () => 0);
  assert.ok(W.hits.length >= 1 && W.hits.every((h) => h.o.knockFrom === e.pos && h.o.knockSpeed === PROC.shockKnock && h.amount === 20 * PROC.shockDmg));
});
test('every enchantment has an icon, a name, plain words and numbers, and every effect is handled in the game', () => {
  const code = read('combat.js') + read('gearEffects.js') + read('entities/player.js') + read('main.js');
  for (const [id, E] of Object.entries(ENCHANTS)) {
    assert.ok(E.icon && E.name && !E.name.startsWith('enchantments.'), id);
    const plain = t(`enchantments.${id}.plain`); assert.ok(plain && !plain.startsWith('enchantments.') && plain.length < 70, `${id}: short plain words`);
    for (let l = 1; l <= 3; l++) assert.doesNotMatch(E.desc(l), /\{|undefined|NaN/, `${id} ${l}`);
    if (E.proc) assert.match(code, new RegExp(`procs(\\?)?\\.${E.proc}\\b|P\\.${E.proc}\\b`), `${id}: proc ${E.proc} is used`);
  }
  assert.ok(Object.keys(ENCHANTS).length >= 30);
});
test('items: every tier has weapons, armour and magic items, the new ones carry their effect, some magic items have charges', () => {
  for (const r of ['common', 'rare', 'unique']) for (const k of ['weapon', 'armor', 'artifact']) assert.ok(ITEMS.filter((i) => i.kind === k && i.rarity === r).length >= 3, `${r} ${k}`);
  for (const [id, f] of [['fang_dagger', 'lifesteal'], ['forge_sword', 'fire_aspect'], ['boreas_axe', 'freezing'], ['storm_spear', 'chain_lightning'], ['ram_mace', 'shockwave'], ['hebe_robe', 'potion_barrier'], ['wind_cloak', 'speed_synergy']]) {
    assert.ok(ITEMS.find((i) => i.id === id).fixed.includes(f), id);
  }
  assert.ok(ITEMS.filter((i) => (i.charges ?? 1) > 1).length >= 4);
});

// ---------------------------------------------------------------- magic item charges
test('a magic item with charges: spend them, then one comes back every cooldown', () => {
  const art = { cd: 10, cdLeft: 0, charges: 3, maxCharges: 3, gate: 0 };
  assert.ok(spendArtifact(art)); assert.equal(art.charges, 2); assert.equal(art.cdLeft, 10);
  assert.equal(spendArtifact(art), false, 'a short gate between uses');
  tickArtifact(art, 0.4); assert.ok(spendArtifact(art)); tickArtifact(art, 0.4); assert.ok(spendArtifact(art));
  assert.equal(art.charges, 0); assert.equal(artifactReady(art), false);
  tickArtifact(art, 5); assert.equal(art.charges, 0);
  tickArtifact(art, 4.3); assert.equal(art.charges, 1, 'one back after the cooldown'); assert.ok(art.cdLeft > 9);
  for (let i = 0; i < 40; i++) tickArtifact(art, 0.5);
  assert.equal(art.charges, 3); assert.equal(art.cdLeft, 0);
  const one = { cd: 8, cdLeft: 0, charges: 1, maxCharges: 1, gate: 0 };
  assert.ok(spendArtifact(one)); tickArtifact(one, 7.9); assert.equal(artifactReady(one), false); tickArtifact(one, 0.2); assert.ok(artifactReady(one), 'one charge: a plain cooldown');
});

// ---------------------------------------------------------------- the stash
test('the stash sorts new finds first (newest on top), then the strongest, then the most recent', () => {
  const mk = (id, power, o = {}) => ({ ...rollItem(power, { id, blessed: false, rng: mulberry32(power) }), power, isNew: !!o.isNew, got: o.got });
  const a = mk('xiphos', 30, { got: 1 }), b = mk('club', 50, { got: 2 }), c = mk('labrys', 20, { isNew: true, got: 5 }), d = mk('kopis', 25, { isNew: true, got: 9 }), e = mk('bronze_axe', 50, { got: 7 }), f = mk('backbiter', 50, { got: 3 });
  const out = sortItems([a, b, c, d, e, f]);
  assert.deepEqual(out.map((x) => x.id), ['kopis', 'labrys', 'backbiter', 'bronze_axe', 'club', 'xiphos']);
  // items saved before `got` keep their stash order as the tie-break (later = more recent)
  const old = [mk('bronze_axe', 10), mk('club', 10)];
  assert.deepEqual(sortItems(old).map((x) => x.id), ['club', 'bronze_axe']);
});
test('upgrade arrows and slots: a stronger item is better than what it would replace', () => {
  const weak = rollItem(10, { id: 'training_sword', blessed: false }), strong = rollItem(60, { id: 'xiphos', blessed: false });
  const gear = [weak, null, null, null];
  assert.ok(isUpgrade(strong, gear)); assert.equal(isUpgrade(weak, [strong, null, null, null]), false);
  assert.equal(isUpgrade(weak, gear), false, 'what you wear is never an upgrade');
  const art = rollItem(20, { id: 'aegis', blessed: false });
  assert.equal(slotFor(art, [weak, null, null, null]), 2);
  assert.equal(slotFor(art, [weak, null, art, null]), 3);
  assert.ok(isUpgrade(art, gear), 'an empty slot: anything fills it');
});
test('old items load: unknown enchantments are dropped, power is kept', () => {
  const it = normalizeItem({ uid: 'u1', id: 'xiphos', power: 33, ench: [{ options: ['gone', 'sharpness'], pick: 'gone', level: 2 }], blessed: { id: 'nope', level: 3 } });
  assert.equal(it.power, 33); assert.deepEqual(it.ench[0].options, ['sharpness']); assert.equal(it.ench[0].pick, null); assert.equal(it.blessed, undefined);
  assert.ok(itemStrength(it) > 1);
});

// ---------------------------------------------------------------- skill trees
test('every branch ends in a tier-3 node that opens at level 12 and needs the branch’s power', () => {
  for (const [hero, T] of Object.entries(TREES)) for (const b of T.branches) {
    const top = T.nodes.filter((n) => n.branch === b.id && n.tier === 3);
    assert.ok(top.length >= 1, `${hero} ${b.id}`);
    for (const n of top) if (n.stat) assert.ok(nodeOf(hero, n.req)?.kind === 'power', `${n.id} needs a power`);
  }
  const h = { skills: { riptide: 3, throw_up: 2, disarm: 1 } };
  assert.equal(canRank('percy', h, 11, 'sword_master').ok, false);
  assert.match(canRank('percy', h, 11, 'sword_master').why, /level 12/);
  assert.ok(canRank('percy', h, 12, 'sword_master').ok);
  // an old save with a tier-3 rank below level 12 gets the points back
  assert.deepEqual(sanitizeSkills('grover', { pipes: 3, song: 2, panic: 1 }, 8), { pipes: 3, song: 2 });
});
test('a hero who spends every point as it comes always has something to buy, until the tree is full', () => {
  for (const hero of Object.keys(TREES)) {
    const h = { skills: {} }; let full = null;
    for (let level = 1; level <= 45; level++) {
      // buy what's open, cheapest tier first (as a player would)
      let bought = true;
      while (bought) { bought = false; for (const n of [...TREES[hero].nodes].sort((a, b) => a.tier - b.tier)) if (rankUp(hero, h, level, n.id)) { bought = true; break; } }
      const spentAll = TREES[hero].nodes.every((n) => rankOf(h.skills, n.id) >= n.max);
      if (spentAll && !full) full = level;
      if (!spentAll && level >= 4) assert.ok(pointsLeft(hero, h, level) <= 2, `${hero} level ${level}: points pile up with nothing to buy (${pointsLeft(hero, h, level)})`);
    }
    assert.ok(full >= 30 && full <= 40, `${hero}'s tree fills at level ${full}`);
  }
});
test('capstones add their stats, and damage passives multiply', () => {
  const s = { crit: 0.08, critDmg: 0, techMult: 2, cdr: 0, meleeMult: 3, knock: 1, ceGain: 1, speed: 1, regen: 0, attackSpeed: 1, armor: 0.1 };
  applyNodeStats('percy', { sword_master: 2, tide_lord: 1 }, s);
  assert.ok(Math.abs(s.crit - 0.18) < 1e-9 && s.critDmg === 0.5);
  assert.ok(Math.abs(s.techMult - 2.2) < 1e-9 && Math.abs(s.cdr - 0.05) < 1e-9);
  assert.match(read('heroes/percy.js'), /meleeMult \*= 1 \+ r\('riptide'\)/);
  assert.match(read('heroes/kit.js'), /applyNodeStats\(player\.hero, player\.skills, st\)/);
  assert.ok(TIER_LEVEL[2] === 12);
});

// ---------------------------------------------------------------- the loot rework (design/loot-design.md §4)
import { rollBossLoot, itemTier, itemInfo } from '../js/loot.js';
test('drop chances, chest counts and the boss’s share: about 12-13 items a chapter per player', () => {
  assert.deepEqual(P.DROP_CHANCE, { minor: 0.02, fodder: 0.004, elite: 0.08, affixed: 0.25, champion: 0.6, owChampion: 1 });
  assert.equal(P.PITY_AT, 40); assert.deepEqual(P.PITY_SOURCES, ['rare', 'elite', 'champion', 'boss', 'epic']);
  assert.equal(P.SOURCE_BONUS.elite, 0.4);
  // §4.3's estimate: 120 minor kills, 8 elite-tier, 3 affixed elites, 4.5 chests (1 rare), the boss and the chapter reward
  const chests = 3.5 * (P.CHEST_ITEMS.common[0] + P.CHEST_ITEMS.common[1]) + (P.CHEST_ITEMS.rare[0] + P.CHEST_ITEMS.rare[1]);
  const boss = P.BOSS_ITEMS.guaranteed + P.BOSS_ITEMS.extra * P.BOSS_ITEMS.chance;
  const total = 120 * P.DROP_CHANCE.minor + 8 * P.DROP_CHANCE.elite + 3 * P.DROP_CHANCE.affixed + chests + boss + 1;
  assert.ok(total >= 11.5 && total <= 13.5, `about 12-13 items a chapter (${total.toFixed(1)})`);
  assert.equal(boss, 2.5);
  // the boss's own rolls: n items, never a Common
  const rng = mulberry32(9);
  for (let i = 0; i < 200; i++) { const r = rollBossLoot('ares', 11, { rng, level: 28 }); assert.ok(r.items.length >= 1 && r.items.length <= 4); assert.ok(r.items.every((x) => itemTier(x) !== 'common')); }
  // the game uses them: per human player near the kill, by tier, with Hermes's Haul
  const main = read('main.js');
  assert.match(main, /DROP_CHANCE\.minor/); assert.match(main, /lootHumans\(e\.pos\)/); assert.match(main, /q\.stats\?\.lootChance/);
  assert.match(main, /rollBossLoot\(key, area/); assert.match(main, /rollChapterReward\(cid/);
});
test('the level ramp: MCD2’s factors with the 0.15 floor', () => {
  const f = P.levelFactors;
  assert.deepEqual(f(1), { common: 1, rare: 0.6, heroic: 0, unique: 0 });
  assert.equal(f(6).common, 0.5); assert.equal(f(5).rare, 1); assert.equal(f(15).rare, 0.5);
  assert.equal(f(11).heroic, 1); assert.equal(f(13).unique, 1); assert.equal(f(40).unique, 1);
  for (let L = 2; L <= 50; L++) assert.ok(f(L).heroic >= 0.15 && f(L).unique >= 0.15, `level ${L}`);
  const leg = (L) => P.rarityWeights('boss', L).unique;
  assert.ok(leg(13) > leg(10) && leg(10) > leg(6) && leg(6) > leg(4) && leg(4) > leg(1), 'Legendaries get commoner as you level');
});
test('Reforge to level and the outdated mark follow what drops now', () => {
  for (const L of [1, 6, 14, 22, 30]) {
    assert.equal(P.reforgePower(L), Math.round(P.powerAt(P.gearLevel(P.expectedArea(L), L))));
    assert.ok(P.reforgePower(L) <= P.temperCap(L), 'reforging never passes the tempering cap');
  }
  assert.deepEqual(P.RARITY_COST, { common: 1, rare: 1.1, heroic: 1.2, unique: 1.3 });
  assert.equal(P.OUTDATED_BY, P.POWER_STEP);
});
// The balance check of the rework (design §4.1: the hidden rarity strength
// fell from ×1.12 / 1.25 to ×1.02-1.08; powerMult went from 2% to 2.1% a
// point to make up for it). The mean weapon damage of a drop, against the
// old rules worked out here, stays within 7% at every gear level.
test('balance: a drop’s average weapon damage stays near what it was before the loot rework', () => {
  const weapons = ITEMS.filter((i) => i.kind === 'weapon' && !i.sig && i.id !== 'hunter_knives');   // (the 27 weapons of before)
  const avg = (r) => { const l = weapons.filter((i) => i.rarity === r); return l.reduce((a, i) => a + (i.dmg ?? 1) * (i.speed ?? 1), 0) / l.length; };
  const OLD_MULT = { common: 1, rare: 1.12, unique: 1.25 };
  const rng = mulberry32(2026);
  for (const A of [1, 3, 6, 9, 12]) {
    const L = Math.round(1 + (A - 1) * P.LEVEL_PER_AREA), pw = P.powerAt(A);
    const u = Math.min(0.2, 0.03 + 0.012 * A), r = Math.min(0.5, 0.2 + 0.025 * A);   // the old rarityOdds(gl)
    const old = (1 + 0.02 * (pw - 10)) * ((1 - u - r) * avg('common') * OLD_MULT.common + r * avg('rare') * OLD_MULT.rare + u * avg('unique') * OLD_MULT.unique);
    let sum = 0, n = 0;
    for (let i = 0; i < 6000; i++) { const it = rollItem(pw, { rng, kind: 'weapon', level: L, source: 'chest' }); it.power = pw; const b = itemInfo(it); sum += gearStats([{ ...it, boons: [] }]).s.meleeMult / (1 + 0) * (b.speed ?? 1); n++; }
    const now = sum / n;
    assert.ok(Math.abs(now / old - 1) < 0.07, `gear level ${A} (player level ${L}): ×${(now / old).toFixed(3)} of before`);
  }
  assert.equal(P.POWER_PCT, 0.021);
});
