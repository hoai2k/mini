// Node test for the Smelter Leviathan, the mission-two commander at the
// gantry elevator (Skyhook Works, MISSIONS[1][2]). See
// src/game3d/leviathan3d.ts and LEVEL-PLAN-M2-M3.md, "The commanders ›
// Smelter Leviathan".
import { World, Combat, SmelterLeviathan, LEVIATHAN, MISSIONS, dt, standing, recorder, checker } from './harness3d.mjs';

const c = checker('smelterLeviathan');

/** A fresh Skyhook Works world, combat and boss -- every test gets its own,
 * so damage and state in one block never leaks into another. */
function freshBoss() {
  const d = MISSIONS[1][2]();
  const world = new World(d);
  const combat = new Combat(world, d);
  const boss = new SmelterLeviathan(d.boss, world);
  return { world, combat, boss };
}

/** Hopper on the pad, grounded, at the sweep's starting angle (0), radius
 * 40 from the tower axis -- squarely in the tail sweep's path. */
function onThePad(world, grounded = true) {
  const h = standing(world, 0, -2100 + 40, Math.PI);
  h.y = world.heightAt(0, -2100) + 2;
  h.groundY = h.y;
  h.grounded = grounded;
  return h;
}

const finitePoint = ([x, y, z]) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);

// ---------------------------------------------------------------------
// The coil exists and is well-formed before the fight even starts.
// ---------------------------------------------------------------------
{
  const { boss } = freshBoss();
  c.check('the coil starts as 16 finite points', boss.runtime.segments.length === 16 && boss.runtime.segments.every(finitePoint), boss.runtime.segments.length);
}

// ---------------------------------------------------------------------
// wake() -> count-in (telegraph rising 0 -> 1) -> sweep.
// ---------------------------------------------------------------------
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world);
  const { cb, log } = recorder();
  boss.wake(cb);
  c.check('wake activates the boss and sounds off', boss.runtime.active && log.sounds.includes('boss'), boss.runtime.active);
  c.check('wake starts the count-in', boss.runtime.state === 'countin', boss.runtime.state);
  let rose = false;
  for (let i = 0; i < 200 && boss.runtime.state === 'countin'; i++) {
    const before = boss.runtime.telegraph;
    boss.update(dt, h, combat, cb);
    if (boss.runtime.telegraph > before) rose = true;
  }
  c.check('the count-in telegraph rises toward 1', rose, rose);
  c.check('the count-in hands off to the sweep', boss.runtime.state === 'sweep', boss.runtime.state);
}

// ---------------------------------------------------------------------
// Phase 1: the tail sweep hurts a grounded Hopper standing in its path once
// per revolution, and misses an airborne one entirely.
// ---------------------------------------------------------------------
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world, true);
  const { cb, log } = recorder();
  boss.wake(cb);
  for (let i = 0; i < 200; i++) boss.update(dt, h, combat, cb); // clear the count-in
  const before1 = log.hurts.length;
  for (let i = 0; i < 120 * 3; i++) boss.update(dt, h, combat, cb); // > one revolution (2.4s)
  const firstRev = log.hurts.length - before1;
  c.check('the sweep hurts a grounded Hopper standing in its path once per revolution', firstRev === 1, firstRev);
  const before2 = log.hurts.length;
  for (let i = 0; i < 120 * 3; i++) boss.update(dt, h, combat, cb);
  const secondRev = log.hurts.length - before2;
  c.check('...and again on the next revolution, not more than once', secondRev === 1, secondRev);
}
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world, false); // airborne throughout
  const { cb, log } = recorder();
  boss.wake(cb);
  for (let i = 0; i < 120 * 8; i++) boss.update(dt, h, combat, cb);
  c.check('an airborne Hopper over the same spot is never hurt by the sweep', log.hurts.length === 0, log.hurts.length);
}

