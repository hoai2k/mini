// springtail-macro: a macro-photography look from the Micro springtail
// prototype. Natural daylight on real colours, a thin-lens camera at 1–5x
// magnification with its true (very shallow) depth of field, a depth-based
// bokeh gather, filmic tone mapping and a few optical "looks".
//
// HOW TO PLUG IT IN
//   import { createMacro, litMaterial, macroShared, lens, MACRO_LOOKS } from '../shared/techniques/springtail-macro.js';
//   const macro = createMacro(renderer);          // owns the render targets
//   macro.resize(w, h);                           // drawing-buffer size
//   const L = lens({ hfw: 12, N: 8 });            // field width (mm) -> m, distance, fov, DOF
//   camera.fov = L.vfov(aspect); camera.position at L.s from the subject
//   macroShared.uFocus.value = focusDistance;     // world units (mm), along the view ray
//   macro.render(scene, camera, { lens: L, look: 0 });
// Every material in the scene must write gl_FragColor = vec4(linearHDR, dist - uFocus)
// where dist = |worldPos - cameraPosition|: the alpha carries depth for the
// blur, measured from the focal plane so half floats keep it precise where it
// matters. litMaterial() does that for you; custom shaders include MACRO_GLSL
// and end with macroOut(col, worldPos).
// INPUTS: world units are millimetres (only lens() cares).
import * as THREE from '../vendor/three.module.min.js';

/** Uniforms shared by every macro material (lighting, focus, shadow casters). */
export const macroShared = {
  uSunDir: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() },
  uSunCol: { value: new THREE.Vector3(3.3, 3.0, 2.55) },
  uSkyTop: { value: new THREE.Vector3(0.32, 0.48, 0.85) },
  uSkyHor: { value: new THREE.Vector3(0.8, 0.85, 0.9) },
  uGround: { value: new THREE.Vector3(0.1, 0.09, 0.05) },
  uRing: { value: 0 },
  uFocus: { value: 100 },
  uTime: { value: 0 },
  uBackdrop: { value: null },
  uHasBackdrop: { value: 0 },
  // up to 8 soft shadow casters: (x, y, z, radius); y is the caster's height
  uCasters: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -99, 0, 0)) },
  uCasterK: { value: Array.from({ length: 8 }, () => 0) },
};

/** Lighting looks: index with the D-pad. dofK scales the aperture for the look. */
export const MACRO_LOOKS = [
  { name: 'Macro, low sun', sun: [3.3, 3.0, 2.55], sky: [0.32, 0.48, 0.85], hor: [0.8, 0.85, 0.9], ring: 0, exposure: 1.0, warm: 0.04, dofK: 1, circle: 0 },
  { name: 'Macro, overcast', sun: [0.7, 0.72, 0.75], sky: [1.0, 1.08, 1.18], hor: [1.25, 1.28, 1.3], ring: 0, exposure: 1.15, warm: 0, dofK: 1, circle: 0 },
  { name: 'Stereo microscope (ring light)', sun: [0.4, 0.4, 0.4], sky: [0.25, 0.27, 0.3], hor: [0.3, 0.3, 0.3], ring: 3.2, exposure: 1.1, warm: -0.02, dofK: 4, circle: 1 },
];

export function applyLook(i) {
  const L = MACRO_LOOKS[i];
  macroShared.uSunCol.value.fromArray(L.sun);
  macroShared.uSkyTop.value.fromArray(L.sky);
  macroShared.uSkyHor.value.fromArray(L.hor);
  macroShared.uRing.value = L.ring;
  return L;
}

/**
 * Thin-lens macro optics. hfw = field width at the subject (mm), f = focal
 * length (mm), N = f-number set on the lens, sensor = sensor width (mm).
 * m = sensor/hfw, subject distance s = f(1 + 1/m), effective aperture
 * N(1 + m), total depth of field 2 N c (1 + m) / m^2 with c = 0.03 mm.
 */
