// The rotifer meadows: crowds you push and bite through (design/combat-ideas.md,
// "A set piece: pushing and biting through a crowd"), a band across every
// spoke on the meadow ring (world.js RINGS.meadow), so whichever way you go out
// you walk through one.
//
// The members are bdelloid rotifers (~150 µm extended here, ~40 µm across),
// each attached to the leaf by its foot (the toes and spurs), body telescoped
// up and leaning, the two wheel-like ciliary discs of the corona spread at the
// top, beating to pull water in. Pushing through bends them: the crowd
// (shared/crowd.js, 2D in the leaf's own u-v plane) moves each rotifer's head,
// which springs back over its anchored foot; the vertex shader bends the body
// from the foot to the head. A stylet jab (X) into the meadow makes those in
// front snap shut and contract onto their foot (bdelloids really withdraw the
// corona and contract when touched) and clears a lane; they re-extend a while
// later, a little further off (bdelloids creep like leeches). Nothing here
// times the player, and rotifers never harm you: a dense patch slows you a
// little, that is all.
//
// Labelled departures: the density is a game choice (rotifer densities in
// moss were not read, design §Real crowds); the jab clearing them is a
// game rule (a grazing tardigrade does not hunt rotifers; Milnesium does).
import * as THREE from '../shared/vendor/three.module.min.js';
import { createCrowd } from '../shared/crowd.js';
import { OPT, OPTICAL_BLEND, OPTICAL_FRAG_HEAD } from '../shared/techniques/tardigrade-dic.js';
import { litMaterial } from './materials.js';
import { LAYER_SPECIMEN } from './world.js';

export const MEADOW = { count: 110, radius: 0.27 };
const H = 1.45;         // extended height (units of 100 µm)
const BODY_R = 0.2;     // trunk radius

/** Closed rotifer geometry, foot at z = 0, the corona at z = H (leaf normal = +z). */
function rotiferGeometry() {
  // Profile (r, z): toes, foot, telescoping pseudo-segments, trunk, neck, head.
  const prof = [[0, 0], [0.05, 0.0], [0.07, 0.06], [0.06, 0.14], [0.09, 0.22]];
  const n = 14;
  for (let k = 1; k <= n; k++) {
    const t = k / n, z = 0.22 + t * (H - 0.34);
    const env = BODY_R * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.25)) ** 0.7) * (t > 0.85 ? 0.75 : 1);
    prof.push([env * (1 + 0.07 * Math.sin(k * Math.PI)), z]); // the pseudo-segment rings
  }
  prof.push([0.11, H - 0.06], [0.06, H - 0.01], [0, H]);
  const lathe = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 10);
  lathe.rotateX(Math.PI / 2); // lathe axis y -> z
  const parts = [lathe];
  for (const s of [1, -1]) {
    const disc = new THREE.SphereGeometry(0.15, 10, 6);
    disc.scale(1, 1, 0.38);
    disc.translate(0, 0.13 * s, H + 0.03);
    const ring = new THREE.TorusGeometry(0.155, 0.022, 5, 18);
    ring.translate(0, 0.13 * s, H + 0.05);
    parts.push(disc, ring);
  }
  // The rostrum between the discs.
  const ros = new THREE.CapsuleGeometry(0.035, 0.12, 3, 6);
  ros.rotateX(Math.PI / 2);
  ros.translate(0.09, 0, H - 0.02);
  parts.push(ros);
  let off = 0;
  const pos = [], idx = [];
  for (const g of parts) {
    const ng = g.index ? g : g.toNonIndexed();
    const p = ng.attributes.position.array;
    for (let i = 0; i < p.length; i++) pos.push(p[i]);
    const ix = ng.index ? ng.index.array : [...Array(p.length / 3).keys()];
    for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off);
    off += p.length / 3;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  return out;
}

// Instanced optical material: the bend (head offset over the anchored foot)
// and the corona's beating cilia in the vertex shader.
const VERT = /* glsl */ `
precision highp float;
in vec3 position;
in mat4 instanceMatrix;
in vec4 aBend;          // bend u, bend v (leaf units), phase, extension 0..1
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
out float vDepth;
out vec3 vLocal;
void main() {
  vec3 p = position;
  float top = smoothstep(${(H - 0.08).toFixed(3)}, ${(H + 0.02).toFixed(3)}, p.z) * aBend.w;
  // the corona's wheels: a wave running round each disc rim (the beating cilia)
  vec2 c = vec2(0.0, p.y > 0.0 ? 0.13 : -0.13);
  vec2 r = p.xy - c;
  float ang = atan(r.y, r.x);
  p.xy += normalize(r + 1e-5) * top * 0.022 * sin(ang * 9.0 - uTime * 22.0 + aBend.z);
  float t = clamp(p.z / ${H.toFixed(3)}, 0.0, 1.2);
  vec4 w = instanceMatrix * vec4(p, 1.0);
  // feeding sway, then the push: the body curves from the foot to the head
  vec2 b = aBend.xy + aBend.w * 0.2 * vec2(sin(uTime * 0.9 + aBend.z), cos(uTime * 0.7 + aBend.z * 1.3));
  w.xy += b * t * t;
  w.z -= dot(b, b) * t * t * 0.22;
  vec4 mv = modelViewMatrix * w;
  vDepth = -mv.z;
  vLocal = position;
  gl_Position = projectionMatrix * mv;
}`;

