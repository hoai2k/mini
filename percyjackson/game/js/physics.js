// Voxel collision for characters: axis-separated sweep of a box against solid
// blocks, automatic 1-block step-up (smoothed visually), gravity, falling off
// ledges into pits, and water slowdown.
import { BLOCKS } from './world/blocks.js';

const GRAV = 32;

// The floating platform (a boat, world.platforms) whose deck is under (x, z)
// for a body of radius r. A platform: { x, z, rot, hx, hz, top, vel, load }.
export function platformAt(world, x, z, r = 0.3) {
  const list = world.platforms;
  if (!list?.length) return null;
  for (const b of list) {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.rot), s = Math.sin(b.rot);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) <= b.hx && Math.abs(lz) <= b.hz + r * 0.4) return b;
  }
  return null;
}

function boxHits(world, x, y, z, r, h) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-4);
  const z0 = Math.floor(z - r), z1 = Math.floor(z + r - 1e-4);
  const y0 = Math.floor(y + 0.01), y1 = Math.floor(y + h - 0.01);
  for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) {
    const id = world.get(bx, by, bz);
    if (id && BLOCKS[id].solid) return true;
  }
  return false;
}
export { boxHits };

// Solid block in the layer containing height y (under the footprint)?
function feetHit(world, x, y, z, r) {
  const by = Math.floor(y);
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r - 1e-4);
  const z0 = Math.floor(z - r), z1 = Math.floor(z + r - 1e-4);
  for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) {
    const id = world.get(bx, by, bz);
    if (id && BLOCKS[id].solid) return true;
  }
  return false;
}
export { feetHit };

// e: { pos, vel, radius, height, grounded, stepUp?, noGravity?, cornerSlide? }
// cornerSlide (heroes): walking into the edge of a pillar or door frame
// slides around it instead of stopping dead.
export function moveEntity(e, world, dt) {
  const r = e.radius, h = e.height;
  const p = e.pos;
  e.hitWall = false;
  // a position with no ground under it (e.g. spawned over a pit at -Infinity)
  // would make the box sweep loop forever: leave it to the caller's reset
  if (!Number.isFinite(p.x + p.y + p.z)) return e;
  // horizontal: X then Z, with step-up
  for (const axis of ['x', 'z']) {
    const d = e.vel[axis] * dt;
    if (!d) continue;
    const nx = axis === 'x' ? p.x + d : p.x, nz = axis === 'z' ? p.z + d : p.z;
    if (!boxHits(world, nx, p.y, nz, r, h)) { p[axis] += d; continue; }
    // step up one block if there's room above and we're on the ground
    const canStep = (e.grounded || e.coyote > 0) && e.stepUp !== false;
    if (canStep && !boxHits(world, nx, p.y + 1.0, nz, r, h) && !boxHits(world, p.x, p.y + 1.0, p.z, r, h)) {
      const top = Math.floor(p.y + 0.01) + 1;
      p.y = top; p[axis] += d; e.stepped = 1; continue;
    }
    // slide: resolve to the block edge
    e.hitWall = true;
    if (e.cornerSlide && cornerNudge(world, e, axis, d)) continue;
    e.vel[axis] = 0;
  }
  // vertical
  if (!e.noGravity) e.vel.y -= GRAV * dt * (e.gravityScale ?? 1);
  const dy = e.vel.y * dt;
  const ny = p.y + dy;
  // floating platforms (boats, world.platforms): land on the deck and ride it
  // as it bobs; a body arriving from above makes it dip
  const pf = world.platforms?.length ? platformAt(world, p.x, p.z, r) : null;
  if (pf && dy <= 0.001 && p.y >= pf.top - 0.4 && (ny <= pf.top + 0.02 || (e.platform === pf && p.y <= pf.top + 0.35))) {   // standing on it: stick to the deck as it drops
    if (e.platform !== pf) { pf.vel -= Math.min(1.2, 0.35 + Math.max(0, -e.vel.y) * 0.08); if (!e.grounded && e.onLand) e.onLand(-e.vel.y); }
    p.y = pf.top; e.vel.y = 0; e.grounded = true; e.coyote = 0.12; e.platform = pf; pf.load++;
  } else if (dy < 0 && feetHit(world, p.x, ny, p.z, r * 0.9)) {
    e.platform = null;
    // land on top of block
    p.y = Math.floor(ny) + 1;
    if (!e.grounded && e.onLand) e.onLand(-e.vel.y);
    e.vel.y = 0; e.grounded = true; e.coyote = 0.12;
  } else if (dy > 0 && boxHits(world, p.x, ny, p.z, r * 0.9, h)) {
    e.vel.y = 0;
  } else {
    p.y = ny; e.platform = null;
    // still grounded if something is right below
    e.grounded = feetHit(world, p.x, p.y - 0.06, p.z, r * 0.9);
    if (e.grounded && e.vel.y < 0) e.vel.y = 0;
    if (!e.grounded) e.coyote = Math.max(0, (e.coyote ?? 0) - dt);
  }
  // unstick: inside a block (spawned against a pillar, a gate closing on us,
  // a teleport): step out sideways to the nearest free spot, and pop up a
  // block only when there is no room beside us. Popping straight up every
  // frame let a monster spawned against a pillar climb it, through the
  // ceiling and onto the roof, where nobody could reach it.
  if (boxHits(world, p.x, p.y, p.z, r * 0.8, h * 0.5) && !pushOut(world, e)) p.y = Math.floor(p.y) + 1;
  const liq = world.liquidAt(p.x, p.y + 0.3, p.z);
  e.inLiquid = liq;
  return e;
}

