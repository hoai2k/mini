// Achievements: the list, its text and badges, and the rules (achievementRules.js).
import './seed.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACHIEVEMENTS, ACH, freshAch, normalizeAch, mergeAch, grant, bump, progress, onChapterDone, onBossDown, onBelongings } from '../js/achievementRules.js';
import { BADGE_SHEETS, ICON_SHEETS } from '../js/ui/icons.js';
import { t } from '../js/text_config.js';
import { freshData, normalizeData } from '../js/save.js';
import { mergeProfiles } from '../js/profiles.js';

test('32 achievements, each with a name, a description, an emoji and a badge cell', () => {
  assert.equal(ACHIEVEMENTS.length, 32);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 32);
  for (const a of ACHIEVEMENTS) {
    for (const k of ['name', 'desc']) { const s = t(`achievements.list.${a.id}.${k}`); assert.ok(s && !s.startsWith('achievements.'), `${a.id} ${k}`); }
    assert.ok(a.icon, `${a.id} emoji`);
    if (a.stat || a.set) assert.ok(a.goal > 1, `${a.id} goal`);
  }
  // the badge sheets hold them in the list's order, and stay out of the item sheets
  const cells = Object.values(BADGE_SHEETS).flatMap((S) => S.ids);
  assert.deepEqual(cells, ACHIEVEMENTS.map((a) => 'ach:' + a.id));
  for (const S of Object.values(ICON_SHEETS)) for (const id of S.ids) assert.ok(!id.startsWith('ach:'));
});

test('the image request lists the badges in the same order, by name', () => {
  const py = readFileSync(new URL('../../design/source/build_requests.py', import.meta.url), 'utf8');
  const names = [...py.matchAll(/^ {8}"([^"]+?): [^"]*",$/gm)].map((m) => m[1]);
  const at = names.indexOf(t('achievements.list.field_trip.name'));
  assert.ok(at >= 0, 'round 8 lists the badges');
  assert.deepEqual(names.slice(at, at + 32), ACHIEVEMENTS.map((a) => t(`achievements.list.${a.id}.name`).replace(/’/g, '\'')));
});

test('counting: a counted one unlocks at its goal, once', () => {
  const r = freshAch();
  for (let i = 0; i < 9; i++) assert.deepEqual(bump(r, 'battleSense', 1, 5), []);
  assert.deepEqual(progress(r, 'reflexes'), { n: 9, goal: 10 });
  assert.deepEqual(bump(r, 'battleSense', 1, 7), ['reflexes']);
  assert.equal(r.got.reflexes, 7);
  assert.deepEqual(bump(r, 'battleSense'), [], 'never twice');
  assert.equal(grant(r, 'iris', 1), true); assert.equal(grant(r, 'iris', 2), false); assert.equal(grant(r, 'nonsense'), false);
});

test('chapters: the story ones, Olympian, three people, and the five heroes', () => {
  const r = freshAch();
  assert.deepEqual(onChapterDone(r, { chapter: 'lt1', difficulty: 1, humans: 1, heroesPlayed: ['percy'], noParalysis: false }).sort(), ['field_trip']);
  assert.deepEqual(onChapterDone(r, { chapter: 'lt1', difficulty: 2, humans: 1, heroesPlayed: ['percy'], noParalysis: true }), ['pop_quiz']);
  assert.deepEqual(onChapterDone(r, { chapter: 'lt8', daysLeftShare: 0.4 }), []);
  assert.deepEqual(onChapterDone(r, { chapter: 'lt8', daysLeftShare: 0.6 }), ['checked_out']);
  assert.deepEqual(onChapterDone(r, { chapter: 'lt5', difficulty: 4, humans: 3, heroesPlayed: ['annabeth', 'grover', 'clarisse'] }).sort(), ['olympian', 'quest_three']);
  assert.deepEqual(progress(r, 'whole_gang'), { n: 4, goal: 5 });
  assert.deepEqual(onChapterDone(r, { chapter: 'lt12', heroesPlayed: ['tyson'] }).sort(), ['not_the_thief', 'whole_gang']);
});

test('bosses: each gimmick, and a fight with no hero hit', () => {
  const r = freshAch();
  assert.deepEqual(onBossDown(r, { boss: 'minotaur', stuck: 2, heroesHit: true }), []);
  assert.deepEqual(onBossDown(r, { boss: 'minotaur', stuck: 3, heroesHit: true }), ['bull_horns']);
  assert.deepEqual(onBossDown(r, { boss: 'medusa', stoned: 1, heroesHit: true }), []);
  assert.deepEqual(onBossDown(r, { boss: 'medusa', stoned: 0, heroesHit: true }), ['dont_look']);
  assert.deepEqual(onBossDown(r, { boss: 'cerberus', sleepyHits: 10, heroesHit: true }), ['good_boy']);
  assert.deepEqual(onBossDown(r, { boss: 'ares', inSea: true, heroesHit: false }).sort(), ['achilles', 'surfs_up']);
  assert.deepEqual(onBossDown(r, { boss: 'procrustes', tipped: true, heroesHit: true }), ['perfect_fit']);
  assert.deepEqual(onBossDown(r, { boss: 'furies', heroesHit: true }), ['not_so_kindly']);
});

test('belongings: drachmas, a Unique, and a Heroic outfit', () => {
  const r = freshAch();
  const inv = [{ uid: 'w', rarity: 'heroic' }, { uid: 'a', rarity: 'unique' }, { uid: 'm', rarity: 'rare' }, { uid: 'm2', rarity: 'heroic' }];
  assert.deepEqual(onBelongings(r, { coins: 999, inv: inv.slice(0, 1), equipped: [] }), []);
  assert.deepEqual(onBelongings(r, { coins: 1000, inv, equipped: [['w', 'a', 'm', null]] }).sort(), ['hoarder', 'one_of_a_kind']);
  assert.deepEqual(onBelongings(r, { inv, equipped: [['w', 'a', 'm', 'm2']] }), ['dressed']);
});

test('saves keep achievements; old saves get an empty record; merging keeps every unlock', () => {
  assert.deepEqual(freshData('A').achievements, freshAch());
  const old = freshData('B'); delete old.achievements;
  assert.deepEqual(normalizeData(old).achievements, freshAch());
  assert.deepEqual(normalizeAch({ got: { iris: 5, bogus: 1, apollo: 'x' }, n: { kills: 12.7, fell: -1 }, sets: { gang: ['percy', 'percy', 3] } }), { got: { iris: 5 }, n: { kills: 12 }, sets: { gang: ['percy'] } });
  const a = freshData('C'), b = normalizeData({ ...freshData('C'), id: a.id });
  a.achievements = { got: { iris: 20, apollo: 9 }, n: { kills: 40 }, sets: { gang: ['percy'] } };
  b.achievements = { got: { iris: 10, cookies: 3 }, n: { kills: 10, fell: 2 }, sets: { gang: ['grover'] } };
  const m = mergeProfiles(a, b).achievements;
  assert.deepEqual(m.got, { iris: 10, apollo: 9, cookies: 3 });
  assert.deepEqual(m.n, { kills: 40, fell: 2 });
  assert.deepEqual(m.sets.gang.sort(), ['grover', 'percy']);
  assert.deepEqual(mergeAch(null, undefined), freshAch());
  assert.ok(ACH.iris);
});