function rotiferMaterial() {
  return new THREE.RawShaderMaterial({
    ...OPTICAL_BLEND,
    uniforms: { uRef: OPT.uRef, uTime: { value: 0 }, uDn: { value: 0.022 }, uAbs: { value: new THREE.Vector3(0.03, 0.07, 0.09) } },
    vertexShader: VERT,
    fragmentShader: OPTICAL_FRAG_HEAD + /* glsl */ `
uniform float uDn;
uniform vec3 uAbs;
void main() {
  float s = gl_FrontFacing ? -1.0 : 1.0;
  float z = vDepth - uRef;
  oOpd = vec4(s * z * uDn, s * z * z * 0.5, s * z, 0.0);
  oAbs = vec4(s * z * uAbs, 0.0);
}`,
  });
}

export class Meadow {
  /** One band of rotifers across `leaf` from u0 to u1 (leaf units). */
  constructor(scene, world, { leaf, u0, u1, count = MEADOW.count, seed = 4242 }) {
    const L = (this.L = leaf);
    Object.assign(this, { u0, u1 });
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.group.matrix.copy(L.matrix);
    scene.add(this.group);
    const geo = rotiferGeometry();
    const N = count;
    this.bend = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
    this.bend.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aBend', this.bend);
    const opt = rotiferMaterial(), lit = litMaterial({ color: 0xd9c3b0, opacity: 0.6, roughness: 0.5 });
    this.mat = opt;
    const mesh = new THREE.InstancedMesh(geo, opt, N);
    mesh.userData = { opt, lit };
    mesh.layers.set(LAYER_SPECIMEN);
    mesh.name = 'rotifer meadow';
    this.group.add(mesh);
    // u-v of the leaf as the crowd's 2D x-y; z is the leaf's upper surface.
    const hw = L.hwAt((u0 + u1) / 2) * 1.2;
    this.crowd = createCrowd({ scene: null, THREE, mesh, count: N, mode: '2d', z: L.thick / 2,
      bounds: { minX: u0, maxX: u1, minY: -hw, maxY: hw },
      radius: MEADOW.radius, speed: 0.05, playerRadius: 1.15, respawn: 14, seed });
    // generous bounds: the bend reaches ~2 units sideways
    mesh.boundingSphere.radius += 2.5;
    this.mesh = mesh;
    const m = this.crowd.members;
    this.home = new Float32Array(N * 2);
    this.prevLife = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.keepOnLeaf(i, true);
      this.home[2 * i] = m.x[i]; this.home[2 * i + 1] = m.y[i];
      this.prevLife[i] = 1;
      this.bend.array[4 * i + 2] = (i * 2.399) % 6.283;
    }
    this.t = 0;
    this.players = [];
    this._loc = {};
    this.writeInstances();
  }

  /** Members live on the leaf, inside its outline (the crowd's area is a box). */
  keepOnLeaf(i, scatter = false) {
    const m = this.crowd.members, L = this.L;
    const u = m.x[i];
    const lim = Math.max(0.2, L.hwAt(u) - 0.3);
    if (Math.abs(m.y[i]) > lim) m.y[i] = scatter ? (((i * 0.6180339) % 1) * 2 - 1) * lim : Math.sign(m.y[i]) * lim;
  }

  /** Is a walker in the meadow (on the leaf's upper face, within its stretch)? */
  inside(w, pad = 0) { return w.leaf === this.L && w.side > 0 && w.u > this.u0 - pad && w.u < this.u1 + pad; }

  /**
   * walkers: the players' walkers. Returns, per walker, how crowded it is
   * (0..1), which main.js turns into a mild slowdown. others: more walkers
   * that shove through (Milnesium), [{ walker, radius }].
   */
  update(dt, walkers, others = []) {
    this.t += dt;
    this.mat.uniforms.uTime.value = this.t;
    const ps = this.players;
    ps.length = 0;
    walkers.forEach((w, i) => { if (this.inside(w, 2)) ps.push({ position: { x: w.u, y: w.v }, radius: 1.15, slot: i }); });
    others.forEach((o, i) => { if (this.inside(o.walker, 2)) ps.push({ position: { x: o.walker.u, y: o.walker.v }, radius: o.radius, slot: 10 + i }); });
    this.crowd.update(dt, ps);
    const m = this.crowd.members, N = m.count, home = this.home;
    const k = 1 - Math.exp(-dt * 2.6);
    for (let i = 0; i < N; i++) {
      const l = m.life[i];
      // re-extended after a contraction, perhaps a little further on: a new anchor
      if (this.prevLife[i] === 0 && l > 0) { this.keepOnLeaf(i); home[2 * i] = m.x[i]; home[2 * i + 1] = m.y[i]; }
      this.prevLife[i] = l;
      // the head springs back over the foot
      m.x[i] += (home[2 * i] - m.x[i]) * k;
      m.y[i] += (home[2 * i + 1] - m.y[i]) * k;
    }
    this.writeInstances();
    // crowding round each walker
    return walkers.map((w) => {
      if (!this.inside(w, 1)) return 0;
      let n = 0;
      for (let i = 0; i < N; i++) {
        if (m.life[i] < 0.5) continue;
        const du = m.x[i] - w.u, dv = m.y[i] - w.v;
        if (du * du + dv * dv < 1.8 * 1.8) n++;
      }
      return Math.min(1, n / 14);
    });
  }

  writeInstances() {
    const m = this.crowd.members, N = m.count, a = this.mesh.instanceMatrix.array, b = this.bend.array, home = this.home;
    for (let i = 0; i < N; i++) {
      const o = i * 16, l = m.life[i];
      // contracted rotifers are squat balls on their foot; gone ones vanish
      const ext = l <= 0 ? 0 : Math.max(0.16, l * l);
      const sxy = l <= 0 ? 0 : 1 + 0.5 * (1 - ext);
      const ang = (i * 2.399) % 6.283, c = Math.cos(ang), s = Math.sin(ang);
      a[o] = c * sxy; a[o + 1] = s * sxy; a[o + 2] = 0; a[o + 3] = 0;
      a[o + 4] = -s * sxy; a[o + 5] = c * sxy; a[o + 6] = 0; a[o + 7] = 0;
      a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = ext * (0.85 + 0.3 * ((i * 0.37) % 1)); a[o + 11] = 0;
      a[o + 12] = home[2 * i]; a[o + 13] = home[2 * i + 1]; a[o + 14] = this.L.thick / 2; a[o + 15] = 1;
      // the head's offset from the foot is the bend (a resting lean towards the light)
      b[4 * i] = (m.x[i] - home[2 * i]) * 1.6 * ext + 0.6 * Math.cos(ang * 3) * ext;
      b[4 * i + 1] = (m.y[i] - home[2 * i + 1]) * 1.6 * ext + 0.6 * Math.sin(ang * 3) * ext;
      b[4 * i + 3] = ext;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.bend.needsUpdate = true;
  }

  /** A stylet jab from a walker: rotifers in front contract. Returns how many. */
  jab(w) {
    if (!this.inside(w, 1)) return 0;
    return this.crowd.bite({ x: w.u, y: w.v }, { x: w.hu, y: w.hv }, 2.0, { angle: 0.85 });
  }

  /** A new day: every rotifer out again on its anchor. */
  reset() {
    const m = this.crowd.members;
    for (let i = 0; i < m.count; i++) { m.x[i] = this.home[2 * i]; m.y[i] = this.home[2 * i + 1]; }
  }

  /** Testing: how many are extended now. */
  get extended() { return this.crowd.alive; }
}

