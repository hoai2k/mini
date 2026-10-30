// A few square millimetres of moss-cushion floor, in µm: humus with mineral
// grains (20-300 µm), flakes of leaf litter, moss shoots with spiralling
// lanceolate leaves (the lowest ones arch down to the floor and work as
// ramps), fungal hyphae strung between surfaces, and scattered spores and
// pollen. Render geometry is merged per material; walking queries go to a
// separate set of low-poly colliders plus an analytic floor.
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS } from './sem.js';
import { rng, hash } from './textures.js';

export const HALF = 2000; // the floor spans -HALF..HALF in x and z (4 x 4 mm)

const smooth = (t) => t * t * (3 - 2 * t);
function vnoise(x, z, seed) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const fx = smooth(x - xi), fz = smooth(z - zi);
  const a = hash(xi, zi, seed), b = hash(xi + 1, zi, seed), c = hash(xi, zi + 1, seed), d = hash(xi + 1, zi + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Floor height (µm) at x, z: a gently rolling humus surface. */
export function floorH(x, z) {
  return 70 * (vnoise(x / 700, z / 700, 3) - 0.5) + 22 * (vnoise(x / 260, z / 260, 4) - 0.5) + 6 * (vnoise(x / 90, z / 90, 5) - 0.5);
}
export function floorN(x, z, out = new THREE.Vector3()) {
  const e = 4;
  return out.set(floorH(x - e, z) - floorH(x + e, z), 2 * e, floorH(x, z - e) - floorH(x, z + e)).normalize();
}

/** Merge geometries (position, normal, uv) into one indexed geometry. */
export function mergeGeos(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nrm.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < c; i++) idx[io++] = vo + i;
    vo += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere();
  return m;
}

/**
 * A thin sheet with real thickness (top, bottom and a rim), from a surface
 * function f(u, v) -> {p, n} over u, v in [0, 1]. Returns the render
 * geometry and a low-res top-surface collider geometry.
 */
function sheet(f, nu, nv, thick, uvOf, cu = 10, cv = 4) {
  const pos = [], nrm = [], uv = [], idx = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const grid = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const s = f(i / nu, j / nv); grid.push(s);
  }
  const at = (i, j) => grid[i * (nv + 1) + j];
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const s = at(i, j);
      P.copy(s.p).addScaledVector(s.n, side * thick * 0.5);
      N.copy(s.n).multiplyScalar(side);
      pos.push(P.x, P.y, P.z); nrm.push(N.x, N.y, N.z);
      const t = uvOf(i / nu, j / nv); uv.push(t[0], t[1]);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = base + i * (nv + 1) + j, b = a + nv + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // rim: walk the boundary of the (u, v) square
  const ring = [];
  for (let i = 0; i <= nu; i++) ring.push([i, 0]);
  for (let j = 1; j <= nv; j++) ring.push([nu, j]);
  for (let i = nu - 1; i >= 0; i--) ring.push([i, nv]);
  for (let j = nv - 1; j >= 1; j--) ring.push([0, j]);
  const rb = pos.length / 3;
  for (let k = 0; k < ring.length; k++) {
    const [i, j] = ring[k];
    const s = at(i, j);
    const [i2, j2] = ring[(k + 1) % ring.length];
    const s2 = at(i2, j2);
    const out = new THREE.Vector3().subVectors(s2.p, s.p).cross(s.n).normalize();
    for (const side of [1, -1]) {
      P.copy(s.p).addScaledVector(s.n, side * thick * 0.5);
      pos.push(P.x, P.y, P.z); nrm.push(out.x, out.y, out.z);
      const t = uvOf(i / nu, j / nv); uv.push(t[0], t[1]);
    }
  }
  for (let k = 0; k < ring.length; k++) {
    const a = rb + k * 2, b = rb + ((k + 1) % ring.length) * 2;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // collider: the mid-surface at low resolution
  const cp = [], ci = [];
  for (let i = 0; i <= cu; i++) for (let j = 0; j <= cv; j++) { const s = f(i / cu, j / cv); cp.push(s.p.x, s.p.y, s.p.z); }
  for (let i = 0; i < cu; i++) for (let j = 0; j < cv; j++) { const a = i * (cv + 1) + j, b = a + cv + 1; ci.push(a, b, a + 1, b, b + 1, a + 1); }
  const c = new THREE.BufferGeometry();
  c.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  c.setIndex(ci);
  c.computeBoundingSphere();
  return { geo: g, col: c };
}

