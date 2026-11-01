// Bead-cluster molecules for the phage world (Level 6), drawn as sphere
// impostors in the manner of real-time molecular viewers (QuteMol, Tarini,
// Cignoni and Montani 2006; Mol*): every molecule is a lumpy cluster of small
// spheres, and every sphere is one camera-facing quad whose fragment shader
// ray-casts the sphere, writes its true depth (so clusters interpenetrate,
// occlude and feed the screen-space ambient occlusion and outline pass in
// phage-goodsell.js) and shades it in the world's looks. See phage/LOOK.md.
//
//  - beadTemplate(kind, seed): a molecule as a list of beads {p, r, c, g}
//    (false-light and Goodsell colours), with a per-bead "outward" direction
//    used for a baked crease occlusion (beads facing into the cluster darken).
//  - beadMesh(template, count, { material }): one instanced draw of `count`
//    copies (per instance: position + seed, quaternion, tint + scale).
//  - beadMaterial({ bath }): the impostor shader. With `bath` the instances
//    never touch the CPU: the vertex shader wraps them round uCenter in a box
//    of 2·uHalf (so the water is full in every direction, round every split
//    view), jostles and tumbles them thermally, pushes them out of the phages'
//    way and out of solid cells, and clears the lens.
//  - createBath(specs, opts): a set of species sharing one bath material.
import * as THREE from '../vendor/three.module.min.js';
import { goodsellShared } from './phage-goodsell.js';

const MAX_PHAGES = 4, MAX_SOLIDS = 6;

const VERT = /* glsl */`
attribute vec2 corner; attribute vec4 bead; attribute vec3 bcol; attribute vec3 gcol; attribute vec3 bout;
attribute vec4 iPos; attribute vec4 iQuat; attribute vec4 iTint;
uniform float uTime; uniform float uScaleAll;
uniform vec3 uCenter; uniform float uHalf; uniform float uJit; uniform float uSpin; uniform float uKeepR; uniform float uInner;
uniform vec4 uPhage[${MAX_PHAGES}]; uniform vec4 uCapA[${MAX_SOLIDS}]; uniform vec4 uCapB[${MAX_SOLIDS}];
uniform vec4 uGust; uniform vec3 uGustDir;
varying vec3 vC; varying float vR; varying vec3 vQ; varying vec3 vCol; varying vec3 vGCol; varying vec3 vOut; varying float vGlow;
vec3 qrot(vec4 q, vec3 v){ return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 qmul(vec4 a, vec4 b){ return vec4(a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz), a.w * b.w - dot(a.xyz, b.xyz)); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0); return length(pa - ba * h) - r; }
void main(){
  vec3 base = iPos.xyz; float seed = iPos.w; vec4 q = iQuat; float s = iTint.w * uScaleAll;
  vGlow = 0.0;
  #ifdef BATH
    // thermal jostling: smaller molecules jitter faster and further
    float js = uJit / sqrt(max(s, 0.3)), w = 1.0 / sqrt(max(s, 0.4));
    base += js * vec3(sin(uTime * 1.7 * w + seed * 13.1) + 0.5 * sin(uTime * 4.1 * w + seed * 7.3),
                      sin(uTime * 1.3 * w + seed * 5.7) + 0.5 * sin(uTime * 4.6 * w + seed * 3.1),
                      sin(uTime * 1.9 * w + seed * 9.9) + 0.5 * sin(uTime * 3.4 * w + seed * 1.7));
    // wrapped round the view's centre: the bath is full in every direction
    vec3 d = mod(base - uCenter + uHalf, 2.0 * uHalf) - uHalf;
    base = uCenter + d;
    float edge = max(abs(d.x), max(abs(d.y), abs(d.z)));
    s *= smoothstep(uHalf, uHalf * 0.8, edge); // (molecules shrink away before they wrap: no popping)
    if (uInner > 0.0) s *= smoothstep(uInner * 0.8, uInner, length(d)); // (an outer bath leaves the middle to the near one)
    // tumbling
    float ang = uTime * uSpin * (0.4 + fract(seed * 3.7)) * w;
    vec3 ax = normalize(vec3(sin(seed * 11.0), cos(seed * 7.0), sin(seed * 3.0 + 1.0)) + 1e-3);
    q = qmul(vec4(ax * sin(ang * 0.5), cos(ang * 0.5)), q);
    // shoved aside by the phages (their wake) and by a gust
    for (int i = 0; i < ${MAX_PHAGES}; i++) {
      vec4 ph = uPhage[i];
      if (ph.w <= 0.0) continue;
      vec3 o = base - ph.xyz; float l = length(o);
      if (l < ph.w) base += o / max(l, 1e-3) * (ph.w - l) * 0.9;
    }
    if (uGust.w > 0.0) base += uGustDir * uGust.w * smoothstep(90.0, 0.0, length(base - uGust.xyz));
    // never inside a solid (the hosts, the amoeba, the clay, the flocs)
    for (int i = 0; i < ${MAX_SOLIDS}; i++) {
      vec4 a = uCapA[i];
      if (a.w <= 0.0) continue;
      s *= smoothstep(-1.0, 5.0, sdCap(base, a.xyz, uCapB[i].xyz, a.w));
    }
    // clear the lens: nothing large right in front of the camera
    s *= smoothstep(uKeepR * 0.5, uKeepR, length(base - cameraPosition));
  #endif
  vec3 bc = base + qrot(q, bead.xyz * s);
  vec4 mvC = modelViewMatrix * vec4(bc, 1.0);
  float r = bead.w * s;
  vec4 mv = mvC;
  mv.xy += corner * r * 1.3; // a little larger than the sphere: its perspective silhouette fits
  vC = mvC.xyz; vR = r; vQ = mv.xyz;
  vCol = bcol * iTint.rgb; vGCol = gcol * iTint.rgb;
  vOut = mat3(modelViewMatrix) * qrot(q, bout);
  gl_Position = projectionMatrix * mv;
  if (r < 0.03) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // collapsed: no fragments
}`;

