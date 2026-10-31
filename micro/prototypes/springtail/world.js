// The bog pool: a wide sheet of open water (1.2 x 0.9 m: some 17 full jumps from the middle to the bank) ringed by a steep
// Sphagnum bank, with moss islands standing in it, sundew rosettes on the
// islands, floating debris (dead Sphagnum leaves, bark flakes, needles) and
// food on the film. The water is the ground everywhere the springtail can
// go; moss, leaves and debris are things on it. Units: mm; the water
// surface is y = 0.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial, macroShared, MACRO_GLSL } from '../shared/techniques/springtail-macro.js';

export const POOL = { a: 600, b: 450 };
/** Moss islands standing in the pool: centre and radius (mm). Hand-placed near the start, scattered farther out. */
export const ISLANDS = [
  [15, -9, 4], [-24, 16, 5], [34, 20, 5.5], [-38, -20, 5], [62, -6, 7], [-66, 22, 6], [8, 44, 5], [86, 36, 6],
  [-18, -52, 6], [96, -46, 5], [-104, -8, 6.5], [44, -58, 5], [-60, -62, 5], [-50, 62, 5.5], [40, 78, 5], [120, 0, 5],
].map(([x, z, r]) => ({ x, z, r }));
{
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 8000 && ISLANDS.length < 64; k++) {
    const a = rnd() * Math.PI * 2, e = 0.24 + rnd() * 0.68;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e, r = 4 + rnd() * 4;
    if (ISLANDS.every((I) => Math.hypot(I.x - x, I.z - z) > I.r + r + 40)) ISLANDS.push({ x: Math.round(x), z: Math.round(z), r: Math.round(r * 2) / 2 });
  }
}
export const ISLAND = ISLANDS[0];

/**
 * The forward landmark (the Zoom Chain's way on, design §0.6): a tongue of
 * Sphagnum where the bank reaches into the pool, straight ahead of the start
 * (+x, ~0.56 m off: a minute or so of full jumps). Its capitula overhang the
 * water low enough to land on, and on the tallest one a speck moves: the
 * Limnozetes mite of Level 1. It is an island joined to the bank, so the
 * shoreline, the water mask and landing on moss all treat it like one.
 */
export const LANDMARK = (() => {
  const a = 0, e = 0.982;
  const f = 1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3);
  const x = Math.round((e * 600) / f), z = 0, r = 10;
  for (let i = ISLANDS.length - 1; i >= 16; i--) if (Math.hypot(ISLANDS[i].x - x, ISLANDS[i].z - z) < ISLANDS[i].r + r + 30) ISLANDS.splice(i, 1);
  const island = { x, z, r, landmark: true };
  ISLANDS.push(island);
  return { x, z, r, island, reach: r + 3 };
})();

/** Normalised pool radius: < 1 inside the pool (matches POOL_GLSL). */
export function poolE(x, z) {
  const a = Math.atan2(z, x);
  return Math.hypot(x / POOL.a, z / POOL.b) * (1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3));
}
/** Distance (mm) from the nearest island's edge: negative on the island. */
export function islandEdge(x, z) {
  let d = Infinity, best = null;
  for (const I of ISLANDS) { const v = Math.hypot(x - I.x, z - I.z) - I.r; if (v < d) { d = v; best = I; } }
  return { d, island: best };
}
export const inPool = (x, z) => poolE(x, z) < 1 && islandEdge(x, z).d > 0;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** The bank is a steep wall of moss: the springtail cannot go past this. */
export const BANK_E = 0.995;
/** Height (mm) of the top of the moss (a bank or an island), or -Infinity over open water. */
export function mossTop(x, z) {
  const e = poolE(x, z);
  let h = -Infinity;
  if (e >= 1.0) h = 1.4 + 12 * sm(1.0, 1.08, e);
  const { d, island } = islandEdge(x, z);
  if (d <= 0.3) h = Math.max(h, 1.4 + 1.6 * sm(0, -island.r * 0.7, d));
  return h;
}

