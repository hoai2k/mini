// Node test for the Eclipse Regent, mission three's commander at the eclipse
// dais of the Violet Inversion. See src/game3d/regent3d.ts and
// hopper/3d/design/LEVEL-PLAN-M2-M3.md · "The commanders · Eclipse Regent".
import { EclipseRegent, World, Combat, stepHopper, createHopperState, MISSIONS, dt, blank, standing } from './harness3d.mjs';
import assert from 'node:assert/strict';

function checker(label) {
  let checks = 0;
  return {
    check(name, cond, detail) {
      checks++;
      assert.ok(cond, `${label} · ${name}: ${detail}`);
    },
    done(summary) {
      console.log(`${label}: ${checks} checks passed${summary ? ` (${summary})` : ''}`);
    },
  };
}

function recorder() {
  const log = { hurts: [], effects: [], sounds: [], bounces: [] };
  return {
    log,
    cb: {
      hurt: (damage, kx, ky, kz, fromX, fromZ) => {
        log.hurts.push({ damage, kx, ky, kz, fromX, fromZ });
        return false;
      },
      effect: (name, x, y, z) => log.effects.push({ name, x, y, z }),
      sound: (name) => log.sounds.push(name),
      bounce: (s) => log.bounces.push(s.id),
    },
  };
}

/** A fresh arena, world, combat and boss for one test. */
function arena() {
  const d = MISSIONS[2][2]();
  const world = new World(d);
  const combat = new Combat(world, d);
  const boss = new EclipseRegent(d.boss, world);
  return { d, world, combat, boss };
}

const FLOOR_OF = (world) => world.groundAt(0, -2140, 1e5).y;

// ---------------------------------------------------------------------
// Wake -> count-in -> phase 1.
// ---------------------------------------------------------------------
{
  const c = checker('wake and count-in');
  const { world, combat, boss } = arena();
  const FLOOR = FLOOR_OF(world);
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  c.check('starts asleep, inactive', boss.runtime.state === 'sleep' && !boss.runtime.active, boss.runtime.state);
  c.check('the runtime sits at the dais floor', Math.abs(boss.runtime.y - FLOOR) < 1, [boss.runtime.y, FLOOR]);
  boss.wake(cb);
  c.check('wake activates and counts in', boss.runtime.active && boss.runtime.state === 'count', boss.runtime.state);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  c.check('count-in resolves into phase 1', boss.runtime.state === 'fight' && boss.runtime.phase === 1, [boss.runtime.state, boss.runtime.phase]);
  c.check('phase 1 is heavy gravity 1.35', boss.runtime.gravity === 1.35, boss.runtime.gravity);
  c.done();
}

// ---------------------------------------------------------------------
// Phase 1: an expanding ring hurts a grounded Hopper standing in its path
// exactly once, and never one held airborne.
// ---------------------------------------------------------------------
{
  const c = checker('phase 1 shadow rings');
  const { world, combat, boss } = arena();
  const FLOOR = FLOOR_OF(world);
  const { cb, log } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z + 30);
  h.y = FLOOR;
  h.groundY = FLOOR;
  h.grounded = true;
  boss.wake(cb);
  for (let i = 0; i < 620; i++) {
    h.grounded = true;
    h.y = FLOOR;
    boss.update(dt, h, combat, cb);
  }
  c.check('a ring hurts the grounded Hopper at r=30', log.hurts.length === 1, log.hurts);
  c.check('the hurt knocks outward (away from the centre)', log.hurts[0] && log.hurts[0].kz > 0, log.hurts[0]);
  c.done();
}
{
  const c = checker('phase 1 shadow rings, airborne dodge');
  const { world, combat, boss } = arena();
  const FLOOR = FLOOR_OF(world);
  const { cb, log } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z + 30);
  boss.wake(cb);
  for (let i = 0; i < 620; i++) {
    h.y = FLOOR + 20;
    h.grounded = false;
    boss.update(dt, h, combat, cb);
  }
  c.check('an airborne Hopper over the same spot is never hurt', log.hurts.length === 0, log.hurts);
  c.done();
}

