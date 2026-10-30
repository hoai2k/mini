// zoom-optics: one image-formation model that every Micro look is a point in,
// so a look can MORPH into another by moving through its parameters, not only
// cross-fade. From the Micro zoom-transitions prototype (micro/prototypes/zoom/).
//
// THE SPECIMEN FIELD (what a scene writes, per pixel, in µm units)
//   tex 0  r = optical path difference (Δn × thickness, µm), g = scatter,
//          b = height (µm, relative to any base: only slopes are used), a = coverage
//   tex 1  rgb = optical density (absorbance, natural log) per colour, a = fluorophore
//   tex 2  rgb = albedo (reflected colour, linear), a = gloss (wet, 0..1)
//   tex 0 and tex 1 are the adapters.js "optical field" layout (with fluorescence
//   in the spare alpha), so the same buffers can feed the prototypes' own sinks.
//   The field is mipmapped: blur (aperture, point spread, phase-ring halo,
//   occlusion) is a mip lookup, so it costs the same at every magnification.
//
// THE MODEL (all looks are this one formula with different numbers)
//   surface  = albedo' × shade + specular + sky reflection
//     shade  = mix(ambient + Lambert(n·L), secondary-electron yield ∝ 1/cos θ, semK)
//              × detector shadowing, cavity occlusion, SEM edge brightening
//     albedo'= mix(albedo, grey, grey)    (electrons see topography, not colour)
//   transmitted = bg × exp(−A) × (1 + DIC shear term) × (1 − defocus Laplacian)
//                 × (1 − phase-ring term)          (A = absorbance + mass × OPD)
//   emitted  = fluorophore × emission colour       (epifluorescence)
//   image    = surface × wSurf + transmitted × wTrans + emitted × wEmit
//   then exposure, tint, saturation, contrast, field stop, vignette, grain, scan lines.
// Physically, the weights are lamps: reflected (episcopic) light, the electron
// beam, the transmitted (diascopic) lamp and the excitation lamp; incoherent
// images add, so turning one down while another comes up is what a real
// microscope with both lamps would show. The other parameters (light
// direction, shear, aperture, field stop, halo, grade) interpolate as real
// settings would: an iris closing, a condenser being swung in.
//
// HOW TO PLUG IT IN
//   import { createZoomOptics, LOOKS, mixLook, lookPath } from '../shared/techniques/zoom-optics.js';
//   const zo = createZoomOptics(renderer);
//   zo.resize(w, h, fieldScale);                 // drawing-buffer size; field at w*fieldScale
//   each frame:
//     renderer.setRenderTarget(zo.field); renderer.render(yourFieldScene, cam);   // write the 3 attachments
//     zo.compose({ a: LOOKS.sem, b: LOOKS.dic, t: 0.4, cross: false, umPerPx, time });
//     zo.post({ target: [x, y] px, ring, ringR, rack, rackR, iris, irisR, turret });  // to the screen
//   mixLook(a, b, t) and lookPath([a, b, c], t) give an interpolated look object.
import * as THREE from '../vendor/three.module.min.js';

const VS = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Look parameters in packing order: [name, components]. */
export const PARAMS = [
  ['surf', 1], ['trans', 1], ['emit', 1], ['semK', 1],
  ['lightEl', 1], ['lightAz', 1], ['ambient', 1], ['spec', 1],
  ['sky', 3], ['grey', 1],
  ['edge', 1], ['shadow', 1], ['absK', 1], ['dic', 1],
  ['bg', 3], ['shearAz', 1],
  ['lap', 1], ['phase', 1], ['halo', 1], ['blurUm', 1],
  ['stop', 1], ['stopSoft', 1], ['vign', 1], ['grain', 1],
  ['tint', 3], ['sat', 1],
  ['contrast', 1], ['exposure', 1], ['scan', 1], ['outline', 1],
  ['emitCol', 3], ['flat', 1],
  ['outside', 3], ['massK', 1],
  ['haloUm', 1], ['relief', 1], ['auto', 1], ['warm', 1],
];
const SIZE = PARAMS.reduce((n, [, c]) => n + c, 0);
const NV = Math.ceil(SIZE / 4);