// ---------------------------------------------------------------------
// The tail joint opens after a revolution, target() follows it there, and a
// laser hitting it damages the boss; the closed body only sparks.
// ---------------------------------------------------------------------
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world);
  const { cb, log } = recorder();
  boss.wake(cb);
  let opened = false;
  for (let i = 0; i < 120 * 6 && !opened; i++) {
    boss.update(dt, h, combat, cb);
    if (boss.runtime.open > 0) opened = true;
  }
  c.check('the tail joint opens after a revolution', opened, boss.runtime.open);
  const t = boss.target();
  c.check("target() follows the open tail joint, not the head", t.x === boss.runtime.openX && t.y === boss.runtime.openY && t.z === boss.runtime.openZ, [t.x, boss.runtime.openX]);
  const hpBefore = boss.runtime.hp;
  combat.projectiles.push({ id: 9001, x: boss.runtime.openX, y: boss.runtime.openY, z: boss.runtime.openZ, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: 6, gravity: 0, owner: 'hopper', kind: 'laser' });
  boss.update(dt, h, combat, cb);
  c.check('a laser hitting the open tail joint damages it', boss.runtime.hp === hpBefore - 6, boss.runtime.hp);
  c.check('the hit sounded and flashed', log.sounds.includes('hit') && boss.runtime.hitFlash > 0, boss.runtime.hitFlash);
}
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world);
  const { cb } = recorder();
  boss.wake(cb);
  for (let i = 0; i < 5; i++) boss.update(dt, h, combat, cb); // still in the count-in: closed
  c.check('the body is closed before the first sweep completes', boss.runtime.open === 0, boss.runtime.open);
  const hpBefore = boss.runtime.hp;
  combat.projectiles.push({ id: 9002, x: boss.runtime.x, y: boss.runtime.y, z: boss.runtime.z, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: 9, gravity: 0, owner: 'hopper', kind: 'laser' });
  boss.update(dt, h, combat, cb);
  c.check('a laser on the closed body just sparks -- no damage', boss.runtime.hp === hpBefore, boss.runtime.hp);
}

// ---------------------------------------------------------------------
// Full fight: enough damage carries the boss through phase 2 (the breath,
// gated behind two full sweeps), phase 3 (the ring), and death. Damage is
// dealt exactly once per opening, at the point target() currently names, so
// the fight advances at a realistic pace rather than a single frame's worth
// of stacked lasers.
// ---------------------------------------------------------------------
{
  const { world, combat, boss } = freshBoss();
  const h = onThePad(world);
  const { cb, log } = recorder();
  boss.wake(cb);
  let pid = 10000,
    wasOpen = false;
  const strike = (dmg) => {
    combat.projectiles.push({ id: pid++, x: boss.runtime.openX, y: boss.runtime.openY, z: boss.runtime.openZ, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: dmg, gravity: 0, owner: 'hopper', kind: 'laser' });
  };
  // Strikes exactly once per opening (on the rising edge of `open`), at
  // whatever point target() currently names, until `until()` is true --
  // realistic pacing rather than a frame's worth of stacked lasers.
  const whittleUntil = (dmg, until, maxTicks) => {
    for (let i = 0; i < maxTicks && !until(); i++) {
      boss.update(dt, h, combat, cb);
      const isOpen = boss.runtime.open > 0;
      if (isOpen && !wasOpen) strike(dmg);
      wasOpen = isOpen;
    }
  };

  whittleUntil(8, () => boss.runtime.phase >= 2, 120 * 300); // phase 1: joint hits
  c.check('enough joint hits carry the boss into phase 2', boss.runtime.alive && boss.runtime.phase >= 2, [boss.runtime.hp, boss.runtime.phase]);
  c.check('phase 1 requires at least two full sweeps before it can hand off', boss.runtime.sweeps >= LEVIATHAN.minSweeps, boss.runtime.sweeps);
  c.check('the boss hands off to the furnace breath', boss.runtime.state === 'breathTelegraph' || boss.runtime.state === 'breath', boss.runtime.state);

  whittleUntil(0, () => boss.runtime.state === 'breath', 120 * 20);
  c.check('reaches the breath state', boss.runtime.state === 'breath', boss.runtime.state);
  const side = boss.runtime.breathSide;
  c.check('the maw opens on the cool side, 70 m up the tower', boss.runtime.open > 0 && Math.sign(boss.runtime.openX) === -side && Math.abs(boss.runtime.openY - (world.heightAt(0, -2100) + 70)) < 0.01, [boss.runtime.openX, boss.runtime.openY]);

  h.x = side * 30;
  h.z = -2100;
  const beforeHot = log.hurts.length;
  for (let i = 0; i < 100; i++) boss.update(dt, h, combat, cb);
  c.check('the breath damages the hot half', log.hurts.length > beforeHot, log.hurts.length - beforeHot);
  h.x = -side * 30;
  const beforeCool = log.hurts.length;
  for (let i = 0; i < 100; i++) boss.update(dt, h, combat, cb);
  c.check('the breath does not damage the cool half', log.hurts.length === beforeCool, log.hurts.length - beforeCool);

  whittleUntil(10, () => boss.runtime.phase >= 3, 120 * 400); // phase 2: maw hits
  c.check('enough maw hits carry the boss into phase 3', boss.runtime.alive && boss.runtime.phase >= 3, [boss.runtime.hp, boss.runtime.phase]);
  whittleUntil(0, () => boss.runtime.state === 'phase3', 120 * 30);
  c.check('phase 2 hands off to the ring', boss.runtime.state === 'phase3', boss.runtime.state);

  boss.update(dt, h, combat, cb);
  const cracks = boss.runtime.marks.filter((m) => m.shape === 'sphere');
  c.check('phase 3 shows three cracked-segment marks', cracks.length === 3, cracks.length);
  c.check('the coil is still 16 finite points in phase 3', boss.runtime.segments.length === 16 && boss.runtime.segments.every(finitePoint), boss.runtime.segments.length);

  const seg = boss.runtime.segments[4];
  h.x = seg[0];
  h.y = seg[1];
  h.z = seg[2];
  h.events = [{ kind: 'land', speed: 30, stomp: true }];
  boss.update(dt, h, combat, cb);
  h.events = [];
  c.check('a stomp on a cracked segment cracks it', boss.runtime.cracked[0] === true, boss.runtime.cracked);
  c.check('cracking a segment opens the core', boss.runtime.open > 0, boss.runtime.open);

  strike(9999);
  boss.update(dt, h, combat, cb);
  c.check('hp 0 kills the boss and closes the core', !boss.runtime.alive && boss.runtime.open === 0 && boss.runtime.state === 'dead', [boss.runtime.alive, boss.runtime.open, boss.runtime.state]);
}

