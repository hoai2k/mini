// The battle cadence (world/encounters.js, entities/packRules.js): rooms by
// role, groups with scouts placed on the reachable floor from the seed, traps
// limited per chapter, room sizes, and a kill objective a level can always
// meet.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENC, NONE, planRoles, budget, roster, place, walkDist, clearance, killNeed } from '../js/world/encounters.js';
import { PACK, packNotices, joinDelay, wokenByHit, scoutRuns } from '../js/entities/packRules.js';
import { mulberry32 } from '../js/util.js';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(GAME, 'js', p), 'utf8');

// a stand-in bestiary (the tiers and speeds that matter here)
const INFO = {
  pup: { tier: 'minor', speed: 5, ai: 'melee' }, harpy: { tier: 'minor', speed: 3.8, ai: 'ranged' }, automaton: { tier: 'minor', speed: 3.9, ai: 'blob' },
  spider: { tier: 'minor', speed: 5.8, ai: 'melee' }, fury: { tier: 'elite', speed: 3.8, ai: 'teleport' }, dracaena: { tier: 'elite', speed: 2.4, ai: 'tank' },
};
const info = (k) => INFO[k];
const TABLE = [['pup', 5], ['harpy', 2.5], ['fury', 1.5], ['dracaena', 0.8], ['automaton', 1]];

// A room floor: W x D, flat at height 10, with a pillar block, a pit and a
// raised ledge nobody can step up onto, entry on the south side.
function grid(W = 22, D = 22) {
  const H = new Int16Array(W * D).fill(10), ok = new Uint8Array(W * D).fill(1);
  for (let z = 8; z <= 10; z++) for (let x = 8; x <= 10; x++) H[z * W + x] = NONE;       // a pillar
  for (let z = 2; z <= 4; z++) for (let x = 15; x <= 18; x++) H[z * W + x] = NONE;      // a pit
  for (let z = 0; z <= 3; z++) for (let x = 0; x <= 3; x++) H[z * W + x] = 13;          // a ledge three blocks up
  return { W, D, H, ok, entry: [11, D - 1], doors: [[11, D - 1], [W - 1, 11]] };
}

