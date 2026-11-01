// The patch of moss: the shoot round the start (a few overlapping leaves,
// planar laminae at different tilts), and the spokes of leaves running out
// from it in every direction (the encounter rings, `RINGS`), the water film on
// them, and food in the film.
//
// Each leaf has its own frame: u along the leaf (0 at the base, len at the
// tip), v across it (±half width), n out of its upper face. The film is a
// capacity field per leaf (how long a spot stays wet: wetter near the base and
// the leaf axils, where leaves nearly touch, and in random hollows) minus one
// global dryness value that stays put (no drying clock: the film only thins in
// the visible dry patches laid out on the dry ring).
import * as THREE from '../shared/vendor/three.module.min.js';
import { cellAt, sphagCell, snapToWall, LAMINA, SPHAG, hash1 } from './patterns.js';
import { opticalMaterial, leafOpticalMaterial, particleOpticalMaterial, litMaterial, leafLitMaterial } from './materials.js';

// ---------------------------------------------------------------- the rings
// The scenery is laid out in rings round the start, the same in every
// direction (the meadows and the dry patches: you push through the one and
// walk round the other); the enemies and events (Milnesium, the pool and
// Prionchulus) are placed as you go by the encounter director
// (encounters.js). Distances are straight-line, horizontal (x-z), from the
// start, in units of 100 µm. The default view (12.5×) is 14.4 units across.
export const SPOKES = 12;              // radial chains of leaves, 30° apart
export const RINGS = {
  warm: 15,                            // 0-15: the shoot round the start
  milnesium: { r: 7, leash: 5 },       // Milnesium's water round where it is placed (it stalks within 6.5; it lets you go 5 past it)
  meadow: [40, 46],                    // a band of rotifers across every spoke
  dry: [55, 62],                       // dry patches: bare cells, slow going, plain to see
  portal: 84,                          // the rim: a pool can dip at a spoke's tip here
  post: 4.2,                           // Prionchulus on guard this far inside the portal (it wakes ~10.7 inside)
};
/** Where you start (leaf A, 650 µm from its base) and wake after a restart. */
export const START_SPOT = { leaf: 0, u: 6.5, v: 0.6 };

export const LAYER_SUBSTRATE = 1;
export const LAYER_SPECIMEN = 2;
const FL = 200, FW = 56; // film grid (along, across)

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const h = (a, b) => hash1(a * 57.3 + b * 113.1 + seed * 7.7);
  const s = (t) => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y, seed) => 0.55 * vnoise(x, y, seed) + 0.3 * vnoise(x * 2.1, y * 2.1, seed + 3) + 0.15 * vnoise(x * 4.3, y * 4.3, seed + 9);