const FRAG = /* glsl */`
uniform mat4 projectionMatrix;
uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uDepthOn; uniform float uStyle; uniform vec3 uHaze;
uniform float uGlowAll; uniform vec3 uGlowColor; uniform float uSat;
varying vec3 vC; varying float vR; varying vec3 vQ; varying vec3 vCol; varying vec3 vGCol; varying vec3 vOut; varying float vGlow;
void main(){
  // ray-cast the sphere from the eye (view space): exact silhouette, normal and depth
  vec3 rd = normalize(vQ);
  // (closest approach form: |C|^2 - b^2 would cancel catastrophically for small, far beads)
  float b = dot(rd, vC);
  vec3 perp = vC - rd * b;
  float h = vR * vR - dot(perp, perp);
  if (h < 0.0) discard;
  float t = b - sqrt(h);
  vec3 hp = rd * t, n = normalize(hp - vC), v = -rd;
  vec4 clip = projectionMatrix * vec4(hp, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  float depth = -hp.z;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  // baked crease occlusion: the side of a bead facing into its cluster is shadowed by its neighbours
  float ao = clamp(0.66 + 0.55 * dot(n, vOut), 0.3, 1.0);
  vec3 col;
  if (uStyle > 0.5) {
    vec3 albedo = vCol;
    float l = dot(albedo, vec3(0.299, 0.587, 0.114));
    albedo = mix(vec3(l), albedo, uSat);
    vec3 L = normalize(vec3(-0.45, 0.75, 0.5));
    float wrapD = clamp((dot(n, L) + 0.55) / 1.55, 0.0, 1.0);
    float fres = pow(1.0 - ndv, 2.4);
    col = albedo * (vec3(1.0, 0.93, 0.8) * wrapD * 0.95 + vec3(0.28, 0.52, 0.66) * (0.55 + 0.35 * n.y)) * ao;
    col += fres * (albedo * 0.45 + vec3(0.25, 0.55, 0.65)) * 0.55 * ao;     // soft translucent rim
    col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, normalize(L + v)), 0.0), 40.0) * 0.28 * ao; // wet glint
    col += uGlowColor * uGlowAll * (0.4 + fres);
    float f = uDepthOn * smoothstep(uFogNear, uFogFar * 1.8, depth) * 0.78;
    col = mix(col, uHaze, f);
  } else {
    // Goodsell: flat colour, a soft two-tone light, depth by desaturation (outlines come from the pass)
    vec3 base = vGCol;
    float shade = smoothstep(-0.35, 0.85, dot(n, normalize(vec3(-0.35, 0.75, 0.55))));
    col = base * (0.78 + 0.26 * shade) * mix(1.0, ao, 0.45);
    float f = uDepthOn * smoothstep(uFogNear, uFogFar, depth);
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(g), f * 0.5);
    col = mix(col, uFogColor, f * 0.82);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

/** The impostor material. `bath`: GPU-wrapped, jostling, tumbling instances (see the header). */
export function beadMaterial({ bath = false, glow = 0, glowColor = '#ffc65a', sat = 1 } = {}) {
  const v4 = (n) => Array.from({ length: n }, () => new THREE.Vector4(0, 0, 0, 0));
  return new THREE.ShaderMaterial({
    uniforms: {
      ...goodsellShared,
      uScaleAll: { value: 1 },
      uCenter: { value: new THREE.Vector3() }, uHalf: { value: 100 }, uJit: { value: 0.8 }, uSpin: { value: 0.35 }, uKeepR: { value: 30 }, uInner: { value: 0 },
      uPhage: { value: v4(MAX_PHAGES) }, uCapA: { value: v4(MAX_SOLIDS) }, uCapB: { value: v4(MAX_SOLIDS) },
      uGust: { value: new THREE.Vector4() }, uGustDir: { value: new THREE.Vector3() },
      uGlowAll: { value: glow }, uGlowColor: { value: new THREE.Color(glowColor) }, uSat: { value: sat },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: bath ? { BATH: '' } : {},
  });
}

// --- templates ---
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const C = (hex) => new THREE.Color(hex);
/** Palette by molecule type (false light, Goodsell). */
export const PALETTE = {
  violet: ['#5a62c8', '#e9a0b4'], periwinkle: ['#8693e4', '#f0b9c8'], teal: ['#3aa3ae', '#9fd29a'],
  green: ['#86bd78', '#c2dd8a'], pale: ['#a8c4dc', '#ffffff'], olive: ['#a8873e', '#c79b6a'],
  blue: ['#4a63c8', '#7d9de0'], gold: ['#e8b54a', '#f2d36a'], lpsCore: ['#b3a845', '#c8c070'], lpsTip: ['#b4cde8', '#e6f0c0'],
  humicDark: ['#6e5428', '#a77d52'], stalk: ['#b2a58a', '#c8b89a'],
  pink: ['#b07fd0', '#ec8fae'], porin: ['#3f58c0', '#f08a4b'], ribo: ['#5a4fb8', '#d9708a'],
};
let DETAIL = 1; // (beadTemplate's detail: more, smaller beads at the same size)
function ball(out, cx, cy, cz, R, n, br, pal, rnd, jitter = 0.08) {
  const [a, b] = pal;
  n = Math.round(n * DETAIL); br /= Math.cbrt(DETAIL) * 0.92 + 0.08;
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, q = Math.sqrt(1 - u * u), k = Math.cbrt(rnd()) * R;
    const r = br * (0.8 + rnd() * 0.4);
    const ca = C(a).offsetHSL((rnd() - 0.5) * jitter, 0, (rnd() - 0.5) * 0.12), cb = C(b).offsetHSL((rnd() - 0.5) * jitter, 0, (rnd() - 0.5) * 0.1);
    out.push({ p: [cx + q * Math.cos(t) * k, cy + u * k, cz + q * Math.sin(t) * k], r, c: ca, g: cb });
  }
}
function walk(out, x, y, z, n, step, br, pal, rnd, dir = null) {
  let dx = 0, dy = 1, dz = 0;
  for (let i = 0; i < n; i++) {
    const [a, b] = pal;
    out.push({ p: [x, y, z], r: br * (0.85 + rnd() * 0.3), c: C(a).offsetHSL(0, 0, (rnd() - 0.5) * 0.12), g: C(b).offsetHSL(0, 0, (rnd() - 0.5) * 0.1) });
    if (dir) { dx = dir[0] + (rnd() - 0.5) * 0.6; dy = dir[1] + (rnd() - 0.5) * 0.6; dz = dir[2] + (rnd() - 0.5) * 0.6; }
    else { dx += (rnd() - 0.5) * 1.4; dy += (rnd() - 0.5) * 1.4; dz += (rnd() - 0.5) * 1.4; }
    const l = Math.hypot(dx, dy, dz) || 1;
    x += (dx / l) * step; y += (dy / l) * step; z += (dz / l) * step;
  }
}
/**
 * A molecule as beads. Kinds: globule, small, dimer, chain, complex (ribosome-sized), humic,
 * lps (upright along +y), porin (OmpC trimer, along +y), mprot (membrane protein), floc (a humic tangle).
 */
export function beadTemplate(kind, seed = 1, pal = null, detail = 1) {
  const rnd = rng(seed * 7919 + kind.length * 104729);
  DETAIL = Math.max(0.5, detail);
  const out = [];
  const P = (k) => pal || PALETTE[k];
  if (kind === 'globule') ball(out, 0, 0, 0, 1.2, 9 + Math.floor(rnd() * 6), 0.8, P('violet'), rnd);
  else if (kind === 'small') {
    // a sugar or water cluster, or (one in three, as in MP-V04) a lone ion in its own colour
    if (!pal && rnd() < 0.34) { const ion = ['#8a5ad8', '#5ab85a', '#e0a030', '#d8e4ee'][Math.floor(rnd() * 4)]; out.push({ p: [0, 0, 0], r: 0.5, c: C(ion), g: C(ion) }); }
    else ball(out, 0, 0, 0, 0.45, 2 + Math.floor(rnd() * 2), 0.42, P('pale'), rnd);
  }
  else if (kind === 'dimer') { ball(out, -0.9, 0, 0, 0.9, 7, 0.72, P('green'), rnd); ball(out, 0.9, 0.2, 0.1, 0.9, 7, 0.72, P('green'), rnd); }
  else if (kind === 'chain') walk(out, 0, -2, 0, 6 + Math.floor(rnd() * 4), 0.75, 0.45, P('pale'), rnd);
  else if (kind === 'complex') { ball(out, 0, -0.8, 0, 2.2, 22, 0.95, P('ribo'), rnd, 0.05); ball(out, 0.5, 1.6, 0.2, 1.5, 12, 0.85, P('ribo'), rnd, 0.05); }
  else if (kind === 'humic') { walk(out, 0, 0, 0, 12, 0.7, 0.45, P('olive'), rnd); walk(out, 0, 0, 0, 8, 0.7, 0.45, P('olive'), rnd); ball(out, 0, 0, 0, 0.9, 5, 0.6, pal || PALETTE.humicDark, rnd); }
  else if (kind === 'lps') {
    walk(out, 0, 0.5, 0, 4, 0.85, 0.5, P('lpsCore'), rnd, [0, 1, 0]);
    out[out.length - 1 - Math.floor(rnd() * 3)].c = C('#c8503a'); // a red phosphate dot in the core (MP-V04)
    const top = out[out.length - 1].p;
    for (let k = 0; k < 3; k++) walk(out, top[0], top[1] + 0.6, top[2], 2 + Math.floor(rnd() * 2), 0.6, 0.38, P('lpsTip'), rnd, [Math.cos(k * 2.1) * 0.7, 0.8, Math.sin(k * 2.1) * 0.7]);
  } else if (kind === 'porin') {
    // a rounded triangle round a dark pore (MP-V04, MP-V05): beads at the corners and along the edges
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI * 2) / 6 + Math.PI / 6, rr = k % 2 ? 1.0 : 1.35; ball(out, Math.cos(a) * rr, 0.9, Math.sin(a) * rr, 0.55, 4, 0.5, P('porin'), rnd, 0.04); }
  } else if (kind === 'mprot') { ball(out, 0, 1.2, 0, 1.1, 8, 0.78, P('periwinkle'), rnd); ball(out, 0, 2.6, 0, 0.9, 6, 0.7, P('periwinkle'), rnd); }
  else if (kind === 'floc') {
    // after MP-R21: looping golden-brown beaded strands round a dense dark core, a few grey mineral flakes
    for (let k = 0; k < 12; k++) walk(out, (rnd() - 0.5) * 4, (rnd() - 0.5) * 4, (rnd() - 0.5) * 4, 34, 1.1, 0.6, k % 3 ? P('olive') : ['#c8963c', '#e0b060'], rnd);
    for (let k = 0; k < 8; k++) ball(out, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8, (rnd() - 0.5) * 8, 2.6, 18, 0.9, k % 2 ? PALETTE.humicDark : P('olive'), rnd);
    for (let k = 0; k < 3; k++) ball(out, (rnd() - 0.5) * 7, (rnd() - 0.5) * 7, (rnd() - 0.5) * 3, 1.6, 8, 0.8, ['#8a8a82', '#a0a098'], rnd, 0.02);
  } else throw new Error(`unknown bead kind ${kind}`);
  DETAIL = 1;
  return out;
}

/** An instanced mesh of `count` copies of a bead template, drawn with `material` (a beadMaterial). */
export function beadMesh(template, count, { material, dynamic = false } = {}) {
  const nb = template.length;
  const cx = template.reduce((a, b) => a + b.p[0], 0) / nb, cy = template.reduce((a, b) => a + b.p[1], 0) / nb, cz = template.reduce((a, b) => a + b.p[2], 0) / nb;
  let ext = 0;
  for (const b of template) ext = Math.max(ext, Math.hypot(b.p[0] - cx, b.p[1] - cy, b.p[2] - cz));
  const corner = new Float32Array(nb * 8), bead = new Float32Array(nb * 16), bcol = new Float32Array(nb * 12), gcol = new Float32Array(nb * 12), bout = new Float32Array(nb * 12);
  const index = [];
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  template.forEach((b, i) => {
    const ox = b.p[0] - cx, oy = b.p[1] - cy, oz = b.p[2] - cz, ol = Math.hypot(ox, oy, oz);
    const k = ext > 0 ? Math.min(1, ol / (ext * 0.6)) / (ol || 1) : 0; // outward, weighted by how far out the bead is
    for (let v = 0; v < 4; v++) {
      const j = i * 4 + v;
      corner.set(CORNERS[v], j * 2);
      bead.set([b.p[0], b.p[1], b.p[2], b.r], j * 4);
      bcol.set([b.c.r, b.c.g, b.c.b], j * 3);
      gcol.set([b.g.r, b.g.g, b.g.b], j * 3);
      bout.set([ox * k, oy * k, oz * k], j * 3);
    }
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nb * 12), 3)); // (unused; three wants one)
  g.setAttribute('corner', new THREE.BufferAttribute(corner, 2));
  g.setAttribute('bead', new THREE.BufferAttribute(bead, 4));
  g.setAttribute('bcol', new THREE.BufferAttribute(bcol, 3));
  g.setAttribute('gcol', new THREE.BufferAttribute(gcol, 3));
  g.setAttribute('bout', new THREE.BufferAttribute(bout, 3));
  g.setIndex(index);
  const iPos = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const iQuat = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const iTint = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  for (const a of [iPos, iQuat, iTint]) a.setUsage(dynamic ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);
  g.setAttribute('iPos', iPos); g.setAttribute('iQuat', iQuat); g.setAttribute('iTint', iTint);
  g.instanceCount = count;
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  mesh.userData.beads = nb;
  mesh.userData.extent = ext;
  const api = {
    mesh, count, extent: ext,
    /** Instance i: position, quaternion, scale, tint (a THREE.Color or null), seed. */
    set(i, p, q, s = 1, tint = null, seed = i * 0.6180339) {
      iPos.array.set([p.x, p.y, p.z, seed], i * 4);
      iQuat.array.set([q.x, q.y, q.z, q.w], i * 4);
      iTint.array.set([tint ? tint.r : 1, tint ? tint.g : 1, tint ? tint.b : 1, s], i * 4);
    },
    /** Hide instance i (scale 0). */
    hide(i) { iTint.array[i * 4 + 3] = 0; },
    commit() { iPos.needsUpdate = iQuat.needsUpdate = iTint.needsUpdate = true; },
    /** Draw only the first n instances. */
    setCount(n) { g.instanceCount = Math.max(0, Math.min(count, n)); mesh.visible = g.instanceCount > 0; },
    /** A bounding sphere (local), for static meshes that should be culled with their parent. */
    fitBounds(pad = 4) {
      const a = iPos.array, n = count;
      const box = new THREE.Box3();
      for (let i = 0; i < n; i++) box.expandByPoint(new THREE.Vector3(a[i * 4], a[i * 4 + 1], a[i * 4 + 2]));
      let sMax = 0;
      for (let i = 0; i < n; i++) sMax = Math.max(sMax, iTint.array[i * 4 + 3]);
      g.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      g.boundingSphere.radius += (ext + 2) * sMax + pad;
      mesh.frustumCulled = true;
    },
  };
  return api;
}

/**
 * A bath of molecules round a centre (see beadMaterial's `bath`). specs: [{ kind, n, s: [min, max], pal?, seed? }],
 * opts: { half, jitter, spin, keepR, scale }. Returns { group, material, meshes, setCenter(v), setLevel(0..2) }.
 */
export function createBath(specs, { half = 120, jitter = 0.8, spin = 0.35, keepR = 30, inner = 0, scale = 1, seed = 1, sat = 1, detail = 1 } = {}) {
  const material = beadMaterial({ bath: true, sat });
  const u = material.uniforms;
  u.uHalf.value = half; u.uJit.value = jitter; u.uSpin.value = spin; u.uKeepR.value = keepR; u.uInner.value = inner;
  const group = new THREE.Group();
  const rnd = rng(seed * 31 + 7);
  const meshes = [];
  const q = new THREE.Quaternion(), p = new THREE.Vector3(), e = new THREE.Euler();
  specs.forEach((sp, k) => {
    const variants = sp.variants || 2;
    const per = Math.ceil(sp.n / variants);
    for (let vi = 0; vi < variants; vi++) {
      const m = beadMesh(beadTemplate(sp.kind, (sp.seed || 1) * 13 + vi * 101 + k, sp.pal || null, detail), per, { material });
      for (let i = 0; i < per; i++) {
        p.set((rnd() * 2 - 1) * half, (rnd() * 2 - 1) * half, (rnd() * 2 - 1) * half);
        q.setFromEuler(e.set(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3));
        m.set(i, p, q, (sp.s[0] + rnd() * (sp.s[1] - sp.s[0])) * scale, null, rnd() * 100);
      }
      m.commit();
      m.full = per;
      group.add(m.mesh);
      meshes.push(m);
    }
  });
  return {
    group, material, meshes, uniforms: u, jit0: jitter,
    setCenter(v) { u.uCenter.value.copy(v); },
    /** Quality: 2 all, 1 three quarters, 0 half of each species. */
    setLevel(level) { const f = level >= 2 ? 1 : level === 1 ? 0.75 : 0.5; for (const m of meshes) m.setCount(Math.round(m.full * f)); },
    get beads() { return meshes.reduce((a, m) => a + m.mesh.geometry.instanceCount * m.mesh.userData.beads, 0); },
  };
}

/** Write the shared solids (capsules a→b with radius r; a sphere is a = b) into a bath material. */
export function setSolids(material, list) {
  const A = material.uniforms.uCapA.value, B = material.uniforms.uCapB.value;
  for (let i = 0; i < MAX_SOLIDS; i++) {
    const s = list[i];
    if (!s) { A[i].set(0, 0, 0, 0); continue; }
    A[i].set(s.a.x, s.a.y, s.a.z, s.r); B[i].set(s.b.x, s.b.y, s.b.z, 0);
  }
}
/** Write the phages' wake spheres (centre, radius) into a bath material. */
export function setPhages(material, list) {
  const P = material.uniforms.uPhage.value;
  for (let i = 0; i < MAX_PHAGES; i++) { const s = list[i]; if (s) P[i].set(s.p.x, s.p.y, s.p.z, s.r); else P[i].set(0, 0, 0, 0); }
}

// --- the far layer: MP-V07's molecule sprites (a 4 × 4 sheet), camera-facing, wrapped round the view
// beyond the baths. The sheet was keyed from #FF00FF and left coloured fringes, so the shader erodes the
// alpha (the minimum of five taps) and rejects any magenta-, cyan- or yellow-cast edge pixel.
const SPRITE_VERT = /* glsl */`
attribute vec2 corner; attribute vec4 iPos; attribute vec2 iCell;
uniform vec3 uCenter; uniform float uHalf; uniform float uInner; uniform float uTime;
varying vec2 vUv; varying float vDepth;
void main(){
  vec3 d = mod(iPos.xyz + vec3(sin(uTime * 0.05 + iPos.w), cos(uTime * 0.04 + iPos.w), 0.0) * 6.0 - uCenter + uHalf, 2.0 * uHalf) - uHalf;
  float s = iPos.w;
  s *= smoothstep(uHalf, uHalf * 0.85, max(abs(d.x), max(abs(d.y), abs(d.z))));
  s *= smoothstep(uInner * 0.85, uInner, length(d));
  vec4 mv = modelViewMatrix * vec4(uCenter + d, 1.0);
  mv.xy += corner * s;
  vUv = (iCell + (corner * 0.5 + 0.5)) / 4.0;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
  if (s < 0.05) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;
const SPRITE_FRAG = /* glsl */`
uniform sampler2D uMap; uniform vec3 uHaze; uniform float uFogNear; uniform float uFogFar; uniform float uStyle;
varying vec2 vUv; varying float vDepth;
void main(){
  if (uStyle < 0.5) discard; // (false light only)
  vec2 cell = floor(vUv * 4.0), local = fract(vUv * 4.0);
  if (min(local.x, local.y) < 0.03 || max(local.x, local.y) > 0.97) discard; // never the neighbouring cell
  vec4 c = texture2D(uMap, vUv);
  float e = 1.5 / 2048.0;
  float a = min(c.a, min(min(texture2D(uMap, vUv + vec2(e, 0.0)).a, texture2D(uMap, vUv - vec2(e, 0.0)).a), min(texture2D(uMap, vUv + vec2(0.0, e)).a, texture2D(uMap, vUv - vec2(0.0, e)).a)));
  float key = max(min(c.r, c.b) - c.g, max(min(c.g, c.b) - c.r, min(c.r, c.g) - c.b)); // magenta, cyan or yellow cast
  if (a < 0.6 || key > 0.35) discard;
  vec3 col = c.rgb * 0.8;
  col = mix(col, uHaze, 0.35 + 0.5 * smoothstep(uFogNear, uFogFar * 1.8, vDepth));
  gl_FragColor = vec4(col, 1.0);
}`;
/** The far sprite layer (MP-V07). Returns { mesh, setCenter(v) }. */
export function createSprites(texture, { n = 1400, half = 700, inner = 330, size = [10, 22], seed = 5 } = {}) {
  const rnd = rng(seed);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
  g.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const pos = new Float32Array(n * 4), cell = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    pos.set([(rnd() * 2 - 1) * half, (rnd() * 2 - 1) * half, (rnd() * 2 - 1) * half, size[0] + rnd() * (size[1] - size[0])], i * 4);
    const k = Math.floor(rnd() * 16);
    cell.set([k % 4, 3 - Math.floor(k / 4)], i * 2);
  }
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 4));
  g.setAttribute('iCell', new THREE.InstancedBufferAttribute(cell, 2));
  g.instanceCount = n;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...goodsellShared, uMap: { value: texture }, uCenter: { value: new THREE.Vector3() }, uHalf: { value: half }, uInner: { value: inner } },
    vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  return { mesh, material, setCenter(v) { material.uniforms.uCenter.value.copy(v); }, setLevel(level) { g.instanceCount = level >= 1 ? n : n >> 1; } };
}