// ---------------------------------------------------------------------
// Phase 1: after a ring pair the hands lower; a kick on one deals 4 and
// opens the heart. Lasers only damage an open core point.
// ---------------------------------------------------------------------
{
  const c = checker('phase 1 hands and heart');
  const { world, combat, boss } = arena();
  const FLOOR = FLOOR_OF(world);
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 560; i++) boss.update(dt, h, combat, cb);
  c.check('the hands lower after a ring pair', boss.runtime.handOpen > 0, boss.runtime.handOpen);

  // Stand beside the near hand and land a kick.
  const hp = boss.runtime.handOpen > 0 ? [boss.runtime.x - 22, FLOOR + 4, boss.runtime.z + 12] : null;
  h.x = hp[0];
  h.z = hp[2];
  h.y = FLOOR;
  const hpBefore = boss.runtime.hp;
  combat.kick = 0.3;
  boss.update(dt, h, combat, cb);
  c.check('the kick deals 4 to the hand', boss.runtime.hp === hpBefore - 4, [boss.runtime.hp, hpBefore]);
  c.check('the kick opens the heart', boss.runtime.open > 0, boss.runtime.open);
  combat.kick = 0;
  c.done();
}
{
  const c = checker('phase 1 laser on the heart');
  const { world, combat, boss } = arena();
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  c.check('phase 1 is active', boss.runtime.phase === 1 && boss.runtime.state === 'fight', boss.runtime);

  // A laser on a closed heart does nothing.
  const heart = [boss.runtime.x, boss.runtime.y + 44, boss.runtime.z];
  let hpBefore = boss.runtime.hp;
  combat.projectiles.push({ id: 9001, x: heart[0], y: heart[1], z: heart[2], vx: 0, vy: 0, vz: 0, life: 1, radius: 0.8, damage: 1, gravity: 0, owner: 'hopper', kind: 'laser' });
  boss.update(dt, h, combat, cb);
  c.check('a laser on a closed heart does not damage', boss.runtime.hp === hpBefore, [boss.runtime.hp, hpBefore]);

  // Force the heart open and try again with a fresh projectile.
  boss.runtime.open = 4;
  hpBefore = boss.runtime.hp;
  combat.projectiles.push({ id: 9002, x: heart[0], y: heart[1], z: heart[2], vx: 0, vy: 0, vz: 0, life: 1, radius: 0.8, damage: 1, gravity: 0, owner: 'hopper', kind: 'laser' });
  boss.update(dt, h, combat, cb);
  c.check('a laser on the open heart damages', boss.runtime.hp === hpBefore - 1, [boss.runtime.hp, hpBefore]);
  c.done();
}

// ---------------------------------------------------------------------
// Forcing hp under two-thirds moves to phase 2 (light gravity) with lance
// volleys and summoned medusae.
// ---------------------------------------------------------------------
{
  const c = checker('phase 2 entry and lances');
  const { world, combat, boss } = arena();
  const FLOOR = FLOOR_OF(world);
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  boss.runtime.hp = Math.floor(boss.runtime.maxHp * 0.6);
  for (let i = 0; i < 250; i++) boss.update(dt, h, combat, cb);
  c.check('hp under two-thirds enters phase 2', boss.runtime.phase === 2 && boss.runtime.state === 'fight', [boss.runtime.phase, boss.runtime.state]);
  c.check('phase 2 is light gravity 0.5', boss.runtime.gravity === 0.5, boss.runtime.gravity);

  // A stationary Hopper is his own predicted spot, so the first lance marks
  // and then strikes him; a Hopper far away is untouched.
  h.x = boss.runtime.x;
  h.z = boss.runtime.z;
  h.y = FLOOR;
  h.vx = 0;
  h.vz = 0;
  const far = standing(world, boss.runtime.x + 200, boss.runtime.z);
  far.y = FLOOR;
  let sawDisc = false;
  const { cb: cb2, log } = recorder();
  for (let i = 0; i < 300 && log.hurts.length === 0; i++) {
    boss.update(dt, h, combat, cb2);
    if (boss.runtime.marks.some((m) => m.shape === 'disc')) sawDisc = true;
  }
  c.check('a lance mark appears', sawDisc, boss.runtime.marks);
  c.check('the lance strike hurts the Hopper standing on the mark', log.hurts.length > 0, log.hurts);
  c.check('a Hopper 200m away from the mark is not hurt', !log.hurts.some((hurt) => Math.hypot(hurt.fromX - far.x, hurt.fromZ - far.z) < 10), log.hurts);
  c.done();
}
{
  const c = checker('phase 2 medusae');
  const { world, combat, boss } = arena();
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  boss.runtime.hp = Math.floor(boss.runtime.maxHp * 0.6);
  let maxAlive = 0;
  for (let i = 0; i < 400; i++) {
    boss.update(dt, h, combat, cb);
    const alive = combat.shadows.filter((s) => s.group === 'regent' && s.kind === 'veilMedusa' && s.alive).length;
    maxAlive = Math.max(maxAlive, alive);
  }
  c.check('two medusae are summoned', maxAlive === 2, maxAlive);
  const finalAlive = combat.shadows.filter((s) => s.group === 'regent' && s.kind === 'veilMedusa' && s.alive).length;
  c.check('never more than two are ever alive at once', maxAlive <= 2 && finalAlive <= 2, [maxAlive, finalAlive]);
  c.done();
}