export function lens({ hfw, f = 100, N = 8, sensor = 36, c = 0.03 }) {
  const m = sensor / hfw;
  const s = f * (1 + 1 / m);
  const hfov = 2 * Math.atan(hfw / 2 / s);
  return {
    hfw, f, N, m, s, sensor, hfov,
    Neff: N * (1 + m),
    dof: (2 * N * c * (1 + m)) / (m * m),
    vfov: (aspect) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)),
    /** blur-disc diameter on the sensor, in pixels of an image `px` wide, per unit (d - s)/d */
    cocK: (px) => ((f * m) / N / sensor) * px,
  };
}

/** GLSL shared by all macro materials: sky, sun, ring light, soft casters, output. */
export const MACRO_GLSL = /* glsl */ `
uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyHor, uGround;
uniform float uRing, uFocus, uTime, uHasBackdrop;
uniform sampler2D uBackdrop;
uniform vec4 uCasters[8];
uniform float uCasterK[8];
float mHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1, 0)), f.x), mix(mHash(i + vec2(0, 1)), mHash(i + vec2(1, 1)), f.x), f.y);
}
float mFbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * mNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
// The bog around the pool, as seen in reflections and far behind: sky, a band
// of sedges, heather and pines on the horizon, a peaty ground below.
vec3 envSky(vec3 d) {
  d = normalize(d);
  if (uHasBackdrop > 0.5) {
    vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + 0.5, clamp(0.5 + asin(clamp(d.y, -1.0, 1.0)) / 3.14159, 0.0, 1.0));
    return texture2D(uBackdrop, uv).rgb * 1.3;
  }
  float az = atan(d.z, d.x);
  vec3 sky = mix(uSkyHor, uSkyTop, pow(max(d.y, 0.0), 0.55));
  float cl = smoothstep(0.45, 0.8, mFbm(vec2(az * 2.0, d.y * 6.0) + uTime * 0.005));
  sky = mix(sky, uSkyHor * 1.25, cl * smoothstep(0.02, 0.3, d.y) * 0.7);
  float ridge = 0.1 + 0.14 * mFbm(vec2(az * 6.0, 1.3)) + 0.25 * pow(mNoise(vec2(az * 30.0, 3.0)), 5.0);
  vec3 veg = mix(vec3(0.025, 0.04, 0.015), vec3(0.12, 0.07, 0.03), mNoise(vec2(az * 30.0, d.y * 20.0)));
  veg = mix(veg, vec3(0.1, 0.13, 0.04), smoothstep(0.0, 0.2, d.y) * mNoise(vec2(az * 90.0, d.y * 60.0)));
  vec3 c = d.y > ridge ? sky : veg * (0.6 + 0.6 * uSkyHor.g);
  if (d.y < 0.0) c = mix(veg, uGround, smoothstep(0.0, -0.3, d.y));
  return c;
}
// Soft shadow from round casters (an ellipse projected along the sun).
float casterShadow(vec3 p) {
  float s = 1.0;
  for (int i = 0; i < 8; i++) {
    vec4 c = uCasters[i];
    if (c.w <= 0.0) continue;
    float dh = c.y - p.y;
    if (dh < -0.05) continue;
    vec2 q = c.xz - uSunDir.xz / max(uSunDir.y, 0.15) * dh;
    float pen = c.w * 0.4 + dh * 0.02;
    float d = length(p.xz - q);
    s *= 1.0 - uCasterK[i] * (1.0 - smoothstep(c.w - pen, c.w + pen, d));
  }
  return s;
}
float ggx(vec3 N, vec3 V, vec3 L, float r) {
  vec3 H = normalize(V + L);
  float a = r * r, a2 = a * a;
  float nh = max(dot(N, H), 0.0), nl = max(dot(N, L), 0.0), nv = max(dot(N, V), 1e-3);
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dd * dd);
  float k = a * 0.5;
  float G = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  return D * G / (4.0 * nv + 1e-3);
}
struct Surf { vec3 albedo; vec3 N; float rough; float f0; float sheen; vec3 sheenCol; float wrap; float trans; float ao; vec3 emit; };
Surf surfDefault(vec3 N) { Surf s; s.albedo = vec3(0.5); s.N = N; s.rough = 0.5; s.f0 = 0.04; s.sheen = 0.0; s.sheenCol = vec3(1.0); s.wrap = 0.0; s.trans = 0.0; s.ao = 1.0; s.emit = vec3(0.0); return s; }
vec3 shadeSurf(Surf s, vec3 P, vec3 V, float shadow) {
  vec3 N = s.N, L = uSunDir;
  float nl = dot(N, L);
  float diff = max((nl + s.wrap) / (1.0 + s.wrap), 0.0);
  float back = s.trans * pow(max(dot(-V, L), 0.0), 3.0) * max(-nl * 0.5 + 0.5, 0.0);
  vec3 hemi = mix(uGround * 1.6, mix(uSkyHor, uSkyTop, 0.5), N.y * 0.5 + 0.5);
  float fres = s.f0 + (1.0 - s.f0) * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 col = s.albedo * (uSunCol * (diff * shadow + back) + hemi * s.ao);
  col += uSunCol * ggx(N, V, L, max(s.rough, 0.04)) * max(nl, 0.0) * shadow * mix(s.f0, 1.0, pow(1.0 - max(dot(normalize(V + L), V), 0.0), 5.0));
  col += envSky(reflect(-V, N)) * fres * (1.0 - s.rough) * (1.0 - s.rough) * 0.6 * s.ao;
  col += s.sheenCol * s.sheen * pow(1.0 - max(dot(N, V), 0.0), 3.0) * (hemi + uSunCol * 0.25 * shadow) * s.ao;
  // ring light around the objective: light from the viewer
  if (uRing > 0.0) {
    float nv = max(dot(N, V), 0.0);
    col += uRing * (s.albedo * nv * 0.5 + vec3(ggx(N, V, V, max(s.rough, 0.08)) * nv * mix(s.f0, 1.0, 0.1)));
  }
  return col + s.emit;
}
// Colour plus the distance from the focal plane, for the depth-of-field passes.
vec4 macroOut(vec3 col, vec3 P) { return vec4(min(col, vec3(200.0)), distance(P, cameraPosition) - uFocus); }
`;