/** Walkable surfaces: an analytic floor plus low-poly collider meshes. */
class Colliders {
  constructor() {
    this.list = [];
    this.ray = new THREE.Raycaster();
    this.mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.hits = [];
    this._v = new THREE.Vector3();
  }
  add(geo, kind) {
    const m = new THREE.Mesh(geo, this.mat);
    m.updateMatrixWorld(true);
    geo.computeBoundingSphere();
    this.list.push({ mesh: m, c: geo.boundingSphere.center.clone(), r: geo.boundingSphere.radius, kind });
  }
  /**
   * Nearest hit along a ray within `far`: {point, normal (facing the ray's
   * origin), dist, kind} or null.
   */
  cast(origin, dir, far, skipFloor = false) {
    let best = null;
    const ray = this.ray;
    ray.set(origin, dir); ray.far = far; ray.near = 0;
    const v = this._v;
    for (const e of this.list) {
      v.subVectors(e.c, origin);
      const t = Math.max(0, Math.min(far, v.dot(dir)));
      const dx = v.x - dir.x * t, dy = v.y - dir.y * t, dz = v.z - dir.z * t;
      if (dx * dx + dy * dy + dz * dz > e.r * e.r) continue;
      this.hits.length = 0;
      e.mesh.raycast(ray, this.hits);
      for (const h of this.hits) {
        if (h.distance <= far && (!best || h.distance < best.dist)) {
          const n = h.face.normal.clone();
          if (n.dot(dir) > 0) n.negate();
          best = { point: h.point.clone(), normal: n, dist: h.distance, kind: e.kind };
        }
      }
    }
    if (!skipFloor) {
      // march the analytic floor
      const step = 8;
      let prev = origin.y - floorH(origin.x, origin.z);
      const lim = best ? best.dist : far;
      for (let t = step; t <= lim + step; t += step) {
        const tt = Math.min(t, lim);
        const x = origin.x + dir.x * tt, y = origin.y + dir.y * tt, z = origin.z + dir.z * tt;
        const d = y - floorH(x, z);
        if (d <= 0 && prev > 0) {
          let a = tt - step, b = tt;
          for (let k = 0; k < 10; k++) {
            const m = (a + b) / 2;
            const yy = origin.y + dir.y * m, dd = yy - floorH(origin.x + dir.x * m, origin.z + dir.z * m);
            if (dd > 0) a = m; else b = m;
          }
          const p = new THREE.Vector3().copy(origin).addScaledVector(dir, b);
          best = { point: p, normal: floorN(p.x, p.z), dist: b, kind: 'floor' };
          break;
        }
        prev = d;
        if (tt >= lim) break;
      }
    }
    return best;
  }
}

/** Random point on a hemisphere-ish angular grain: a jittered icosahedron. */
function grainGeo(r, seed) {
  const R = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, r > 60 ? 1 : 0);
  const p = g.attributes.position;
  const sx = 0.75 + R() * 0.45, sy = 0.5 + R() * 0.35, sz = 0.75 + R() * 0.4;
  // displace shared corners consistently so the facets stay closed
  const key = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!key.has(k)) key.set(k, 0.72 + R() * 0.5);
    const f = key.get(k);
    p.setXYZ(i, p.getX(i) * f * sx * r, p.getY(i) * f * sy * r, p.getZ(i) * f * sz * r);
  }
  g.computeVertexNormals(); // non-indexed icosahedron -> flat facets
  return g;
}

