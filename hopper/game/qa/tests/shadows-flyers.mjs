// Node test for the five flyer shadows of missions two and three (chainManta,
// turbineWasp, veilMedusa, phaseSkate, gravityCantor), against a Sunseed
// Fields world. See src/game3d/shadows/flyers.ts and LEVEL-PLAN-M2-M3.md.
import { World, Combat, sunseedFields, BEHAVIOURS, dt, noAim, recorder, checker, standing } from './harness3d.mjs';

// ---------------------------------------------------------------------
// Chain Manta: tell -> drags the nearest moving structure (boosting it and
// opening its tether node) -> recover.
// ---------------------------------------------------------------------
{
  const c = checker('chainManta');
  const base = sunseedFields();
  const district = {
    ...base,
    // A moving structure within reach of where Hopper stands, so the manta
    // has something to drag instead of falling back to a dive.
    placements: [...base.placements, { id: 'structure.fields.terraceStep', x: 0, z: -60, moving: { to: { x: 60, z: -60 }, speed: 4 } }],
    shadows: [{ id: 'm1', kind: 'chainManta', x: 0, z: -100, y: 60, mode: 'a' }],
  };
  const world = new World(district);
  const combat = new Combat(world, district);
  const m1 = combat.shadows.find((s) => s.id === 'm1');
  const h = standing(world, 0, -60);
  const { cb } = recorder();
  const inst = world.instances.find((i) => i.moving);
  c.check('the district has a moving instance to drag', !!inst, world.instances.length);
  const states = [];
  let boosted = false,
    openDuringAttack = false;
  for (let i = 0; i < 900; i++) {
    combat.update(dt, h, cb, noAim);
    world.update(dt);
    if (states.at(-1) !== m1.state) states.push(m1.state);
    if (inst.moving.boost > 0) boosted = true;
    if (m1.state === 'attack' && m1.open > 0) openDuringAttack = true;
  }
  c.check('manta reaches tell', states.includes('tell'), states);
  c.check('manta reaches attack', states.includes('attack'), states);
  c.check('manta boosts the moving instance it drags', boosted, boosted);
  c.check('manta\'s tether node is open through the attack', openDuringAttack, openDuringAttack);
  c.check('manta recovers and returns to idle', states.at(-1) === 'idle' || states.includes('recover'), states);
  c.done();
}

// ---------------------------------------------------------------------
// Turbine Wasp: tell -> dash (>60 m/s) -> recover; a kick stalls it as a
// platform for about 5s with its core open, then it resumes.
// ---------------------------------------------------------------------
{
  const c = checker('turbineWasp');
  const district = { ...sunseedFields(), shadows: [{ id: 'w1', kind: 'turbineWasp', x: 0, z: -100, y: 40, mode: 'a' }] };
  const world = new World(district);
  const combat = new Combat(world, district);
  const w1 = combat.shadows.find((s) => s.id === 'w1');
  const h = standing(world, 0, -70);
  const { cb } = recorder();
  const states = [];
  let dashSpeedSeen = false;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (states.at(-1) !== w1.state) states.push(w1.state);
    if (w1.state === 'attack' && Math.hypot(w1.vx, w1.vy, w1.vz) > 60) dashSpeedSeen = true;
  }
  c.check('wasp reaches tell', states.includes('tell'), states);
  c.check('wasp reaches attack', states.includes('attack'), states);
  c.check('wasp dash speed exceeds 60 m/s', dashSpeedSeen, dashSpeedSeen);

  BEHAVIOURS.turbineWasp.onKick(combat.context(w1, h, cb, dt));
  c.check('a kick stalls the wasp', w1.state === 'stalled', w1.state);
  let stalledFor = 0,
    resumedAt = null;
  for (let i = 0; i < 800 && resumedAt === null; i++) {
    combat.update(dt, h, cb, noAim);
    if (w1.state === 'stalled' && w1.open > 0) stalledFor += dt;
    else if (w1.state !== 'stalled') resumedAt = i / 120;
  }
  c.check('the stall holds the core open for about 5s', stalledFor > 4.5 && stalledFor < 5.2, stalledFor);
  c.check('the wasp resumes once the stall ends', resumedAt !== null, resumedAt);
  c.done();
}
{
  // A stomp while stalled does nothing extra (the generic stomp already
  // dealt full damage); it stays a platform.
  const c = checker('turbineWasp onStomp');
  const district = { ...sunseedFields(), shadows: [{ id: 'w2', kind: 'turbineWasp', x: 0, z: -100, y: 40, mode: 'a' }] };
  const world = new World(district);
  const combat = new Combat(world, district);
  const w2 = combat.shadows.find((s) => s.id === 'w2');
  const h = standing(world, 0, -70);
  const { cb } = recorder();
  w2.state = 'stalled';
  w2.stall = 3;
  w2.open = 3;
  BEHAVIOURS.turbineWasp.onStomp(combat.context(w2, h, cb, dt));
  c.check('a stomp while stalled leaves it stalled', w2.state === 'stalled', w2.state);
  c.done();
}