const islandGlsl = ISLANDS.map((I) => `  di = min(di, length(p - vec2(${I.x.toFixed(1)}, ${I.z.toFixed(1)})) - ${I.r.toFixed(1)});`).join('\n');
const poolEGlsl = /* glsl */ `
float poolEG(vec2 p) {
  float a = atan(p.y, p.x);
  return length(p / vec2(${POOL.a.toFixed(1)}, ${POOL.b.toFixed(1)})) * (1.0 + 0.05 * sin(3.0 * a + 0.5) + 0.035 * sin(5.0 * a + 1.3));
}
float islandDist(vec2 p) {
  float di = 1e4;
${islandGlsl}
  return di;
}`;
export const POOL_GLSL = /* glsl */ `${poolEGlsl}
float poolDepth(vec2 p) {
  float e = poolEG(p);
  float di = islandDist(p);
  // a dark, deep bog pool (the tea hides the floor, so the film reads as a mirror); shallow by the shores
  float bed = 0.35 + 14.0 * smoothstep(1.0, 0.9, e) * smoothstep(0.0, 9.0, di);
  return bed * (0.85 + 0.3 * mFbm(p * 0.05));
}`;
/** GLSL `shoreDist(p)`: mm of open water between p and the nearest island or the bank. */
export const SHORE_GLSL = /* glsl */ `
float shoreDist(vec2 p) {
  return min(islandDist(p), (1.0 - poolEG(p)) * ${(POOL.b * 0.95).toFixed(1)});
}`;

// ---------------------------------------------------------------- geometry helpers
function tube(points, radii, sides, out) {
  const base = out.pos.length / 3;
  const up = new THREE.Vector3(0, 1, 0), t = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    t.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]).normalize();
    n.crossVectors(t, Math.abs(t.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
    b.crossVectors(t, n);
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const dx = Math.cos(a) * n.x + Math.sin(a) * b.x, dy = Math.cos(a) * n.y + Math.sin(a) * b.y, dz = Math.cos(a) * n.z + Math.sin(a) * b.z;
      out.pos.push(p.x + dx * radii[i], p.y + dy * radii[i], p.z + dz * radii[i]);
      out.nrm.push(dx, dy, dz);
    }
  }
  for (let i = 0; i < points.length - 1; i++) for (let j = 0; j < sides; j++) {
    const a = base + i * sides + j, b2 = base + i * sides + ((j + 1) % sides), c = a + sides, d = b2 + sides;
    out.idx.push(a, c, b2, b2, c, d);
  }
}
function toGeo(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3));
  g.setIndex(out.idx);
  g.computeBoundingSphere();
  return g;
}

/**
 * A Sphagnum capitulum (~10 mm across): a tight terminal bud of short
 * branches curving up and in, and spreading branches that arch out and droop.
 * Every branch is a tapered, slightly curved tube (leaves give it a ribbed
 * look in the shader).
 */
export function capitulumGeometry(rnd, { spreading = 22, bud = 14, sides = 5, segs = 5 } = {}) {
  const out = { pos: [], nrm: [], idx: [] };
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let i = 0; i < bud; i++) {
    const a = i * 2.39996 + rnd() * 0.3, r0 = 0.3 + rnd() * 0.9;
    const L = 1.2 + rnd() * 1.0;
    const pts = [], rad = [];
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const r = r0 + Math.sin(u * 2.4) * L * 0.35 - u * u * r0 * 0.7;
      pts.push(P(Math.cos(a) * r, -0.6 + u * L * 0.9 + 0.5, Math.sin(a) * r));
      rad.push(0.26 * (1 - u * 0.75));
    }
    tube(pts, rad, sides, out);
  }
  for (let i = 0; i < spreading; i++) {
    const a = i * 2.39996 + rnd() * 0.4, L = 3.2 + rnd() * 1.8, rise = 0.6 + rnd() * 0.6;
    const pts = [], rad = [];
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const r = 0.6 + u * L;
      const y = 0.2 + Math.sin(u * 1.9) * rise - u * u * (1.1 + rnd() * 0.2);
      pts.push(P(Math.cos(a + u * 0.15) * r, y, Math.sin(a + u * 0.15) * r));
      rad.push(0.3 * (1 - u * 0.78));
    }
    tube(pts, rad, sides, out);
  }
  return toGeo(out);
}

