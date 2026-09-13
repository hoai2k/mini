// Inverted gravity: flip volumes (seams, a cantor's song, the Regent's turn)
// pull Hopper up to land on undersides; leaving one drops him back down.
import { World, stepHopper, createHopperState, predictLanding, MOVE, MISSIONS, dt, blank, checker } from './harness3d.mjs';

const c = checker('inversion3d');
const d = MISSIONS[2][2]();
const world = new World(d);

// Every seam stands as a permanent flip volume.
const seams = d.placements.filter((p) => p.id === 'structure.violet.gravitySeam').length;
c.check('each gravity seam is a standing flip volume', world.flips.length === seams && world.flips.every((f) => f.life === Infinity), `${world.flips.length} flips for ${seams} seams`);
world.update(1);
c.check('standing flips outlive the world update', world.flips.length === seams);

// A sung flip is temporary.
world.flip(200, 200, 30, 0, 80, 4);
c.check('a cantor flip is in the list', world.flips.length === seams + 1 && world.flipAt(200, 40, 200));
for (let i = 0; i < 5; i++) world.update(1);
c.check('a cantor flip ends with its life', world.flips.length === seams && !world.flipAt(200, 40, 200));

// The first arch: hop into the seam's volume and fall up onto the lintel.
const ax = 0,
  az = -140,
  ground = world.heightAt(ax, az);
const ceiling = world.ceilingAt(ax, az, ground + 20).y;
c.check('the arch has an underside over the seam', Number.isFinite(ceiling) && ceiling > ground + 60 && ceiling < ground + 90, ceiling - ground);
c.check('walking under the seam is not inside its volume', !world.flipAt(ax, ground + MOVE.height * 0.5, az));
c.check('a hop under the seam enters its volume', world.flipAt(ax, ground + 20, az));
c.check('the lintel top is outside the seam', !world.flipAt(ax, world.groundAt(ax, az, 1e5).y - MOVE.height * 0.5, az));

const h = createHopperState(ax, ground + 20, az, Math.PI);
h.grounded = false;
h.coyote = 0;
// As the engine does each frame: the flip's sign, and the turn costs speed.
const gravityOf = () => {
  const g = world.flipAt(h.x, h.y + MOVE.height * 0.5, h.z) || world.flipAt(h.x, h.y - MOVE.height * 0.5, h.z) ? -0.85 : 0.85;
  if (g < 0 !== h.gravityScale < 0) {
    h.grounded = false;
    h.coyote = 0;
    h.vy *= 0.5;
  }
  return g;
};
const run = (seconds, intent = blank) => {
  for (let t = 0; t < seconds; t += dt) {
    h.gravityScale = gravityOf();
    stepHopper(h, world, intent, dt);
  }
};
run(3);
c.check('he falls up and lands on the lintel underside', h.grounded && Math.abs(h.y - ceiling) < 0.5 && h.gravityScale < 0, `y ${h.y.toFixed(1)} ceiling ${ceiling.toFixed(1)} grounded ${h.grounded}`);
c.check('the ground under his feet reads the underside', Math.abs(h.groundY - ceiling) < 0.5);
c.check('predictLanding upside down predicts the underside', Math.abs(predictLanding(h, world).y - ceiling) < 1);

// A jump off the ceiling is downward and comes back.
const jumped = { ...blank, jumpPressed: true, jumpHeld: true };
h.gravityScale = gravityOf();
stepHopper(h, world, jumped, dt);
c.check('a jump off the underside is downward', !h.grounded && h.vy < 0, h.vy);
run(2.5);
c.check('and he lands back on the underside', h.grounded && Math.abs(h.y - ceiling) < 0.5, `y ${h.y.toFixed(1)}`);

// A run off the lintel's edge carries him out of the seam's disc: gravity is
// his own again and he lands on the ground the right way up.
run(0.5, { ...blank, dx: 0, dz: 1 });
c.check('a run off the lintel leaves him airborne', !h.grounded, `y ${h.y.toFixed(1)}`);
run(4);
const floor = world.groundAt(h.x, h.z, h.y + 1).y;
c.check('out of the seam he lands on the ground the right way up', h.grounded && Math.abs(h.y - floor) < 0.5 && h.gravityScale > 0 && Math.hypot(h.x, h.z + 140) > 40, `y ${h.y.toFixed(1)} floor ${floor.toFixed(1)} g ${h.gravityScale}`);

// The Regent's canopy over the dais.
const canopy = world.ceilingAt(0, -2140, 200).y;
c.check('the eclipse canopy hangs at 280 over the dais', Math.abs(canopy - 280) < 0.5, canopy);
c.check('the canopy covers the dais out to its rim', Math.abs(world.ceilingAt(30, -2140, 200).y - 280) < 0.5 && Math.abs(world.ceilingAt(0, -2110, 200).y - 280) < 0.5);

c.done();