const BASE = {
  surf: 0, trans: 0, emit: 0, semK: 0, lightEl: 0.9, lightAz: 2.3, ambient: 0.35, spec: 0, sky: [0, 0, 0], grey: 0,
  edge: 0, shadow: 0, absK: 1, dic: 0, bg: [1, 1, 1], shearAz: 0.785, lap: 0, phase: 0, halo: 0.8, blurUm: 0,
  stop: 3, stopSoft: 0.02, vign: 0.15, grain: 0.02, tint: [1, 1, 1], sat: 1, contrast: 1, exposure: 1, scan: 0, outline: 0,
  emitCol: [0.3, 1, 0.45], flat: 0, outside: [0, 0, 0], massK: 0, haloUm: 1.5, relief: 1, auto: 0, warm: 0,
};

/**
 * The looks of the six Micro prototypes (and two for the optional phage
 * level), as points in the model. `name` is for the HUD; `instrument`
 * describes the optics the numbers stand for.
 */
export const LOOKS = {
  macro: { ...BASE, name: 'Macro photo', instrument: 'macro lens, low sun',
    surf: 1, lightEl: 0.62, lightAz: 2.5, ambient: 0.28, spec: 1.2, sky: [0.42, 0.40, 0.36], blurUm: 0,
    vign: 0.55, grain: 0.015, tint: [1.12, 0.98, 0.80], sat: 1.05, contrast: 1.08, exposure: 1.25, warm: 1 },
  stereo: { ...BASE, name: 'Stereo microscope', instrument: 'stereo microscope, ring light',
    surf: 1, lightEl: 1.35, lightAz: 2.3, ambient: 0.5, spec: 0.8, sky: [0.5, 0.5, 0.5], stop: 1.02, stopSoft: 0.03,
    vign: 0.25, grain: 0.012, tint: [1.0, 1.0, 0.95], contrast: 1.05, exposure: 1.35 },
  sem: { ...BASE, name: 'SEM', instrument: 'scanning electron microscope, SE detector',
    surf: 1, semK: 1, grey: 1, lightAz: 2.35, ambient: 0.2, edge: 1, shadow: 1, vign: 0.05, grain: 0.07, sat: 0,
    contrast: 1.18, exposure: 1.35, scan: 1, relief: 1 },
  dic: { ...BASE, name: 'DIC', instrument: 'Nomarski differential interference contrast',
    trans: 1, absK: 0.55, dic: 0.55, bg: [0.66, 0.64, 0.58], shearAz: 0.785, lap: 0, blurUm: 0.9,
    vign: 0.22, grain: 0.012, tint: [1.0, 0.98, 0.92], sat: 0.8, contrast: 1.05, exposure: 1.05 },
  bright: { ...BASE, name: 'Brightfield', instrument: 'brightfield, condenser stopped down',
    trans: 1, absK: 1, lap: 6, bg: [1.0, 0.95, 0.80], blurUm: 0.9, stop: 1.03, stopSoft: 0.012,
    vign: 0.35, grain: 0.01, contrast: 1.04, exposure: 0.96 },
  phase: { ...BASE, name: 'Phase contrast', instrument: 'positive phase contrast, 100× oil',
    trans: 1, absK: 1, phase: 1, halo: 0.85, haloUm: 1.4, bg: [0.70, 0.74, 0.70], blurUm: 0.11,
    vign: 0.25, grain: 0.02, sat: 0.8, contrast: 1.05, exposure: 1.0 },
  fluor: { ...BASE, name: 'Fluorescence', instrument: 'epifluorescence, DNA stain',
    emit: 1, emitCol: [0.35, 0.75, 1.0], blurUm: 0.11, auto: 0.04, vign: 0.3, grain: 0.03, exposure: 1.6, contrast: 1.1 },
  cryo: { ...BASE, name: 'Cryo-EM', instrument: 'cryo electron microscope (transmitted electrons)',
    trans: 1, absK: 0, massK: 9, lap: 0.00006, bg: [0.62, 0.62, 0.62], blurUm: 0.002, sat: 0, grain: 0.11,
    vign: 0.1, contrast: 1.15, exposure: 1.0 },
  mol: { ...BASE, name: 'Molecular illustration', instrument: 'illustration from structures (not an image)',
    surf: 1, lightEl: 1.2, lightAz: 2.3, ambient: 0.62, flat: 0.45, outline: 0.75, vign: 0.08, grain: 0,
    sat: 1.1, exposure: 1.12, contrast: 1.0 },
};

