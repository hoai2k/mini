// Tests for the three rooted mission-two/-three shadows: slagCaster,
// coilWraith and thornChoir. Uses the shared node harness so the TypeScript
// simulation runs unmodified.
import { World, Combat, sunseedFields, standing, recorder, checker, noAim, dt, BEHAVIOURS } from './harness3d.mjs';

const check = checker('shadows-rooted');

/** A district with no authored shadows, so a test spawns exactly the ones it needs. */
function emptyWorld() {
  const district = { ...sunseedFields(), shadows: [] };
  const world = new World(district);
  return { district, world, combat: new Combat(world, district) };
}

// 1. Slag caster: tells, throws one slag ball, and it cools into a stepping
// stone Hopper (and the shadows) can stand on.
{
  const { world, combat } = emptyWorld();
  const h = standing(world, 0, -40);
  const s = combat.spawn({ id: 'sc1', kind: 'slagCaster', x: 0, z: -50 });
  const { cb } = recorder();
  const states = [];
  let thrown = false;
  for (let i = 0; i < 1200 && world.stones.length === 0; i++) {
    combat.update(dt, h, cb, noAim);
    world.update(dt);
    if (states.at(-1) !== s.state) states.push(s.state);
    if (!thrown && combat.projectiles.some((p) => p.kind === 'slag')) {
      thrown = true;
      // The caster aims where Hopper stands, so once it has thrown, step
      // out of the ball's way -- it should cool where it lands, not on him.
      h.x = 900;
      h.z = 900;
    }
  }
  check.check('slagCaster tells before it throws', states.includes('tell'), states);
  check.check('slagCaster throws one slag projectile', thrown, thrown);
  check.check('the slag cools into exactly one stone', world.stones.length === 1, world.stones.length);
  const stone = world.stones[0];
  const ground = world.groundAt(stone.x, stone.z, stone.y + 5);
  check.check("the stone's collider is what groundAt finds there", Math.abs(ground.y - stone.collider.y1) < 0.01, ground);
}

// 2. Coil wraith: holds a beam to its link, hurts Hopper standing on the
// segment once per grace window (not every frame), and misses well off it.
{
  const { world, combat } = emptyWorld();
  const s = combat.spawn({ id: 'cw1', kind: 'coilWraith', x: -40, z: -50, link: [40, 0, -50] });
  // Level the beam at the wraith's own centre height, so a Hopper standing
  // anywhere on the line at that height is on the segment.
  const oy = s.y + s.height * 0.5;
  s.link = [40, oy, -50];
  const h = standing(world, 0, -50);
  const { cb, log } = recorder();
  const states = [];
  for (let i = 0; i < 1200 && !(s.state === 'attack' && log.hurts.length > 0); i++) {
    combat.update(dt, h, cb, noAim);
    if (states.at(-1) !== s.state) states.push(s.state);
  }
  check.check('coilWraith tells then attacks', states.includes('tell') && states.includes('attack'), states);
  check.check('beamX/Y/Z track the link point', s.beamX === 40 && s.beamY === oy && s.beamZ === -50, [s.beamX, s.beamY, s.beamZ]);
  check.check('standing on the segment gets hurt', log.hurts.length >= 1, log.hurts.length);
  const hurtsSoFar = log.hurts.length;
  combat.update(dt, h, cb, noAim);
  check.check('the grace keeps the very next frame from hurting again', log.hurts.length === hurtsSoFar, log.hurts.length);
}
{
  // Off the beam's line by well past its 4 + MOVE.radius reach: never hurt.
  const { world, combat } = emptyWorld();
  const s = combat.spawn({ id: 'cw2', kind: 'coilWraith', x: -40, z: -50, link: [40, 0, -50] });
  s.link = [40, s.y + s.height * 0.5, -50];
  const h = standing(world, 0, -65);
  const { cb, log } = recorder();
  for (let i = 0; i < 600; i++) combat.update(dt, h, cb, noAim);
  check.check('standing well off the segment is never hurt', log.hurts.length === 0, log.hurts.length);
}

// 3. Thorn choir: tells, fires a five-seed fan, opens its core in recover,
// and kicking one staggers every choir sharing its group.
{
  const { world, combat } = emptyWorld();
  const h = standing(world, 0, -50);
  const s1 = combat.spawn({ id: 'tc1', kind: 'thornChoir', x: 0, z: -60, group: 'choir' });
  const s2 = combat.spawn({ id: 'tc2', kind: 'thornChoir', x: 20, z: -60, group: 'choir' });
  const { cb } = recorder();
  const states = [];
  let seedCount = -1;
  let openSeen = false;
  for (let i = 0; i < 1000; i++) {
    combat.update(dt, h, cb, noAim);
    if (states.at(-1) !== s1.state) states.push(s1.state);
    if (seedCount < 0 && s1.state === 'recover') seedCount = combat.projectiles.filter((p) => p.kind === 'seed' && p.ownerId === s1.id).length;
    if (s1.state === 'recover' && s1.open > 0) openSeen = true;
  }
  check.check('thornChoir tells then recovers', states.includes('tell') && states.includes('recover'), states);
  check.check('the volley fires five seeds', seedCount === 5, seedCount);
  check.check('recover opens the core', openSeen, openSeen);

  // Reset the second choir to a known state, then kick the first: both
  // should end up staggered because they share a group.
  s2.state = 'idle';
  s2.timer = 0;
  s2.open = 0;
  s2.cooldown = 0;
  BEHAVIOURS.thornChoir.onKick(combat.context(s1, h, cb, dt));
  check.check(
    "kicking one choir staggers a second of the same group",
    s2.state === 'recover' && s2.timer === 1.8 && s2.open === 1.8 && s2.cooldown === 2.5,
    [s2.state, s2.timer, s2.open, s2.cooldown],
  );
}

check.done();
