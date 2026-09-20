// Node tests for the four traversal mechanics the mission-two and -three
// districts need: soft floors, conveyors, press rams and the staged bridge.
// Uses the shared harness (world/controller only, no DOM) the same way
// engine3d.mjs does, and builds each scenario from a copy of Sunseed
// Fields' own district with a small synthetic placements list.
import { World, stepHopper, createHopperState, MOVE, districtModule, dt, blank, checker, standing } from './harness3d.mjs';

const { sunseedFields, P } = districtModule;
const base = sunseedFields();
const c = checker('mechanics3d');

// A quiet corner of Sunseed Fields' terrain: off the route, the authored
// placements and the generated middle-distance scenery, so a synthetic
// placement here never collides with anything but its own colliders.
const TX = 1200,
  TZ = -300;

// ---------------------------------------------------------------------
// 1. Soft floors
// ---------------------------------------------------------------------
{
  const probe = new World(base);
  const groundHeight = probe.heightAt(TX, TZ);
  c.check('the test spot is bare terrain', probe.groundAt(TX, TZ, 1e6).collider === null, probe.groundAt(TX, TZ, 1e6));
  const level = groundHeight + 150;

  // 1a. Slag: a fall below the level is lifted back out within 3s, and the
  // 'soft' event fires once on the way up (it fires again on the next dip,
  // the intended bobbing, but that is after this check has already passed).
  {
    const district = { ...base, placements: [], terrain: { ...base.terrain, soft: { kind: 'slag', level, lift: 28 } } };
    const world = new World(district);
    const s = createHopperState(TX, level - 20, TZ, Math.PI);
    s.grounded = false;
    let events = 0,
      seconds = null;
    for (let i = 0; i < 360 && seconds === null; i++) {
      const ev = stepHopper(s, world, blank, dt);
      for (const e of ev) if (e.kind === 'soft') events++;
      if (s.y > level) seconds = (i + 1) * dt;
    }
    c.check('slag lifts a dropped Hopper back above the level within 3s', seconds !== null && seconds < 3, seconds);
    c.check("fires the 'soft' event once on the way up", events === 1, events);
  }

  // 1b. Sea with a shore: pushed horizontally toward the trail at 12 m/s.
  {
    const district = { ...base, placements: [], terrain: { ...base.terrain, soft: { kind: 'sea', level, lift: 14, shore: true } } };
    const world = new World(district);
    const s = createHopperState(TX, level - 5, TZ, Math.PI);
    s.grounded = false;
    const hit = world.route.nearest(s.x, s.z);
    stepHopper(s, world, blank, dt);
    const speed = Math.hypot(s.vx, s.vz);
    const towardRoute = (s.vx * (hit.x - TX) + s.vz * (hit.z - TZ)) > 0;
    c.check('the sea pushes toward the route at 12 m/s', Math.abs(speed - 12) < 0.5 && towardRoute, { vx: s.vx, vz: s.vz, hit });
  }

  // 1c. A barge (a structure at the soft level, mode 'a') is solid ground:
  // a Hopper landing on it never dips into the lift.
  {
    const barge = P('structure.fields.terraceStep', TX, TZ, level, 0, { w: 40, d: 30, h: 5, tiers: 1 }, 'a');
    const district = { ...base, placements: [barge], terrain: { ...base.terrain, soft: { kind: 'slag', level, lift: 28 } } };
    const world = new World(district);
    const top = world.groundAt(TX, TZ, 1e6);
    c.check('the barge is solid ground above the soft level', top.collider !== null && top.y > level, top);
    const s = createHopperState(TX, top.y + 30, TZ, Math.PI);
    s.grounded = false;
    let landed = false,
      wentSoft = false;
    for (let i = 0; i < 300 && !landed; i++) {
      const ev = stepHopper(s, world, blank, dt);
      if (ev.some((e) => e.kind === 'land')) landed = true;
      if (ev.some((e) => e.kind === 'soft')) wentSoft = true;
    }
    c.check('lands on the barge normally', landed && Math.abs(s.y - top.y) < 1, s.y - top.y);
    c.check('never dips into the soft lift over the barge', !wentSoft, wentSoft);
  }
}