export class Leaf {
  constructor({ id, name, kind = 'lamina', base, dir, normalHint, len, hw, thick = 0.12, pool = false, spoke = -1, dry = [] }) {
    Object.assign(this, { id, name, kind, len, hw0: hw, thick, pool, spoke, dry });
    this.U = new THREE.Vector3(...dir).normalize();
    const nh = new THREE.Vector3(...normalHint);
    this.N = nh.sub(this.U.clone().multiplyScalar(nh.dot(this.U))).normalize();
    this.V = new THREE.Vector3().crossVectors(this.N, this.U);
    this.base = new THREE.Vector3(...base);
    this.matrix = new THREE.Matrix4().makeBasis(this.U, this.V, this.N).setPosition(this.base);
    this.uniforms = { uDry: { value: 0 }, uTex: { value: null }, uHasTex: { value: 0 }, uWallMap: { value: null }, uTile: { value: 2 }, uTexMean: { value: new THREE.Vector3(0.7, 0.7, 0.7) } };
    this.wallMap = null; // set when the delivered micrograph arrives (wallmap.js)
    this.cellFn = (u, v) => (this.wallMap ? this.wallMap.cell(u, v) : cellAt(this.kind, u, v));
    this.cap = new Float32Array(FL * FW);
    this.filmData = new Uint8Array(FL * FW);
    this.filmTex = new THREE.DataTexture(this.filmData, FL, FW, THREE.RedFormat, THREE.UnsignedByteType);
    this.filmTex.magFilter = this.filmTex.minFilter = THREE.LinearFilter;
    this.filmTex.needsUpdate = true;
    // Emptied (eaten) cells.
    const cw = kind === 'sphagnum' ? SPHAG.b : LAMINA.cellW, cl = kind === 'sphagnum' ? SPHAG.a : LAMINA.cellL;
    const rows = 2 * Math.ceil(hw / cw) + 4, cols = Math.ceil(len / cl) + 4;
    this.eaten = new Uint8Array(rows * cols);
    this.eatenTex = new THREE.DataTexture(this.eaten, cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
    this.eatenTex.needsUpdate = true;
    this.eatenInfo = new THREE.Vector4(cols, rows, Math.ceil(hw / cw) + 2, 2);
  }

  /** Half width at distance u from the base: lanceolate, truncate base, acute tip. */
  hwAt(u) {
    const t = Math.min(1, Math.max(0, u / this.len));
    const f = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.75);
    const b = 0.42 * (1 - THREE.MathUtils.smoothstep(t, 0.08, 0.25));
    return this.hw0 * Math.max(f, b);
  }
  inside(u, v, margin = 0) {
    return u > margin && u < this.len - margin && Math.abs(v) < this.hwAt(u) - margin;
  }
  toLocal(p, out = {}) {
    const d = _v.subVectors(p, this.base);
    out.u = d.dot(this.U); out.v = d.dot(this.V); out.n = d.dot(this.N);
    return out;
  }
  toWorld(u, v, n, out = new THREE.Vector3()) {
    return out.copy(this.base).addScaledVector(this.U, u).addScaledVector(this.V, v).addScaledVector(this.N, n);
  }
  /** World direction of a leaf-plane vector. */
  dirWorld(du, dv, out = new THREE.Vector3()) {
    return out.set(0, 0, 0).addScaledVector(this.U, du).addScaledVector(this.V, dv);
  }
  surfaceN(side) { return this.N.clone().multiplyScalar(side); }

  capAt(u, v) {
    const fx = (u / this.len) * (FL - 1), fy = ((v + this.hw0) / (2 * this.hw0)) * (FW - 1);
    const x = Math.max(0, Math.min(FL - 1.001, fx)), y = Math.max(0, Math.min(FW - 1.001, fy));
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const c = this.cap, i = yi * FL + xi;
    return (c[i] * (1 - xf) + c[i + 1] * xf) * (1 - yf) + (c[i + FL] * (1 - xf) + c[i + FL + 1] * xf) * yf;
  }
  cellIndex(u, v) {
    const c = cellAt(this.kind, u, v);
    const col = c.col + this.eatenInfo.w, row = c.row + this.eatenInfo.z;
    if (col < 0 || row < 0 || col >= this.eatenInfo.x || row >= this.eatenInfo.y) return -1;
    return row * this.eatenInfo.x + col;
  }

  /** Can the stylets get anything from the cell under (u, v)? Returns null if so, else why not. */
  whyNotEat(u, v) {
    if (!this.inside(u, v)) return 'Nothing to bite here';
    if (this.wallMap) {
      if (!this.wallMap.living(u, v)) return this.kind === 'sphagnum' ? 'A hyaline cell: dead, empty, only water' : 'A cell wall: nothing to suck';
      return this.wallMap.isEaten(u, v) ? 'This cell is already empty' : null;
    }
    if (this.kind === 'sphagnum' && sphagCell(u, v).dist > 0.03) return 'A hyaline cell: dead, empty, only water';
    if (this.kind === 'lamina' && Math.abs(v) < LAMINA.costaW) return 'The costa: thick-walled, nothing to suck';
    const i = this.cellIndex(u, v);
    return i < 0 || this.eaten[i] ? 'This cell is already empty' : null;
  }

  eat(u, v) {
    if (this.wallMap) { this.wallMap.eat(u, v); return; }
    const i = this.cellIndex(u, v);
    if (i >= 0) { this.eaten[i] = 255; this.eatenTex.needsUpdate = true; }
  }

