// Ranged monsters (entities/rangedRules.js): the volley scheduler spaces the
// shots at one hero, and no monster fires more than one projectile a shot
// below MULTI_SHOT_LEVEL, in the museum or in an early chapter.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Volleys, VOLLEY, MULTI_SHOT_LEVEL, shotCount, rangedCdMul, firstShotDelay, FIRST_SHOT } from '../js/entities/rangedRules.js';
import { CHAPTERS } from '../js/story/chapters.js';
import { CHAPTER_LEVEL, missionLevel } from '../js/progression.js';
import { REGIONS } from '../js/world/owLayout.js';
import { mulberry32 } from '../js/util.js';

const read = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const table = (src, head) => { const i = src.indexOf(head); return new Function('txt', 'return ' + src.slice(i + head.length - 1, src.indexOf('\n};', i) + 2))((key) => key); };
const MON = table(read('entities/monsters.js'), 'export const MONSTERS = {');
const FOD = table(read('entities/fodder.js'), 'export const FODDER_MONSTERS = {');
const ALL = { ...MON, ...FOD };
const SHOOTERS = Object.entries(ALL).filter(([, d]) => d.projectile);
// the enemy tables of the chapter boards (world/levelgen.js), read from the source (it imports the Three.js biomes)
const LG = read('world/levelgen.js');
const ENEMY_TABLES = new Function('return ' + LG.slice(LG.indexOf('export const ENEMY_TABLES = {') + 'export const ENEMY_TABLES = '.length, LG.indexOf('\n};', LG.indexOf('export const ENEMY_TABLES')) + 2))();

// A crowd of shooters round a party of three standing together (each
// shooter after one of them), each trying to shoot whenever its own
// cooldown allows (as enemy.js does), stepped at 60 Hz for two minutes.
function simulate({ shooters = 8, seconds = 120, seed = 7 } = {}) {
  const rng = mulberry32(seed), V = new Volleys({ rng });
  const heroes = [{ pos: { x: 0, z: 0 } }, { pos: { x: 1.5, z: 0.5 } }, { pos: { x: -1, z: 2 } }], dt = 1 / 60;
  const S = Array.from({ length: shooters }, (_, i) => ({ id: i, hero: heroes[i % heroes.length], windup: 0.8 + rng() * 0.4, cd: 3.4, wait: firstShotDelay(rng), state: 'idle', at: 0 }));
  const shots = []; let maxWinding = 0;
  for (let now = 0; now < seconds; now += dt) {
    for (const s of S) {
      s.wait -= dt;
      if (s.state === 'idle' && s.wait <= 0) {
        const at = V.request(s.hero, s, now, s.windup, (w) => w.state === 'windup');
        if (at != null) { s.state = 'windup'; s.at = at; }
      } else if (s.state === 'windup' && now >= s.at && V.clear(s.hero, now)) {
        V.fired(s.hero, s, now); shots.push({ t: now, id: s.id }); s.state = 'idle'; s.wait = s.cd * (0.8 + rng() * 0.4);
      }
      // (now and then one is staggered out of its wind-up)
      if (s.state === 'windup' && rng() < 0.002) { s.state = 'idle'; s.wait = 0.5; }
    }
    maxWinding = Math.max(maxWinding, S.filter((s) => s.state === 'windup').length);
  }
  return { shots, maxWinding };
}

test('volleys: shots at one hero come one after another, never two within the minimum gap', () => {
  for (const seed of [1, 7, 42, 99]) {
    const { shots, maxWinding } = simulate({ seed, shooters: 10 });
    assert.ok(shots.length > 40, `the shooters do shoot (${shots.length})`);
    for (let i = 1; i < shots.length; i++) assert.ok(shots[i].t - shots[i - 1].t >= VOLLEY.gap[0] - 1e-9, `gap ${(shots[i].t - shots[i - 1].t).toFixed(3)} s at ${shots[i].t.toFixed(2)}`);
    assert.ok(maxWinding <= VOLLEY.maxWindups, `at most ${VOLLEY.maxWindups} wind-ups at once (saw ${maxWinding})`);
  }
});