export const MOSS_SURFACE = /* glsl */ `
uniform sampler2D uMossTex; uniform float uHasMossTex;
void surface(inout Surf s) {
  // imbricate leaves along each branch: fine ribbing and pale hyaline cells
  float rib = sin(vLocal.x * 18.0 + vLocal.z * 18.0 + vLocal.y * 25.0);
  float n = mFbm(vWorld.xz * 2.2 + vLocal.y);
  vec3 c = vColor * (0.55 + 0.6 * n);
  c = mix(c, vec3(0.55, 0.52, 0.3) * dot(vColor, vec3(0.6)), 0.25 * smoothstep(0.4, 0.9, rib * 0.5 + 0.5));
  if (uHasMossTex > 0.5) c = mix(c, texture2D(uMossTex, vWorld.xz / 18.0).rgb * (vColor / max(dot(vColor, vec3(0.333)), 0.05)) * 0.6, 0.65);
  s.N = normalize(s.N + vec3(rib * 0.12, 0.0, n - 0.5) * 0.3);
  // wet and dark down at the waterline, so each head stands out above it
  c *= mix(0.35, 1.0, smoothstep(0.1, 1.6, vWorld.y));
  s.albedo = c;
  s.rough = 0.6; s.f0 = 0.03; s.wrap = 0.5; s.trans = 0.9;
  // a bright backlit rim on every branch: the heads read as silhouettes against the water
  float nv = max(dot(s.N, normalize(cameraPosition - vWorld)), 0.0);
  s.sheen = 0.4; s.sheenCol = vColor * 2.5 + vec3(0.08, 0.09, 0.03);
  s.emit = (vColor * 1.2 + vec3(0.03, 0.035, 0.012)) * pow(1.0 - nv, 4.0) * (0.12 + uSunCol.g * 0.05);
}`;

