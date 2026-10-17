// Skill trees (js/heroes/skillRules.js): every hero's tree is well formed and
// bigger than the points a player has, ranks follow costs, requirements and
// tier gates, the loadout is always three known powers, a respec gives every
// point back, and saves from the first tree migrate with nothing lost.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TREES, TREE_VERSION, POWER_COST, GATES, SLOTS, treeOf, nodeOf, spentPoints, treeCost, pointsFor, pointsLeft,
  knownPowers, defaultLoadout, validLoadout, canRank, rankUp, equip, respec, sanitizeSkills, migrateHero, mergeHero,
} from '../js/heroes/skillRules.js';
import { Save, freshData, normalizeData } from '../js/save.js';

const HEROES = ['percy', 'annabeth', 'grover', 'tyson', 'clarisse'];
const fresh = (hero) => ({ skills: {}, equip: defaultLoadout(hero), tree: TREE_VERSION, skillPoints: 0 });

// the version-1 trees' ids, per hero (what old saves hold)
const OLD_IDS = {
  percy: ['riptide', 'sea', 'jet', 'jet_charges', 'surge', 'tide', 'throw', 'hurricane'],
  annabeth: ['blade', 'owl', 'backstab', 'knives', 'cap', 'plan', 'trap', 'gambit'],
  grover: ['hooves', 'pipes', 'vines', 'song', 'empathy', 'maia', 'panic'],
  tyson: ['fists', 'mighty', 'mighty_ce', 'vitality', 'boulder', 'pound', 'shield', 'brother'],
  clarisse: ['spear', 'volt', 'charge', 'cry', 'bash', 'tough', 'fury'],
};

test('every hero has three branches, three starters and six powers, and a tree well beyond a book of levels', () => {
  for (const hero of HEROES) {
    const t = treeOf(hero);
    assert.equal(t.branches.length, 3, hero);
    assert.equal(t.starters.length, SLOTS.length, hero);
    const ids = t.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, `${hero}: node ids are unique`);
    const powers = t.nodes.filter((n) => n.kind === 'power');
    assert.equal(t.starters.length + powers.length, 6, `${hero}: six powers for three slots`);
    for (const n of t.nodes) {
      assert.ok(t.branches.some((b) => b.id === n.branch), `${hero}.${n.id}: a real branch`);
      assert.ok(n.tier >= 1 && n.tier <= GATES.length, `${hero}.${n.id}: tier`);
      assert.ok(n.max >= 1 && n.cost.length === n.max, `${hero}.${n.id}: a cost per rank`);
      if (n.req) assert.ok(nodeOf(hero, n.req), `${hero}.${n.id}: requirement exists`);
      for (let r = 1; r <= n.max; r++) assert.equal(typeof n.at(r), 'string', `${hero}.${n.id}: says what rank ${r} does`);
      if (n.kind === 'power') assert.equal(n.cost[0], POWER_COST);
      // a gate that can be met: enough points below it in the branch
      const below = t.nodes.filter((m) => m.branch === n.branch && m.tier < n.tier).reduce((s, m) => s + m.cost.reduce((a, c) => a + c, 0), 0);
      assert.ok(below >= GATES[n.tier - 1], `${hero}.${n.id}: gate reachable`);
    }
    // power ids never clash with the starters'
    for (const p of powers) assert.ok(!t.starters.some((s) => s.id === p.id), `${hero}.${p.id}`);
    // scarce points: at level 15 (about the end of Book 1) a hero has under
    // half the tree; even level 25 can't buy it all
    assert.ok(treeCost(hero) > 2 * pointsFor(14), `${hero}: tree costs ${treeCost(hero)}`);
    assert.ok(treeCost(hero) > pointsFor(25), hero);
  }
});