  buildMesh() {
    const shape = new THREE.Shape();
    const n = 60;
    shape.moveTo(0, -this.hwAt(0));
    for (let i = 1; i <= n; i++) { const u = (i / n) * this.len; shape.lineTo(u, -this.hwAt(u)); }
    for (let i = n - 1; i >= 0; i--) { const u = (i / n) * this.len; shape.lineTo(u, this.hwAt(u)); }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: this.thick, bevelEnabled: false, curveSegments: 1 });
    geo.translate(0, 0, -this.thick / 2);
    this.optMat = leafOpticalMaterial(this);
    this.litMat = leafLitMaterial(this);
    const mesh = new THREE.Mesh(geo, this.optMat);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(this.matrix);
    mesh.layers.set(LAYER_SUBSTRATE);
    mesh.userData = { opt: this.optMat, lit: this.litMat };
    // culled per view: off-screen leaves add nothing to any pixel's optical path
    geo.computeBoundingSphere();
    geo.boundingSphere.radius += 0.5;
    this.mesh = mesh;
    return mesh;
  }
}
const _v = new THREE.Vector3();

export class World {
  constructor(scene) {
    this.scene = scene;
    this.seed = 1;
    // No drying clock: the film stays as it is (rain, a test, floods it for a
    // moment and it settles back). Thin and dry film are places, not a time.
    this.dry0 = 0;
    this.dry = this.dry0;
    // The shoot round the start, seen from above: leaves overlap like shingles. Units 100 µm.
    this.leaves = [
      new Leaf({ id: 0, name: 'leaf A', base: [-8, 0, 0], dir: [1, 0, 0.02], normalHint: [0, 1, 0], len: 17, hw: 3.2 }),
      new Leaf({ id: 1, name: 'leaf B (above)', base: [-3.5, 1.05, -5.2], dir: [1, -0.03, 0.42], normalHint: [0.05, 1, -0.12], len: 15, hw: 2.8 }),
      new Leaf({ id: 2, name: 'leaf C (steep)', base: [6.3, -0.15, 0.6], dir: [0.3, 0.78, 0.55], normalHint: [-1, 0.25, -0.2], len: 13, hw: 2.6 }),
      new Leaf({ id: 3, name: 'Sphagnum leaf (below)', kind: 'sphagnum', base: [-6.5, -1.55, 2.2], dir: [1, 0.07, 0.18], normalHint: [0, 1, 0.02], len: 15, hw: 2.9 }),
      new Leaf({ id: 4, name: 'leaf D (left)', base: [-7.2, 0.2, -0.6], dir: [-0.8, 0.45, -0.3], normalHint: [0.3, 1, 0.1], len: 12, hw: 2.5 }),
      new Leaf({ id: 5, name: 'leaf E (broad)', base: [4.155, -1.016, 3.83], dir: [1, 0, 0.3], normalHint: [0, 1, 0], len: 18, hw: 3.8 }),
    ];
    this.shoot = this.leaves.slice();
    this.start = this.leaves[START_SPOT.leaf].toWorld(START_SPOT.u, START_SPOT.v, 0);
    // The spokes: a chain of leaves out from the shoot every 30°, each leaf's
    // base tucked just under the last one's tip, out to the portal ring.
    this.spokes = buildSpokes(this);
    for (const sp of this.spokes) for (const L of sp.leaves) { L.id = this.leaves.length; this.leaves.push(L); }
    /** The leaf whose tip dips into the pool (the portal, once placed): null until then. */
    this.pool = null;
    for (const l of this.leaves) scene.add(l.buildMesh());
    this.food = [];
    this.foodGroup = new THREE.Group();
    scene.add(this.foodGroup);
    this.computeCapacity();
    this.spawnFood();
  }

  /** Horizontal distance from the start (units). */
  radius(p) { return Math.hypot(p.x - this.start.x, p.z - this.start.z); }
  /** Bearing from the start (radians, atan2(z, x)). */
  bearing(p) { return Math.atan2(p.z - this.start.z, p.x - this.start.x); }
  /** The spoke a walker is on (its leaf's), else the one nearest its bearing. */
  spokeOf(leaf, p) {
    if (leaf && leaf.spoke >= 0) return leaf.spoke;
    const a = this.bearing(p);
    return ((Math.round(a / (2 * Math.PI / SPOKES)) % SPOKES) + SPOKES) % SPOKES;
  }
  /**
   * The point on spoke k at radius r from the start, on a leaf's centre line:
   * { leaf, u, v, p } (on the shoot's exit leaf if r falls short of the
   * spoke's first leaf). `inset` keeps it that far from a leaf's ends.
   */
  spokeAt(k, r, inset = 1.2) {
    const sp = this.spokes[k];
    let best = null;
    for (const L of sp.leaves) {
      const uEnd = tipU(L);
      for (let u = inset; u <= uEnd - inset * 0.5; u += 0.1) {
        const p = L.toWorld(u, 0, 0);
        const e = Math.abs(this.radius(p) - r);
        if (!best || e < best.e) best = { leaf: L, u, v: 0, p, e };
      }
    }
    if (best && best.e < 0.5) return best;
    // short of the first spoke leaf: on the shoot, along the way out
    const ex = sp.exit;
    if (r < this.radius(ex.p)) {
      const L = ex.L;
      let b2 = null;
      for (let u = 0.9; u < L.len - 0.9; u += 0.2) for (let v = -L.hwAt(u) + 0.9; v < L.hwAt(u) - 0.9; v += 0.2) {
        const p = L.toWorld(u, v, 0);
        const e = Math.abs(this.radius(p) - r) + 0.4 * Math.abs(angleDiff(this.bearing(p), sp.a)) * r;
        if (!b2 || e < b2.e) b2 = { leaf: L, u, v, p, e };
      }
      return b2;
    }
    return best;
  }

