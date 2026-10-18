// Battle feel tuning, kept free of Three.js so the tests can read it:
// how far a hit knocks a monster back, how far and fast the heroes' ranged
// shots fly, and the maths that pitches a shot up or down a slope at a
// monster on a ledge, a stair or the ground under the cursor.
//
// Reference: Minecraft Dungeons. A sword cut shoves a mob a block or two, a
// combo finisher or a heavy weapon three to five; arrows nudge; a bow
// reaches well across the screen (20+ blocks). Here a block is a metre and
// the default camera shows about 29 m across, 14 m from the hero to the side.

// ---------------------------------------------------------------- knockback
// A hit's `knock` (the numbers in the combo tables, heroes/*.js) is a speed
// in m/s that fades at `decay` per second, so a monster with no resistance
// slides about knock × scale / decay metres (knockDistance).
//   scale     multiplies every knock a monster takes from a hero
//   decay     how fast the shove fades (higher: shorter, snappier)
//   override  a shove this fast (m/s) takes over from the monster's own
//             walking; slower shoves fade its walking in proportion, so a
//             monster can't simply walk through a hit
//   soft/over a knock above `soft` counts only `over` of the rest, so the
//             finishers (knock 9-15) throw three to five metres rather than
//             across the room while the quick cuts (2-5) still show
//   hopAt     a hit with knock above this (before scale) pops the monster
//             off its feet a little
//   resist    how much of def.knockResist applies (1 when a shield blocks)
//   boss      share of a hit's knock a boss takes (bosses.js): a nudge
export const KNOCK = { scale: 2.6, decay: 4.5, override: 9, soft: 5, over: 0.4, hopAt: 6, resist: 0.8, boss: 0.15 };

// The share of a hit's knock a monster with knockResist r keeps.
export function knockKeep(r = 0, blocked = false) { return Math.max(0, 1 - r * (blocked ? 1 : KNOCK.resist)); }
// The speed (m/s) a monster is shoved at by a hit with this knock (after
// its resistance): scaled, with the big ones softened past KNOCK.soft.
export function knockSpeed(k) { return KNOCK.scale * (k <= KNOCK.soft ? k : KNOCK.soft + (k - KNOCK.soft) * KNOCK.over); }
// How far (m) a hit with this knock slides a monster on flat ground (before
// it walks back in: the game measures a little less on the quick cuts).
export function knockDistance(knock, r = 0) { return knockSpeed(knock * knockKeep(r)) / KNOCK.decay; }
// A hit's stagger, scaled by the monster's knockResist: light monsters
// (r ≤ 0.3) flinch from every cut, heavy ones (r ≥ 0.5) only from big hits.
// (A flat half for any resistance at all left serpents and skeletons, r 0.2,
// walking straight through the quick cuts.)
export function staggerScale(r = 0) { return r >= 0.5 ? 0.5 : 1 - r; }
// How much of its own walking a monster keeps while sliding at speed k.
export function walkKeep(k) { return Math.max(0, 1 - k / KNOCK.override); }

// ---------------------------------------------------------------- ranged
// Each shot: speed (m/s), range (m; its lifetime is range / speed) and
// knock (before KNOCK.scale). The ranged attack's slot uses these.
export const RANGED = {
  bolt: { speed: 28, range: 24, knock: 2 },     // the shared fallback (heroes/kit.js)
  jet: { speed: 36, range: 24, knock: 2.8 },      // Percy's Water Jet
  knife: { speed: 34, range: 23, knock: 1.6 },      // Annabeth's thrown knives
  sentry: { speed: 28, range: 16, knock: 1.2, seek: 11 },   // her Sentry's darts
  note: { speed: 20, range: 22, knock: 1.6, seek: 20 },       // Grover's Pipe Song (homes on a target within seek)
  boulder: { reach: 18, flight: 0.6, gravity: 20 },         // Tyson's lobbed Boulder: lands at the aim point, up to reach
  volt: { len: 8, perRank: 1.2, knock: 2 },                 // Clarisse's Spear Lightning: an instant line
};
export const lifeOf = (r) => r.range / r.speed;

// Aim help and 3D aim for every ranged shot.
//   assist     controller/touch: the nearest monster this close (m) and this
//              near the aim line (radians) gets the shot (player.js)
//   maxPitch   steepest a shot pitches up or down (radians)
//   lockRange  how far ahead a monster on the aim line sets the pitch
//   lockSlack  how far (m) beside the line, past its body, it may stand
//   lockRise   most height difference (m) a monster on the line can have
//   cursorSlack the cursor counts as on a monster this far (m) past its body
//   groundProbe with nothing to aim at, a pad shot follows the ground this
//              far (m) ahead (a slope, a stair); a drop deeper than
//              groundDrop below the hero is a pit and the shot flies flat
export const AIM = { assist: 24, assistCone: 0.35, maxPitch: 0.6, lockRange: 26, lockSlack: 0.7, lockRise: 8, cursorSlack: 0.35, groundProbe: 3, groundDrop: 3 };