// ---------------------------------------------------------------------
// Veil Medusa: the radial pulse hurts within 24m and misses at 40m. The
// shadow is placed straight into 'tell' so the pulse fires at a fixed
// distance rather than after it has drifted closer.
// ---------------------------------------------------------------------
{
  const c = checker('veilMedusa');
  const hurtsAt = (dist) => {
    const district = { ...sunseedFields(), shadows: [{ id: 'v1', kind: 'veilMedusa', x: 0, z: -100, y: 30, mode: 'a' }] };
    const world = new World(district);
    const combat = new Combat(world, district);
    const v1 = combat.shadows.find((s) => s.id === 'v1');
    const h = standing(world, 0, -100 + dist);
    // Level with the medusa's centre, so d3 equals the horizontal distance.
    h.y = v1.y + v1.height * 0.5 - 7;
    h.groundY = h.y;
    v1.state = 'tell';
    v1.timer = 0.8;
    v1.cooldown = 0;
    const { cb, log } = recorder();
    for (let i = 0; i < 150; i++) combat.update(dt, h, cb, noAim);
    return log.hurts.length > 0;
  };
  c.check('medusa hurts within 24m', hurtsAt(20), hurtsAt(20));
  c.check('medusa does not hurt at 40m', !hurtsAt(40), hurtsAt(40));
  c.done();
}

// ---------------------------------------------------------------------
// Phase Skate: it vanishes from targets() while phased, then reappears with
// an open core for the free stomp during its silhouette.
// ---------------------------------------------------------------------
{
  const c = checker('phaseSkate');
  const district = { ...sunseedFields(), shadows: [{ id: 'p1', kind: 'phaseSkate', x: 0, z: -100, y: 30, mode: 'a' }] };
  const world = new World(district);
  const combat = new Combat(world, district);
  const p1 = combat.shadows.find((s) => s.id === 'p1');
  const h = standing(world, 0, -60);
  const { cb } = recorder();
  const states = [];
  let phasedAbsent = false,
    silhouetteOpen = false;
  for (let i = 0; i < 500; i++) {
    combat.update(dt, h, cb, noAim);
    if (states.at(-1) !== p1.state) states.push(p1.state);
    if (p1.state === 'phased' && !combat.targets().includes(p1)) phasedAbsent = true;
    if (p1.state === 'silhouette' && p1.open > 0 && combat.targets().includes(p1)) silhouetteOpen = true;
  }
  c.check('skate reaches phased', states.includes('phased'), states);
  c.check('skate reaches silhouette', states.includes('silhouette'), states);
  c.check('skate reaches attack', states.includes('attack'), states);
  c.check('a phased skate is absent from targets()', phasedAbsent, phasedAbsent);
  c.check('a silhouette skate is present with an open core', silhouetteOpen, silhouetteOpen);
  c.done();
}

// ---------------------------------------------------------------------
// Gravity Cantor: its attack flips gravity in a cylinder that expires after
// 4s of world time.
// ---------------------------------------------------------------------
{
  const c = checker('gravityCantor');
  const district = { ...sunseedFields(), shadows: [{ id: 'g1', kind: 'gravityCantor', x: 0, z: -100, y: 60, mode: 'a' }] };
  const world = new World(district);
  const combat = new Combat(world, district);
  const g1 = combat.shadows.find((s) => s.id === 'g1');
  const h = standing(world, 0, -60);
  const { cb } = recorder();
  const states = [];
  for (let i = 0; i < 350; i++) {
    combat.update(dt, h, cb, noAim);
    if (states.at(-1) !== g1.state) states.push(g1.state);
  }
  c.check('cantor reaches tell', states.includes('tell'), states);
  c.check('cantor reaches attack', states.includes('attack'), states);
  const y = world.heightAt(g1.x, g1.z);
  c.check('gravity is flipped under the cantor', world.flipAt(g1.x, y, g1.z), world.flips);
  c.check('gravity is not flipped 60m away', !world.flipAt(g1.x + 60, y, g1.z), world.flips);
  for (let i = 0; i < Math.round(4.1 * 120); i++) world.update(dt);
  c.check('the flip expires after 4s', !world.flipAt(g1.x, y, g1.z), world.flips.length);
  c.done();
}