  /** Film capacity: base wetness, leaf axils and near-contacts, random hollows. */
  computeCapacity() {
    const seed = this.seed;
    const p = new THREE.Vector3(), loc = {};
    const mid = (L) => L.toWorld(L.len / 2, 0, 0);
    for (const L of this.leaves) {
      // only leaves that could come near this one matter (bridges)
      const c = mid(L);
      const near = this.leaves.filter((M) => M !== L && mid(M).distanceTo(c) < (L.len + M.len) / 2 + 2);
      const bridges = new Float32Array(FL * FW), noise = new Float32Array(FL * FW);
      for (let j = 0; j < FW; j++) for (let i = 0; i < FL; i++) {
        const u = (i / (FL - 1)) * L.len, v = (j / (FW - 1) - 0.5) * 2 * L.hw0;
        const t = u / L.len;
        const bi = (j >> 1) * FL + (i >> 1);
        if (!(i & 1) && !(j & 1)) noise[bi] = fbm(u * 0.32 + L.id * 13, v * 0.55, seed + L.id);
        let cap = 0.1 + 0.75 * noise[bi] - 0.15;
        cap += 0.45 * (1 - t) * (1 - t);                 // towards the stem
        const hw = L.hwAt(u);
        cap -= 0.3 * (1 - THREE.MathUtils.smoothstep(hw - Math.abs(v), 0, 0.8)); // margins dry first
        // (on every other cell each way, a quarter of the work: the bridges are smooth)
        let bridge = 0;
        if (!(i & 1) && !(j & 1)) {
          for (const M of near) {
            L.toWorld(u, v, 0, p);
            M.toLocal(p, loc);
            if (!M.inside(loc.u, loc.v, -0.2)) continue;
            const gap = Math.max(0, Math.abs(loc.n) - (L.thick + M.thick) / 2);
            bridge = Math.max(bridge, Math.pow(Math.max(0, 1 - gap / 1.3), 2));
          }
          bridges[bi] = bridge;
        } else bridge = bridges[bi];
        cap += 1.15 * bridge;
        // The portal leaves' tips dip into the hollow pool (landmarks.js): open water there.
        if (L.pool) cap += 1.6 * THREE.MathUtils.smoothstep(t, 0.72, 0.86);
        // the dry ring's patches: bare cells with a sharp contact line round them
        for (const d of L.dry) {
          const k = Math.hypot((u - d.u) / d.ru, (v - d.v) / d.rv);
          if (k < 1.6) cap -= 1.3 * (1 - THREE.MathUtils.smoothstep(k, 0.75, 1.15));
        }
        L.cap[j * FL + i] = cap;
        L.filmData[j * FL + i] = Math.max(0, Math.min(255, Math.round(((cap + 0.5) / 2.5) * 255)));
      }
      L.filmTex.needsUpdate = true;
    }
  }

  /** Film thickness index at a point (≤ 0 is dry). 1 ≈ 22 µm of water. */
  filmAt(leaf, u, v) { return leaf.capAt(u, v) - this.dry; }

  setDry(d) {
    this.dry = d;
    for (const l of this.leaves) l.uniforms.uDry.value = d;
  }

  clearFood() {
    for (const f of this.food) this.foodGroup.remove(f.mesh);
    this.food = [];
  }

