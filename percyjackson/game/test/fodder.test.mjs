// The open world's fodder (entities/fodder.js) and the region weights that
// make every region and stretch of the Road West mostly hordes of it
// (world/owLayout.js, world/rtLayout.js, world/roamZones.js hordeFor).
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t } from '../js/text_config.js';
import { REGIONS } from '../js/world/owLayout.js';
import { RT_REGIONS } from '../js/world/rtLayout.js';
import { FODDER_KINDS, HORDE, hordeFor, isFodder, ROAM_RULES } from '../js/world/roamZones.js';
import { mulberry32 } from '../js/util.js';

const read = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
// the stat tables, read from the source (the modules build models with Three.js)
const table = (src, head) => { const i = src.indexOf(head); return new Function('txt', 'return ' + src.slice(i + head.length - 1, src.indexOf('\n};', i) + 2))((key) => key); };
const MON = table(read('entities/monsters.js'), 'export const MONSTERS = {');
const FOD = table(read('entities/fodder.js'), 'export const FODDER_MONSTERS = {');
const ALL = { ...MON, ...FOD };
const NEW = ['karpos', 'karpos_slinger', 'colchis_calf', 'myrmex', 'myrmex_spitter', 'boarlet', 'crab', 'king_crab', 'basilisk', 'earthborn', 'daedalus_drone', 'laistrygonian', 'shade', 'keres'];
// the larger and tougher of the new kinds; the rest are fodder
const BIG = ['colchis_calf', 'boarlet', 'king_crab', 'earthborn', 'laistrygonian'];