/** Interpolated look (every parameter, linearly). */
export function mixLook(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o = { name: t < 0.5 ? a.name : b.name, instrument: t < 0.5 ? a.instrument : b.instrument };
  for (const [k, c] of PARAMS) {
    if (c === 1) o[k] = a[k] + (b[k] - a[k]) * t;
    else o[k] = a[k].map((v, i) => v + (b[k][i] - v) * t);
  }
  return o;
}

/** A path through several looks, t 0..1 spread evenly over the legs. */
export function lookPath(stops, t) {
  if (stops.length === 1) return stops[0];
  const n = stops.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(n - 1, Math.floor(x));
  return mixLook(stops[i], stops[i + 1], x - i);
}

/** Pack a look into NV vec4s (Float32Array). */
export function packLook(look, out = new Float32Array(NV * 4)) {
  let i = 0;
  for (const [k, c] of PARAMS) {
    const v = look[k] ?? BASE[k];
    if (c === 1) out[i++] = v; else for (let j = 0; j < c; j++) out[i++] = v[j];
  }
  return out;
}

// GLSL: unpack the flat parameter list into a struct.
function unpackGlsl() {
  const fields = [];
  const reads = [];
  let i = 0;
  const at = (n) => `V[${n >> 2}].${'xyzw'[n & 3]}`;
  for (const [k, c] of PARAMS) {
    fields.push(`${c === 1 ? 'float' : 'vec3'} ${k};`);
    if (c === 1) reads.push(`L.${k} = ${at(i)};`);
    else reads.push(`L.${k} = vec3(${at(i)}, ${at(i + 1)}, ${at(i + 2)});`);
    i += c;
  }
  return `struct Look { ${fields.join(' ')} };
Look unpack(vec4 V[${NV}]) { Look L; ${reads.join(' ')} return L; }`;
}

