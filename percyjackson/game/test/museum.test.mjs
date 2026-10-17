// Chapter 1, the museum (story/museumRules.js, objectives/museum.js): the
// calm walk, the reveal and the hunt; hidden blows under the Mist while the
// disguised can't be hurt; Mrs. Dodds's three flights to rooms you can walk
// to; her lines naming the True Sight button of the device being played.
import './seed.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PHASES, phaseAfter, sees, finds, SEE_DIST, FIND_DIST, BEAT, BEAT_LINES, foeState, hiddenHitAllowed, HIDDEN_GAP, HIDDEN_DMG,
  monsterShare, huntLimit, huntGroup, HUNT_EVERY, FLIGHT_AT, nextFloor, STUN, STUN_IMMUNE, STUN_WINDUP, SHRIEK_R, stunnable,
  reachable, flightPlan, flowDir, doddsLine, mistHurtHint, sightWords, GONE,
} from '../js/story/museumRules.js';
import { CHAPTERS } from '../js/story/chapters.js';
import { mulberry32 } from '../js/util.js';

const JS = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'js');
const read = (p) => readFileSync(join(JS, p), 'utf8');

// ---------------------------------------------------------------- the phases
test('chapter 1 goes calm → reveal → hostile, and is the museum objective', () => {
  assert.deepEqual(PHASES, ['calm', 'reveal', 'hostile']);
  assert.equal(phaseAfter('calm'), 'reveal'); assert.equal(phaseAfter('reveal'), 'hostile'); assert.equal(phaseAfter('hostile'), 'hostile');
  const lt1 = CHAPTERS.find((c) => c.id === 'lt1');
  assert.equal(lt1.objective, 'museum'); assert.equal(lt1.boss, 'alecto'); assert.match(read('story/missionDef.js'), /OBJECTIVE_TYPES = \[[^\]]*'museum'/);
  assert.match(lt1.objText, /Mrs\. Dodds/);
  // the runtime: no traps, the gallery's gate open from the start, she waits in her room as a mortal, the boss started here
  const src = read('objectives/museum.js');
  assert.match(src, /r\.trap = null/); assert.match(src, /openGate/); assert.match(src, /spawnEnemy\('mortal'/); assert.match(src, /this\.autoBoss = false/);
  assert.match(read('objectives/index.js'), /museum: MuseumObjective/);
});
test('the calm walk: nobody in the Mist is after you until the reveal, or until you hit them', () => {
  const calm = foeState({ phase: 'calm' });
  assert.equal(calm.hostile, false); assert.equal(calm.hiddenAttacks, false); assert.equal(calm.look, 'person'); assert.equal(calm.hurtable, false);
  // early hunting: True Sight before the reveal shows them, and they can be fought; they fight back once hit
  const seen = foeState({ phase: 'calm', sight: true });
  assert.equal(seen.look, 'monster'); assert.equal(seen.hurtable, true); assert.equal(seen.hostile, false);
  assert.equal(foeState({ phase: 'calm', sight: true, provoked: true }).hostile, true);
  // revealed but not hunting: no target, no aggro (enemy.js); a hit wakes it
  const enemy = read('entities/enemy.js');
  assert.match(enemy, /if \(this\.foe && !this\.foe\.hunt\) \{ this\.foe\.hunt = true; this\.foe\.provoked = true; \}/);
  assert.match(enemy, /t = null; this\.target = null; this\.aggro = false;/);
});
test('the reveal: she is seen from close by with a clear view, or in her room; then she talks, then the hunt', () => {
  assert.equal(sees({ dist: SEE_DIST - 1, los: true }), true);
  assert.equal(sees({ dist: SEE_DIST - 1, los: false }), false, 'not through a wall');
  assert.equal(sees({ dist: SEE_DIST + 5, los: true }), false, 'not from across the museum');
  assert.equal(sees({ dist: 30, los: false, inRoom: true }), true, 'walking into her gallery');
  assert.ok(BEAT >= 8 && BEAT <= 14, 'a short beat');
  for (const [at, secs] of BEAT_LINES) { assert.ok(at >= 0 && at + secs <= BEAT + 0.5, 'each line inside the beat'); assert.ok(secs >= 2.5, 'time to read it'); }
  for (let i = 1; i < BEAT_LINES.length; i++) assert.ok(BEAT_LINES[i][0] >= BEAT_LINES[i - 1][0] + BEAT_LINES[i - 1][1] - 0.01, 'one line at a time');
  // the Mist lifts on its own and stays lifted while she talks
  assert.match(read('objectives/museum.js'), /g\.mist\.drainMul = 0/);
});
test('after the reveal they hunt you in groups, a few at a time, within the cap', () => {
  const h = foeState({ phase: 'hostile' });
  assert.equal(h.hostile, true); assert.equal(h.hiddenAttacks, true);
  assert.equal(huntLimit(1, 1), 3, 'Mortal, alone: three at once');
  assert.ok(huntLimit(3, 1) > huntLimit(1, 1) && huntLimit(1, 2) > huntLimit(1, 1));
  for (let i = 0; i < 50; i++) { const n = huntGroup(i / 50); assert.ok(n >= 2 && n <= 3); }
  assert.ok(HUNT_EVERY >= 6, 'not all at once');
  assert.ok(monsterShare(1) >= 0.4 && monsterShare(1) <= 0.6 && monsterShare(5) <= 0.85);
  // the rooms' monsters are all in disguise in the museum (mission.js spawnPacks)
  assert.match(read('mission.js'), /share != null \? kinds\[/);
});

// ---------------------------------------------------------------- the Mist
test('under the Mist their blows land with no swing; the disguised take no damage; True Sight makes them fair game', () => {
  const mist = foeState({ phase: 'hostile', sight: false }), sight = foeState({ phase: 'hostile', sight: true });
  assert.deepEqual([mist.look, mist.hurtable, mist.hiddenAttacks], ['person', false, true]);
  assert.deepEqual([sight.look, sight.hurtable, sight.hiddenAttacks], ['monster', true, false]);
  // a crowd of four round a hero for 10 s: at most one hidden blow every HIDDEN_GAP s
  let last = null, hits = 0;
  const cds = [0, 0.2, 0.4, 0.6];
  for (let t = 0; t < 10; t += 1 / 60) for (let i = 0; i < cds.length; i++) {
    cds[i] -= 1 / 240;
    if (cds[i] <= 0 && hiddenHitAllowed(last, t)) { last = t; hits++; cds[i] = 1.3; }
  }
  assert.ok(hits >= 8 && hits <= Math.ceil(10 / HIDDEN_GAP) + 1, `hits ${hits}`);
  assert.ok(HIDDEN_DMG > 0.5 && HIDDEN_DMG <= 1);
  const enemy = read('entities/enemy.js');
  assert.match(enemy, /if \(this\.dead \|\| this\.disguised \|\| this\.spawnT > 0\.2\) return 0;/, 'a person in the Mist takes no damage');
  assert.match(enemy, /updateHidden\(dt\)/); assert.match(enemy, /redisguise\(\)/);
  assert.match(enemy, /hiddenHitAllowed\(t\.hiddenHitT, g\.time\)/);
  // a hidden hunter never plays an attack (it stays in 'idle': no wind-up, no swing)
  const hidden = enemy.slice(enemy.indexOf('  updateHidden(dt) {'), enemy.indexOf('  // A living statue'));
  assert.doesNotMatch(hidden, /startAttack|markers\.spawn|slashArc/);
  // who looks like what follows True Sight (objectives/museum.js), online too (net/online.js)
  assert.match(read('objectives/museum.js'), /if \(seen && e\.disguised\) e\.reveal\(\);\s*else if \(!seen && !e\.disguised && !e\.bones\) e\.redisguise\(\);/);
  assert.match(read('net/online.js'), /e\.redisguise\?\.\(\)/);
});

// ---------------------------------------------------------------- the flights
test('her health thresholds give exactly three flights, however hard she is hit', () => {
  assert.equal(FLIGHT_AT.length, 3);
  for (let i = 1; i < FLIGHT_AT.length; i++) assert.ok(FLIGHT_AT[i] < FLIGHT_AT[i - 1]);
  assert.ok(FLIGHT_AT.every((f) => f > 0 && f < 1));
  assert.equal(nextFloor(3), null);
  // the floor rule of Boss.takeDamage: health can't go below the floor; reaching it starts the next flight
  const r = mulberry32(7);
  for (let run = 0; run < 200; run++) {
    const max = 1000; let hp = max, flights = 0, floor = nextFloor(0) * max;
    while (hp > 0) {
      const dmg = 5 + r() * (run % 3 === 0 ? 900 : 60);   // some runs hit absurdly hard
      hp -= dmg;
      if (floor != null && hp <= floor) { hp = floor; flights++; floor = nextFloor(flights) != null ? nextFloor(flights) * max : null; }
    }
    assert.equal(flights, 3, `run ${run}`);
  }
  assert.match(read('entities/bosses.js'), /if \(this\.hpFloor != null && this\.hp <= this\.hpFloor\) \{ this\.hp = this\.hpFloor;/);
});
test('the paralyzing shriek is telegraphed, short, fair and can’t stack', () => {
  assert.ok(STUN >= 1.5 && STUN <= 2.5, 'stunned 1.5–2.5 s');
  assert.ok(STUN_WINDUP >= 1, 'a wind-up you can see');
  assert.ok(STUN_IMMUNE >= 2, 'a moment of immunity after');
  assert.ok(SHRIEK_R >= 4 && SHRIEK_R <= STUN_WINDUP * 5.6, 'a ring a hero can run out of during the wind-up (5.6 m/s), not the whole room');
  assert.equal(stunnable({}), true);
  assert.equal(stunnable({ held: true }), false, 'not while held');
  assert.equal(stunnable({ down: true }), false);
  assert.equal(stunnable({ immuneUntil: 10, now: 9 }), false); assert.equal(stunnable({ immuneUntil: 10, now: 10 }), true);
  const pat = read('entities/bosses-book1.js');
  assert.match(pat, /\*dodds_flee\(dest, cb = \{\}\)/);
  assert.match(pat, /markers\.spawn\(\{[^}]*radius: SHRIEK_R, dur: STUN_WINDUP/);
  assert.match(pat, /p\.stunImmune = now \+ STUN \+ STUN_IMMUNE/);
  assert.match(read('entities/holds.js'), /kind === 'stun'/);
  assert.match(read('net/online.js'), /stunRemote\(p, dur\)/);
});

// A level like world/levelgen.js lays out: a main path on a 5x5 grid from the
// start to the boss, side rooms (some traps) and a secret room off it.
function level(seed) {
  const r = mulberry32(seed), cells = new Map(), rooms = [];
  const add = (cx, cz, type, parent, w = 14 + Math.floor(r() * 10), d = 14 + Math.floor(r() * 10)) => {
    const room = { cx, cz, type, parent, links: [], role: type === 'combat' ? ['pack', 'arena', 'breather'][Math.floor(r() * 3)] : undefined, x0: cx * 26 + 2, z0: cz * 26 + 2 };
    room.x1 = room.x0 + w - 1; room.z1 = room.z0 + d - 1;
    cells.set(cx + ',' + cz, room); rooms.push(room); return room;
  };
  const link = (a, b, kind = 'open') => { const l = { a, b, kind }; a.links.push(l); b.links.push(l); };
  let at = [Math.floor(r() * 5), 4];
  const n = 5 + Math.floor(r() * 3);
  add(at[0], at[1], 'start', null, 16, 16);
  while (rooms.length < n) {
    const opts = [[1, 0], [-1, 0], [0, -1], [0, 1]].map(([dx, dz]) => [at[0] + dx, at[1] + dz]).filter(([x, z]) => x >= 0 && z >= 0 && x < 5 && z < 5 && !cells.has(x + ',' + z));
    if (!opts.length) break;
    opts.sort((a, b) => a[1] - b[1] + (r() - 0.5) * 2);
    const prev = rooms[rooms.length - 1];
    at = opts[0];
    const room = add(at[0], at[1], rooms.length === n - 1 ? 'boss' : 'combat', prev, ...(rooms.length === n - 1 ? [22, 22] : []));
    link(prev, room);
  }
  if (!rooms.some((q) => q.type === 'boss')) rooms[rooms.length - 1].type = 'boss';
  const mids = rooms.filter((q) => q.type === 'combat');
  let secret = false;
  for (let t = 0; t < 30 && mids.length; t++) {
    const host = mids[Math.floor(r() * mids.length)], [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(r() * 4)];
    const x = host.cx + dx, z = host.cz + dz;
    if (x < 0 || z < 0 || x >= 5 || z >= 5 || cells.has(x + ',' + z)) continue;
    const s = add(x, z, secret ? 'side' : 'secret', host, 10 + Math.floor(r() * 7), 10 + Math.floor(r() * 7));
    if (s.type === 'side') s.role = r() < 0.4 ? 'trap' : 'guard';
    link(host, s, secret ? 'open' : 'secret'); secret = true;
  }
  return rooms;
}
test('she flies to three different rooms with room to fight, all reachable from the start, never where she is', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const rooms = level(seed), boss = rooms.findIndex((q) => q.type === 'boss');
    const plan = flightPlan(rooms, boss);
    const can = reachable(rooms, 0);
    assert.equal(plan.length, 3, `seed ${seed}: three flights`);
    let from = boss;
    for (const i of plan) {
      assert.ok(can.has(i), `seed ${seed}: room ${i} can be walked to from the start`);
      assert.notEqual(i, from, `seed ${seed}: not the room she flies from`);
      assert.notEqual(rooms[i].type, 'secret'); assert.notEqual(rooms[i].role, 'trap');
      from = i;
    }
    if (rooms.filter((q, i) => i !== boss && can.has(i) && q.type !== 'secret' && q.role !== 'trap' && q.type !== 'start').length >= 3) assert.equal(new Set(plan).size, 3, `seed ${seed}: three distinct rooms`);
  }
  // the secret room (behind a cracked wall) doesn't count as reachable
  const rooms = level(3), sec = rooms.findIndex((q) => q.type === 'secret');
  if (sec >= 0) assert.equal(reachable(rooms, 0).has(sec), false);
});
test('a hunter far away follows the way through the rooms (the distance field downhill)', () => {
  // a 5x3 field: a wall in the middle column except at the bottom row
  const W = 5, D = 3, d = new Float32Array(W * D).fill(Infinity);
  const open = (x, z) => !(x === 2 && z < 2);
  const q = [[4, 0]]; d[0 * W + 4] = 0;
  while (q.length) { const [x, z] = q.shift(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W || nz >= D || !open(nx, nz) || d[nz * W + nx] <= d[z * W + x] + 1) continue; d[nz * W + nx] = d[z * W + x] + 1; q.push([nx, nz]); } }
  const f = { d, W, D };
  const step = flowDir(f, 0.5, 0.5);
  assert.ok(step && step[1] > 0, 'heads down round the wall, not into it');
  assert.equal(flowDir(f, 4.5, 0.5), null, 'already there');
  assert.equal(flowDir(null, 1, 1), null);
});

// ---------------------------------------------------------------- her words
test('she names the True Sight button of the device being played, in plain English', () => {
  assert.match(doddsLine('reveal2', 'kbm'), /\bPress V\b/);
  assert.match(doddsLine('reveal2', 'pad0'), /right stick \(RS\)/);
  assert.match(doddsLine('reveal2', 'pad3'), /right stick/);
  assert.match(doddsLine('reveal2', 'touch'), /👁/);
  for (const dev of ['kbm', 'pad0', 'touch']) {
    assert.match(mistHurtHint(dev), new RegExp(sightWords(dev).replace(/[()]/g, '\\$&'), 'i'));
    for (const id of ['reveal1', 'reveal2', 'reveal3', 'flee1', 'flee2', 'flee3', 'found1', 'found2', 'found3']) {
      const line = doddsLine(id, dev);
      assert.ok(line.length > 8 && line.length < 140, `${id} ${dev}`);
      assert.doesNotMatch(line, /[Ͱ-Ͽ]/, 'no Greek letters in what she says');
    }
  }
  assert.match(doddsLine('reveal1'), /honey/);
  assert.match(GONE, /find her/);
  // the hint and the lines come from the device of whoever is playing (objectives/museum.js)
  const src = read('objectives/museum.js');
  assert.match(src, /doddsLine\('reveal' \+ this\.linesSaid, this\.dev\(\)\)/);
  assert.match(src, /mistHurtHint\(/);
  assert.match(read('main.js'), /!this\.mission\?\.handler\?\.quietMist/, 'no True Sight toast at the door: she explains it');
  assert.equal(FIND_DIST < SEE_DIST, true);
  assert.equal(finds({ dist: FIND_DIST - 1, los: true }), true); assert.equal(finds({ dist: FIND_DIST - 1, los: false }), false);
  assert.equal(finds({ dist: SEE_DIST - 1, los: false, inRoom: true }), true); assert.equal(finds({ dist: 40, los: false, inRoom: true }), false);
});
