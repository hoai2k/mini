// The bog pool: a shallow hollow of open water ringed by a Sphagnum lawn,
// with a moss island, sundew rosettes on the edge and food floating on the
// film. Units: mm; the water surface is y = 0.
import * as THREE from '../shared/vendor/three.module.min.js';
import { litMaterial, macroShared, MACRO_GLSL } from '../shared/techniques/springtail-macro.js';

export const ISLAND = { x: 15, z: -9, r: 4 };

/** Normalised pool radius: < 1 inside the pool (matches POOL_GLSL). */
export function poolE(x, z) {
  const a = Math.atan2(z, x);
  return Math.hypot(x / 36, z / 27) * (1 + 0.05 * Math.sin(3 * a + 0.5) + 0.035 * Math.sin(5 * a + 1.3));
}
const islandD = (x, z) => Math.hypot(x - ISLAND.x, z - ISLAND.z);
export const inPool = (x, z) => poolE(x, z) < 1 && islandD(x, z) > ISLAND.r;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Height (mm) of the top of the moss lawn, or -Infinity over open water. */
export function mossTop(x, z) {
  const e = poolE(x, z), d = islandD(x, z);
  let h = -Infinity;
  if (e >= 0.985) h = 1.4 + 6 * sm(1.0, 1.45, e);
  if (d <= ISLAND.r + 0.3) h = Math.max(h, 1.4 + 1.6 * sm(ISLAND.r, 1.2, d));
  return h;
}