const COMPOSE_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tF0, tF1, tF2;
uniform vec2 uRes;
uniform float uPx, uTime, uT;
uniform int uCross;
uniform vec4 uA[${NV}], uB[${NV}];
layout(location = 0) out vec4 oC;
${unpackGlsl()}
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 image(Look L, vec2 uv) {
  float lod = log2(max(1.0, L.blurUm / uPx));
  float d = exp2(lod);
  vec2 px = 1.0 / uRes;
  vec4 f0 = textureLod(tF0, uv, lod), f1 = textureLod(tF1, uv, lod), f2 = textureLod(tF2, uv, lod);
  vec4 ax = textureLod(tF0, uv + vec2(d, 0.0) * px, lod), bx = textureLod(tF0, uv - vec2(d, 0.0) * px, lod);
  vec4 ay = textureLod(tF0, uv + vec2(0.0, d) * px, lod), by = textureLod(tF0, uv - vec2(0.0, d) * px, lod);
  float du = d * uPx;
  vec2 gh = vec2(ax.b - bx.b, ay.b - by.b) / (2.0 * du) * L.relief;
  vec2 go = vec2(ax.r - bx.r, ay.r - by.r) / (2.0 * du);
  float lapO = (ax.r + bx.r + ay.r + by.r - 4.0 * f0.r) / (du * du);
  vec3 n = normalize(vec3(-gh, 1.0));

  // --- surface (reflected light or secondary electrons) ---
  vec3 col = vec3(0.0);
  if (L.surf > 0.001) {
    vec3 alb = mix(f2.rgb, vec3(0.62), L.grey);
    float gloss = f2.a * (1.0 - L.grey);
    vec3 Ld = vec3(cos(L.lightEl) * cos(L.lightAz), cos(L.lightEl) * sin(L.lightAz), sin(L.lightEl));
    float lam = max(dot(n, Ld), 0.0);
    float diffuse = L.ambient + (1.0 - L.ambient) * lam / max(Ld.z, 0.3);
    float sec = 1.0 / max(n.z, 0.12);
    float se = 0.34 * pow(sec, 1.15);
    float hLow = textureLod(tF0, uv, lod + 3.0).b;
    float occl = clamp((f0.b - hLow) / (8.0 * du), -1.0, 1.0);
    float det = clamp(0.5 + 0.9 * dot(n.xy, vec2(cos(L.lightAz), sin(L.lightAz))), 0.0, 1.0);
    float semY = se * (1.0 - 0.45 * L.shadow + 0.45 * L.shadow * det) + max(occl, 0.0) * L.edge * 0.45;
    float shade = mix(diffuse, semY, L.semK);
    shade *= 1.0 + L.shadow * 0.55 * min(occl, 0.0) + (1.0 - L.semK) * 0.35 * min(occl, 0.0);
    shade = mix(shade, 1.0, L.flat);
    vec3 s = alb * shade;
    vec3 H = normalize(Ld + vec3(0.0, 0.0, 1.0));
    float sp = pow(max(dot(n, H), 0.0), 80.0) * gloss * L.spec * 3.0;
    float fres = 0.03 + 0.97 * pow(1.0 - n.z, 5.0);
    s += (vec3(sp) + L.sky * gloss * (0.1 + fres * 4.0)) * (1.0 - L.flat);
    float ol = smoothstep(0.5, 1.6, length(gh));
    s *= 1.0 - L.outline * ol;
    col += s * L.surf;
  }
  // --- transmitted light (or transmitted electrons) ---
  if (L.trans > 0.001) {
    vec3 A = f1.rgb * L.absK + L.massK * max(f0.r, 0.0);
    vec2 sd = vec2(cos(L.shearAz), sin(L.shearAz));
    float dicT = L.dic * tanh(dot(go, sd) * 3.0);
    float lapT = tanh(lapO * L.lap);
    float phi = 6.2832 * f0.r / 0.55;
    float phiLow = 6.2832 * textureLod(tF0, uv, log2(max(1.0, L.haloUm / uPx))).r / 0.55;
    float pc = L.phase * tanh(0.95 * (phi - L.halo * phiLow));
    vec3 t = L.bg * exp(-A) * (1.0 + dicT) * (1.0 - 0.5 * lapT) * (1.0 - 0.9 * pc);
    col += max(t, 0.0) * L.trans;
  }
  // --- emitted (epifluorescence) ---
  if (L.emit > 0.001) col += (L.emitCol * f1.a + L.auto * f0.a * vec3(0.5, 0.45, 0.2)) * L.emit;

  // --- grade and the instrument's frame ---
  col *= L.exposure * L.tint;
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  col = mix(vec3(lum(col)), col, L.sat);
  col = (col - 0.5) * L.contrast + 0.5;
  if (L.warm > 0.0) col = mix(col, col * vec3(1.03, 0.99, 0.9) + vec3(0.02, 0.01, 0.0), L.warm * 0.5);
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  float r = length(q);
  col *= 1.0 - L.vign * 0.25 * r * r;
  float g = hash13(vec3(gl_FragCoord.xy, floor(uTime * 30.0))) - 0.5;
  col += g * L.grain * (0.4 + sqrt(max(lum(col), 0.0)));
  float row = gl_FragCoord.y;
  col *= 1.0 - L.scan * (0.05 * step(0.5, fract(row * 0.5)) + 0.04 * (hash13(vec3(0.0, row, floor(uTime * 12.0))) - 0.5));
  float m = 1.0 - smoothstep(L.stop - L.stopSoft, L.stop + L.stopSoft, r);
  col = mix(L.outside, col, m);
  return clamp(col, 0.0, 1.0);
}