/** The bank's ground height (mm) at normalised radius e: dips under the water just inside e = 1, then climbs steeply. */
const bankY = (e) => (e < 1 ? -1.2 * sm(1.0, 0.99, e) : 12 * sm(1.0, 1.08, e));
function bankGeometry() {
  const E = [0.99, 0.996, 1.0, 1.003, 1.007, 1.012, 1.02, 1.03, 1.042, 1.055, 1.07, 1.085, 1.11, 1.15, 1.22, 1.32, 1.45, 1.65, 1.9, 2.3, 3.0];
  const A = 900;
  const pos = [], idx = [];
  for (let i = 0; i <= A; i++) {
    const a = (i / A) * Math.PI * 2;
    const f = Math.hypot(Math.cos(a) / POOL.a, Math.sin(a) / POOL.b) * (1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3));
    for (const e of E) { const r = e / f; pos.push(Math.cos(a) * r, bankY(e), Math.sin(a) * r); }
  }
  const m = E.length;
  for (let i = 0; i < A; i++) for (let j = 0; j < m - 1; j++) {
    const k = i * m + j;
    idx.push(k, k + m, k + 1, k + 1, k + m, k + m + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildWorld({ mossTex = null, sundewTex = null } = {}) {
  const group = new THREE.Group();
  const mossTexU = { value: mossTex }, hasMossTexU = { value: mossTex ? 1 : 0 };
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // sky dome: always far out of focus
  const skyMat = new THREE.ShaderMaterial({
    uniforms: { ...macroShared },
    vertexShader: 'varying vec3 vWorld; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `${MACRO_GLSL}\nvarying vec3 vWorld;\nvoid main() { vec3 d = normalize(vWorld - cameraPosition); gl_FragColor = vec4(envSky(d) * 0.9, 2000.0); }`,
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  group.add(sky);

  // the peat/moss bank under the capitula: a ring that follows the pool's
  // outline exactly, meeting the water at e = 1 and rising steeply
  const groundGeo = bankGeometry();
  const groundMat = litMaterial({ surface: `
    float n = mFbm(vWorld.xz * 0.9);
    s.albedo = mix(vec3(0.06, 0.08, 0.025), vec3(0.18, 0.1, 0.04), n);
    s.rough = 0.8; s.wrap = 0.3;` });
  group.add(new THREE.Mesh(groundGeo, groundMat));
  // the islands' domes: a carpet of moss (MP-S02 when delivered), wet and dark at the waterline
  const domeMat = litMaterial({ uniforms: { uMossTex: mossTexU, uHasMossTex: hasMossTexU }, surface: `uniform sampler2D uMossTex; uniform float uHasMossTex;
    void surface(inout Surf s) {
      float n = mFbm(vWorld.xz * 1.3);
      vec3 c = mix(vec3(0.05, 0.09, 0.02), vec3(0.16, 0.08, 0.03), n);
      if (uHasMossTex > 0.5) c = mix(c, texture2D(uMossTex, vWorld.xz / 9.0).rgb * 0.55, 0.8);
      s.albedo = c * mix(0.35, 1.0, smoothstep(-0.2, 1.2, vWorld.y));
      s.rough = 0.7; s.wrap = 0.4; s.trans = 0.3;
    }` });
  // each island: a low dome of peat and moss rising out of the water
  for (const I of ISLANDS) {
    const dome = new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const dp = dome.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      const x = dp.getX(i) * (I.r + 0.4), z = dp.getZ(i) * (I.r + 0.4);
      const d = Math.hypot(x, z) - I.r;
      dp.setXYZ(i, I.x + x, d > 0 ? -0.6 * (d / 0.4) : mossTop(I.x + x, I.z + z) - 0.9, I.z + z);
    }
    dome.computeVertexNormals();
    group.add(new THREE.Mesh(dome, domeMat));
  }

  // capitula
  const mossMat = litMaterial({ surface: MOSS_SURFACE, uniforms: { uMossTex: mossTexU, uHasMossTex: hasMossTexU } });
  const variants = [capitulumGeometry(rnd, { sides: 4 }), capitulumGeometry(rnd, { spreading: 18, bud: 12, sides: 4 }), capitulumGeometry(rnd, { spreading: 12, bud: 8, sides: 4, segs: 4 })];
  const palette = [[0.06, 0.16, 0.025], [0.11, 0.18, 0.02], [0.2, 0.03, 0.03], [0.24, 0.14, 0.03], [0.09, 0.13, 0.02], [0.16, 0.05, 0.03]];
  const spots = [[], [], []];
  const tryPlace = (x, z, v, s) => {
    const h = mossTop(x, z);
    if (h === -Infinity) return;
    spots[v].push({ x, z, y: h - 1.3 * s, s, rot: rnd() * 6.28, c: palette[Math.floor(rnd() * palette.length)] });
  };
  // the bank: a rim of heads (the lighter variant: it is mostly seen from afar)
  const near = [];
  for (let i = 0; i < 9000 && near.length < 300; i++) {
    const a = rnd() * Math.PI * 2, e = 1.0 + rnd() * 0.1;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e;
    if (poolE(x, z) < 1.0) continue;
    if (near.every((p) => Math.hypot(p.x - x, p.z - z) > 11)) { near.push({ x, z }); tryPlace(x, z, 2, 1.2 + rnd() * 0.5); }
  }
  // islands: a tuft of heads packed over each dome
  for (const I of ISLANDS) {
    const n = Math.round((I.r * I.r) / 3.2);
    for (let i = 0; i < n; i++) {
      const u = Math.sqrt((i + 0.5) / n) * (I.r - 0.6), a = i * 2.39996 + rnd() * 0.3;
      tryPlace(I.x + Math.cos(a) * u, I.z + Math.sin(a) * u, i % 2, 0.85 + rnd() * 0.3);
    }
  }
  // the lawn beyond the bank, far out of focus
  for (let i = 0; i < 4000 && spots[2].length < 320; i++) {
    const a = rnd() * Math.PI * 2, e = 1.08 + rnd() * 0.6;
    const x = Math.cos(a) * POOL.a * e, z = Math.sin(a) * POOL.b * e;
    const ok = spots[2].every((p) => Math.hypot(p.x - x, p.z - z) > 22);
    if (ok) tryPlace(x, z, 2, 1.8 + rnd() * 0.8);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  variants.forEach((geo, v) => {
    const list = spots[v];
    const im = new THREE.InstancedMesh(geo, mossMat, Math.max(1, list.length));
    list.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.25, p.rot, (rnd() - 0.5) * 0.25));
      m4.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
      im.setMatrixAt(i, m4);
      im.setColorAt(i, col.setRGB(...p.c));
    });
    im.count = list.length;
    im.frustumCulled = false;
    group.add(im);
  });

  const sundews = buildSundews(group, rnd, sundewTex);
  const food = buildFood(group, rnd);
  const debris = buildDebris(group, rnd);

  return { group, sundews, food, debris, mossMat, sky, setMossTex(t) { mossMat.uniforms.uMossTex.value = t; mossMat.uniforms.uHasMossTex.value = t ? 1 : 0; } };
}