  spawnFood() {
    this.clearFood();
    let s = this.seed * 977;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const kinds = [
      { type: 'Chlorella-type green alga', geo: () => new THREE.SphereGeometry(0.065, 14, 10), dn: 0.03, abs: [2.2, 0.5, 2.6], lit: 0x4f9a3a, value: 0.22, time: 2.4, gut: [0.35, 0.6, 0.2] },
      { type: 'pennate diatom', geo: () => new THREE.CapsuleGeometry(0.045, 0.24, 4, 10), dn: 0.05, abs: [0.9, 1.3, 2.4], lit: 0xa8893a, value: 0.28, time: 3.0, gut: [0.55, 0.45, 0.2] },
      { type: 'detritus', geo: () => lumpy(0.09, r), dn: 0.025, abs: [1.0, 1.5, 2.2], lit: 0x7a5a38, value: 0.12, time: 2.0, gut: [0.45, 0.33, 0.2] },
    ];
    // ~140 items over every leaf (more on the bigger ones): food is something
    // you come across and eat for health, not upkeep
    const area = this.leaves.map((L) => L.len * L.hw0);
    const tot = area.reduce((a, b) => a + b, 0);
    const pick = () => { let x = r() * tot; for (let i = 0; i < area.length; i++) { x -= area[i]; if (x <= 0) return this.leaves[i]; } return this.leaves[0]; };
    const tries = 2000;
    for (let n = 0; n < tries && this.food.length < 140; n++) {
      const L = pick();
      const u = 1 + r() * (L.len - 2), v = (r() - 0.5) * 2 * L.hwAt(u) * 0.9;
      if (!L.inside(u, v, 0.3) || L.capAt(u, v) - this.dry0 < 0.35) continue;
      const k = kinds[r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2];
      const g = k.geo();
      const opt = opticalMaterial({ dn: k.dn, absorb: k.abs });
      const lit = litMaterial({ color: k.lit, roughness: 0.6 });
      const mesh = new THREE.Mesh(g, opt);
      mesh.userData = { opt, lit };
      mesh.layers.set(LAYER_SPECIMEN);
      const side = 1;
      L.toWorld(u, v, side * (L.thick / 2 + 0.06), mesh.position);
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(L.U, L.N, new THREE.Vector3().crossVectors(L.U, L.N)));
      mesh.rotateY(r() * Math.PI);
      mesh.rotateZ(Math.PI / 2);
      this.foodGroup.add(mesh);
      this.food.push({ ...k, leaf: L, u, v, side, mesh, left: 1 });
    }
  }

  /** A restart: the food drifted back in (the leaves and their film stay as they are). */
  reseed() {
    this.spawnFood();
  }

  /** Find a wall for a claw on leaf L near (u, v). */
  foothold(L, u, v, R, pullU, pullV) {
    if (!L.inside(u, v, 0.02)) return null;
    return snapToWall(L.cellFn, u, v, R, pullU, pullV);
  }
}

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** The furthest u along a leaf's centre line a walker's body reaches (its tip narrows). */
export function tipU(L) {
  if (L._tipU) return L._tipU;
  let u = L.len;
  while (u > 1 && L.hwAt(u) < 0.72) u -= 0.05;
  return (L._tipU = u);
}

/**
 * The spokes: for each bearing (every 30°), the point of the shoot that
 * reaches furthest that way (its exit), then a chain of leaves out to the
 * portal ring. Each leaf's base lies 0.15 units (15 µm) under the last one's
 * tip, so a body at the tip has its head over the next leaf and the claws
 * reach across (gait.js considerTransfer); the first continues the exit
 * leaf's slope and the chain levels out. The last leaf on each spoke is a
 * broad Sphagnum leaf whose tip is on the portal ring (the portal, the pool
 * and Prionchulus go on one of them: main.js placePortal).
 */