const LIT_VS = /* glsl */ `
#ifdef SKIN
attribute float part; attribute float part2; attribute float partW;
uniform mat4 uBones[BONES];
flat varying float vPart;
varying float vPartW;
#endif
varying vec3 vWorld, vNormal, vLocal, vColor;
void main() {
  vec3 p = position, n = normal;
#ifdef SKIN
  mat4 A = uBones[int(part + 0.5)], B = uBones[int(part2 + 0.5)];
  p = mix((B * vec4(position, 1.0)).xyz, (A * vec4(position, 1.0)).xyz, partW);
  n = normalize(mix(mat3(B) * normal, mat3(A) * normal, partW));
  vPart = part; vPartW = partW;
#endif
  vLocal = position;
  vec4 wp = vec4(p, 1.0);
#ifdef USE_INSTANCING
  mat3 im = mat3(instanceMatrix);
  wp = instanceMatrix * wp;
  // inverse-transpose for a rotation with per-axis scale
  n = im * (n / vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2])));
#endif
#ifdef USE_INSTANCING_COLOR
  vColor = instanceColor;
#else
  vColor = vec3(1.0);
#endif
  wp = modelMatrix * wp;
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

/**
 * A lit macro material. `surface` is GLSL with a body for
 *   void surface(inout Surf s)  (vWorld, vNormal, vLocal, vColor and, with
 *   skin, vPart / vPartW are in scope); defaults fill the rest.
 * skin: number of bones for a part-rigged sdf.js mesh (uniform uBones).
 */
export function litMaterial({ surface = '', uniforms = {}, skin = 0, shadow = true, side = THREE.FrontSide, defines = {} } = {}) {
  const fs = /* glsl */ `
