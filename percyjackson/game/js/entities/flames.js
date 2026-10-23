// Live voxel flames on a model: Greek fire on the automaton, the fire of
// Ares's sword, a Fury's whip, an empousa's hair. Small cubes are spawned in
// world space at emitter points on a moving part, then rise, wander, shrink
// and run down a palette (entities/flameSim.js), so the fire flickers and
// trails behind the part as it moves instead of sitting on it as fixed boxes.
//
//   const F = addFlames(rig, { cap: 40, palette: 'greek' });
//   F.source(part, { at: [x, y, z], r: 1.2, rate: 40, life: [0.4, 0.8], size: [0.8, 1.6], up: 10 });
//
// Units are the part's own skin pixels (the kit's units: PX each, times the
// part's world scale), so a champion built bigger burns bigger. Sources:
//   at, to   the emitter point, or a segment from `at` to `to` (a blade)
//   r        a random spread round that point (px)
//   rate     cubes a second; life [min, max] s; size [min, max] px
//   up       their first upward speed (px/s); spread their sideways speed
//   when     optional () => number: a rate factor (0 stops it), read each frame
// Group options: cap (live cubes for the whole model), palette (flameSim
// PALETTES name or stops), rise (upward acceleration, px/s²), turb, drag.
//
// One mesh per model (one draw call), parked in world space (its world
// matrix is fixed at identity although it hangs under the rig's root, so it
// goes and hides with the model). It draws only the live cubes and is left
// out of the animation lint (userData.noLint) and of the model's bounds.
// The cubes are written as plain vertex-coloured geometry (8 corners each,
// FlameSim.writeCubes), not as an InstancedMesh: three.js gives each
// InstancedMesh's matrices their own uniform block (NodeBuffer_<id>), so
// every model on fire compiled a shader program of its own when it first
// drew (an automaton spawned mid-fight was a hitch; design: perf/RENDERING.md).
// As geometry every flame in the game shares one program.
//
// Driven by the rig's own clock: animateExtras (rig.tick) steps it after the
// pose, with the entity, and spawns. A rig animated without a tick (a dying
// monster, enemy.js) still has its cubes stepped from rig.animate, without
// new ones, so the fire burns out instead of freezing; a death pose, a dead
// entity or a dissolved body stop the spawning.
import * as THREE from 'three/webgpu';
import { PX } from './character.js';
import { FlameSim, PALETTES, paletteStops, CUBE_INDEX } from './flameSim.js';

let MAT = null;
const mat = () => (MAT ??= new THREE.MeshBasicNodeMaterial({ color: 0xffffff, vertexColors: true }));
// the index of `cap` cubes
const indexFor = (cap) => { const a = new (cap * 8 > 65535 ? Uint32Array : Uint16Array)(cap * 36); for (let i = 0; i < cap; i++) for (let k = 0; k < 36; k++) a[i * 36 + k] = i * 8 + CUBE_INDEX[k]; return new THREE.BufferAttribute(a, 1); };
const NO_BOX = new THREE.Box3(), FAR = new THREE.Sphere(new THREE.Vector3(0, -1e6, 0), 0);
const noop = () => {};
const _v = new THREE.Vector3(), _c = new THREE.Color();

// A shared budget for every model's flames (1 = full; lower tiers can turn it down).
export const FLAME_BUDGET = { k: 1 };

