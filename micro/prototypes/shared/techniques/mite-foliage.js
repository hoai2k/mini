// Technique: bendable foliage that creatures push through and walk on (from
// the mite prototype). Thin things (moss leaf blades, grass, fungal hyphae)
// are each one bendable rod described by a single tip offset `d` (a vec3)
// with a spring back to rest, so many of them stay cheap:
//
//   cantilever (a blade fixed at its base): offset(u) = d * u^2
//   string     (a thread fixed at both ends): offset(u) = d * sin(pi u)
//
// where u runs 0..1 along the rod. Bodies (ellipsoids) push the rod's sample
// points out of themselves (position-based, so nothing passes through), and a
// creature standing on a blade loads its tip, so it sags and springs back.
// The render geometry (usually one merged mesh for many blades) is deformed on
// the CPU for the blades that are moving only (addUpdateRange), normals turned
// with the bend; an optional low-poly collider geometry per rod is deformed too,
// so feet and ground probes follow the bent surface.
//
//   import { createFoliage } from '../shared/techniques/mite-foliage.js';
//   const fol = createFoliage();
//   fol.add({ geo, start, count, base, tip, kind: 'cantilever', stiff: 1,
//             col: { geo: colliderGeo, onMove(center, radius) {} } });  // vertices [start, start+count)
//   ... each frame:
//   fol.update(dt, [{ center, quat, radii: [rx, ry, rz], load: rodOrNull, weight }]);
//   fol.stats -> { active, moving, maxBend }
//
// Units are whatever the scene uses (the mite uses µm). No three.js scene
// objects are created; pass three's BufferGeometry objects in.
import * as THREE from '../vendor/three.module.min.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion();
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const BINS = 6;

function profile(kind, u) { return kind === 'string' ? Math.sin(Math.PI * u) : u * u; }