${MACRO_GLSL}
#ifdef SKIN
flat varying float vPart;
varying float vPartW;
#endif
varying vec3 vWorld, vNormal, vLocal, vColor;
${surface.includes('void surface') ? surface : `void surface(inout Surf s) { ${surface} }`}
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  if (!gl_FrontFacing) N = -N;
  Surf s = surfDefault(N);
  surface(s);
  float sh = ${shadow ? 'casterShadow(vWorld)' : '1.0'};
  gl_FragColor = macroOut(shadeSurf(s, vWorld, V, sh), vWorld);
}`;
  const u = { ...macroShared, ...uniforms };
  const d = { ...defines };
  if (skin) { d.SKIN = 1; d.BONES = skin; u.uBones = { value: Array.from({ length: skin }, () => new THREE.Matrix4()) }; }
  return new THREE.ShaderMaterial({ uniforms: u, vertexShader: LIT_VS, fragmentShader: fs, defines: d, side });
}

// ---------------------------------------------------------------- post
const FS_VS = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Half resolution: colour (fireflies clamped) and signed CoC in half-res pixels.
const PRE_FS = /* glsl */ `
uniform sampler2D tScene; uniform vec2 uTexel; uniform float uCocK, uFocus, uMaxCoc;
varying vec2 vUv;
float coc(float a) { return clamp(uCocK * a / max(uFocus + a, 1e-3), -uMaxCoc, uMaxCoc); }
void main() {
  vec4 a = texture2D(tScene, vUv + uTexel * vec2(-0.5, -0.5));
  vec4 b = texture2D(tScene, vUv + uTexel * vec2(0.5, -0.5));
  vec4 c = texture2D(tScene, vUv + uTexel * vec2(-0.5, 0.5));
  vec4 d = texture2D(tScene, vUv + uTexel * vec2(0.5, 0.5));
  float ca = coc(a.a), cb = coc(b.a), cc = coc(c.a), cd = coc(d.a);
  // keep the nearest (foreground) CoC so near blur covers its edges
  float near = min(min(ca, cb), min(cc, cd));
  float avg = (ca + cb + cc + cd) * 0.25;
  float k = near < -1.0 ? near : avg;
  vec3 col = (a.rgb + b.rgb + c.rgb + d.rgb) * 0.25;
  col = min(col, vec3(80.0));
  gl_FragColor = vec4(col, k * 0.5);
}`;

// Tiles of 16x16 half-res pixels (3x3 of them cover the largest disc): max |CoC| and max foreground CoC.
const TILE_FS = /* glsl */ `
uniform sampler2D tPre; uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  float mx = 0.0, fg = 0.0;
  for (int j = 0; j < 16; j++) for (int i = 0; i < 16; i++) {
    float c = texture2D(tPre, vUv + uTexel * (vec2(i, j) - 7.5)).a;
    mx = max(mx, abs(c)); fg = max(fg, -c);
  }
  gl_FragColor = vec4(mx, fg, 0.0, 1.0);
}`;

// Scatter-as-gather bokeh in two layers. 64 taps on a golden-angle spiral
// (rotated per pixel to trade pattern for fine noise), scaled to the largest
// blur that can reach this pixel (from the dilated tiles). Each tap stands for
// an area pi R^2 / 64 of the image.
//  - Background (taps at or behind the centre): averaged, each tap's disc
//    clamped to the centre's own blur, so sharp edges never smear backward.
//  - Foreground (taps in front): each spreads its colour over its own disc,
//    so it adds (tap area) / (disc area) of coverage where its disc reaches.
// The output is the background colour with the foreground composited over it
// (alpha = foreground coverage), independent of the tap radius.
const GATHER_FS = /* glsl */ `
uniform sampler2D tPre, tTile; uniform vec2 uTexel, uTileTexel; uniform float uMaxCoc, uRim;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tPre, vUv);
  float cc = abs(c.a);
  float tfg = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) tfg = max(tfg, texture2D(tTile, vUv + uTileTexel * vec2(i, j)).g);
  float R = min(max(cc, tfg), uMaxCoc);
  if (R < 0.75) { gl_FragColor = vec4(c.rgb, 0.0); return; }
  float rot = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;
  float tapA = R * R / 64.0; // tap area / pi
  vec3 bg = c.rgb; float bw = 1.0;
  vec3 fg = vec3(0.0); float fw = 0.0;
  for (int i = 0; i < 64; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 64.0) * R;
    float th = fi * 2.3999632 + rot;
    vec4 s = texture2D(tPre, vUv + vec2(cos(th), sin(th)) * r * uTexel);
    float cs = abs(s.a);
    float rim = 1.0 + uRim * smoothstep(0.6, 1.0, r / max(cs, 1.0));
    if (s.a < c.a - 1.0 && s.a < 0.0) {
      float w = clamp(cs - r + 1.0, 0.0, 1.0) * tapA / max(cs * cs, 1.0) * rim;
      fg += s.rgb * w; fw += w;
    } else {
      float e = min(cs, cc);
      float w = clamp(e - r + 1.0, 0.0, 1.0) * rim;
      bg += s.rgb * w; bw += w;
    }
  }
  bg /= bw;
  float a = clamp(fw, 0.0, 1.0);
  vec3 f = fw > 0.0 ? fg / fw : bg;
  gl_FragColor = vec4(mix(bg, f, a), a);
}`;

const COMP_FS = /* glsl */ `
uniform sampler2D tScene, tBlur; uniform vec2 uRes; uniform float uCocK, uFocus, uMaxCoc, uExposure, uWarm, uCircle, uTime, uDof, uGrain;
varying vec2 vUv;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec4 s = texture2D(tScene, vUv);
  vec3 col = s.rgb;
  if (uDof > 0.5) {
    float coc = clamp(uCocK * s.a / max(uFocus + s.a, 1e-3), -uMaxCoc * 2.0, uMaxCoc * 2.0);
    vec2 bt = 0.75 / uRes * 2.0;
    vec4 b = 0.25 * (texture2D(tBlur, vUv + bt * vec2(1, 1)) + texture2D(tBlur, vUv + bt * vec2(-1, 1)) + texture2D(tBlur, vUv + bt * vec2(1, -1)) + texture2D(tBlur, vUv + bt * vec2(-1, -1)));
    float m = max(smoothstep(0.8, 2.4, abs(coc)), smoothstep(0.02, 0.6, b.a));
    col = mix(col, b.rgb, m);
  }
  // slight lateral chromatic aberration toward the frame edge
  vec2 d = vUv - 0.5;
  col *= uExposure;
  col.r *= 1.0 + uWarm; col.b *= 1.0 - uWarm;
  vec3 o = aces(col);
  float vig = 1.0 - 0.32 * dot(d, d) * 2.2;
  o *= vig;
  if (uCircle > 0.5) {
    float r = length(d * vec2(uRes.x / uRes.y, 1.0));
    o *= smoothstep(0.5, 0.47, r);
    o = mix(o, o * vec3(0.98, 1.0, 1.04), 0.5);
  }
  o += (h(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
  o = pow(max(o, 0.0), vec3(1.0 / 2.2));
  gl_FragColor = vec4(o, 1.0);
}`;

/**
 * The post chain: scene -> half-res prefilter -> CoC tiles -> bokeh gather ->
 * composite (tone map, look). Allocates once; resize with the drawing buffer.
 */
export function createMacro(renderer) {
  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: true });
  const preRT = new THREE.WebGLRenderTarget(2, 2, opts);
  const tileRT = new THREE.WebGLRenderTarget(1, 1, { ...opts, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const blurRT = new THREE.WebGLRenderTarget(2, 2, opts);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const fsScene = new THREE.Scene();
  fsScene.add(quad);
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mk = (fs, uniforms) => new THREE.ShaderMaterial({ vertexShader: FS_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const pre = mk(PRE_FS, { tScene: { value: sceneRT.texture }, uTexel: { value: new THREE.Vector2() }, uCocK: { value: 1 }, uFocus: macroShared.uFocus, uMaxCoc: { value: 48 } });
  const tile = mk(TILE_FS, { tPre: { value: preRT.texture }, uTexel: { value: new THREE.Vector2() } });
  const gather = mk(GATHER_FS, { tPre: { value: preRT.texture }, tTile: { value: tileRT.texture }, uTexel: { value: new THREE.Vector2() }, uTileTexel: { value: new THREE.Vector2() }, uMaxCoc: { value: 24 }, uRim: { value: 0.35 } });
  const comp = mk(COMP_FS, {
    tScene: { value: sceneRT.texture }, tBlur: { value: blurRT.texture }, uRes: { value: new THREE.Vector2() }, uCocK: { value: 1 }, uFocus: macroShared.uFocus,
    uMaxCoc: { value: 48 }, uExposure: { value: 1 }, uWarm: { value: 0 }, uCircle: { value: 0 }, uTime: macroShared.uTime, uDof: { value: 1 }, uGrain: { value: 0.012 },
  });
  let W = 4, H = 4;
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(fsScene, fsCam); };
  const api = {
    sceneRT,
    options: { dof: true, maxCoc: 48, rim: 0.35, grain: 0.012 },
    resize(w, h) {
      W = w; H = h;
      sceneRT.setSize(w, h);
      const hw = Math.max(1, Math.ceil(w / 2)), hh = Math.max(1, Math.ceil(h / 2));
      preRT.setSize(hw, hh); blurRT.setSize(hw, hh);
      tileRT.setSize(Math.max(1, Math.ceil(hw / 16)), Math.max(1, Math.ceil(hh / 16)));
      pre.uniforms.uTexel.value.set(1 / w, 1 / h);
      tile.uniforms.uTexel.value.set(1 / hw, 1 / hh);
      gather.uniforms.uTexel.value.set(1 / hw, 1 / hh);
      gather.uniforms.uTileTexel.value.set(1 / tileRT.width, 1 / tileRT.height);
      comp.uniforms.uRes.value.set(w, h);
    },
    /** Blur-disc diameter in full-res px for a world point at distance d. */
    cocAt(L, d, dofK = 1) { return (L.cocK(W) * dofK * Math.abs(d - macroShared.uFocus.value)) / d; },
    render(scene, camera, { lens: L, look = MACRO_LOOKS[0], dofK = 1 }) {
      const k = (L.cocK(W) / Math.max(dofK * look.dofK, 1e-3));
      const o = api.options;
      pre.uniforms.uCocK.value = k; comp.uniforms.uCocK.value = k;
      pre.uniforms.uMaxCoc.value = o.maxCoc; comp.uniforms.uMaxCoc.value = o.maxCoc;
      gather.uniforms.uMaxCoc.value = o.maxCoc / 2; gather.uniforms.uRim.value = o.rim;
      comp.uniforms.uExposure.value = look.exposure; comp.uniforms.uWarm.value = look.warm;
      comp.uniforms.uCircle.value = look.circle; comp.uniforms.uDof.value = o.dof ? 1 : 0; comp.uniforms.uGrain.value = o.grain;
      renderer.setRenderTarget(sceneRT);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      if (o.dof) { pass(pre, preRT); pass(tile, tileRT); pass(gather, blurRT); }
      pass(comp, null);
    },
  };
  return api;
}