// ---------------------------------------------------------------- sundews
const GLUE_SURFACE = /* glsl */ `
  float nv = max(dot(s.N, normalize(cameraPosition - vWorld)), 0.0);
  s.albedo = vec3(0.05, 0.004, 0.004);
  s.rough = 0.04; s.f0 = 0.04;
  // light through the clear mucilage, tinted by the red gland beneath
  s.emit = vec3(0.9, 0.08, 0.06) * (0.25 + 0.75 * pow(1.0 - nv, 2.0)) * (uSunCol.r * 0.25 + 0.15);`;

/**
 * Drosera rotundifolia rosettes: round leaf blades on petioles, each with
 * ~90 red glandular tentacles (longer at the rim) tipped with glue drops.
 */
function buildSundews(group, rnd, sundewTex) {
  // rosettes on islands, their leaves held out over the water all round
  // (not on the first island, which is a safe landing near the start)
  const rosettes = [1, 3, 4, 6, 9, 10, 13].map((i, k) => ({ x: ISLANDS[i].x, z: ISLANDS[i].z, n: 3 + (k % 3), R: ISLANDS[i].r }));
  const leafMat = litMaterial({
    uniforms: { uLeafTex: { value: sundewTex }, uHasLeafTex: { value: sundewTex ? 1 : 0 } },
    surface: `uniform sampler2D uLeafTex; uniform float uHasLeafTex;
    void surface(inout Surf s) {
      float r = length(vLocal.xz);
      s.albedo = mix(vec3(0.16, 0.3, 0.05), vec3(0.42, 0.05, 0.04), smoothstep(0.2, 1.0, r));
      // MP-S04: the blade in the middle of the plate (its glands and tentacle bases)
      if (uHasLeafTex > 0.5) { vec4 t = texture2D(uLeafTex, vec2(0.5 + vLocal.x * 0.2, 0.6 - vLocal.z * 0.2)); s.albedo = mix(s.albedo, t.rgb * 0.8, 0.75 * t.a); }
      s.rough = 0.45; s.wrap = 0.4; s.trans = 0.6; s.sheen = 0.1;
    }`,
  });
  const stalkMat = litMaterial({ surface: `s.albedo = mix(vec3(0.2, 0.28, 0.06), vec3(0.4, 0.08, 0.05), smoothstep(0.3, 1.2, vWorld.y)); s.rough = 0.45; s.wrap = 0.4; s.trans = 0.6;` });
  const tentMat = litMaterial({ surface: `s.albedo = mix(vec3(0.38, 0.03, 0.03), vec3(0.5, 0.2, 0.05), smoothstep(0.0, 0.3, vLocal.y) * 0.2); s.rough = 0.4; s.wrap = 0.5; s.trans = 0.8;` });
  const glueMat = litMaterial({ surface: GLUE_SURFACE, shadow: false });
  const tentGeo = new THREE.CylinderGeometry(0.028, 0.05, 1, 5, 1).translate(0, 0.5, 0);
  const dropGeo = new THREE.SphereGeometry(1, 10, 7);
  const bladeGeo = new THREE.SphereGeometry(1, 20, 8);
  { const p = bladeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * 0.12 : y * 0.1); } bladeGeo.computeVertexNormals(); }
  const leaves = [];
  const tents = [];
  for (const ro of rosettes) {
    const baseY = Math.max(mossTop(ro.x, ro.z), 0.6);
    // leaves on one side of the island, so its moss stays in view
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < ro.n; i++) {
      const a = a0 + (i / Math.max(1, ro.n - 1) - 0.5) * 2.2 + (rnd() - 0.5) * 0.25;
      const L = ro.R + 1.8 + rnd() * 2.2, R = 2.0 + rnd() * 0.6;
      const cx = ro.x + Math.cos(a) * L, cz = ro.z + Math.sin(a) * L;
      const under = Math.max(mossTop(cx, cz), 0);
      const cy = Math.max(under + 0.35, 0.55 + rnd() * 0.4);
      // petiole
      const pts = [], rad = [];
      for (let s = 0; s <= 6; s++) {
        const u = s / 6;
        pts.push(new THREE.Vector3(ro.x + Math.cos(a) * (L - R) * u, baseY + (cy - baseY) * u + Math.sin(u * Math.PI) * 0.5, ro.z + Math.sin(a) * (L - R) * u));
        rad.push(0.22 - u * 0.08);
      }
      const out = { pos: [], nrm: [], idx: [] };
      tube(pts, rad, 6, out);
      group.add(new THREE.Mesh(toGeo(out), stalkMat));
      const blade = new THREE.Mesh(bladeGeo, leafMat);
      blade.position.set(cx, cy, cz);
      blade.scale.set(R, R, R);
      blade.rotation.set(0, -a, (rnd() - 0.5) * 0.15);
      group.add(blade);
      const leaf = { x: cx, y: cy + 0.12 * R, z: cz, r: R, a, curl: 0, target: null, tent: [], blade, grip: 0, close: 0, closeW: 0 };
      // tentacles: rim ones long and splayed outward, inner ones short and upright
      const n = 90;
      for (let k = 0; k < n; k++) {
        const u = Math.sqrt((k + 0.5) / n), th = k * 2.39996;
        const lx = Math.cos(th) * u * R * 0.95, lz = Math.sin(th) * u * R * 0.95;
        const base = new THREE.Vector3(cx + lx, cy + 0.12 * R * Math.sqrt(Math.max(0, 1 - u * u)) * 0.9, cz + lz);
        const out2 = new THREE.Vector3(lx, 0, lz).normalize();
        const tilt = u * u * 1.15;
        const dir = new THREE.Vector3(out2.x * Math.sin(tilt), Math.cos(tilt), out2.z * Math.sin(tilt)).normalize();
        const len = 0.3 + u * u * 1.4 + rnd() * 0.15;
        const t = { base, dir0: dir, dir: dir.clone(), len, drop: 0.07 + rnd() * 0.04 + u * 0.03 };
        leaf.tent.push(t);
        tents.push(t);
      }
      leaves.push(leaf);
    }
  }
  const tentIM = new THREE.InstancedMesh(tentGeo, tentMat, tents.length);
  const dropIM = new THREE.InstancedMesh(dropGeo, glueMat, tents.length);
  tentIM.frustumCulled = dropIM.frustumCulled = false;
  group.add(tentIM, dropIM);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), tip = new THREE.Vector3();
  const write = (t, i) => {
    q.setFromUnitVectors(Y, t.dir);
    m4.compose(t.base, q, new THREE.Vector3(1, t.len, 1));
    tentIM.setMatrixAt(i, m4);
    tip.copy(t.dir).multiplyScalar(t.len).add(t.base);
    m4.compose(tip, q, new THREE.Vector3(t.drop, t.drop, t.drop));
    dropIM.setMatrixAt(i, m4);
  };
  tents.forEach(write);
  const want = new THREE.Vector3();
  return {
    leaves,
    /** Which leaf blade (if any) is under the point, within its glue. */
    leafAt(x, y, z) {
      for (const l of leaves) if (Math.hypot(x - l.x, z - l.z) < l.r + 0.25 && y < l.y + 0.9 && y > l.y - 0.6) return l;
      return null;
    },
    /**
     * Curl the tentacles of a leaf toward a target (real: minutes; here seconds).
     * A leaf's `grip` (0..1, set during a capture) folds every tentacle over the
     * target, and `close` (0..1) cups the blade round it.
     */
    update(dt) {
      let i = 0;
      let dirty = false;
      for (const l of leaves) {
        const goal = l.target ? 1 : 0;
        const before = l.curl;
        l.curl += (goal - l.curl) * Math.min(1, dt * (goal ? 0.35 : 0.6));
        const active = Math.abs(l.curl - before) > 1e-5 || l.target || l.grip > 0;
        if (l.close !== l.closeW) {
          const c = l.close;
          l.blade.scale.set(l.r * (1 - 0.35 * c), l.r * (1 + 1.3 * c), l.r * (1 - 0.35 * c));
          l.closeW = c;
        }
        for (const t of l.tent) {
          if (active) {
            if (l.target) {
              want.subVectors(l.target, t.base);
              const d = want.length();
              want.normalize();
              let w = Math.min(1, l.curl * 1.4) * Math.max(0, 1 - d / (l.r * 2.3));
              if (l.grip > 0) w = Math.max(w, l.grip * Math.max(0.45, 1 - d / (l.r * 2.8)));
              t.dir.copy(t.dir0).lerp(want, w).normalize();
            } else t.dir.copy(t.dir0).lerp(t.dir, l.curl).normalize();
            write(t, i);
            dirty = true;
          }
          i++;
        }
      }
      if (dirty) { tentIM.instanceMatrix.needsUpdate = true; dropIM.instanceMatrix.needsUpdate = true; }
    },
    setTexture(t) { leafMat.uniforms.uLeafTex.value = t; leafMat.uniforms.uHasLeafTex.value = t ? 1 : 0; },
  };
}

