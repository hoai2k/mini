// The crowd set piece (micro/design/combat-ideas.md, "pushing and biting
// through a crowd"): a hyphal thicket full of springtails, past halfway on the
// way to the leaf axil, with the predatory mite lurking at its edge and inside.
//
// - The thicket's threads (world.js, buildWorld({ thicket })) run between
//   fungal conidiophores at a mite's body height. Bodies push them aside, but
//   every thread across you drags (drag()). A bite (X) grazes the threads in
//   front away for good (real oribatid feeding: they graze hyphae); they
//   regrow slowly once nobody is near.
// - The springtails are a crowd (shared/crowd.js): soft bodies that drift and
//   jostle and part round a mite that walks into them; a bite shoves the ones
//   in front aside (a box mite does not eat springtails: it scatters them).
//   Members never attack. Closed up (Y), the crowd flows round the capsule.
// - The owner: moving and attacking clear the way without much difficulty,
//   and nothing here is timed. The drag never stops you (at worst half
//   speed), the scramble (B) halves it, and two or three bites open a lane.
// - The gamasid hunts springtails here (it is busy: S38 in the atlas); now and
//   then it eats one that is in front of its chelicerae.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCrowd } from '../shared/crowd.js';
import { gMaterial, CLS } from '../shared/techniques/mite-sem.js';
import { floorH, mergeGeos } from './world.js';

/**
 * A small soil springtail (Isotomidae-like, ~190 µm long, a juvenile size),
 * body along +x, head at +x, its centre ~56 µm above the ground (the crowd
 * sits members at 0.8 radius): a segmented, slightly arched body, a head with
 * two four-segment antennae, three pairs of short legs, the furcula folded
 * under the abdomen. Low-poly: one ~440-triangle mesh drawn for every member.
 */
export function springtailGeometry() {
  const parts = [];
  // body: one elongated ellipsoid, ringed by segment furrows (3 thoracic + 6 abdominal)
  const body = new THREE.SphereGeometry(1, 18, 9);
  {
    const p = body.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ring = 1 - 0.1 * Math.abs(Math.sin((x + 1) * Math.PI * 4.5)); // furrows
      const arch = 6 * (1 - x * x); // a slight hump
      p.setXYZ(i, x * 82 - 12, y * 30 * ring + arch * (y > -0.3 ? 1 : 0.4), z * 32 * ring);
    }
    body.computeVertexNormals();
  }
  parts.push(body);
  // head, tipped down a little
  const head = new THREE.SphereGeometry(1, 12, 7);
  head.scale(30, 25, 27); head.rotateZ(-0.35); head.translate(78, 2, 0);
  parts.push(head);
  // eye patches
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(1, 6, 4); e.scale(8, 6, 5); e.translate(88, 14, s * 20); parts.push(e); }
  const rod = (a, b, r0, r1 = r0 * 0.7, sides = 5) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const g = new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), sides, 1);
    g.translate(0, A.distanceTo(B) / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
    g.translate(A.x, A.y, A.z);
    parts.push(g);
  };
  // antennae: forward and up, four segments
  for (const s of [-1, 1]) {
    let a = [96, 14, s * 10];
    for (const [dx, dy, dz, r] of [[22, 14, 10, 8], [24, 8, 10, 7], [24, 2, 8, 6], [22, -4, 6, 5]]) {
      const b = [a[0] + dx, a[1] + dy, a[2] + s * dz];
      rod(a, b, r);
      a = b;
    }
  }
  // three pairs of short legs, splayed to the ground (~-56 below the centre)
  for (const [x, k] of [[48, 0], [24, 1], [0, 2]]) for (const s of [-1, 1]) {
    const hip = [x, -14, s * 22], knee = [x + 6 - 8 * k, -30, s * 46], foot = [x + 10 - 14 * k, -54, s * 52];
    rod(hip, knee, 9, 8); rod(knee, foot, 8, 4);
  }
  // the furcula (springing organ), folded forward under the abdomen
  for (const s of [-1, 1]) rod([-70, -22, s * 7], [-20, -32, s * 9], 7, 4.5);
  // the ventral tube (collophore)
  const vt = new THREE.CylinderGeometry(6, 8, 14, 6, 1); vt.translate(14, -32, 0); parts.push(vt);
  for (const g of parts) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const ng = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of ng) g.computeVertexNormals();
  return mergeGeos(ng);
}

/**
 * world: from buildWorld (its thicket threads, thicketCut, thicketRegrow, foliage).
 * region: { x, z, r } (layout.js THICKET).
 */
