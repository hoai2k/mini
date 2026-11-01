// mite-sem: a scanning-electron-microscope look for any three.js scene.
// From the Micro mite prototype (micro/prototypes/mite/). Self-contained.
//
// HOW TO PLUG IT IN
//   import { createSem, gMaterial, shared, CLS, MODES } from '../shared/techniques/mite-sem.js';
//   const sem = createSem(renderer, backdropTexture);   // backdrop: any texture (or null)
//   sem.resize(drawingBufferWidth, drawingBufferHeight); // on resize, in device pixels
//   mesh.material = gMaterial({ cls: CLS.GRAIN, tex, map: 'tri', scale: 160, bump: 2.5 });
//   each frame: sem.render(scene, camera, dt, yaw, pitch)  // renders to the screen
//   while loading (optional): sem.warm(scene, camera)  // shaders built before the first frame
//   or in two steps: sem.renderGBuffer(scene, camera); (adjust sem.target here);
//     sem.composite(camera, dt, yaw, pitch, { tan })
//     tan: [x, y] half-field tangents, for an orthographic or virtual camera
//     (default: from camera.fov and camera.aspect). A pass that writes the
//     G-buffer itself (see adapters.js) calls only composite().
//
// INPUTS
// - Every visible mesh must use a gMaterial (a G-buffer writer); other
//   materials would write colours that the composite misreads. Works with
//   Mesh, InstancedMesh (non-uniform instance scale handled) and BatchedMesh.
// - A PerspectiveCamera (fov and aspect are read to rebuild view positions).
// - Units: the AO radius, shadow march and edge thresholds are in scene units
//   and tuned for µm at fields of 0.3-4 mm. shared.uDepthScale (µm per scene
//   unit, default 1) lets a scene in other units write µm depths.
// - Buffers: one float RGBA target it owns: view-space normal x, y; material
//   class (+0.5 = thin feature); linear view depth (0 = background). The
//   material class drives BSE brightness and false colour (see CLS).
// - shared.uCutP / uCutR: a cutaway cylinder (view space) that discards
//   materials made with { cut: true } between the camera and a target;
//   shared.uCutOn.value = 0 turns it off. shared.uBumpOn likewise for relief.
// - Per-object cutaway (optional, preferred): give geometry a float vertex
//   attribute `cutId` (1..n, one per object: a leaf, a stem, a flake) and
//   drive createObjectCut(n): each frame it tests every registered object's
//   centre line against the camera-to-target line and dissolves (dithered,
//   eased over ~0.2 s) only the objects actually in front of the target, whole.
//   Vertices with cutId 0 fall back to the cylinder. Objects are never sliced.
// - Switches (sem.toggles, each 0/1 uniform): secant, edge, shadow, ao,
//   noise, lines, bump; sem.setMode(0 SE | 1 BSE | 2 false colour); sem.setRaster(on).
//
// WHAT IT DOES
// 1. G-buffer: every surface writes its view-space normal (x, y), a material
//    class and its linear depth to one float target. Surface relief from
//    textures (luminance read as height) is applied as bump mapping, so the
//    composite sees it as topography.
// 2. Composite: a full-screen shader turns that into a micrograph.
//    - Secondary-electron yield follows the secant law: delta ~ 1/cos(theta),
//      theta the angle between the surface normal and the beam. The beam comes
//      from the camera, so the "lighting" is tied to the view, not the world.
//    - Edge effect: on silhouettes and thin features the beam's interaction
//      volume reaches a second free surface and more electrons escape, so
//      edges and setae glow.
//    - Everhart-Thornley detector off to the upper left of the frame:
//      surfaces facing it are brighter, and electrons from faces turned away
//      and from recesses with something between them and the detector are
//      partly lost (soft "shadows"; the collector's positive bias pulls many
//      round corners, so they are never black).
//    - Crevices are dark: electrons emitted inside them are reabsorbed by the
//      walls (screen-space ambient occlusion).
//    - Depth of field is effectively infinite (no blur anywhere).
//    - Shot noise that grows as the signal falls, and per-line scan jitter.
//   Other modes: low-vacuum backscatter (BSE: composition contrast, flatter
//   topography, noisier) and false colour (the SE image hand-tinted by
//   material, the way published "coloured SEMs" are made).
import * as THREE from '../vendor/three.module.min.js';