// ---------------------------------------------------------------- food on the film
export const FOOD_TYPES = [
  { name: 'pine pollen', color: [0.85, 0.62, 0.16], grains: 22, r: 0.055, spread: 0.32, stretch: 1.3 },
  { name: 'fungal spores', color: [0.3, 0.17, 0.07], grains: 26, r: 0.04, spread: 0.24, stretch: 1.0 },
  { name: 'green algae', color: [0.16, 0.42, 0.07], grains: 16, r: 0.04, spread: 0.36, stretch: 3.2 },
];

function buildFood(group, rnd) {
  const COUNT = 90;
  const maxGrains = COUNT * 26;
  const mat = litMaterial({ surface: `s.albedo = vColor * (0.8 + 0.4 * mNoise(vLocal.xy * 9.0)); s.rough = 0.5; s.wrap = 0.4; s.trans = 0.4; s.sheen = 0.2; s.sheenCol = vColor;` });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, maxGrains);
  im.frustumCulled = false;
  group.add(im);
  const clumps = [];
  let gi = 0;
  const place = (c) => {
    for (let tries = 0; tries < 80; tries++) {
      const near = rnd() < 0.5;
      const x = (rnd() - 0.5) * (near ? 70 : 2 * POOL.a), z = (rnd() - 0.5) * (near ? 55 : 2 * POOL.b);
      if (poolE(x, z) < 0.9 && islandEdge(x, z).d > 1.5 && Math.hypot(x + 8, z - 2) > 2.5) { c.x = x; c.z = z; return; }
    }
  };
  for (let i = 0; i < COUNT; i++) {
    const type = FOOD_TYPES[i % FOOD_TYPES.length];
    const c = { type, x: 0, z: 0, vx: 0, vz: 0, bites: 3, grains: [], spin: rnd() * 6.28 };
    place(c);
    for (let k = 0; k < type.grains; k++) {
      const a = rnd() * 6.28, r = Math.sqrt(rnd()) * type.spread;
      c.grains.push({ i: gi++, ox: Math.cos(a) * r, oz: Math.sin(a) * r, r: type.r * (0.75 + rnd() * 0.5), rot: rnd() * 6.28, tilt: (rnd() - 0.5) * 0.6 });
    }
    clumps.push(c);
  }
  im.count = gi;
  const col = new THREE.Color();
  for (const c of clumps) for (const g of c.grains) im.setColorAt(g.i, col.setRGB(...c.type.color).multiplyScalar(0.8 + rnd() * 0.4));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  return {
    clumps, im,
    respawn(c) { place(c); c.bites = 3; c.vx = c.vz = 0; },
    /** Float the grains on the film; hide eaten ones. */
    update(heightAt) {
      for (const c of clumps) {
        const shown = Math.ceil((c.grains.length * c.bites) / 3);
        c.grains.forEach((g, k) => {
          const x = c.x + g.ox, z = c.z + g.oz;
          const on = k < shown;
          v.set(x, heightAt(x, z) + g.r * 0.45, z);
          e.set(g.tilt, g.rot + c.spin, 0);
          q.setFromEuler(e);
          const L = on ? 1 : 0;
          s.set(g.r * c.type.stretch * L, g.r * L, g.r * L);
          m4.compose(v, q, s);
          im.setMatrixAt(g.i, m4);
        });
      }
      im.instanceMatrix.needsUpdate = true;
    },
  };
}

