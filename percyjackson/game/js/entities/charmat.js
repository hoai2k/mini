// One material per character part, so each bone draws once (perf/RENDERING.md).
//
// A monster's bone used to carry two or more meshes: its skin box (a
// textured material, parts.js skinMat / character.js makeCharMaterial) and
// the voxel detail the kit merged onto it (a vertex-coloured material per
// look and finish, monsters.js voxMat). Every mesh is a draw, two with the
// sun's shadow, and three.js spends 30-50 µs of CPU on each whatever its size.
//
// mergeRig() draws all of them on a bone as one mesh with one material, the
// "part material" below: it is the skin material and the detail material in
// one shader. Each vertex says which it is (attribute cm: the detail's
// roughness, metalness, emit and fill, or a roughness of -1 for the skin), and
// the shader takes each half's own colour, roughness, metalness and emissive
// formulas exactly as the two materials wrote them (select, not a blend, and a
// flat varying, so a value never changes by interpolation). The hit flash,
// elite and champion glow and the dissolve are the same uniforms the two
// materials shared (the look's userData), so they still cover both.
//
// Only what nothing moves on its own is merged: plain leaf meshes directly on
// one group, at rest (identity transform), opaque, not listed anywhere on the
// rig (rig.extras and the like are what code turns, scales or hides), and not
// the live flames. The merged mesh keeps its sources (userData.parts) for the
// floor and grip guards (parts.js keepAbove, character.js extremePoints), so
// they find the very same points as before. Geometry is shared per content,
// so every spawn of a kind draws the same buffers (and can be batched: crowd.js).
import * as THREE from 'three/webgpu';
import { attribute, varying, texture, uv, vec3, vec4, mix, step, select, screenCoordinate, interleavedGradientNoise, materialRoughness, materialMetalness, vertexColor } from 'three/tsl';

// A switch for checks and comparisons (perf/render-bench.cjs): false builds
// every model with its separate meshes, as before.
export const PART_MERGE = { on: true, defer: 0 };

// a white texel for a part with no skin box (only detail): the part material's
// shader stays the same either way, so every kind shares one program
let white = null;
function whiteTex() {
  if (white) return white;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 1, 1);
    white = new THREE.CanvasTexture(c);
  } else { white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true; }
  white.magFilter = THREE.NearestFilter; white.minFilter = THREE.NearestFilter; white.colorSpace = THREE.SRGBColorSpace; white.generateMipmaps = false;
  return white;
}

// The part material for a skin material (or none) and the look's uniforms u
// (flash, glow, dissolve, emitMask, fill). Cached: one per skin, so a crowd
// of one kind shares it.
const partMats = new Map();
export function partMaterial(skin, u) {
  const key = skin ?? u;
  if (partMats.has(key)) return partMats.get(key);
  const m = new THREE.MeshStandardNodeMaterial({ roughness: skin?.roughness ?? 1, metalness: skin?.metalness ?? 0 });
  // (the skin's texture is sampled here, not set as m.map: three's shadow pass
  // multiplies a material's map alpha in, and the detail's vertices would
  // take it from whatever texel their uv points at)
  const map = skin?.map ?? whiteTex();
  m.alphaTest = skin ? skin.alphaTest : 0.5;   // (detail is opaque: alpha 1 always passes)
  m.name = 'part';
  const cm = varying(attribute('cm', 'vec4')).setInterpolation(THREE.InterpolationSamplingType.FLAT);
  const isKit = cm.x.greaterThanEqual(0);
  // the detail (monsters.js voxMat): any colour with a channel at full strength glows
  const vc = vertexColor();
  const hot = step(0.985, vc.r.max(vc.g).max(vc.b));
  const kitColor = vec4(vec3(1, 1, 1).mul(hot.oneMinus())).mul(vc);
  const kitEmit = mix(vc.mul(hot).mul(cm.z).add(vc.mul(cm.w)).add(u.glow), vec3(2.2, 2.2, 2.2), u.flash).xyz;
  // the skin (character.js makeCharMaterial): bright pixels glow by emitMask
  const tex = texture(map, uv());
  const bright = step(0.92, tex.r.max(tex.g).max(tex.b));
  const skinEmit = mix(tex.rgb.mul(bright).mul(u.emitMask).add(u.glow).add(tex.rgb.mul(u.fill)), vec3(1, 1, 1).mul(2.2), u.flash);
  m.colorNode = select(isKit, kitColor, tex);   // (the skin: its colour, white, times the texel, as materialColor)
  m.emissiveNode = select(isKit, kitEmit, skinEmit);
  m.roughnessNode = select(isKit, cm.x, materialRoughness);
  m.metalnessNode = select(isKit, cm.y, materialMetalness);
  m.maskNode = interleavedGradientNoise(screenCoordinate.xy).greaterThan(u.dissolve);
  m.userData = u;
  partMats.set(key, m);
  return m;
}