export const CLS = { BG: 0, CUTICLE: 1, LEAF: 2, STEM: 3, GRAIN: 4, LITTER: 5, HYPHA: 6, SPORE: 7, NPC: 8 };
export const MODES = ['SE · Everhart-Thornley', 'BSE · low vacuum', 'SE · false colour'];

// Shared by every G-buffer material: the cutaway that keeps terrain between
// the camera and the mite out of the way.
export const shared = {
  uCutP: { value: new THREE.Vector3() },
  uCutR: { value: 420 },
  uBumpOn: { value: 1 },
  uCutOn: { value: 1 },
  uDepthScale: { value: 1 },
  // per-object cutaway: fade per cutId (R channel, 0 kept .. 255 gone), its width, on/off
  uCutFade: { value: null },
  uCutN: { value: 1 },
  uCutObj: { value: 0 },
};

/**
 * Per-object cutaway. register(points | () => points, group?) returns a cutId
 * for the object's vertices (a polyline along its centre: a stem's axis, a
 * leaf's midrib). update(dt, cameraPos, target, { radius, margin, keep })
 * fades out, as whole objects, those whose centre line passes within `radius`
 * of the camera-to-target line at least `margin` in front of the target; a
 * faded group leader (see leader(id)) fades its whole group (a stem takes its
 * leaves). keep: ids never faded (what the specimen stands on), nor their
 * group's leader. Sets shared.uCutObj on.
 */