// ---------------------------------------------------------------------
// 2. Conveyors
// ---------------------------------------------------------------------
{
  const probe = new World(base);
  const groundHeight = probe.heightAt(TX, TZ);
  // terraceStep is a delivered structure: its collision is baked from the
  // real (fixed-size) model, not sized by `opts` any more, so a synthetic
  // "conveyor" placed on it is only as big as the real model's own natural
  // footprint (~62 x 41 m -- manifest.json M-024) regardless of w/d/tiers.
  // The requested opts are kept (matching how a real conveyor is authored)
  // but the carry distance tested is well inside that real footprint,
  // rather than the 240 m belt this test used before delivery.
  const belt = P('structure.fields.terraceStep', TX, TZ, groundHeight, 0, { w: 40, d: 240, h: 5, tiers: 1 }, 'a');
  belt.flow = { dx: 0, dz: -1, speed: 8 };
  const world = new World({ ...base, placements: [belt] });
  const s = standing(world, TX, TZ);
  const startZ = s.z;
  for (let i = 0; i < 120; i++) {
    // The carry the engine does each step: track Hopper, advance the world,
    // then a grounded Hopper is carried by whatever collider is under him.
    world.trackHopper(s.x, s.y, s.z);
    world.update(dt);
    if (s.grounded) {
      const under = world.groundAt(s.x, s.z, s.y + 0.5).collider;
      const flow = under?.instance?.flow;
      if (flow && Math.abs(under.y1 - s.y) < 1) {
        s.x += flow.dx * flow.speed * dt;
        s.z += flow.dz * flow.speed * dt;
      }
    }
    stepHopper(s, world, blank, dt);
  }
  const moved = startZ - s.z;
  c.check('a conveyor carries a grounded Hopper along its flow, no stick input', s.grounded && Math.abs(moved - 8) < 2, moved);

  // A conveyor placed at a right angle turns its local flow into world space.
  const yawed = P('structure.fields.terraceStep', TX + 400, TZ, groundHeight, Math.PI / 2, { w: 20, d: 20, h: 5, tiers: 1 }, 'a');
  yawed.flow = { dx: 1, dz: 0, speed: 10 };
  const worldY = new World({ ...base, placements: [yawed] });
  const instY = worldY.instances.find((i) => i.placement === yawed);
  c.check('the flow direction is rotated by the placement yaw', Math.abs(instY.flow.dx) < 0.05 && Math.abs(instY.flow.dz - 1) < 0.05, instY.flow);
}

// ---------------------------------------------------------------------
// 3. Press rams
// ---------------------------------------------------------------------
{
  const ram = P('structure.fields.terraceStep', TX, TZ, 0, 0, { w: 30, d: 30, h: 5, tiers: 1 }, 'a');
  ram.moving = { to: { x: TX, z: TZ, y: 20 }, speed: 40, dwell: 0, fling: true };
  const world = new World({ ...base, placements: [ram] });
  const s = standing(world, TX, TZ);

  // The carry the engine does each step, including the launch.
  world.trackHopper(s.x, s.y, s.z);
  world.update(dt);
  const under = world.groundAt(s.x, s.z, s.y + 0.5).collider;
  const m = under?.instance?.moving;
  c.check('the ram is rising fast enough to fling (vy > 15)', !!m && m.fling && m.vy > 15, m && m.vy);
  let launched = false;
  if (m && Math.abs(under.y1 - s.y) < 1) {
    s.x += m.dx;
    s.y += m.dy;
    s.z += m.dz;
    if (m.fling && m.vy > 15) {
      s.vy = m.vy + 30;
      s.grounded = false;
      s.coyote = 0;
      s.hold = MOVE.holdWindow;
      s.holding = false;
      s.move = 'jump';
      s.events.push({ kind: 'spring' });
      launched = true;
    }
  }
  c.check('a fling ram launches Hopper with vy > 40', launched && s.vy > 40, s.vy);
  c.check('the launch is a spring event (sound and HUD as a pad)', s.events.some((e) => e.kind === 'spring'), s.events);
}