void main() {
  vec4 V[${NV}];
  if (uCross == 1) {
    for (int i = 0; i < ${NV}; i++) V[i] = uA[i];
    vec3 a = image(unpack(V), vUv);
    for (int i = 0; i < ${NV}; i++) V[i] = uB[i];
    vec3 b = image(unpack(V), vUv);
    oC = vec4(mix(a, b, uT), 1.0);
  } else {
    for (int i = 0; i < ${NV}; i++) V[i] = mix(uA[i], uB[i], uT);
    oC = vec4(image(unpack(V), vUv), 1.0);
  }
}`;

// The highlight and objective effects, on the finished image.
const POST_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tC;
uniform vec2 uRes, uTarget;
uniform float uTime, uRing, uRingR, uRack, uRackR, uIris, uIrisR, uTurret, uFoot;
uniform vec4 uFootRect;
layout(location = 0) out vec4 oC;
void main() {
  vec2 fc = gl_FragCoord.xy;
  float dist = length(fc - uTarget);
  float lod = uRack * 4.5 * smoothstep(uRackR, uRackR * 1.7 + 8.0, dist);
  vec3 col = textureLod(tC, vUv, lod).rgb;
  if (uTurret > 0.001) {
    // the nosepiece turning: a rotational blur about the turret axis, off screen
    vec2 piv = vec2(uRes.x * 1.25, -uRes.y * 0.35);
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 14; i++) {
      float a = (float(i) / 13.0 - 0.5) * uTurret * 0.16;
      vec2 d = fc - piv;
      vec2 p = piv + mat2(cos(a), sin(a), -sin(a), cos(a)) * d;
      acc += textureLod(tC, p / uRes, 1.5 * uTurret).rgb;
    }
    col = mix(col, acc / 14.0, min(1.0, uTurret * 1.5)) * (1.0 - 0.35 * uTurret);
  }
  if (uIris > 0.001) {
    float m = smoothstep(uIrisR + 3.0, uIrisR - 3.0, dist);
    float rim = exp(-pow((dist - uIrisR) / 3.0, 2.0));
    col = mix(col, col * m + vec3(0.55, 0.52, 0.48) * rim * 0.35, uIris);
  }
  if (uRing > 0.001) {
    float w = 2.2;
    float pulse = 0.5 + 0.5 * sin(uTime * 5.0);
    float ring = exp(-pow((dist - uRingR) / w, 2.0));
    float echo = exp(-pow((dist - uRingR * (1.0 + 0.35 * fract(uTime * 0.8))) / (w * 1.5), 2.0)) * (1.0 - fract(uTime * 0.8));
    float glow = exp(-pow(dist / max(uRingR, 1.0), 2.0) * 1.5) * 0.12;
    vec3 rc = vec3(1.0, 0.86, 0.35);
    col = mix(col, rc, clamp((ring * (0.65 + 0.35 * pulse) + echo * 0.5) * uRing, 0.0, 1.0));
    col += rc * glow * uRing * pulse;
  }
  if (uFoot > 0.001) {
    // the next world's field, outlined (a dashed frame)
    vec2 a = uFootRect.xy, b = uFootRect.zw;
    vec2 dd = max(a - fc, fc - b);
    float e = abs(max(dd.x, dd.y));
    float dash = step(0.5, fract((fc.x + fc.y) / 14.0));
    col = mix(col, vec3(0.75, 0.9, 1.0), uFoot * dash * (1.0 - smoothstep(0.6, 1.6, e)));
  }
  oC = vec4(col, 1.0);
}`;

