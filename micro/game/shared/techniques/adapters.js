// adapters: lets any prototype try another prototype's rendering look.
//
// The four pipelines differ. The mite's SEM shades opaque surfaces from a
// G-buffer (normal, material class, depth). The tardigrade's DIC, the
// amoeba's property optics and the paramecium microscope all form an image
// from what a transmitted-light microscope responds to: optical path
// difference (OPD) and absorbance, summed along each ray. The adapters meet in
// one shared currency, the OPTICAL FIELD: two float textures,
//   tex 0  r = OPD (µm of optical path; a typical cell 1–4), g = scatter,
//          b = height for an SEM relief (µm), a = coverage (0 empty, 1 object)
//   tex 1  rgb = optical density (absorbance), a unused
// Sources fill the field from what a prototype already draws; sinks turn the
// field into another prototype's image. SEM of a 3D scene can also skip the
// field and render the real geometry with G-buffer materials (semScene).
//
// HOW TO PLUG IT IN
//   import { createBorrowedLooks, borrowedSwitches } from '../shared/techniques/adapters.js';
//   const looks = createBorrowedLooks(renderer);   // nothing is allocated until first use
//   Sources (each returns the field; w, h = the source buffer size):
//     looks.fieldFromBuffers(w, h, { a: { opd, abs, opdW, scatW, absSwz }, b?: {...}, opdK, absK, heightK })
//       opd/abs: textures; opdW, scatW: channel weights (vec4 arrays) picking OPD and
//       scatter out of opd; absSwz 'rgb' | 'gba' picks absorbance out of abs;
//       opdK, absK scale into field units; heightK turns OPD into SEM height (µm).
//     looks.fieldFromGBuffer(gTex, w, h, { camera, tan, base, dn, hMax, absorb })
//       an opaque scene's SEM G-buffer: thickness = height above `base` (world y,
//       scene units = µm), OPD = dn × thickness, absorbance = absorb[class] × thickness.
//   Sinks (each draws to the screen at the renderer's drawing-buffer size):
//     looks.amoeba({ mode 0..3, focus, time, umPerPx, phaseK, odK })        amoeba-optics.js
//     looks.dic({ mode 0|1, pxPerUm, time, opdK, absK, opts })                tardigrade-dic.js
//     looks.paramecium({ mode 0..4, time, opdK, absK, stop })                paramecium-microscope.js
//     looks.semFromField({ umPerPx, dist, cls, subCls, dt })                 mite-sem.js
//     looks.semScene(scene, camera, { dt, umPerUnit, tan, cls(o), skip(o) }) mite-sem.js, real geometry
//     looks.semMode(i): SE / BSE / false colour (mite-sem MODES).
//   borrowedSwitches(features): registers mutually exclusive borrowed looks,
//     default OFF; .id is the one switched on (or null).
import * as THREE from '../vendor/three.module.min.js';
import { PropertyOptics } from './amoeba-optics.js';
import { DicMicroscope } from './tardigrade-dic.js';
import { createOptics, shared as pShared, MODES as P_MODES, MODE_NAMES as P_NAMES } from './paramecium-microscope.js';
import { createSem, gMaterial, shared as semShared, CLS, MODES as SEM_MODES } from './mite-sem.js';

export { CLS, SEM_MODES };
export const AMOEBA_MODES = ['Brightfield', 'Phase contrast', 'Darkfield', 'Immersive'];
export const DIC_MODES = ['DIC (Nomarski)', 'Brightfield'];
export const PARAMECIUM_MODES = P_MODES.map((m) => P_NAMES[m].replace(/ \(.*\)$/, ''));
export const SEM_LOOKS = ['SE', 'BSE', 'False colour'];

const VS = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const HEAD = /* glsl */ `
precision highp float;
in vec2 vUv;
`;