test('volleys: the cap on wind-ups, the gap between starts, and stale entries', () => {
  const V = new Volleys({ rng: () => 0 }), hero = {}, other = {};
  const a = { st: 'windup' }, b = { st: 'windup' }, c = { st: 'windup' };
  const live = (w) => w.st === 'windup';
  const ta = V.request(hero, a, 0, 0.8, live);
  assert.equal(ta, 0.8);
  assert.equal(V.request(hero, b, 0.1, 0.8, live), null, 'a second wind-up waits for the start gap');
  const tb = V.request(hero, b, 0.35, 0.8, live);
  assert.ok(tb >= ta + VOLLEY.gap[0] - 1e-9, 'its shot is slotted a gap after the first');
  assert.equal(V.request(hero, c, 1, 0.8, live), null, 'a third waits: two are already winding up');
  assert.ok(V.request(other, c, 1, 0.8, live) != null, 'another hero has its own schedule');
  V.drop(other, c);
  a.st = 'dead';
  assert.ok(V.request(hero, c, 1, 0.8, live) != null, 'a shooter that died frees its place');
  V.fired(hero, b, tb);
  assert.equal(V.clear(hero, tb + 0.1), false);
  assert.equal(V.clear(hero, tb + VOLLEY.gap[0]), true);
  assert.ok(VOLLEY.gap[0] >= 0.4 && VOLLEY.gap[1] <= 0.8 && VOLLEY.maxWindups <= 2);
});

test('volleys: a party standing together shares one schedule; heroes far apart have their own', () => {
  const V = new Volleys({ rng: () => 0 });
  const p1 = { pos: { x: 0, z: 0 } }, p2 = { pos: { x: 2, z: 1 } }, p3 = { pos: { x: 3, z: -2 } }, far = { pos: { x: 60, z: 0 } };
  const s = (n) => ({ n, st: 'windup' }), live = (w) => w.st === 'windup';
  const a = s(1), b = s(2), c = s(3), d = s(4);
  const ta = V.request(p1, a, 0, 0.8, live);
  const tb = V.request(p2, b, 0.3, 0.8, live);
  assert.ok(ta != null && tb != null && tb - ta >= VOLLEY.gap[0] - 1e-9, 'the second shot, at the hero beside, comes a gap later');
  assert.equal(V.request(p3, c, 0.7, 0.8, live), null, 'a third hero beside them: two are already winding up');
  assert.ok(V.request(far, d, 0.7, 0.8, live) != null, 'a hero far off is shot at on its own schedule');
  V.fired(p1, a, ta);
  assert.equal(V.clear(p2, ta + 0.1), false, 'a shot at the hero beside counts');
  assert.equal(V.clear(far, ta + 0.1), true);
});

test('the first shot waits a random moment; elites and champions are only a little faster', () => {
  const r = mulberry32(3), d = Array.from({ length: 200 }, () => firstShotDelay(r));
  assert.ok(Math.min(...d) >= FIRST_SHOT[0] && Math.max(...d) <= FIRST_SHOT[1] && Math.max(...d) - Math.min(...d) > 1);
  for (const o of [{}, { elite: 'swift' }, { elite: 'armored' }, { champion: true }, { elite: 'swift', champion: true }]) {
    const k = rangedCdMul(o); assert.ok(k <= 1 && k >= 0.65, JSON.stringify(o));
  }
});