// ---- merging --------------------------------------------------------------------
const isSkin = (mat) => !!(mat.map && mat.userData?.flash && mat.userData.emitMask && mat.userData.fill && !mat.voxParams);
const isKit = (mat) => !!(mat.voxParams && mat.userData?.flash && mat.userData.emitMask && mat.userData.fill);
const _id = new THREE.Matrix4();
// Objects code reaches through the rig (rig.extras, rig.wings, ...): code may
// move, scale or hide them, so they are never merged. (rig.body and
// rig.headMesh are only used while building; they follow the merge.)
const BUILD_ONLY = new Set(['root', 'meshes', 'material', 'spec', 'body', 'headMesh', 'dims', 'pose', 'championLook']);
function referenced(rig) {
  const out = new Set(), seen = new Set();
  const walk = (v, d) => {
    if (!v || typeof v !== 'object' || seen.has(v) || d > 5) return;
    seen.add(v);
    if (v.isObject3D) { out.add(v); return; }
    if (v.isMaterial || v.isBufferGeometry || v.isTexture || ArrayBuffer.isView(v)) return;
    if (Array.isArray(v)) { for (const x of v) walk(x, d + 1); return; }
    if (v instanceof Map) { for (const x of v.values()) walk(x, d + 1); return; }
    if (Object.getPrototypeOf(v) !== Object.prototype && d > 0 && !v.isFlames) return;
    for (const k of Object.keys(v)) if (!(d === 0 && BUILD_ONLY.has(k))) walk(v[k], d + 1);
  };
  walk(rig, 0);
  return out;
}
function mergeable(m, refs) {
  if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || m.children.length || !m.visible || refs.has(m)) return false;
  const mat = m.material, g = m.geometry, A = g?.attributes;
  if (!mat || Array.isArray(mat) || mat !== (m.userData.baseMat ?? mat) || m.morphTargetInfluences || g.morphAttributes?.position) return false;
  if (m.userData.noMerge || m.userData.shell || m.userData.flames || m.userData.noLint) return false;
  if (mat.transparent || mat.blending !== THREE.NormalBlending || mat.side !== THREE.FrontSide || !mat.depthWrite || !mat.depthTest || mat.wireframe) return false;
  if (!A?.position || !A.normal || A.position.itemSize !== 3 || A.normal.itemSize !== 3 || A.position.isInterleavedBufferAttribute) return false;
  if (m.renderOrder || !m.frustumCulled || m.layers.mask !== 1) return false;
  m.updateMatrix(); if (!m.matrix.equals(_id)) return false;   // (at rest: positions taken as they are, bit for bit)
  if (isSkin(mat)) return !!A.uv && A.uv.itemSize === 2;
  if (isKit(mat)) return !!A.color && A.color.itemSize >= 3;
  return false;
}
// the geometry of a family, one non-indexed buffer: position, normal, uv,
// color and cm (the detail's finish, or -1 for the skin)
function mergedGeometry(list) {
  let n = 0; for (const m of list) n += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), T = new Float32Array(n * 2), C = new Float32Array(n * 3), CM = new Float32Array(n * 4);
  let o = 0;
  for (const m of list) {
    const g = m.geometry, A = g.attributes, I = g.index, cnt = I ? I.count : A.position.count;
    const vp = m.material.voxParams, kit = !!vp;
    for (let i = 0; i < cnt; i++, o++) {
      const v = I ? I.getX(i) : i;
      P[o * 3] = A.position.getX(v); P[o * 3 + 1] = A.position.getY(v); P[o * 3 + 2] = A.position.getZ(v);
      N[o * 3] = A.normal.getX(v); N[o * 3 + 1] = A.normal.getY(v); N[o * 3 + 2] = A.normal.getZ(v);
      if (kit) {
        C[o * 3] = A.color.getX(v); C[o * 3 + 1] = A.color.getY(v); C[o * 3 + 2] = A.color.getZ(v);
        CM[o * 4] = vp.rough; CM[o * 4 + 1] = vp.metal; CM[o * 4 + 2] = vp.emit; CM[o * 4 + 3] = vp.fill;
      } else {
        T[o * 2] = A.uv.getX(v); T[o * 2 + 1] = A.uv.getY(v);
        C[o * 3] = C[o * 3 + 1] = C[o * 3 + 2] = 1;
        CM[o * 4] = -1;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(T, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('cm', new THREE.BufferAttribute(CM, 4));
  return geo;
}
// Geometry shared by content: the hundredth pup's merged parts are the
// first pup's buffers (spawning costs no GPU upload, and crowd.js can batch them).
const GEO = new Map();
function hashArrays(arrs) {
  let h = 2166136261 >>> 0, h2 = 0x9e3779b9;
  for (const a of arrs) {
    const u = new Uint32Array(a.buffer, a.byteOffset, a.length);
    for (let i = 0; i < u.length; i++) { h = Math.imul(h ^ u[i], 16777619) >>> 0; h2 = (Math.imul(h2 ^ u[i], 2246822519) + i) >>> 0; }
    h = Math.imul(h ^ a.length, 16777619) >>> 0;
  }
  return `${h.toString(36)}.${h2.toString(36)}`;
}
function shared(geo) {
  const A = geo.attributes, key = hashArrays([A.position.array, A.normal.array, A.uv.array, A.color.array, A.cm.array]);
  const hit = GEO.get(key);
  if (hit) { geo.dispose(); return hit; }
  GEO.set(key, geo);
  return geo;
}

// Merge each bone's meshes into one, where a bone has two or more that can be.
// Returns the number of meshes saved.
export function mergeRig(rig) {
  if (!PART_MERGE.on || PART_MERGE.defer || !rig?.root || rig.partsMerged) return 0;
  rig.partsMerged = true;
  // (the new meshes' uuids are drawn from a generator of our own, so merging
  // leaves Math.random where the build left it: seeded builds and their
  // animation go on exactly as before)
  const R = Math.random; Math.random = ownRandom;
  try { return mergeParts(rig); } finally { Math.random = R; }
}
let seed = 0x2545f491;
function ownRandom() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function mergeParts(rig) {
  const refs = referenced(rig);
  const groups = new Set();
  rig.root.traverse((o) => { if (o.isMesh && o.parent) groups.add(o.parent); });
  let saved = 0;
  for (const grp of groups) {
    const fams = new Map();
    for (const m of grp.children) {
      if (!mergeable(m, refs)) continue;
      const u = m.material.userData, k = `${m.castShadow}|${m.receiveShadow}`;
      let byU = fams.get(u); if (!byU) fams.set(u, byU = new Map());
      let f = byU.get(k); if (!f) byU.set(k, f = { skin: null, list: [] });
      if (isSkin(m.material)) { if (f.skin && f.skin !== m.material) continue; f.skin = m.material; }
      f.list.push(m);
    }
    for (const [u, byU] of fams) for (const f of byU.values()) {
      if (f.list.length < 2) continue;
      const mat = partMaterial(f.skin, u), geo = shared(mergedGeometry(f.list));
      // the first mesh of the family becomes the part (it keeps its place,
      // its id and so its place in the draw order, where a new mesh would
      // draw after everything level with it)
      const mesh = f.list[0];
      mesh.userData.parts = f.list.map((m) => ({ geometry: m.geometry, matrix: m.matrix.clone() }));
      let listed = rig.meshes.includes(mesh);
      for (const m of f.list.slice(1)) {
        grp.remove(m);
        const i = rig.meshes.indexOf(m); if (i >= 0) { rig.meshes.splice(i, 1); listed = true; }
        if (rig.headMesh === m) rig.headMesh = mesh;
        if (rig.body === m) rig.body = mesh;
      }
      mesh.geometry = geo; mesh.material = mat; mesh.userData.baseMat = mat; mesh.name = 'part';
      if (listed && !rig.meshes.includes(mesh)) rig.meshes.push(mesh);
      saved += f.list.length - 1;
    }
  }
  return saved;
}
// The sources of a mesh (a merged part's, or itself): { geometry, matrix } in the mesh's own space.
export function meshParts(m) { return m.userData.parts ?? null; }