function buildSpokes(world) {
  const S = world.start, out = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const up = new THREE.Vector3(0, 1, 0);
  const cands = [];
  for (const L of world.shoot) {
    if (Math.abs(L.N.y) < 0.7) continue; // not up the steep leaf
    for (let u = 0.9; u < L.len; u += 0.2) for (let v = -L.hw0; v <= L.hw0; v += 0.2) {
      if (!L.inside(u, v, 0.9)) continue;
      const p = L.toWorld(u, v, 0);
      cands.push({ L, u, v, p, a: Math.atan2(p.z - S.z, p.x - S.x), r: Math.hypot(p.x - S.x, p.z - S.z) });
    }
  }
  for (let k = 0; k < SPOKES; k++) {
    const a = (k / SPOKES) * Math.PI * 2;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    // the exit: the shoot's furthest point within a narrow cone round the bearing
    let ex = null;
    for (const c of cands) {
      const along = c.r * Math.cos(angleDiff(c.a, a)), perp = Math.abs(c.r * Math.sin(angleDiff(c.a, a)));
      if (along < 0 || perp > 1.2 + 0.12 * along) continue;
      if (!ex || along > ex.along) ex = { ...c, along };
    }
    const leaves = [];
    let prev = ex.L, N = ex.L.N.clone();
    // the exit point's way out, in its own leaf plane
    let dir = d.clone().addScaledVector(N, -d.dot(N)).normalize();
    // base: just under the exit point, 1.3 units back
    let base = ex.p.clone().addScaledVector(N, -(prev.thick + 0.15)).addScaledVector(dir, -1.3);
    for (let j = 0; ; j++) {
      // level out: the slope eases off leaf by leaf, and the chain keeps to its bearing
      const r0 = Math.hypot(base.x - S.x, base.z - S.z);
      const drift = angleDiff(Math.atan2(base.z - S.z, base.x - S.x), a);
      const yaw = a - drift * 0.6 + (rnd() - 0.5) * 0.12;
      const flat = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const slope = j === 0 ? dir.y : Math.sign(dir.y) * Math.max(0, Math.abs(dir.y) - 0.08);
      const lead = flat.clone().multiplyScalar(Math.sqrt(1 - slope * slope)).setY(slope).normalize();
      const nh = j === 0 ? N.clone() : N.clone().lerp(up, 0.15).add(new THREE.Vector3((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.04));
      // the last leaf's tip region is on the portal ring
      const left = RINGS.portal - r0;
      const last = left < 23;
      const len = last ? Math.max(14, left + 2.6) : Math.max(12, Math.min(16 + rnd() * 3, left - 16));
      const kind = last || j % 2 ? 'sphagnum' : 'lamina';
      const hw = last ? 4.4 : Math.min(4.2, 2.3 + 0.5 * j);
      const make = (b) => new Leaf({ id: -1, name: last ? `Sphagnum leaf (spoke ${k + 1}, the rim)` : `${kind === 'sphagnum' ? 'Sphagnum leaf' : 'leaf'} (spoke ${k + 1}, ${j + 1})`, kind, base: b.toArray(), dir: lead.toArray(), normalHint: nh.toArray(), len, hw, spoke: k, pool: last });
      let L = make(base);
      // tuck it under the last leaf: clear of it everywhere they overlap
      // (0.08 units at least), the head's gap at the hand-over ~0.25
      if (j > 0) {
        let clear = Infinity;
        for (let u = tipU(prev) - 1.8; u <= prev.len; u += 0.2) for (let v = -prev.hw0; v <= prev.hw0; v += 0.25) {
          if (!prev.inside(u, v, 0)) continue;
          const loc = L.toLocal(prev.toWorld(u, v, -prev.thick / 2), {});
          if (!L.inside(loc.u, loc.v, -0.1)) continue;
          clear = Math.min(clear, loc.n - L.thick / 2);
        }
        const head = L.toLocal(prev.toWorld(tipU(prev) + 2, 0, prev.thick / 2), {});
        const gap = head.n - L.thick / 2;
        const shift = Math.min(gap - 0.25, clear - 0.08); // + moves it up, nearer the last leaf
        if (Math.abs(shift) > 1e-3) L = make(base.addScaledVector(L.N, shift));
      }
      L.ring = j;
      leaves.push(L);
      if (last) break;
      // the next base: under this leaf's tip, 1.3 units back from where a body stops
      const uEnd = tipU(L);
      const end = L.toWorld(uEnd, 0, 0);
      N = L.N.clone(); dir = L.U.clone(); prev = L;
      base = end.addScaledVector(N, -(L.thick + 0.15)).addScaledVector(L.U, -1.3);
    }
    out.push({ k, a, exit: ex, leaves });
  }
  // the dry ring: two or three bare patches across each spoke's leaf there,
  // staggered so a wet way winds between them
  for (const sp of out) {
    for (const r of [RINGS.dry[0] + 1.5, (RINGS.dry[0] + RINGS.dry[1]) / 2, RINGS.dry[1] - 1.5]) {
      const L = sp.leaves.find((M) => { for (let u = 1.5; u < tipU(M) - 1; u += 0.2) if (Math.abs(Math.hypot(M.toWorld(u, 0, 0).x - S.x, M.toWorld(u, 0, 0).z - S.z) - r) < 0.15) return true; return false; });
      if (!L) continue;
      let u = 1.5;
      for (let x = 1.5; x < tipU(L) - 1; x += 0.05) { const p = L.toWorld(x, 0, 0); if (Math.hypot(p.x - S.x, p.z - S.z) >= r) { u = x; break; } }
      const i = L.dry.length + sp.k;
      const side = i % 2 ? 1 : -1;
      const hw = L.hwAt(u);
      L.dry.push({ u, v: side * hw * 0.38, ru: 1.6, rv: hw * 0.62 });
    }
  }
  return out;
}

function lumpy(r, rnd) {
  const g = new THREE.IcosahedronGeometry(r, 2);
  const p = g.attributes.position;
  const seed = rnd() * 100;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.75 + 0.5 * hash1(Math.round(x * 400) + Math.round(y * 400) * 3.1 + Math.round(z * 400) * 7.3 + seed);
    p.setXYZ(i, x * k, y * k * 0.7, z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** Bacteria and fine detritus drifting in the film around the animal. */
export class Particles {
  constructor(scene, atlasUniform, count = 500) {
    this.count = count;
    const pos = new Float32Array(count * 3), info = new Float32Array(count * 2);
    // Atlas layout (MP-T04): row 1 detritus, row 2 small green algae,
    // tiles 8-9 bacteria, 10 diatom, 11 pollen/spore, row 4 mixed debris.
    // Mostly bacteria, drawn at their real ~3-5 µm size.
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const tile = r < 0.6 ? 8 + (i & 1) : r < 0.75 ? 4 + (i & 3) : r < 0.9 ? (i & 3) : 10 + (i % 6);
      info[2 * i] = tile > 15 ? 12 : tile;
      info[2 * i + 1] = tile >= 8 && tile <= 9 ? 0.05 + Math.random() * 0.03 : tile >= 4 && tile <= 7 ? 0.08 + Math.random() * 0.04 : 0.1 + Math.random() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aInfo', new THREE.BufferAttribute(info, 2));
    this.optMat = particleOpticalMaterial(atlasUniform);
    this.litMat = new THREE.PointsMaterial({ size: 0.05, color: 0xc8c0a0, transparent: true, opacity: 0.6, depthWrite: false });
    this.points = new THREE.Points(geo, this.optMat);
    this.points.userData = { opt: this.optMat, lit: this.litMat };
    this.points.layers.set(LAYER_SPECIMEN);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.home = [];
    this.inited = false;
  }

  /** Brownian drift in a box that follows the animal, kept on the leaf it stands on. */
  update(dt, center, leaf, side, world) {
    const p = this.points.geometry.attributes.position;
    const loc = {};
    const R = 5;
    for (let i = 0; i < this.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const out = !this.inited || Math.abs(x - center.x) > R || Math.abs(z - center.z) > R;
      if (out) {
        // Respawn on a leaf near the animal, in water.
        for (let k = 0; k < 6; k++) {
          const L = world.leaves[Math.random() < 0.7 ? leaf.id : Math.floor(Math.random() * world.leaves.length)];
          L.toLocal(center, loc);
          const u = loc.u + (Math.random() - 0.5) * 2 * R, v = loc.v + (Math.random() - 0.5) * 2 * R;
          if (!L.inside(u, v)) continue;
          const s = L === leaf ? side : 1;
          const q = L.toWorld(u, v, s * (L.thick / 2 + 0.02 + Math.random() * 0.12), _v);
          x = q.x; y = q.y; z = q.z;
          this.home[i] = L;
          break;
        }
      } else {
        const L = this.home[i];
        const wet = L ? world.filmAt(L, L.toLocal(_v.set(x, y, z), loc).u, loc.v) : 0;
        const k = wet > 0.05 ? 0.06 : 0.0; // stuck when the film has gone
        x += (Math.random() - 0.5) * k * Math.sqrt(dt * 60) * 0.3;
        z += (Math.random() - 0.5) * k * Math.sqrt(dt * 60) * 0.3;
      }
      p.setXYZ(i, x, y, z);
    }
    this.inited = true;
    p.needsUpdate = true;
  }
}