// ---------------------------------------------------------------------
// 4. Staged bridge
// ---------------------------------------------------------------------
{
  const bx = 0,
    bz = -300;
  const gh = new World(base).heightAt(bx, bz);
  // Placed high over the terrain (mode 'a'), like a span over a drop.
  const bridge = { id: 'structure.red.coralBridge', x: bx, z: bz, y: gh + 60, yaw: 0, mode: 'a', opts: { length: 140, width: 12 }, staged: { stages: 3, after: 1.2 } };
  const world2 = new World({ ...base, placements: [bridge] });
  const inst = world2.instances.find((i) => i.placement === bridge);
  c.check('a staged placement is split into 3 stages', !!inst.stages && inst.stages.length === 3, inst.stages?.length);

  const farX = bx + 46, // the far third, where Hopper stands
    nearX = bx - 46; // the near third, behind him
  const farTop = world2.groundAt(farX, bz, 1e6);
  c.check('the far stage is solid deck well above the terrain', farTop.collider !== null && farTop.y > gh + 10, farTop);
  const s = createHopperState(farX, farTop.y, bz, Math.PI);
  s.groundY = s.y;
  for (let i = 0; i < 200; i++) {
    world2.trackHopper(s.x, s.y, s.z);
    world2.update(dt);
    stepHopper(s, world2, blank, dt);
  }
  c.check('the stage behind him drops after `after` seconds', inst.stages[0].state === 'fallen', inst.stages.map((st) => st.state));
  const ghNear = world2.heightAt(nearX, bz);
  const afterDrop = world2.groundAt(nearX, bz, 1e6);
  c.check('groundAt there now returns the terrain', afterDrop.collider === null && Math.abs(afterDrop.y - ghNear) < 1, afterDrop);
  world2.resetStages();
  const restored = world2.groundAt(nearX, bz, 1e6);
  c.check('resetStages() brings the deck back', restored.collider !== null && restored.y > ghNear + 10, restored);
}

// ---------------------------------------------------------------------
// 5. Steps and walls: what stops Hopper and what he walks over
// ---------------------------------------------------------------------
// A box shorter than `MOVE.stepOver` is not a wall at all: he runs over it,
// and a flat spring launched into it is not blocked by it. A box taller than
// `MOVE.climbTall` is a wall: it stops a run, and is taken hold of only from
// the air.
{
  const world = new World({ ...base, placements: [] });
  const gy = world.heightAt(TX, TZ);
  // A bar across his path, 26 m ahead of where he starts, wide enough that
  // he cannot go round it inside the run below.
  const bar = (height) => {
    const w = new World({ ...base, placements: [] });
    w.addCollider(
      { owner: 'test', cx: TX, cz: TZ - 26, yaw: 0, ox: 0, oz: 0, hx: 60, hz: 3, y0: gy - 30, y1: gy + height },
      null,
    );
    return w;
  };
  // Run due -Z into it for two seconds. Reports how far past the start he
  // got, and how high his feet were while he was actually over the bar.
  const runInto = (w) => {
    const s = standing(w, TX, TZ);
    const face = s.yaw;
    const z0 = s.z;
    let over = null;
    for (let i = 0; i < 240; i++) {
      stepHopper(s, w, { ...blank, dz: -1, faceYaw: face }, dt);
      if (Math.abs(s.z - (TZ - 26)) < 3) over = over === null ? s.y - gy : Math.max(over, s.y - gy);
    }
    return { s, gained: z0 - s.z, over };
  };

  const kerb = MOVE.stepOver - 1.5;
  const low = runInto(bar(kerb));
  c.check('a kerb does not stop a run', low.gained > 120, `${low.gained.toFixed(0)} m past it`);
  c.check('and crossing it puts his feet on its top', low.over !== null && low.over > kerb - 1.5, `${low.over === null ? 'never over it' : low.over.toFixed(1)} of ${kerb}`);

  const wall = MOVE.climbTall + 6;
  const high = runInto(bar(wall));
  c.check('a wall stops a run', high.gained < 30, `${high.gained.toFixed(0)} m past it`);
  c.check('and running into it never takes hold', !high.s.climbing, high.s.move);

  // A flat spring launched into a kerb clears it rather than being stopped
  // dead by it: a small thing in front of his legs is not a block on a jump.
  {
    const w = bar(kerb);
    const s = standing(w, TX, TZ);
    const face = s.yaw;
    const z0 = s.z;
    // Run up, then a full forward wind: the flattest, fastest launch there is.
    for (let i = 0; i < 180; i++) stepHopper(s, w, { ...blank, dz: -1, faceYaw: face }, dt);
    for (let i = 0; i < 600; i++)
      stepHopper(s, w, { ...blank, dz: -1, faceYaw: face, jumpPressed: i === 0, jumpHeld: i * dt < MOVE.chargeTime }, dt);
    c.check('a flat spring is not blocked by a kerb in front of his legs', z0 - s.z > 200, `${(z0 - s.z).toFixed(0)} m`);
  }
}

c.done();