export const POOL_GLSL = /* glsl */ `
float poolDepth(vec2 p) {
  float a = atan(p.y, p.x);
  float e = length(p / vec2(36.0, 27.0)) * (1.0 + 0.05 * sin(3.0 * a + 0.5) + 0.035 * sin(5.0 * a + 1.3));
  float di = length(p - vec2(${ISLAND.x.toFixed(1)}, ${ISLAND.z.toFixed(1)}));
  return 0.35 + 3.3 * smoothstep(1.0, 0.72, e) * smoothstep(${ISLAND.r.toFixed(1)}, ${(ISLAND.r + 5).toFixed(1)}, di);
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
function capitulumGeometry(rnd, { spreading = 22, bud = 14, sides = 5, segs = 5 } = {}) {
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

const MOSS_SURFACE = /* glsl */ `
uniform sampler2D uMossTex; uniform float uHasMossTex;
void surface(inout Surf s) {
  // imbricate leaves along each branch: fine ribbing and pale hyaline cells
  float rib = sin(vLocal.x * 18.0 + vLocal.z * 18.0 + vLocal.y * 25.0);
  float n = mFbm(vWorld.xz * 2.2 + vLocal.y);
  vec3 c = vColor * (0.55 + 0.6 * n);
  c = mix(c, vec3(0.55, 0.52, 0.3) * dot(vColor, vec3(0.6)), 0.25 * smoothstep(0.4, 0.9, rib * 0.5 + 0.5));
  if (uHasMossTex > 0.5) c = mix(c, texture2D(uMossTex, vWorld.xz / 18.0).rgb * (vColor / max(dot(vColor, vec3(0.333)), 0.05)) * 0.6, 0.65);
  s.albedo = c;
  s.N = normalize(s.N + vec3(rib * 0.12, 0.0, n - 0.5) * 0.3);
  s.rough = 0.6; s.f0 = 0.03; s.wrap = 0.5; s.trans = 0.9; s.sheen = 0.12; s.sheenCol = vColor * 2.0 + 0.05;
}`;

export function buildWorld({ mossTex = null, sundewTex = null } = {}) {
  const group = new THREE.Group();
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

  // the peat/moss ground under the capitula, so no gaps show through
  const groundGeo = new THREE.PlaneGeometry(400, 400, 200, 200).rotateX(-Math.PI / 2);
  const gp = groundGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i);
    const h = mossTop(x, z);
    gp.setY(i, h === -Infinity ? -6 : h - 1.8);
  }
  groundGeo.computeVertexNormals();
  const groundMat = litMaterial({ surface: `
    float n = mFbm(vWorld.xz * 0.9);
    s.albedo = mix(vec3(0.06, 0.08, 0.025), vec3(0.18, 0.1, 0.04), n);
    s.rough = 0.8; s.wrap = 0.3;` });
  group.add(new THREE.Mesh(groundGeo, groundMat));

  // capitula
  const mossMat = litMaterial({ surface: MOSS_SURFACE, uniforms: { uMossTex: { value: mossTex }, uHasMossTex: { value: mossTex ? 1 : 0 } } });
  const variants = [capitulumGeometry(rnd), capitulumGeometry(rnd, { spreading: 18, bud: 12 }), capitulumGeometry(rnd, { spreading: 12, bud: 8, sides: 4, segs: 4 })];
  const palette = [[0.06, 0.16, 0.025], [0.11, 0.18, 0.02], [0.2, 0.03, 0.03], [0.24, 0.14, 0.03], [0.09, 0.13, 0.02], [0.16, 0.05, 0.03]];
  const spots = [[], [], []];
  const tryPlace = (x, z, v, s) => {
    const h = mossTop(x, z);
    if (h === -Infinity) return;
    spots[v].push({ x, z, y: h - 1.3 * s, s, rot: rnd() * 6.28, c: palette[Math.floor(rnd() * palette.length)] });
  };
  for (let i = 0; i < 2600 && spots[0].length + spots[1].length < 170; i++) {
    const a = rnd() * Math.PI * 2, e = 1.0 + rnd() * 0.75;
    const x = Math.cos(a) * 36 * e, z = Math.sin(a) * 27 * e;
    if (poolE(x, z) < 0.99) continue;
    const ok = [...spots[0], ...spots[1]].every((p) => Math.hypot(p.x - x, p.z - z) > 6.2);
    if (ok) tryPlace(x, z, rnd() < 0.5 ? 0 : 1, 0.85 + rnd() * 0.4);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, r = i === 0 ? 0 : 2.6;
    tryPlace(ISLAND.x + Math.cos(a) * r, ISLAND.z + Math.sin(a) * r, i % 2, 0.75 + rnd() * 0.2);
  }
  for (let i = 0; i < 1800 && spots[2].length < 220; i++) {
    const a = rnd() * Math.PI * 2, e = 1.7 + rnd() * 1.6;
    const x = Math.cos(a) * 36 * e, z = Math.sin(a) * 27 * e;
    const ok = spots[2].every((p) => Math.hypot(p.x - x, p.z - z) > 9);
    if (ok) tryPlace(x, z, 2, 1.1 + rnd() * 0.5);
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

  return { group, sundews, food, mossMat, sky, setMossTex(t) { mossMat.uniforms.uMossTex.value = t; mossMat.uniforms.uHasMossTex.value = t ? 1 : 0; } };
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
  const rosettes = [
    { x: 30, z: 10, n: 5 },
    { x: -14, z: 25, n: 6 },
    { x: ISLAND.x, z: ISLAND.z, n: 4 },
    { x: -33, z: -9, n: 5 },
  ];
  const leafMat = litMaterial({
    uniforms: { uLeafTex: { value: sundewTex }, uHasLeafTex: { value: sundewTex ? 1 : 0 } },
    surface: `uniform sampler2D uLeafTex; uniform float uHasLeafTex;
    void surface(inout Surf s) {
      float r = length(vLocal.xz);
      s.albedo = mix(vec3(0.16, 0.3, 0.05), vec3(0.42, 0.05, 0.04), smoothstep(0.2, 1.0, r));
      if (uHasLeafTex > 0.5) s.albedo = mix(s.albedo, texture2D(uLeafTex, vLocal.xz * 0.5 + 0.5).rgb, 0.7);
      s.rough = 0.45; s.wrap = 0.4; s.trans = 0.6; s.sheen = 0.1;
    }`,
  });
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
    const toCenter = Math.atan2(-ro.z, -ro.x);
    for (let i = 0; i < ro.n; i++) {
      const a = toCenter + (i - (ro.n - 1) / 2) * (ro.n > 4 ? 0.62 : 1.4) + (rnd() - 0.5) * 0.25;
      const L = 5.5 + rnd() * 2.5, R = 2.0 + rnd() * 0.6;
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
      group.add(new THREE.Mesh(toGeo(out), leafMat));
      const blade = new THREE.Mesh(bladeGeo, leafMat);
      blade.position.set(cx, cy, cz);
      blade.scale.set(R, R, R);
      blade.rotation.set(0, -a, (rnd() - 0.5) * 0.15);
      group.add(blade);
      const leaf = { x: cx, y: cy + 0.12 * R, z: cz, r: R, a, curl: 0, target: null, tent: [] };
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
    /** Curl the tentacles of a leaf toward a target (real: minutes; here seconds). */
    update(dt) {
      let i = 0;
      let dirty = false;
      for (const l of leaves) {
        const goal = l.target ? 1 : 0;
        const before = l.curl;
        l.curl += (goal - l.curl) * Math.min(1, dt * (goal ? 0.35 : 0.6));
        const active = Math.abs(l.curl - before) > 1e-5 || l.target;
        for (const t of l.tent) {
          if (active) {
            if (l.target) {
              want.subVectors(l.target, t.base);
              const d = want.length();
              want.normalize();
              const w = Math.min(1, l.curl * 1.4) * Math.max(0, 1 - d / (l.r * 2.3));
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
  const COUNT = 30;
  const maxGrains = COUNT * 26;
  const mat = litMaterial({ surface: `s.albedo = vColor * (0.8 + 0.4 * mNoise(vLocal.xy * 9.0)); s.rough = 0.5; s.wrap = 0.4; s.trans = 0.4; s.sheen = 0.2; s.sheenCol = vColor;` });
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, maxGrains);
  im.frustumCulled = false;
  group.add(im);
  const clumps = [];
  let gi = 0;
  const place = (c) => {
    for (let tries = 0; tries < 80; tries++) {
      const x = (rnd() - 0.5) * 64, z = (rnd() - 0.5) * 48;
      if (poolE(x, z) < 0.9 && Math.hypot(x - ISLAND.x, z - ISLAND.z) > ISLAND.r + 1.5 && Math.hypot(x + 8, z - 2) > 2.5) { c.x = x; c.z = z; return; }
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
