// Contact puffs: when the cell bumps into something, a little cloud of
// refractile specks (stirred-up debris and the cell's own boundary layer)
// bursts from the contact point along the surface and fades, so every
// collision shows where it happened. Drawn with the optic points material,
// so it is part of the image (it defocuses like everything else).
import * as THREE from '../shared/vendor/three.module.min.js';
import { pointsMaterial } from './optics.js';

const PER = 22, SLOTS = 4, N = PER * SLOTS;

export function createContactFx(scene) {
  const quad = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index; geo.attributes.position = quad.attributes.position;
  const iPos = new Float32Array(N * 4), iP = new Float32Array(N * 4);
  const posA = new THREE.InstancedBufferAttribute(iPos, 4), pA = new THREE.InstancedBufferAttribute(iP, 4);
  geo.setAttribute('iPos', posA); geo.setAttribute('iP', pA);
  geo.instanceCount = N;
  const mesh = new THREE.Mesh(geo, pointsMaterial({ absorb: [0.035, 0.03, 0.02] }));
  mesh.frustumCulled = false;
  scene.add(mesh);
  const parts = Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, r: 2, seed: Math.random() }));
  let slot = 0;
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3();

  return {
    /** A puff at point p on a surface with normal n; strength 0..1. */
    puff(p, n, strength = 1) {
      const k = Math.max(0.3, Math.min(1, strength));
      t1.set(n.y, n.z, n.x).cross(n).normalize();
      if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0);
      t2.crossVectors(n, t1).normalize();
      for (let i = 0; i < PER; i++) {
        const q = parts[slot * PER + i];
        const a = (i / PER) * Math.PI * 2 + Math.random() * 0.4;
        const sp = (60 + Math.random() * 140) * k;
        q.p.copy(p).addScaledVector(n, 3);
        q.v.copy(t1).multiplyScalar(Math.cos(a) * sp).addScaledVector(t2, Math.sin(a) * sp).addScaledVector(n, (20 + Math.random() * 60) * k);
        q.max = q.life = 0.45 + Math.random() * 0.35;
        q.r = 2 + Math.random() * 3;
      }
      slot = (slot + 1) % SLOTS;
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        const q = parts[i];
        if (q.life > 0) {
          q.life = Math.max(0, q.life - dt);
          q.p.addScaledVector(q.v, dt);
          q.v.multiplyScalar(Math.exp(-dt * 7)); // viscous: the specks stop almost at once
        }
        const f = q.life > 0 ? q.life / q.max : 0;
        iPos[i * 4] = q.p.x; iPos[i * 4 + 1] = q.p.y; iPos[i * 4 + 2] = q.p.z;
        iP[i * 4] = f > 0 ? q.r : 0.0001; iP[i * 4 + 1] = 0.12 * f; iP[i * 4 + 2] = 14 * f; iP[i * 4 + 3] = q.seed;
      }
      posA.needsUpdate = true; pA.needsUpdate = true;
    },
  };
}
