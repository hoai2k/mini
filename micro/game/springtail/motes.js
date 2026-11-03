// Whitish motes: the springtail breaking up into drifting particles as a
// sundew digests it (shed), and gathering back into a body at a respawn
// (gather). Small lit spheres that shrink away rather than fade, because the
// macro pass stores optical depth in alpha (no ordinary transparency).
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial } from '../shared/techniques/springtail-macro.js';

const ease = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const _p = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();

/**
 * A point on the springtail's surface, in world space, as it is posed now:
 * a random vertex of its body, skinned on the CPU like LIT_VS does.
 */
export function surfacePoint(tail, out = new THREE.Vector3()) {
  const g = tail.body.geometry, pos = g.attributes.position;
  const i = Math.floor(Math.random() * pos.count);
  const bones = tail.material.uniforms.uBones.value;
  const A = bones[Math.round(g.attributes.part.getX(i))], B = bones[Math.round(g.attributes.part2.getX(i))];
  const w = g.attributes.partW.getX(i);
  _p.fromBufferAttribute(pos, i);
  _a.copy(_p).applyMatrix4(A); _b.copy(_p).applyMatrix4(B);
  return out.copy(_b).lerp(_a, w).applyMatrix4(tail.group.matrixWorld);
}

export function createMotes(scene, max = 700) {
  const mat = litMaterial({ surface: 's.albedo = vec3(0.86, 0.85, 0.8); s.emit = vec3(0.22, 0.22, 0.2); s.rough = 0.5; s.wrap = 0.6; s.trans = 0.5;', shadow: false });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat, max);
  im.frustumCulled = false;
  im.count = 0;
  scene.add(im);
  const list = [];
  return {
    mesh: im,
    get count() { return list.length; },
    /** A mote shed from `at` (world), drifting up and out from `centre` and shrinking away over `life` s. */
    shed(at, centre, { size = 0.035, life = 1.8, speed = 0.8 } = {}) {
      if (list.length >= max) return;
      const v = new THREE.Vector3().subVectors(at, centre).setY(0);
      if (v.lengthSq() < 1e-6) v.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      v.normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      v.y = speed * (0.5 + Math.random() * 0.8);
      list.push({ kind: 'shed', p: at.clone(), v, t: 0, life: life * (0.7 + Math.random() * 0.6), size: size * (0.6 + Math.random() * 0.8), ph: Math.random() * 6.28 });
    },
    /** A mote that flies in from `from` to `to` (world) over `dur` s after `delay` s, and is gone on arrival. */
    gather(from, to, { size = 0.035, dur = 0.6, delay = 0 } = {}) {
      if (list.length >= max) return;
      list.push({ kind: 'gather', p0: from.clone(), p1: to.clone(), p: from.clone(), t: -delay, life: dur, size: size * (0.6 + Math.random() * 0.8), ph: Math.random() * 6.28 });
    },
    clear() { list.length = 0; im.count = 0; },
    update(dt) {
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        m.t += dt;
        if (m.t >= m.life) { list.splice(i, 1); continue; }
        let k;
        if (m.kind === 'shed') {
          // buoyant drift with a little swirl, slowing as it goes
          const drag = Math.exp(-dt * 1.2);
          m.v.multiplyScalar(drag);
          m.p.addScaledVector(m.v, dt);
          m.p.x += Math.sin(m.t * 3 + m.ph) * 0.06 * dt; m.p.z += Math.cos(m.t * 2.6 + m.ph) * 0.06 * dt;
          const u = m.t / m.life;
          k = Math.min(1, u * 8) * (1 - ease(u));
        } else {
          if (m.t < 0) { k = 0; } else {
            const u = m.t / m.life, e = ease(u);
            m.p.lerpVectors(m.p0, m.p1, e);
            // a spiral in, flattening as it arrives
            const r = 0.25 * (1 - e);
            m.p.x += Math.cos(m.ph + u * 5) * r; m.p.z += Math.sin(m.ph + u * 5) * r;
            k = Math.min(1, u * 4) * (u > 0.85 ? (1 - u) / 0.15 : 1);
          }
        }
        if (k <= 0.01) continue;
        _s.setScalar(m.size * k);
        _m.compose(m.p, _q, _s);
        im.setMatrixAt(n++, _m);
      }
      im.count = n;
      if (n) im.instanceMatrix.needsUpdate = true;
    },
  };
}
