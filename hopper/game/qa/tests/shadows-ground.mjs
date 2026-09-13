// Ground shadows of missions two and three: furnaceHound, ballastCrab,
// basaltBurrower, mirrorStalker (floor and ceiling). See
// hopper/3d/design/LEVEL-PLAN-M2-M3.md, "The twelve new shadows", for each
// kind's contract.
import { World, Combat, SPECS, sunseedFields, standing, dt, noAim, recorder, checker } from './harness3d.mjs';

const c = checker('shadows-ground');

/** A fresh world and an empty-shadows Combat, so only the shadow under test
 * is in play. */
function arena() {
  const district = sunseedFields();
  const world = new World(district);
  const combat = new Combat(world, { ...district, shadows: [] });
  return { world, combat };
}

// 1. Furnace Hound: tell, then a straight charge that hits Hopper in its
// path and misses when he steps off the line after the tell locks it in.
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'fh1', kind: 'furnaceHound', x: 0, z: -50 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    tellStart = -1,
    tellEnd = -1;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (prev !== 'tell' && s.state === 'tell') tellStart = i;
    if (prev === 'tell' && s.state !== 'tell') tellEnd = i;
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('furnaceHound tells before charging', tellStart >= 0, tellStart);
  c.check(
    'furnaceHound tell lasts about spec.tell',
    tellEnd > tellStart && Math.abs((tellEnd - tellStart) * dt - SPECS.furnaceHound.tell) < 0.05,
    `${((tellEnd - tellStart) * dt).toFixed(3)}s vs ${SPECS.furnaceHound.tell}s`,
  );
  c.check('furnaceHound charge hurts Hopper in its path', log.hurts.length > 0 && log.hurts[0].damage === 2, log.hurts);
  c.check('furnaceHound opens its core after the attack', s.state === 'recover' && s.open > 0, { state: s.state, open: s.open });
}
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'fh1', kind: 'furnaceHound', x: 0, z: -50 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    sidestepped = false;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    // The charge line is fixed the instant the tell ends; dodging right then
    // should leave the charge hitting empty air.
    if (!sidestepped && prev === 'tell' && s.state === 'attack') {
      h.x += 40;
      sidestepped = true;
    }
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('furnaceHound charge misses when Hopper steps 40m aside', log.hurts.length === 0, log.hurts);
}

// 2. Ballast Crab: tell, then a ground shockwave that hurts a grounded
// Hopper nearby but not one who's airborne.
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'bc1', kind: 'ballastCrab', x: 0, z: -20 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    tellStart = -1,
    tellEnd = -1;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (prev !== 'tell' && s.state === 'tell') tellStart = i;
    if (prev === 'tell' && s.state !== 'tell') tellEnd = i;
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('ballastCrab tells before slamming', tellStart >= 0, tellStart);
  c.check(
    'ballastCrab tell lasts about spec.tell',
    tellEnd > tellStart && Math.abs((tellEnd - tellStart) * dt - SPECS.ballastCrab.tell) < 0.05,
    `${((tellEnd - tellStart) * dt).toFixed(3)}s vs ${SPECS.ballastCrab.tell}s`,
  );
  c.check('ballastCrab shock hurts a grounded Hopper nearby', log.hurts.length > 0 && log.hurts[0].damage === 1, log.hurts);
  c.check('ballastCrab opens its core after the slam', s.state === 'recover' && s.open > 0, { state: s.state, open: s.open });
}
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  h.grounded = false;
  h.y += 20;
  combat.spawn({ id: 'bc1', kind: 'ballastCrab', x: 0, z: -20 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  for (let i = 0; i < 500 && s.state !== 'recover'; i++) combat.update(dt, h, cb, noAim);
  c.check('ballastCrab shock does not hurt an airborne Hopper', log.hurts.length === 0, log.hurts);
}

// 3. Basalt Burrower: untargetable underground, tells at the spot it
// tracks Hopper to, erupts with a ground shockwave, then surfaces as a
// normal target until it withdraws to burrow again.
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'bb1', kind: 'basaltBurrower', x: 0, z: -20 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  combat.update(dt, h, cb, noAim);
  c.check('basaltBurrower goes underground', s.underground === true, s.underground);
  c.check(
    'basaltBurrower is untargetable underground',
    !combat.targets().some((t) => t.id === 'bb1'),
    combat.targets().map((t) => t.id),
  );
  let prev = s.state,
    tellStart = -1,
    tellEnd = -1;
  // Generous budget: it erupts with vy 40 and coasts a couple of seconds
  // before fall() brings it back down into recover.
  for (let i = 0; i < 1500; i++) {
    combat.update(dt, h, cb, noAim);
    if (prev !== 'tell' && s.state === 'tell') tellStart = i;
    if (prev === 'tell' && s.state !== 'tell') tellEnd = i;
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('basaltBurrower tells before erupting', tellStart >= 0, tellStart);
  c.check(
    'basaltBurrower tell lasts about spec.tell',
    tellEnd > tellStart && Math.abs((tellEnd - tellStart) * dt - SPECS.basaltBurrower.tell) < 0.05,
    `${((tellEnd - tellStart) * dt).toFixed(3)}s vs ${SPECS.basaltBurrower.tell}s`,
  );
  c.check('basaltBurrower erupts and hurts Hopper standing over it', log.hurts.length > 0 && log.hurts[0].damage === 1, log.hurts);
  c.check(
    'basaltBurrower is targetable once it surfaces',
    combat.targets().some((t) => t.id === 'bb1'),
    combat.targets().map((t) => t.id),
  );
  c.check('basaltBurrower opens its back after erupting', s.open > 0, s.open);
}
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'bb1', kind: 'basaltBurrower', x: 0, z: -20 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let sidestepped = false;
  for (let i = 0; i < 500; i++) {
    // It tracked Hopper's old spot while burrowing; move him away right
    // before the last tick of the tell, so the eruption lands empty.
    if (!sidestepped && s.state === 'tell' && s.timer <= dt) {
      h.x += 40;
      sidestepped = true;
    }
    combat.update(dt, h, cb, noAim);
    if (s.state === 'recover') break;
  }
  c.check('basaltBurrower erupts harmlessly once Hopper has moved 40m away', log.hurts.length === 0, log.hurts);
}

