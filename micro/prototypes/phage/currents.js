// Occasional currents through the water (they replaced the Brownian kicks, the owner, 2 Nov 2026: "instead
// of having you randomly hit by fast particles you never saw coming ... occasional currents, like maybe you
// can see a current coming and you can go grab onto a cell nearby to avoid being thrown off").
//
// A current is a soft ball of moving water, `radius` across, whose centre travels along `dir` at `speed`.
// Inside it the water flows along `dir` at up to `flow` (falling off smoothly to nothing at its edge): it
// carries whatever is not anchored, a phage included, until the ball has passed it by, which leaves you
// some 2-4 µm on, in a new area. It is aimed at someone: it starts `radius + speed * warn` upstream, so its
// edge reaches them `warn` seconds after it appears (main.js draws its streaks well ahead of that edge, in
// the medium, so it is seen coming; a sound and a toast say so too). One at a time, every `every` seconds.
//
// Pure logic (three.js maths only), so it runs in node tests (currents.test.mjs).
import * as THREE from '../shared/vendor/three.module.min.js';

export const CURRENT = { radius: 140, speed: 100, flow: 78, warn: 3.4, every: [30, 60], first: 24, past: 420 };

const _d = new THREE.Vector3();
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/**
 * The points a body at `target` would be carried through by a current along `dir` (every `step` units out
 * to `reach`), for the fairness checks (UV shafts, flocs, the portal) before one is sent.
 */
export function carriedPath(target, dir, reach = 520, step = 40) {
  const out = [];
  for (let s = 0; s <= reach; s += step) out.push(target.clone().addScaledVector(dir, s));
  return out;
}

export function createCurrents({ rng = Math.random, ...o } = {}) {
  const C = { ...CURRENT, ...o };
  const between = () => C.every[0] + rng() * (C.every[1] - C.every[0]);
  let next = C.first, active = null, offset = 0;
  const api = {
    C,
    get active() { return active; },
    /** Seconds until the next is due (it waits while none can be sent fairly). */
    get next() { return next; },
    /** How far the water in the current has moved so far (the medium scrolls its streaks by it). */
    get offset() { return offset; },
    reset() { next = C.first; active = null; offset = 0; },
    /**
     * Send one now toward `target` along unit `dir`. Its edge reaches `target` after C.warn s.
     */
    start(target, dir) {
      const d = dir.clone().normalize();
      const back = C.radius + C.speed * C.warn;
      active = { dir: d, target: target.clone(), from: target.clone().addScaledVector(d, -back), center: target.clone().addScaledVector(d, -back), t: 0,
        life: (back + C.radius + C.past) / C.speed, strength: 0 };
      next = between();
      return active;
    },
    /**
     * Each frame. `due()` is asked for a target and direction when one is due: return { target, dir } to send
     * it, or null to wait (nobody to send it to fairly; it asks again in 4 s). Returns 'start' | 'end' | null.
     */
    update(dt, due = null) {
      if (active) {
        active.t += dt;
        active.center.copy(active.from).addScaledVector(active.dir, C.speed * active.t);
        // it builds up over its first second and dies away over its last two
        active.strength = smooth(0, 1, active.t) * smooth(active.life, active.life - 2, active.t);
        offset += C.flow * active.strength * dt;
        if (active.t >= active.life) { active = null; return 'end'; }
        return null;
      }
      next -= dt;
      if (next > 0 || !due) return null;
      const pick = due();
      if (!pick) { next = 4; return null; }
      api.start(pick.target, pick.dir);
      return 'start';
    },
    /** The water's velocity from the current at p (into out): zero outside it. */
    flowAt(p, out = new THREE.Vector3()) {
      out.set(0, 0, 0);
      if (!active) return out;
      const k = smooth(C.radius, C.radius * 0.45, _d.subVectors(p, active.center).length()) * active.strength;
      return out.copy(active.dir).multiplyScalar(C.flow * k);
    },
    /** 0..1: how near p the current is now (1 inside it, falling to 0 at 2.2 radii): its streaks' strength. */
    nearness(p) {
      if (!active) return 0;
      return smooth(C.radius * 2.2, C.radius, _d.subVectors(p, active.center).length()) * active.strength;
    },
  };
  return api;
}