test('one point a level; ranks cost points; requirements and tier gates hold', () => {
  assert.equal(pointsFor(1), 1); assert.equal(pointsFor(9), 9);
  const h = fresh('percy');
  // Fire Hose needs Pressure Jet
  assert.match(canRank('percy', h, 5, 'jet_charges').why, /Pressure Jet/);
  // Geyser (tier 2) needs 2 points in Tides' tier-1 nodes first
  assert.equal(canRank('percy', h, 9, 'geyser').gated, true);
  assert.ok(rankUp('percy', h, 9, 'jet'));
  assert.equal(canRank('percy', h, 9, 'geyser').gated, true, 'one point is not enough');
  // points elsewhere don't open it
  assert.ok(rankUp('percy', h, 9, 'riptide'));
  assert.equal(canRank('percy', h, 9, 'geyser').gated, true);
  assert.ok(rankUp('percy', h, 9, 'jet_charges'));
  const c = canRank('percy', h, 9, 'geyser');
  assert.ok(c.ok, c.why); assert.equal(c.cost, POWER_COST);
  assert.ok(rankUp('percy', h, 9, 'geyser'));
  assert.equal(spentPoints('percy', h.skills), 5);
  assert.equal(h.skillPoints, 4);
  assert.equal(canRank('percy', h, 9, 'geyser').cost, 1, 'further ranks cost 1');
  // tier 3 (Eye of the Storm) needs 5 in the sea branch below it
  assert.equal(canRank('percy', h, 30, 'hurricane').gated, true);
  // never past the max, never past the points
  assert.equal(canRank('percy', h, 9, 'jet_charges').why, 'Fully trained');
  const poor = fresh('grover');
  assert.ok(rankUp('grover', poor, 1, 'hooves'));
  assert.equal(canRank('grover', poor, 1, 'hooves').poor, true);
  assert.equal(rankUp('grover', poor, 1, 'hooves'), false);
  assert.equal(pointsLeft('grover', poor, 1), 0);
});

test('equipping: only known powers, a swap when it is already slotted, three slots always filled', () => {
  const h = fresh('annabeth');
  assert.deepEqual(knownPowers('annabeth', h.skills), ['cap', 'plan', 'trap']);
  assert.equal(equip('annabeth', h, 0, 'flank'), false, 'not learned yet');
  h.skills = { blade: 2, flank: 1 };
  assert.deepEqual(knownPowers('annabeth', h.skills), ['cap', 'plan', 'trap', 'flank']);
  assert.ok(equip('annabeth', h, 1, 'flank'));
  assert.deepEqual(h.equip, ['cap', 'flank', 'trap']);
  assert.ok(equip('annabeth', h, 0, 'flank'), 'already slotted: the two swap');
  assert.deepEqual(h.equip, ['flank', 'cap', 'trap']);
  assert.equal(equip('annabeth', h, 3, 'plan'), false, 'there are three slots');
  // a broken loadout is mended: repeats, unknown ids and gaps become starters
  assert.deepEqual(validLoadout('annabeth', h.skills, ['flank', 'flank', 'nope']), ['flank', 'cap', 'plan']);
  assert.deepEqual(validLoadout('annabeth', {}, null), ['cap', 'plan', 'trap']);
  assert.deepEqual(validLoadout('annabeth', {}, ['flank', 'trap']), ['cap', 'trap', 'plan'], 'a forgotten power gives way to a starter');
});

test('respec gives back every point and puts the starters back where learned powers were', () => {
  const h = fresh('tyson');
  for (const id of ['fists', 'fists', 'mighty', 'clap']) assert.ok(rankUp('tyson', h, 10, id), id);
  assert.ok(equip('tyson', h, 2, 'clap'));
  assert.deepEqual(h.equip, ['pound', 'shield', 'clap']);
  respec('tyson', h, 10);
  assert.deepEqual(h.skills, {});
  assert.equal(h.skillPoints, 10);
  assert.deepEqual(h.equip, ['pound', 'shield', 'forge']);
});

