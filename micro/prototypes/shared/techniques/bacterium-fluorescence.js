// bacterium-fluorescence: light-microscope image formation at the optical
// limit (100× oil, NA 1.3, 1000×): a diffraction-limited point spread,
// widefield epifluorescence with pseudo-coloured channels, positive phase
// contrast with its halo, and high-intensity darkfield. From the Micro
// Bacterium prototype (micro/prototypes/bacterium/). Self-contained.
//
// HOW TO PLUG IT IN
//   import { createLightOptics, LOOKS, LOOK_NAMES, psfSigmaUm } from '../shared/techniques/bacterium-fluorescence.js';
//   const optics = createLightOptics(renderer);
//   optics.resize(drawingBufferWidth, drawingBufferHeight);
//   each frame:
//     renderer.setRenderTarget(optics.field); renderer.clear();
//     (draw the specimen into optics.field: three float attachments, additive)
//     optics.render({ look: 'phase', umPerPx, center: [x, y], time, ... });   // draws to the screen
//
// THE FIELD (what a specimen writes, additively, in µm units)
//   tex 0  r = optical path difference (Δn × thickness, µm), g = scatter,
//          b = height (thickness, µm, for an SEM relief), a = coverage
//   tex 1  rgb = fluorophore amount in three channels (any units; the
//          display maps each channel to a pseudo-colour)
//   tex 2  rgb = optical density (absorbance) per colour
//   This is the adapters.js "optical field" with an extra fluorescence
//   attachment, so the same buffers also feed the borrowed looks there.
//
// WHAT IT DOES
// 1. Point spread. A light microscope cannot pass detail finer than about
//    0.61 λ / NA (Abbe/Rayleigh). The PSF is approximated by a Gaussian with
//    σ = 0.21 λ / NA (FWHM ≈ 0.5 λ / NA ≈ 0.21 µm at 550 nm, NA 1.3), applied
//    to every attachment in µm, so it grows on screen as the view zooms in:
//    zooming a camera crop past the optics is "empty magnification", soft,
//    never sharper. Specimens should draw sub-pixel strands with their
//    integrated amount kept (widen and dim), so a 20 nm flagellum carries the
//    right total signal into the blur.
// 2. Looks:
//    phase        positive phase contrast: I = exp(-OD) · (1 - c·tanh(k(φ - α·φ_low))),
//                 φ = 2π·OPD/λ, φ_low a wide blur of φ (the light the finite
//                 phase ring leaks back). Dark cells with bright halos;
//                 objects far thinner than λ/20 (flagella, phages) vanish.
//    fluorescence black ground, each channel × its pseudo-colour, a little
//                 out-of-focus haze, autofluorescence and shot noise.
//    darkfield    high-intensity darkfield (the zero order removed): the
//                 squared high-pass of φ plus scatter, so strongly
//                 scattering thin things (flagellar bundles) light up.
// 3. Camera: per-frame shot noise, optional round field stop, an optional
//    out-of-focus background plate panned with the stage.
import * as THREE from '../vendor/three.module.min.js';

export const LOOKS = ['phase', 'fluorescence', 'darkfield'];
export const LOOK_NAMES = {
  phase: 'Phase contrast (Ph3, 100× oil)',
  fluorescence: 'Epifluorescence (stained, pseudo-colour)',
  darkfield: 'High-intensity darkfield',
};

/** Gaussian σ (µm) that matches an Airy core for wavelength λ (µm) and numerical aperture NA. */
export function psfSigmaUm(lambda = 0.55, na = 1.3) { return (0.21 * lambda) / na; }

const VS = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Separable Gaussian on all three attachments at once.
const BLUR3_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D t0, t1, t2;
uniform vec2 uDir;     // texel step (x or y)
uniform float uSigma;  // in texels
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
void main() {
  if (uSigma < 0.35) { o0 = texture(t0, vUv); o1 = texture(t1, vUv); o2 = texture(t2, vUv); return; }
  float step = max(1.0, ceil(3.0 * uSigma / 10.0));
  vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
  float wsum = 0.0;
  for (int i = -10; i <= 10; i++) {
    float x = float(i) * step;
    if (abs(x) > 3.2 * uSigma + 0.5) continue;
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    vec2 uv = vUv + uDir * x;
    a += texture(t0, uv) * w; b += texture(t1, uv) * w; c += texture(t2, uv) * w;
    wsum += w;
  }
  o0 = a / wsum; o1 = b / wsum; o2 = c / wsum;
}`;

// Single-target separable Gaussian (the low-pass for the phase halo).
const BLUR1_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D t0;
uniform vec2 uDir;
uniform float uSigma;
uniform vec4 uPick; // first pass: pick OPD and fluorescence sum out of the field
layout(location = 0) out vec4 o0;
void main() {
  float step = max(1.0, ceil(3.0 * uSigma / 10.0));
  vec4 a = vec4(0.0);
  float wsum = 0.0;
  for (int i = -10; i <= 10; i++) {
    float x = float(i) * step;
    if (abs(x) > 3.2 * max(uSigma, 0.5) + 0.5) continue;
    float w = exp(-0.5 * x * x / max(uSigma * uSigma, 0.25));
    a += texture(t0, vUv + uDir * x) * w;
    wsum += w;
  }
  o0 = a / wsum;
}`;