export function createZoomOptics(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new THREE.Mesh(tri);
  quad.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(quad);
  const qCam = new THREE.Camera();
  const run = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };

  const mipRT = (w, h, count, type) => {
    const rt = new THREE.WebGLRenderTarget(w, h, { count, type, format: THREE.RGBAFormat, depthBuffer: false, generateMipmaps: true });
    for (const t of rt.textures) { t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; }
    return rt;
  };
  let field = null, color = null;
  const res = new THREE.Vector2(1, 1);

  const ua = Array.from({ length: NV }, () => new THREE.Vector4());
  const ub = Array.from({ length: NV }, () => new THREE.Vector4());
  const compose = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: COMPOSE_FS, depthTest: false, depthWrite: false,
    uniforms: { tF0: { value: null }, tF1: { value: null }, tF2: { value: null }, uRes: { value: new THREE.Vector2() },
      uPx: { value: 1 }, uTime: { value: 0 }, uT: { value: 0 }, uCross: { value: 0 }, uA: { value: ua }, uB: { value: ub } },
  });
  const post = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: POST_FS, depthTest: false, depthWrite: false,
    uniforms: { tC: { value: null }, uRes: { value: new THREE.Vector2() }, uTarget: { value: new THREE.Vector2() }, uTime: { value: 0 },
      uRing: { value: 0 }, uRingR: { value: 0 }, uRack: { value: 0 }, uRackR: { value: 0 }, uIris: { value: 0 }, uIrisR: { value: 0 },
      uTurret: { value: 0 }, uFoot: { value: 0 }, uFootRect: { value: new THREE.Vector4() } },
  });
  const packA = new Float32Array(NV * 4), packB = new Float32Array(NV * 4);
  const load = (arr, vecs) => { for (let i = 0; i < NV; i++) vecs[i].fromArray(arr, i * 4); };

  return {
    get field() { return field; },
    get color() { return color; },
    /** Drawing-buffer size; the field is rendered at fieldScale of it. */
    resize(w, h, fieldScale = 1) {
      const fw = Math.max(16, Math.round(w * fieldScale)), fh = Math.max(16, Math.round(h * fieldScale));
      if (!field || field.width !== fw || field.height !== fh) {
        field?.dispose();
        field = mipRT(fw, fh, 3, THREE.HalfFloatType);
      }
      if (!color || color.width !== fw || color.height !== fh) {
        color?.dispose();
        color = mipRT(fw, fh, 1, THREE.UnsignedByteType);
      }
      res.set(w, h);
    },
    /**
     * Form the image from the field. a, b: looks; t: how far from a to b;
     * cross: true to cross-fade the two finished images instead of morphing
     * the optics; umPerPx: µm per FIELD pixel.
     */
    compose({ a, b = a, t = 0, cross = false, umPerPx = 1, time = 0 }) {
      const u = compose.uniforms;
      load(packLook(a, packA), ua);
      load(packLook(b, packB), ub);
      [u.tF0.value, u.tF1.value, u.tF2.value] = field.textures;
      u.uRes.value.set(field.width, field.height);
      u.uPx.value = umPerPx;
      u.uTime.value = time;
      u.uT.value = t;
      u.uCross.value = cross ? 1 : 0;
      // The composite runs at the field's resolution into the colour target.
      run(compose, color);
    },
    /** Highlight effects, drawn to the screen (or `target`). Positions in drawing-buffer pixels. */
    post(o = {}, target = null) {
      const u = post.uniforms;
      u.tC.value = color.texture;
      u.uRes.value.copy(res);
      u.uTarget.value.set(o.target?.[0] ?? 0, o.target?.[1] ?? 0);
      u.uTime.value = o.time ?? 0;
      for (const k of ['ring', 'ringR', 'rack', 'rackR', 'iris', 'irisR', 'turret', 'foot']) u['u' + k[0].toUpperCase() + k.slice(1)].value = o[k] ?? 0;
      if (o.footRect) u.uFootRect.value.fromArray(o.footRect);
      run(post, target);
    },
  };
}