class Flames {
  constructor(rig, { cap = 40, palette = 'fire', rise = 22, turb = 30, drag = 1.6 } = {}) {
    this.rig = rig; this.cap = cap;
    this.pal = (typeof palette === 'string' ? PALETTES[palette] : palette).map(([h, k]) => [h, k]);
    this.stops = paletteStops(this.pal);
    this.rise = rise; this.turb = turb; this.drag = drag;
    this.sim = new FlameSim(cap);
    this.sources = [];
    this.owed = 0; this.animated = false; this.dying = false;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 24), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cap * 24), 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(indexFor(cap)); g.setDrawRange(0, 0);
    // (world-space cubes: never culled, never in the model's bounds or a ray's way, so nothing measures them)
    g.boundingBox = NO_BOX; g.boundingSphere = FAR;
    const m = new THREE.Mesh(g, mat());
    m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
    m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false;
    m.updateMatrixWorld = noop; m.updateWorldMatrix = noop;   // (identity, even when the rig's root is updated with force)
    m.raycast = noop;
    m.userData.noLint = true; m.userData.flames = true; m.name = 'flames';
    rig.root.add(m);
    this.mesh = m;
  }
  source(part, o = {}) {
    const s = {
      part, at: new THREE.Vector3(...(o.at ?? [0, 0, 0])), to: o.to ? new THREE.Vector3(...o.to) : null, r: o.r ?? 0.8,
      rate: o.rate ?? 30, life: o.life ?? [0.35, 0.7], size: o.size ?? [0.7, 1.4], up: o.up ?? 8, spread: o.spread ?? 3, when: o.when ?? null, acc: Math.random(),
    };
    this.sources.push(s);
    return this;
  }
  // Recolour (a champion's remap, champions.js): fn(THREE.Color) in place.
  remap(fn) {
    for (const p of this.pal) { _c.setHex(p[0]); fn(_c); p[0] = _c.getHex(); }
    this.stops = paletteStops(this.pal);
  }
  visible(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === this.rig.root) return true; } return true; }
  // Step by dt; spawn at the sources when `spawn`.
  advance(dt, spawn, e) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.1);
    const sim = this.sim;
    if (spawn && this.mesh.parent && this.visible(this.rig.root)) {
      const boost = e?.state === 'windup' ? 1.6 : 1;
      for (const s of this.sources) {
        const w = (s.when ? s.when(e) : 1) * boost * FLAME_BUDGET.k;
        if (!(w > 0)) { s.acc = 0; continue; }
        s.acc += s.rate * w * dt;
        if (s.acc < 1) continue;
        if (!this.visible(s.part)) { s.acc = 0; continue; }
        s.part.updateWorldMatrix(true, false);
        const M = s.part.matrixWorld, el = M.elements, k = Math.hypot(el[0], el[1], el[2]) * PX;
        for (; s.acc >= 1; s.acc--) {
          if (sim.n >= sim.cap) { s.acc = 0; break; }
          const u = Math.random(), a = Math.random() * 6.283, rr = s.r * Math.sqrt(Math.random());
          _v.copy(s.at); if (s.to) _v.lerp(s.to, u);
          _v.x += Math.cos(a) * rr; _v.z += Math.sin(a) * rr; _v.y += (Math.random() - 0.5) * s.r * 0.6;
          _v.multiplyScalar(PX).applyMatrix4(M);
          const L = s.life[0] + Math.random() * (s.life[1] - s.life[0]), z = s.size[0] + Math.random() * (s.size[1] - s.size[0]);
          const h = Math.random() * 6.283, sp = s.spread * Math.random();
          sim.spawn(_v.x, _v.y, _v.z, Math.cos(h) * sp * k, s.up * k * (0.6 + Math.random() * 0.8), Math.sin(h) * sp * k, L, z * k, k);
        }
      }
    }
    sim.step(dt, this.rise, this.turb, this.drag);
    const m = this.mesh;
    const P = m.geometry.attributes.position, C = m.geometry.attributes.color;
    const n = sim.writeCubes(P.array, C.array, this.stops);
    m.geometry.setDrawRange(0, n * 36);
    if (n) {   // (only the live cubes go up to the GPU)
      P.clearUpdateRanges(); P.addUpdateRange(0, n * 24); P.needsUpdate = true;
      C.clearUpdateRanges(); C.addUpdateRange(0, n * 24); C.needsUpdate = true;
    }
  }
  dissolved() { const d = this.rig.material?.userData?.dissolve?.value; return d > 0.5; }
}

// A model's flames: a pool and its mesh, sources added with .source().
export function addFlames(rig, opts) {
  const F = new Flames(rig, opts);
  if (!rig.flames) {
    rig.flames = [];
    // a rig animated with no tick after it (a dying monster) still steps its
    // cubes, without new ones
    const anim = rig.animate;
    rig.animate = function (p) {
      for (const f of rig.flames) { if (f.owed > 0) f.advance(f.owed, false); f.owed = p?.dt || 0; f.animated = true; f.dying = p?.action?.type === 'death'; }
      return anim.call(this, p);
    };
  }
  rig.flames.push(F);
  return F;
}

// rig.tick's part (models/animate.js animateExtras calls it): step and spawn.
export function tickFlames(rig, dt, e) {
  const L = rig.flames;
  if (!L) return;
  for (const F of L) {
    const d = F.animated ? F.owed : dt;
    F.owed = 0;
    F.advance(d, !F.dying && !e?.dead && !F.dissolved(), e);
  }
}

// A Greek-fire or fire colour turned by a champion's hue remap (champions.js).
export function remapFlames(rig, fn) { for (const F of rig.flames ?? []) F.remap(fn); }