export function buildWorld(tex) {
  const group = new THREE.Group();
  const col = new Colliders();
  const R = rng(1234);
  const mats = {
    floor: gMaterial({ cls: CLS.LITTER, tex: tex.litter, map: 'tri', scale: 320, bump: 9, cut: true }),
    grain: gMaterial({ cls: CLS.GRAIN, tex: tex.litter, map: 'tri', scale: 160, bump: 2.5, cut: true }),
    litter: gMaterial({ cls: CLS.LITTER, tex: tex.litter, map: 'uv', scale: 1, bump: 5, cut: true, side: THREE.DoubleSide }),
    leaf: gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 4, cut: true, side: THREE.DoubleSide }),
    stem: gMaterial({ cls: CLS.STEM, tex: tex.leaf, map: 'uv', scale: 1, bump: 3, cut: true }),
    hypha: gMaterial({ cls: CLS.HYPHA, thin: 1, cut: true }),
    spore: gMaterial({ cls: CLS.SPORE, thin: 0, cut: true }),
  };
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); group.add(m); return m; };

  // Floor
  const S = HALF * 2 + 600, NS = 170;
  const fg = new THREE.PlaneGeometry(S, S, NS, NS);
  fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fn = fg.attributes.normal;
  const tmpN = new THREE.Vector3();
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), z = fp.getZ(i);
    fp.setY(i, floorH(x, z));
    floorN(x, z, tmpN); fn.setXYZ(i, tmpN.x, tmpN.y, tmpN.z);
  }
  fg.computeBoundingSphere();
  mesh(fg, mats.floor);

  // Keep-out zone around the start so the mite begins on open floor
  const clearOf = (x, z, r) => Math.hypot(x, z) > r;

  // Mineral grains
  const grains = [];
  const gGeos = [];
  for (let i = 0; i < 150; i++) {
    const r = 10 + 140 * Math.pow(R(), 2.6);
    const x = (R() * 2 - 1) * HALF * 0.97, z = (R() * 2 - 1) * HALF * 0.97;
    if (!clearOf(x, z, 300 + r)) continue;
    const g = grainGeo(r, 900 + i);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 0.5, R() * 6.28, R() * 0.5));
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, floorH(x, z) + r * 0.15, z), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m4);
    gGeos.push(g);
    grains.push({ x, z, r });
    if (r > 22) col.add(g, 'grain');
  }
  mesh(mergeGeos(gGeos), mats.grain);

  // Litter flakes: decayed leaf fragments, curled, some propped on grains
  const lGeos = [];
  for (let i = 0; i < 11; i++) {
    const L = 450 + R() * 550, W = L * (0.35 + R() * 0.3);
    const x0 = (R() * 2 - 1) * HALF * 0.85, z0 = (R() * 2 - 1) * HALF * 0.85;
    if (!clearOf(x0, z0, 450 + L * 0.5)) continue;
    const yaw = R() * 6.28, curl = (R() - 0.3) * 0.0012, tilt = (R() - 0.5) * 0.35;
    const seed = 400 + i;
    const ca = Math.cos(yaw), sa = Math.sin(yaw);
    const f = (u, v) => {
      const a = (u - 0.5) * L, b = (v - 0.5) * W;
      // ragged outline: shrink toward the middle by a noisy margin
      const edge = 0.82 + 0.18 * vnoise(u * 7, v * 7, seed);
      const aa = a * edge, bb = b * (0.6 + 0.4 * Math.sin(Math.PI * u)) * edge;
      const lx = x0 + aa * ca - bb * sa, lz = z0 + aa * sa + bb * ca;
      const y = Math.max(floorH(lx, lz), floorH(x0, z0)) + 8 + curl * bb * bb + tilt * aa * 0.2 + 18 * vnoise(u * 3, v * 3, seed + 1);
      return { p: new THREE.Vector3(lx, y, lz), n: new THREE.Vector3(0, 1, 0) };
    };
    // normals by finite differences
    const fn2 = (u, v) => {
      const s = f(u, v), e = 0.01;
      const du = f(Math.min(1, u + e), v).p.sub(f(Math.max(0, u - e), v).p);
      const dv = f(u, Math.min(1, v + e)).p.sub(f(u, Math.max(0, v - e)).p);
      s.n.crossVectors(dv, du).normalize();
      if (s.n.y < 0) s.n.negate();
      return s;
    };
    const sh = sheet(fn2, 22, 10, 12, (u, v) => [(v - 0.5) * W / 300, u * L / 300], 8, 4);
    lGeos.push(sh.geo);
    col.add(sh.col, 'litter');
  }
  mesh(mergeGeos(lGeos), mats.litter);

  // Moss shoots: stems with leaves on a 2/5 spiral (137.5 deg divergence)
  const stems = [];
  const leafGeos = [], stemGeos = [];
  const spots = [[900, 400], [-700, 900], [-1200, -500], [500, -1200], [1500, 1300], [-200, 1700], [1600, -300], [-1600, 1500], [100, -400], [-500, 300]];
  for (let s = 0; s < spots.length; s++) {
    const [sx, sz] = spots[s];
    const x = sx + (R() - 0.5) * 200, z = sz + (R() - 0.5) * 200;
    const near = s >= 8; // two short shoots near the start
    const H = near ? 700 + R() * 300 : 1400 + R() * 1400;
    const rad = 55 + R() * 30;
    const lean = new THREE.Vector3((R() - 0.5) * 0.5, 1, (R() - 0.5) * 0.5).normalize();
    const base = new THREE.Vector3(x, floorH(x, z) - 30, z);
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(base.clone().addScaledVector(lean, H * t).add(new THREE.Vector3(Math.sin(t * 3 + s) * 60 * t, 0, Math.cos(t * 2 + s) * 60 * t)));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tg = new THREE.TubeGeometry(curve, 40, rad, 12, false);
    // tile the stem's leaf-cell texture along its length
    const tuv = tg.attributes.uv;
    for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * H / 140, tuv.getY(i) * rad * 6.28 / 140);
    stemGeos.push(tg);
    col.add(new THREE.TubeGeometry(curve, 10, rad, 6, false), 'stem');
    stems.push({ x, z, H });

    const nLeaves = Math.floor(H / 120);
    for (let k = 0; k < nLeaves; k++) {
      const t = 0.03 + (k / nLeaves) * 0.95;
      const P0 = curve.getPointAt(t);
      const T = curve.getTangentAt(t);
      const ang = k * 2.39996 + s;
      const side = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      side.addScaledVector(T, -side.dot(T)).normalize();
      const young = t; // leaves near the tip are shorter and held closer to the stem
      const L = (950 + R() * 500) * (1 - 0.45 * young * young) * (near ? 0.85 : 1);
      const Wd = L * (0.13 + R() * 0.05);
      const start = P0.clone().addScaledVector(side, rad * 0.8);
      let tip;
      const lowest = k < 3;
      if (lowest) {
        // old leaves arch out and rest their tips on the floor: ramps
        const tx = start.x + side.x * L * 0.78, tz = start.z + side.z * L * 0.78;
        tip = new THREE.Vector3(tx, floorH(tx, tz) + 4, tz);
      } else {
        const spread = 0.65 + 0.6 * (1 - young); // radians from the stem axis
        const dir = T.clone().multiplyScalar(Math.cos(spread)).addScaledVector(side, Math.sin(spread)).normalize();
        tip = start.clone().addScaledVector(dir, L);
        tip.y -= L * 0.25 * (1 - young); // recurved: tips droop
      }
      const ctrl = start.clone().lerp(tip, 0.45).addScaledVector(T, L * (lowest ? 0.32 : 0.12));
      const bez = (u, out) => {
        const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
        return out.set(0, 0, 0).addScaledVector(start, a).addScaledVector(ctrl, b).addScaledVector(tip, c);
      };
      const len = start.distanceTo(tip);
      const seed = s * 100 + k;
      const halfW = (u) => {
        // lanceolate: widest about a quarter of the way out, acuminate tip,
        // serrate near the apex
        let w = Wd * Math.pow(u + 0.04, 0.35) * Math.pow(1 - u, 0.9) / 0.48;
        if (u > 0.55) w *= 1 + 0.06 * ((u * 38) % 1);
        return w;
      };
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
      const f = (u, v) => {
        const c = bez(u, new THREE.Vector3());
        const d = bez(Math.min(1, u + 0.01), tmpA).sub(bez(Math.max(0, u - 0.01), tmpB)).normalize();
        const across = new THREE.Vector3().crossVectors(d, T).normalize();
        if (across.lengthSq() < 0.1) across.copy(side).cross(d).normalize();
        const up = new THREE.Vector3().crossVectors(across, d).normalize();
        if (up.y < 0) { up.negate(); across.negate(); }
        const vv = v * 2 - 1, w = halfW(u);
        // channelled blade with the costa (midrib) as a raised ridge
        const cup = w * 0.22 * vv * vv;
        const costa = 9 * Math.exp(-Math.pow(vv * w / 14, 2)) * (1 - u);
        const p = c.addScaledVector(across, vv * w).addScaledVector(up, cup + costa);
        return { p, n: up.clone().addScaledVector(across, -vv * 0.35).normalize() };
      };
      const sh = sheet(f, 24, 8, 13, (u, v) => [(v * 2 - 1) * halfW(u) / 140 + 0.5, u * len / 140], 10, 4);
      leafGeos.push(sh.geo);
      col.add(sh.col, 'leaf');
    }
  }
  mesh(mergeGeos(stemGeos), mats.stem);
  mesh(mergeGeos(leafGeos), mats.leaf);

  // Ground probe from above, for placing things on the topmost surface
  const down = new THREE.Vector3(0, -1, 0);
  const topAt = (x, z) => col.cast(new THREE.Vector3(x, 4000, z), down, 6000);

  // Fungal hyphae: 3-5 µm threads strung between surfaces, with side branches
  const hGeos = [];
  for (let i = 0; i < 46; i++) {
    const x = (R() * 2 - 1) * HALF * 0.9, z = (R() * 2 - 1) * HALF * 0.9;
    const a = topAt(x, z);
    const ang = R() * 6.28, span = 200 + R() * 600;
    const b = topAt(x + Math.cos(ang) * span, z + Math.sin(ang) * span);
    if (!a || !b) continue;
    const r = 1.6 + R() * 0.9;
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const p = a.point.clone().lerp(b.point, t);
      p.y -= Math.sin(Math.PI * t) * span * 0.08; // sag
      p.x += Math.sin(t * 9 + i) * 10; p.z += Math.cos(t * 7 + i) * 10;
      p.y = Math.max(p.y, floorH(p.x, p.z) + r);
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    hGeos.push(new THREE.TubeGeometry(curve, 48, r, 5, false));
    for (let k = 0; k < 2; k++) {
      const t = 0.2 + R() * 0.6;
      const p = curve.getPointAt(t);
      const d = new THREE.Vector3(R() - 0.5, R() * 0.4 - 0.3, R() - 0.5).normalize();
      const l = 50 + R() * 140;
      const q = p.clone().addScaledVector(d, l);
      q.y = Math.max(q.y, floorH(q.x, q.z) + r);
      const bc = new THREE.CatmullRomCurve3([p, p.clone().lerp(q, 0.5).add(new THREE.Vector3(0, -l * 0.1, 0)), q]);
      hGeos.push(new THREE.TubeGeometry(bc, 12, r * 0.85, 5, false));
    }
  }
  mesh(mergeGeos(hGeos), mats.hypha);

  // Spores and pollen, instanced, resting on surfaces
  const placeInst = (geo, count, size, mat) => {
    const im = new THREE.InstancedMesh(geo, mat, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const hit = topAt((R() * 2 - 1) * HALF * 0.95, (R() * 2 - 1) * HALF * 0.95);
      if (!hit) continue;
      const s = size * (0.8 + R() * 0.4);
      q.setFromEuler(e.set(R() * 6, R() * 6, R() * 6));
      m4.compose(hit.point.clone().addScaledVector(hit.normal, s * 0.4), q, new THREE.Vector3(s, s, s));
      im.setMatrixAt(n++, m4);
    }
    im.count = n;
    im.computeBoundingSphere();
    group.add(im);
    return im;
  };
  // fungal conidia: smooth ellipsoids, ~6 x 10 µm
  const spore = new THREE.SphereGeometry(1, 10, 8); spore.scale(0.6, 1, 0.6);
  placeInst(spore, 160, 5, mats.spore);
  // echinate pollen (aster type): a ~25 µm ball covered in spines
  const ech = [new THREE.SphereGeometry(1, 16, 12)];
  const dirs = new THREE.IcosahedronGeometry(1, 1).attributes.position;
  const seen = new Set();
  for (let i = 0; i < dirs.count; i++) {
    const d = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
    const k = d.toArray().map((v) => v.toFixed(2)).join();
    if (seen.has(k)) continue; seen.add(k);
    const c = new THREE.ConeGeometry(0.11, 0.38, 5);
    c.translate(0, 1.12, 0);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
    ech.push(c);
  }
  placeInst(mergeGeos(ech), 26, 12, mats.spore);
  // bisaccate conifer pollen: a corpus with two air sacs, ~70 µm
  const corp = new THREE.SphereGeometry(1, 16, 12); corp.scale(0.9, 0.62, 0.62);
  const sac1 = new THREE.SphereGeometry(0.62, 14, 10); sac1.translate(0.55, -0.22, 0);
  const sac2 = new THREE.SphereGeometry(0.62, 14, 10); sac2.translate(-0.55, -0.22, 0);
  placeInst(mergeGeos([corp, sac1, sac2]), 8, 34, mats.spore);

  return { group, colliders: col, grains, stems, mats, topAt };
}
