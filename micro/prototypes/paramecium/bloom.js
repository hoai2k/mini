// The Chlamydomonas bloom: a dense band of green flagellates across the route
// between the bladderwort trap and the biofilm (combat-ideas.md, the crowd set
// piece). You push through it (moving shoves the cells aside), gulp your way
// through it (X clears a cone ahead), or wedge a lane open with a dash (A).
// There is no clock: no oxygen meter, nothing times you (the owner: "don't
// implement any time limits").
//
// Bioconvection (C34): swimming algae crowd near the surface, then sink in
// dense plumes between broad upwellings. Here the band holds more cells near
// the coverslip than near the slide, a few plume columns where the cells sit
// lower, and a mild current: down in a plume (≈70 µm/s), gently up elsewhere
// (≈25 µm/s). It carries you a little; it never pins you.
//
// Built on shared/crowd.js. The crowd lives in x-z; the bloom is a volume, so
// it is three crowds stacked as tiers through the depth, each run in a frame
// turned to the route (local +x along the route, +z across it): a player
// pushes only the tier at their depth. Each member's height inside its tier is
// set here after the crowd writes its matrices.
//
// [Departures, labelled in the README: Chlamydomonas is ≈10 µm and swims at
// ≈100 µm/s; members are drawn 14 µm long and wander slower. Whether
// Paramecium eats small algae such as Chlamydomonas is [Unverified]; a gulp
// here takes them in. Their two flagella are not drawn.]
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCrowd } from '../shared/crowd.js';
import { volumeMaterial } from './optics.js';
import { DIR, routePoint, progress, lateral } from './landmarks.js';
import { DEPTH } from './world.js';

export const BLOOM = {
  centre: 4000,  // µm along the route
  half: 300,     // half its thickness along the route
  across: 1100,  // half its width across the route
};

export function createBloom(scene) {
  const group = new THREE.Group();
  group.name = 'bloom';
  group.position.copy(routePoint(BLOOM.centre));
  group.rotation.y = Math.atan2(-DIR.z, DIR.x); // local +x = DIR
  scene.add(group);
  group.updateMatrixWorld();

  const R = 7; // member radius (µm)
  const geo = new THREE.SphereGeometry(1, 12, 8);
  geo.scale(R * 1.15, R * 0.95, R * 0.95); // a little egg, long axis along its heading (+x)
  const mat = volumeMaterial({ dn: 0.03, scatter: 1.1, absorb: [0.012, 0.0028, 0.014], centred: true, rimPow: 2 });
  // tiers: [y0, y1, count]; more cells toward the surface (the coverslip)
  const TIERS = [[20, 220, 380], [220, 430, 520], [430, DEPTH - 15, 760]];
  const tiers = TIERS.map(([y0, y1, count], k) => {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.name = `bloom tier ${k}`;
    const crowd = createCrowd({
      scene: group, THREE, count, mesh, radius: R,
      bounds: { minX: -BLOOM.half, maxX: BLOOM.half, minZ: -BLOOM.across, maxZ: BLOOM.across },
      speed: 30, playerRadius: 40, respawn: 8, sit: 0, seed: 7919 * (k + 1),
    });
    // each member's own height in the tier (it sits lower in a plume)
    const off = new Float32Array(count);
    for (let i = 0; i < count; i++) off[i] = Math.random();
    return { y0, y1, count, crowd, mesh, off, local: [] };
  });

  // plume columns (local x, z): sinking cells, between broad upwellings
  const PLUMES = [[-120, -760], [150, -330], [-60, 80], [110, 520], [-140, 900]];
  const plumeR = 130;
  /** 0..1: how deep inside a plume a local point is. */
  function plume(lx, lz) {
    let m = 0;
    for (const [px, pz] of PLUMES) { const d = Math.hypot(lx - px, lz - pz); if (d < plumeR) m = Math.max(m, 1 - d / plumeR); }
    return m;
  }
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const lp = new THREE.Vector3(), ld = new THREE.Vector3();
  const toLocal = (p, out) => out.copy(p).applyMatrix4(inv);
  const dirLocal = (d, out) => out.set(d.x, 0, d.z).transformDirection(inv);

  /** Is a world point inside the bloom's band (with a margin)? */
  function inside(p, margin = 0) {
    return Math.abs(progress(p) - BLOOM.centre) < BLOOM.half + margin && Math.abs(lateral(p)) < BLOOM.across + margin;
  }
  const tierHas = (T, y) => y > T.y0 - 60 && y < T.y1 + 60;

  let time = 0;
  const api = {
    group, tiers, BLOOM,
    inside,
    /** The bloom's current at p (µm/s, vertical only): down in a plume, gently up elsewhere. 0 outside. */
    currentAt(p) {
      if (!inside(p)) return 0;
      toLocal(p, lp);
      const k = plume(lp.x, lp.z);
      return k > 0 ? -70 * Math.min(1, k * 1.6) : 25;
    },
    /**
     * Step every tier. `players`: [{ position (world), velocity?, slot, alive }].
     * A player shoves only the tier(s) at their depth.
     */
    update(dt, players) {
      time += dt;
      for (const T of tiers) {
        T.local.length = 0;
        for (const p of players) {
          if (!p.alive || !tierHas(T, p.position.y) || !inside(p.position, 200)) continue;
          T.local.push({ position: toLocal(p.position, new THREE.Vector3()), slot: p.slot, radius: 40 });
        }
        T.crowd.update(dt, T.local);
        // heights: a member's place in its tier, lower in a plume, bobbing a little
        const a = T.mesh.instanceMatrix.array, M = T.crowd.members;
        const h = T.y1 - T.y0;
        for (let i = 0; i < T.count; i++) {
          const k = plume(M.x[i], M.z[i]);
          const y = T.y0 + h * (0.08 + 0.84 * T.off[i]) * (1 - 0.45 * k) + 6 * Math.sin(time * 0.9 + i * 1.7);
          a[i * 16 + 13] = y;
        }
        T.mesh.instanceMatrix.needsUpdate = true;
      }
    },
    /**
     * Clear cells in a cone ahead of `pos` (world) toward `dir` (world), in the
     * tiers at that depth: eat (a gulp) or fling aside (eat: false, a dash).
     * Returns how many cells were taken or moved.
     */
    bite(pos, dir, reach, { eat = true, angle = 0.9 } = {}) {
      if (!inside(pos, reach)) return 0;
      toLocal(pos, lp); dirLocal(dir, ld);
      let n = 0;
      for (const T of tiers) if (tierHas(T, pos.y)) n += T.crowd.bite(lp, ld, reach, { eat, angle });
      return n;
    },
    /** Members near a world point (for tests and the HUD). */
    countNear(p, r) {
      toLocal(p, lp);
      let n = 0;
      for (const T of tiers) {
        if (!tierHas(T, p.y)) continue;
        const M = T.crowd.members;
        for (let i = 0; i < T.count; i++) if (M.alive(i) && Math.hypot(M.x[i] - lp.x, M.z[i] - lp.z) < r) n++;
      }
      return n;
    },
    get alive() { return tiers.reduce((s, T) => s + T.crowd.alive, 0); },
  };
  return api;
}