/**
 * Every band on the meadow ring, run as one: only the bands with someone in
 * (or about to be) step their crowd; each band's mesh is culled per view.
 */
export class Meadows {
  constructor(scene, world, bands) {
    this.list = bands.map((b, i) => new Meadow(scene, world, { ...b, seed: 4242 + 97 * i }));
    this.on = true;
  }
  get mesh() { return this; } // the Features switch sets mesh.visible
  set visible(v) { for (const m of this.list) m.mesh.visible = v; }
  /** Per walker, how crowded it is (0..1). Bands nobody is near rest (no work). */
  update(dt, walkers, others = []) {
    const out = walkers.map(() => 0);
    for (const m of this.list) {
      const near = walkers.some((w) => w.leaf === m.L) || others.some((o) => o.walker.leaf === m.L);
      if (!near && m.idle) continue;
      const c = m.update(dt, walkers, others);
      m.idle = !near;
      c.forEach((x, i) => (out[i] = Math.max(out[i], x)));
    }
    return out;
  }
  jab(w) { let n = 0; for (const m of this.list) n += m.jab(w); return n; }
  reset() { for (const m of this.list) m.reset(); }
  /** The band a walker is in (or null). */
  at(w, pad = 0) { return this.list.find((m) => m.inside(w, pad)) || null; }
  get extended() { return this.list.reduce((a, m) => a + m.extended, 0); }
}
