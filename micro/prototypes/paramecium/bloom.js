// The Chlamydomonas bloom: a dense band of green flagellates lying across the
// way, placed by the director (main.js, route.js) in water nobody has seen,
// ahead of whoever leads (combat-ideas.md, the crowd set piece); hidden and
// parked until then. You push through it (moving shoves the cells aside), gulp your way
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
// turned to the way it was met (local +x along it, +z across): a player
// pushes only the tier at their depth. Each member's height inside its tier is
// set here after the crowd writes its matrices.
//
// [Departures, labelled in the README: Chlamydomonas is ≈10 µm and swims at
// ≈100 µm/s; members are drawn 14 µm long and wander slower. Whether
// Paramecium eats small algae such as Chlamydomonas is [Unverified]; a gulp
// here takes them in. Their two flagella are not drawn.]
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCrowd } from '../shared/crowd.js';
import { volumeMaterial, sceneFrustum } from './optics.js';
import { START } from './landmarks.js';
import { BLOOM_BAND } from './route.js';
import { DEPTH } from './world.js';

export const BLOOM = {
  half: BLOOM_BAND.half,     // half its thickness, along the way it was met
  across: BLOOM_BAND.across, // half its width, across it
  bearing: 0,    // the way it was met (place())
  x: START.x, z: START.z + 1e7, // its middle (parked far off until placed)
};