// Nearest free spot within 1.5 blocks at the same height, preferring one with
// ground under it (so an overlap never shoves anyone off a ledge).
function pushOut(world, e) {
  const p = e.pos, r = e.radius, h = e.height;
  let fallback = null;
  for (const d of [0.2, 0.4, 0.6, 0.8, 1.05, 1.3, 1.5]) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (boxHits(world, x, p.y, z, r, h)) continue;
    if (feetHit(world, x, p.y - 0.5, z, r * 0.9)) { p.x = x; p.z = z; return true; }
    fallback ??= [x, z];
  }
  if (!fallback) return false;
  p.x = fallback[0]; p.z = fallback[1];
  return true;
}

// Blocked on one axis by a corner: if a small sideways shift (up to 0.45)
// clears the way, step sideways instead, so heroes round pillars and door
// frames rather than snagging on them. Only when moving mostly into the wall.
function cornerNudge(world, e, axis, d) {
  const p = e.pos, r = e.radius, h = e.height;
  const other = axis === 'x' ? 'z' : 'x';
  if (Math.abs(e.vel[other]) > Math.abs(e.vel[axis]) * 0.6) return false;
  for (const off of [0.15, 0.3, 0.45]) for (const s of [1, -1]) {
    const o = off * s;
    const tx = axis === 'x' ? p.x + d : p.x + o, tz = axis === 'x' ? p.z + o : p.z + d;
    if (boxHits(world, tx, p.y, tz, r, h)) continue;
    // move sideways only (no progress into the wall this frame), as fast as we were walking
    const step = Math.sign(o) * Math.min(Math.abs(o), Math.abs(d));
    const sx = axis === 'x' ? p.x : p.x + step, sz = axis === 'x' ? p.z + step : p.z;
    if (boxHits(world, sx, p.y, sz, r, h)) return false;
    p[other] += step;
    return true;
  }
  return false;
}

// Is there solid ground within `drop` blocks below a point?
export function groundAhead(world, x, y, z, drop = 2.5) {
  for (let k = 0; k <= drop; k++) {
    const id = world.get(Math.floor(x), Math.floor(y - 1 - k + 0.01), Math.floor(z));
    if (id && BLOCKS[id].solid) return true;
  }
  return false;
}
