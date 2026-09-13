// Collision robustness: no pass-through floors, no invisible ceilings. A
// solid top is solid from every side -- rising into its underside stops him,
// falling onto it lands him, regardless of thickness, motion, yaw or the
// approach speed. Uses the shared harness (world/controller only, no DOM)
// the same way mechanics3d.mjs and inversion3d.mjs do.
import { World, stepHopper, createHopperState, MOVE, MISSIONS, dt, blank, checker, districtModule } from './harness3d.mjs';

const { P } = districtModule;
const c = checker('collision3d');
const base = MISSIONS[0][0](); // Sunseed Fields, used as a bare canvas for synthetic colliders
const TX = 1200,
  TZ = -300; // a quiet corner of its terrain, same spot mechanics3d.mjs uses

// ---------------------------------------------------------------------
// 1. The one-way floor: rising into a solid top must never pop him onto it
//    from underneath, and must never let him sail on through untouched.
// ---------------------------------------------------------------------
{
  // A thin overhead deck (1.5 m), positioned just above where a standing
  // Hopper's shoulder reaches (14.4 m -- inside the 1.5 m band between
  // MOVE.height - 1.5, where resolveWalls starts treating a box overhead as
  // a wall, and MOVE.height, where his head reaches it) but comfortably
  // clear of him while he stands still, so there is no contact yet.
  //
  // A spring-pad-style launch (vy set to the pad's own apex speed in one
  // step, exactly as the spring-pad code in stepUpright does, rather than a
  // gradual climb) is the reproduction: before this fix, the ground section
  // never looked past `surface` (which only ever reflects a top within
  // centimetres of his *current* feet), so a rising body's head could cross
  // clean through a solid underside with no stop at all -- the deck was a
  // one-way floor, walked under and popped through from below. This deck's
  // height is picked so his head crosses it on the very first airborne
  // frame, before resolveWalls (which only reacts once his *body*, a lower
  // and later threshold, reaches the box) ever gets a chance to shove him
  // aside and mask the miss.
  const world = new World({ ...base, placements: [] });
  const groundY = world.heightAt(TX, TZ);
  const deckY = groundY + 14.4;
  const deck = world.dropStone(TX, deckY + 0.75, TZ, 1e9);
  deck.collider.hx = 20;
  deck.collider.hz = 20;
  deck.collider.y0 = deckY;
  deck.collider.y1 = deckY + 1.5;

  const s = createHopperState(TX, groundY, TZ, Math.PI);
  s.groundY = s.y;
  const startX = s.x,
    startZ = s.z;
  for (let i = 0; i < 5; i++) stepHopper(s, world, blank, dt);
  c.check('standing under the deck is untouched (real clearance, no wall push)', s.grounded && Math.hypot(s.x - startX, s.z - startZ) < 0.1, { grounded: s.grounded, x: s.x, z: s.z });

  s.vy = Math.sqrt(2 * MOVE.gravity * MOVE.springApex); // the spring pad's own launch speed
  s.grounded = false;
  s.coyote = 0;
  let stoppedUnder = false,
    wentThrough = false;
  for (let i = 0; i < 400 && !stoppedUnder && !wentThrough; i++) {
    stepHopper(s, world, blank, dt);
    if (s.vy === 0 && !s.grounded && s.y < deck.collider.y0) stoppedUnder = true;
    if (s.y > deck.collider.y1 + 0.5 && s.vy > 0) wentThrough = true;
  }
  c.check('a launch under a solid deck stops him under it, not through it', stoppedUnder && !wentThrough, { y: s.y.toFixed(2), vy: s.vy.toFixed(2), deckY0: deck.collider.y0.toFixed(2) });
  c.check('stopping him leaves no sideways teleport', Math.hypot(s.x - startX, s.z - startZ) < 1, { dx: s.x - startX, dz: s.z - startZ });

  // Regression: a genuine small step (a curb, a stair riser) close above his
  // feet must still resolve upward exactly as before -- this is not a
  // ceiling, and the fix must not turn every hop into a stop.
  const step = world.dropStone(TX + 100, groundY + 1.75, TZ, 1e9);
  step.collider.hx = 20;
  step.collider.hz = 20;
  step.collider.y0 = groundY + 1.5;
  step.collider.y1 = groundY + 2;
  const s2 = createHopperState(TX + 100, groundY, TZ, Math.PI);
  s2.groundY = s2.y;
  s2.grounded = false;
  s2.vy = 40; // a small hop, well under the step's 3 m step-up allowance
  let landedOnStep = false;
  for (let i = 0; i < 300 && !landedOnStep; i++) {
    const ev = stepHopper(s2, world, blank, dt);
    if (ev.some((e) => e.kind === 'land') && Math.abs(s2.y - step.collider.y1) < 0.3) landedOnStep = true;
  }
  c.check('a genuine small step still resolves upward', landedOnStep, { y: s2.y.toFixed(2), target: step.collider.y1.toFixed(2) });
}