export function createBloom(scene) {
  const group = new THREE.Group();
  group.name = 'bloom';
  /** Put the band's middle at (x, z), lying across bearing a (local +x along a). */
  function setFrame(x, z, a) {
    Object.assign(BLOOM, { x, z, bearing: a });
    group.position.set(x, 0, z);
    group.rotation.y = -a; // local +x = along bearing a
    group.updateMatrixWorld(true);
  }
  setFrame(BLOOM.x, BLOOM.z, 0);
  group.visible = false;
  scene.add(group);

  const R = 7; // member radius (µm)
  const geo = new THREE.SphereGeometry(1, 10, 6); // ≈100 triangles: 14 µm cells
  geo.scale(R * 1.15, R * 0.95, R * 0.95); // a little egg, long axis along its heading (+x)
  const mat = volumeMaterial({ dn: 0.03, scatter: 1.1, absorb: [0.022, 0.0048, 0.026], centred: true, rimPow: 2 });
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
    // per-view copies (culling): each view draws only the cells inside its own
    // part of the screen, from its own buffer (see cullView)
    return { y0, y1, count, crowd, mesh, off, local: [], views: [] };
  });
  const MEMBER_R = 16; // a member's reach from its centre, stretched and wobbling (≤ 13.1 µm), with a margin

  // plume columns (local x, z): sinking cells, between broad upwellings
  const PLUMES = [[-90, -640], [110, -260], [-50, 80], [90, 420], [-100, 720]];
  const plumeR = 130;
  /** 0..1: how deep inside a plume a local point is. */
  const PX = PLUMES.map((q) => q[0]), PZ = PLUMES.map((q) => q[1]), plumeR2 = plumeR * plumeR;
  function plume(lx, lz) {
    let m = 0;
    for (let k = 0; k < PX.length; k++) {
      const dx = lx - PX[k], dz = lz - PZ[k];
      if (dx * dx + dz * dz >= plumeR2) continue; // most cells are in no plume: no square root
      const d = Math.hypot(dx, dz);
      if (d < plumeR) m = Math.max(m, 1 - d / plumeR);
    }
    return m;
  }
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const lq = new THREE.Vector3();
  const lp = new THREE.Vector3(), ld = new THREE.Vector3();
  const toLocal = (p, out) => out.copy(p).applyMatrix4(inv);
  const dirLocal = (d, out) => out.set(d.x, 0, d.z).transformDirection(inv);

  /** Is a world point inside the bloom's band (with a margin)? */
  function inside(p, margin = 0) {
    toLocal(p, lq);
    return Math.abs(lq.x) < BLOOM.half + margin && Math.abs(lq.z) < BLOOM.across + margin;
  }
  const tierHas = (T, y) => y > T.y0 - 60 && y < T.y1 + 60;

  // --- per-view culling: a view's own copy of each tier, holding only the cells
  // inside the part of the screen it draws (its frustum, or a split view's
  // padded region). The kept cells stay in their order, so the additive
  // buffers sum the same values in the same order: the image is unchanged.
  const frustum = new THREE.Frustum(), cs = new THREE.Sphere(new THREE.Vector3(), MEMBER_R);
  let viewing = false;
  function viewMesh(T, key) {
    let m = T.views[key];
    if (!m) {
      m = T.views[key] = new THREE.InstancedMesh(T.mesh.geometry, T.mesh.material, T.count);
      m.name = `${T.mesh.name} (view ${key})`;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.boundingSphere = T.mesh.boundingSphere; // the same sort depth as the whole tier
      m.computeBoundingSphere = () => {};
      m.frustumCulled = false; // culled here, cell by cell
      m.visible = false;
      group.add(m);
    }
    return m;
  }

  let time = 0, placed = false;
  // heights: a member's place in its tier, lower in a plume, bobbing a little
  function placeHeights(T) {
    const a = T.mesh.instanceMatrix.array, M = T.crowd.members;
    const h = T.y1 - T.y0;
    for (let i = 0; i < T.count; i++) {
      const k = plume(M.x[i], M.z[i]);
      const y = T.y0 + h * (0.08 + 0.84 * T.off[i]) * (1 - 0.45 * k) + 6 * Math.sin(time * 0.9 + i * 1.7);
      a[i * 16 + 13] = y;
    }
    T.mesh.instanceMatrix.needsUpdate = true;
  }
  const api = {
    group, tiers, BLOOM, on: true,
    inside,
    /** Distance (µm, in the plane) from p to the band. */
    distTo(p) {
      const ox = p.x - BLOOM.x, oz = p.z - BLOOM.z, c = Math.cos(BLOOM.bearing), sn = Math.sin(BLOOM.bearing);
      const lx = ox * c + oz * sn, lz = -ox * sn + oz * c;
      return Math.hypot(Math.max(0, Math.abs(lx) - BLOOM.half), Math.max(0, Math.abs(lz) - BLOOM.across));
    },
    /** Put the band (unseen, by main.js's director) at (x, z), across bearing a, and show it. */
    place(x, z, a) { setFrame(x, z, a); inv.copy(group.matrixWorld).invert(); placed = false; group.visible = true; api.placed = true; },
    /** Drift the band by (dx, dz) (it swims over to a lingering player: behaviour, not a placement). */
    shift(dx, dz) { setFrame(BLOOM.x + dx, BLOOM.z + dz, BLOOM.bearing); inv.copy(group.matrixWorld).invert(); },
    placed: false,
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
      // nobody near: the cells hold still (nothing there to see move), and the CPU is spared
      if (!players.some((p) => p.alive && inside(p.position, 1400))) {
        // but place every cell at its height once, so the bloom reads as a cloud from afar (not a flat sheet)
        if (!placed) { for (const T of tiers) placeHeights(T); placed = true; }
        return;
      }
      for (const T of tiers) {
        T.local.length = 0;
        for (const p of players) {
          if (!p.alive || !tierHas(T, p.position.y) || !inside(p.position, 200)) continue;
          T.local.push({ position: toLocal(p.position, new THREE.Vector3()), slot: p.slot, radius: 40 });
        }
        T.crowd.update(dt, T.local);
        placeHeights(T);
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
    /**
     * Level of detail for a view from `camPos`: far off, only a share of the
     * cells is drawn (the members are in random order, so any prefix is an
     * even thinning). Returns the share drawn.
     */
    lod(camPos) {
      toLocal(camPos, lp);
      const dx = Math.max(0, Math.abs(lp.x) - BLOOM.half), dz = Math.max(0, Math.abs(lp.z) - BLOOM.across);
      const d = Math.hypot(dx, dz);
      const k = d < 700 ? 1 : d < 1500 ? 0.5 : d < 2500 ? 0.25 : 0.1;
      for (const T of tiers) T.mesh.count = Math.max(1, Math.round(T.count * k));
      return k;
    },
    /**
     * Per-view culling: for one view's render (call after lod), draw from a
     * copy of each tier that holds only the cells inside `box` ([x0, y0, x1,
     * y1], normalised device coordinates; null: the whole screen) as seen by
     * `camera`. `key` names the view (each keeps its own buffers). uncull()
     * after the render puts the whole tiers back. Returns the cells kept.
     */
    cullView(camera, box = null, key = 0) {
      if (!api.on || !group.visible) return 0;
      sceneFrustum(frustum, camera, box, group.matrixWorld);
      let kept = 0;
      for (const T of tiers) {
        const src = T.mesh.instanceMatrix.array, n = T.mesh.count, life = T.crowd.members.life;
        const m = viewMesh(T, key), dst = m.instanceMatrix.array;
        let k = 0;
        for (let i = 0; i < n; i++) {
          if (life[i] <= 0) continue; // gone: drawn at zero size
          const o = i * 16;
          cs.center.set(src[o + 12], src[o + 13], src[o + 14]);
          if (!frustum.intersectsSphere(cs)) continue;
          const d = k * 16;
          for (let j = 0; j < 16; j++) dst[d + j] = src[o + j];
          k++;
        }
        kept += k;
        m.count = k;
        if (k) {
          m.instanceMatrix.clearUpdateRanges();
          m.instanceMatrix.addUpdateRange(0, k * 16);
          m.instanceMatrix.needsUpdate = true;
        }
        m.visible = k > 0;
        T.mesh.visible = false;
      }
      viewing = true;
      return kept;
    },
    /** After a view's render: the whole tiers again (for any other render of the scene). */
    uncull() {
      if (!viewing) return;
      viewing = false;
      for (const T of tiers) { T.mesh.visible = true; for (const m of T.views) if (m) m.visible = false; }
    },
    get alive() { return tiers.reduce((s, T) => s + T.crowd.alive, 0); },
  };
  return api;
}
