// Glue strands from a sundew leaf's tentacle tips to a stuck springtail's
// legs: the escape shown on the body, not on a bar. Each strand stretches and
// thins as the struggle goes on and snaps in its turn (strand i at progress
// (i + 1) / n); when the struggle slips back, a snapped strand sticks again.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';

const R0 = 0.03; // a fresh strand's radius at its ends (mm)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _mid = new THREE.Vector3(), _d = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);

export function createGlue(scene, n = 6) {
  // clear mucilage over the red glands: glossy, faintly lit from within
  const mat = litMaterial({ shadow: false, surface: `
    float nv = max(dot(s.N, normalize(cameraPosition - vWorld)), 0.0);
    s.albedo = vec3(0.32, 0.16, 0.13); s.rough = 0.06; s.f0 = 0.05; s.trans = 0.8;
    s.emit = vec3(0.55, 0.16, 0.12) * (0.2 + 0.8 * pow(1.0 - nv, 2.0)) * (uSunCol.r * 0.3 + 0.2);` });
  // a half strand: thick where it holds (y = 0), necked toward the middle (y = 1)
  const geo = new THREE.CylinderGeometry(0.35, 1, 1, 6, 1, true).translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, mat, n * 2);
  im.frustumCulled = false;
  im.count = 0;
  scene.add(im);
  let strands = [];
  const half = (i, from, to, r) => {
    _d.subVectors(to, from);
    const len = _d.length();
    if (len < 1e-4) return i;
    _q.setFromUnitVectors(Y, _d.divideScalar(len));
    _m.compose(from, _q, _s.set(r, len, r));
    im.setMatrixAt(i, _m);
    return i + 1;
  };
  const tipOf = (t, out) => out.copy(t.dir).multiplyScalar(t.len).add(t.base);
  return {
    mesh: im,
    /** Snapped strands so far (0..n). */
    get snapped() { return strands.filter((s) => s.snap > 0).length; },
    /** Stick the legs (`feet`, world points) to the nearest free tentacle tips of `leaf`. */
    attach(leaf, feet) {
      const used = new Set();
      strands = feet.slice(0, n).map((f, foot) => {
        let best = null, bd = Infinity;
        for (const t of leaf.tent) {
          if (used.has(t)) continue;
          const d = tipOf(t, _a).distanceTo(f);
          // a strand you can see: from a tip a little way off and up, not one under the foot
          const score = Math.abs(d - 0.7) - 0.5 * Math.min(0.4, _a.y - f.y);
          if (score < bd) { bd = score; best = t; }
        }
        used.add(best);
        return { t: best, foot, snap: 0, grow: 0, sway: Math.random() * 6.28 };
      });
      // the order they give: shuffled, so the body comes free leg by leg
      for (let i = strands.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [strands[i], strands[j]] = [strands[j], strands[i]]; }
    },
    /**
     * progress 0..1 (the struggle); tug 0..1 (how hard it is pulling now);
     * feet: the legs' world points, in the order given to attach (each strand keeps its leg).
     * Returns the number of strands that snapped this frame.
     */
    update(dt, feet, progress, tug, time) {
      let i = 0, snaps = 0;
      const k = strands.length;
      strands.forEach((s, j) => {
        if (!s.t) return;
        const f = feet[s.foot % feet.length];
        const due = progress >= (j + 1) / k - 1e-6;
        if (due && s.snap === 0) { s.snap = 1e-3; snaps++; }
        else if (!due && s.snap > 0) { s.snap = 0; s.grow = 0; } // stuck again
        tipOf(s.t, _a);
        if (s.snap > 0) {
          // recoil: the broken end springs back to its gland and beads up
          s.snap += dt;
          const r = Math.max(0, 1 - s.snap / 0.3);
          if (r <= 0) return;
          _b.copy(f).lerp(_a, 1 - r * 0.5);
          _b.lerp(_a, 1 - r);
          i = half(i, _a, _b, R0 * 0.6 * r);
          return;
        }
        s.grow = Math.min(1, s.grow + dt / 0.2);
        // this strand's share of the struggle: it thins as its turn nears
        const st = Math.max(0, Math.min(1, (progress - j / k) * k));
        const rEnd = R0 * (0.5 + 0.5 * s.grow) * (1 - 0.35 * st);
        const neck = (1 - 0.8 * st) * (1 - 0.3 * tug);
        _b.copy(f);
        _mid.lerpVectors(_a, _b, 0.5);
        // a glue strand sags a little, less when pulled taut
        _mid.y -= 0.05 * (1 - tug) * _a.distanceTo(_b);
        _mid.x += Math.sin(time * 9 + s.sway) * 0.02 * tug; _mid.z += Math.cos(time * 8 + s.sway) * 0.02 * tug;
        i = half(i, _a, _mid, rEnd);
        i = half(i, _b, _mid, rEnd);
        // the neck: shrink the middle by scaling the cone tips (geometry's top radius is 0.35 of the end)
        if (neck < 1) for (const h of [i - 2, i - 1]) { im.getMatrixAt(h, _m); _m.decompose(_d, _q, _s); _s.x *= 0.5 + 0.5 * neck; _s.z *= 0.5 + 0.5 * neck; _m.compose(_d, _q, _s); im.setMatrixAt(h, _m); }
      });
      im.count = i;
      if (i) im.instanceMatrix.needsUpdate = true;
      return snaps;
    },
    /** Let go of every strand at once (escaped, or swallowed by the leaf). */
    clear() { strands = []; im.count = 0; },
  };
}