export function createFoliage(opts = {}) {
  const rods = [];
  const cfg = { on: true, near: 700, stiffK: 60, damp: 9, maxBend: 0.55, ...opts };
  const dirtyGeos = new Set();
  const stats = { active: 0, moving: 0, maxBend: 0, total: 0 };

  function uOf(rod, x, y, z) {
    _v.set(x, y, z).sub(rod.base);
    return Math.min(1, Math.max(0, _v.dot(rod.axis) / rod.len));
  }

  const api = {
    cfg, rods, stats,
    /**
     * Register one rod.
     * @param {{geo:THREE.BufferGeometry, start:number, count:number, base:THREE.Vector3,
     *   tip:THREE.Vector3, kind?:'cantilever'|'string', stiff?:number, mass?:number,
     *   samples?:THREE.Vector3[], col?:{geo:THREE.BufferGeometry, onMove?:Function},
     *   follow?:{rod:object, u:number}}} r
     *   samples: rest points along the rod's centre line (default: 6 on the base-tip line).
     *   follow: move rigidly with another rod's offset at u (side branches).
     */
    add(r) {
      const rod = {
        kind: 'cantilever', stiff: 1, ...r,
        d: new THREE.Vector3(), vel: new THREE.Vector3(), awake: false, id: rods.length,
      };
      rod.axis = new THREE.Vector3().subVectors(r.tip, r.base);
      rod.len = rod.axis.length() || 1;
      rod.axis.divideScalar(rod.len);
      rod.mid = r.base.clone().lerp(r.tip, 0.5);
      if (!rod.samples) rod.samples = [0.2, 0.4, 0.6, 0.75, 0.9, 1].map((u) => r.base.clone().lerp(r.tip, u));
      rod.su = rod.samples.map((p) => uOf(rod, p.x, p.y, p.z));
      if (rod.kind === 'string') rod.su = rod.samples.map((_, i) => (i + 1) / (rod.samples.length + 1));
      // Rest copies of the vertices this rod owns.
      const P = r.geo.attributes.position, N = r.geo.attributes.normal;
      rod.rest = P.array.slice(r.start * 3, (r.start + r.count) * 3);
      rod.restN = N ? N.array.slice(r.start * 3, (r.start + r.count) * 3) : null;
      rod.vu = new Float32Array(r.count);
      for (let i = 0; i < r.count; i++) rod.vu[i] = rod.kind === 'string' ? uOf(rod, rod.rest[3 * i], rod.rest[3 * i + 1], rod.rest[3 * i + 2]) : uOf(rod, rod.rest[3 * i], rod.rest[3 * i + 1], rod.rest[3 * i + 2]);
      if (r.col) {
        const cp = r.col.geo.attributes.position;
        rod.colRest = cp.array.slice();
        rod.colU = new Float32Array(cp.count);
        for (let i = 0; i < cp.count; i++) rod.colU[i] = uOf(rod, cp.getX(i), cp.getY(i), cp.getZ(i));
      }
      rods.push(rod);
      stats.total = rods.length;
      return rod;
    },

    /** Offset of rod at u (world units). */
    offsetAt(rod, u, out = new THREE.Vector3()) {
      if (rod.follow) return api.offsetAt(rod.follow.rod, rod.follow.u, out);
      return out.copy(rod.d).multiplyScalar(profile(rod.kind, u));
    },

    /**
     * bodies: [{ center, quat, radii:[x,y,z], load?: rod, weight?: number }]
     *   radii in the body's own frame; load: the rod the body stands on (its
     *   weight bends that rod's tip down along -up).
     */
    update(dt, bodies) {
      stats.active = 0; stats.moving = 0; stats.maxBend = 0;
      if (!cfg.on) return;
      dt = Math.min(dt, 1 / 30);
      for (const rod of rods) {
        if (rod.follow) continue;
        let near = false;
        for (const b of bodies) if (b.center.distanceTo(rod.mid) < rod.len * 0.5 + cfg.near) { near = true; break; }
        if (!near && !rod.awake) { rod.wrote = false; continue; }
        stats.active++;
        rod.prev = (rod.prev || new THREE.Vector3()).copy(rod.d);
        // Spring back to rest (stiffer rods spring faster), damped, plus load.
        const k = cfg.stiffK * rod.stiff, c = cfg.damp * Math.sqrt(rod.stiff);
        _a.copy(rod.d).multiplyScalar(-k).addScaledVector(rod.vel, -c);
        for (const b of bodies) {
          if (b.load === rod && b.weight) {
            // Weight on the blade: a downward pull at the tip, scaled by how far out it stands.
            const u = b.loadU ?? 0.7;
            _a.y -= b.weight * profile(rod.kind, u) / rod.stiff;
          }
        }
        rod.vel.addScaledVector(_a, dt);
        rod.d.addScaledVector(rod.vel, dt);
        // Bodies push the sample points out (position-based: a hard constraint).
        for (const b of bodies) {
          if (b.center.distanceTo(rod.mid) > rod.len * 0.5 + Math.max(...b.radii) * 1.2) continue;
          _qi.copy(b.quat).invert();
          for (let s = 0; s < rod.samples.length; s++) {
            const u = rod.su[s], pf = profile(rod.kind, u);
            if (pf < 0.02) continue;
            _v.copy(rod.samples[s]).addScaledVector(rod.d, pf).sub(b.center).applyQuaternion(_qi);
            const ex = _v.x / b.radii[0], ey = _v.y / b.radii[1], ez = _v.z / b.radii[2];
            const e = Math.sqrt(ex * ex + ey * ey + ez * ez);
            if (e >= 1 || e < 1e-4) continue;
            // Push along the ellipsoid gradient to its surface.
            _w.set(ex / b.radii[0], ey / b.radii[1], ez / b.radii[2]).normalize();
            const depth = (1 - e) * Math.min(...b.radii) * 1.02;
            _w.applyQuaternion(b.quat).multiplyScalar(depth / pf);
            rod.d.add(_w);
          }
        }
        // Keep the bend sane (a blade folds, it does not stretch).
        const lim = cfg.maxBend * rod.len;
        let m = rod.d.length();
        if (m > lim) { rod.d.multiplyScalar(lim / m); m = lim; }
        // Position-based: velocity is what the step actually did (so a blade
        // held aside does not store up speed and snap back violently).
        rod.vel.subVectors(rod.d, rod.prev).divideScalar(dt);
        const moving = m > 0.3 || rod.vel.lengthSq() > 1;
        if (!moving && rod.awake) { rod.d.set(0, 0, 0); rod.vel.set(0, 0, 0); }
        if (moving || rod.awake) { api.write(rod); rod.wrote = true; } else rod.wrote = false;
        rod.awake = moving;
        if (moving) stats.moving++;
        stats.maxBend = Math.max(stats.maxBend, m / rod.len);
      }
      for (const rod of rods) if (rod.follow && rod.follow.rod.wrote) api.write(rod);
      for (const g of dirtyGeos) {
        g.attributes.position.needsUpdate = true;
        if (g.attributes.normal) g.attributes.normal.needsUpdate = true;
      }
      dirtyGeos.clear();
    },

    /** Write a rod's deformed vertices (and collider) from its offset. */
    write(rod) {
      const src = rod.follow ? rod.follow.rod : rod;
      const P = rod.geo.attributes.position.array, N = rod.geo.attributes.normal ? rod.geo.attributes.normal.array : null;
      // Turn normals with the bend: one rotation per u bin.
      const qs = [];
      for (let k = 0; k <= BINS; k++) {
        const u = k / BINS;
        // tangent of the bent centre line at u
        const dp = src.kind === 'string' ? Math.PI * Math.cos(Math.PI * u) : 2 * u;
        _b.copy(rod.axis).multiplyScalar(rod.len).addScaledVector(src.d, rod.follow ? 0 : dp).normalize();
        qs.push(new THREE.Quaternion().setFromUnitVectors(rod.axis, _b));
      }
      const fol = rod.follow ? api.offsetAt(rod, 0, new THREE.Vector3()) : null;
      for (let i = 0; i < rod.count; i++) {
        const u = rod.vu[i];
        const o = 3 * (rod.start + i), r = 3 * i;
        let ox, oy, oz;
        if (fol) { ox = fol.x; oy = fol.y; oz = fol.z; }
        else {
          const pf = profile(rod.kind, u);
          // shorten along the axis a little as it bends, so it keeps its length
          const sh = rod.kind === 'string' ? 0 : (src.d.lengthSq() / (2 * rod.len)) * u * u * u;
          ox = src.d.x * pf - rod.axis.x * sh; oy = src.d.y * pf - rod.axis.y * sh; oz = src.d.z * pf - rod.axis.z * sh;
        }
        P[o] = rod.rest[r] + ox; P[o + 1] = rod.rest[r + 1] + oy; P[o + 2] = rod.rest[r + 2] + oz;
        if (N && rod.restN && !fol) {
          _v.set(rod.restN[r], rod.restN[r + 1], rod.restN[r + 2]).applyQuaternion(qs[Math.round(u * BINS)]);
          N[o] = _v.x; N[o + 1] = _v.y; N[o + 2] = _v.z;
        }
      }
      const attr = rod.geo.attributes.position;
      if (attr.addUpdateRange) {
        attr.addUpdateRange(rod.start * 3, rod.count * 3);
        if (rod.geo.attributes.normal) rod.geo.attributes.normal.addUpdateRange(rod.start * 3, rod.count * 3);
      }
      dirtyGeos.add(rod.geo);
      if (rod.col) {
        const cp = rod.col.geo.attributes.position.array;
        for (let i = 0; i < rod.colU.length; i++) {
          const pf = profile(src.kind, rod.colU[i]);
          cp[3 * i] = rod.colRest[3 * i] + src.d.x * pf;
          cp[3 * i + 1] = rod.colRest[3 * i + 1] + src.d.y * pf;
          cp[3 * i + 2] = rod.colRest[3 * i + 2] + src.d.z * pf;
        }
        rod.col.geo.attributes.position.needsUpdate = true;
        rod.col.geo.computeBoundingSphere();
        rod.col.onMove?.(rod.col.geo.boundingSphere.center, rod.col.geo.boundingSphere.radius);
      }
    },

    /** Snap every rod back to rest. */
    reset() {
      for (const rod of rods) { rod.d.set(0, 0, 0); rod.vel.set(0, 0, 0); api.write(rod); rod.awake = false; }
      for (const g of dirtyGeos) g.attributes.position.needsUpdate = true;
      dirtyGeos.clear();
    },
  };
  return api;
}
