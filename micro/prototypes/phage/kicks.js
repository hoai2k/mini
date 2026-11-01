// Brownian motion as discrete kicks: every so often a molecule from the water
// strikes the phage, rebounds, and leaves it with a small push and a little
// spin (the push is what you feel; the phage then slows in the viscous water).
// Small molecules (ions, water clusters, sugars) are fast and frequent with
// light kicks; a protein is slow and rare with a bigger shove. Real phages are
// hit ~10^13 times a second and the sum is a smooth random walk [S100]; drawing
// a few individual hits is a labelled departure that makes the cause visible.
//
// Pure logic (three.js maths only), so it runs in node tests (kicks.test.mjs).
import * as THREE from '../shared/vendor/three.module.min.js';

/** The kinds of striking molecule: share of hits, approach speed (units/s), drawn size, push (units/s), spin (rad/s). */
export const KICK_KINDS = [
  { kind: 'small', share: 0.6, speed: 160, size: 1.3, push: 6, spin: 0.35 },
  { kind: 'chain', share: 0.28, speed: 100, size: 1.2, push: 9, spin: 0.5 },
  { kind: 'globule', share: 0.12, speed: 60, size: 1.6, push: 14, spin: 0.7 },
];
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();

/** Closest point on segment a-b to p (into out). */
function closest(p, a, b, out) {
  _d.subVectors(b, a);
  const t = Math.max(0, Math.min(1, _c.subVectors(p, a).dot(_d) / Math.max(1e-6, _d.lengthSq())));
  return out.copy(a).addScaledVector(_d, t);
}

/**
 * A kick generator for one phage. rate: hits per second on average (Poisson).
 * step(dt, body, opts) moves the molecules in flight and returns this frame's hits:
 *   body: { a, b, r }  the phage as a capsule (baseplate end a, head end b, radius r), world units
 *   opts: { on = true, scale = 1, spinScale = 1, rate }  (scale and spinScale soften the kicks, e.g. while aiming)
 * Each hit: { kind, at (point), dir (unit push direction), dv (velocity change), dw (angular velocity change) }.
 */
export function createKicks({ rate = 1.6, rng = Math.random, max = 8 } = {}) {
  const flying = []; // { kind, p, v, age, hit, life, q, w }
  let wait = -Math.log(1 - rng() * 0.999) / rate;
  const pick = () => { let u = rng(); for (const k of KICK_KINDS) { if ((u -= k.share) <= 0) return k; } return KICK_KINDS[0]; };
  function spawn(body) {
    const k = pick();
    // aim at a point along the body, from a random direction
    const along = _a.copy(body.a).lerp(body.b, rng());
    const n = new THREE.Vector3(rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1);
    if (n.lengthSq() < 1e-4) n.set(1, 0, 0);
    n.normalize();
    const from = 10 + rng() * 8; // starts just outside the near water's crowd round the phage
    const p = along.clone().addScaledVector(n, body.r + from);
    const tangent = _b.set(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(0.25);
    const v = n.clone().negate().add(tangent).normalize().multiplyScalar(k.speed * (0.8 + rng() * 0.4));
    flying.push({ k, p, v, age: 0, hit: false, life: 0.7, q: new THREE.Quaternion().random(), w: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(8) });
  }
  return {
    flying,
    get wait() { return wait; },
    reset() { flying.length = 0; },
    step(dt, body, { on = true, scale = 1, spinScale = 1, rate: r = rate } = {}) {
      const hits = [];
      if (on) {
        wait -= dt;
        while (wait <= 0) { if (flying.length < max) spawn(body); wait += -Math.log(1 - rng() * 0.999) / Math.max(0.01, r); }
      }
      const mid = _c.copy(body.a).lerp(body.b, 0.5).clone();
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.age += dt;
        f.p.addScaledVector(f.v, dt);
        f.q.multiply(new THREE.Quaternion().setFromAxisAngle(_a.copy(f.w).normalize(), f.w.length() * dt));
        if (!f.hit) {
          const near = closest(f.p, body.a, body.b, new THREE.Vector3());
          const off = _b.subVectors(f.p, near);
          const d = off.length();
          if (d < body.r + f.k.size) {
            // the strike: the molecule bounces off; the phage takes the push along the molecule's travel
            const n = d > 1e-4 ? off.multiplyScalar(1 / d) : new THREE.Vector3(0, 1, 0);
            const at = near.clone().addScaledVector(n, body.r);
            const push = f.v.clone().normalize();
            const dv = push.clone().multiplyScalar(f.k.push * scale);
            // spin: the push applied off the centre (lever arm along the body) turns it a little
            const lever = new THREE.Vector3().subVectors(at, mid);
            const len = Math.max(1, body.a.distanceTo(body.b) * 0.5);
            const dw = new THREE.Vector3().crossVectors(lever, push).multiplyScalar((f.k.spin * spinScale) / len);
            hits.push({ kind: f.k.kind, at, dir: push, dv, dw });
            const vn = f.v.dot(n);
            if (vn < 0) f.v.addScaledVector(n, -2 * vn);
            f.v.multiplyScalar(0.55);
            f.hit = true; f.age = 0;
            f.w.multiplyScalar(2.5);
          } else if (f.age > 0.6) { flying.splice(i, 1); continue; } // missed (the phage moved): gone
        } else if (f.age > f.life) { flying.splice(i, 1); continue; }
      }
      return hits;
    },
  };
}
