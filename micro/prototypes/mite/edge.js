// The edge of the moss cushion: a wall of tall Sphagnum shoots standing
// shoulder to shoulder all round the walkable square (the owner, 2026-11-02:
// "for the mite world if there's an edge to it ensure we have a visual
// barrier, not just a message"). layout.js EDGE gives its place and size.
//
// - Each side of the square is a band `EDGE.depth` deep beyond the plane
//   |x| = EDGE.face (or |z|), cut into SEG µm segments that run on past the
//   corners, so the corners are filled by both bands. A segment is one of NV
//   prebuilt variants (a hash of its side and index picks it, so a segment
//   always looks the same), drawn as an instance in its side's frame.
// - A segment holds four rows of shoots: the front row, its stems touching
//   the face, with stem leaves, branch fascicles and a capitulum (the dense
//   head of a Sphagnum shoot); two rows behind with fewer branches; and a
//   palisade of bare stems at the back, so nothing shows through. Nothing of
//   it reaches inside the face below EDGE.clear µm (every vertex is pushed
//   back to the face there), so the walker's clamp (mite.js) is exactly where
//   the mite meets the stems. They stand EDGE.height µm tall: far over a jump
//   and over the camera at the default zoom, so the wall fills the frame as
//   you reach it and there is no end of the world behind it.
// - In front of it, shed leaves lie on the floor for EDGE.apron µm, thicker
//   toward the wall: each segment's are placed once on the floor (its height
//   and slope), the first time a view comes near, and kept.
// - Per view (setView, called by world.js for every view before it is drawn)
//   only the segments within REACH of the view's target and in its frustum are
//   drawn: one InstancedMesh per variant and material, their instances written
//   for that view (a few KB). Segments far from the target take a lighter leaf
//   set (LOD_R). Away from the edge nothing is drawn or written at all.
// - Same SEM look as the moss (gMaterial, the stem and leaf classes). The
//   cutaway cylinder (no cutIds: the fallback) clears the shoots between the
//   camera and the mite when the camera swings out over the wall, a little
//   wider than for the moss (cutR).
import * as THREE from '../shared/vendor/three.module.min.js';
import { gMaterial, CLS, shared } from './sem.js';
import { rng } from './textures.js';
import { EDGE } from './layout.js';