test('the fodder monsters: weak swarms, a few larger ones, all named, wired in', () => {
  const src = read('entities/fodder.js'), mons = read('entities/monsters.js');
  assert.deepEqual(Object.keys(FOD), NEW);
  for (const id of NEW) {
    const d = FOD[id], big = BIG.includes(id);
    assert.notEqual(t(d.name), d.name, `${id} has a name in text_config`);
    assert.match(src, new RegExp(`\\n    ${d.model}: \\(\\) => build`), `${id} has a model`);
    assert.ok(!d.aura, `${id} carries no particle aura (hordes of them)`);
    assert.equal(FODDER_KINDS.has(id), !big, `${id}: fodder or not`);
    if (!big) {
      assert.equal(d.tier, 'minor', id);
      assert.ok(d.hp >= 12 && d.hp <= 30, `${id} hp ${d.hp}`);
      assert.ok(d.xp >= 2 && d.xp <= 3 && d.coins[1] <= 3, `${id} pays like a minor`);
      assert.ok(HORDE[id], `${id} comes in hordes`);
    } else assert.ok(d.hp >= 50 && d.xp >= 5, `${id} is tougher and worth more`);
  }
  // the elites: the rare tough ones
  for (const id of ['king_crab', 'earthborn', 'laistrygonian']) assert.equal(FOD[id].tier, 'elite', id);
  assert.equal(FOD.laistrygonian.hp > FOD.earthborn.hp && FOD.earthborn.hp > FOD.king_crab.hp, true);
  // they play differently: short and long range, quick and slow, lobbed and straight
  assert.ok(FOD.myrmex_spitter.lob && FOD.earthborn.lob && FOD.laistrygonian.lob && !FOD.basilisk.lob);
  assert.ok(FOD.karpos_slinger.range >= 10 && FOD.daedalus_drone.projectile === 'bullet');
  // the basilisk (the books' arm-long snake): small, fast, in threes; a short puff of fire at the spot in front and a poison touch, no projectile
  assert.ok(FOD.basilisk.ai === 'melee' && !FOD.basilisk.projectile && FOD.basilisk.moves?.every((m) => m.kind === 'sting') && FOD.basilisk.poison && FOD.basilisk.height <= 0.8 && FOD.basilisk.speed > MON.pup.speed && HORDE.basilisk[0] === 3);
  assert.ok(FOD.shade.speed < MON.spartoi.speed && FOD.keres.speed > MON.pup.speed, 'shades drift, keres dart');
  assert.equal(FOD.king_crab.ai, 'tank');
  for (const id of ['colchis_calf', 'boarlet']) assert.ok(FOD[id].ai === 'melee' && FOD[id].range >= 3, `${id} charges from a distance`);
  // monsters.js takes them in (so the shader warm-up and the workbench, which walk MONSTER_IDS, do too)
  assert.match(mons, /Object\.assign\(MONSTERS, FODDER_MONSTERS\);[\s\S]*export const MONSTER_IDS = Object\.keys\(MONSTERS\)/);
  assert.match(mons, /\.\.\.fodderModels\(\{ kit \}\)/);
  assert.match(mons, /rig\.onTick\?\.\(dt, e\)/);
  assert.match(read('entities/bosses.js'), /warmupGroup\(kinds = MONSTER_IDS/);
  // each has its own cry and its own bits when it goes
  const audio = read('audio.js');
  for (const id of NEW) { const v = FOD[id].voice; assert.ok(new RegExp(`case '${v}'`).test(audio) || ['hiss', 'grind', 'roar'].includes(v), `${id} voice ${v}`); assert.match(src, new RegExp(`\\n  ${id}: \\[\\[C\\(`), `${id} death bits`); }
});

const share = (kinds, f) => kinds.filter(([k]) => f(k)).reduce((s, [, w]) => s + w, 0) / kinds.reduce((s, [, w]) => s + w, 0);
const roaming = [...REGIONS, ...RT_REGIONS].filter((r) => !r.safe && r.kinds);

test('every region and stretch is mostly fodder, the tough ones rare', () => {
  assert.equal(roaming.length, 7 + 7);
  for (const r of roaming) {
    for (const [k, w] of r.kinds) { assert.ok(ALL[k], `${r.id}: ${k} is a monster`); assert.ok(w > 0); }
    const f = share(r.kinds, isFodder);
    assert.ok(f >= 0.68 && f <= 0.84, `${r.id}: fodder ${Math.round(f * 100)}%`);
    const elite = share(r.kinds, (k) => ALL[k].tier !== 'minor');
    assert.ok(elite <= 0.14, `${r.id}: elites ${Math.round(elite * 100)}%`);
    assert.ok(r.fodder?.length, `${r.id} has a camp crowd`);
    for (const k of r.fodder) assert.ok(isFodder(k) && r.kinds.some(([q]) => q === k), `${r.id}: camp crowd ${k} is the region's own fodder`);
  }
  // the regions' identities
  const top = (id) => [...roaming.find((r) => r.id === id).kinds].sort((a, b) => b[1] - a[1])[0][0];
  // the owner's rosters: every region has its kinds
  const ROSTER = { fields: ['karpos', 'karpos_slinger', 'rat', 'colchis_calf'], woods: ['myrmex', 'myrmex_spitter', 'pup', 'boarlet'], shore: ['crab', 'telekhine', 'harpy', 'king_crab'],
    canyon: ['myrmex', 'myrmex_spitter', 'spartoi', 'earthborn'], labyrinth: ['spartoi', 'spider', 'daedalus_drone', 'automaton'], othrys: ['spartoi', 'basilisk', 'telekhine', 'harpy', 'laistrygonian'], asphodel: ['shade', 'keres', 'spartoi', 'ghost'] };
  for (const [id, ks] of Object.entries(ROSTER)) for (const k of ks) assert.ok(roaming.find((r) => r.id === id).kinds.some(([q]) => q === k), `${id}: ${k}`);
  for (const [id, k] of [['fields', 'karpos'], ['woods', 'myrmex'], ['shore', 'crab'], ['canyon', 'myrmex'], ['labyrinth', 'spartoi'], ['othrys', 'spartoi'], ['asphodel', 'shade'],
    ['rt_auntyem', 'karpos'], ['rt_la', 'shade'], ['rt_santamonica', 'crab'], ['rt_vegas', 'spartoi'], ['rt_denver', 'spartoi'], ['rt_turnpike', 'pup']]) assert.equal(top(id), k, id);
  // every new kind turns up somewhere
  for (const id of NEW) assert.ok(roaming.some((r) => r.kinds.some(([k]) => k === id)), `${id} roams somewhere`);
});

test('hordes: crowds of fodder, a tough one never alone, within the cap', () => {
  const rnd = mulberry32(7);
  for (const r of roaming) for (let i = 0; i < 200; i++) {
    const h = hordeFor(r.kinds, rnd);
    assert.ok(h.length >= 1 && h.length <= 13, `${r.id}: ${h.length}`);
    const tough = h.filter((k) => !isFodder(k));
    assert.ok(tough.length <= 3, `${r.id}: ${h.join(',')}`);
    if (tough.length && ALL[tough[0]].tier !== 'minor') assert.ok(tough.length === 1 && h.length >= 4, `${r.id}: an elite comes with a crowd round it (${h.join(',')})`);
    if (isFodder(h[0]) && HORDE[h[0]][0] >= 4) assert.ok(h.length >= 4, `${r.id}: a horde, not a trickle (${h.join(',')})`);
  }
  assert.equal(hordeFor([['karpos', 1]], rnd, { room: 3 }).length, 3, 'never past the room left under the cap');
  assert.equal(hordeFor([['karpos', 1]], rnd, { room: 0 }).length, 0);
  // on average a region's horde is big (about 5–10)
  for (const r of roaming) { let n = 0; for (let i = 0; i < 400; i++) n += hordeFor(r.kinds, rnd).length; assert.ok(n / 400 >= 4.5 && n / 400 <= 10, `${r.id}: mean ${(n / 400).toFixed(1)}`); }
  assert.ok(ROAM_RULES.capOpen >= 30 && ROAM_RULES.capOpen <= 48, 'a crowd, not a trickle, within reason');
});

test('roaming runs on the Road West too, and camps bring their crowd', () => {
  const roam = read('world/roaming.js'), rt = read('openworld/runtime.js');
  assert.match(roam, /ow = !!\(L\?\.openWorld \|\| L\?\.roadTrip\)/);
  assert.match(roam, /hordeFor\(area\.kinds, Math\.random, \{ room: this\.cap - this\.live\(\)\.length \}\)/);
  const sc = rt.slice(rt.indexOf('  spawnCamp(c) {'), rt.indexOf('\n  removeEnemy('));
  assert.match(sc, /r\.fodder/);
});