test('room roles: the last main room is a breather, the battleground where it grew, 0-2 traps only in side rooms', () => {
  for (let s = 1; s <= 200; s++) {
    const r = mulberry32(s);
    const sides = [{ secret: true }, { secret: false }, { secret: false }, { secret: false }].slice(0, 1 + (s % 4));
    const roles = planRoles(3 + (s % 3), sides, 1 + (s % 5), r, { arenaAt: 1 });
    assert.equal(roles.main.at(-1), 'breather');
    assert.equal(roles.main[1], 'arena');
    assert.equal(roles.main[0], 'pack');
    const traps = roles.sides.filter((x) => x === 'trap').length;
    assert.ok(traps <= ENC.traps.max, `${traps} traps`);
    sides.forEach((sd, i) => { if (sd.secret) assert.equal(roles.sides[i], 'secret'); });
  }
});
test('traps are a now-and-then thing: most chapters have one, a few none, never more than two', () => {
  let none = 0, two = 0;
  for (let s = 1; s <= 400; s++) {
    const roles = planRoles(4, [{ secret: true }, { secret: false }, { secret: false }], 3, mulberry32(s * 31));
    const n = roles.sides.filter((x) => x === 'trap').length;
    if (n === 0) none++; if (n === 2) two++;
    assert.ok(n <= 2);
  }
  assert.ok(none > 10 && none < 120, `${none} of 400 without a trap`);
  assert.ok(two > 10 && two < 200, `${two} of 400 with two`);
});
test('groups: 6-14 minor monsters and 1-2 elites, bigger on harder settings and later in the chapter', () => {
  for (let d = 1; d <= 5; d++) for (const t of [0, 0.5, 1]) for (let s = 1; s <= 20; s++) {
    const b = budget('pack', { diff: d, t, area: 450 }, mulberry32(s));
    for (const p of b.packs) { assert.ok(p.minors >= 6 && p.minors <= 14, `${p.minors} minors`); assert.ok(p.elites >= 1 && p.elites <= 2); }
    assert.ok(b.scouts >= 1 && b.scouts <= 3);
    const a = budget('arena', { diff: d, t, area: 950 }, mulberry32(s));
    assert.ok(a.packs.length >= 2 && a.packs.length <= 3, 'a battleground holds two or three groups');
  }
  const size = (d, t) => { let n = 0; for (let s = 1; s <= 50; s++) n += budget('pack', { diff: d, t, area: 450 }, mulberry32(s)).packs[0].minors; return n / 50; };
  assert.ok(size(3, 0.5) > size(1, 0.5) + 2, 'Hero groups are bigger than Mortal ones');
  assert.ok(size(1, 1) > size(1, 0), 'groups grow along the chapter');
  assert.equal(budget('breather', { diff: 1 }, mulberry32(1)).packs.length, 0, 'the breather has no group');
  assert.ok(budget('breather', { diff: 1 }, mulberry32(1)).strays <= 2);
  assert.ok(budget('trap', { diff: 1 }, mulberry32(1)).waves.length >= 2, 'a trap comes in waves');
});
test('more players, bigger groups: every member says how many humans it takes', () => {
  const plan = roster(budget('pack', { diff: 2, t: 0.5, area: 450 }, mulberry32(4)), TABLE, info, 2, mulberry32(5));
  const m = plan.packs[0].members;
  const at = (h) => m.filter((x) => x.humans <= h).length;
  assert.ok(at(1) < at(2) && at(2) < at(4), `${at(1)} / ${at(2)} / ${at(4)}`);
  assert.ok(at(4) <= Math.ceil(at(1) * ENC.partyMax) + 2);
  assert.ok(m.some((x) => x.big), 'an elite in every group');
  for (const s of plan.scouts) assert.equal(s.humans, 1, 'scouts are always posted');
});
test('the floor: walking distance steps one block, climbs out of water, never onto a ledge', () => {
  const G = grid(); const d = walkDist(G);
  assert.equal(d[(G.D - 1) * G.W + 11], 0, 'the entry');
  assert.equal(d[1 * G.W + 1], -1, 'a three-block ledge is out of reach');
  assert.equal(d[9 * G.W + 9], -1, 'inside the pillar');
  // a creek two deep: you can wade out
  const W = 5, D = 1, H = new Int16Array([10, 10, 8, 10, 10]), wet = new Uint8Array([0, 0, 1, 0, 0]);
  const dc = walkDist({ W, D, H, wet, entry: [0, 0] });
  assert.ok(dc[4] > 0, 'across the creek');
  const c = clearance(G, d);
  assert.equal(c[9 * G.W + 9], 0); assert.ok(c[15 * G.W + 11] >= 3, 'open floor has clearance');
});
test('groups and scouts are placed the same from the same seed, on reachable floor, away from the doors', () => {
  const G = grid(24, 22);
  const mk = (seed) => { const r = mulberry32(seed); const plan = roster(budget('arena', { diff: 2, t: 0.5, area: 500 }, r), TABLE, info, 2, r); return place(G, plan, r); };
  const a = mk(77), b = mk(77), c = mk(78);
  assert.deepEqual(a, b, 'same seed, same placement (every browser builds the same level)');
  assert.notDeepEqual(a, c);
  const dist = walkDist(G);
  const all = [...a.packs.flatMap((p) => p.members), ...a.loose];
  assert.ok(all.length >= 14);
  const seen = new Set();
  for (const m of all) {
    const [x, z, h] = m.at, i = z * G.W + x;
    assert.ok(dist[i] >= 0, `${m.kind} at ${x},${z} is reachable`);
    assert.equal(h, G.H[i]);
    assert.ok(!seen.has(i), 'one monster per cell'); seen.add(i);
    for (const [dx, dz] of G.doors) assert.ok(Math.hypot(x - dx, z - dz) >= ENC.doorClear - 0.01, `${m.role} ${x},${z} clear of the door ${dx},${dz}`);
  }
  // the groups are clusters: every member near its center
  for (const p of a.packs) for (const m of p.members) assert.ok(Math.hypot(m.at[0] - p.at[0], m.at[1] - p.at[1]) <= 6, 'clustered');
  // scouts stand between their group and the way in
  for (const s of a.loose.filter((m) => m.role === 'scout')) {
    const ds = dist[s.at[1] * G.W + s.at[0]];
    assert.ok(a.packs.some((p) => ds < dist[p.at[1] * G.W + p.at[0]]), 'a scout is posted ahead of a group');
  }
});
test('a trap has marked spawn points round its floor; ranged monsters stand at the back of a group', () => {
  const G = grid(15, 15); G.doors = [[7, 14]]; G.entry = [7, 14];
  const r = mulberry32(9);
  const t = place(G, roster(budget('trap', { diff: 1 }, r), TABLE, info, 1, r), r);
  assert.ok(t.points.length >= 4, `${t.points.length} points`);
  for (const [x, z] of t.points) assert.ok(Math.hypot(x - 7, z - 14) >= 4, 'not at the door');
  const G2 = grid(); const r2 = mulberry32(3);
  const plan = roster({ packs: [{ minors: 10, elites: 1 }], scouts: 0, strays: 0, waves: [] }, [['pup', 1], ['harpy', 1]], info, 1, r2);
  const P = place(G2, plan, r2).packs[0], dist = walkDist(G2), dd = (m) => dist[m.at[1] * G2.W + m.at[0]];
  const ranged = P.members.filter((m) => m.ranged), melee = P.members.filter((m) => !m.ranged);
  if (ranged.length && melee.length) assert.ok(Math.min(...ranged.map(dd)) >= Math.max(...melee.map(dd)) - 0.01, 'harpies behind the pups');
});
test('room sizes: open battlegrounds fill their cell, traps are small', () => {
  assert.ok(ENC.size.combat[0] >= 20, 'main-path rooms at least 20 blocks a side');
  assert.ok(ENC.size.trap[1] <= 16, 'a trap is a small room');
  const src = read('world/levelgen.js');
  assert.match(src, /ENC\.size\.combat/, 'levelgen sizes its combat rooms from ENC');
  assert.match(src, /2 \* CELL - 4/, 'the battleground spans two cells');
});
test('the kill objective never asks for more monsters than a level holds', () => {
  for (let d = 1; d <= 5; d++) {
    // the fewest monsters a level can hold for one player: a group room, the battleground and the breather
    let min = Infinity;
    for (let s = 1; s <= 50; s++) {
      const r = mulberry32(s * 7 + d);
      let n = 0;
      for (const [role, area] of [['pack', 380], ['arena', 800], ['breather', 380]]) {
        const p = roster(budget(role, { diff: d, t: 0.5, area }, r), TABLE, info, d, r);
        n += p.packs.reduce((a, q) => a + q.members.filter((m) => m.humans <= 1).length, 0) + p.scouts.length + p.strays.length;
      }
      min = Math.min(min, n);
    }
    const chapterNeed = Math.min(killNeed(min, d, true), 10 + 6 * d);
    assert.ok(chapterNeed <= min * 0.85 + 0.01, `Mortal+${d - 1}: need ${chapterNeed} of at least ${min}`);
  }
  for (let total = 1; total <= 200; total++) assert.ok(killNeed(total, 1, false) <= total);
});
test('a group notices you, then joins in a few at a time, the nearest first', () => {
  assert.equal(packNotices({ dist: PACK.notice - 1 }), true);
  assert.equal(packNotices({ dist: PACK.notice - 1, los: false }), false, 'not through a wall');
  assert.equal(packNotices({ dist: PACK.notice + 2, scout: true }), true, 'scouts see further');
  assert.equal(packNotices({ dist: PACK.hear - 1, los: false, fightNear: true }), true, 'a fight close by is heard');
  assert.ok(joinDelay(2, 0.5) < joinDelay(10, 0.5), 'the nearest first');
  assert.ok(joinDelay(30, 0.99) <= PACK.join.max);
  assert.ok(joinDelay(8, 0.5) > 0.8, 'not all at once');
  assert.equal(wokenByHit(PACK.hitWake - 0.5), true); assert.equal(wokenByHit(PACK.hitWake + 3), false, 'a shot at the edge pulls a few');
  assert.equal(scoutRuns({ packDist: 15 }), true); assert.equal(scoutRuns({ packDist: 2 }), false);
});
test('the runtime wires it up: groups seeded per room, traps seal and open, guests never spawn them', () => {
  const m = read('mission.js'), o = read('net/online.js'), e = read('entities/enemy.js');
  assert.match(m, /mulberry32\(\(L\.seed/, 'disguises and party size from the level seed');
  assert.match(m, /springTrap\(room\)/); assert.match(m, /openTrap\(room/);
  for (const k of ['spawnPacks', 'spawnReserve', 'springTrap', 'openTrap']) assert.match(o, new RegExp(`m\\.${k} = function`), `a guest's ${k} is the host's`);
  assert.match(o, /tg: bits\(m\.L\.trapGates/, 'trap doors are in the host snapshot');
  assert.match(e, /L\.kind === 'pack'/);
});
test('groups are mixed by role: melee in front, a few ranged, now and then an exploder; swarms are melee or spirits', () => {
  const R = { pup: 'rusher', harpy: 'ranged', automaton: 'exploder', spider: 'rusher', fury: 'trickster', dracaena: 'tank', ghost: 'caster' };
  const inf = (k) => ({ ...INFO[k], role: R[k] ?? INFO[k]?.role, ...(k === 'ghost' ? { tier: 'minor', ai: 'ranged' } : {}) });
  const table = [...TABLE, ['ghost', 1]];
  let swarms = 0, mixed = 0;
  for (let s = 1; s <= 300; s++) {
    const r = mulberry32(s);
    const plan = roster({ packs: [{ minors: 8, elites: 1 }], scouts: 2, strays: 0, waves: [] }, table, inf, 2, r);
    const p = plan.packs[0], base = p.members.filter((m) => m.humans <= 1);
    for (const sc of plan.scouts) assert.ok(['pup', 'spider'].includes(sc.kind), 'scouts are fast rushers');
    if (p.theme !== 'mixed') { swarms++; const k = p.theme.split(':')[1]; assert.ok(['rusher', 'fodder', 'caster'].includes(R[k]), `a swarm of ${k}`); continue; }
    mixed++;
    const roles = base.filter((m) => inf(m.kind).tier === 'minor').map((m) => R[m.kind]);
    const ranged = roles.filter((x) => x === 'ranged' || x === 'caster').length, boom = roles.filter((x) => x === 'exploder').length;
    assert.ok(ranged >= 1 && ranged <= 3, `${ranged} ranged`); assert.ok(boom <= 1);
    assert.ok(roles.length - ranged - boom >= 4, 'the melee is the bulk of it');
    assert.ok(base.some((m) => m.big), 'an elite');
  }
  assert.ok(swarms > 20 && swarms < 100, `${swarms} swarms of 300`);
});