// Native buffers → field.
const PACK_FS = HEAD + /* glsl */ `
uniform sampler2D tO0, tA0, tO1, tA1;
uniform vec4 uOw0, uOw1, uSw0, uSw1;
uniform vec2 uAs;
uniform float uHas1, uOK, uAK, uHK;
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
vec3 absOf(vec4 t, float s) { return s > 0.5 ? t.gba : t.rgb; }
void main() {
  vec4 a = texture(tO0, vUv);
  float opd = dot(a, uOw0), sc = dot(a, uSw0);
  vec3 ab = absOf(texture(tA0, vUv), uAs.x);
  if (uHas1 > 0.5) {
    vec4 c = texture(tO1, vUv);
    opd += dot(c, uOw1); sc += dot(c, uSw1);
    ab += absOf(texture(tA1, vUv), uAs.y);
  }
  opd *= uOK; ab *= uAK;
  float cov = smoothstep(0.02, 0.12, abs(opd) + dot(max(ab, 0.0), vec3(1.0)));
  o0 = vec4(opd, sc, max(opd, 0.0) * uHK, cov);
  o1 = vec4(ab, 0.0);
}`;

// Opaque SEM G-buffer → field: the scene read as a thick specimen whose
// thickness is its height above the floor.
const DEPTH_FS = HEAD + /* glsl */ `
uniform sampler2D tG;
uniform vec2 uTan;
uniform mat4 uCamWorld;
uniform float uBase, uDn, uHmax;
uniform vec3 uAbs[9];
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  vec4 g = texture(tG, vUv);
  float z = g.a;
  if (z <= 0.0) { o0 = vec4(0.0); o1 = vec4(0.0); return; }
  vec3 P = vec3((vUv * 2.0 - 1.0) * uTan * z, -z);
  float y = (uCamWorld * vec4(P, 1.0)).y;
  float h = clamp(y - uBase, 0.0, uHmax);
  int c = int(clamp(floor(g.b + 0.01), 0.0, 8.0));
  float thin = fract(g.b) > 0.25 ? 1.0 : 0.0;
  o0 = vec4(uDn * h, thin, h, 1.0);
  o1 = vec4(uAbs[c] * h, 0.0);
}`;

// Field → each sink's own buffers.
const TO_PROPERTY_FS = HEAD + /* glsl */ `
uniform sampler2D tF0, tF1;
uniform float uOK, uAK;
layout(location = 0) out vec4 o;
void main() { o = vec4(texture(tF0, vUv).r * uOK, texture(tF1, vUv).rgb * uAK); }`;

const TO_DIC_FS = HEAD + /* glsl */ `
uniform sampler2D tF0, tF1;
uniform float uOK, uAK;
layout(location = 0) out vec4 oOpd;
layout(location = 1) out vec4 oAbs;
void main() { oOpd = vec4(texture(tF0, vUv).r * uOK, 0.0, 0.0, 0.0); oAbs = vec4(texture(tF1, vUv).rgb * uAK, 0.0); }`;

const TO_PARAMECIUM_FS = HEAD + /* glsl */ `
uniform sampler2D tF0, tF1;
uniform float uOK, uAK, uSK;
layout(location = 0) out vec4 oS0;
layout(location = 1) out vec4 oS1;
layout(location = 2) out vec4 oB0;
layout(location = 3) out vec4 oB1;
void main() {
  vec4 f = texture(tF0, vUv);
  oS0 = vec4(f.r * uOK, f.g * uSK, 0.0, 0.0);
  oS1 = vec4(texture(tF1, vUv).rgb * uAK, 0.0);
  oB0 = vec4(0.0); oB1 = vec4(0.0);
}`;

// Field → SEM G-buffer: the height map seen from a virtual camera `dist` µm
// above a flat substrate (the slide, or a filter).
const TO_SEM_FS = HEAD + /* glsl */ `
uniform sampler2D tF0;
uniform vec2 uTexel;
uniform float uUmPerTexel, uDist, uCls, uSubCls;
layout(location = 0) out vec4 o;
void main() {
  vec4 f = texture(tF0, vUv);
  float hx = texture(tF0, vUv + vec2(uTexel.x, 0.0)).b - texture(tF0, vUv - vec2(uTexel.x, 0.0)).b;
  float hy = texture(tF0, vUv + vec2(0.0, uTexel.y)).b - texture(tF0, vUv - vec2(0.0, uTexel.y)).b;
  vec3 n = normalize(vec3(-hx, -hy, 2.0 * uUmPerTexel));
  o = vec4(n.x, n.y, f.a > 0.5 ? uCls : uSubCls, uDist - f.b);
}`;

