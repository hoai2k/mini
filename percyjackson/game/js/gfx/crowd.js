// Crowd batching: every live monster of one kind drawn part by part as one
// instanced mesh (perf/RENDERING.md, "Crowd batching").
//
// A monster is a jointed rig of 5-30 meshes, and each mesh is a draw (two
// with the sun's shadow) that costs three.js 30-50 µs of CPU. Same-kind
// monsters share their geometry and materials (monsters.js KIT_GEO, the
// per-kind skins, charmat.js), so part k of every pup on screen can be one
// InstancedMesh: the instance matrices are those meshes' own world matrices,
// written each frame after the game has posed them. The rigs keep running as
// before (AI, animation, guards, flames); their batched meshes only move to a
// layer no camera draws.
//
// What is never batched, and draws as it always did:
//   - bosses (not in game.enemies), champions (rig.championLook), mortal
//     disguises and the training dummy (no rig.batchKey);
//   - a rig whose meshes don't match its kind's first one (an elite's shell,
//     a recoloured champion), part by part: a part that differs draws alone;
//   - transparent or additive parts, the live flames (flames.js), shells;
//   - a monster for the frames its material is swapped (the hit flash,
//     FLASH_MATERIAL): it leaves the batch and draws its own meshes, flashed;
//   - everything when CROWD.on is false (?batch=0, or the quality tier's
//     preset.batch: the individual meshes, exactly as before).
// Per-kind effects (glow, dissolve, the champion tint) are uniforms of the
// shared materials, so a batch shows them as the single meshes did.
//
// The instance matrices are an attribute, never a uniform block: three.js
// r186 puts a small InstancedMesh's matrices in a uniform buffer named after
// its node (NodeBuffer_<id>), so every batch would compile a program of its
// own (the flames' old trouble). A capacity above the device's uniform-buffer
// limit takes the attribute path, whose shader is the same for every batch of
// a material; only the live range is uploaded each frame (updateRanges).
// Frustum culling is per batch, on bounds grown over its instances.
import * as THREE from 'three/webgpu';

export const CROWD = { on: true, minGroup: 2 };
const HIDE = 1 << 29;   // a layer no camera draws: a batched mesh waits here
const _s = new THREE.Sphere(), _v = new THREE.Vector3();

// a geometry's content signature, for parts built per spawn with the same
// content (skin boxes: character.js skinBox) as the kind's first
const sigs = new WeakMap();
function geoSig(g) {
  let s = sigs.get(g); if (s) return s;
  let h = 2166136261 >>> 0, n = 0;
  const mix = (a) => { const u = new Uint32Array(a.buffer, a.byteOffset, a.byteLength >> 2); for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619) >>> 0; n += u.length; };
  for (const k of Object.keys(g.attributes).sort()) { const A = g.attributes[k]; if (A.isInterleavedBufferAttribute) return `x${g.id}`; mix(A.array); h = Math.imul(h ^ A.itemSize, 16777619) >>> 0; }
  if (g.index) mix(g.index.array);
  s = `${h.toString(36)}:${n}:${Object.keys(g.attributes).sort().join(',')}`; sigs.set(g, s);
  return s;
}
const meshList = (root) => { const out = []; root.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };
// a part that can join a batch: opaque, plain, at its base material
function slotOk(m) {
  const mat = m.material;
  return !m.isInstancedMesh && !m.isSkinnedMesh && !Array.isArray(mat) && mat === m.userData.baseMat && !mat.transparent && mat.blending === THREE.NormalBlending
    && !m.userData.flames && !m.userData.shell && !m.morphTargetInfluences && m.layers.mask === 1 && !m.renderOrder && m.frustumCulled && !m.geometry.isInstancedBufferGeometry;
}