test('saves from the first tree migrate: ranks kept or moved to the new ids, points kept, loadout = today\'s three', () => {
  for (const hero of HEROES) {
    // one rank of every old node the new rules allow at tier 1, as an old save would hold
    const level = 20, old = Object.fromEntries(OLD_IDS[hero].map((id) => [id, 1]));
    const h = migrateHero(hero, { skills: { ...old }, skillPoints: level - OLD_IDS[hero].length }, level);
    assert.equal(h.tree, TREE_VERSION);
    assert.deepEqual(h.equip, defaultLoadout(hero), hero);
    for (const id of Object.keys(h.skills)) assert.ok(nodeOf(hero, id), `${hero}.${id}: a node of the new tree`);
    // every old id lands somewhere (kept, or renamed to <id>_up), unless its new tier gate isn't met
    for (const id of OLD_IDS[hero]) {
      const now = nodeOf(hero, id) ? id : id + '_up';
      assert.ok(nodeOf(hero, now), `${hero}.${id} has a home`);
      if (nodeOf(hero, now).tier === 1 && !nodeOf(hero, now).req) assert.equal(h.skills[now], 1, `${hero}.${id}`);
    }
    // points always add up: spent + left = level
    assert.equal(spentPoints(hero, h.skills) + h.skillPoints, level, hero);
  }
  // a godly-power upgrade bought without the new gate is refunded, not lost
  const p = migrateHero('percy', { skills: { hurricane: 2, surge: 3, tidal: 1 }, skillPoints: 4 }, 10);
  assert.deepEqual(p.skills, { surge_up: 3 });
  assert.equal(p.skillPoints, 7);
  // migrating twice changes nothing
  assert.deepEqual(migrateHero('percy', JSON.parse(JSON.stringify(p)), 10), p);
});

test('a save loads, levels up and stays consistent through normalizeData', () => {
  const d = freshData('A', 'aaaaaaaaaa'); const s = new Save(d);
  const h = s.hero('grover');
  assert.deepEqual(h.equip, ['vines', 'calm', 'maia']);
  assert.equal(h.skillPoints, 1);
  s.addXp(2000);
  assert.equal(h.skillPoints, d.level, 'one point a level for every hero');
  assert.ok(rankUp('grover', h, d.level, 'hooves')); assert.ok(rankUp('grover', h, d.level, 'maia_up'));
  assert.ok(rankUp('grover', h, d.level, 'snack')); assert.ok(equip('grover', h, 0, 'snack'));
  const back = normalizeData(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(back.heroes.grover.skills, h.skills);
  assert.deepEqual(back.heroes.grover.equip, ['snack', 'calm', 'maia']);
  assert.equal(back.heroes.grover.skillPoints, d.level - 4);
  // a tampered save is brought back within the rules
  const bad = JSON.parse(JSON.stringify(d)); bad.heroes.grover.skills = { panic: 2, hooves: 9, snack: 1 }; bad.heroes.grover.equip = ['snack', 'lullaby', 'lullaby'];
  const fixed = normalizeData(bad).heroes.grover;
  assert.deepEqual(fixed.skills, { hooves: 3, snack: 1 }, 'ranks capped, an ungated godly-power upgrade dropped');
  assert.deepEqual(fixed.equip, ['snack', 'vines', 'calm'], 'an unknown power and a repeat give way to starters');
});

test('merging two copies: both copies\' ranks if they fit together, else the newer copy\'s', () => {
  const a = { skills: { riptide: 2 }, equip: ['surge', 'tide', 'throw'] }, b = { skills: { jet: 2, jet_charges: 1, geyser: 1 }, equip: ['geyser', 'tide', 'throw'] };
  const m = mergeHero('percy', a, b, 10);
  assert.deepEqual(m.skills, { riptide: 2, jet: 2, jet_charges: 1, geyser: 1 });
  assert.deepEqual(m.equip, ['geyser', 'tide', 'throw']);
  assert.equal(m.skillPoints, 3);
  const tight = mergeHero('percy', a, b, 5);
  assert.deepEqual(tight.skills, b.skills, 'over budget together: the newer copy');
  assert.equal(tight.skillPoints, 0);
  // the rules hold on the result even for odd inputs
  assert.deepEqual(sanitizeSkills('percy', { geyser: 1 }, 99), {}, 'a gated power without its gate');
});

test('every hero in TREES is one of the playable heroes', () => {
  assert.deepEqual(Object.keys(TREES).sort(), [...HEROES].sort());
});