// ---------------------------------------------------------------------
// 2. Falling through tops: a thin deck at a steep dive, a moving platform,
//    a rotated structure, and the edge of a top within his landing radius.
// ---------------------------------------------------------------------
{
  // A thin (1 m) deck, hit at full dive terminal velocity from far above.
  const world = new World({ ...base, placements: [] });
  const groundY = world.heightAt(TX, TZ);
  const deckY = groundY + 40;
  const deck = world.dropStone(TX, deckY + 0.5, TZ, 1e9);
  deck.collider.hx = 15;
  deck.collider.hz = 15;
  deck.collider.y0 = deckY;
  deck.collider.y1 = deckY + 1;
  const s = createHopperState(TX, deckY + 300, TZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  s.diving = true;
  s.vy = -MOVE.diveTerminal;
  let landed = false,
    passedThrough = false;
  for (let i = 0; i < 1000 && !landed; i++) {
    const ev = stepHopper(s, world, { ...blank, diveHeld: true }, dt);
    if (ev.some((e) => e.kind === 'land') || s.grounded) landed = true;
    if (s.y < deckY - 5) passedThrough = true;
  }
  c.check('a terminal-speed dive lands on a thin deck, not through it', landed && !passedThrough && Math.abs(s.y - deck.collider.y1) < 0.5, { y: s.y.toFixed(2), target: deck.collider.y1.toFixed(2) });
}
{
  // A moving platform, landed on mid-shuttle: its collider is re-placed each
  // world.update(), so the drop has to find wherever it currently is, not
  // where it started.
  const ram = P('structure.fields.terraceStep', TX, TZ, 0, 0, { w: 30, d: 30, h: 5, tiers: 1 }, 'a');
  ram.moving = { to: { x: TX + 200, z: TZ, y: 0 }, speed: 20, dwell: 0 };
  const world = new World({ ...base, placements: [ram] });
  for (let i = 0; i < 60; i++) world.update(dt); // run it partway along its shuttle
  const inst = world.instances.find((i) => i.placement === ram);
  const platX = inst.object.position.x;
  const top = world.groundAt(platX, TZ, 1e6);
  const s = createHopperState(platX, top.y + 60, TZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  let landed = false;
  for (let i = 0; i < 600 && !landed; i++) {
    world.trackHopper(s.x, s.y, s.z);
    world.update(dt);
    const ev = stepHopper(s, world, blank, dt);
    if (ev.some((e) => e.kind === 'land') || s.grounded) landed = true;
  }
  const nowTop = world.groundAt(s.x, s.z, 1e6);
  c.check('a drop lands on a moving platform wherever it now is', landed && Math.abs(s.y - nowTop.y) < 1, { y: s.y.toFixed(2), platformTop: nowTop.y.toFixed(2) });
}
{
  // A yawed structure: its collider footprint is in the structure's own
  // frame (World.local rotates into it), not axis-aligned in world space.
  const yaw = 0.7;
  const slab = P('structure.fields.terraceStep', TX, TZ, 0, yaw, { w: 50, d: 30, h: 6, tiers: 1 }, 'r');
  const world = new World({ ...base, placements: [slab] });
  const top = world.groundAt(TX, TZ, 1e6);
  c.check('the yawed slab has a top over its own centre', top.collider !== null, top);
  const s = createHopperState(TX, top.y + 60, TZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  let landed = false;
  for (let i = 0; i < 600 && !landed; i++) {
    const ev = stepHopper(s, world, blank, dt);
    if (ev.some((e) => e.kind === 'land') || s.grounded) landed = true;
  }
  c.check('a drop lands squarely on a yawed top', landed && Math.abs(s.y - top.y) < 0.5, { y: s.y.toFixed(2), target: top.y.toFixed(2) });
}
{
  // The edge of a top, within landing radius of its rim but past the solid
  // box itself -- groundAt's own footprint margin (hx + radius) is what
  // makes a jump onto the lip of a platform read as solid.
  const world = new World({ ...base, placements: [] });
  const groundY = world.heightAt(TX, TZ);
  const slab = world.dropStone(TX, groundY + 10.5, TZ, 1e9);
  slab.collider.hx = 10;
  slab.collider.hz = 10;
  slab.collider.y0 = groundY + 10;
  slab.collider.y1 = groundY + 11;
  const edgeX = TX + slab.collider.hx + 1.5; // just past the box, inside the landing margin
  const s = createHopperState(edgeX, slab.collider.y1 + 60, TZ, Math.PI);
  s.groundY = s.y;
  s.grounded = false;
  let landed = false;
  for (let i = 0; i < 600 && !landed; i++) {
    const ev = stepHopper(s, world, blank, dt);
    if (ev.some((e) => e.kind === 'land') || s.grounded) landed = true;
  }
  c.check('a drop just past the edge still catches the top', landed && Math.abs(s.y - slab.collider.y1) < 0.5, { y: s.y.toFixed(2), target: slab.collider.y1.toFixed(2) });
}

// ---------------------------------------------------------------------
// 3. Sweep every district: drop onto every structure collider's top from
//    60 m up and confirm the landing, skipping colliders that legitimately
//    are not one (moving, under another top, thinner than 0.3 m, or -- a
//    harbor's sunken debris -- entirely below a soft floor's level).
//
//    Baked (delivered-model) colliders are excluded here: collision.json is
//    a voxel column per ~2 m, so a district can carry thousands of them
//    (one delivered structure alone bakes to 100-600), and dropping onto
//    every single one from 60 m is not this test's job at that density --
//    qa/tests/delivered-collision.mjs checks those against the baked data
//    directly instead, at a sane sample rate.
// ---------------------------------------------------------------------
{
  const perDistrict = [];
  let totalPass = 0,
    totalFail = 0;
  const failNote = [];
  for (const factory of MISSIONS.flat()) {
    const district = factory();
    const world = new World(district);
    let pass = 0,
      fail = 0;
    for (const col of world.colliders) {
      if (col.baked) continue;
      if (col.instance?.moving) continue;
      if (col.y1 - col.y0 < 0.3) continue;
      const cos = Math.cos(col.yaw),
        sin = Math.sin(col.yaw);
      const wx = col.cx + col.ox * cos - col.oz * sin,
        wz = col.cz + col.ox * sin + col.oz * cos;
      const terrainY = world.heightAt(wx, wz);
      if (col.y1 <= terrainY + 0.1) continue; // not above terrain: not a landing test at all
      if (world.soft && col.y1 < world.soft.level) continue; // sunken debris under a soft floor
      // Under another collider's top (a lower ledge inside a taller tower),
      // or under a taller sibling part of its own instance (a roof cone over
      // a wall box): not the reachable topmost thing at this point.
      const above = world.groundAt(wx, wz, 1e6, 5);
      if (above.collider !== col && above.y > col.y1 + 0.5) continue;
      let buriedBySibling = false;
      for (const o of world.colliders) {
        if (o === col || o.instance !== col.instance) continue;
        if (o.y1 <= col.y1 + 0.3) continue;
        const [olx, olz] = World.local(o, wx, wz);
        if (Math.abs(olx) <= o.hx + 3 && Math.abs(olz) <= o.hz + 3) {
          buriedBySibling = true;
          break;
        }
      }
      if (buriedBySibling) continue;
      const s = createHopperState(wx, col.y1 + 60, wz, Math.PI);
      s.groundY = s.y;
      s.grounded = false;
      let landedAt = null;
      for (let i = 0; i < 1200 && landedAt === null; i++) {
        const ev = stepHopper(s, world, blank, dt);
        if (ev.some((e) => e.kind === 'land' || e.kind === 'spring') || s.grounded) landedAt = s.y;
      }
      if (landedAt !== null && Math.abs(landedAt - col.y1) < 0.5) pass++;
      else {
        fail++;
        if (failNote.length < 8) failNote.push(`${district.name}/${col.owner} @ (${wx.toFixed(0)},${wz.toFixed(0)}) top ${col.y1.toFixed(1)} landed ${landedAt === null ? 'never' : landedAt.toFixed(1)}`);
      }
    }
    perDistrict.push(`${district.name} ${pass}/${pass + fail}`);
    totalPass += pass;
    totalFail += fail;
  }
  c.check('every district lands on every eligible structure top', totalFail === 0, failNote.join('; ') || 'none');
  c.done(`district sweep ${totalPass}/${totalPass + totalFail} landings — ${perDistrict.join(', ')}`);
}
