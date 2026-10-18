// Ranged monsters: how often they shoot, how the shots aimed at one hero are
// spread out in time, and when a monster may fire more than one projectile
// a shot. entities/enemy.js follows these rules; pure module (no Three.js),
// so the node tests can load it (test/ranged.test.mjs).
//
// Fewer, readable shots (the stat tables in monsters.js and fodder.js):
//   • every shot has a wind-up tell (the cast pose, a glow at the mouth and,
//     for a straight shot, an aim line on the ground; a lob marks where it
//     lands) and a long cooldown: about 3.5-5 s between one fodder's shots,
//     5-7 s for a big lobber.
//   • a monster that has just found a hero waits FIRST_SHOT before its first
//     shot, so a group that wakes together does not open with a volley.
//   • the volley scheduler (Volleys): at most VOLLEY.maxWindups ranged
//     monsters wind up at one hero (or a party standing together) at a time, wind-ups start at least
//     VOLLEY.startGap apart, and the shots land on the hero one after
//     another, at least VOLLEY.gap[0] (0.45-0.8 s) apart.
//   • elites and champions shoot a little more often (rangedCdMul), never
//     with a shorter wind-up.
//
// Multi-shot (a fan of feathers, a burst of bullets: a stat block's
// `shots`) waits until well after the heroes have their own: the
// Stymphalian Feathers (loot.js, a common magic item: a fan of seven knives)
// can drop from the first chests, and Annabeth's Twin Knives (two) open at
// hero level 1. A monster fires `shots` only at monster level
// MULTI_SHOT_LEVEL or above, and in a chapter only if the chapter's own
// place is at that level (progression.js CHAPTER_LEVEL): so never in the
// museum or chapters 1-7, whatever the difficulty; in the open world, from
// the far end of the Labyrinth on (Othrys, Asphodel). Below that, one
// projectile a shot. Bosses keep their own telegraphed patterns
// (entities/bosses.js): one projectile at a time, each marked, and the only
// marked barrage (the Chimera's fireballs) is chapter 6's.
import { CHAPTER_LEVEL } from '../progression.js';

export const MULTI_SHOT_LEVEL = 7;
export const VOLLEY = {
  maxWindups: 2,       // ranged wind-ups at one hero at once
  startGap: 0.3,       // seconds between two wind-ups starting at one hero
  gap: [0.45, 0.8],    // seconds between two shots released at one hero (min, max)
  near: 16,            // metres: heroes this close together (a party on one screen) share one schedule
};
export const FIRST_SHOT = [0.9, 2.6];   // seconds a monster waits before its first shot at a hero

// Projectiles a shot for this stat block, at this monster level, in this
// chapter (null in the open world and the Road West).
export function shotCount(def, { level = 1, chapter = null } = {}) {
  const n = Math.max(1, Math.floor(def?.shots ?? 1));
  if (n <= 1) return 1;
  if (level < MULTI_SHOT_LEVEL) return 1;
  if (chapter != null && !((CHAPTER_LEVEL[chapter] ?? 0) >= MULTI_SHOT_LEVEL)) return 1;
  return n;
}
// Cooldown multiplier: elites a little faster, champions a little more (wind-ups unchanged).
export function rangedCdMul({ elite = null, champion = false } = {}) {
  return (elite === 'swift' ? 0.8 : elite ? 0.9 : 1) * (champion ? 0.85 : 1);
}
export const firstShotDelay = (rng = Math.random) => FIRST_SHOT[0] + rng() * (FIRST_SHOT[1] - FIRST_SHOT[0]);

// The volley scheduler: one per game, keyed by the hero being shot at. Heroes
// standing together (keys with a `pos` within VOLLEY.near metres: a party
// keeps close) share one schedule, so a group's shots don't all come at once
// just because they picked different heroes.
export class Volleys {
  constructor({ rng = Math.random, ...o } = {}) { this.o = { ...VOLLEY, ...o }; this.rng = rng; this.by = new Map(); this.log = null; }
  slot(key) {
    let s = this.by.get(key);
    if (!s) this.by.set(key, s = { key, winding: new Set(), nextStart: -Infinity, lastSlot: -Infinity, last: -Infinity });
    return s;
  }
  // the slots of every hero near this one (itself first)
  group(key) {
    const own = this.slot(key), out = [own], p = key?.pos;
    if (!p) return out;
    const r2 = this.o.near * this.o.near;
    for (const [k, s] of this.by) {
      if (s === own || !k?.pos || k.dead) continue;
      const dx = k.pos.x - p.x, dz = k.pos.z - p.z;
      if (dx * dx + dz * dz < r2) out.push(s);
    }
    return out;
  }
  gap() { const [a, b] = this.o.gap; return a + this.rng() * (b - a); }
  // May `who` start a wind-up at `key` now? Returns the time its shot should
  // leave (at least `windup` from now, a gap after the shot before it), or
  // null to wait. active(who): still winding up (drops a stale entry: one
  // that died, was staggered or gave up).
  request(key, who, now, windup, active = () => true) {
    const G = this.group(key);
    let winding = 0, nextStart = -Infinity, lastSlot = -Infinity, last = -Infinity;
    for (const s of G) {
      for (const w of s.winding) if (w === who || !active(w)) s.winding.delete(w);
      winding += s.winding.size;
      nextStart = Math.max(nextStart, s.nextStart); lastSlot = Math.max(lastSlot, s.lastSlot); last = Math.max(last, s.last);
    }
    if (winding >= this.o.maxWindups || now < nextStart) return null;
    const at = Math.max(now + windup, lastSlot + this.gap(), last + this.o.gap[0]);
    const own = G[0];
    own.lastSlot = at; own.nextStart = now + this.o.startGap;
    own.winding.add(who);
    return at;
  }
  // Has the last shot at this hero (or one beside them) gone long enough ago for another?
  clear(key, now) {
    let last = -Infinity;
    for (const s of this.group(key)) last = Math.max(last, s.last);
    return now - last >= this.o.gap[0] - 1e-6;
  }
  // The shot left (n projectiles).
  fired(key, who, now, n = 1, kind = null) {
    const s = this.slot(key);
    s.last = now; s.winding.delete(who);
    this.log?.push({ t: now, kind, n });
  }
  // The wind-up was dropped without a shot.
  drop(key, who) { this.by.get(key)?.winding.delete(who); }
  winding(key) { let n = 0; for (const s of this.group(key)) n += s.winding.size; return n; }
}