// 4. Mirror Stalker, floor: tell, then a straight lunge that hits Hopper in
// its path and misses when he steps off the line after the tell locks it in.
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'ms1', kind: 'mirrorStalker', x: 0, z: -40 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    tellStart = -1,
    tellEnd = -1;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (prev !== 'tell' && s.state === 'tell') tellStart = i;
    if (prev === 'tell' && s.state !== 'tell') tellEnd = i;
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('mirrorStalker tells before lunging', tellStart >= 0, tellStart);
  c.check(
    'mirrorStalker tell lasts about spec.tell',
    tellEnd > tellStart && Math.abs((tellEnd - tellStart) * dt - SPECS.mirrorStalker.tell) < 0.05,
    `${((tellEnd - tellStart) * dt).toFixed(3)}s vs ${SPECS.mirrorStalker.tell}s`,
  );
  c.check('mirrorStalker lunge hurts Hopper in its path', log.hurts.length > 0 && log.hurts[0].damage === 2, log.hurts);
  c.check('mirrorStalker opens its core after the lunge', s.state === 'recover' && s.open > 0, { state: s.state, open: s.open });
}
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'ms1', kind: 'mirrorStalker', x: 0, z: -40 });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    sidestepped = false;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (!sidestepped && prev === 'tell' && s.state === 'attack') {
      h.x += 40;
      sidestepped = true;
    }
    prev = s.state;
    if (s.state === 'recover') break;
  }
  c.check('mirrorStalker lunge misses when Hopper steps 40m aside', log.hurts.length === 0, log.hurts);
}

// 5. Mirror Stalker, ceiling: hangs at its spawn height, lunges straight
// down at Hopper below it, then flies itself home and idles.
{
  const { world, combat } = arena();
  const h = standing(world, 0, -20);
  combat.spawn({ id: 'ms2', kind: 'mirrorStalker', x: 0, z: -20, y: h.y + 30, mode: 'a', ceiling: true });
  const s = combat.shadows[0];
  const { log, cb } = recorder();
  let prev = s.state,
    tellStart = -1,
    tellEnd = -1,
    attacked = false,
    returned = false;
  for (let i = 0; i < 800; i++) {
    combat.update(dt, h, cb, noAim);
    if (prev !== 'tell' && s.state === 'tell') tellStart = i;
    if (prev === 'tell' && s.state !== 'tell') tellEnd = i;
    if (s.state === 'attack') attacked = true;
    if (attacked && s.state === 'idle') {
      returned = true;
      break;
    }
    prev = s.state;
  }
  c.check('ceiling mirrorStalker stays put at its lintel until it tells', tellStart >= 0, tellStart);
  c.check(
    'ceiling mirrorStalker tell lasts about spec.tell',
    tellEnd > tellStart && Math.abs((tellEnd - tellStart) * dt - SPECS.mirrorStalker.tell) < 0.05,
    `${((tellEnd - tellStart) * dt).toFixed(3)}s vs ${SPECS.mirrorStalker.tell}s`,
  );
  c.check('ceiling mirrorStalker lunge hurts Hopper below it', log.hurts.length > 0 && log.hurts[0].damage === 2, log.hurts);
  c.check(
    'ceiling mirrorStalker returns home and idles',
    returned && Math.hypot(s.x - s.homeX, s.y - s.homeY, s.z - s.homeZ) < 1,
    { x: s.x, y: s.y, z: s.z, homeX: s.homeX, homeY: s.homeY, homeZ: s.homeZ },
  );
  c.check('ceiling mirrorStalker stays grounded=true throughout', s.grounded === true, s.grounded);
}

c.done();