export function createObjectCut(max = 2048) {
  const data = new Uint8Array(max * 4);
  const tex = new THREE.DataTexture(data, max, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.needsUpdate = true;
  shared.uCutFade.value = tex; shared.uCutN.value = max; shared.uCutObj.value = 1;
  const objs = [null];
  const fade = new Float32Array(max), want = new Float32Array(max);
  const d = new THREE.Vector3(), u = new THREE.Vector3(), w0 = new THREE.Vector3();
  // shortest distance between segment a-b and the ray segment c + d*t, t in [0, tMax]; returns [dist, t]
  function segRay(a, b, c, tMax) {
    u.subVectors(b, a); w0.subVectors(a, c);
    const A = u.dot(u), B = u.dot(d), C = 1, D = u.dot(w0), E = d.dot(w0);
    const den = A * C - B * B;
    let s = den > 1e-9 ? (B * E - C * D) / den : 0;
    s = Math.max(0, Math.min(1, s));
    let t = (B * s + E) / C;
    if (t < 0 || t > tMax) { t = Math.max(0, Math.min(tMax, t)); s = A > 1e-9 ? Math.max(0, Math.min(1, (t * B - D) / A)) : 0; }
    const px = a.x + u.x * s - c.x - d.x * t, py = a.y + u.y * s - c.y - d.y * t, pz = a.z + u.z * s - c.z - d.z * t;
    return Math.sqrt(px * px + py * py + pz * pz);
  }
  return {
    tex, fade,
    // every field declared up front (c and r are filled in lazily, leader by
    // leader()), so the per-frame scan over ~2000 objects sees one shape;
    // several shapes made its reads megamorphic and boxed every number read
    register(points, group = 0) { objs.push({ points, group, leader: false, c: null, r: 0 }); return objs.length - 1; },
    update(dt, cam, target, { radius = 360, margin = 250, keep = null } = {}) {
      d.subVectors(target, cam);
      const len = d.length(); d.divideScalar(len);
      const tMax = len - margin;
      want.fill(0);
      const groups = new Set(), keepG = new Set();
      if (keep) for (const i of keep) if (objs[i] && objs[i].group) keepG.add(objs[i].group);
      for (let i = 1; i < objs.length; i++) {
        if (keep && keep.has(i)) continue;
        const o = objs[i];
        if (o.leader && keepG.has(o.group)) continue; // the stem of the leaf underfoot stays
        // a bounding sphere first (bendable objects, given as a function, get room to bend)
        if (!o.r) {
          const p0 = typeof o.points === 'function' ? o.points() : o.points;
          o.c = new THREE.Vector3();
          for (const p of p0) o.c.add(p);
          o.c.divideScalar(p0.length);
          let r = 0;
          for (const p of p0) r = Math.max(r, p.distanceTo(o.c));
          o.r = r * (typeof o.points === 'function' ? 2.2 : 1) + 1;
        }
        w0.subVectors(o.c, cam);
        const tc = Math.max(0, Math.min(tMax, w0.dot(d)));
        const ex = w0.x - d.x * tc, ey = w0.y - d.y * tc, ez = w0.z - d.z * tc;
        const lim = radius + o.r;
        if (ex * ex + ey * ey + ez * ez > lim * lim) continue;
        const pts = typeof o.points === 'function' ? o.points() : o.points;
        for (let k = 1; k < pts.length; k++) {
          if (segRay(pts[k - 1], pts[k], cam, tMax) < radius) { want[i] = 1; if (o.group) groups.add(o.group); break; }
        }
      }
      // a group fades whole only when its stem (the object flagged group leader) is in the way
      for (let i = 1; i < objs.length; i++) if (objs[i].leader && groups.has(objs[i].group) && want[i] > 0) {
        for (let j = 1; j < objs.length; j++) if (objs[j].group === objs[i].group && !(keep && keep.has(j))) want[j] = 1;
      }
      const k = dt > 0 ? 1 - Math.exp(-dt / 0.18) : 1;
      let changed = false;
      for (let i = 1; i < objs.length; i++) {
        const f = fade[i] + (want[i] - fade[i]) * k;
        fade[i] = Math.abs(f - want[i]) < 0.01 ? want[i] : f;
        const b = Math.round(fade[i] * 255);
        if (data[i * 4] !== b) { data[i * 4] = b; changed = true; }
      }
      if (changed) tex.needsUpdate = true;
    },
    /** Mark an object as its group's leader (a stem): when it is cut, the whole group goes. */
    leader(id) { objs[id].leader = true; },
    get count() { return objs.length - 1; },
  };
}

const gVert = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vTri; varying vec3 vTriN; varying vec2 vUv;
  attribute float cutId; varying float vCutId;
  uniform float uObjSpace;
  #include <batching_pars_vertex>
  void main() {
    vCutId = cutId;
    vec3 p = position; vec3 n = normal;
    #ifdef USE_BATCHING
      // a BatchedMesh (one draw for many objects, culled one by one); an
      // identity matrix leaves p and n exactly as they are
      mat4 bmat = getBatchingMatrix(getIndirectIndex(gl_DrawID));
      mat3 bm3 = mat3(bmat);
      vec3 b2 = vec3(dot(bm3[0], bm3[0]), dot(bm3[1], bm3[1]), dot(bm3[2], bm3[2]));
      n = bm3 * (n / max(b2, vec3(1e-8)));
      p = (bmat * vec4(p, 1.0)).xyz;
    #endif
    #ifdef USE_INSTANCING
      mat3 im = mat3(instanceMatrix);
      vec3 s2 = vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
      n = im * (n / max(s2, vec3(1e-8)));
      p = (instanceMatrix * vec4(p, 1.0)).xyz;
    #endif
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vTri = mix(wp.xyz, p, uObjSpace);
    vTriN = mix(mat3(modelMatrix) * n, n, uObjSpace);
    vN = normalize(normalMatrix * n);
    vec4 mv = viewMatrix * wp;
    vView = mv.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * mv;
  }`;

// The same G-buffer vertex stage for a draw that merges parts posed in
// different frames (gMaterial({ frames: true })), so several meshes that
// share a material become one draw. Instances (InstancedMesh) or vertices
// (Mesh; gl_VertexID, the index value) whose id lies in [uRange1.x, uRange1.y)
// are placed with uFrame1 / uNormal1 instead of modelMatrix / normalMatrix,
// those in uRange2 with uFrame2 / uNormal2; ids in uRangeB take positionB,
// normalB and uvB instead of position, normal and uv (a second geometry of the
// same topology). The arithmetic is gVert's, on the matrices three.js would
// have uploaded for the separate meshes, so the image is bit-identical. The
// caller sets the frame uniforms per draw (see frameUniforms in mite.js).
const gVertFrames = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vTri; varying vec3 vTriN; varying vec2 vUv;
  attribute float cutId; varying float vCutId;
  attribute vec3 positionB; attribute vec3 normalB; attribute vec2 uvB;
  uniform float uObjSpace;
  uniform mat4 uFrame1, uFrame2; uniform mat3 uNormal1, uNormal2;
  uniform vec2 uRange1, uRange2, uRangeB;
  void main() {
    vCutId = cutId;
    #ifdef USE_INSTANCING
      float id = float(gl_InstanceID);
    #else
      float id = float(gl_VertexID);
    #endif
    bool alt = id >= uRangeB.x && id < uRangeB.y;
    vec3 p = alt ? positionB : position; vec3 n = alt ? normalB : normal;
    mat4 M = modelMatrix; mat3 NM = normalMatrix;
    if (id >= uRange1.x && id < uRange1.y) { M = uFrame1; NM = uNormal1; }
    else if (id >= uRange2.x && id < uRange2.y) { M = uFrame2; NM = uNormal2; }
    #ifdef USE_INSTANCING
      mat3 im = mat3(instanceMatrix);
      vec3 s2 = vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
      n = im * (n / max(s2, vec3(1e-8)));
      p = (instanceMatrix * vec4(p, 1.0)).xyz;
    #endif
    vec4 wp = M * vec4(p, 1.0);
    vTri = mix(wp.xyz, p, uObjSpace);
    vTriN = mix(mat3(M) * n, n, uObjSpace);
    vN = normalize(NM * n);
    vec4 mv = viewMatrix * wp;
    vView = mv.xyz;
    vUv = alt ? uvB : uv;
    gl_Position = projectionMatrix * mv;
  }`;

const gFrag = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vTri; varying vec3 vTriN; varying vec2 vUv;
  uniform float uCls, uThin, uBump, uScale, uMode, uCut;
  uniform sampler2D uTex;
  uniform vec3 uCutP; uniform float uCutR; uniform float uBumpOn, uCutOn, uDepthScale;
  varying float vCutId; uniform sampler2D uCutFade; uniform float uCutN, uCutObj;
  float heightAt() {
    if (uMode < 0.5) return 0.0;
    if (uMode < 1.5) return texture2D(uTex, vUv * uScale).r;
    vec3 w = pow(abs(normalize(vTriN)), vec3(4.0)); w /= (w.x + w.y + w.z);
    vec3 q = vTri / uScale;
    return texture2D(uTex, q.yz).r * w.x + texture2D(uTex, q.xz).r * w.y + texture2D(uTex, q.xy).r * w.z;
  }
  void main() {
    if (uCut * uCutOn > 0.5 && uCutObj > 0.5 && vCutId > 0.5) {
      // per object: dissolve the whole object (dithered while it fades)
      float f = texture2D(uCutFade, vec2((floor(vCutId + 0.5) + 0.5) / uCutN, 0.5)).r;
      float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      if (f > 0.003 && ign < f) discard;
    } else if (uCut * uCutOn > 0.5) {
      vec3 dir = normalize(uCutP);
      float along = dot(vView, dir);
      float off = length(vView - dir * along);
      if (along < dot(uCutP, dir) - 230.0 && off < uCutR) discard;
    }
    vec3 V = normalize(-vView);
    vec3 n = dot(vN, vN) > 1e-6 ? normalize(vN) : V;
    if (dot(n, V) < 0.0) n = -n;
    if (uBump * uBumpOn > 0.0) {
      float h = heightAt() * uBump;
      vec3 dpx = dFdx(vView), dpy = dFdy(vView);
      float dhx = dFdx(h), dhy = dFdy(h);
      vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
      float det = dot(dpx, r1);
      vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
      n = normalize(abs(det) * n - grad);
    }
    // keep normals facing the beam so z can be rebuilt from x and y
    if (dot(n, V) < 0.02) n = normalize(n + V * (0.02 - dot(n, V)));
    gl_FragColor = vec4(n.x, n.y, uCls + uThin * 0.5, -vView.z * uDepthScale);
  }`;

/**
 * A G-buffer material.
 * @param {{cls:number, thin?:number, tex?:THREE.Texture, map?:'uv'|'tri'|'none',
 *   scale?:number, bump?:number, objSpace?:boolean, cut?:boolean, side?:number, frames?:boolean}} o
 *   scale: UV repeat ('uv') or µm per tile ('tri'); bump: relief depth in µm.
 *   frames: parts posed in other frames and a second geometry, chosen by
 *   instance or vertex id (see gVertFrames); its uniforms start inactive.
 */
export function gMaterial(o) {
  const mode = o.map === 'uv' ? 1 : o.map === 'tri' ? 2 : 0;
  const m = new THREE.ShaderMaterial({
    vertexShader: o.frames ? gVertFrames : gVert,
    fragmentShader: gFrag,
    side: o.side ?? THREE.FrontSide,
    uniforms: {
      uCls: { value: o.cls }, uThin: { value: o.thin || 0 },
      uTex: { value: o.tex || null }, uMode: { value: o.tex ? mode : 0 },
      uScale: { value: o.scale || 1 }, uBump: { value: o.tex ? (o.bump ?? 2) : 0 },
      uObjSpace: { value: o.objSpace ? 1 : 0 }, uCut: { value: o.cut ? 1 : 0 },
      uCutP: shared.uCutP, uCutR: shared.uCutR, uBumpOn: shared.uBumpOn, uCutOn: shared.uCutOn, uDepthScale: shared.uDepthScale,
      uCutFade: shared.uCutFade, uCutN: shared.uCutN, uCutObj: shared.uCutObj,
      ...(o.frames ? {
        uFrame1: { value: new THREE.Matrix4() }, uFrame2: { value: new THREE.Matrix4() },
        uNormal1: { value: new THREE.Matrix3() }, uNormal2: { value: new THREE.Matrix3() },
        uRange1: { value: new THREE.Vector2(-1, -1) }, uRange2: { value: new THREE.Vector2(-1, -1) }, uRangeB: { value: new THREE.Vector2(-1, -1) },
      } : {}),
    },
  });
  m.defaultAttributeValues.cutId = [0]; // geometry without cutIds: the cylinder
  return m;
}

const compVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const compFrag = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tG; uniform sampler2D tBack;
  uniform vec2 uRes; uniform vec2 uTan; uniform float uFrame, uMode, uPrevMode, uScanY, uRaster;
  uniform vec3 uDet; uniform vec2 uBackOff;
  uniform float uSecOn, uEdgeOn, uShadowOn, uAOOn, uNoiseOn, uLineOn;
  const int NS = 8;

  float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  float rnd(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec3 viewPos(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0) * uTan * z, -z); }
  vec2 toUv(vec3 p) { return (p.xy / (-p.z * uTan)) * 0.5 + 0.5; }
  float pxPerUm(float z) { return uRes.y * 0.5 / (z * uTan.y); }

  vec3 falseColour(float c) {
    if (c < 1.5) return vec3(1.0, 0.66, 0.28);   // mite cuticle: amber
    if (c < 2.5) return vec3(0.52, 0.9, 0.42);   // moss leaf
    if (c < 3.5) return vec3(0.38, 0.72, 0.36);  // stem
    if (c < 4.5) return vec3(0.62, 0.72, 0.95);  // mineral grain
    if (c < 5.5) return vec3(0.8, 0.64, 0.46);   // litter / humus
    if (c < 6.5) return vec3(1.0, 0.52, 0.8);    // fungal hypha
    if (c < 7.5) return vec3(1.0, 0.92, 0.36);   // spores, pollen
    return vec3(0.95, 0.42, 0.32);               // the other mite
  }
  float bseZ(float c) {
    // low-vacuum backscatter of an uncoated sample: brightness rises with mean
    // atomic number; silicate grains (Z~10-11) outshine chitin and cellulose (~6-7)
    if (c < 1.5) return 0.36; if (c < 2.5) return 0.30; if (c < 3.5) return 0.31;
    if (c < 4.5) return 0.88; if (c < 5.5) return 0.45; if (c < 6.5) return 0.27;
    if (c < 7.5) return 0.34; return 0.37;
  }

  void main() {
    vec2 px = 1.0 / uRes;
    vec4 g = texture2D(tG, vUv);
    float z = g.a;
    float mode = (vUv.y < 1.0 - uScanY) ? uPrevMode : uMode;
    float line = floor(vUv.y * uRes.y);
    float lineJit = (rnd(vec2(line, uFrame)) - 0.5) * 0.035 * uLineOn;
    float grainN = (rnd(vUv * uRes + uFrame * 17.0) - 0.5) * uNoiseOn;
    float grainN2 = (rnd(vUv * uRes * 1.37 + uFrame * 7.0) - 0.5) * uNoiseOn;
    vec3 col;
    if (z <= 0.0) {
      vec2 bu = vec2(vUv.x * uRes.x / uRes.y * 0.42 + uBackOff.x, clamp(vUv.y * 0.9 + uBackOff.y, 0.0, 1.0));
      float b = texture2D(tBack, bu).r * 0.8;
      b += (grainN + grainN2) * 0.1 + lineJit;
      col = vec3(b);
    } else {
      float cls = floor(g.b + 0.01);
      float thin = fract(g.b) > 0.25 ? 1.0 : 0.0;
      vec3 n = vec3(g.xy, sqrt(max(0.0, 1.0 - dot(g.xy, g.xy))));
      vec3 P = viewPos(vUv, z);
      vec3 V = normalize(-P);
      float cosT = clamp(dot(n, V), 0.05, 1.0);
      float ppu = pxPerUm(z);
      float rot = ign(vUv * uRes) * 6.2831853;

      // ambient occlusion: how much of the hemisphere above the point is walled in
      float occ = 0.0;
      float R = 34.0;
      for (int i = 0; i < NS; i++) {
        float fi = float(i);
        float a = rot + fi * 2.39996;
        float r = R * (0.2 + 0.8 * fract(fi * 0.618 + 0.13));
        vec2 suv = vUv + vec2(cos(a), sin(a)) * r * ppu * px;
        float sz = texture2D(tG, suv).a;
        if (sz <= 0.0) continue;
        vec3 S = viewPos(suv, sz);
        vec3 d = S - P;
        float L = length(d);
        occ += max(0.0, dot(d, n) / (L + 1e-3) - 0.12) * smoothstep(R * 2.5, R * 0.5, L);
      }
      occ = clamp(occ / float(NS) * 2.2, 0.0, 1.0) * uAOOn;

      // detector shadowing: march toward the detector through the depth buffer
      float sh = 0.0;
      float t = 5.0;
      for (int i = 0; i < 8; i++) {
        vec3 Q = P + n * 2.0 + uDet * t;
        vec2 quv = toUv(Q);
        if (quv.x < 0.0 || quv.x > 1.0 || quv.y < 0.0 || quv.y > 1.0) break;
        float qz = texture2D(tG, quv).a;
        if (qz > 0.0 && qz < -Q.z - 3.0 && qz > -Q.z - 220.0) sh += 1.0 / (1.0 + float(i) * 0.35);
        t *= 1.55;
      }
      sh = clamp(sh * 0.45, 0.0, 1.0) * uShadowOn;

      // silhouette: a neighbour much farther away means this pixel is an edge
      float edge = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 o = vec2(i == 0 ? 1.0 : i == 1 ? -1.0 : 0.0, i == 2 ? 1.0 : i == 3 ? -1.0 : 0.0) * 1.5 * px;
        float nz = texture2D(tG, vUv + o).a;
        edge += (nz <= 0.0 || nz > z + 14.0) ? 0.25 : 0.0;
      }

      float facing = dot(n, uDet);
      float sec = mix(1.6, 1.0 / cosT, uSecOn);
      edge *= uEdgeOn; thin *= uEdgeOn;
      if (mode < 0.5 || mode > 1.5) {
        float se = 0.24 + 0.42 * (1.0 - cosT * uSecOn - 0.6 * (1.0 - uSecOn)) + 0.06 * min(sec - 1.0, 3.0); // secant law, softened by detector saturation
        se *= 1.0 - uShadowOn * (0.38 - 0.38 * facing);                               // detector side
        se *= 1.0 - 0.42 * sh;                                    // detector shadow
        se *= 1.0 - 0.62 * occ;                                   // reabsorbed in crevices
        se += edge * 0.22 + thin * (0.16 + 0.12 * (sec - 1.0));   // edge effect
        se = se / (1.0 + max(0.0, se - 0.85) * 1.6);              // soft saturation
        float noise = (grainN + grainN2) * (0.05 + 0.08 * (1.0 - clamp(se, 0.0, 1.0))) + lineJit;
        float v = clamp(se + noise, 0.0, 1.0);
        col = mode < 0.5 ? vec3(v) : mix(vec3(v), falseColour(cls) * v * 1.18, 0.82);
      } else {
        // backscatter: composition first, gentle topography from an annular
        // detector above the sample, almost no edge effect, more noise
        float b = bseZ(cls) * (0.62 + 0.38 * pow(cosT, 0.7)) * (1.0 - 0.3 * occ);
        b += (grainN + grainN2) * 0.13 + lineJit * 1.6;
        col = vec3(clamp(b, 0.0, 1.0));
      }
    }
    if (uRaster > 0.5) col *= 0.93 + 0.07 * step(0.5, fract(gl_FragCoord.y * 0.5));
    if (uScanY < 1.0 && abs(vUv.y - (1.0 - uScanY)) < 1.5 * px.y) col = vec3(1.0);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createSem(renderer, backTex) {
  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.FloatType, format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
  });
  const mat = new THREE.ShaderMaterial({
    vertexShader: compVert, fragmentShader: compFrag, depthTest: false, depthWrite: false,
    uniforms: {
      tG: { value: target.texture }, tBack: { value: backTex },
      uRes: { value: new THREE.Vector2(4, 4) }, uTan: { value: new THREE.Vector2(1, 1) },
      uFrame: { value: 0 }, uMode: { value: 0 }, uPrevMode: { value: 0 }, uScanY: { value: 1 }, uRaster: { value: 0 },
      // from the specimen toward the Everhart-Thornley detector, in view space:
      // up and to the left of the frame, and toward the pole piece
      uDet: { value: new THREE.Vector3(-0.42, 0.62, 0.66).normalize() },
      uBackOff: { value: new THREE.Vector2() },
      uSecOn: { value: 1 }, uEdgeOn: { value: 1 }, uShadowOn: { value: 1 }, uAOOn: { value: 1 }, uNoiseOn: { value: 1 }, uLineOn: { value: 1 },
    },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const clear = new THREE.Color(0, 0, 0);
  let mode = 0, scan = 1;
  const warmed = new Set(); let compWarm = false; // warm(): kinds already warmed
  const u = mat.uniforms;
  // live switches for each term of the image model (1 on, 0 off)
  const toggles = {
    set secant(v) { u.uSecOn.value = v ? 1 : 0; }, set edge(v) { u.uEdgeOn.value = v ? 1 : 0; },
    set shadow(v) { u.uShadowOn.value = v ? 1 : 0; }, set ao(v) { u.uAOOn.value = v ? 1 : 0; },
    set noise(v) { u.uNoiseOn.value = v ? 1 : 0; }, set lines(v) { u.uLineOn.value = v ? 1 : 0; },
    set bump(v) { shared.uBumpOn.value = v ? 1 : 0; },
  };

  return {
    target, material: mat, toggles,
    get mode() { return mode; },
    setMode(m) { mat.uniforms.uPrevMode.value = mode; mode = m; mat.uniforms.uMode.value = m; scan = 0; },
    /** Finish the mode-change scan sweep at once. */
    skipScan() { scan = 1; mat.uniforms.uScanY.value = 1; },
    setBackdrop(t) { mat.uniforms.tBack.value = t; },
    setRaster(on) { mat.uniforms.uRaster.value = on ? 1 : 0; },
    resize(w, h) { target.setSize(w, h); mat.uniforms.uRes.value.set(w, h); },
    render(scene3d, camera, dt, yaw, pitch) {
      renderer.info.autoReset = false; // count both passes
      renderer.info.reset();
      this.renderGBuffer(scene3d, camera);
      this.composite(camera, dt, yaw, pitch);
    },
    /**
     * Compile and warm every shader the scene needs, ahead of the first frame.
     * A software renderer (SwiftShader) builds a shader for each program and
     * vertex layout on its first draw, which made the first frame seconds
     * long. This links the programs (in parallel where the driver offers
     * KHR_parallel_shader_compile) and draws one object of each kind into a
     * single pixel of the G-buffer, and the composite into one screen pixel,
     * which it clears again; the GPU process then builds them while the page
     * goes on loading. Nothing shows: the G-buffer is cleared before every
     * frame, and the screen pixel is left black, as an undrawn canvas is.
     * Call it while the page loads (before the first frame), as often as new
     * kinds of objects appear; kinds already warmed are skipped. objects: a
     * scene or object(s) to look through.
     */
    warm(objects, camera) {
      const reps = [];
      const visit = (o) => {
        if (!(o.isMesh && o.material && o.material.isShaderMaterial) || o === quad) return;
        const g = o.geometry, m = o.material;
        const attrs = Object.keys(g.attributes).sort().map((k) => { const a = g.attributes[k]; return `${k}${a.itemSize}${a.array.constructor.name}${a.normalized ? 'n' : ''}`; }).join();
        const key = `${o.isInstancedMesh ? 'I' : o.isBatchedMesh ? 'B' : 'M'}|${m.vertexShader.length}|${m.fragmentShader.length}|${m.side}|${JSON.stringify(m.defines || {})}|${g.index ? g.index.array.constructor.name : '-'}|${attrs}`;
        if (warmed.has(key)) return;
        warmed.add(key);
        reps.push(o);
      };
      for (const r of [].concat(objects)) r.traverse(visit);
      const prevTarget = renderer.getRenderTarget();
      const prevAuto = renderer.autoClear;
      renderer.autoClear = false;
      try {
        // link every new program first (three.js checks each only when first used)
        renderer.setRenderTarget(target);
        for (const o of reps) renderer.compile(o, camera);
        if (!compWarm) renderer.setRenderTarget(null), renderer.compile(scene, cam);
        // then one draw of each: a pixel of the G-buffer
        renderer.setRenderTarget(target);
        const sc = target.scissor.clone(), st = target.scissorTest;
        target.scissor.set(0, 0, 1, 1); target.scissorTest = true;
        for (const o of reps) {
          const fc = o.frustumCulled, pc = o.perObjectFrustumCulled;
          o.frustumCulled = false;
          if (o.isBatchedMesh) o.perObjectFrustumCulled = false;
          renderer.render(o, camera);
          o.frustumCulled = fc;
          if (o.isBatchedMesh) o.perObjectFrustumCulled = pc;
        }
        target.scissor.copy(sc); target.scissorTest = st;
        // and the composite, into one screen pixel, cleared back to black
        if (!compWarm) {
          compWarm = true;
          renderer.setRenderTarget(null);
          const s4 = renderer.getScissor(new THREE.Vector4()), sTest = renderer.getScissorTest();
          const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
          renderer.setScissor(0, 0, 1, 1); renderer.setScissorTest(true);
          renderer.render(scene, cam);
          renderer.setClearColor(clear, 0); renderer.clear();
          renderer.setClearColor(cc, ca);
          renderer.setScissor(s4); renderer.setScissorTest(sTest);
        }
      } finally {
        renderer.setRenderTarget(prevTarget);
        renderer.autoClear = prevAuto;
      }
      // hand the work to the GPU process now, not at the next frame
      renderer.getContext().flush();
      return reps.length;
    },
    /** Step 1: the scene (gMaterials only) into the G-buffer. */
    renderGBuffer(scene3d, camera) {
      renderer.setRenderTarget(target);
      renderer.setClearColor(clear, 0);
      renderer.clear();
      renderer.render(scene3d, camera);
    },
    /** Step 2: the micrograph from the G-buffer, to the screen. */
    composite(camera, dt, yaw = 0, pitch = 0, { tan } = {}) {
      if (tan) mat.uniforms.uTan.value.set(tan[0], tan[1]);
      else {
        const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        mat.uniforms.uTan.value.set(t * camera.aspect, t);
      }
      mat.uniforms.uFrame.value = (mat.uniforms.uFrame.value + 1) % 997;
      mat.uniforms.uBackOff.value.set(-yaw / (Math.PI * 2) * 2.4, pitch * 0.4);
      scan = Math.min(1, scan + dt / 0.7);
      mat.uniforms.uScanY.value = scan;
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    },
  };
}