const SEG = 1600;        // µm of wall per segment
const NV = 3;            // segment variants
const REACH = 16000;     // µm from a view's target along the wall (beyond any far plane)
const LOD_R = 1800;      // µm: segments farther than this from the target (their nearest point) drop the branches
const APRON_R = 7000;    // µm: the shed leaves are drawn this near the target
const MAXI = 64;         // instances per variant
const MAXA = 2400;       // shed leaves per view
const CELL = 170;        // the shed leaves' lattice (µm)

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash3(a, b, c) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** An indexed geometry built up piece by piece (position, normal, uv). */
class Builder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }
  /** Append a geometry (indexed or not). */
  add(g) {
    const o = this.pos.length / 3, p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      this.uv.push(t ? t.getX(i) : 0, t ? t.getY(i) : 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(g.index.getX(i) + o);
    else for (let i = 0; i < p.count; i++) this.idx.push(o + i);
  }
  /** A grid surface f(u, v, P, N) over [0, 1]², nu x nv quads. */
  grid(f, nu, nv, uvOf) {
    const o = this.pos.length / 3, P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      f(i / nu, j / nv, P, N);
      this.pos.push(P.x, P.y, P.z); this.nrm.push(N.x, N.y, N.z);
      const t = uvOf(i / nu, j / nv); this.uv.push(t[0], t[1]);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = o + i * (nv + 1) + j, b = a + nv + 1;
      this.idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  get tris() { return this.idx.length / 3; }
  /** The geometry, every vertex kept out of the walkable side of the face (local z < 0) below EDGE.clear. */
  build(keepOut = true) {
    if (keepOut) {
      for (let i = 0; i < this.pos.length; i += 3) {
        const y = this.pos[i + 1];
        const lim = -250 * sstep(EDGE.clear, EDGE.clear + 500, y);
        if (this.pos[i + 2] < lim) this.pos[i + 2] = lim;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

/**
 * One leaf into builder B: from base along dir (unit), L long, W wide at
 * most, concave (cup) toward nrm; ovate-lanceolate (Sphagnum branch leaves).
 */
function leaf(B, base, dir, nrm, L, W, cup, nu = 3, nv = 2) {
  const side = new THREE.Vector3().crossVectors(dir, nrm).normalize();
  const n = new THREE.Vector3().crossVectors(side, dir).normalize();
  const half = (u) => W * 0.5 * Math.pow(Math.sin(Math.PI * Math.min(0.98, u * 0.9 + 0.06)), 0.7) * (1 - 0.35 * u);
  B.grid((u, v, P, N) => {
    const vv = v * 2 - 1, w = half(u);
    P.copy(base).addScaledVector(dir, L * u).addScaledVector(side, vv * w).addScaledVector(n, cup * vv * vv * (w / (W * 0.5)) - L * 0.12 * u * u);
    N.copy(n).addScaledVector(side, -vv * 0.5).normalize();
  }, nu, nv, (u, v) => [v * W / 140, u * L / 140]);
}

/** A tube along points (CatmullRom), radius r, into builder B (uv tiled like the moss's stems). */
function tube(B, pts, r, tubular, radial) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, tubular, r, radial, false);
  const L = curve.getLength(), t = g.attributes.uv;
  for (let i = 0; i < t.count; i++) t.setXY(i, t.getX(i) * L / 140, t.getY(i) * r * 6.28 / 140);
  B.add(g);
  g.dispose();
  return curve;
}

/** A branch from p along dir (unit), len long, drooping (or curling up: curl > 0): its tube into twigs, its leaves into leaves. */
function branch(R, twigs, leaves, p, dir, len, curl, r, leafL, step) {
  const end = p.clone().addScaledVector(dir, len);
  end.y += curl * len;
  const mid = p.clone().addScaledVector(dir, len * 0.5);
  mid.y += curl * len * 0.15;
  const curve = tube(twigs, [p, mid, end], r, 3, 3);
  if (!leaves) return;
  const n = Math.max(2, Math.floor(len / step));
  for (let k = 1; k <= n; k++) {
    const u = 0.12 + (k / n) * 0.88;
    const q = curve.getPointAt(Math.min(1, u)), tg = curve.getTangentAt(Math.min(1, u));
    const sideA = _a.crossVectors(tg, UP);
    if (sideA.lengthSq() < 1e-4) sideA.set(1, 0, 0);
    sideA.normalize();
    // imbricate leaves, alternately to each side, held at ~30° to the branch
    const s = k % 2 ? 1 : -1;
    const ang = (k * 2.4) % 6.283;
    const off = _b.copy(sideA).multiplyScalar(Math.cos(ang) * s).addScaledVector(_c.crossVectors(sideA, tg).normalize(), Math.sin(ang));
    const d = tg.clone().multiplyScalar(0.85).addScaledVector(off, 0.5).normalize();
    leaf(leaves, q.clone().addScaledVector(off, r * 0.8), d, off.clone(), leafL * (0.8 + R() * 0.4), leafL * 0.38, leafL * 0.12, 2, 2);
  }
}

/**
 * One segment variant: { stems (the main stems), twigs (the branches and the
 * capitula's), near (every leaf), far (the stem leaves and a few big leaves
 * for each head) } geometries in the segment's own frame (x along the wall
 * 0..SEG, y up, z outward from the face). Near the view: stems, twigs and
 * near; farther: stems and far.
 */
function buildVariant(seed) {
  const R = rng(seed);
  const stems = new Builder(), twigs = new Builder(), near = new Builder(), far = new Builder();
  const [H0, H1] = EDGE.height;
  // rows: [first z (from the face), z spread, spacing, kind]
  const rows = [[0, 0, 250, 'front'], [430, 260, 300, 'mid'], [950, 320, 330, 'mid'], [1500, 800, 190, 'bare']];
  for (const [z0, zs, sp, kind] of rows) {
    for (let u = R() * sp * 0.5; u < SEG; u += sp * (0.8 + R() * 0.4)) {
      const rad = kind === 'bare' ? 70 + R() * 30 : 65 + R() * 30;
      const z = kind === 'front' ? rad + 55 + R() * 40 : z0 + R() * zs;
      const H = H0 + (H1 - H0) * R();
      const lu = (R() - 0.5) * 0.06, lz = (R() - 0.3) * 0.05;
      const ph = R() * 6.28;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        pts.push(new THREE.Vector3(u + lu * H * t + Math.sin(t * 3 + ph) * 30 * t, -160 + H * t, z + Math.max(0, lz * H * t) + Math.cos(t * 2.3 + ph) * 25 * t));
      }
      const curve = tube(stems, pts, rad, kind === 'bare' ? 12 : 20, kind === 'bare' ? 6 : 7);
      if (kind === 'bare') continue;
      // stem leaves (front row): tongue-shaped, held up along the stem
      if (kind === 'front') {
        for (let y = 120; y < H - 500; y += 230 + R() * 60) {
          const t = (y + 160) / H, q = curve.getPointAt(t), tg = curve.getTangentAt(t);
          const a = y * 0.011 + ph;
          const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
          const d = tg.clone().multiplyScalar(0.8).addScaledVector(out, 0.6).normalize();
          const L = 380 + R() * 160;
          leaf(near, q.clone().addScaledVector(out, rad * 0.85), d, out, L, L * 0.45, 30);
          leaf(far, q.clone().addScaledVector(out, rad * 0.85), d, out, L, L * 0.45, 30);
        }
      }
      // branch fascicles: spreading branches every ~0.65 mm (front) or ~1 mm (behind)
      const every = kind === 'front' ? 700 : 1100, per = kind === 'front' ? 2 : 1;
      for (let y = 450 + R() * 300; y < H - 900; y += every * (0.8 + R() * 0.4)) {
        const t = (y + 160) / H, q = curve.getPointAt(t);
        for (let b = 0; b < per; b++) {
          const az = R() * 6.283, el = 0.9 + R() * 0.5;
          const dir = new THREE.Vector3(Math.cos(az) * Math.sin(el), Math.cos(el), Math.sin(az) * Math.sin(el));
          branch(R, twigs, near, q, dir, 600 + R() * 500, -0.35 - R() * 0.25, 20, 280, kind === 'front' ? 120 : 260);
        }
      }
      // the capitulum: a dense head of short branches curling up and in
      const top = curve.getPointAt(1);
      const nb = 7;
      for (let b = 0; b < nb; b++) {
        const az = (b / nb) * 6.283 + R() * 0.5, el = 0.35 + R() * 1.0;
        const dir = new THREE.Vector3(Math.cos(az) * Math.sin(el), Math.cos(el), Math.sin(az) * Math.sin(el));
        const L = 280 + R() * 300;
        branch(R, twigs, near, top, dir, L, 0.25, 26, 240, 100);
      }
      // the far leaves: a few large ones round the head stand for it
      for (let b = 0; b < 6; b++) {
        const az = (b / 6) * 6.283 + ph, d = new THREE.Vector3(Math.cos(az) * 0.7, 0.7, Math.sin(az) * 0.7).normalize();
        leaf(far, top.clone().addScaledVector(d, rad), d, new THREE.Vector3(Math.cos(az), 0.3, Math.sin(az)).normalize(), 420, 220, 40);
      }
    }
  }
  return { stems: stems.build(), twigs: twigs.build(), near: near.build(), far: far.build(), tris: { stems: stems.tris, twigs: twigs.tris, near: near.tris, far: far.tris } };
}

/** A shed leaf lying on the floor (local: along +x, cupped up), ~1 unit long. */
function shedLeaf() {
  const B = new Builder();
  leaf(B, new THREE.Vector3(-0.5, 0.012, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 1, 0.42, 0.06, 5, 2);
  // (its tip lies on the floor, not curled under)
  for (let i = 1; i < B.pos.length; i += 3) B.pos[i] = Math.max(0.004, B.pos[i] + 0.1);
  return B.build(false);
}

/**
 * The wall round the walkable square. floorH(x, z), floorN(x, z, out): the
 * floor (world.js). Returns { group, setView(camera, x, z), stats, sides, SEG }.
 */
export function createEdge({ tex, floorH, floorN }) {
  const mats = {
    stem: gMaterial({ cls: CLS.STEM, tex: tex.leaf, map: 'uv', scale: 1, bump: 3, cut: true }),
    leaf: gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 2.5, cut: true, side: THREE.DoubleSide }),
    shed: gMaterial({ cls: CLS.LEAF, tex: tex.leaf, map: 'uv', scale: 1, bump: 2, side: THREE.DoubleSide }),
  };
  // a wider cutaway than the moss's (the wall is a mass of shoots, not one stem)
  const cutR = { value: 600 };
  mats.stem.uniforms.uCutR = cutR; mats.leaf.uniforms.uCutR = cutR;
  const group = new THREE.Group();
  group.name = 'edge of the cushion';
  group.matrixAutoUpdate = false;
  const inst = (geo, mat, n, name) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.name = name; m.count = 0; m.visible = false;
    m.frustumCulled = false; // culled segment by segment here
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.matrixAutoUpdate = false; m.matrixWorldAutoUpdate = false;
    m.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9); // (never computed from the instances)
    group.add(m);
    return m;
  };
  const variants = [], meshes = [];
  for (let v = 0; v < NV; v++) {
    const V = buildVariant(4100 + v * 17);
    variants.push(V);
    meshes.push({ stems: inst(V.stems, mats.stem, MAXI, `edge stems ${v}`), twigs: inst(V.twigs, mats.stem, MAXI, `edge twigs ${v}`), near: inst(V.near, mats.leaf, MAXI, `edge leaves ${v}`), far: inst(V.far, mats.leaf, MAXI, `edge leaves far ${v}`) });
  }
  const shed = inst(shedLeaf(), mats.shed, MAXA, 'edge shed leaves');

  const F = EDGE.face, D = EDGE.depth, A = EDGE.apron, HM = EDGE.height[1];
  const S0 = -(F + D), NSEG = Math.ceil((2 * (F + D)) / SEG);
  // the four sides: outward normal n, along-wall t = up x n (so (t, up, n) is a rotation)
  const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([nx, nz], k) => ({ k, nx, nz, tx: nz, tz: -nx }));
  const basis = sides.map((s) => new THREE.Matrix4().makeBasis(new THREE.Vector3(s.tx, 0, s.tz), UP, new THREE.Vector3(s.nx, 0, s.nz)));
  const variantOf = (k, i) => Math.floor(hash3(k, i, 7) * NV);

  // shed leaves: per segment, placed once on the floor (instance matrices), kept
  const shedCache = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Vector3();
  function shedOf(s, i) {
    const key = s.k * 100000 + i;
    let out = shedCache.get(key);
    if (out) return out;
    const list = [];
    const u0 = S0 + i * SEG;
    for (let a = 0; a < SEG / CELL; a++) for (let b = 0; b < A / CELL; b++) {
      const w = -(b + hash3(a, b, s.k * 7 + i * 131 + 1)) * CELL; // from the face, into the square (< 0)
      const near = 1 + w / A; // 1 at the face .. 0 at the apron's edge
      if (hash3(a, b, s.k * 7 + i * 131 + 2) > 0.75 * near * near * near) continue;
      const u = u0 + (a + hash3(a, b, s.k * 7 + i * 131 + 3)) * CELL;
      const x = s.nx * (F + w) + s.tx * u, z = s.nz * (F + w) + s.tz * u;
      const L = 240 + 220 * hash3(a, b, s.k * 7 + i * 131 + 4);
      floorN(x, z, _n);
      _q.setFromUnitVectors(UP, _n).multiply(_q2.setFromAxisAngle(UP, hash3(a, b, s.k * 7 + i * 131 + 5) * 6.283));
      _m.compose(_p.set(x, floorH(x, z) + 2, z), _q, _s.set(L, L * 0.9, L * (0.85 + 0.3 * hash3(a, b, i + 9))));
      list.push(..._m.elements);
    }
    out = new Float32Array(list);
    if (shedCache.size > 400) shedCache.delete(shedCache.keys().next().value);
    shedCache.set(key, out);
    return out;
  }

  const fr = new THREE.Frustum(), pm = new THREE.Matrix4(), box = new THREE.Box3(), seg = new THREE.Matrix4();
  const KINDS = ['stems', 'twigs', 'near', 'far'];
  const counts = { stems: new Int32Array(NV), twigs: new Int32Array(NV), near: new Int32Array(NV), far: new Int32Array(NV) };
  // a box from the segment's corners along (u0..u1) and out (w0..w1), y0..y1 (the sides are axis-aligned)
  const segBox = (s, u0, u1, w0, w1, y0, y1) => {
    const xa = s.nx * (F + w0) + s.tx * u0, xb = s.nx * (F + w1) + s.tx * u1;
    const za = s.nz * (F + w0) + s.tz * u0, zb = s.nz * (F + w1) + s.tz * u1;
    box.min.set(Math.min(xa, xb), y0, Math.min(za, zb)); box.max.set(Math.max(xa, xb), y1, Math.max(za, zb));
    return box;
  };
  // the distance from (x, z) to a box's footprint
  const boxDist = (x, z) => Math.hypot(Math.max(box.min.x - x, 0, x - box.max.x), Math.max(box.min.z - z, 0, z - box.max.z));
  const stats = { segments: 0, shed: 0, tris: 0, views: 0 };
  let shown = true;
  /** Choose and place the segments (and shed leaves) a view looking at (x, z) can see. */
  function setView(camera, x, z) {
    stats.views++;
    // nothing near: nothing drawn, nothing written
    const dEdge = F - Math.max(Math.abs(x), Math.abs(z));
    if (dEdge > REACH) {
      if (shown) { for (const M of meshes) for (const k in M) { M[k].count = 0; M[k].visible = false; } shed.count = 0; shed.visible = false; shown = false; }
      stats.segments = 0; stats.shed = 0; stats.tris = 0;
      return;
    }
    shown = true;
    cutR.value = Math.max(600, shared.uCutR.value * 1.6);
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    fr.setFromProjectionMatrix(pm, camera.coordinateSystem, camera.reversedDepth);
    for (const k of KINDS) counts[k].fill(0);
    let nShed = 0, nSeg = 0, tris = 0;
    for (const s of sides) {
      const dn = F - (x * s.nx + z * s.nz); // the target's distance inside this face
      if (dn > REACH) continue;
      const sc = x * s.tx + z * s.tz;
      const i0 = Math.max(0, Math.floor((sc - REACH - S0) / SEG)), i1 = Math.min(NSEG - 1, Math.floor((sc + REACH - S0) / SEG));
      for (let i = i0; i <= i1; i++) {
        const u0 = S0 + i * SEG;
        // the corner squares are the ±z sides' (their bands run on through them): the ±x sides leave them
        if (s.nx && (u0 >= F || u0 + SEG <= -F)) continue;
        // the wall itself (beyond the face; leaves overhang it a little, and stand ~1 mm over the stems' tops)
        if (fr.intersectsBox(segBox(s, u0 - 600, u0 + SEG + 600, -300, D + 600, -200, HM + 1000))) {
          const v = variantOf(s.k, i), M = meshes[v];
          seg.copy(basis[s.k]).setPosition(s.nx * F + s.tx * u0, 0, s.nz * F + s.tz * u0);
          const nearOne = boxDist(x, z) < LOD_R;
          if (counts.stems[v] < MAXI) {
            const put = (k) => { seg.toArray(M[k].instanceMatrix.array, counts[k][v]++ * 16); tris += variants[v].tris[k]; };
            put('stems');
            if (nearOne) { put('twigs'); put('near'); } else put('far');
            nSeg++;
          }
        }
        // the shed leaves in front of it, near the target
        segBox(s, u0, u0 + SEG, -A, 0, -100, 200);
        if (boxDist(x, z) < APRON_R) {
          if (fr.intersectsBox(box)) {
            const m = shedOf(s, i), n = Math.min(m.length / 16, MAXA - nShed);
            if (n > 0) { shed.instanceMatrix.array.set(n * 16 === m.length ? m : m.subarray(0, n * 16), nShed * 16); nShed += n; }
          }
        }
      }
    }
    for (let v = 0; v < NV; v++) for (const k of KINDS) {
      const m = meshes[v][k];
      m.count = counts[k][v]; m.visible = m.count > 0;
      if (m.count) m.instanceMatrix.needsUpdate = true;
    }
    shed.count = nShed; shed.visible = nShed > 0;
    if (nShed) shed.instanceMatrix.needsUpdate = true;
    stats.segments = nSeg; stats.shed = nShed; stats.tris = tris + nShed * (shed.geometry.index.count / 3);
  }

  return { group, setView, stats, sides, SEG, variants, meshes, shed, cutR,
    /** Testing: how many triangles each variant holds. */
    tris: variants.map((V) => V.tris) };
}