// ---------------------------------------------------------------------
// target() always hands back the same object, moved to whichever point is
// currently open.
// ---------------------------------------------------------------------
{
  const { boss } = freshBoss();
  const t1 = boss.target();
  const t2 = boss.target();
  c.check('target() returns the same object every call', t1 === t2, t1 === t2);
  c.check('target() defaults to the head when nothing is open', t1.x === boss.runtime.x && t1.y === boss.runtime.y && t1.z === boss.runtime.z, [t1.x, boss.runtime.x]);
  boss.runtime.open = 5;
  boss.runtime.openX = 111;
  boss.runtime.openY = 222;
  boss.runtime.openZ = 333;
  const t3 = boss.target();
  c.check('target() follows the open core point', t3.x === 111 && t3.y === 222 && t3.z === 333, [t3.x, t3.y, t3.z]);
}

// ---------------------------------------------------------------------
// tell() names each state's tell.
// ---------------------------------------------------------------------
{
  const { boss } = freshBoss();
  boss.runtime.state = 'sweep';
  boss.runtime.open = 0;
  c.check('tell() names the sweep', boss.tell() === 'TAIL SWEEP · jump it', boss.tell());
  boss.runtime.open = 1;
  c.check('tell() names the open tail joint', boss.tell() === 'TAIL JOINT OPEN · kick it', boss.tell());
  boss.runtime.state = 'breath';
  boss.runtime.open = 0;
  c.check('tell() names the furnace breath', boss.tell() === 'FURNACE BREATH · cross to the cool side', boss.tell());
  boss.runtime.open = 1;
  c.check('tell() names the open maw', boss.tell() === 'MAW OPEN · fire into it', boss.tell());
  boss.runtime.state = 'phase3';
  boss.runtime.open = 0;
  c.check('tell() names a cracked segment', boss.tell() === 'CRACKED SEGMENT · stomp it', boss.tell());
  boss.runtime.open = 1;
  c.check('tell() names the exposed core', boss.tell() === 'CORE EXPOSED · strike now', boss.tell());
}

c.done();
