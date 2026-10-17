// Keeping cinematic cameras clear of the set. A shot (story/cutscene.js) or a
// camera-rig cinematic (camera.js) is checked before it plays: if a wall, a
// roof or a tree stands between the camera and what it looks at (or the
// figures in frame), the whole shot is turned round its look point, or
// raised, by the smallest amount that clears it. (The audit found the opening
// shot of camp looking at the Big House porch through a cabin roof, and
// Percy and his mom behind the Montauk cabin's wall.)
import { BLOCKS, B } from '../world/blocks.js';

const DEG = Math.PI / 180;
// a block the eye can see (not air, water, an invisible wall or the like)
export function seenAt(world, x, y, z) {
  const id = world?.get?.(Math.floor(x), Math.floor(y), Math.floor(z));
  if (!id || id === B.barrier) return false;
  const b = BLOCKS[id];
  return !!b && !b.invisible && !b.liquid && b.solid !== false;
}
// Share of the way from a to b (stopping `skip` short of b) that runs through blocks.
export function blockedShare(world, a, b, skip = 0.6) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
  let n = 0, hit = 0;
  for (let s = 0.3; s < L - skip; s += 0.3) { n++; const f = s / L; if (seenAt(world, a.x + dx * f, a.y + dy * f, a.z + dz * f)) hit++; }
  return n ? hit / n : 0;
}
// pos turned by dyaw round look's vertical axis and raised by dpitch (radians)
export function turnAbout(pos, look, dyaw, dpitch, out = pos.clone()) {
  const ox = pos.x - look.x, oy = pos.y - look.y, oz = pos.z - look.z;
  const r = Math.hypot(ox, oy, oz) || 1e-6, flat = Math.hypot(ox, oz);
  const yaw = Math.atan2(ox, oz) + dyaw, el = Math.min(80 * DEG, Math.max(-10 * DEG, Math.atan2(oy, flat) + dpitch));
  return out.set(look.x + Math.sin(yaw) * Math.cos(el) * r, look.y + Math.sin(el) * r, look.z + Math.cos(yaw) * Math.cos(el) * r);
}
const YAWS = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90, -90, 120, -120, 150, -150, 180].map((d) => d * DEG);
const PITCHES = [0, 10, 20, 30, -8].map((d) => d * DEG);
// The smallest turn { dyaw, dpitch } that clears every pose ({ pos, look }) and
// the subjects (points to keep in view, e.g. heads) of a shot; { 0, 0 } when
// it is clear already or nothing does better.
export function clearTurn(world, poses, subjects = []) {
  const score = (dy, dp) => {
    let s = 0;
    for (const p of poses) {
      const c = turnAbout(p.pos, p.look, dy, dp);
      if (seenAt(world, c.x, c.y, c.z)) s += 1;
      s += blockedShare(world, c, p.look);
      for (const q of subjects) s += 0.5 * blockedShare(world, c, q, 0.35) / subjects.length;
    }
    return s;
  };
  const base = score(0, 0);
  if (base < 0.02) return { dyaw: 0, dpitch: 0, before: base, after: base };
  let best = { dyaw: 0, dpitch: 0, after: base };
  for (const dp of PITCHES) for (const dy of YAWS) {
    if (!dy && !dp) continue;
    const s = score(dy, dp), cost = Math.abs(dy) + 1.5 * Math.abs(dp);
    if (s < best.after - 0.02 || (Math.abs(s - best.after) <= 0.02 && cost < Math.abs(best.dyaw) + 1.5 * Math.abs(best.dpitch))) best = { dyaw: dy, dpitch: dp, after: s };
    if (s < 0.02 && cost <= 30 * DEG) break;   // (a small turn that clears it: good enough)
  }
  return { ...best, before: base };
}