const COMPOSE_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D tF0, tF1, tF2, tLow, tPlate;
uniform int uLook;          // 0 phase, 1 fluorescence, 2 darkfield
uniform vec2 uCenter;       // world µm at the screen centre
uniform vec2 uSize;         // screen size in µm
uniform vec2 uRes;          // pixels
uniform float uTime, uLambda;
uniform float uHalo, uNoise, uPlateOn, uHasPlate, uStopR, uGain;
uniform vec3 uCol0, uCol1, uCol2; // fluorescence pseudo-colours
uniform vec3 uBg;           // phase background
layout(location = 0) out vec4 o;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }

void main() {
  vec4 f0 = texture(tF0, vUv);
  vec3 fl = texture(tF1, vUv).rgb;
  vec3 od = texture(tF2, vUv).rgb;
  vec4 low = texture(tLow, vUv);
  vec2 world = uCenter + (vUv - 0.5) * uSize;
  float TAU = 6.2831853;
  float phi = TAU * f0.r / uLambda;
  float phiLow = TAU * low.r / uLambda;
  // out-of-focus background: bacteria and silt far below the focal plane
  float plate = 0.0;
  if (uPlateOn > 0.5) {
    plate = uHasPlate > 0.5 ? (texture(tPlate, world / 120.0).r - 0.5) * 0.5 : (fbm(world / 9.0) - 0.5) * 0.35 + (fbm(world / 2.2 + 7.0) - 0.5) * 0.12;
  }
  float n = hash(vUv * uRes + fract(uTime * 7.31) * 113.0) - 0.5;
  vec3 c;
  if (uLook == 0) {
    float s = phi - uHalo * phiLow + plate * 0.25;
    float g = 1.0 - 1.15 * tanh(0.95 * s);
    c = uBg * g * exp(-od * 1.0);
    c += n * uNoise * 0.06;
  } else if (uLook == 1) {
    vec3 haze = low.gba * 0.35;
    vec3 e = fl + haze;
    c = (e.r * uCol0 + e.g * uCol1 + e.b * uCol2) * uGain;
    c += vec3(0.010, 0.012, 0.016) + max(plate, 0.0) * vec3(0.02, 0.025, 0.02); // autofluorescence of the water and silt
    c = 1.0 - exp(-c * 1.6);
    c += n * uNoise * (0.025 + 0.12 * sqrt(max(dot(c, vec3(0.33)), 0.0)));
  } else {
    float hp = phi - phiLow * 0.97;
    float i = hp * hp * 1.6 + f0.g * 2.0 + abs(plate) * 0.02;
    c = vec3(0.92, 0.95, 1.0) * (1.0 - exp(-i * 1.4)) + 0.012;
    c *= exp(-od * 0.5);
    c += n * uNoise * 0.03;
  }
  // round eyepiece field stop
  if (uStopR > 0.0) {
    vec2 pp = (vUv - 0.5) * uRes;
    float r = length(pp);
    c *= 1.0 - smoothstep(uStopR - 2.0, uStopR + 1.0, r);
  }
  o = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function mrt(w, h, count) {
  const rt = new THREE.WebGLRenderTarget(w, h, { count, type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false });
  for (const t of rt.textures) { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
  return rt;
}

export function createLightOptics(renderer) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const qMesh = new THREE.Mesh(tri);
  qMesh.frustumCulled = false;
  const qScene = new THREE.Scene();
  qScene.add(qMesh);
  const qCam = new THREE.Camera();
  const raw = (fs, uniforms) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
  const run = (m, target) => { qMesh.material = m; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };

  const blur3 = raw(BLUR3_FS, { t0: { value: null }, t1: { value: null }, t2: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 1 } });
  const blur1 = raw(BLUR1_FS, { t0: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 1 }, uPick: { value: new THREE.Vector4() } });
  // the low-pass input: OPD in r, fluorescence in gba (packed by a tiny pass)
  const pack = raw(/* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D t0, t1;
layout(location = 0) out vec4 o;
void main() { o = vec4(texture(t0, vUv).r, texture(t1, vUv).rgb); }`, { t0: { value: null }, t1: { value: null } });
  const compose = raw(COMPOSE_FS, {
    tF0: { value: null }, tF1: { value: null }, tF2: { value: null }, tLow: { value: null }, tPlate: { value: null },
    uLook: { value: 0 }, uCenter: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }, uLambda: { value: 0.55 }, uHalo: { value: 0.75 }, uNoise: { value: 1 }, uPlateOn: { value: 1 }, uHasPlate: { value: 0 },
    uStopR: { value: 0 }, uGain: { value: 1 },
    uCol0: { value: new THREE.Color(1.0, 0.18, 0.45) }, uCol1: { value: new THREE.Color(0.25, 1.0, 0.35) }, uCol2: { value: new THREE.Color(0.25, 0.75, 1.0) },
    uBg: { value: new THREE.Color(0.66, 0.70, 0.66) },
  });
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;

  let field = null, ping = null, lowA = null, lowB = null, W = 0, H = 0;
  const api = {
    toggles: { psf: true, halo: true, noise: true, plate: true },
    /** The specimen target: render the scene into it (three attachments, additive). */
    get field() { return field; },
    get size() { return [W, H]; },
    resize(w, h) {
      if (w === W && h === H) return;
      W = w; H = h;
      field?.dispose(); ping?.dispose(); lowA?.dispose(); lowB?.dispose();
      field = mrt(w, h, 3);
      ping = mrt(w, h, 3);
      const lw = Math.max(2, Math.ceil(w / 4)), lh = Math.max(2, Math.ceil(h / 4));
      lowA = mrt(lw, lh, 1); lowB = mrt(lw, lh, 1);
    },
    /** Apply the diffraction PSF to the field in place (field → ping → field). */
    diffract(umPerPx, lambda = 0.55, na = 1.3) {
      const s = api.toggles.psf ? psfSigmaUm(lambda, na) / umPerPx : 0;
      if (s < 0.35) return 0;
      const u = blur3.uniforms;
      u.uSigma.value = s;
      [u.t0.value, u.t1.value, u.t2.value] = field.textures; u.uDir.value.set(1 / W, 0); run(blur3, ping);
      [u.t0.value, u.t1.value, u.t2.value] = ping.textures; u.uDir.value.set(0, 1 / H); run(blur3, field);
      return s;
    },
    /**
     * Form the image and draw it to the screen (or `target`).
     * look: 'phase' | 'fluorescence' | 'darkfield'. umPerPx: µm per drawing-buffer pixel.
     * haloUm: width of the phase ring's leakage (µm). stopR: field-stop radius in pixels (0 = none).
     * colors: three pseudo-colours for the fluorescence channels. gain: fluorescence exposure.
     */
    render({ look = 'phase', umPerPx = 0.1, center = [0, 0], time = 0, lambda = 0.55, na = 1.3, haloUm = 1.2, stopR = 0, plate = null, colors = null, gain = 1, target = null, skipDiffract = false }) {
      if (!skipDiffract) api.diffract(umPerPx, look === 'fluorescence' ? 0.52 : lambda, na);
      // low-pass (quarter resolution): phase halo, darkfield high-pass, fluorescence haze
      pack.uniforms.t0.value = field.textures[0]; pack.uniforms.t1.value = field.textures[1];
      run(pack, lowA);
      const sigma = (look === 'fluorescence' ? 1.6 : haloUm) / umPerPx / 4;
      const u = blur1.uniforms;
      u.uSigma.value = sigma;
      u.t0.value = lowA.texture; u.uDir.value.set(1 / lowA.width, 0); run(blur1, lowB);
      u.t0.value = lowB.texture; u.uDir.value.set(0, 1 / lowA.height); run(blur1, lowA);
      const c = compose.uniforms;
      [c.tF0.value, c.tF1.value, c.tF2.value] = field.textures;
      c.tLow.value = lowA.texture;
      c.uLook.value = Math.max(0, LOOKS.indexOf(look));
      c.uCenter.value.set(center[0], center[1]);
      c.uSize.value.set(W * umPerPx, H * umPerPx);
      c.uRes.value.set(W, H);
      c.uTime.value = time; c.uLambda.value = lambda;
      c.uHalo.value = api.toggles.halo ? 0.75 : 0;
      c.uNoise.value = api.toggles.noise ? 1 : 0;
      c.uPlateOn.value = api.toggles.plate ? 1 : 0;
      c.uHasPlate.value = plate ? 1 : 0;
      c.tPlate.value = plate || blank;
      c.uStopR.value = stopR;
      c.uGain.value = gain;
      if (colors) { c.uCol0.value.setRGB(...colors[0]); c.uCol1.value.setRGB(...colors[1]); c.uCol2.value.setRGB(...colors[2]); }
      run(compose, target);
    },
  };
  return api;
}