// ---------------------------------------------------------------------
// Forcing hp under a third moves to phase 3: gravity alternates sign over
// the 3s cycles.
// ---------------------------------------------------------------------
{
  const c = checker('phase 3 gravity alternation');
  const { world, combat, boss } = arena();
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  boss.runtime.hp = Math.floor(boss.runtime.maxHp * 0.2);
  for (let i = 0; i < 250; i++) boss.update(dt, h, combat, cb);
  c.check('hp under a third enters phase 3', boss.runtime.phase === 3 && boss.runtime.state === 'fight', [boss.runtime.phase, boss.runtime.state]);
  const signs = new Set();
  for (let i = 0; i < Math.round(3.2 * 4 * 120); i++) {
    boss.update(dt, h, combat, cb);
    signs.add(Math.sign(boss.runtime.gravity));
  }
  c.check('gravity alternates sign over several cycles', signs.has(1) && signs.has(-1), [...signs]);
  c.done();
}

// ---------------------------------------------------------------------
// Marks stay finite across a run through every phase.
// ---------------------------------------------------------------------
{
  const c = checker('marks stay finite');
  const { world, combat, boss } = arena();
  const { cb } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  let allFinite = true;
  for (let i = 0; i < 200; i++) {
    boss.update(dt, h, combat, cb);
    for (const m of boss.runtime.marks) if (![m.x, m.y, m.z, m.r].every(Number.isFinite)) allFinite = false;
  }
  boss.runtime.hp = Math.floor(boss.runtime.maxHp * 0.6);
  for (let i = 0; i < 600; i++) {
    boss.update(dt, h, combat, cb);
    for (const m of boss.runtime.marks) if (![m.x, m.y, m.z, m.r].every(Number.isFinite)) allFinite = false;
  }
  boss.runtime.hp = Math.floor(boss.runtime.maxHp * 0.2);
  for (let i = 0; i < 800; i++) {
    boss.update(dt, h, combat, cb);
    for (const m of boss.runtime.marks) if (![m.x, m.y, m.z, m.r].every(Number.isFinite)) allFinite = false;
  }
  c.check('every mark stays finite through the whole fight', allFinite, allFinite);
  c.done();
}

// ---------------------------------------------------------------------
// Death: hp 0 closes the core and restores the district's own gravity.
// ---------------------------------------------------------------------
{
  const c = checker('death');
  const { world, combat, boss } = arena();
  const { cb, log } = recorder();
  const h = standing(world, boss.runtime.x, boss.runtime.z);
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb);
  boss.runtime.hp = 0;
  boss.update(dt, h, combat, cb);
  c.check('the boss dies', !boss.runtime.alive && boss.runtime.state === 'dead', boss.runtime.state);
  c.check('the core closes', boss.runtime.open === 0, boss.runtime.open);
  c.check('gravity is restored to the district default', boss.runtime.gravity === 0.85, boss.runtime.gravity);
  c.check('death dissolves and explodes', log.effects.some((e) => e.name === 'dissolve') && log.sounds.includes('explode'), log);
  c.done();
}

// ---------------------------------------------------------------------
// stepHopper sanity: the Regent's own arena is walkable with the shared
// controller (a light smoke check that the harness wiring is intact).
// ---------------------------------------------------------------------
{
  const c = checker('arena sanity');
  const { world, boss } = arena();
  const h = createHopperState(boss.runtime.x, world.groundAt(boss.runtime.x, boss.runtime.z, 1e5).y, boss.runtime.z, Math.PI);
  h.groundY = h.y;
  for (let i = 0; i < 30; i++) stepHopper(h, world, blank, dt);
  c.check('Hopper stays grounded and finite on the dais', h.grounded && Number.isFinite(h.y), [h.grounded, h.y]);
  c.done();
}

console.log('boss-regent: all checks passed');