export class Crowd {
  constructor(scene, renderer) {
    this.scene = scene;
    let lim = 65536; try { lim = renderer?.backend?.capabilities?.getUniformBufferLimit?.() ?? lim; } catch { /* default */ }
    this.cap = Math.max(64, Math.floor(lim / 64) + 1);   // (matrices past the uniform limit: the attribute path, one shader for all)
    this.kinds = new Map();      // batchKey -> { slots: [{ geo, sig, mat, cast, recv, im, n }] }
    this.info = new WeakMap();   // rig -> { kind, meshes: [mesh|null per slot], parents }
    this.hidden = new Set();     // rigs with meshes on the HIDE layer
    this.spare = new Set(); this.tally = new Map();
    this.stats = { batched: 0, rigs: 0, draws: 0 };
  }
  kindFor(rig) {
    let K = this.kinds.get(rig.batchKey);
    if (K) return K;
    const slots = meshList(rig.root).map((m) => (slotOk(m) ? { geo: m.geometry, sig: geoSig(m.geometry), mat: m.material, cast: m.castShadow, recv: m.receiveShadow, im: null, n: 0, name: m.name } : null));
    K = { key: rig.batchKey, slots, count: slots.length };
    this.kinds.set(rig.batchKey, K);
    return K;
  }
  // which of a rig's meshes draw in its kind's batches (null: none)
  infoFor(rig) {
    let I = this.info.get(rig);
    if (I) return I;
    const K = this.kindFor(rig), list = meshList(rig.root);
    I = { kind: null, meshes: null, parents: null };
    if (list.length === K.count) {
      I.kind = K; I.meshes = list.map((m, i) => { const S = K.slots[i]; return S && slotOk(m) && m.material === S.mat && (m.geometry === S.geo || geoSig(m.geometry) === S.sig) ? m : null; });
      I.parents = list.map((m) => m.parent);
      if (!I.meshes.some(Boolean)) I.kind = null;
    }
    this.info.set(rig, I);
    return I;
  }
  batch(S) {
    if (S.im) return S.im;
    const im = new THREE.InstancedMesh(S.geo, S.mat, this.cap);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.count = 0; im.castShadow = S.cast; im.receiveShadow = S.recv;
    im.matrixAutoUpdate = false; im.matrixWorldAutoUpdate = false; im.name = `crowd:${S.name || 'part'}`;
    im.userData.crowd = true; im.userData.noLint = true;
    im.boundingSphere = new THREE.Sphere();
    S.geo.boundingSphere ?? S.geo.computeBoundingSphere();
    this.scene.add(im);
    return (S.im = im);
  }
  // Each frame, after the game has posed everything, before the render.
  update(enemies) {
    for (const K of this.kinds.values()) for (const S of K.slots) if (S) { S.n = 0; (S.box ??= new THREE.Box3()).makeEmpty(); }
    const now = this.spare; now.clear();
    let rigs = 0, parts = 0;
    if (CROWD.on) {
      // how many of each kind are in view of a batch at all (a lone monster draws as it is)
      const tally = this.tally; tally.clear();
      for (const e of enemies) { const r = e.rig; if (r?.batchKey && !r.championLook && !e.disguised) tally.set(r.batchKey, (tally.get(r.batchKey) ?? 0) + 1); }
      for (const e of enemies) {
        const rig = e.rig;
        if (!rig?.batchKey || rig.championLook || e.disguised || (tally.get(rig.batchKey) ?? 0) < CROWD.minGroup) continue;
        const root = rig.root;
        let shown = !!root.parent; for (let o = root; o && shown; o = o.parent) if (!o.visible) shown = false;
        if (!shown || root.parent !== this.scene) continue;
        const I = this.infoFor(rig);
        if (!I.kind) continue;
        // a swapped material (the hit flash) or a part moved elsewhere: draw on its own this frame
        let ok = true;
        for (let i = 0; i < I.meshes.length && ok; i++) { const m = I.meshes[i]; if (m && (m.material !== I.kind.slots[i].mat || m.parent !== I.parents[i])) ok = false; }
        if (!ok) continue;
        root.updateWorldMatrix(true, true);
        for (let i = 0; i < I.meshes.length; i++) {
          const m = I.meshes[i]; if (!m) continue;
          let vis = true; for (let o = m; o && o !== root; o = o.parent) if (!o.visible) { vis = false; break; }
          if (vis) {
            const S = I.kind.slots[i], im = this.batch(S);
            if (S.n >= this.cap) continue;
            m.matrixWorld.toArray(im.instanceMatrix.array, S.n * 16); S.n++;
            // bounds: the part's sphere, placed
            _s.copy(S.geo.boundingSphere).applyMatrix4(m.matrixWorld);
            S.box.expandByPoint(_v.copy(_s.center).subScalar(_s.radius)); S.box.expandByPoint(_v.copy(_s.center).addScalar(_s.radius));
            parts++;
          }
          m.layers.mask = HIDE;
        }
        now.add(rig); rigs++;
      }
    }
    // rigs that left their batches (died and removed, flashed, out of view, too few of a kind) draw their own meshes again
    for (const rig of this.hidden) if (!now.has(rig)) this.show(rig);
    this.spare = this.hidden; this.hidden = now;
    let draws = 0;
    for (const K of this.kinds.values()) for (const S of K.slots) {
      if (!S?.im) continue;
      const im = S.im; im.count = S.n; im.visible = S.n > 0;
      if (!S.n) continue;
      draws++;
      const A = im.instanceMatrix; A.clearUpdateRanges(); A.addUpdateRange(0, S.n * 16); A.needsUpdate = true;
      S.box.getBoundingSphere(im.boundingSphere);
    }
    this.stats = { batched: rigs, parts, draws };
  }
  show(rig) {
    const I = this.info.get(rig);
    for (const m of I?.meshes ?? []) if (m && m.layers.mask === HIDE) m.layers.mask = 1;
  }
  // The batches a model's kind will use, made now (warm-up: their programs
  // and shadows compiled with the level, not when the first pair spawns).
  // Returns stand-ins (one instance at the model's parts, a shared buffer)
  // for the warm-up group, one per distinct material and vertex layout.
  warmFor(rigs) {
    const out = [], seen = new Set();
    this.warmAttr ??= new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 16), 16).setUsage(THREE.DynamicDrawUsage);
    for (const rig of rigs) {
      if (!rig?.batchKey || rig.championLook) continue;
      const K = this.kindFor(rig), list = meshList(rig.root);
      if (list.length !== K.count) continue;
      list.forEach((m, i) => {
        const S = K.slots[i]; if (!S) return;
        this.batch(S);   // (the kind's real batch, empty until a crowd of it shows)
        const key = `${S.mat.type}|${S.mat.name}|${!!S.mat.voxParams}|${S.mat.alphaTest > 0}|${!!S.geo.index}|${Object.keys(S.geo.attributes).sort().join(',')}|${S.cast}|${S.recv}`;
        if (seen.has(key)) return; seen.add(key);
        const w = new THREE.InstancedMesh(S.geo, S.mat, 1);
        w.instanceMatrix = this.warmAttr; w.count = 1; w.castShadow = S.cast; w.receiveShadow = S.recv;
        w.userData.crowd = true; w.userData.noLint = true; w.frustumCulled = false;
        m.parent.add(w); out.push(w);
      });
    }
    new THREE.Matrix4().toArray(this.warmAttr.array, 0);
    return out;
  }
  // a level ends: the batches go (their kinds' geometry and materials stay shared)
  clear() {
    for (const rig of this.hidden) this.show(rig);
    this.hidden = new Set();
    const out = [];
    for (const K of this.kinds.values()) for (const S of K.slots) if (S?.im) { this.scene.remove(S.im); out.push(S.im); S.im = null; }
    this.kinds.clear(); this.info = new WeakMap();
    return out;
  }
}
