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
//    phase        positive phase contrast: I = exp(-OD) · (1 - 0.92·tanh(0.95(φ - α·φ_low))),
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
//
// PERFORMANCE (render() only; diffract() keeps its in-place full-resolution
// behaviour for callers that read optics.field afterwards)
// - Downsample, then blur: when the PSF is wide on screen (σ ≥ 2.2 px, i.e.
//   zoomed in), there is no detail finer than σ to keep, so the horizontal
//   pass reads the full-resolution field and writes a target 2× (σ ≥ 4.5 px:
//   4×) narrower, the vertical pass writes one as much shorter, and the
//   composite reads it back with bilinear filtering (its own blur is taken
//   out of σ). About 0.38× (2×) or 0.16× (4×) of the full-resolution cost.
// - optics.setRect({ x, y, w, h }) (fractions of the screen, origin bottom
//   left, or null): every pass is scissored to that rectangle plus the blur
//   margins, so a split-screen view renders only its own region.
// - resize() keeps the last two sizes' targets, so a split/merge flip of the
//   render scale does not reallocate them each time.
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
uniform vec2 uUvK;     // output uv -> input uv (1 when the sizes match; < 1 when downsampling)
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;
void main() {
  vec2 src = vUv * uUvK;
  if (uSigma < 0.35) { o0 = texture(t0, src); o1 = texture(t1, src); o2 = texture(t2, src); return; }
  float step = max(1.0, ceil(3.0 * uSigma / 10.0));
  vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
  float wsum = 0.0;
  for (int i = -10; i <= 10; i++) {
    float x = float(i) * step;
    if (abs(x) > 3.2 * uSigma + 0.5) continue;
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    vec2 uv = src + uDir * x;
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
uniform vec2 uFieldK;       // screen uv -> field-texture uv (1, or < 1 for a downsampled field)
uniform vec2 uNoiseRes;     // the grain of the shot noise (screen pixels)
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
  vec2 fuv = vUv * uFieldK;
  vec4 f0 = texture(tF0, fuv);
  vec3 fl = texture(tF1, fuv).rgb;
  vec3 od = texture(tF2, fuv).rgb;
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
  float n = hash(floor(vUv * uNoiseRes) + fract(uTime * 7.31) * 113.0) - 0.5;
  vec3 c;
  if (uLook == 0) {
    float s = phi - uHalo * phiLow + plate * 0.25;
    float g = 1.0 - 0.92 * tanh(0.95 * s); // saturates at ~8 %: thick grains go dark, not black
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

  const blur3 = raw(BLUR3_FS, { t0: { value: null }, t1: { value: null }, t2: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 1 }, uUvK: { value: new THREE.Vector2(1, 1) } });
  const blur1 = raw(BLUR1_FS, { t0: { value: null }, uDir: { value: new THREE.Vector2() }, uSigma: { value: 1 }, uPick: { value: new THREE.Vector4() } });
  // the low-pass input: OPD in r, fluorescence in gba (packed by a tiny pass)
  const pack = raw(/* glsl */ `
precision highp float;
in vec2 vUv;
uniform sampler2D t0, t1;
uniform vec2 uFieldK;
layout(location = 0) out vec4 o;
void main() { vec2 uv = vUv * uFieldK; o = vec4(texture(t0, uv).r, texture(t1, uv).rgb); }`, { t0: { value: null }, t1: { value: null }, uFieldK: { value: new THREE.Vector2(1, 1) } });
  const compose = raw(COMPOSE_FS, {
    tF0: { value: null }, tF1: { value: null }, tF2: { value: null }, tLow: { value: null }, tPlate: { value: null },
    uLook: { value: 0 }, uCenter: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2(1, 1) }, uRes: { value: new THREE.Vector2(1, 1) },
    uFieldK: { value: new THREE.Vector2(1, 1) }, uNoiseRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 }, uLambda: { value: 0.55 }, uHalo: { value: 0.75 }, uNoise: { value: 1 }, uPlateOn: { value: 1 }, uHasPlate: { value: 0 },
    uStopR: { value: 0 }, uGain: { value: 1 },
    uCol0: { value: new THREE.Color(1.0, 0.18, 0.45) }, uCol1: { value: new THREE.Color(0.25, 1.0, 0.35) }, uCol2: { value: new THREE.Color(0.25, 0.75, 1.0) },
    uBg: { value: new THREE.Color(0.66, 0.70, 0.66) },
  });
  const blank = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
  blank.needsUpdate = true;

  // Targets per size, the last two kept (a split/merge flips between two render scales).
  const sets = [];
  let cur = null, W = 0, H = 0;
  function makeSet(w, h) {
    const lw = Math.max(2, Math.ceil(w / 4)), lh = Math.max(2, Math.ceil(h / 4));
    return { w, h, field: mrt(w, h, 3), ping: mrt(w, h, 3), lowA: mrt(lw, lh, 1), lowB: mrt(lw, lh, 1), down: {} };
  }
  function disposeSet(S) {
    for (const k of ['field', 'ping', 'lowA', 'lowB']) S[k].dispose();
    for (const d of Object.values(S.down)) { d.h.dispose(); d.s.dispose(); }
  }
  /** The downsampled pair for factor d: horizontal pass (W/d × H), then (W/d × H/d). */
  function down(d) {
    let D = cur.down[d];
    if (!D) {
      const ws = Math.max(2, Math.ceil(W / d)), hs = Math.max(2, Math.ceil(H / d));
      D = cur.down[d] = { d, ws, hs, h: mrt(ws, H, 3), s: mrt(ws, hs, 3) };
    }
    return D;
  }

  // The scissor rectangle (fractions of the screen, origin bottom left) and the margin in field px.
  let rect = null;
  const scissor = (rt, margin) => {
    if (!rt) return;
    if (!rect) { rt.scissorTest = false; return; }
    const sx = rt.width, sy = rt.height, mx = margin * (sx / W), my = margin * (sy / H);
    const x0 = Math.max(0, Math.floor(rect.x * sx - mx)), y0 = Math.max(0, Math.floor(rect.y * sy - my));
    const x1 = Math.min(sx, Math.ceil((rect.x + rect.w) * sx + mx)), y1 = Math.min(sy, Math.ceil((rect.y + rect.h) * sy + my));
    rt.scissor.set(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
    rt.scissorTest = true;
  };

  const api = {
    toggles: { psf: true, halo: true, noise: true, plate: true },
    /** The specimen target: render the scene into it (three attachments, additive). */
    get field() { return cur && cur.field; },
    get size() { return [W, H]; },
    /** The last frame's diffraction: downsample factor (1, 2 or 4) and σ in field px. */
    stats: { down: 1, sigma: 0 },
    resize(w, h) {
      if (w === W && h === H && cur) return;
      W = w; H = h;
      let S = sets.find((q) => q.w === w && q.h === h);
      if (!S) { S = makeSet(w, h); sets.unshift(S); while (sets.length > 2) disposeSet(sets.pop()); }
      else { sets.splice(sets.indexOf(S), 1); sets.unshift(S); }
      cur = S;
      api.setRect(rect, 0);
    },
    /**
     * Restrict every pass to a rectangle of the screen ({ x, y, w, h } as fractions, origin
     * bottom left; null for the whole screen). `margin` (field px) covers the specimen pass;
     * the blur passes add their own. Call before rendering the specimen into optics.field.
     */
    setRect(r, margin = 0) {
      rect = r ? { ...r } : null;
      scissor(cur && cur.field, margin);
    },
    /** Apply the diffraction PSF to the field in place (field → ping → field), at full resolution. */
    diffract(umPerPx, lambda = 0.55, na = 1.3) {
      const s = api.toggles.psf ? psfSigmaUm(lambda, na) / umPerPx : 0;
      if (s < 0.35) return 0;
      const u = blur3.uniforms;
      u.uSigma.value = s; u.uUvK.value.set(1, 1);
      const m = Math.ceil(3.3 * s + 2);
      scissor(cur.ping, m + 2); scissor(cur.field, m);
      [u.t0.value, u.t1.value, u.t2.value] = cur.field.textures; u.uDir.value.set(1 / W, 0); run(blur3, cur.ping);
      [u.t0.value, u.t1.value, u.t2.value] = cur.ping.textures; u.uDir.value.set(0, 1 / H); run(blur3, cur.field);
      return s;
    },
    /** The PSF for render(): downsampled when it is wide. Returns { tex, k: [field uv scale] }. */
    blurred(umPerPx, lambda, na, margin) {
      const s = api.toggles.psf ? psfSigmaUm(lambda, na) / umPerPx : 0;
      const d = s >= 4.5 ? 4 : s >= 2.2 ? 2 : 1;
      api.stats.down = d; api.stats.sigma = s;
      if (d === 1) { api.diffract(umPerPx, lambda, na); return { tex: cur.field.textures, kx: 1, ky: 1 }; }
      const D = down(d), u = blur3.uniforms;
      // bilinear upsampling adds a triangle filter (variance d²/6 px²): take it out of σ
      u.uSigma.value = Math.sqrt(Math.max(0.25, s * s - (d * d) / 6));
      const m = Math.ceil(3.3 * s + 2) + margin;
      scissor(D.h, m); scissor(D.s, m);
      [u.t0.value, u.t1.value, u.t2.value] = cur.field.textures; u.uDir.value.set(1 / W, 0); u.uUvK.value.set((D.ws * d) / W, 1); run(blur3, D.h);
      [u.t0.value, u.t1.value, u.t2.value] = D.h.textures; u.uDir.value.set(0, 1 / H); u.uUvK.value.set(1, (D.hs * d) / H); run(blur3, D.s);
      u.uUvK.value.set(1, 1);
      return { tex: D.s.textures, kx: W / (D.ws * d), ky: H / (D.hs * d) };
    },
    /**
     * Form the image and draw it to the screen (or `target`).
     * look: 'phase' | 'fluorescence' | 'darkfield'. umPerPx: µm per field pixel.
     * haloUm: width of the phase ring's leakage (µm). stopR: field-stop radius in field pixels (0 = none).
     * colors: three pseudo-colours for the fluorescence channels. gain: fluorescence exposure.
     * noiseRes: the grain of the shot noise in pixels (default: the field size).
     */
    render({ look = 'phase', umPerPx = 0.1, center = [0, 0], time = 0, lambda = 0.55, na = 1.3, haloUm = 1.2, stopR = 0, plate = null, colors = null, gain = 1, target = null, skipDiffract = false, noiseRes = null }) {
      const haloW = (look === 'fluorescence' ? 1.6 : haloUm) / umPerPx;
      const haloM = Math.ceil(3.3 * haloW + 8);
      let F = { tex: cur.field.textures, kx: 1, ky: 1 };
      if (!skipDiffract) F = api.blurred(umPerPx, look === 'fluorescence' ? 0.52 : lambda, na, haloM);
      // low-pass (quarter resolution): phase halo, darkfield high-pass, fluorescence haze
      scissor(cur.lowA, haloM); scissor(cur.lowB, haloM);
      pack.uniforms.t0.value = F.tex[0]; pack.uniforms.t1.value = F.tex[1]; pack.uniforms.uFieldK.value.set(F.kx, F.ky);
      run(pack, cur.lowA);
      const sigma = haloW / 4;
      const u = blur1.uniforms;
      u.uSigma.value = sigma;
      u.t0.value = cur.lowA.texture; u.uDir.value.set(1 / cur.lowA.width, 0); run(blur1, cur.lowB);
      u.t0.value = cur.lowB.texture; u.uDir.value.set(0, 1 / cur.lowA.height); run(blur1, cur.lowA);
      const c = compose.uniforms;
      [c.tF0.value, c.tF1.value, c.tF2.value] = F.tex;
      c.uFieldK.value.set(F.kx, F.ky);
      c.tLow.value = cur.lowA.texture;
      c.uLook.value = Math.max(0, LOOKS.indexOf(look));
      c.uCenter.value.set(center[0], center[1]);
      c.uSize.value.set(W * umPerPx, H * umPerPx);
      c.uRes.value.set(W, H);
      if (noiseRes) c.uNoiseRes.value.set(noiseRes[0], noiseRes[1]); else c.uNoiseRes.value.set(W, H);
      c.uTime.value = time; c.uLambda.value = lambda;
      c.uHalo.value = api.toggles.halo ? 0.75 : 0;
      c.uNoise.value = api.toggles.noise ? 1 : 0;
      c.uPlateOn.value = api.toggles.plate ? 1 : 0;
      c.uHasPlate.value = plate ? 1 : 0;
      c.tPlate.value = plate || blank;
      c.uStopR.value = stopR;
      c.uGain.value = gain;
      if (colors) { c.uCol0.value.setRGB(...colors[0]); c.uCol1.value.setRGB(...colors[1]); c.uCol2.value.setRGB(...colors[2]); }
      if (target) scissor(target, 0);
      const sc = !target && rect;
      if (sc) {
        const sz = renderer.getSize(new THREE.Vector2());
        renderer.setScissor(Math.floor(rect.x * sz.x), Math.floor(rect.y * sz.y), Math.ceil(rect.w * sz.x) + 1, Math.ceil(rect.h * sz.y) + 1);
        renderer.setScissorTest(true);
      }
      run(compose, target);
      if (sc) renderer.setScissorTest(false);
    },
  };
  return api;
}