function flatTexture(r, g, b) {
  const t = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

export function createBorrowedLooks(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const qMesh = new THREE.Mesh(tri);
  qMesh.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(qMesh);
  const qCam = new THREE.Camera();
  const mats = {};
  const mat = (key, fs, uniforms) => (mats[key] ||= new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false }));
  const run = (m, target) => { qMesh.material = m; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };
  const buf = new THREE.Vector2();
  const screen = () => renderer.getDrawingBufferSize(buf);

  let field = null;
  function fieldRT(w, h) {
    if (!field || field.width !== w || field.height !== h) {
      field?.dispose();
      field = new THREE.WebGLRenderTarget(w, h, { count: 2, type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
      for (const t of field.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; }
    }
    return field;
  }

  // Lazily created sinks, each sized to the drawing buffer.
  const sinks = {};
  const sized = (s, w, h, set) => { if (s.w !== w || s.h !== h) { s.w = w; s.h = h; set(w, h); } };
  const amoebaBg = flatTexture(196, 189, 171);
  const semBack = flatTexture(80, 80, 80);
  let semModeWanted = 0;
  function sem() {
    if (!sinks.sem) {
      sinks.sem = { s: createSem(renderer, semBack), w: 0, h: 0, mats: new Map() };
      if (semModeWanted) { sinks.sem.s.setMode(semModeWanted); sinks.sem.s.skipScan(); }
    }
    const z = sinks.sem, v = screen();
    sized(z, v.x, v.y, (w, h) => z.s.resize(w, h));
    return z;
  }
  const fieldTex = () => field.textures;

  const api = {
    get field() { return field; },

    fieldFromBuffers(w, h, { a, b = null, opdK = 1, absK = 1, heightK = 30 }) {
      const rt = fieldRT(w, h);
      const m = mat('pack', PACK_FS, {
        tO0: { value: null }, tA0: { value: null }, tO1: { value: null }, tA1: { value: null },
        uOw0: { value: new THREE.Vector4() }, uOw1: { value: new THREE.Vector4() }, uSw0: { value: new THREE.Vector4() }, uSw1: { value: new THREE.Vector4() },
        uAs: { value: new THREE.Vector2() }, uHas1: { value: 0 }, uOK: { value: 1 }, uAK: { value: 1 }, uHK: { value: 1 },
      });
      const u = m.uniforms;
      const src = (s, i) => {
        u[`tO${i}`].value = s.opd; u[`tA${i}`].value = s.abs || s.opd;
        u[`uOw${i}`].value.fromArray(s.opdW || [1, 0, 0, 0]);
        u[`uSw${i}`].value.fromArray(s.scatW || [0, 0, 0, 0]);
        u.uAs.value.setComponent(i, s.absSwz === 'gba' ? 1 : 0);
      };
      src(a, 0);
      if (b) src(b, 1); else { u.tO1.value = a.opd; u.tA1.value = a.abs || a.opd; }
      u.uHas1.value = b ? 1 : 0;
      u.uOK.value = opdK; u.uAK.value = absK; u.uHK.value = heightK;
      run(m, rt);
      return rt;
    },

    fieldFromGBuffer(gTex, w, h, { camera, tan, base = 0, dn = 0.03, hMax = 600, absorb = [] }) {
      const rt = fieldRT(w, h);
      const m = mat('depth', DEPTH_FS, {
        tG: { value: null }, uTan: { value: new THREE.Vector2() }, uCamWorld: { value: new THREE.Matrix4() },
        uBase: { value: 0 }, uDn: { value: 0.03 }, uHmax: { value: 600 },
        uAbs: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) },
      });
      const u = m.uniforms;
      u.tG.value = gTex;
      if (tan) u.uTan.value.set(tan[0], tan[1]);
      else { const t = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2); u.uTan.value.set(t * camera.aspect, t); }
      u.uCamWorld.value.copy(camera.matrixWorld);
      u.uBase.value = base; u.uDn.value = dn; u.uHmax.value = hMax;
      for (let i = 0; i < 9; i++) u.uAbs.value[i].fromArray(absorb[i] || [0.001, 0.0012, 0.0016]);
      run(m, rt);
      return rt;
    },

    /** Amoeba property optics. umPerPx: field units per screen pixel (tiles the plain background, moves the caustics). */
    amoeba({ mode = 0, focus = 0.6, time = 0, umPerPx = 1, phaseK = 1, odK = 1, flags = {} }) {
      if (!sinks.amoeba) sinks.amoeba = { o: new PropertyOptics(renderer), w: 0, h: 0 };
      const z = sinks.amoeba, v = screen();
      sized(z, v.x, v.y, (w, h) => z.o.setSize(w, h));
      const m = mat('toProp', TO_PROPERTY_FS, { tF0: { value: null }, tF1: { value: null }, uOK: { value: 1 }, uAK: { value: 1 } });
      [m.uniforms.tF0.value, m.uniforms.tF1.value] = fieldTex();
      m.uniforms.uOK.value = phaseK; m.uniforms.uAK.value = odK;
      z.o.clear();
      run(m, z.o.focusRT);
      z.o.compose({ view: [0, 0, v.x * umPerPx, v.y * umPerPx], bg: amoebaBg, bgMean: [196 / 255, 189 / 255, 171 / 255], bgTile: 1400, mode, focus, time, flags });
    },

    /** Tardigrade DIC (mode 0) or its brightfield (mode 1). pxPerUm: screen pixels per field µm. */
    dic({ mode = 0, pxPerUm = 1, time = 0, opdK = 1, absK = 1, opts = {} }) {
      if (!sinks.dic) {
        sinks.dic = { m: new DicMicroscope(renderer, new THREE.Scene(), new THREE.PerspectiveCamera()), w: 0, h: 0 };
        if (/swiftshader|llvmpipe|software/i.test(String(renderer.getContext().getParameter(renderer.getContext().RENDERER)))) sinks.dic.m.setQuality(0);
      }
      const z = sinks.dic, v = screen();
      sized(z, v.x, v.y, (w, h) => z.m.setSize(w, h));
      Object.assign(z.m.opts, opts);
      z.m.mode = mode;
      const m = mat('toDic', TO_DIC_FS, { tF0: { value: null }, tF1: { value: null }, uOK: { value: 1 }, uAK: { value: 1 } });
      [m.uniforms.tF0.value, m.uniforms.tF1.value] = fieldTex();
      m.uniforms.uOK.value = opdK; m.uniforms.uAK.value = absK;
      z.m.render({ ref: 0, focus: 0, cocPerUnit: 0, dof: 1, pxPerUnit: pxPerUm, time, fill: (rt) => run(m, rt) });
    },

    /** Paramecium microscope: darkfield, phase, brightfield, DIC, immersive (index into its MODES). */
    paramecium({ mode = 0, time = 0, opdK = 1, absK = 1, scatK = 1, stop = false }) {
      if (!sinks.par) sinks.par = { o: createOptics(renderer), w: 0, h: 0 };
      const z = sinks.par, v = screen();
      sized(z, v.x, v.y, (w, h) => z.o.resize(w, h));
      const m = mat('toPar', TO_PARAMECIUM_FS, { tF0: { value: null }, tF1: { value: null }, uOK: { value: 1 }, uAK: { value: 1 }, uSK: { value: 1 } });
      [m.uniforms.tF0.value, m.uniforms.tF1.value] = fieldTex();
      m.uniforms.uOK.value = opdK; m.uniforms.uAK.value = absK; m.uniforms.uSK.value = scatK;
      pShared.uTime.value = time;
      z.o.render(null, null, { mode, stop, plate: null, fill: () => run(m, z.o.targets.main) });
    },

    semMode(i) {
      semModeWanted = i;
      if (sinks.sem && sinks.sem.s.mode !== i) sinks.sem.s.setMode(i);
    },

    /** SEM of the field's height map, from a virtual camera `dist` µm above a flat substrate. */
    semFromField({ umPerPx = 1, dist = 4000, cls = CLS.CUTICLE, subCls = CLS.GRAIN, dt = 1 / 60 }) {
      const z = sem();
      const v = screen();
      const m = mat('toSem', TO_SEM_FS, { tF0: { value: null }, uTexel: { value: new THREE.Vector2() }, uUmPerTexel: { value: 1 }, uDist: { value: 4000 }, uCls: { value: 1 }, uSubCls: { value: 4 } });
      const u = m.uniforms;
      u.tF0.value = field.textures[0];
      u.uTexel.value.set(1 / field.width, 1 / field.height);
      u.uUmPerTexel.value = umPerPx * (v.x / field.width);
      u.uDist.value = dist; u.uCls.value = cls; u.uSubCls.value = subCls;
      run(m, z.s.target);
      z.s.composite(null, dt, 0, 0, { tan: [(v.x * umPerPx) / 2 / dist, (v.y * umPerPx) / 2 / dist] });
    },

    /**
     * SEM of a 3D scene's real geometry: every plain mesh is drawn with a
     * G-buffer material for this pass (materials restored after). Meshes whose
     * shape comes from their own vertex shader (instanced billboards, ribbons),
     * points, lines and multi-material meshes are left out, as is anything skip(o) picks.
     * umPerUnit: µm per scene unit. tan: for an orthographic camera,
     * [half width, half height] / distance to the subject.
     */
    semScene(scene, camera, { dt = 1 / 60, umPerUnit = 1, tan, cls = () => CLS.CUTICLE, skip = () => false }) {
      const z = sem();
      const hide = [], swap = [];
      scene.traverseVisible((o) => {
        if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
        const g = o.geometry;
        if (!o.isMesh || Array.isArray(o.material) || !g || !g.attributes.normal || (g.isInstancedBufferGeometry && !o.isInstancedMesh) || skip(o)) hide.push(o);
        else swap.push(o);
      });
      for (const o of hide) o.visible = false;
      for (const o of swap) {
        const c = cls(o);
        let m = z.mats.get(c);
        if (!m) { m = gMaterial({ cls: c, side: THREE.DoubleSide }); z.mats.set(c, m); }
        o.userData.__semKeep = o.material;
        o.material = m;
      }
      const bg = scene.background, fog = scene.fog, cut = semShared.uCutOn.value, ds = semShared.uDepthScale.value;
      scene.background = null; scene.fog = null;
      semShared.uCutOn.value = 0; semShared.uDepthScale.value = umPerUnit;
      z.s.renderGBuffer(scene, camera);
      scene.background = bg; scene.fog = fog;
      semShared.uCutOn.value = cut; semShared.uDepthScale.value = ds;
      for (const o of swap) { o.material = o.userData.__semKeep; delete o.userData.__semKeep; }
      for (const o of hide) o.visible = true;
      z.s.composite(camera, dt, 0, 0, { tan });
    },
  };
  return api;
}

/**
 * Borrowed looks are mutually exclusive switches, default OFF. Returns
 * { add(feature), id } where id is the look switched on (or null).
 */
export function borrowedSwitches(features) {
  const st = {
    id: null,
    add(f) {
      return features.add({
        group: 'Borrowed', ...f, on: false,
        onChange: (v) => {
          if (v) { const prev = st.id; st.id = f.id; if (prev && prev !== f.id) features.set(prev, false); }
          else if (st.id === f.id) st.id = null;
          f.onChange?.(v);
        },
      });
    },
  };
  return st;
}