export function createThicket({ scene, world, tex, region, count = 120 }) {
  const R = 70; // a member's radius (µm): ~190 µm springtails
  const mat = gMaterial({ cls: CLS.NPC, tex: tex.cuticle, map: 'tri', scale: 70, bump: 1.2 });
  const mesh = new THREE.InstancedMesh(springtailGeometry(), mat, count);
  mesh.name = 'springtails';
  const crowd = createCrowd({ scene, THREE, count, region: { x: region.x, z: region.z, r: region.r }, radius: R, height: floorH,
    mesh, mode: '3d', playerRadius: 190, respawn: 9, speed: 50, seed: 2718 });
  const strands = world.thicket.strands;
  const fol = world.foliage;
  const _o = new THREE.Vector3(), _p = new THREE.Vector3();
  for (const st of strands) {
    st.mid = st.a.clone().lerp(st.b, 0.5);
    st.half = st.a.distanceTo(st.b) / 2;
  }
  /** Distance (µm) from p to a thread as it is bent now. */
  function strandDist(st, p) {
    let best = Infinity;
    const su = st.rod.su;
    for (let i = 0; i < st.samples.length; i++) {
      fol.offsetAt(st.rod, su[i], _o);
      _p.copy(st.samples[i]).add(_o);
      const d = _p.distanceTo(p);
      if (d < best) best = d;
    }
    return best;
  }
  const near = (p, m = 0) => Math.hypot(p.x - region.x, p.z - region.z) < region.r + m;
  let predT = 3;
  const log = { cleared: 0, shoved: 0, eatenByPredator: 0 };
  const api = {
    crowd, mesh, region, log,
    /** Is p in the thicket (plus a margin)? */
    inside: near,
    /**
     * Each frame. bodies: [{ position (world), radius, slot }] for the players'
     * mites and the predator (all of them shove springtails aside); pred: the
     * predator (createMite) and whether it is free to feed (not hunting you).
     */
    update(dt, bodies, { pred = null, predFree = false, predBody = null } = {}) {
      if (!bodies.some((b) => b !== predBody && near(b.position, 2800))) return; // no player near: the crowd waits
      crowd.update(dt, bodies);
      // the gamasid feeds on springtails in front of its chelicerae every few seconds
      if (pred && predFree && near(pred.center, 100) && (predT -= dt) <= 0) {
        predT = 3 + Math.random() * 3;
        const m = pred.mouth(_p);
        const f = _o.set(1, 0, 0).applyQuaternion(pred.quat).setY(0).normalize();
        const n = crowd.bite(m, { x: f.x, z: f.z }, 150, { angle: 0.7, eat: true });
        if (n) { pred.bite(); log.eatenByPredator += n; }
      }
      world.thicketRegrow(dt, bodies.map((b) => b.position));
    },
    /**
     * How much the thicket slows a mite at `center` (1 free .. 0.5): the
     * threads across its body and the springtails pressing on it. `threads`
     * and `press` are returned too, for the HUD and the checks.
     */
    drag(center, out = { k: 1, threads: 0, press: 0 }) {
      out.k = 1; out.threads = 0; out.press = 0;
      if (!near(center, 300)) return out;
      for (const st of strands) {
        if (st.cut || st.mid.distanceTo(center) > st.half + 200) continue;
        if (strandDist(st, center) < 120) out.threads++;
      }
      const M = crowd.members;
      for (let i = 0; i < M.count; i++) {
        if (!M.alive(i)) continue;
        const dx = M.x[i] - center.x, dz = M.z[i] - center.z;
        if (dx * dx + dz * dz < 330 * 330) out.press++; // in contact (the crowd keeps them ~260 out)
      }
      out.k = Math.max(0.5, 1 / (1 + 0.09 * out.threads + 0.03 * out.press));
      return out;
    },
    /** Something to clear in front of the mouth (threads or springtails)? */
    canClear(mouth) {
      if (!near(mouth, 250)) return false;
      for (const st of strands) if (!st.cut && st.mid.distanceTo(mouth) < st.half + 220 && strandDist(st, mouth) < 190) return true;
      const M = crowd.members;
      for (let i = 0; i < M.count; i++) if (M.alive(i) && Math.hypot(M.x[i] - mouth.x, M.z[i] - mouth.z) < 200) return true;
      return false;
    },
    /** A bite at the mouth, facing fwd {x, z}: grazes away the threads in reach, shoves the springtails in front aside. */
    bite(mouth, fwd) {
      let threads = 0;
      const hits = [];
      for (const st of strands) {
        if (st.cut || st.mid.distanceTo(mouth) > st.half + 240) continue;
        const d = strandDist(st, mouth);
        if (d < 200) hits.push([d, st]);
      }
      hits.sort((a, b) => a[0] - b[0]);
      for (const [, st] of hits.slice(0, 3)) { world.thicketCut(st); threads++; }
      const shoved = crowd.bite(mouth, fwd, 230, { angle: 1.0, eat: false });
      log.cleared += threads; log.shoved += shoved;
      return { threads, shoved };
    },
    /** Threads still standing. */
    get standing() { let n = 0; for (const st of strands) if (!st.cut) n++; return n; },
  };
  return api;
}