test('fire rates: fodder shoots every 3-5 s or so, big lobbers slower, every shot with a wind-up tell', () => {
  assert.ok(SHOOTERS.length >= 11);   // (the basilisk puffs fire at close range now, as in the books: it no longer shoots)
  for (const [id, d] of SHOOTERS) {
    const every = d.cd + d.windup;   // (the cooldown runs from the shot; enemy.js release)
    assert.ok(d.windup >= 0.7, `${id}: a readable wind-up (${d.windup} s)`);
    if (d.ai === 'summon') continue;   // (the empousa mostly summons)
    const big = d.lob && (d.tier === 'elite' || d.height >= 2.5);
    if (big) assert.ok(every >= 5.5 && every <= 7.5, `${id}: a big lobber shoots every ${every.toFixed(1)} s`);
    else assert.ok(every >= 3.5 && every <= 5.8, `${id}: shoots every ${every.toFixed(1)} s`);
  }
});

test('multi-shot: one projectile a shot below the gate level, in the museum and in chapters 1-3', () => {
  // the heroes have theirs first: the Stymphalian Feathers (a common magic item, a fan of knives) and Twin Knives
  const loot = read('loot.js'), arts = read('artifacts.js'), skills = read('heroes/skillRules.js');
  assert.match(loot, /id: 'stymphalian_feathers', kind: 'artifact'[^\n]*rarity: 'common'[^\n]*act: 'feathers'/);
  assert.match(arts, /case 'feathers':[^\n]*\n[^\n]*\n\s*for \(let i = -3; i <= 3; i\+\+\)/);
  assert.match(skills, /U\('knives', [^\n]*'workshop', 1,/);
  assert.ok(MULTI_SHOT_LEVEL >= 6, 'mid-game at the earliest');
  for (const [id, d] of SHOOTERS) {
    for (let lv = 1; lv < MULTI_SHOT_LEVEL; lv++) assert.equal(shotCount(d, { level: lv }), 1, `${id} at level ${lv}`);
    assert.ok((d.shots ?? 1) <= 3, `${id}: at most three a shot`);
  }
  assert.ok(SHOOTERS.some(([, d]) => (d.shots ?? 1) > 1), 'some monsters do fan out later on');
  // the chapters: chapter 1 (the museum) to 3, at every difficulty, and every chapter below the gate
  for (const ch of CHAPTERS) {
    const early = ch.num <= 3 || CHAPTER_LEVEL[ch.id] < MULTI_SHOT_LEVEL;
    if (!early) continue;
    const kinds = new Set([...(ENEMY_TABLES[ch.biome] ?? []).map(([k]) => k), ...(ch.mistForms ?? []), 'harpy', 'stymphalian', 'skeleton']);
    for (let diff = 1; diff <= 10; diff++) for (const k of kinds) {
      const d = ALL[k]; if (!d) continue;
      assert.equal(shotCount(d, { level: missionLevel(ch.id, diff), chapter: ch.id }), 1, `${ch.id} (${ch.biome}) difficulty ${diff}: ${k}`);
    }
  }
  assert.equal(CHAPTERS[0].biome, 'museum');
  // the open world: single shots in every region below the gate
  for (const r of REGIONS) {
    if (!r.kinds) continue;
    for (let lv = r.level[0]; lv <= r.level[1]; lv++) for (const [k] of r.kinds) if (lv < MULTI_SHOT_LEVEL) assert.equal(shotCount(ALL[k], { level: lv }), 1, `${r.id} level ${lv}: ${k}`);
  }
  // and from the gate on, a fan where the stat block has one
  assert.equal(shotCount(ALL.harpy, { level: MULTI_SHOT_LEVEL + 2 }), ALL.harpy.shots ?? 1);
  assert.equal(shotCount(ALL.harpy, { level: 12, chapter: 'lt1' }), 1, 'never in the museum, whatever the level');
});

test('enemy.js fires shotCount projectiles a shot through the volley scheduler', () => {
  const src = read('entities/enemy.js');
  assert.match(src, /shotCount\(/);
  assert.match(src, /volleys/);
  assert.doesNotMatch(src, /for \(let i = -1; i <= 1; i\+\+\)/, 'no fixed fan of three');
  assert.doesNotMatch(src, /for \(let i = 0; i < 2; i\+\+\) \{\s*const dir/, 'no fixed burst of two');
});