// ---------------------------------------------------------------- floating debris
// Rafts you can stand on: dead Sphagnum leaves (pale, boat-shaped), flakes of
// birch bark (white with dark lenticels), pine needles and a heather twig.
export const DEBRIS_TYPES = [
  { name: 'dead Sphagnum leaf', color: [0.62, 0.52, 0.3], L: 1.9, W: 0.7, T: 0.12, n: 40 },
  { name: 'birch bark flake', color: [0.6, 0.55, 0.47], L: 3.4, W: 2.2, T: 0.16, n: 24 },
  { name: 'pine needle', color: [0.42, 0.26, 0.1], L: 7.5, W: 0.32, T: 0.2, n: 20 },
  { name: 'heather twig', color: [0.28, 0.16, 0.09], L: 6, W: 0.42, T: 0.3, n: 14 },
];
function buildDebris(group, rnd) {
  const mat = litMaterial({ surface: `
    float n = mNoise(vLocal.xz * vec2(3.0, 9.0));
    float len = smoothstep(0.75, 0.95, mNoise(vLocal.xz * vec2(2.0, 26.0) + 3.0));
    s.albedo = vColor * (0.55 + 0.35 * n) * (1.0 - 0.6 * len * step(0.55, vColor.r));
    // wet underside, dry pale top: the raft reads as lying on the water
    s.albedo *= mix(0.45, 1.0, smoothstep(-0.3, 0.6, vLocal.y));
    s.rough = 0.55; s.wrap = 0.35; s.trans = 0.35; s.sheen = 0.15; s.sheenCol = vColor;` });
  const geo = new THREE.SphereGeometry(1, 18, 8);
  { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y : y * 0.5); } geo.computeVertexNormals(); }
  const pieces = [];
  for (const type of DEBRIS_TYPES) for (let k = 0; k < type.n; k++) {
    const d = { type, x: 0, z: 0, a: rnd() * Math.PI, vx: 0, vz: 0, va: (rnd() - 0.5) * 0.04, y: 0, top: 0, L: type.L * (0.8 + rnd() * 0.4), W: type.W * (0.8 + rnd() * 0.4), T: type.T, i: pieces.length };
    for (let t = 0; t < 80; t++) {
      const near = rnd() < 0.5;
      const x = (rnd() - 0.5) * (near ? 80 : 2 * POOL.a), z = (rnd() - 0.5) * (near ? 60 : 2 * POOL.b);
      if (poolE(x, z) < 0.92 && islandEdge(x, z).d > d.L && Math.hypot(x + 8, z - 2) > 4) { d.x = x; d.z = z; break; }
    }
    pieces.push(d);
  }
  const im = new THREE.InstancedMesh(geo, mat, pieces.length);
  im.frustumCulled = false;
  const col = new THREE.Color();
  pieces.forEach((d) => im.setColorAt(d.i, col.setRGB(...d.type.color).multiplyScalar(0.85 + rnd() * 0.3)));
  group.add(im);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  /** Local frame offset of (x, z) from a piece, normalised: < 1 inside it. */
  const inside = (d, x, z) => {
    const dx = x - d.x, dz = z - d.z, c = Math.cos(d.a), s = Math.sin(d.a);
    const u = dx * c + dz * s, w = -dx * s + dz * c;
    return Math.hypot(u / (d.L / 2), w / (d.W / 2));
  };
  return {
    pieces, im,
    /** The piece under (x, z), if any (with a small margin so a landing on its rim holds). */
    at(x, z) { for (const d of pieces) if (inside(d, x, z) < 1.05) return d; return null; },
    /** Drift on the surface flow; ride the ripples. */
    update(dt, field, inPool) {
      for (const d of pieces) {
        const fl = field.flow(d.x, d.z);
        d.vx += (fl[0] * 1.5 - d.vx) * dt * 1.5; d.vz += (fl[1] * 1.5 - d.vz) * dt * 1.5;
        const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
        if (inPool(nx, nz) && poolE(nx, nz) < 0.95 && islandEdge(nx, nz).d > d.L * 0.5) { d.x = nx; d.z = nz; } else { d.vx *= -0.5; d.vz *= -0.5; }
        d.a += d.va * dt;
        d.y = field.height(d.x, d.z);
        d.top = d.y + d.T * 0.6;
        v.set(d.x, d.y + d.T * 0.1, d.z);
        e.set(0, -d.a, 0);
        q.setFromEuler(e);
        sc.set(d.L / 2, d.T, d.W / 2);
        m4.compose(v, q, sc);
        im.setMatrixAt(d.i, m4);
      }
      im.instanceMatrix.needsUpdate = true;
    },
    /** Menisci climbing each piece's rim (a negative dimple: the film rises to it). */
    contacts(near, out) {
      for (const d of pieces) {
        if (Math.hypot(d.x - near.x, d.z - near.z) > 34) continue;
        const c = Math.cos(d.a), s = Math.sin(d.a);
        const n = Math.max(1, Math.round(d.L / d.W / 1.6));
        for (let k = 0; k < n; k++) {
          const u = n === 1 ? 0 : (k / (n - 1) - 0.5) * (d.L - d.W);
          out(d.x + c * u, d.z + s * u, d.W * 0.36, -0.05);
        }
      }
    },
  };
}