const clampP = (a) => Math.max(-AIM.maxPitch, Math.min(AIM.maxPitch, a));
// Pitch (radians, up positive) from `from` to `to`, clamped to AIM.maxPitch.
export function pitchTo(from, to) {
  const h = Math.hypot(to.x - from.x, to.z - from.z);
  if (h < 0.5) return 0;
  return clampP(Math.atan2(to.y - from.y, h));
}
// A unit direction from yaw (atan2(x, z), as the heroes face) and pitch.
export function dirOf(yaw, pitch, out = { x: 0, y: 0, z: 0 }) {
  const c = Math.cos(pitch);
  out.x = Math.sin(yaw) * c; out.y = Math.sin(pitch); out.z = Math.cos(yaw) * c;
  return out;
}
// Where a shot at a monster aims: the middle of its body.
export function bodyCentre(e, out = { x: 0, y: 0, z: 0 }) {
  out.x = e.pos.x; out.y = e.pos.y + (e.height ?? 1.5) * 0.5; out.z = e.pos.z;
  return out;
}
const live = (e) => e && !e.dead && !e.untargetable && !e.disguised;
// The monster standing on the aim line (from, horizontal unit dir): nearest
// along it, within AIM.lockRange ahead and its body plus AIM.lockSlack beside.
export function lineTarget(from, dir, enemies, range = AIM.lockRange) {
  let best = null, bd = range;
  for (const e of enemies) {
    if (!live(e)) continue;
    const dx = e.pos.x - from.x, dz = e.pos.z - from.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0.5 || along > bd) continue;
    if (Math.abs(dx * dir.z - dz * dir.x) > (e.radius ?? 0.4) + AIM.lockSlack) continue;
    if (Math.abs(e.pos.y + (e.height ?? 1.5) * 0.5 - from.y) > AIM.lockRise) continue;
    bd = along; best = e;
  }
  return best;
}
// Distance between a ray (o + t·d, d unit, t ≥ 0) and a vertical segment
// from c up to c + h; returns { dist, t } (t: how far along the ray).
export function rayToUpright(o, d, c, h) {
  // closest points of two lines, the segment's direction being (0, 1, 0)
  const wx = o.x - c.x, wy = o.y - c.y, wz = o.z - c.z;
  const b = d.y, dd = d.x * wx + d.y * wy + d.z * wz, e = wy;
  const den = 1 - b * b;
  let t = den > 1e-6 ? (b * e - dd) / den : 0;
  t = Math.max(0, t);
  let s = wy + t * d.y; s = Math.max(0, Math.min(h, s));
  // re-project the ray onto the clamped segment point
  t = Math.max(0, d.x * (c.x - o.x) + d.y * (c.y + s - o.y) + d.z * (c.z - o.z));
  const px = o.x + d.x * t - c.x, py = o.y + d.y * t - (c.y + s), pz = o.z + d.z * t - c.z;
  return { dist: Math.hypot(px, py, pz), t };
}
// The monster under the cursor ray (screen picking): its body within
// AIM.cursorSlack of the ray, the nearest to the camera, no farther than
// lockRange from the hero.
export function cursorTarget(o, d, enemies, hero, range = AIM.lockRange) {
  let best = null, bt = Infinity;
  for (const e of enemies) {
    if (!live(e)) continue;
    if (Math.hypot(e.pos.x - hero.x, e.pos.z - hero.z) > range) continue;
    const r = rayToUpright(o, d, e.pos, e.height ?? 1.5);
    if (r.dist <= (e.radius ?? 0.4) + AIM.cursorSlack && r.t < bt) { bt = r.t; best = e; }
  }
  return best;
}
// Pitch that follows the ground: from the ground under the hero to the
// ground AIM.groundProbe ahead (null ahead, or a pit: flat).
export function groundPitch(hereY, aheadY) {
  if (aheadY == null || !Number.isFinite(aheadY) || aheadY < hereY - AIM.groundDrop) return 0;
  return clampP(Math.atan2(aheadY - hereY, AIM.groundProbe));
}
// The upward speed a lob needs to come down at a point dy above where it
// left, after `flight` seconds under `gravity`.
export function lobVy(dy, flight, gravity) { return dy / flight + 0.5 * gravity * flight; }
